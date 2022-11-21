/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2022 Jelmer van Arnhem
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
    "help",
    "history",
    "newtab",
    "notifications",
    "version"
]
const notificationHistory = []
let appDataPath = ""
let homeDirPath = ""
let configSettings = ""
const framePaddingInfo = []
const specialChars = /[：”；’、。！`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/\s]/gi
const specialCharsAllowSpaces = /[：”；’、。！`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi
const dataUris = [
    "blob",
    "data",
    "javascript",
    "magnet",
    "mailto",
    "view-source",
    "viewsource",
    "sourceviewer",
    "readerview",
    "markdownviewer",
    "ws"
]
const getSetting = val => JSON.parse(sessionStorage.getItem("settings"))?.[val]

const hasProtocol = loc => protocolRegex.test(loc)
    || dataUris.find(d => loc.startsWith(`${d}:`))

const isUrl = location => {
    if (hasProtocol(location)) {
        try {
            return !new URL(location).host.includes("%20")
        } catch {
            return false
        }
    }
    let url = null
    try {
        url = new URL(`https://${location}`)
    } catch {
        return false
    }
    if (url.hostname.startsWith("[") && url.hostname.endsWith("]")) {
        return ipv6Regex.test(url.hostname.replace(/^\[/, "").replace(/\]$/, ""))
    }
    const names = url.hostname.split(".")
    const invalid = names.find(n => n.includes("---")
        || encodeURI(n) !== n || n.startsWith("-") || n.endsWith("-"))
        || url.host.includes("..")
    if (invalid || url.port && Number(url.port) <= 10) {
        return false
    }
    if (names.length < 2) {
        return url.hostname === "localhost"
    }
    return true
}

const searchword = location => {
    for (const mapping of getSetting("searchwords").split(",")) {
        const [word, url] = mapping.split("~")
        if (word && url) {
            const q = location.replace(`${word} `, "")
            if (q && location.startsWith(`${word} `)) {
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

const listNotificationHistory = () => notificationHistory

const specialPagePath = (userPage, section = null, skipExistCheck = false) => {
    let page = userPage
    if (!specialPages.includes(userPage) && !skipExistCheck) {
        page = "help"
    }
    let url = joinPath(__dirname, `./pages/${page}.html`)
        .replace(/\\/g, "/").replace(/^\/*/g, "")
    if (isDir(joinPath(__dirname, "../pages"))) {
        url = joinPath(__dirname, `../pages/${page}.html`)
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

const stringToUrl = location => {
    let url = String(location)
    const specialPage = pathToSpecialPageName(url)
    if (specialPage.name) {
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
        const engines = getSetting("search").split(",")
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

const urlToString = url => {
    const special = pathToSpecialPageName(url)
    if (special.name) {
        let specialUrl = `${appConfig().name.toLowerCase()}://${special.name}`
        if (special.section) {
            specialUrl += `#${special.section}`
        }
        return specialUrl
    }
    try {
        const decoded = decodeURI(url)
        let fileName = decoded.replace(/^file:\/+/, "/")
        if (process.platform === "win32") {
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

const title = s => {
    if (!s || !s[0]) {
        return ""
    }
    return `${s[0].toUpperCase()}${s.slice(1).toLowerCase()}`
}

const downloadPath = () => expandPath(getSetting("downloadpath")
    || appConfig().downloads || "~/Downloads")

const userAgentTemplated = agent => {
    if (!agent) {
        return ""
    }
    const version = `${process.versions.chrome.split(".")[0]}.0.0.0`
    return agent
        .replace(/%sys/g, userAgentPlatform())
        .replace(/%firefoxversion/g, firefoxVersion())
        .replace(/%fullversion/g, process.versions.chrome)
        .replace(/%version/g, version)
        .replace(/%firefox/g, firefoxUseragent())
        .replace(/%default/g, defaultUseragent())
}

const userAgentPlatform = () => {
    let platform = "X11; Linux x86_64"
    if (process.platform === "win32") {
        platform = "Window NT 10.0; Win64; x64"
    }
    if (process.platform === "darwin") {
        platform = "Macintosh; Intel Mac OS X 10_15_7"
    }
    return platform
}

const defaultUseragent = () => {
    const [version] = process.versions.chrome.split(".")
    const sys = userAgentPlatform()
    return `Mozilla/5.0 (${sys}) AppleWebKit/537.36 (KHTML, like Gecko) `
        + `Chrome/${version}.0.0.0 Safari/537.36`
}

const firefoxVersion = () => {
    const daysSinceBase = (new Date() - new Date(2021, 7, 10)) / 86400000
    return `${91 + Math.floor(daysSinceBase / 28)}.0`
}

const firefoxUseragent = () => {
    const ver = firefoxVersion()
    const sys = userAgentPlatform()
    return `Mozilla/5.0 (${sys}; rv:${ver}) Gecko/20100101 Firefox/${ver}`
}

const domainName = url => {
    try {
        const {host} = new URL(url)
        if (host.endsWith("localhost") || host.match(/^(\d|\.)+$/)) {
            return host
        }
        return host.replace(/(?:[a-zA-Z0-9]+\.)+(\w+\.\w+)/, "$1")
    } catch {
        return null
    }
}

const sameDomain = (url1, url2) => {
    const domain1 = domainName(url1)
    const domain2 = domainName(url2)
    return domain1 && domain2 && domain1 === domain2
}

const formatDate = dateStringOrNumber => {
    let date = dateStringOrNumber
    if (typeof date === "number") {
        date = new Date(dateStringOrNumber * 1000)
    }
    if (typeof date === "string") {
        date = new Date(dateStringOrNumber)
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
    "x": frame.getBoundingClientRect().x + propPixels(frame, "paddingLeft")
        + propPixels(frame, "borderLeftWidth"),
    "y": frame.getBoundingClientRect().y + propPixels(frame, "paddingTop")
        + propPixels(frame, "borderTopWidth")
})

const propPixels = (element, prop) => {
    const value = element[prop] || getComputedStyle(element)[prop]
    if (typeof value === "number") {
        return value
    }
    if (value?.endsWith("px")) {
        return Number(value.replace("px", "")) || 0
    }
    if (value?.endsWith("em")) {
        const elementFontSize = Number(getComputedStyle(document.body)
            .fontSize.replace("px", "")) || 0
        return Number(value.replace("em", "")) * elementFontSize || 0
    }
    return Number(value) || 0
}

const matchesQuery = (el, query) => {
    try {
        return el.matches(query)
    } catch {
        // Not all elements with the 'matches' attribute have it as a function
        // Therefore we just try to call it as one, and return false otherwise
        return false
    }
}

const findElementAtPosition = (x, y, levels = [document], px = 0, py = 0) => {
    // Find out which element is located at a given position.
    // Will look inside subframes recursively at the corrected position.
    const elementAtPos = levels?.[0]?.elementFromPoint(x - px, y - py)
    if (levels.includes(elementAtPos?.shadowRoot || elementAtPos)) {
        return elementAtPos
    }
    if (matchesQuery(elementAtPos, "iframe")) {
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
        .filter(el => el.shadowRoot || matchesQuery(el, "iframe"))
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

const correctedCenterAndSizeOfRect = rect => {
    let {x, y} = rect
    x = x || rect.left
    y = y || rect.top
    let width = Math.min(rect.width, window.innerWidth - x)
    if (x < 0) {
        width += x
        x = 0
    }
    let height = Math.min(rect.height, window.innerHeight - y)
    if (y < 0) {
        height += y
        y = 0
    }
    const centerX = x + width / 2
    const centerY = y + height / 2
    return {centerX, centerY, height, width, x, y}
}

const findClickPosition = (element, rects) => {
    let dims = {}
    let clickable = false
    for (const rect of rects) {
        const {
            centerX, centerY, x, y, width, height
        } = correctedCenterAndSizeOfRect(rect)
        if (!clickable || width > dims.width || height > dims.height) {
            const elAtPos = findElementAtPosition(centerX, centerY)
            if (element === elAtPos || element?.contains(elAtPos)) {
                clickable = true
                dims = {height, width, x, y}
            }
        }
    }
    if (!clickable) {
        for (const rect of [...element.getClientRects()]) {
            const {
                centerX, centerY, x, y, width, height
            } = correctedCenterAndSizeOfRect(rect)
            if (!clickable || width > dims.width || height > dims.height) {
                const elAtPos = findElementAtPosition(centerX, centerY)
                if (element === elAtPos || element?.contains(elAtPos)) {
                    clickable = true
                    dims = {height, width, x, y}
                }
            }
        }
    }
    return {clickable, dims}
}

const activeElement = () => {
    if (document.activeElement?.shadowRoot?.activeElement) {
        return document.activeElement.shadowRoot.activeElement
    }
    if (document.activeElement !== document.body) {
        if (!matchesQuery(document.activeElement, "iframe")) {
            return document.activeElement
        }
    }
    return querySelectorAll("iframe").map(frame => {
        const doc = frame.contentDocument
        if (!doc) {
            return false
        }
        if (doc.activeElement?.shadowRoot?.activeElement) {
            return doc.activeElement.shadowRoot.activeElement
        }
        if (doc.body !== doc.activeElement) {
            if (!matchesQuery(doc.activeElement, "iframe")) {
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
    return `${(size / 1024 ** exp).toFixed(2)} ${"KMGTPE"[exp - 1]}B`
}

const compareVersions = (v1Str, v2Str) => {
    const v1 = v1Str.replace(/^v/g, "").trim()
    const v2 = v2Str.replace(/^v/g, "").trim()
    if (v1 === v2) {
        return "even"
    }
    const [v1num, v1ext] = v1.split("-")
    const [v2num, v2ext] = v2.split("-")
    // Same number and at least one of them has a suffix such as "-dev"
    if (v1num === v2num) {
        if (v1ext && v2ext) {
            // Do a simple comparison of named pre releases
            const suffixMap = {"alpha": 2, "beta": 3, "dev": 1, "prerelease": 4}
            const v1suffix = suffixMap[v1ext] || 0
            const v2suffix = suffixMap[v2ext] || 0
            if (v1suffix > v2suffix) {
                return "newer"
            }
            if (v1suffix < v2suffix) {
                return "older"
            }
        } else if (v1ext) {
            return "older"
        } else if (v2ext) {
            return "newer"
        }
        return "even"
    }
    for (let i = 0; i < 3; i++) {
        if (Number(v1num.split(".")[i]) > Number(v2num.split(".")[i])) {
            return "newer"
        }
        if (Number(v1num.split(".")[i]) < Number(v2num.split(".")[i])) {
            return "older"
        }
    }
    return "unknown"
}

const fetchJSON = url => new Promise((res, rej) => {
    const https = require("https")
    const request = https.request(url, response => {
        let data = ""
        response.on("data", chunk => {
            data += chunk.toString()
        })
        response.on("end", () => {
            try {
                res(JSON.parse(data))
            } catch (err) {
                rej(err)
            }
        })
    })
    request.on("error", err => rej(err))
    request.end()
})

const pageOffset = page => {
    const border = propPixels(page, "borderWidth")
    const top = Math.round(propPixels(page.style, "top") + border)
    const left = Math.round(propPixels(page.style, "left") + border)
    const bottom = Math.round(top + propPixels(page.style, "height") + border)
    const right = Math.round(left + propPixels(page.style, "width") + border)
    return {bottom, left, right, top}
}

const execCommand = (command, callback) => {
    let shell = null
    if (process.platform === "win32") {
        shell = process.env.ComSpec || shell
    }
    shell = process.env.SHELL || shell
    shell = shell || getSetting("shell")
    const {exec} = require("child_process")
    if (shell) {
        return exec(command, {shell}, callback)
    }
    return exec(command, callback)
}

// IPC UTIL

const sendToPageOrSubFrame = (channel, ...args) => {
    const {ipcRenderer} = require("electron")
    ipcRenderer.send(channel, document.getElementById("current-page")
        ?.getWebContentsId(), ...args)
}

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
    if (type.startsWith("dial")) {
        properType = "dialog"
    }
    const escapedMessage = message.replace(/>/g, "&gt;").replace(/</g, "&lt;")
        .replace(/\n/g, "<br>")
    notificationHistory.push({
        "click": clickAction,
        "date": new Date(),
        "message": escapedMessage,
        "type": properType
    })
    if (properType === "permission") {
        if (!getSetting("notificationforpermissions")) {
            return
        }
    }
    const native = getSetting("nativenotification")
    const showLong = escapedMessage.split("<br>").length > 3
        && properType !== "dialog"
    if (native === "always" || !showLong && native === "smallonly") {
        const n = new Notification(
            `${appConfig().name} ${properType}`, {"body": message})
        n.onclick = () => {
            if (clickAction?.type === "download-success") {
                const {ipcRenderer} = require("electron")
                ipcRenderer.send("open-download", clickAction.path)
            }
        }
        return
    }
    if (showLong) {
        const {ipcRenderer} = require("electron")
        ipcRenderer.send("show-notification", escapedMessage, properType)
        return
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

const appData = () => {
    if (!appDataPath) {
        try {
            const {app} = require("electron")
            return app.getPath("appData")
        } catch {
            // Not in main thread
        }
        appDataPath = appConfig().appdata
    }
    return appDataPath
}

const appConfig = () => {
    if (!configSettings) {
        const {ipcRenderer} = require("electron")
        configSettings = ipcRenderer.sendSync("app-config")
        let files = [configSettings.override]
        const datafolderConfig = joinPath(appData(), "viebrc")
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

// PATH UTIL

const path = require("path")

const pathToSpecialPageName = urlPath => {
    const appName = appConfig().name.toLowerCase()
    if (urlPath?.startsWith?.(`${appName}://`)) {
        const parts = urlPath.replace(`${appName}://`, "").split("#")
        let [name] = parts
        if (!specialPages.includes(name)) {
            name = "help"
        }
        return {
            name, "section": decodeURIComponent(parts.slice(1).join("#") || "")
        }
    }
    if (urlPath?.startsWith?.("file://")) {
        for (const page of specialPages) {
            const specialPage = specialPagePath(page).replace(/^file:\/+/g, "")
            const normalizedUrl = path.posix.normalize(
                urlPath.replace(/^file:\/+/g, ""))
            if (normalizedUrl.startsWith(specialPage)) {
                return {
                    "name": page,
                    "section": decodeURIComponent(
                        urlPath.split("#").slice(1).join("#"))
                }
            }
            try {
                const decodedPath = decodeURI(urlPath)
                const decodedNormalizedUrl = path.posix.normalize(
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
    return {"name": "", "section": ""}
}

const joinPath = (...args) => path.resolve(path.join(...args))

const basePath = (...args) => path.basename(...args)

const dirname = (...args) => path.dirname(...args)

const isAbsolutePath = (...args) => path.isAbsolute(...args)

// FILESYSTEM UTIL

const fs = require("fs")

const pathExists = loc => {
    try {
        return fs.existsSync(loc)
    } catch {
        return false
    }
}

const isDir = loc => {
    try {
        return fs.statSync(loc).isDirectory()
    } catch {
        return false
    }
}

const isFile = loc => {
    try {
        return fs.statSync(loc).isFile()
    } catch {
        return false
    }
}

const readFile = loc => {
    try {
        return fs.readFileSync(loc).toString()
    } catch {
        return null
    }
}

const readJSON = loc => {
    try {
        return JSON.parse(fs.readFileSync(loc).toString())
    } catch {
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
    } catch {
        if (err) {
            notify(err, "err")
        }
    }
    return false
}

const appendFile = (loc, data, err = null, success = null) => {
    try {
        fs.appendFileSync(loc, data)
        if (success) {
            notify(success)
        }
        return true
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
        if (err) {
            notify(err, "err")
        }
    }
    return false
}

const listDir = (loc, absolute = false, dirsOnly = false) => {
    try {
        let files = fs.readdirSync(loc)
        if (dirsOnly) {
            files = files.filter(f => isDir(joinPath(loc, f)))
        }
        if (absolute) {
            files = files.map(f => joinPath(loc, f))
        }
        return files
    } catch {
        return null
    }
}

const watchFile = (...args) => fs.watchFile(...args)

const modifiedAt = loc => {
    try {
        return fs.statSync(loc).mtime
    } catch {
        return 0
    }
}

const rm = f => {
    const rf = require("./rimraf")
    rf(f)
}

const clearTempContainers = () => {
    const partitionDir = joinPath(appData(), "Partitions")
    listDir(partitionDir, false, true)?.filter(part => part.startsWith("temp"))
        .map(part => joinPath(partitionDir, part)).forEach(part => rm(part))
    rm(joinPath(appData(), "erwicmode"))
}

const clearCache = () => {
    const partitionDir = joinPath(appData(), "Partitions")
    const partitions = [appData(), ...listDir(partitionDir, true, true) || []]
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
    rm(joinPath(appData(), "webviewsettings"))
}

const clearCookies = () => {
    const partitionDir = joinPath(appData(), "Partitions")
    const partitions = [appData(), ...listDir(partitionDir, true, true) || []]
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

const clearLocalStorage = () => {
    const partitionDir = joinPath(appData(), "Partitions")
    const partitions = [appData(), ...listDir(partitionDir, true, true) || []]
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

// Disabled import sort order as the order is optimized to reduce module loads
/* eslint-disable sort-keys/sort-keys-fix */
module.exports = {
    specialChars,
    specialCharsAllowSpaces,
    hasProtocol,
    isUrl,
    searchword,
    listNotificationHistory,
    specialPagePath,
    expandPath,
    stringToUrl,
    urlToString,
    title,
    downloadPath,
    userAgentTemplated,
    userAgentPlatform,
    defaultUseragent,
    firefoxVersion,
    firefoxUseragent,
    domainName,
    sameDomain,
    formatDate,
    findFrameInfo,
    framePosition,
    propPixels,
    matchesQuery,
    findElementAtPosition,
    querySelectorAll,
    findClickPosition,
    activeElement,
    formatSize,
    compareVersions,
    fetchJSON,
    pageOffset,
    execCommand,
    // IPC UTIL
    sendToPageOrSubFrame,
    notify,
    appData,
    appConfig,
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
    appendFile,
    writeJSON,
    deleteFile,
    makeDir,
    listDir,
    watchFile,
    modifiedAt,
    rm,
    clearTempContainers,
    clearCache,
    clearCookies,
    clearLocalStorage
}
