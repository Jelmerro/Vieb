/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2021-2025 Jelmer van Arnhem
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

import {ipcRenderer} from "electron"
import {exec} from "node:child_process"
import {appendFileSync} from "node:fs"
import {platform} from "node:os"
import {normalize} from "node:path/posix"
import {translate} from "./translate.js"
import {
    expandPath,
    hasProtocol,
    isDir,
    isFile,
    isUrl,
    joinPath,
    listDir,
    readJSON,
    rm
} from "./util.js"

let topOfPageWithMouse = false
/** @type {number|null} */
let navbarGuiTimer = null
/** @type {number|null} */
let tabbarGuiTimer = null
/**
 * @typedef {{
 *   id: import("../types/i18n.js").TranslationKeys,
 *   fields?: string[],
 *   action?: {
 *     type: "download-success",
 *     path: string,
 *     func?: () => void
 *   }|false,
 *   type?: "info"|"permission"|"success"|"warning"|"error"|"dialog",
 *   src: RunSource,
 *   silent?: boolean
 * }} NotificationInfo
 */
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
/**
 * @type {{
 *   appdata: string,
 *   autoplay: string,
 *   downloads: string,
 *   icon?: string,
 *   name: string,
 *   order: "none"|"user-only"|"datafolder-only"
 *   |"user-first"|"datafolder-first",
 *   override: string,
 *   files: string[],
 *   config: string
 *   version: string
 * }|null}
 */
let configSettings = null
let appDataPath = ""
/** @typedef {"cookies"|"downloads"|"help"
 * |"history"|"newtab"|"notifications"|"version"} SpecialPage
 */
/** @type {SpecialPage[]} */
const specialPages = [
    "cookies",
    "downloads",
    "help",
    "history",
    "newtab",
    "notifications",
    "version"
]
/** @typedef {"execute"|"user"|"source"|"other"} RunSource */
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
 * Checks if a given page is a special page.
 * @param {any} page
 * @returns {page is SpecialPage}
 */
const isSpecialPage = page => specialPages.includes(page)

/**
 * Get the url of a special page given a name and an optional section.
 * @param {string} userPage
 * @param {string|null} section
 * @param {boolean} skipExistCheck
 */
export const specialPagePath = (
    userPage, section = null, skipExistCheck = false
) => {
    let page = userPage
    if (!isSpecialPage(userPage) && !skipExistCheck) {
        page = "help"
    }
    let url = joinPath(import.meta.dirname, `./pages/${page}.html`)
        .replace(/\\/g, "/").replace(/^\/*/g, "")
    if (isDir(joinPath(import.meta.dirname, "../pages"))) {
        url = joinPath(import.meta.dirname, `../pages/${page}.html`)
            .replace(/\\/g, "/").replace(/^\/*/g, "")
    }
    if (section) {
        if (section.startsWith("#")) {
            return `file:///${url}${section}`
        }
        return `file:///${url}#${section}`
    }
    return `file:///${url}`
}

/**
 * Returns the app configuration settings.
 */
export const appConfig = () => {
    if (!configSettings) {
        configSettings = ipcRenderer.sendSync("app-config")
        if (!configSettings) {
            return null
        }
        let files = [configSettings.override]
        const datafolderConfig = joinPath(configSettings.appdata, "viebrc")
        const userFirstConfig = expandPath("~/.vieb/viebrc")
        const userGlobalConfig = expandPath("~/.viebrc")
        if (!configSettings.override) {
            if (configSettings.order === "user-only") {
                files = [userGlobalConfig, userFirstConfig]
            }
            if (configSettings.order === "datafolder-only") {
                files = [datafolderConfig]
            }
            if (configSettings.order === "user-first") {
                files = [userGlobalConfig, userFirstConfig, datafolderConfig]
            }
            if (configSettings.order === "datafolder-first") {
                files = [datafolderConfig, userFirstConfig, userGlobalConfig]
            }
        }
        configSettings.files = files
        configSettings.config = configSettings.override || datafolderConfig
    }
    return configSettings
}

/**
 * Returns the appdata path (works from both renderer and preloads).
 */
export const appData = () => {
    if (!appDataPath) {
        appDataPath = appConfig()?.appdata ?? ""
    }
    return appDataPath
}

