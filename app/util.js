/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2023 Jelmer van Arnhem
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
let appDataPath = ""
let homeDirPath = ""
/**
 * @type {{
 *   appdata: string,
 *   autoplay: string,
 *   downloads: string,
 *   icon?: string,
 *   islite: boolean,
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
/** @type {{element: Element|ShadowRoot, x: number, y: number}[]} */
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

/**
 * Get the value of any setting.
 * @param {string} val
 */
const getSetting = val => JSON.parse(
    sessionStorage.getItem("settings") ?? "")?.[val]

/**
 * Check if any string has a valid protocol or dataUri.
 * @param {string} loc
 */
const hasProtocol = loc => protocolRegex.test(loc)
    || dataUris.some(d => loc.startsWith(`${d}:`))

/**
 * Check if any string is a valid url.
 * @param {string} location
 */
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

/**
 * Match a searchword and return the word and filled url.
 * @param {string} location
 */
const searchword = location => {
    for (const mapping of getSetting("searchwords").split(",")) {
        const [word, url] = mapping.split("~")
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

const listNotificationHistory = () => notificationHistory

/**
 * Get the url of a special page given a name and an optional section.
 * @param {string} userPage
 * @param {string|null} section
 * @param {boolean} skipExistCheck
 */
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

/**
 * Expand a path that is prefixed with ~ to the user's home folder.
 * @param {string} loc
 */
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

/**
 * Translate a string from the explore mode input to a valid url.
 * @param {string} location
 */
const stringToUrl = location => {
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
        const engines = getSetting("searchengine").split(",")
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
const urlToString = url => {
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
 * Capitalize a string to only have one capital letter at the start.
 * @param {string} s
 */
const title = s => {
    if (!s || !s[0]) {
        return ""
    }
    return `${s[0].toUpperCase()}${s.slice(1).toLowerCase()}`
}

const downloadPath = () => expandPath(getSetting("downloadpath")
    || appConfig()?.downloads || "~/Downloads")

/**
 * Template a user agent with value with version and browser info.
 * @param {string} agent
 */
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
    const daysSinceBase = (new Date().getTime()
        - new Date(2021, 7, 10).getTime()) / 86400000
    return `${91 + Math.floor(daysSinceBase / 28)}.0`
}

const firefoxUseragent = () => {
    const ver = firefoxVersion()
    const sys = userAgentPlatform()
    return `Mozilla/5.0 (${sys}; rv:${ver}) Gecko/20100101 Firefox/${ver}`
}

/**
 * Return the domain name for the provided url.
 * @param {string} url
 */
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

/**
 * Returns true if both urls share the same domain name, else false.
 * @param {string} url1
 * @param {string} url2
 */
const sameDomain = (url1, url2) => {
    const domain1 = domainName(url1)
    const domain2 = domainName(url2)
    return domain1 && domain2 && domain1 === domain2
}

/**
 * Format a provided date, unix time or.
 * @param {string|number|Date|null|undefined} dateStringOrNumber
 */
const formatDate = dateStringOrNumber => {
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
 * Store the location of a frame element.
 * @param {Element|ShadowRoot|null} element
 * @param {{x: number, y: number}} location
 */
const storeFrameInfo = (element, location) => {
    if (!element) {
        return
    }
    const info = framePaddingInfo.find(i => i.element === element)
    if (info) {
        Object.assign(info, location)
    } else {
        framePaddingInfo.push({element, ...location})
    }
}

/**
 * Find the frame info for a given element if available.
 * @param {Element|ShadowRoot|null} el
 */
const findFrameInfo = el => framePaddingInfo.find(i => i.element === el)

/**
 * Get the position of a given element based on bounding rect plus padding.
 * @param {Element} frame
 */
const framePosition = frame => ({
    "x": frame.getBoundingClientRect().x + propPixels(frame, "padding-left")
        + propPixels(frame, "border-left-width"),
    "y": frame.getBoundingClientRect().y + propPixels(frame, "padding-top")
        + propPixels(frame, "border-top-width")
})

/**
 * Get a CSS decleration property from an element as a number of pixels.
 * @param {Element|CSSStyleDeclaration} element
 * @param {string} prop
 */
const propPixels = (element, prop) => {
    let value = ""
    if (element instanceof CSSStyleDeclaration) {
        value = element.getPropertyValue(prop)
    } else {
        value = getComputedStyle(element).getPropertyValue(prop)
    }
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

/**
 * Check if a node is an element, taking subframes into account.
 * @param {Node|EventTarget|null|undefined} el
 * @returns {el is Element}
 */
const isElement = el => {
    if (el instanceof EventTarget && !(el instanceof Element)) {
        return false
    }
    if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) {
        return false
    }
    return el instanceof el.ownerDocument.defaultView.Element
}

/**
 * Check if a node is an html element, taking subframes into account.
 * @param {Node|EventTarget|null|undefined} el
 * @returns {el is HTMLElement}
 */
const isHTMLElement = el => {
    if (el instanceof EventTarget && !(el instanceof HTMLElement)) {
        return false
    }
    if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) {
        return false
    }
    return el instanceof el.ownerDocument.defaultView.HTMLElement
}

/**
 * Check if a node is an iframe element, taking subframes into account.
 * @param {Node|EventTarget|null|undefined} el
 * @returns {el is HTMLIFrameElement}
 */
const isHTMLIFrameElement = el => {
    if (el instanceof EventTarget && !(el instanceof HTMLIFrameElement)) {
        return false
    }
    if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) {
        return false
    }
    return el instanceof el.ownerDocument.defaultView.HTMLIFrameElement
}

/**
 * Check if a node is an input or textarea, taking subframes into account.
 * @param {Node|EventTarget|null|undefined} el
 * @returns {el is HTMLInputElement|HTMLTextAreaElement}
 */
const isInputOrTextElement = el => {
    if (el instanceof EventTarget && (
        !(el instanceof HTMLInputElement)
        && !(el instanceof HTMLTextAreaElement)
    )) {
        return false
    }
    if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) {
        return false
    }
    return el instanceof el.ownerDocument.defaultView.HTMLInputElement
        || el instanceof el.ownerDocument.defaultView.HTMLTextAreaElement
}

/**
 * Check if a node is an anchor element, taking subframes into account.
 * @param {Node|EventTarget|null|undefined} el
 * @returns {el is HTMLAnchorElement}
 */
const isHTMLAnchorElement = el => {
    if (el instanceof EventTarget && !(el instanceof HTMLAnchorElement)) {
        return false
    }
    if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) {
        return false
    }
    return el instanceof el.ownerDocument.defaultView.HTMLAnchorElement
}

