/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2020 Jelmer van Arnhem
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
/* global SETTINGS */
"use strict"

const {ipcRenderer} = require("electron")
const fs = require("fs")
const path = require("path")
const os = require("os")

const protocolRegex = /^[a-z][a-z0-9-+.]+:\/\//
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

const hasProtocol = location => protocolRegex.test(location)

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

const notify = (message, type = "info") => {
    if (SETTINGS.get("notificationduration") < 100) {
        return
    }
    let properType = "info"
    if (type.startsWith("perm")) {
        properType = "permission"
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
        "message": escapedMessage, "type": properType, "date": new Date()
    })
    if (properType === "permission") {
        if (!SETTINGS.get("notificationforpermissions")) {
            return
        }
    }
    if (SETTINGS.get("nativenotification")) {
        new Notification(`Vieb ${properType}`, {"body": message})
        return
    }
    if (escapedMessage.split("<br>").length > 5 || message.length > 200) {
        ipcRenderer.send("show-notification", escapedMessage, properType)
        return
    }
    const notificationsElement = document.getElementById("notifications")
    notificationsElement.className = SETTINGS.get("notificationposition")
    const notification = document.createElement("span")
    notification.className = properType
    notification.innerHTML = escapedMessage
    notificationsElement.appendChild(notification)
    setTimeout(() => {
        notificationsElement.removeChild(notification)
    }, SETTINGS.get("notificationduration"))
}

const specialPagePath = (page, section = null, skipExistCheck = false) => {
    if (!specialPages.includes(page) && !skipExistCheck) {
        page = "help"
    }
    const url = path.join(__dirname, `../pages/${page}.html`)
        .replace(/\\/g, "/").replace(/^\/*/g, "")
    if (section) {
        if (section.startsWith("#")) {
            return `file:///${url}${section}`
        }
        return `file:///${url}#${section}`
    }
    return `file:///${url}`
}

const pathToSpecialPageName = urlPath => {
    if (urlPath.startsWith("vieb://")) {
        const parts = urlPath.replace("vieb://", "").split("#")
        let name = parts[0]
        if (!specialPages.includes(name)) {
            name = "help"
        }
        return {"name": name, "section": parts.slice(1).join("#") || ""}
    }
    if (urlPath.startsWith("file://")) {
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
            const decodedPath = decodeURIComponent(urlPath)
            const decodedNormalizedUrl = path.posix.normalize(
                decodedPath.replace(/^file:\/*/g, ""))
            if (decodedNormalizedUrl.startsWith(specialPage)) {
                return {
                    "name": page,
                    "section": urlPath.split("#").slice(1).join("#")
                }
            }
        }
    }
    return {"name": "", "section": ""}
}

const globDelete = folder => {
    try {
        require("rimraf").sync(path.join(appData(), folder))
    } catch (e) {
        // Rimraf errors
    }
}

const clearContainerTabs = () => {
    document.getElementById("pages").innerHTML = ""
    globDelete("Partitions/!(main)")
}

const clearCache = () => {
    globDelete("**/*Cache/")
    globDelete("**/File System/")
    globDelete("**/MANIFEST")
    globDelete("**/Service Worker/")
    globDelete("**/VideoDecodeStats/")
    globDelete("**/blob_storage/")
    globDelete("**/databases/")
    globDelete("**/*.log")
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

const expandPath = homePath => {
    if (homePath.startsWith("~")) {
        return homePath.replace("~", os.homedir())
    }
    return homePath
}

const isObject = o => o === Object(o)

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

const stringToUrl = location => {
    const specialPage = pathToSpecialPageName(location)
    const local = expandPath(location)
    if (specialPage.name) {
        return specialPagePath(specialPage.name, specialPage.section)
    }
    if (hasProtocol(location)) {
        return location
    }
    if (isDir(local) || isFile(local)) {
        return `file:/${local}`.replace(/^file:\/*/, "file:///")
    }
    if (isUrl(location)) {
        return `https://${location}`
    }
    return SETTINGS.get("search") + encodeURIComponent(location)
}

const urlToString = url => {
    const special = pathToSpecialPageName(url)
    if (special.name === "newtab") {
        url = ""
    } else if (special.name) {
        url = `vieb://${special.name}`
        if (special.section) {
            url += `#${special.section}`
        }
    }
    return decodeURI(url)
}

const listNotificationHistory = () => notificationHistory

const title = name => name[0].toUpperCase() + name.slice(1).toLowerCase()

const downloadPath = () => expandPath(SETTINGS.get("downloadpath"))

const appData = () => {
    if (!appDataPath) {
        appDataPath = ipcRenderer.sendSync("appdata-path")
    }
    return appDataPath
}

const firefoxUseragent = () => {
    const daysSinceBase = (new Date() - new Date(2020, 6, 28)) / 86400000
    const ver = `${79 + Math.floor(daysSinceBase / 28)}.0`
    const sys = window.navigator.platform
    return `Mozilla/5.0 (${sys}; rv:${ver}) Gecko/20100101 Firefox/${ver}`
}

module.exports = {
    hasProtocol,
    isUrl,
    notify,
    specialPagePath,
    pathToSpecialPageName,
    clearContainerTabs,
    clearCache,
    clearCookies,
    clearLocalStorage,
    expandPath,
    isObject,
    pathExists,
    isDir,
    isFile,
    readFile,
    readJSON,
    writeJSON,
    writeFile,
    deleteFile,
    stringToUrl,
    urlToString,
    listNotificationHistory,
    title,
    downloadPath,
    appData,
    firefoxUseragent
}
