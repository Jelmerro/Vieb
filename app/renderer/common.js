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

const {
    appConfig,
    appData,
    appendFile,
    expandPath,
    hasProtocol,
    isDir,
    isFile,
    isUrl,
    joinPath,
    pathToSpecialPageName,
    specialPagePath
} = require("../util")

/** @typedef {"execute"|"user"|"source"|"other"} RunSource */

let topOfPageWithMouse = false
/** @type {NodeJS.Timeout|null} */
let navbarGuiTimer = null
/** @type {NodeJS.Timeout|null} */
let tabbarGuiTimer = null
/**
 * @typedef {{
 *   click: {
 *     type: "download-success",
 *     path: string,
 *   }|null
 *   date: Date,
 *   message: string,
 *   type: string
 * }[]} notificationHistory
 */
/** @type {notificationHistory} */
const notificationHistory = []

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

/** Return the location of the downloads, either via setting or OS default. */
const downloadPath = async() => {
    const {getSetting} = require("./settings")
    const settingVal = getSetting("downloadpath")
    if (settingVal) {
        return expandPath(settingVal)
    }
    const config = await appConfig()
    return expandPath(config?.downloads || "~/Downloads")
}

/**
 * Run any system command in the user's preferred shell.
 * @param {string} command
 * @param {(
 *   error: import("child_process").ExecException|null,
 *   stdout: string|Buffer,
 *   stderr: string|Buffer
 * ) => Promise<void>} callback
 */
const execCommand = (command, callback) => {
    let shell = null
    if (process.platform === "win32") {
        shell = process.env.ComSpec || shell
    }
    shell = process.env.SHELL || shell
    const {getSetting} = require("./settings")
    shell = getSetting("shell") || shell
    const {exec} = require("node:child_process")
    if (shell) {
        return exec(command, {shell}, callback)
    }
    return exec(command, callback)
}

/**
 * Match a searchword and return the word and filled url.
 * @param {string} location
 */
const searchword = location => {
    const {getSetting} = require("./settings")
    const searchwords = getSetting("searchwords")
    for (const [word, url] of Object.entries(searchwords)) {
        if (!(word && url)) {
            continue
        }
        const q = location.replace(`${word} `, "")
        if (q && location.replace(/^\s/g, "").startsWith(`${word} `)) {
            const queries = q.split(",")
            let urlString = url
            let counter = 1
            const patternMatches = (urlString.match(/%s/g) || []).length
            while (urlString.includes("%s") && counter < patternMatches) {
                urlString = urlString.replace(/%s/,
                    encodeURIComponent(queries.shift()?.trim() || ""))
                counter += 1
            }
            const remainderString = queries.join(",").trim()
            urlString = urlString.replace(/%s/,
                encodeURIComponent(remainderString))
            return {"url": urlString, word}
        }
    }
    return {"url": location, "word": null}
}

/**
 * @typedef {{
 *   id: import("../../types/i18n").TranslationKeys,
 *   fields?: string[],
 *   action?: {
 *     type: "download-success",
 *     path: string,
 *     func?: () => void
 *   }|false,
 *   type?: "permission"|"success"|"warning"|"error"|"dialog",
 *   src: RunSource,
 *   silent?: boolean
 * }} NotificationInfo
 */

/**
 * Show the user a notification bubble and store it in the history.
 * @param {NotificationInfo} opts
 */
const notify = async opts => {
    const {translate} = require("../translate")
    const message = translate(opts.id, {"fields": opts.fields ?? []})
    if (opts.src === "execute") {
        await appendFile(joinPath(await appData(),
            ".tmp-execute-output"), `${message}\t\t\t`).catch(console.warn)
    }
    const {getSetting} = require("./settings")
    if (getSetting("notificationduration") === 0) {
        return
    }
    const properType = opts.type ?? "info"
    let clickInfo = null
    if (opts?.action) {
        clickInfo = {...opts.action}
        delete clickInfo.func
    }
    const notifyForPerm = getSetting("notificationforpermissions")
    if (properType === "permission" && notifyForPerm === "none") {
        return
    }
    notificationHistory.push({
        "click": clickInfo,
        "date": new Date(),
        message,
        "type": properType
    })
    if (opts.silent) {
        return
    }
    if (properType === "permission") {
        if (notifyForPerm === "silent") {
            return
        }
        if (notifyForPerm === "allowed" && !message.replace(/'.*?'/g, "").includes("allowed")) {
            return
        }
        if (notifyForPerm === "blocked" && !message.replace(/'.*?'/g, "").includes("blocked")) {
            return
        }
    }
    const native = getSetting("nativenotification")
    const shortLimitNotify = getSetting("notificationlimitsmall")
    const showLong = message.split("\n").length > shortLimitNotify
        && properType !== "dialog"
    const shortAndSmallNative = !showLong && native === "smallonly"
    const longAndLargeNative = showLong && native === "largeonly"
    if (native === "always" || shortAndSmallNative || longAndLargeNative) {
        const config = await appConfig()
        const n = new Notification(
            `${config?.name} ${properType}`, {"body": message})
        if (opts?.action && opts?.action?.func) {
            /** Assin the onclick of the notification. */
            // @ts-expect-error Func type could be undefined according to TS...
            n.addEventListener("click", () => opts?.action?.func?.())
        }
        return
    }
    if (showLong) {
        const {ipcRenderer} = require("electron")
        ipcRenderer.send("show-notification", message, properType)
        return
    }
    const notificationsElement = document.getElementById("notifications")
    if (!notificationsElement) {
        return
    }
    notificationsElement.className = getSetting("notificationposition")
    const notification = document.createElement("span")
    notification.className = properType
    notification.textContent = message
    if (opts.action && opts.action.func) {
        // @ts-expect-error Func type could be undefined according to TS...
        notification.addEventListener("click", () => opts.action?.func?.())
    }
    notificationsElement.append(notification)
    setTimeout(() => notification.remove(),
        getSetting("notificationduration"))
}

