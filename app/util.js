/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2021 Jelmer van Arnhem
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

const protocolRegex = /^[a-z][a-z0-9-+.]+:\/\//
const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/
const specialPages = [
    "cookies",
    "downloads",
    "extensions",
    "help",
    "history",
    "newtab",
    "notifications",
    "version"
]
const notificationHistory = []
let customIcon = null
let applicationName = ""
let appDataPath = ""
let homeDirPath = ""
const framePaddingInfo = []
const frameSelector = "embed, frame, iframe, object"
const specialChars = /[：”；’、。！`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/\s]/gi
const dataUris = ["data", "javascript", "magnet", "mailto", "view-source", "ws"]
const getSetting = val => JSON.parse(sessionStorage.getItem("settings"))?.[val]

const hasProtocol = loc => protocolRegex.test(loc)
    || dataUris.find(d => loc.startsWith(`${d}:`))

const isUrl = location => {
    if (hasProtocol(location)) {
        return true
    }
    const domainName = location.split(/\/|\?|#/)[0]
    if (domainName.includes(":@")) {
        return false
    }
    if (domainName.includes("@")) {
        return (domainName.match(/@/g) || []).length === 1
            && /^[a-zA-Z0-9]+$/.test(domainName.split("@")[0])
            && isUrl(domainName.split("@")[1])
    }
    if (domainName.includes("..")) {
        return false
    }
    if (domainName.startsWith("[") && domainName.endsWith("]")) {
        return ipv6Regex.test(domainName.replace(/\[/, "").replace(/\]/, ""))
    }
    const names = domainName.split(".")
    const tldAndPort = names[names.length - 1]
    if (tldAndPort.includes("::") || tldAndPort.split(":").length > 2) {
        return false
    }
    if (tldAndPort.startsWith(":") || tldAndPort.endsWith(":")) {
        return false
    }
    const [tld, port] = tldAndPort.split(":")
    names[names.length - 1] = tld
    if (port && !/^\d{2,5}$/.test(port)) {
        return false
    }
    if (port && (Number(port) <= 10 || Number(port) > 65535)) {
        return false
    }
    if (names.length === 1 && tld === "localhost") {
        return true
    }
    if (names.length === 4) {
        if (names.every(n => /^\d{1,3}$/.test(n))) {
            if (names.every(n => Number(n) <= 255)) {
                return true
            }
        }
    }
    if (names.length < 2) {
        return false
    }
    if (/^[a-zA-Z]{2,}$/.test(tld)) {
        const invalidDashes = names.find(
            n => n.includes("---") || n.startsWith("-") || n.endsWith("-"))
        if (!invalidDashes && names.every(n => /^[a-zA-Z\d-]+$/.test(n))) {
            return true
        }
    }
    return false
}

const searchword = location => {
    for (const mapping of getSetting("searchwords").split(",")) {
        const [word, url] = mapping.split("~")
        if (word && url) {
            const query = location.replace(`${word} `, "")
            if (query && location.startsWith(`${word} `)) {
                return {word, "url": stringToUrl(url.replace(/%s/g, query))}
            }
        }
    }
    return {"word": null, "url": location}
}

const listNotificationHistory = () => notificationHistory

const specialPagePath = (page, section = null, skipExistCheck = false) => {
    if (!specialPages.includes(page) && !skipExistCheck) {
        page = "help"
    }
    const url = joinPath(__dirname, `./pages/${page}.html`)
        .replace(/\\/g, "/").replace(/^\/*/g, "")
    if (section) {
        if (section.startsWith("#")) {
            return `file:///${url}${section}`
        }
        return `file:///${url}#${section}`
    }
    return `file:///${url}`
}

const globDelete = folder => {
    // Request is send back to the main process due to electron-builder bugs:
    // https://github.com/electron-userland/electron-builder/issues/5662
    // https://github.com/electron-userland/electron-builder/issues/5625
    // https://github.com/electron-userland/electron-builder/issues/5706
    // https://github.com/electron-userland/electron-builder/issues/5617
    // It seems that modules not used in the main process are dropped on build.
    const {ipcRenderer} = require("electron")
    ipcRenderer.sendSync("rimraf", joinPath(appData(), folder))
}