/**
 * @typedef {(typeof import("./renderer/settings.js").defaultSettings & {
 *   "fg": string
 *   "bg": string
 *   "linkcolor": string
 * })} validSetting
 */
/**
 * Get a setting from the settings file.
 * @template {keyof validSetting} T
 * @param {T} set
 * @returns {validSetting[T]}
 */
export const getSetting = set => {
    const settings = readJSON(joinPath(appData(), "settings")) ?? {}
    return settings[set] ?? null
}

/**
 * Check if a specific mouse feature is enabled.
 * @param {string} val
 */
export const getMouseConf = val => {
    const mouse = getSetting("mouse")
    return mouse === "all" || mouse.includes(val)
}

/** Return the notification history. */
export const listNotificationHistory = () => notificationHistory

/**
 * Show the user a notification bubble and store it in the history.
 * @param {NotificationInfo} opts
 */
export const notify = opts => {
    const message = translate(opts.id, {"fields": opts.fields ?? []})
    if (opts.src === "execute") {
        appendFileSync(joinPath(appData(),
            ".tmp-execute-output"), `${message}\t\t\t`)
    }
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
        if (notifyForPerm === "allowed") {
            if (!message.replace(/'.*?'/g, "").includes("allowed")) {
                return
            }
        }
        if (notifyForPerm === "blocked") {
            if (!message.replace(/'.*?'/g, "").includes("blocked")) {
                return
            }
        }
    }
    const native = getSetting("nativenotification")
    const shortLimitNotify = getSetting("notificationlimitsmall")
    const showLong = message.split("\n").length > shortLimitNotify
        && properType !== "dialog"
    const shortAndSmallNative = !showLong && native === "smallonly"
    const longAndLargeNative = showLong && native === "largeonly"
    if (native === "always" || shortAndSmallNative || longAndLargeNative) {
        const n = new Notification(
            `${appConfig()?.name} ${properType}`, {"body": message})
        if (opts?.action && opts?.action?.func) {
            /** Assin the onclick of the notification. */
            // @ts-expect-error Func type could be undefined according to TS...
            n.onclick = () => opts?.action?.func?.()
        }
        return
    }
    if (showLong) {
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

/** Return the location of the downloads, either via setting or OS default. */
export const downloadPath = () => expandPath(getSetting("downloadpath")
    || appConfig()?.downloads || "~/Downloads")

/**
 * Get the current gui status value depending on window status.
 * @param {"navbar"|"tabbar"} type
 * @returns {"always"|"onupdate"|"oninput"|"never"}
 */
const getGuiStatus = type => {
    let setting = getSetting(`gui${type}`)
    if (ipcRenderer.sendSync("is-fullscreen")) {
        setting = getSetting(`guifullscreen${type}`)
    }
    if (topOfPageWithMouse && setting !== "never") {
        setting = "always"
    }
    return setting
}

/** Update the GUI visibility based on navbar and tabbar settings. */
export const updateGuiVisibility = () => {
    // TODO move these somewhere else perhaps?
    return
    const navbar = getGuiStatus("navbar")
    const tabbar = getGuiStatus("tabbar")
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
    applyLayout()
    if (currentMode() === "pointer") {
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
 * Update the GUI to briefly show it again if configured.
 * @param {"navbar"|"tabbar"} type
 */
export const guiRelatedUpdate = type => {
    updateGuiVisibility()
    const timeout = getSetting("guihidetimeout")
    if (type === "navbar" && getGuiStatus("navbar") === "onupdate") {
        window.clearTimeout(navbarGuiTimer ?? undefined)
        document.body.classList.remove("navigationhidden")
        if (timeout) {
            navbarGuiTimer = window.setTimeout(() => {
                navbarGuiTimer = null
                updateGuiVisibility()
            }, timeout)
        }
    }
    if (type === "tabbar" && getGuiStatus("tabbar") === "onupdate") {
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

/**
 * Convert any url/path to the name and section of a special page if relevant.
 * @param {string} urlPath
 * @returns {{name: SpecialPage, section: string}|null}
 */
export const pathToSpecialPageName = urlPath => {
    if (urlPath?.startsWith?.("vieb://")) {
        const parts = urlPath.replace("vieb://", "").split("#")
        const [partName] = parts
        /** @type {SpecialPage} */
        let name = "help"
        if (isSpecialPage(partName)) {
            name = partName
        }
        return {
            name, "section": decodeURIComponent(parts.slice(1).join("#") || "")
        }
    }
    if (urlPath?.startsWith?.("file://")) {
        for (const page of specialPages) {
            const specialPage = specialPagePath(page).replace(/^file:\/+/g, "")
            const normalizedUrl = normalize(urlPath.replace(/^file:\/+/g, ""))
            if (normalizedUrl.startsWith(specialPage)) {
                return {
                    "name": page,
                    "section": decodeURIComponent(
                        urlPath.split("#").slice(1).join("#"))
                }
            }
            try {
                const decodedPath = decodeURI(urlPath)
                const decodedNormalizedUrl = normalize(
                    decodedPath.replace(/^file:\/+/g, ""))
                if (decodedNormalizedUrl.startsWith(specialPage)) {
                    return {
                        "name": page,
                        "section": decodeURIComponent(
                            urlPath.split("#").slice(1).join("#"))
                    }
                }
            } catch {
                // Invalid url
            }
        }
    }
    if (urlPath === "") {
        return {"name": "newtab", "section": ""}
    }
    const appImagePathPattern = RegExp(
        "^file:///tmp/[.]mount_Vieb[a-zA-Z0-9-]+"
        + "/resources/app[.]asar/app/pages/")
    if (urlPath.match(appImagePathPattern)) {
        const name = urlPath.replace(appImagePathPattern, "").replace(/\..+/, "")
        if (isSpecialPage(name)) {
            return {name, "section": ""}
        }
    }
    return null
}

/**
 * Translate a string from the explore mode input to a valid url.
 * @param {string} location
 */
export const stringToUrl = location => {
    let url = String(location)
    const specialPage = pathToSpecialPageName(url)
    if (specialPage?.name) {
        return specialPagePath(specialPage.name, specialPage.section)
    }
    let fileName = url.replace(/^file:\/+/, "/")
    if (platform() === "win32") {
        fileName = url.replace(/^file:\/+/, "")
    }
    const local = expandPath(fileName)
    if (isDir(local) || isFile(local)) {
        const escapedPath = local.replace(/\?/g, "%3F").replace(/#/g, "%23")
        url = `file:/${escapedPath}`.replace(/^file:\/+/, "file:///")
    }
    if (!isUrl(url)) {
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

/**
 * Translate a valid url to the explore mode input representation.
 * @param {string} url
 */
export const urlToString = url => {
    const special = pathToSpecialPageName(url)
    if (special?.name) {
        let specialUrl = `${appConfig()?.name.toLowerCase()}://${special.name}`
        if (special.section) {
            specialUrl += `#${special.section}`
        }
        return specialUrl
    }
    try {
        const decoded = decodeURI(url)
        let fileName = decoded.replace(/^file:\/+/, "/")
        if (platform() === "win32") {
            fileName = decoded.replace(/^file:\/+/, "")
        }
        fileName = fileName.replace(/%23/g, "#").replace(/%3F/g, "?")
        if (isDir(fileName) || isFile(fileName)) {
            return fileName
        }
        return decoded
    } catch {
        // Invalid url
    }
    return url
}

/**
 * Match a searchword and return the word and filled url.
 * @param {string} location
 */
export const searchword = location => {
    const searchwords = getSetting("searchwords")
    for (const word of Object.keys(searchwords)) {
        const url = searchwords[word]
        if (word && url) {
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
    }
    return {"url": location, "word": null}
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
    /** @type {(Electron.WebviewTag|HTMLDivElement)[]} */
    // @ts-expect-error pages should always be div or webview
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
    /** @type {Electron.WebviewTag[]} */
    // @ts-expect-error query selector includes the webview tag
    const pages = [...document.querySelectorAll("#pages > webview")]
    return pages
}

/**
 * List all the webview pages that have completed the dom setup.
 */
export const listReadyPages = () => {
    /** @type {Electron.WebviewTag[]} */
    // @ts-expect-error query selector includes the webview tag
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
    /** @type {Electron.WebviewTag|null} */
    // @ts-expect-error current page id is always set to webview or null
    const page = document.getElementById("current-page")
    return page
}

/**
 * Send a message to the current page and its frames.
 * @param {string} channel
 * @param {any[]} args
 */
export const sendToPageOrSubFrame = (channel, ...args) => {
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
 * Store a value for later use in session storage.
 * @param {string} set
 * @param {any} val
 */
export const setStored = (set, val) => sessionStorage.setItem(
    set, JSON.stringify(val))

/**
 * Run any system command in the user's preferred shell.
 * @param {string} command
 * @param {(
 *   error: import("child_process").ExecException|null,
 *   stdout: string|Buffer,
 *   stderr: string|Buffer
 * ) => void} callback
 */
export const execCommand = (command, callback) => {
    let shell = null
    if (platform() === "win32") {
        shell = process.env.ComSpec || shell
    }
    // TODO replace process.env with argument or appConfig
    shell = process.env.SHELL || shell
    shell = getSetting("shell") || shell
    if (shell) {
        return exec(command, {shell}, callback)
    }
    return exec(command, callback)
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

/** Clear all temporary containers (those that start with temp) from disk. */
export const clearTempContainers = () => {
    const partitionDir = joinPath(appData(), "Partitions")
    listDir(partitionDir, false, true)?.filter(part => part.startsWith("temp"))
        .map(part => joinPath(partitionDir, part)).forEach(part => rm(part))
    rm(joinPath(appData(), "erwicmode"))
}

/** Clear the Chromium and Electron cache dirs plus the Vieb cache files. */
export const clearCache = () => {
    const partitionDir = joinPath(appData(), "Partitions")
    const partitions = [appData(), ...listDir(partitionDir, true, true) || []]
    /** @type {string[]} */
    let subNodes = []
    partitions.forEach(part => subNodes.push(...listDir(part) || []))
    subNodes = Array.from(new Set(subNodes).values())
    partitions.forEach(part => rm(joinPath(part, "File System")))
    partitions.forEach(part => rm(joinPath(part, "MANIFEST")))
    partitions.forEach(part => rm(joinPath(part, "Service Worker")))
    partitions.forEach(part => rm(joinPath(part, "VideoDecodeStats")))
    partitions.forEach(part => rm(joinPath(part, "blob_storage")))
    partitions.forEach(part => rm(joinPath(part, "databases")))
    for (const part of partitions) {
        for (const node of subNodes.filter(n => n.endsWith("Cache"))) {
            rm(joinPath(part, node))
        }
        for (const node of subNodes.filter(n => n.endsWith(".log"))) {
            rm(joinPath(part, node))
        }
        for (const node of subNodes.filter(n => n.startsWith(".org.chrom"))) {
            rm(joinPath(part, node))
        }
    }
    rm(joinPath(appData(), "vimformedits"))
    rm(joinPath(appData(), "settings"))
}

/** Clear all cookies, including those inside partition dirs. */
export const clearCookies = () => {
    const partitionDir = joinPath(appData(), "Partitions")
    const partitions = [appData(), ...listDir(partitionDir, true, true) || []]
    /** @type {string[]} */
    let subNodes = []
    partitions.forEach(part => subNodes.push(...listDir(part) || []))
    subNodes = Array.from(new Set(subNodes).values())
    for (const part of partitions) {
        for (const node of subNodes.filter(n => n.startsWith("Cookies"))) {
            rm(joinPath(part, node))
        }
        for (const node of subNodes.filter(n => n.startsWith("QuotaManager"))) {
            rm(joinPath(part, node))
        }
    }
}

/** Clear all localstorage, including that inside partition dirs. */
export const clearLocalStorage = () => {
    const partitionDir = joinPath(appData(), "Partitions")
    const partitions = [appData(), ...listDir(partitionDir, true, true) || []]
    /** @type {string[]} */
    let subNodes = []
    partitions.forEach(part => subNodes.push(...listDir(part) || []))
    subNodes = Array.from(new Set(subNodes).values())
    partitions.forEach(part => rm(joinPath(part, "IndexedDB")))
    for (const part of partitions) {
        for (const node of subNodes.filter(n => n.endsWith("Storage"))) {
            rm(joinPath(part, node))
        }
        for (const node of subNodes.filter(n => n.endsWith(".ldb"))) {
            rm(joinPath(part, node))
        }
    }
}
