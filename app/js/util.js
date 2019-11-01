/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019 Jelmer van Arnhem
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

const {remote} = require("electron")
const fs = require("fs")
const path = require("path")
const rimraf = require("rimraf").sync
const os = require("os")

const protocolRegex = /^[a-z][a-z0-9-+.]+:\/\//
const specialPages = [
    "cookies", "help", "history", "downloads", "newtab", "version"
]

const hasProtocol = location => {
    // Check for a valid protocol at the start
    // This will ALWAYS result in the url being valid
    return protocolRegex.test(location)
}

const isUrl = location => {
    if (hasProtocol(location)) {
        return true
    }
    if (/^localhost(:\d{2,5})?(|\/.*|\?.*|#.*)$/.test(location)) {
        return true
    }
    if (/^(\d{1,3}\.){3}\d{1,3}(:\d{2,5})?(|\/.*|\?.*|#.*)$/.test(location)) {
        return true
    }
    const domainName = location.split(/\/|\?|#/)[0]
    if (domainName.includes("..")) {
        return false
    }
    const names = domainName.split(".")
    if (names.length < 2) {
        return false
    }
    const tldAndPort = names.pop()
    if (tldAndPort.includes("::") || tldAndPort.split(":").length > 2) {
        return false
    }
    if (tldAndPort.startsWith(":") || tldAndPort.endsWith(":")) {
        return false
    }
    const [tld, port] = tldAndPort.split(":")
    if (port && !/^\d{2,5}$/.test(port)) {
        return false
    }
    if (/^[a-zA-Z]{2,}$/.test(tld)) {
        const invalidDashes = names.some(n => {
            return n.includes("--") || n.startsWith("-") || n.endsWith("-")
        })
        if (!invalidDashes && names.every(n => /^[a-zA-Z\d-]+$/.test(n))) {
            return true
        }
    }
    return false
    // Checks if the location starts with one of the following:
    // - localhost
    // - An ipv4 address
    // - Valid domain with 0 or more subdomains
    //   - subdomains can have letters, digits and hyphens
    //   - hyphens cannot be at the end or the start of the subdomain
    //   - top level domains can only contain letters
    // After that, an optional port in the form of :22 or up to :22222
    // Lastly, it checks if the location ends with one of the following:
    // - Nothing
    // - Single slash character with anything behind it
    // - Single question mark with anything behind it
    // - Single number sign with anything behind it
}

const notify = (message, type = "info") => {
    let properType = "info"
    if (type.startsWith("warn")) {
        properType = "warning"
    }
    if (type.startsWith("err")) {
        properType = "error"
    }
    const image = `img/notifications/${properType}.svg`
    if (SETTINGS.get("notification.system")) {
        new Notification(`Vieb ${properType}`, {
            "body": message,
            "image": image,
            "icon": image
        })
        return
    }
    const notificationsElement = document.getElementById("notifications")
    notificationsElement.className = SETTINGS.get("notification.position")
    const notification = document.createElement("span")
    const iconElement = document.createElement("img")
    iconElement.src = image
    notification.appendChild(iconElement)
    const textElement = document.createElement("span")
    textElement.innerHTML = message
        .replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/\n/g, "<br>")
    notification.appendChild(textElement)
    notificationsElement.appendChild(notification)
    setTimeout(() => {
        notificationsElement.removeChild(notification)
    }, SETTINGS.get("notification.duration"))
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

const rimrafFolder = folder => {
    try {
        rimraf(path.join(remote.app.getPath("appData"), folder))
    } catch (e) {
        // Rimraf errors
    }
}

const clearCache = () => {
    rimrafFolder("**/*Cache/")
    rimrafFolder("**/File System/")
    rimrafFolder("**/MANIFEST")
    rimrafFolder("**/Service Worker/")
    rimrafFolder("**/VideoDecodeStats/")
    rimrafFolder("**/blob_storage/")
    rimrafFolder("**/databases/")
    rimrafFolder("**/*.log")
}

const clearCookies = () => {
    rimrafFolder("**/Cookies*")
    rimrafFolder("**/QuotaManager*")
}

const clearLocalStorage = () => {
    rimrafFolder("**/IndexedDB/")
    rimrafFolder("**/*Storage/")
    rimrafFolder("**/*.ldb")
}

const redirect = url => {
    SETTINGS.get("redirects").forEach(r => {
        if (r && r.match && r.replace) {
            try {
                url = url.replace(RegExp(r.match), r.replace)
            } catch (e) {
                // Invalid regex, ignore
            }
        }
    })
    return url
}

const expandPath = homePath => {
    if (homePath.startsWith("~")) {
        return homePath.replace("~", os.homedir())
    }
    return homePath
}

const isObject = o => {
    return o === Object(o)
}

const merge = (main, extra) => {
    Object.keys(extra).forEach(key => {
        if (isObject(main[key]) && isObject(extra[key])) {
            merge(main[key], extra[key])
        } else {
            main[key] = extra[key]
        }
    })
    return main
}

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

const readJSON = loc => {
    try {
        const contents = fs.readFileSync(loc).toString()
        return JSON.parse(contents)
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
    } catch (e) {
        if (err) {
            notify(err, "err")
        }
    }
}

const deleteFile = (loc, err = null) => {
    try {
        fs.unlinkSync(loc)
    } catch (e) {
        if (err) {
            notify(err, "warn")
        }
    }
}

module.exports = {
    hasProtocol,
    isUrl,
    notify,
    specialPagePath,
    pathToSpecialPageName,
    clearCache,
    clearCookies,
    clearLocalStorage,
    rimrafFolder,
    redirect,
    expandPath,
    isObject,
    merge,
    pathExists,
    isDir,
    isFile,
    readJSON,
    writeJSON,
    deleteFile
}
