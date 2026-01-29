/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2021-2026 Jelmer van Arnhem
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
"use strict"

const {getSetting} = require("../util")

/** @typedef {"execute"|"user"|"source"|"other"} RunSource */

let topOfPageWithMouse = false
/** @type {NodeJS.Timeout|null} */
let navbarGuiTimer = null
/** @type {NodeJS.Timeout|null} */
let tabbarGuiTimer = null

/** Get the current url input element if available. */
const getUrl = () => {
    const url = document.getElementById("url")
    if (url instanceof HTMLInputElement) {
        return url
    }
    return null
}

/**
 * List all the open tabs.
 */
const listTabs = () => {
    /** @type {HTMLSpanElement[]} */
    // @ts-expect-error query selector includes the span tag
    const tabs = [...document.querySelectorAll("#tabs > span[link-id]")]
    return tabs
}

/**
 * List all the open pages, regular ones are webviews, suspended ones are divs.
 */
const listPages = () => {
    /** @type {(Electron.WebviewTag|HTMLDivElement)[]} */
    // @ts-expect-error pages should always be div or webview
    const pages = [...document.querySelectorAll("#pages > .webview")]
    return pages
}

/**
 * List all the fake suspended div pages.
 */
const listFakePages = () => {
    const pages = [...document.querySelectorAll("#pages > .webview")]
    return pages.flatMap(p => {
        if (p instanceof HTMLDivElement) {
            return p
        }
        return []
    })
}

/**
 * List all the real unsuspended webview pages.
 */
const listRealPages = () => {
    /** @type {Electron.WebviewTag[]} */
    // @ts-expect-error query selector includes the webview tag
    const pages = [...document.querySelectorAll("#pages > webview")]
    return pages
}

/**
 * List all the webview pages that have completed the dom setup.
 */
const listReadyPages = () => {
    /** @type {Electron.WebviewTag[]} */
    // @ts-expect-error query selector includes the webview tag
    const pages = [...document.querySelectorAll("#pages > webview[dom-ready]")]
    return pages
}

/**
 * Get the current tab.
 */
const currentTab = () => {
    /** @type {HTMLSpanElement|null} */
    const tab = document.getElementById("current-tab")
    return tab
}

/**
 * Get the current page.
 */
const currentPage = () => {
    /** @type {Electron.WebviewTag|null} */
    // @ts-expect-error current page id is always set to webview or null
    const page = document.getElementById("current-page")
    return page
}

/**
 * Send a message to the current page and its frames.
 * @param {string} channel
 * @param {unknown[]} args
 */
const sendToPageOrSubFrame = (channel, ...args) => {
    const {ipcRenderer} = require("electron")
    ipcRenderer.send(channel, currentPage()?.getWebContentsId(), ...args)
}

/**
 * Find a page for a given tab.
 * @param {HTMLSpanElement|null} tab
 */
const pageForTab = tab => listPages().find(
    e => tab && e.getAttribute("link-id") === tab.getAttribute("link-id"))

/**
 * Find a tab for a given page.
 * @param {HTMLDivElement|Electron.WebviewTag|null} page
 */
const tabForPage = page => listTabs().find(
    e => page && e.getAttribute("link-id") === page.getAttribute("link-id"))

/**
 * The valid modes of Vieb.
 * @typedef {("normal"|"insert"|"command"|"search"
 *   |"explore"|"follow"|"pointer"|"visual")} Mode
 */

const modes = new Set([
    "command",
    "explore",
    "follow",
    "insert",
    "normal",
    "pointer",
    "search",
    "visual"
])

/**
 * Check if a mode is valid.
 * @param {string} mode
 * @returns {mode is Mode}
 */
const isValidMode = mode => modes.has(mode)

/**
 * Get the current mode.
 */
const currentMode = () => {
    const mode = document.body.getAttribute("current-mode") ?? "normal"
    if (isValidMode(mode)) {
        return mode
    }
    return "normal"
}

/**
 * Check if a specific mouse feature is enabled.
 * @param {string} val
 */
const getMouseConf = val => {
    const mouse = getSetting("mouse")
    return mouse === "all" || mouse.includes(val)
}

/**
 * Get the current gui status value depending on window status.
 * @param {"navbar"|"tabbar"} type
 * @returns {"always"|"onupdate"|"oninput"|"never"}
 */
const getGuiStatus = type => {
    let setting = getSetting(`gui${type}`)
    const {ipcRenderer} = require("electron")
    if (ipcRenderer.sendSync("is-fullscreen")) {
        setting = getSetting(`guifullscreen${type}`)
    }
    if (topOfPageWithMouse && setting !== "never") {
        setting = "always"
    }
    return setting
}