const clearTempContainers = () => {
    globDelete("Partitions/temp*")
    globDelete("erwicmode")
}

const clearCache = () => {
    globDelete("**/*Cache/")
    globDelete("**/File System/")
    globDelete("**/MANIFEST")
    globDelete("**/Service Worker/")
    globDelete("**/VideoDecodeStats/")
    globDelete("**/blob_storage/")
    globDelete("**/databases/")
    globDelete("*.log")
    globDelete("**/.org.chromium.Chromium.*")
    globDelete("vimformedits/")
    globDelete("webviewsettings")
}

const clearCookies = () => {
    globDelete("**/Cookies*")
    globDelete("**/QuotaManager*")
}

const clearLocalStorage = () => {
    globDelete("**/IndexedDB/")
    globDelete("**/*Storage/")
    globDelete("**/*.ldb")
}

const expandPath = loc => {
    if (loc.startsWith("~")) {
        if (!homeDirPath) {
            homeDirPath = process.env.HOME || process.env.USERPROFILE
                || require("os").homedir()
        }
        return loc.replace("~", homeDirPath)
    }
    return loc
}

const isObject = o => o === Object(o)

const stringToUrl = location => {
    const specialPage = pathToSpecialPageName(location)
    if (specialPage.name) {
        return specialPagePath(specialPage.name, specialPage.section)
    }
    if (hasProtocol(location)) {
        return location
    }
    const local = expandPath(location)
    if (isDir(local) || isFile(local)) {
        return `file:/${local}`.replace(/^file:\/*/, "file:///")
    }
    if (isUrl(location)) {
        return `https://${location}`
    }
    return getSetting("search").replace(/%s/g, encodeURIComponent(location))
}

const urlToString = url => {
    const special = pathToSpecialPageName(url)
    if (special.name === "newtab") {
        url = ""
    } else if (special.name) {
        url = `${appName()}://${special.name}`
        if (special.section) {
            url += `#${special.section}`
        }
    }
    try {
        return decodeURI(url)
    } catch (_) {
        // Invalid url
    }
    return url
}

const title = str => str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase()

const downloadPath = () => expandPath(getSetting("downloadpath"))

const firefoxUseragent = () => {
    const daysSinceBase = (new Date() - new Date(2020, 6, 28)) / 86400000
    const ver = `${79 + Math.floor(daysSinceBase / 28)}.0`
    const sys = window.navigator.platform
    return `Mozilla/5.0 (${sys}; rv:${ver}) Gecko/20100101 Firefox/${ver}`
}

const sameDomain = (d1, d2) => {
    const e1 = document.createElement("a")
    e1.setAttribute("href", d1)
    const e2 = document.createElement("a")
    e2.setAttribute("href", d2)
    const h1 = e1.hostname.replace(/^www\./, "")
    const h2 = e2.hostname.replace(/^www\./, "")
    return d1 && d2 && h1 && h2 && h1 === h2
}

const formatDate = date => {
    if (typeof date === "string") {
        date = new Date(date)
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")
    }-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours())
        .padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${
        String(date.getSeconds()).padStart(2, "0")}`
}

const storeFrameInfo = (element, options) => {
    if (!element) {
        return
    }
    const info = framePaddingInfo.find(i => i.element === element)
    if (info) {
        Object.assign(info, options)
    } else {
        framePaddingInfo.push({element, ...options})
    }
}

const findFrameInfo = el => framePaddingInfo.find(i => i.element === el)

const framePosition = frame => ({
    "x": frame.getBoundingClientRect().x
        + propPixels({"pl": getComputedStyle(frame).paddingLeft}, "pl")
        + propPixels({"bl": getComputedStyle(frame).borderLeftWidth}, "bl"),
    "y": frame.getBoundingClientRect().y
        + propPixels({"pt": getComputedStyle(frame).paddingTop}, "pt")
        + propPixels({"bt": getComputedStyle(frame).borderTopWidth}, "bt")
})

const propPixels = (element, prop) => {
    const value = element[prop]
    if (value?.endsWith("px")) {
        return Number(value.replace("px", "")) || 0
    }
    if (value?.endsWith("em")) {
        const elementFontSize = Number(getComputedStyle(document.body)
            .fontSize.replace("px", "")) || 0
        return Number(value.replace("em", "")) * elementFontSize || 0
    }
    return 0
}

const findElementAtPosition = (x, y, levels = [document], px = 0, py = 0) => {
    // Find out which element is located at a given position.
    // Will look inside subframes recursively at the corrected position.
    const elementAtPos = levels?.[0]?.elementFromPoint(x - px, y - py)
    if (levels.includes(elementAtPos?.shadowRoot || elementAtPos)) {
        return elementAtPos
    }
    if (elementAtPos?.matches?.(frameSelector)) {
        const frameInfo = findFrameInfo(elementAtPos) || {}
        return findElementAtPosition(x, y,
            [elementAtPos.contentDocument, ...levels], frameInfo.x, frameInfo.y)
    }
    if (elementAtPos?.shadowRoot) {
        const frameInfo = findFrameInfo(elementAtPos.shadowRoot) || {}
        return findElementAtPosition(x, y,
            [elementAtPos.shadowRoot, ...levels], frameInfo.x, frameInfo.y)
    }
    return elementAtPos
}

const querySelectorAll = (sel, base = document, paddedX = 0, paddedY = 0) => {
    if (!base) {
        return []
    }
    let elements = []
    if (base === document) {
        elements = Array.from(base.querySelectorAll(sel) || [])
    }
    Array.from(base.querySelectorAll("*") || [])
        .filter(el => el.shadowRoot || el?.matches?.(frameSelector))
        .forEach(el => {
            let location = {"x": paddedX, "y": paddedY}
            if (!el.shadowRoot) {
                const {"x": frameX, "y": frameY} = framePosition(el)
                location = {"x": frameX + paddedX, "y": frameY + paddedY}
            }
            storeFrameInfo(el?.shadowRoot || el, location)
            const extra = Array.from((el.contentDocument || el.shadowRoot)
                ?.querySelectorAll(sel) || [])
            extra.forEach(e => storeFrameInfo(e, location))
            elements = elements.concat([...extra, ...querySelectorAll(sel,
                el.contentDocument || el.shadowRoot,
                location.x, location.y)])
        })
    return elements
}

const findClickPosition = (element, rects) => {
    let dimensions = {}
    let clickable = false
    // Check if the center of the bounding rect is actually clickable,
    // For every possible rect of the element and it's sub images.
    for (const rect of rects) {
        const rectX = rect.x + rect.width / 2
        const rectY = rect.y + rect.height / 2
        // Update the region if it's larger or the first region found
        if (rect.width > dimensions.width
                || rect.height > dimensions.height || !clickable) {
            const elementAtPos = findElementAtPosition(rectX, rectY)
            if (element === elementAtPos || element?.contains(elementAtPos)) {
                clickable = true
                dimensions = rect
            }
        }
    }
    return {clickable, dimensions}
}

const activeElement = () => {
    if (document.activeElement?.shadowRoot?.activeElement) {
        return document.activeElement.shadowRoot.activeElement
    }
    if (document.activeElement !== document.body) {
        if (!document.activeElement?.matches(frameSelector)) {
            return document.activeElement
        }
    }
    return querySelectorAll(frameSelector).map(frame => {
        const doc = frame.contentDocument
        if (!doc) {
            return false
        }
        if (doc.activeElement?.shadowRoot?.activeElement) {
            return doc.activeElement.shadowRoot.activeElement
        }
        if (doc.body !== doc.activeElement) {
            if (!doc.activeElement.matches(frameSelector)) {
                return doc.activeElement
            }
        }
        return false
    }).find(el => el)
}

const formatSize = size => {
    if (size < 1024) {
        return `${size} B`
    }
    const exp = Math.floor(Math.log(size) / Math.log(1024))
    return `${(size / Math.pow(1024, exp)).toFixed(2)} ${"KMGTPE"[exp - 1]}B`
}

const extractZip = (args, cb) => {
    // Path is constructed manually due to the many electron-builder bugs:
    // https://github.com/electron-userland/electron-builder/issues/5662
    // https://github.com/electron-userland/electron-builder/issues/5625
    // https://github.com/electron-userland/electron-builder/issues/5706
    // https://github.com/electron-userland/electron-builder/issues/5617
    // It seems that modules not used in the main process are dropped on build,
    // so we explicitly tell electron-builder to add them extracted.
    // This way we can call the right tool ourselves without importing it.
    let loc = joinPath(__dirname, "../node_modules/7zip-bin/")
    if (process.platform === "darwin") {
        loc = joinPath(loc, "mac", process.arch, "7za")
    } else if (process.platform === "win32") {
        loc = joinPath(loc, "win", process.arch, "7za.exe")
    } else {
        loc = joinPath(loc, "linux", process.arch, "7za")
    }
    const {spawn} = require("child_process")
    spawn(loc, args).on("exit", cb)
}

// IPC UTIL

const notify = (message, type = "info", clickAction = false) => {
    if (getSetting("notificationduration") === 0) {
        return
    }
    let properType = "info"
    if (type.startsWith("perm")) {
        properType = "permission"
    }
    if (type.startsWith("suc")) {
        properType = "success"
    }
    if (type.startsWith("warn")) {
        properType = "warning"
    }
    if (type.startsWith("err")) {
        properType = "error"
    }
    const escapedMessage = message.replace(/>/g, "&gt;").replace(/</g, "&lt;")
        .replace(/\n/g, "<br>")
    notificationHistory.push({
        "message": escapedMessage,
        "type": properType,
        "date": new Date(),
        "click": clickAction
    })
    if (properType === "permission") {
        if (!getSetting("notificationforpermissions")) {
            return
        }
    }
    if (getSetting("nativenotification")) {
        const n = Notification(`${appName()} ${properType}`, {"body": message})
        n.onclick = () => {
            if (clickAction?.type === "download-success") {
                const {ipcRenderer} = require("electron")
                ipcRenderer.send("open-download", clickAction.path)
            }
        }
        return
    }
    if (properType !== "permission") {
        if (escapedMessage.split("<br>").length > 5 || message.length > 200) {
            const {ipcRenderer} = require("electron")
            ipcRenderer.send("show-notification", escapedMessage, properType)
            return
        }
    }
    const notificationsElement = document.getElementById("notifications")
    notificationsElement.className = getSetting("notificationposition")
    const notification = document.createElement("span")
    notification.className = properType
    notification.innerHTML = escapedMessage
    if (clickAction?.type === "download-success") {
        notification.addEventListener("click", () => {
            const {ipcRenderer} = require("electron")
            ipcRenderer.send("open-download", clickAction.path)
        })
    }
    notificationsElement.appendChild(notification)
    setTimeout(() => notification.remove(),
        getSetting("notificationduration"))
}

const appIcon = () => {
    if (customIcon === null) {
        const {ipcRenderer} = require("electron")
        customIcon = ipcRenderer.sendSync("custom-icon")
    }
    return customIcon
}

const appName = () => {
    if (!applicationName) {
        const {ipcRenderer} = require("electron")
        applicationName = ipcRenderer.sendSync("app-name")
    }
    return applicationName.toLowerCase()
}

const appData = () => {
    if (!appDataPath) {
        try {
            const {app} = require("electron")
            return app.getPath("appData")
        } catch (_) {
            // Not in main thread
        }
        const {ipcRenderer} = require("electron")
        appDataPath = ipcRenderer.sendSync("appdata-path")
    }
    return appDataPath
}

// PATH UTIL

const path = require("path")

const pathToSpecialPageName = urlPath => {
    if (urlPath?.startsWith?.(`${appName()}://`)) {
        const parts = urlPath.replace(`${appName()}://`, "").split("#")
        let name = parts[0]
        if (!specialPages.includes(name)) {
            name = "help"
        }
        return {"name": name, "section": parts.slice(1).join("#") || ""}
    }
    if (urlPath?.startsWith?.("file://")) {
        for (const page of specialPages) {
            const specialPage = specialPagePath(page).replace(/^file:\/*/g, "")
            const normalizedUrl = path.posix.normalize(
                urlPath.replace(/^file:\/*/g, ""))
            if (normalizedUrl.startsWith(specialPage)) {
                return {
                    "name": page,
                    "section": urlPath.split("#").slice(1).join("#")
                }
            }
            try {
                const decodedPath = decodeURI(urlPath)
                const decodedNormalizedUrl = path.posix.normalize(
                    decodedPath.replace(/^file:\/*/g, ""))
                if (decodedNormalizedUrl.startsWith(specialPage)) {
                    return {
                        "name": page,
                        "section": urlPath.split("#").slice(1).join("#")
                    }
                }
            } catch (_) {
                // Invalid url
            }
        }
    }
    return {"name": "", "section": ""}
}

