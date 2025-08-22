/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2025 Jelmer van Arnhem
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

import fs from "node:fs"
import https from "node:https"
import {homedir, platform} from "node:os"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {rimrafSync} from "./rimraf.js"

const protocolRegex = /^[a-z][a-z0-9-+.]+:\/\//
const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/
let homeDirPath = ""
/** @type {Map<Element|ShadowRoot, {x: number, y: number}>} */
const framePaddingInfo = new Map()
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

export const specialChars = /[：”；’、。！`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/\s]/gi

export const specialCharsAllowSpaces = /[：”；’、。！`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi

/**
 * Join multiple path parts into a single resolved path.
 * @param {string[]} paths
 */
export const joinPath = (...paths) => path.resolve(path.join(...paths))

/**
 * Expand a path that is prefixed with ~ to the user's home folder.
 * @param {string} loc
 */
export const expandPath = loc => {
    if (loc.startsWith("~")) {
        if (!homeDirPath) {
            homeDirPath = homedir()
        }
        return loc.replace("~", homeDirPath)
    }
    return loc
}

/**
 * Check if a path exists.
 * @param {string} loc
 */
export const pathExists = loc => {
    try {
        return fs.existsSync(loc)
    } catch {
        return false
    }
}

/**
 * Get the root app directory from any location.
 */
export const getAppRootDir = () => {
    // https://github.com/webpack/webpack/issues/18320
    let currentDir = import.meta.dirname
        ?? joinPath(fileURLToPath(import.meta.url), "..")
    let tries = 0
    while (!pathExists(joinPath(currentDir, "package.json")) && tries < 100) {
        currentDir = joinPath(currentDir, "..")
        tries += 1
    }
    if (tries === 100) {
        // https://github.com/webpack/webpack/issues/18320
        return import.meta.dirname
            ?? joinPath(fileURLToPath(import.meta.url), "..")
    }
    return joinPath(currentDir, "app")
}

/**
 * Read the file contents of a file and parse it as JSON.
 * @param {string} loc
 * @returns {any|null}
 */
export const readJSON = loc => {
    try {
        return JSON.parse(fs.readFileSync(loc).toString())
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

/** Return per operating system the result of navigator.platform. */
export const userAgentPlatform = () => {
    let platformString = "X11; Linux x86_64"
    if (platform() === "win32") {
        platformString = "Window NT 10.0; Win64; x64"
    }
    if (platform() === "darwin") {
        platformString = "Macintosh; Intel Mac OS X 10_15_7"
    }
    return platformString
}

/** Return the current Chromium version, suitable for all process levels. */
const chromiumVersion = () => {
    let version = null
    if (typeof process === "undefined") {
        // Process is undefined when ESM is on but contextIsolation is off:
        // https://github.com/electron/electron/issues/46142
        version = navigator.userAgentData?.brands
            .find(b => b.brand === "Chromium")?.version
            ?? /Chrome\/([\d.]+)/.exec(navigator.userAgent)?.[1].split(".")[0]
            ?? "138"
    } else {
        [version] = process.versions.chrome.split(".")
    }
    return version
}

/** Return the default navigator.userAgent. */
export const defaultUseragent = () => {
    const ver = chromiumVersion()
    const sys = userAgentPlatform()
    return `Mozilla/5.0 (${sys}) AppleWebKit/537.36 (KHTML, like Gecko) `
        + `Chrome/${ver}.0.0.0 Safari/537.36`
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
    const version = `${chromiumVersion()}.0.0.0`
    return agent
        .replace(/%sys/g, userAgentPlatform())
        .replace(/%firefoxversion/g, firefoxVersion())
        // Not possible with: https://github.com/electron/electron/issues/46142
        // .replace(/%fullversion/g, process.versions.chrome)
        .replace(/%fullversion/g, version)
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
 * Store the location of a frame element.
 * @param {Element|ShadowRoot|null} element
 * @param {{x: number, y: number}} location
 */
const storeFrameInfo = (element, location) => element
    && framePaddingInfo.set(element, location) && null

/**
 * Find the frame info for a given element if available.
 * @param {Element|ShadowRoot|null} el
 */
export const findFrameInfo = el => el && framePaddingInfo.get(el)

/**
 * Get a CSS decleration property from an element as a number of pixels.
 * @param {Element|CSSStyleDeclaration} element
 * @param {string} prop
 */
export const propPixels = (element, prop) => {
    let value = ""
    if (element instanceof CSSStyleDeclaration) {
        value = element.getPropertyValue(prop)
    } else {
        value = element.computedStyleMap().get(prop)?.toString() ?? ""
    }
    if (typeof value === "number") {
        return value
    }
    if (value?.endsWith("px")) {
        return Number(value.replace("px", "")) || 0
    }
    if (value?.endsWith("em")) {
        const elementFontSize = Number(document.body.computedStyleMap().get(
            "font-size")?.toString()?.replace("px", "") || 0)
        return Number(value.replace("em", "")) * elementFontSize || 0
    }
    return Number(value) || 0
}

/**
 * Get the position of a given element based on bounding rect plus padding.
 * @param {Element} frame
 */
export const framePosition = frame => ({
    "x": frame.getBoundingClientRect().x + propPixels(frame, "padding-left")
        + propPixels(frame, "border-left-width"),
    "y": frame.getBoundingClientRect().y + propPixels(frame, "padding-top")
        + propPixels(frame, "border-top-width")
})

/**
 * Check if a node is an element, taking subframes into account.
 * @param {Node|EventTarget|null|undefined} el
 * @returns {el is Element}
 */
export const isElement = el => {
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
export const isHTMLElement = el => {
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
export const isHTMLIFrameElement = el => {
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
export const isInputOrTextElement = el => {
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
export const isHTMLAnchorElement = el => {
    if (el instanceof EventTarget && !(el instanceof HTMLAnchorElement)) {
        return false
    }
    if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) {
        return false
    }
    return el instanceof el.ownerDocument.defaultView.HTMLAnchorElement
}

/**
 * Check if a node is a link element, taking subframes into account.
 * @param {Node|EventTarget|null|undefined} el
 * @returns {el is HTMLLinkElement}
 */
export const isHTMLLinkElement = el => {
    if (el instanceof EventTarget && !(el instanceof HTMLLinkElement)) {
        return false
    }
    if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) {
        return false
    }
    return el instanceof el.ownerDocument.defaultView.HTMLLinkElement
}

/**
 * Check if a node is an image element, taking subframes into account.
 * @param {Node|EventTarget|null|undefined} el
 * @returns {el is HTMLImageElement}
 */
export const isHTMLImageElement = el => {
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
export const isSVGElement = el => {
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
export const isHTMLVideoElement = el => {
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
export const isHTMLAudioElement = el => {
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
 * @param {Element|null|undefined} el
 * @param {string} query
 */
export const matchesQuery = (el, query) => {
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
export const findElementAtPosition = (
    x, y, levels = [document], px = 0, py = 0
) => {
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
export const querySelectorAll = (
    sel, base = document, paddedX = 0, paddedY = 0
) => {
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

/** @typedef {{
 * bottom: number
 * height: number
 * left: number
 * right: number
 * top: number
 * width: number
 * x: number
 * y: number
 * }} DOMRectJSON
 */

/**
 * Find the center of a rect within the borders of the visible window.
 * @param {DOMRectJSON} rect
 */
const correctedCenterAndSizeOfRect = rect => {
    let {x, y} = rect
    x ||= rect.left
    y ||= rect.top
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
 * @param {DOMRectJSON[]} rects
 */
export const findClickPosition = (element, rects) => {
    let dims = {"height": 0, "width": 0, "x": 0, "y": 0}
    let clickable = false
    for (const rect of rects) {
        const {
            centerX, centerY, height, width, x, y
        } = correctedCenterAndSizeOfRect(rect)
        if (!clickable || width * height > dims.width * dims.height) {
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
                centerX, centerY, height, width, x, y
            } = correctedCenterAndSizeOfRect(rect)
            if (!clickable || width * height > dims.width * dims.height) {
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

/** Find the current active element, also inside shadow dom or subframes. */
export const activeElement = () => {
    if (document.activeElement?.shadowRoot) {
        let el = document.activeElement
        while (el?.shadowRoot?.activeElement) {
            el = el.shadowRoot.activeElement
        }
        return el
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
        if (doc.activeElement?.shadowRoot) {
            let el = doc.activeElement
            while (el?.shadowRoot?.activeElement) {
                el = el.shadowRoot.activeElement
            }
            return el
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
 * Format any number of bytes to a value with a nice unit.
 * @param {number} size
 */
export const formatSize = size => {
    const exp = Math.min(Math.floor(Math.log(size) / Math.log(1024)), 10)
    const unit = (size / 1024 ** exp || 0).toFixed(2).replace(/\.?0+$/g, "")
    return `${unit} ${" KMGTPEZYRQ"[exp]?.trim() ?? ""}B`
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
 * Fetch any url with the Node.JS https module.
 * @param {string} url
 * @param {import("https").RequestOptions} opts
 * @param {string|null} body
 */
export const fetchUrl = (
    url, opts = {}, body = null
) => new Promise((res, rej) => {
    if (!url.startsWith("https://")) {
        rej(new Error("invalid protocol"))
        return
    }
    const request = https.request(url, opts, response => {
        let data = ""
        response.on("data", chunk => {
            data += chunk.toString()
        })
        response.on("end", () => {
            try {
                res(data)
            } catch(err) {
                rej(new Error(`${err}: ${data}`))
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
export const fetchJSON = (
    url, opts = {}, body = null
) => new Promise((res, rej) => {
    fetchUrl(url, opts, body).then(data => {
        try {
            res(JSON.parse(data))
        } catch {
            rej(new Error(`Response is not valid JSON: ${data}`))
        }
    }).catch(rej)
})

/** Return the position and dimensions of the page container. */
export const pageContainerPos = () => {
    const pagelayout = document.getElementById("page-container")
    if (!pagelayout) {
        return {"bottom": 0, "left": 0, "right": 0, "top": 0}
    }
    return pagelayout.getBoundingClientRect()
}

/**
 * Calculate the offset in pixels for each dimension of an element.
 * @param {HTMLElement} page
 */
export const pageOffset = page => {
    const border = propPixels(page, "border-width")
    const top = Math.round(propPixels(page.style, "top") + border)
    const left = Math.round(propPixels(page.style, "left") + border)
    const bottom = Math.round(top + propPixels(page.style, "height") + border)
    const right = Math.round(left + propPixels(page.style, "width") + border)
    return {bottom, left, right, top}
}

/**
 * Check if the given value is a valid interval value.
 * @param {string} value
 * @param {boolean} invertedRanges
 */
export const isValidIntervalValue = (value, invertedRanges = false) => {
    const validUnits = ["second", "minute", "hour", "day", "month", "year"]
    for (const unit of validUnits) {
        if (value.endsWith(unit) || value.endsWith(`${unit}s`)) {
            const number = value.replace(RegExp(`${unit}s?$`), "")
            if (invertedRanges) {
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
export const intervalValueToDate = value => {
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

/**
 * Return the last part of the path, usually the filename.
 * @param {string} loc
 */
export const basePath = loc => path.basename(loc)

/**
 * Return the directory name of the path.
 * @param {string} loc
 */
export const dirname = loc => path.dirname(loc)

/**
 * Check if a path is absolute or not.
 * @param {string} loc
 */
export const isAbsolutePath = loc => path.isAbsolute(loc)

/**
 * Check if a path is a directory.
 * @param {string} loc
 */
export const isDir = loc => {
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
export const isFile = loc => {
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
export const readFile = loc => {
    try {
        return fs.readFileSync(loc).toString()
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
        fs.writeFileSync(loc, data)
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
        fs.appendFileSync(loc, data)
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
        fs.writeFileSync(loc, JSON.stringify(
            data, opts.replacer ?? undefined, opts.indent))
        return true
    } catch {
        // Usually permission errors, return value will be false
    }
    return false
}

/**
 * Write JSON data async to a file, optionally with indentation and replacer.
 * @param {string} loc
 * @param {any} data
 */
export const writeJSONAsync = (loc, data) => new Promise((res, rej) => {
    fs.writeFile(loc, JSON.stringify(data), err => {
        if (err) {
            rej(err)
        } else {
            res("Success")
        }
    })
})

/**
 * Delete a file at a location, returns success state.
 * @param {string} loc
 */
export const deleteFile = loc => {
    try {
        fs.unlinkSync(loc)
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
        fs.mkdirSync(loc, {"recursive": true})
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
 * List all files in a folder async.
 * @param {string} loc
 * @returns {Promise<string[]>}
 */
export const listDirAsync = loc => new Promise((res, rej) => {
    fs.readdir(loc, (err, files) => {
        if (err) {
            rej(err)
            return
        }
        res(files)
    })
})

/**
 * Watch a specific file including the polling fallback of 500ms.
 * @param {string} file
 * @param {(info: import("fs").Stats, oldInfo: import("fs").Stats) => void} call
 */
export const watchFile = (file, call) => fs.watchFile(
    file, {"interval": 500}, call)

/**
 * Get the modified date for a file location.
 * @param {string} loc
 */
export const modifiedAt = loc => {
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
export const rm = f => {
    try {
        rimrafSync(f)
    } catch {
        // Windows permission errors
    }
}
