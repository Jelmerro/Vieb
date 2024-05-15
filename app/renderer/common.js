/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2021-2024 Jelmer van Arnhem
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
import {getSetting} from "../util.js"

/** @typedef {"execute"|"user"|"source"|"other"} RunSource */

let topOfPageWithMouse = false
/** @type {number|null} */
let navbarGuiTimer = null
/** @type {number|null} */
let tabbarGuiTimer = null
/**
 * The valid modes of Vieb.
 * @typedef {("normal"|"insert"|"command"|"search"
 *   |"explore"|"follow"|"pointer"|"visual")} Mode
 */
/** @type {Mode[]} */
const modes = [
    "normal",
    "insert",
    "command",
    "search",
    "explore",
    "follow",
    "pointer",
    "visual"
]

/** Get the current url input element if available. */
export const getUrl = () => {
    const url = document.getElementById("url")
    if (url instanceof HTMLInputElement) {
        return url
    }
    return null
}

/**
 * List all the open tabs.
 */
export const listTabs = () => {
    /** @type {HTMLSpanElement[]} */
    // @ts-expect-error query selector includes the span tag
    const tabs = [...document.querySelectorAll("#tabs > span[link-id]")]
    return tabs
}

/**
 * List all the open pages, regular ones are webviews, suspended ones are divs.
 */
export const listPages = () => {
    /** @type {HTMLElement[]} */
    const pages = [...document.querySelectorAll("#pages > .webview")]
    return pages
}

/**
 * List all the fake suspended div pages.
 */
export const listFakePages = () => {
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
export const listRealPages = () => {
    /** @type {HTMLElement[]} */
    const pages = [...document.querySelectorAll("#pages > webview")]
    return pages
}

/**
 * List all the webview pages that have completed the dom setup.
 */
export const listReadyPages = () => {
    /** @type {HTMLElement[]} */
    const pages = [...document.querySelectorAll("#pages > webview[dom-ready]")]
    return pages
}

/**
 * Get the current tab.
 */
export const currentTab = () => {
    /** @type {HTMLSpanElement|null} */
    const tab = document.getElementById("current-tab")
    return tab
}

/**
 * Get the current page.
 */
export const currentPage = () => {
    /** @type {HTMLElement|null} */
    const page = document.getElementById("current-page")
    return page
}

/**
 * Send a message to the current page and its frames.
 * @param {string} channel
 * @param {any[]} args
 */
export const sendToPageOrSubFrame = async(channel, ...args) => {
    const {ipcRenderer} = await import("electron")
    ipcRenderer.send(channel, currentPage()?.getWebContentsId(), ...args)
}

/**
 * Find a page for a given tab.
 * @param {HTMLSpanElement|null} tab
 */
export const pageForTab = tab => listPages().find(
    e => tab && e.getAttribute("link-id") === tab.getAttribute("link-id"))

/**
 * Find a tab for a given page.
 * @param {HTMLDivElement|Electron.WebviewTag|null} page
 */
export const tabForPage = page => listTabs().find(
    e => page && e.getAttribute("link-id") === page.getAttribute("link-id"))

/**
 * Check if a mode is valid.
 * @param {any} mode
 * @returns {mode is Mode}
 */
const isValidMode = mode => modes.includes(mode)

/**
 * Get the current mode.
 */
export const currentMode = () => {
    const mode = document.body.getAttribute("current-mode") ?? "normal"
    if (isValidMode(mode)) {
        return mode
    }
    return "normal"
}

/**
 * Get a value from the session storage.
 * @param {string} set
 */
export const getStored = set => {
    try {
        return JSON.parse(sessionStorage.getItem(set) ?? "")
    } catch {
        return ""
    }
}

/**
 * Check if a specific mouse feature is enabled.
 * @param {string} val
 */
export const getMouseConf = async val => {
    const mouse = await getSetting("mouse")
    return mouse === "all" || mouse.includes(val)
}

/**
 * Store a value for later use in session storage.
 * @param {string} set
 * @param {any} val
 */
export const setStored = (set, val) => sessionStorage
    .setItem(set, JSON.stringify(val))

/**
 * Get the current gui status value depending on window status.
 * @param {"navbar"|"tabbar"} type
 * @returns {Promise<"always"|"onupdate"|"oninput"|"never">}
 */
const getGuiStatus = async type => {
    let setting = await getSetting(`gui${type}`)
    const {ipcRenderer} = await import("electron")
    if (ipcRenderer.sendSync("is-fullscreen")) {
        setting = await getSetting(`guifullscreen${type}`)
    }
    if (topOfPageWithMouse && setting !== "never") {
        setting = "always"
    }
    return setting
}

/** Update the GUI visibility based on navbar and tabbar settings. */
export const updateGuiVisibility = async() => {
    const navbar = await getGuiStatus("navbar")
    const tabbar = await getGuiStatus("tabbar")
    if (!navbarGuiTimer) {
        const notTyping = !"ces".includes(currentMode()[0])
        if (navbar === "never" || navbar !== "always" && notTyping) {
            document.body.classList.add("navigationhidden")
        } else {
            document.body.classList.remove("navigationhidden")
        }
    }
    if (!tabbarGuiTimer) {
        if (tabbar === "always") {
            document.body.classList.remove("tabshidden")
        } else {
            document.body.classList.add("tabshidden")
        }
    }
    const {applyLayout} = await import("./pagelayout.js")
    applyLayout()
    if (currentMode() === "pointer") {
        const {updateElement} = await import("./pointer.js")
        updateElement()
    }
}

/**
 * Update the mouse state to reflect if it's at the top of the page or not.
 * @param {boolean} status
 */
export const setTopOfPageWithMouse = status => {
    if (topOfPageWithMouse !== status) {
        topOfPageWithMouse = status
        updateGuiVisibility()
    }
}

/**
 * Update the screenshot highlight visibility and position, or hide it.
 * @param {boolean} hide
 */
export const updateScreenshotHighlight = (hide = false) => {
    const url = getUrl()
    const dims = url?.value.split(" ").find(
        arg => arg?.match(/^\d+,\d+,\d+,\d+$/g))
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
    const border = Number(getComputedStyle(highlight)
        .borderWidth.split(/[.px]/g)[0])
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
export const guiRelatedUpdate = async type => {
    updateGuiVisibility()
    const timeout = await getSetting("guihidetimeout")
    if (type === "navbar" && await getGuiStatus("navbar") === "onupdate") {
        window.clearTimeout(navbarGuiTimer ?? undefined)
        document.body.classList.remove("navigationhidden")
        if (timeout) {
            navbarGuiTimer = window.setTimeout(() => {
                navbarGuiTimer = null
                updateGuiVisibility()
            }, timeout)
        }
    }
    if (type === "tabbar" && await getGuiStatus("tabbar") === "onupdate") {
        window.clearTimeout(tabbarGuiTimer ?? undefined)
        document.body.classList.remove("tabshidden")
        if (timeout) {
            tabbarGuiTimer = window.setTimeout(() => {
                tabbarGuiTimer = null
                updateGuiVisibility()
            }, timeout)
        }
    }
}