const unpacked = {}
const resolveUnpacked = loc => {
    if (!unpacked[loc]) {
        unpacked[loc] = loc
        const newloc = loc.replace(/app\.asar([\\/])/, "app.asar.unpacked$1")
        if (isFile(newloc)) {
            unpacked[loc] = newloc
        }
    }
    return unpacked[loc]
}

const joinPath = (...args) => resolveUnpacked(path.resolve(path.join(...args)))

const basePath = (...args) => path.basename(...args)

const dirname = (...args) => path.dirname(...args)

const isAbsolutePath = (...args) => path.isAbsolute(...args)

// FILESYSTEM UTIL

const fs = require("fs")

const pathExists = loc => {
    try {
        return fs.existsSync(loc)
    } catch (e) {
        return false
    }
}

const isDir = loc => {
    try {
        return fs.statSync(loc).isDirectory()
    } catch (e) {
        return false
    }
}

const isFile = loc => {
    try {
        return fs.statSync(loc).isFile()
    } catch (e) {
        return false
    }
}

const readFile = loc => {
    try {
        return fs.readFileSync(loc).toString()
    } catch (e) {
        return null
    }
}

const readJSON = loc => {
    try {
        return JSON.parse(fs.readFileSync(loc).toString())
    } catch (e) {
        return null
    }
}