/**
 * Check if a node is an image element, taking subframes into account.
 * @param {Node|EventTarget|null|undefined} el
 * @returns {el is HTMLImageElement}
 */
const isHTMLImageElement = el => {
    if (el instanceof EventTarget && !(el instanceof HTMLImageElement)) {
        return false
    }
    if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) {
        return false
    }
    return el instanceof el.ownerDocument.defaultView.HTMLImageElement
}

/**
 * Check if a node is an svg element, taking subframes into account.
 * @param {Node|EventTarget|null|undefined} el
 * @returns {el is SVGElement}
 */
const isSVGElement = el => {
    if (el instanceof EventTarget && !(el instanceof SVGElement)) {
        return false
    }
    if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) {
        return false
    }
    return el instanceof el.ownerDocument.defaultView.SVGElement
}

/**
 * Check if a node is a video element, taking subframes into account.
 * @param {Node|EventTarget|null|undefined} el
 * @returns {el is HTMLVideoElement}
 */
const isHTMLVideoElement = el => {
    if (el instanceof EventTarget && !(el instanceof HTMLVideoElement)) {
        return false
    }
    if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) {
        return false
    }
    return el instanceof el.ownerDocument.defaultView.HTMLVideoElement
}

/**
 * Check if a node is an audio element, taking subframes into account.
 * @param {Node|EventTarget|null|undefined} el
 * @returns {el is HTMLAudioElement}
 */