/** Update the GUI visibility based on navbar and tabbar settings. */
const updateGuiVisibility = () => {
    const navbar = getGuiStatus("navbar")
    const tabbar = getGuiStatus("tabbar")
    if (!navbarGuiTimer) {
        const navigationhidden = navbar === "never"
            || navbar !== "always" && !"ces".includes(currentMode()[0])
        document.body.classList.toggle("navigationhidden", navigationhidden)
    }
    if (!tabbarGuiTimer) {
        document.body.classList.toggle("tabshidden", tabbar !== "always")
    }
    const {applyLayout} = require("./pagelayout")
    applyLayout()
    if (currentMode() === "pointer") {
        const {updateElement} = require("./pointer")
        updateElement()
    }
}

/**
 * Update the mouse state to reflect if it's at the top of the page or not.
 * @param {boolean} status
 */
const setTopOfPageWithMouse = status => {
    if (topOfPageWithMouse !== status) {
        topOfPageWithMouse = status
        updateGuiVisibility()
    }
}

/**
 * Update the screenshot highlight visibility and position, or hide it.
 * @param {boolean} hide
 */
const updateScreenshotHighlight = (hide = false) => {
    const url = getUrl()
    const dims = url?.value.split(" ").find(
        arg => arg?.match(/^(?:\d+,){3}\d+$/g))
    const cmd = url?.value.replace(/^:/g, "").trim() ?? ""
    const screenCmd = cmd.match(/^screenc(opy )?.*/)
        || cmd.match(/^screens(hot )?.*/)
    const highlight = document.getElementById("screenshot-highlight")
    if (!highlight) {
        return
    }
    if (currentMode() !== "command" || hide || !currentPage() || !screenCmd) {
        highlight.style.display = "none"
        return
    }
    const border = Number(highlight?.computedStyleMap().get(
        "border-width")?.toString().split(/[.px]/g)[0])
    const pageHeight = Number(currentPage()?.style.height.split(/[.px]/g)[0])
    const pageWidth = Number(currentPage()?.style.width.split(/[.px]/g)[0])
    const rect = {
        "height": Number(dims?.split(",")[1] ?? pageHeight),
        "width": Number(dims?.split(",")[0] ?? pageWidth),
        "x": Number(dims?.split(",")[2] ?? 0),
        "y": Number(dims?.split(",")[3] ?? 0)
    }
    if (rect.x > pageWidth) {
        rect.x = pageWidth
    }
    if (rect.y > pageHeight) {
        rect.y = pageHeight
    }
    if (rect.width === 0 || rect.width > pageWidth - rect.x) {
        rect.width = pageWidth - rect.x
    }
    if (rect.height === 0 || rect.height > pageHeight - rect.y) {
        rect.height = pageHeight - rect.y
    }
    const pageTop = Number(currentPage()?.style.top.split(/[.px]/g)[0])
    const pageLeft = Number(currentPage()?.style.left.split(/[.px]/g)[0])
    highlight.style.height = `${rect.height}px`
    highlight.style.width = `${rect.width}px`
    highlight.style.left = `${pageLeft + rect.x - border}px`
    highlight.style.top = `${pageTop + rect.y - border}px`
    highlight.style.display = "inherit"
}

/**
 * Update the GUI to briefly show it again if configured.
 * @param {"navbar"|"tabbar"} type
 */
const guiRelatedUpdate = type => {
    updateGuiVisibility()
    const timeout = getSetting("guihidetimeout")
    if (type === "navbar" && getGuiStatus("navbar") === "onupdate") {
        clearTimeout(navbarGuiTimer ?? undefined)
        document.body.classList.remove("navigationhidden")
        if (timeout) {
            navbarGuiTimer = setTimeout(() => {
                navbarGuiTimer = null
                updateGuiVisibility()
            }, timeout)
        }
    }
    if (type === "tabbar" && getGuiStatus("tabbar") === "onupdate") {
        clearTimeout(tabbarGuiTimer ?? undefined)
        document.body.classList.remove("tabshidden")
        if (timeout) {
            tabbarGuiTimer = setTimeout(() => {
                tabbarGuiTimer = null
                updateGuiVisibility()
            }, timeout)
        }
    }
}

module.exports = {
    currentMode,
    currentPage,
    currentTab,
    getMouseConf,
    getUrl,
    guiRelatedUpdate,
    listFakePages,
    listPages,
    listReadyPages,
    listRealPages,
    listTabs,
    pageForTab,
    sendToPageOrSubFrame,
    setTopOfPageWithMouse,
    tabForPage,
    updateGuiVisibility,
    updateScreenshotHighlight
}