/** Return the notification history. */
const listNotificationHistory = () => notificationHistory

/**
 * Get the current gui status value depending on window status.
 * @param {"navbar"|"tabbar"} type
 * @returns {Promise<"always"|"onupdate"|"oninput"|"never">}
 */
const getGuiStatus = async type => {
    const {getSetting} = require("./settings")
    let setting = getSetting(`gui${type}`)
    const {ipcRenderer} = require("electron")
    if (await ipcRenderer.invoke("is-fullscreen")) {
        setting = getSetting(`guifullscreen${type}`)
    }
    if (topOfPageWithMouse && setting !== "never") {
        setting = "always"
    }
    return setting
}

/**
 * Translate a string from the explore mode input to a valid url.
 * @param {string} location
 */
const stringToUrl = location => {
    let url = location
    const specialPage = pathToSpecialPageName(url)
    if (specialPage?.name) {
        return specialPagePath(specialPage.name, specialPage.section)
    }
    let fileName = url.replace(/^file:\/+/, "/")
    if (process.platform === "win32") {
        fileName = url.replace(/^file:\/+/, "")
    }
    const local = expandPath(fileName)
    if (isDir(local) || isFile(local)) {
        const escapedPath = local.replace(/\?/g, "%3F").replace(/#/g, "%23")
        url = `file:/${escapedPath}`.replace(/^file:\/+/, "file:///")
    }
    if (!isUrl(url)) {
        const {getSetting} = require("./settings")
        const engines = getSetting("searchengine")
        const engine = engines.at(Math.random() * engines.length)
        if (!engine) {
            return ""
        }
        url = engine.replace(/%s/g, encodeURIComponent(location))
    }
    if (!hasProtocol(url)) {
        url = `https://${url}`
    }
    try {
        return new URL(url).href
    } catch {
        // Can't be re-encoded
    }
    return encodeURI(url)
}

/** Update the GUI visibility based on navbar and tabbar settings. */
const updateGuiVisibility = async() => {
    const navbar = await getGuiStatus("navbar")
    const tabbar = await getGuiStatus("tabbar")
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
const setTopOfPageWithMouse = async status => {
    if (topOfPageWithMouse === status) {
        return
    }
    topOfPageWithMouse = status
    await updateGuiVisibility()
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
        "border-width")?.toString().split(/[.px]/g, 1)[0])
    const pageHeight = Number(currentPage()?.style.height.split(/[.px]/g, 1)[0])
    const pageWidth = Number(currentPage()?.style.width.split(/[.px]/g, 1)[0])
    const rect = {
        "height": Number(dims?.split(",", 2)[1] ?? pageHeight),
        "width": Number(dims?.split(",", 1)[0] ?? pageWidth),
        "x": Number(dims?.split(",", 3)[2] ?? 0),
        "y": Number(dims?.split(",", 4)[3] ?? 0)
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
    const pageTop = Number(currentPage()?.style.top.split(/[.px]/g, 1)[0])
    const pageLeft = Number(currentPage()?.style.left.split(/[.px]/g, 1)[0])
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
const guiRelatedUpdate = async type => {
    await updateGuiVisibility()
    const {getSetting} = require("./settings")
    const timeout = getSetting("guihidetimeout")
    if (type === "navbar" && await getGuiStatus("navbar") === "onupdate") {
        clearTimeout(navbarGuiTimer ?? undefined)
        document.body.classList.remove("navigationhidden")
        if (timeout) {
            navbarGuiTimer = setTimeout(async() => {
                navbarGuiTimer = null
                await updateGuiVisibility()
            }, timeout)
        }
    }
    if (type === "tabbar" && await getGuiStatus("tabbar") === "onupdate") {
        clearTimeout(tabbarGuiTimer ?? undefined)
        document.body.classList.remove("tabshidden")
        if (timeout) {
            tabbarGuiTimer = setTimeout(async() => {
                tabbarGuiTimer = null
                await updateGuiVisibility()
            }, timeout)
        }
    }
}

module.exports = {
    currentMode,
    currentPage,
    currentTab,
    downloadPath,
    execCommand,
    getUrl,
    guiRelatedUpdate,
    listFakePages,
    listNotificationHistory,
    listPages,
    listReadyPages,
    listRealPages,
    listTabs,
    notify,
    pageForTab,
    searchword,
    sendToPageOrSubFrame,
    setTopOfPageWithMouse,
    stringToUrl,
    tabForPage,
    updateGuiVisibility,
    updateScreenshotHighlight
}
