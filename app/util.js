/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2024 Jelmer van Arnhem
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
import {basename, dirname as dirnamePATH, join, resolve} from "node:path"
import {homedir} from "node:os"
import {normalize} from "node:path/posix"
import rimraf from "./rimraf.js"

const protocolRegex = /^[a-z][a-z0-9-+.]+:\/\//
const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/
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

export const specialChars = /[：”；’、。！`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/\s]/gi

export const specialCharsAllowSpaces = /[：”；’、。！`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi
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

/**
 * Join multiple path parts into a single resolved path.
 * @param {string[]} paths
 */
export const joinPath = (...paths) => resolve(join(...paths))

/**
 * Expand a path that is prefixed with ~ to the user's home folder.
 * @param {string} loc
 */
export const expandPath = loc => {
    if (loc.startsWith("~")) {
        return loc.replace("~", homedir())
    }
    return loc
}

/**
 * Check if a path exists.
 * @param {string} loc
 */
export const pathExists = loc => {
    try {
        const {existsSync} = require("fs")
        return existsSync(loc)
    } catch {
        return false
    }
}

/**
 * Read the file contents of a file and parse it as JSON.
 * @param {string} loc
 * @returns {any|null}
 */
export const readJSON = loc => {
    try {
        const {readFileSync} = require("fs")
        return JSON.parse(readFileSync(loc).toString())
    } catch {
        return null
    }
}

/**
 * Check if any string has a valid protocol or dataUri.
 * @param {string} loc
 */
export const hasProtocol = loc => protocolRegex.test(loc)
    || dataUris.some(d => loc.startsWith(`${d}:`))

/**
 * Check if any string is a valid url.
 * @param {string} location
 */
export const isUrl = location => {
    if (hasProtocol(location)) {
        try {
            const url = new URL(location)
            return !url.host.includes("%20") && !url.username.includes("%20")
        } catch {
            return false
        }
    }
    let url = null
    try {
        url = new URL(`https://${location}`)
        if (url.host.includes("%20") || url.username.includes("%20")) {
            return false
        }
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

/** Return the notification history. */
export const listNotificationHistory = () => notificationHistory

/** Return per operating system the result of navigator.platform. */
export const userAgentPlatform = () => {
    let platform = "X11; Linux x86_64"
    if (process.platform === "win32") {
        platform = "Window NT 10.0; Win64; x64"
    }
    if (process.platform === "darwin") {
        platform = "Macintosh; Intel Mac OS X 10_15_7"
    }
    return platform
}

/** Return the default navigator.userAgent. */
export const defaultUseragent = () => {
    const [version] = process.versions.chrome.split(".")
    const sys = userAgentPlatform()
    return `Mozilla/5.0 (${sys}) AppleWebKit/537.36 (KHTML, like Gecko) `
        + `Chrome/${version}.0.0.0 Safari/537.36`
}

/** Calculate the current Firefox version based on date & release schedule. */
export const firefoxVersion = () => {
    const daysSinceBase = (new Date().getTime()
        - new Date(2023, 4, 9).getTime()) / 86400000
    return `${113 + Math.floor(daysSinceBase / 28)}.0`
}

/** Return the Firefox navigator.userAgent. */
export const firefoxUseragent = () => {
    const ver = firefoxVersion()
    const sys = userAgentPlatform()
    return `Mozilla/5.0 (${sys}; rv:${ver}) Gecko/20100101 Firefox/${ver}`
}

/**
 * Template a user agent with value with version and browser info.
 * @param {string} agent
 */
export const userAgentTemplated = agent => {
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

/**
 * Return the domain name for the provided url.
 * @param {string} url
 */
export const domainName = url => {
    try {
        const {hostname} = new URL(url)
        if (hostname.endsWith("localhost") || hostname.match(/^(\d|\.)+$/)) {
            return hostname
        }
        return hostname.replace(/(?:[a-zA-Z0-9]+\.)+(\w+\.\w+)/, "$1")
    } catch {
        return null
    }
}

/**
 * Returns true if both urls share the same domain name, else false.
 * @param {string} url1
 * @param {string} url2
 */
export const sameDomain = (url1, url2) => {
    const domain1 = domainName(url1)
    const domain2 = domainName(url2)
    return domain1 && domain2 && domain1 === domain2 && true || false
}

/**
 * Format a provided date, unix time or.
 * @param {string|number|Date|null|undefined} dateStringOrNumber
 */
export const formatDate = dateStringOrNumber => {
    let date = new Date(dateStringOrNumber ?? "")
    if (typeof dateStringOrNumber === "number") {
        date = new Date(dateStringOrNumber * 1000)
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")
    }-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours())
        .padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${
        String(date.getSeconds()).padStart(2, "0")}`
}

/**
 * Format any number of bytes (<1024 EB) to a value with a nice unit.
 * @param {number} size
 */
export const formatSize = size => {
    if (size < 1024) {
        return `${size} B`
    }
    const exp = Math.floor(Math.log(size) / Math.log(1024))
    return `${(size / 1024 ** exp).toFixed(2)} ${"KMGTPE"[exp - 1]}B`
}

/**
 * Compare two version numbers and return which one is newer.
 * @param {string} v1Str
 * @param {string} v2Str
 */
export const compareVersions = (v1Str, v2Str) => {
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
            /** @type {{[ext: string]: number|undefined}} */
            const suffixMap = {"alpha": 2, "beta": 3, "dev": 1, "prerelease": 4}
            const v1suffix = suffixMap[v1ext] ?? 0
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
    if (process.platform === "win32") {
        shell = process.env.ComSpec || shell
    }
    shell = process.env.SHELL || shell
    shell = getSetting("shell") || shell
    const {exec} = require("child_process")
    if (shell) {
        return exec(command, {shell}, callback)
    }
    return exec(command, callback)
}

/**
 * Return the last part of the path, usually the filename.
 * @param {string} loc
 */
export const basePath = loc => basename(loc)

/**
 * Return the directory name of the path.
 * @param {string} loc
 */
export const dirname = loc => dirnamePATH(loc)

/**
 * Check if a path is absolute or not.
 * @param {string} loc
 */
export const isAbsolutePath = loc => {
    const {isAbsolute} = require("path")
    return isAbsolute(loc)
}

/**
 * Check if a path is a directory.
 * @param {string} loc
 */
export const isDir = loc => {
    try {
        const {statSync} = require("fs")
        return statSync(loc).isDirectory()
    } catch {
        return false
    }
}

/**
 * Check if a path is a file.
 * @param {string} loc
 */
export const isFile = loc => {
    try {
        const {statSync} = require("fs")
        return statSync(loc).isFile()
    } catch {
        return false
    }
}

/**
 * Read the file contents of a file as a string.
 * @param {string} loc
 * @returns {string|null}
 */
export const readFile = loc => {
    try {
        const {readFileSync} = require("fs")
        return readFileSync(loc).toString()
    } catch {
        return null
    }
}

/**
 * Write data to a file, returns success state.
 * @param {string} loc
 * @param {string|Buffer} data
 */
export const writeFile = (loc, data) => {
    try {
        const {writeFileSync} = require("fs")
        writeFileSync(loc, data)
        return true
    } catch {
        // Usually permission errors, return value will be false
    }
    return false
}

/**
 * Append data to a file, returns success state.
 * @param {string} loc
 * @param {string|Buffer} data
 */
export const appendFile = (loc, data) => {
    try {
        const {appendFileSync} = require("fs")
        appendFileSync(loc, data)
        return true
    } catch {
        // Usually permission errors, return value will be false
    }
    return false
}

/**
 * Write JSON data to a file, optionally with indentation and replacer.
 * @param {string} loc
 * @param {any} data
 * @param {{
 *   replacer?: null|((this: any, key: string, value: string) => string),
 *   indent?: number|undefined
 * }} opts
 */
export const writeJSON = (loc, data, opts = {"replacer": null}) => {
    try {
        const {writeFileSync} = require("fs")
        writeFileSync(loc, JSON.stringify(
            data, opts.replacer ?? undefined, opts.indent))
        return true
    } catch {
        // Usually permission errors, return value will be false
    }
    return false
}

/**
 * Delete a file at a location, returns success state.
 * @param {string} loc
 */
export const deleteFile = loc => {
    try {
        const {unlinkSync} = require("fs")
        unlinkSync(loc)
        return true
    } catch {
        // Usually permission errors, return value will be false
    }
    return false
}

/**
 * Make a directory at a location, optionally with feedback notifications.
 * @param {string} loc
 */
export const makeDir = loc => {
    try {
        const {mkdirSync} = require("fs")
        mkdirSync(loc, {"recursive": true})
        return true
    } catch {
        // Usually permission errors, return value will be false
    }
    return false
}

/**
 * List all files (or only dirs) in a folder (not recursive).
 * @param {string} loc
 * @param {boolean} absolute
 * @param {boolean} dirsOnly
 */
export const listDir = (loc, absolute = false, dirsOnly = false) => {
    try {
        const {readdirSync} = require("fs")
        let files = readdirSync(loc)
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

/**
 * Watch a specific file including the polling fallback of 500ms.
 * @param {string} file
 * @param {(info: import("fs").Stats, oldInfo: import("fs").Stats) => void} call
 */
export const watchFile = (file, call) => {
    const {"watchFile": watchFileFS} = require("fs")
    return watchFileFS(file, {"interval": 500}, call)
}

/**
 * Get the modified date for a file location.
 * @param {string} loc
 */
export const modifiedAt = loc => {
    try {
        const {statSync} = require("fs")
        return statSync(loc).mtime
    } catch {
        return new Date("1970-01-01")
    }
}

/**
 * Remove a location using "rm -rf" rimraf module.
 * @param {string} f
 */
export const rm = f => {
    try {
        rimraf(f)
    } catch {
        // Windows permission errors
    }
}

/**
 * Checks if a given page is a special page.
 * @param {any} page
 * @returns {page is SpecialPage}
 */
const isSpecialPage = page => specialPages.includes(page)

/**
 * Get the url of a special page given a name and an optional section.
 * @param {string} page
 * @param {string|null} section
 * @param {boolean} allowMissing
 */
export const specialPagePath = (page, section = null, allowMissing = false) => {
    let p = page
    if (!isSpecialPage(p) && !allowMissing) {
        p = "help"
    }
    let url = joinPath(import.meta.dirname, `./pages/${p}.html`)
        .replace(/\\/g, "/").replace(/^\/*/g, "")
    if (isDir(joinPath(import.meta.dirname, "../pages"))) {
        url = joinPath(import.meta.dirname, `../pages/${p}.html`)
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
    if (process.platform === "win32") {
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
        let specialUrl = `vieb://${special.name}`
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

/**
 * Resolve local paths to absolute file protocol paths.
 * @param {(string|{
 *   container?: unknown, url?: unknown, script?: unknown
 * })[]} paths
 * @param {string|null} cwd
 */
export const resolveLocalPaths = (paths, cwd = null) => paths.filter(u => u).map(u => {
    let url = ""
    if (typeof u === "string") {
        url = String(u)
    } else if (typeof u === "object") {
        url = String(u.url)
    }
    if (!url) {
        return null
    }
    let fileLocation = expandPath(url.replace(/^file:\/+/g, "/"))
    if (process.platform === "win32") {
        fileLocation = expandPath(url.replace(/^file:\/+/g, ""))
    }
    if (!isAbsolutePath(fileLocation)) {
        fileLocation = joinPath(cwd || process.cwd(), url)
    }
    if (isFile(fileLocation)) {
        return `file:///${fileLocation.replace(/^\//g, "")}`
    }
    if (url.startsWith("-")) {
        return null
    }
    if (typeof u === "object") {
        return {...u, url}
    }
    return {url}
}).filter(u => u)