const isHTMLAudioElement = el => {
    if (el instanceof EventTarget && !(el instanceof HTMLAudioElement)) {
        return false
    }
    if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) {
        return false
    }
    return el instanceof el.ownerDocument.defaultView.HTMLAudioElement
}

/**
 * Call an element matches in a safe wrapper as not all elements work.
 * @param {Element|EventTarget|null|undefined} el
 * @param {string} query
 */
const matchesQuery = (el, query) => {
    if (!isElement(el)) {
        return false
    }
    try {
        return el?.matches(query) ?? false
    } catch {
        // Not all elements with the 'matches' attribute have it as a function
        // Therefore we just try to call it as one, and return false otherwise
        return false
    }
}

/**
 * Find the deepest element at a position, including subframes and shadow doms.
 * @param {number} x
 * @param {number} y
 * @param {(Document|ShadowRoot)[]} levels
 * @param {number} px
 * @param {number} py
 * @returns {Element|null}
 */
const findElementAtPosition = (x, y, levels = [document], px = 0, py = 0) => {
    // Find out which element is located at a given position.
    // Will look inside subframes recursively at the corrected position.
    const elAtPos = levels?.[0]?.elementFromPoint(x - px, y - py)
    if (elAtPos?.shadowRoot && levels.includes(elAtPos.shadowRoot)) {
        return elAtPos
    }
    if (elAtPos instanceof HTMLIFrameElement && elAtPos.contentDocument) {
        const frameInfo = findFrameInfo(elAtPos)
        return findElementAtPosition(x, y,
            [elAtPos.contentDocument, ...levels], frameInfo?.x, frameInfo?.y)
    }
    if (elAtPos?.shadowRoot) {
        const frameInfo = findFrameInfo(elAtPos.shadowRoot)
        return findElementAtPosition(x, y,
            [elAtPos.shadowRoot, ...levels], frameInfo?.x, frameInfo?.y)
    }
    return elAtPos
}

/**
 * Queryselector that recursively navigates subframes and shadow doms.
 * @param {string} sel
 * @param {Document|ShadowRoot|Element} base
 * @param {number} paddedX
 * @param {number} paddedY
 */
const querySelectorAll = (sel, base = document, paddedX = 0, paddedY = 0) => {
    if (!base) {
        return []
    }
    /** @type {Element[]} */
    let elements = []
    if (base === document) {
        elements = Array.from(base.querySelectorAll(sel) || [])
    }
    Array.from(base.querySelectorAll("*") || [])
        .filter(el => el.shadowRoot || el instanceof HTMLIFrameElement)
        .forEach(el => {
            let location = {"x": paddedX, "y": paddedY}
            if (!el.shadowRoot) {
                const {"x": frameX, "y": frameY} = framePosition(el)
                location = {"x": frameX + paddedX, "y": frameY + paddedY}
            }
            storeFrameInfo(el?.shadowRoot || el, location)
            if (el instanceof HTMLIFrameElement && el.contentDocument) {
                const extra = Array.from(el.contentDocument
                    .querySelectorAll(sel) || [])
                extra.forEach(e => storeFrameInfo(e, location))
                elements = elements.concat([...extra, ...querySelectorAll(sel,
                    el.contentDocument, location.x, location.y)])
            }
            if (el.shadowRoot) {
                const extra = Array.from(el.shadowRoot
                    .querySelectorAll(sel) || [])
                extra.forEach(e => storeFrameInfo(e, location))
                elements = elements.concat([...extra, ...querySelectorAll(sel,
                    el.shadowRoot, location.x, location.y)])
            }
        })
    return elements
}

/**
 * Find the center of a rect within the borders of the visible window.
 * @param {DOMRect} rect
 */
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

/**
 * Return the most suitable click area given a list of options if available.
 * @param {Element} element
 * @param {DOMRect[]} rects
 */