const writeFile = (loc, data, err = null, success = null) => {
    try {
        fs.writeFileSync(loc, data)
        if (success) {
            notify(success)
        }
        return true
    } catch (e) {
        if (err) {
            notify(err, "err")
        }
    }
    return false
}

const writeJSON = (loc, data, err = null, success = null, indent = null) => {
    try {
        fs.writeFileSync(loc, JSON.stringify(data, null, indent))
        if (success) {
            notify(success)
        }
        return true
    } catch (e) {
        if (err) {
            notify(err, "err")
        }
    }
    return false
}

const deleteFile = (loc, err = null) => {
    try {
        fs.unlinkSync(loc)
        return true
    } catch (e) {
        if (err) {
            notify(err, "warn")
        }
    }
    return false
}

const makeDir = (loc, err = null, success = null) => {
    try {
        fs.mkdirSync(loc, {"recursive": true})
        if (success) {
            notify(success)
        }
        return true
    } catch (e) {
        if (err) {
            notify(err, "err")
        }
    }
    return false
}

const listDir = (loc, absolute = false, dirsOnly = false) => {
    try {
        let files = fs.readdirSync(loc)
        if (absolute) {
            files = files.map(f => joinPath(loc, f))
        }
        if (dirsOnly) {
            files = files.filter(f => isDir(f))
        }
        return files
    } catch (_) {
        return null
    }
}

const watchFile = (...args) => fs.watchFile(...args)

const modifiedAt = loc => {
    try {
        return fs.statSync(loc).mtime
    } catch (_) {
        return 0
    }
}

module.exports = {
    frameSelector,
    specialChars,
    hasProtocol,
    isUrl,
    searchword,
    listNotificationHistory,
    specialPagePath,
    globDelete,
    clearTempContainers,
    clearCache,
    clearCookies,
    clearLocalStorage,
    expandPath,
    isObject,
    stringToUrl,
    urlToString,
    title,
    downloadPath,
    firefoxUseragent,
    sameDomain,
    formatDate,
    findFrameInfo,
    propPixels,
    findElementAtPosition,
    querySelectorAll,
    findClickPosition,
    activeElement,
    formatSize,
    extractZip,
    // IPC UTIL
    notify,
    appIcon,
    appName,
    appData,
    // PATH UTIL
    pathToSpecialPageName,
    joinPath,
    basePath,
    dirname,
    isAbsolutePath,
    // FILESYSTEM UTIL
    pathExists,
    isDir,
    isFile,
    readFile,
    readJSON,
    writeFile,
    writeJSON,
    deleteFile,
    makeDir,
    listDir,
    watchFile,
    modifiedAt
}