const findClickPosition = (element, rects) => {
    let dims = {"height": 0, "width": 0, "x": 0, "y": 0}
    let clickable = false
    for (const rect of rects) {
        const {
            centerX, centerY, x, y, width, height
        } = correctedCenterAndSizeOfRect(rect)
        if (!clickable || width >= dims.width && height >= dims.height) {
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
            if (!clickable || width >= dims.width && height >= dims.height) {
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
        if (!(document.activeElement instanceof HTMLIFrameElement)) {
            return document.activeElement
        }
    }
    return querySelectorAll("iframe").map(frame => {
        if (!(frame instanceof HTMLIFrameElement)) {
            return null
        }
        const doc = frame.contentDocument
        if (!doc) {
            return null
        }
        if (doc.activeElement?.shadowRoot?.activeElement) {
            return doc.activeElement.shadowRoot.activeElement
        }
        if (doc.body !== doc.activeElement) {
            if (!(document.activeElement instanceof HTMLIFrameElement)) {
                return doc.activeElement
            }
        }
        return null
    }).find(el => el)
}

/**
 * Format any number of bytes (<1024 EB) to a value with a nice unit.
 * @param {number} size
 */
const formatSize = size => {
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
 * Fetch any url with the Node.JS http and https modules.
 * @param {string} url
 * @param {import("https").RequestOptions} opts
 * @param {string|null} body
 */
const fetchUrl = (url, opts = {}, body = null) => new Promise((res, rej) => {
    let requestModule = null
    if (url.startsWith("https://")) {
        requestModule = require("https")
    } else if (url.startsWith("http://")) {
        requestModule = require("http")
    } else {
        rej("invalid protocol")
        return
    }
    const request = requestModule.request(url, opts, response => {
        let data = ""
        response.on("data", chunk => {
            data += chunk.toString()
        })
        response.on("end", () => {
            try {
                res(data)
            } catch (err) {
                rej({data, err})
            }
        })
    })
    request.on("error", err => rej(err))
    if (body) {
        request.write(body)
    }
    request.end()
})

/**
 * Fetch any url with the Node.JS http and https modules and parse its JSON.
 * @param {string} url
 * @param {import("https").RequestOptions} opts
 * @param {string|null} body
 */
const fetchJSON = (url, opts = {}, body = null) => new Promise((res, rej) => {
    fetchUrl(url, opts, body).then(data => {
        try {
            res(JSON.parse(data))
        } catch {
            rej({data, "err": "Response is not valid JSON"})
        }
    }).catch(rej)
})

/**
 * Calculate the offset in pixels for each dimension of an element.
 * @param {HTMLElement} page
 */
const pageOffset = page => {
    const border = propPixels(page, "border-width")
    const top = Math.round(propPixels(page.style, "top") + border)
    const left = Math.round(propPixels(page.style, "left") + border)
    const bottom = Math.round(top + propPixels(page.style, "height") + border)
    const right = Math.round(left + propPixels(page.style, "width") + border)
    return {bottom, left, right, top}
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
const execCommand = (command, callback) => {
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
 * Check if the given value is a valid interval value.
 * @param {string} value
 * @param {boolean} invertedRangesSupported
 */
const isValidIntervalValue = (value, invertedRangesSupported = false) => {
    const validUnits = ["second", "minute", "hour", "day", "month", "year"]
    for (const unit of validUnits) {
        if (value.endsWith(unit) || value.endsWith(`${unit}s`)) {
            const number = value.replace(RegExp(`${unit}s?$`), "")
            if (invertedRangesSupported) {
                return !!number.replace(/^last/g, "").match(/^\d+$/g)
            }
            return !!number.match(/^\d+$/g)
        }
    }
    return false
}

/**
 * Convert an interval to a date relative to the current date.
 * @param {string} value
 */
const intervalValueToDate = value => {
    const date = new Date()
    if (value.includes("second")) {
        date.setSeconds(date.getSeconds() - Number(value.replace(/[a-z]/g, "")))
    }
    if (value.includes("minute")) {
        date.setMinutes(date.getMinutes() - Number(value.replace(/[a-z]/g, "")))
    }
    if (value.includes("hour")) {
        date.setHours(date.getHours() - Number(value.replace(/[a-z]/g, "")))
    }
    if (value.includes("day")) {
        date.setDate(date.getDate() - Number(value.replace(/[a-z]/g, "")))
    }
    if (value.includes("month")) {
        date.setMonth(date.getMonth() - Number(value.replace(/[a-z]/g, "")))
    }
    if (value.includes("year")) {
        date.setFullYear(date.getFullYear()
            - Number(value.replace(/[a-z]/g, "")))
    }
    return date
}

// IPC UTIL

const currentPage = () => {
    /** @type {Electron.WebviewTag|null} */
    // @ts-expect-error current page id is always set to webview
    const page = document.getElementById("current-page")
    return page
}
/**
 * Send a message to the current page and its frames.
 * @param {string} channel
 * @param {any[]} args
 */
const sendToPageOrSubFrame = (channel, ...args) => {
    const {ipcRenderer} = require("electron")
    ipcRenderer.send(channel, currentPage()?.getWebContentsId(), ...args)
}

/**
 * Show the user a notification bubble and store it in the history.
 * @param {string} message
 * @param {string} type
 * @param {{
 *   type: "download-success",
 *   path: string,
 *   func?: () => void
 * }|false} clickAction
 */
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
    let clickInfo = null
    if (clickAction) {
        clickInfo = {...clickAction}
        delete clickInfo.func
    }
    const notifyForPerm = getSetting("notificationforpermissions")
    if (properType === "permission" && notifyForPerm === "never") {
        return
    }
    notificationHistory.push({
        "click": clickInfo,
        "date": new Date(),
        "message": escapedMessage,
        "type": properType
    })
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
    const showLong = escapedMessage.split("<br>").length > 3
        && properType !== "dialog"
    if (native === "always" || !showLong && native === "smallonly") {
        const n = new Notification(
            `${appConfig()?.name} ${properType}`, {"body": message})
        if (clickAction && clickAction.func) {
            n.onclick = () => clickAction.func?.()
        }
        return
    }
    if (showLong) {
        const {ipcRenderer} = require("electron")
        ipcRenderer.send("show-notification", escapedMessage, properType)
        return
    }
    const notificationsElement = document.getElementById("notifications")
    if (!notificationsElement) {
        return
    }
    notificationsElement.className = getSetting("notificationposition")
    const notification = document.createElement("span")
    notification.className = properType
    notification.innerHTML = escapedMessage
    if (clickAction && clickAction.func) {
        notification.addEventListener("click", () => clickAction.func?.())
    }
    notificationsElement.append(notification)
    setTimeout(() => notification.remove(),
        getSetting("notificationduration"))
}

/**
 * Returns the appdata path (works from both main, renderer and preloads).
 */
const appData = () => {
    if (!appDataPath) {
        try {
            const {app} = require("electron")
            return app.getPath("appData")
        } catch {
            // Not in main thread
        }
        appDataPath = appConfig()?.appdata ?? ""
    }
    return appDataPath
}

/**
 * Returns the app configuration settings.
 */
const appConfig = () => {
    if (!configSettings) {
        const {ipcRenderer} = require("electron")
        configSettings = ipcRenderer.sendSync("app-config")
        if (!configSettings) {
            return null
        }
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

/**
 * Convert any url/path to the name and section of a special page if relevant.
 * @param {string} urlPath
 */
const pathToSpecialPageName = urlPath => {
    const appName = appConfig()?.name.toLowerCase() ?? ""
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
    return null
}

/**
 * Join multiple path parts into a single resolved path.
 * @param {string[]} paths
 */
const joinPath = (...paths) => path.resolve(path.join(...paths))

/**
 * Return the last part of the path, usually the filename.
 * @param {string} loc
 */
const basePath = loc => path.basename(loc)

/**
 * Return the directory name of the path.
 * @param {string} loc
 */
const dirname = loc => path.dirname(loc)

/**
 * Check if a path is absolute or not.
 * @param {string} loc
 */
const isAbsolutePath = loc => path.isAbsolute(loc)

// FILESYSTEM UTIL

const fs = require("fs")

/**
 * @typedef {(typeof import("./renderer/settings").defaultSettings & {
 *   "fg": string
 *   "bg": string
 *   "linkcolor": string
 * })} webviewSetting
 */

/**
 * Get a setting from the webviewsettings file inside preloads.
 * @template {keyof webviewSetting} T
 * @param {T} name
 * @returns {null|webviewSetting[T]}
 */
const getWebviewSetting = name => {
    const webviewSettingsFile = joinPath(appData(), "webviewsettings")
    const settings = readJSON(webviewSettingsFile) ?? {}
    return settings[name] ?? null
}

/**
 * Check if a path exists.
 * @param {string} loc
 */
const pathExists = loc => {
    try {
        return fs.existsSync(loc)
    } catch {
        return false
    }
}

/**
 * Check if a path is a directory.
 * @param {string} loc
 */
const isDir = loc => {
    try {
        return fs.statSync(loc).isDirectory()
    } catch {
        return false
    }
}

/**
 * Check if a path is a file.
 * @param {string} loc
 */
const isFile = loc => {
    try {
        return fs.statSync(loc).isFile()
    } catch {
        return false
    }
}

/**
 * Read the file contents of a file as a string.
 * @param {string} loc
 * @returns {string|null}
 */
const readFile = loc => {
    try {
        return fs.readFileSync(loc).toString()
    } catch {
        return null
    }
}

/**
 * Read the file contents of a file and parse it as JSON.
 * @param {string} loc
 * @returns {any|null}
 */
const readJSON = loc => {
    try {
        return JSON.parse(fs.readFileSync(loc).toString())
    } catch {
        return null
    }
}

/**
 * Write data to a file, optionally with success and error notifications.
 * @param {string} loc
 * @param {string|Buffer} data
 * @param {string|null} err
 * @param {string|null} success
 */
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

/**
 * Append data to a file, optionally with success and error notifications.
 * @param {string} loc
 * @param {string} data
 * @param {string|null} err
 * @param {string|null} success
 */
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

/**
 * Write JSON data to a file, optionally with indentation and notifications.
 * @param {string} loc
 * @param {any} data
 * @param {string|null} err
 * @param {string|null} success
 * @param {number | undefined | null} indent
 */
const writeJSON = (loc, data, err = null, success = null, indent = null) => {
    try {
        fs.writeFileSync(loc, JSON.stringify(data, null, indent ?? undefined))
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

/**
 * Delete a file at a location, optinally with error message.
 * @param {string} loc
 * @param {string|null} err
 */
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

/**
 * Make a directory at a location, optionally with feedback notifications.
 * @param {string} loc
 * @param {string|null} err
 * @param {string|null} success
 */
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

/**
 * List all files (or only dirs) in a folder (not recursive).
 * @param {string} loc
 * @param {boolean} absolute
 * @param {boolean} dirsOnly
 */
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

/**
 * Watch a specific file including the polling fallback of 500ms.
 * @param {string} file
 * @param {() => void} call
 */
const watchFile = (file, call) => fs.watchFile(file, {"interval": 500}, call)

/**
 * Get the modified date for a file location.
 * @param {string} loc
 */
const modifiedAt = loc => {
    try {
        return fs.statSync(loc).mtime
    } catch {
        return new Date("1970-01-01")
    }
}

/**
 * Remove a location using "rm -rf" rimraf module.
 * @param {string} f
 */
const rm = f => {
    const rimraf = require("./rimraf")
    try {
        rimraf(f)
    } catch {
        // Windows permission errors
    }
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
    rm(joinPath(appData(), "webviewsettings"))
}

const clearCookies = () => {
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

const clearLocalStorage = () => {
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
    isElement,
    isHTMLElement,
    isHTMLIFrameElement,
    isInputOrTextElement,
    isHTMLAnchorElement,
    isHTMLImageElement,
    isSVGElement,
    isHTMLVideoElement,
    isHTMLAudioElement,
    matchesQuery,
    findElementAtPosition,
    querySelectorAll,
    findClickPosition,
    activeElement,
    formatSize,
    compareVersions,
    fetchUrl,
    fetchJSON,
    pageOffset,
    execCommand,
    isValidIntervalValue,
    intervalValueToDate,
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
    getWebviewSetting,
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
