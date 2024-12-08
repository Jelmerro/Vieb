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
"use strict"

const {
    joinPath,
    appData,
    isFile,
    readJSON,
    deleteFile,
    modifiedAt,
    makeDir,
    appConfig,
    pathToSpecialPageName,
    stringToUrl,
    getSetting,
    getAppRootDir,
    writeJSONAsync,
    listDirAsync
} = require("../util")
const {tabForPage, listPages, currentPage} = require("./common")

const faviconFolder = joinPath(appData(), "favicons")
const mappingFile = joinPath(faviconFolder, "mappings")
/** @type {{redirects?: {[url: string]: string}} & {[url: string]: string }} */
let mappings = {}
const sessionStart = new Date()
let isParsed = false
/** @type {number|null} */
let faviconWriteTimeout = 0
const viebIcon = `file:///${joinPath(
    getAppRootDir(), "img/vieb.svg").replace(/^\/*/g, "")}`

/**
 * Get the path for a given url.
 * @param {string} url
 */
const urlToPath = url => joinPath(faviconFolder,
    encodeURIComponent(url).replace(/%/g, "_")).slice(0, 256)

/**
 * Update the current mappings and delete unused ones.
 * @param {{currentUrl?: string|null, now?: boolean|null}} arg
 */
const updateMappings = async({currentUrl = null, now = null} = {}) => {
    // Don't update the mappings before done loading or in rapid succession
    window.clearTimeout(faviconWriteTimeout ?? undefined)
    if (!now || !isParsed) {
        faviconWriteTimeout = window.setTimeout(() => {
            updateMappings({currentUrl, "now": true})
        }, 5000)
        return
    }
    // Delete mappings for urls that aren't present in the history
    const {visitCount} = require("./history")
    Object.keys(mappings).forEach(m => {
        if (m === "redirects") {
            Object.keys(mappings.redirects ?? {}).forEach(r => {
                const dest = mappings.redirects?.[r] ?? null
                if (dest !== currentUrl && visitCount(dest) === 0) {
                    delete mappings.redirects?.[r]
                }
            })
            if (Object.keys(mappings.redirects ?? {}).length === 0) {
                delete mappings.redirects
            }
        } else if (m !== currentUrl && visitCount(m) === 0) {
            delete mappings[m]
        }
    })
    // Write changes to mapping file
    if (Object.keys(mappings).length === 0) {
        deleteFile(mappingFile)
    } else {
        await writeJSONAsync(mappingFile, mappings).catch(() => null)
    }
    // Delete unused favicons from disk in nested promises to stay responsive
    await new Promise(resolveAll => {
        const usedFavNames = Object.values(mappings).flatMap(f => {
            if (typeof f === "string") {
                return encodeURIComponent(f).replace(/%/g, "_").slice(0, 256)
            }
            return []
        })
        listDirAsync(faviconFolder).catch(() => null).then(async files => {
            const promises = files?.map(file => new Promise(res => {
                if (!usedFavNames.includes(file) && file !== "mappings") {
                    deleteFile(joinPath(faviconFolder, file))
                }
                res("Done")
            })) ?? []
            await Promise.all(promises)
            resolveAll("Done")
        })
    })
}

/**
 * Show the loading spinner in place of the favicon, optionally clearing it.
 * @param {Electron.WebviewTag} webview
 * @param {boolean} empty
 */
const loading = (webview, empty = false) => {
    const loadingIndicator = getSetting("loadingindicator")
    const tab = tabForPage(webview)
    const status = tab?.querySelector(".status")
    if (["line", "all"].includes(loadingIndicator)) {
        if (webview === currentPage()) {
            const loadingProgress = document.getElementById("loading-progress")
            if (loadingProgress) {
                loadingProgress.style.display = "flex"
            }
        }
    }
    if (status instanceof HTMLElement) {
        if (["spinner", "all"].includes(loadingIndicator)) {
            status.style.display = ""
        } else {
            status.style.display = "none"
        }
    }
    const favicon = tab?.querySelector(".favicon")
    if (!(favicon instanceof HTMLImageElement)) {
        return
    }
    if (["spinner", "all"].includes(loadingIndicator)) {
        favicon.style.display = "none"
    } else {
        favicon.style.display = ""
    }
    if (empty) {
        if (webview.src.startsWith("devtools://")) {
            favicon.src = viebIcon
        } else {
            favicon.src = "img/empty.png"
        }
    }
}

/**
 * Set the favicon path and show if already done loading.
 * @param {HTMLSpanElement} tab
 * @param {string} loc
 */
const setPath = (tab, loc) => {
    const favicon = tab.querySelector(".favicon")
    if (!(favicon instanceof HTMLImageElement)) {
        return
    }
    favicon.src = loc
    const status = tab?.querySelector(".status")
    if (status instanceof HTMLElement) {
        if (status.style.display === "none") {
            favicon.style.display = ""
        }
    }
}

/**
 * Delete a favicon if too old based on timestamp and favicon setting.
 * @param {string} loc
 */
const deleteIfTooOld = loc => {
    const setting = getSetting("favicons")
    if (setting === "forever") {
        return
    }
    if (setting === "nocache") {
        deleteFile(loc)
        return
    }
    if (setting === "session") {
        if (sessionStart > modifiedAt(loc)) {
            deleteFile(loc)
        }
        return
    }
    // All other favicon options are suffixed with day, e.g. "1day"
    const cutoff = Number(setting.replace("day", ""))
    if (isNaN(cutoff)) {
        return
    }
    const days = (new Date().getTime()
        - modifiedAt(loc).getTime()) / 1000 / 60 / 60 / 24
    if (days > cutoff) {
        deleteFile(loc)
    }
}

/**
 * Update the favicon as emitted by the webview.
 * @param {Electron.WebviewTag} webview
 * @param {string} favicon
 */
const update = (webview, favicon) => {
    const tab = tabForPage(webview)
    if (viebIcon === favicon) {
        if (!pathToSpecialPageName(webview.src)?.name) {
            // Don't allow non-special pages to use the built-in favicon
            return
        }
        const customIcon = appConfig()?.icon
        if (tab && customIcon) {
            setPath(tab, stringToUrl(customIcon))
            return
        }
    }
    if (getSetting("favicons") === "disabled") {
        if (tab) {
            setPath(tab, "img/empty.png")
        }
        return
    }
    const currentUrl = webview.src
    if (mappings[currentUrl] !== favicon) {
        mappings[currentUrl] = favicon
        updateMappings({currentUrl})
    }
    if (tab && (favicon.startsWith("file:/") || favicon.startsWith("data:"))) {
        setPath(tab, favicon)
        return
    }
    const filename = urlToPath(favicon)
    deleteIfTooOld(filename)
    if (tab && isFile(filename)) {
        setPath(tab, filename)
        return
    }
    makeDir(faviconFolder)
    const {ipcRenderer} = require("electron")
    ipcRenderer.send("download-favicon", {
        "fav": favicon,
        "linkId": webview.getAttribute("link-id"),
        "location": filename,
        "url": currentUrl,
        "webId": webview.getWebContentsId()
    })
}

/**
 * Get a redirect.
 * @param {string} url
 */
const getRedirect = url => mappings.redirects?.[url] || url

/**
 * Get the url for a given site.
 * @param {string} url
 */
const forSite = url => {
    if (getSetting("favicons") === "disabled") {
        return ""
    }
    const mapping = mappings[getRedirect(url)]
    if (typeof mapping === "string") {
        if (mapping.startsWith("data:")) {
            return mapping
        }
        let file = ""
        if (mapping.startsWith("file:/")) {
            file = mapping.replace(/^file:\/+/g, "")
        } else {
            file = urlToPath(mapping)
        }
        if (isFile(file)) {
            return file
        }
    }
    if (pathToSpecialPageName(url)?.name) {
        return viebIcon
    }
    return ""
}

/**
 * Show the favicon that was previously set for this site, and stop loading.
 * @param {Electron.WebviewTag} webview
 */
const show = webview => {
    const tab = tabForPage(webview)
    if (webview === currentPage()) {
        const loadingProgress = document.getElementById("loading-progress")
        if (loadingProgress) {
            loadingProgress.style.display = "none"
        }
    }
    const status = tab?.querySelector(".status")
    if (status instanceof HTMLElement) {
        status.style.display = "none"
    }
    const favicon = tab?.querySelector(".favicon")
    if (!(favicon instanceof HTMLImageElement)) {
        return
    }
    if (favicon.getAttribute("src") === "img/empty.png") {
        favicon.src = forSite(webview.src) ?? favicon.src
    }
    if (favicon.getAttribute("src") !== "img/empty.png") {
        favicon.style.display = ""
    }
}

/** Initialize/load the favicon cache in memory and register event handlers. */
const init = () => {
    const parsed = readJSON(mappingFile)
    if (parsed) {
        mappings = parsed
    }
    isParsed = true
    const {ipcRenderer} = require("electron")
    ipcRenderer.on("favicon-downloaded", (_, linkId, currentUrl, favicon) => {
        const webview = listPages().find(
            p => p.getAttribute("link-id") === linkId)
        const filename = urlToPath(favicon)
        if (webview) {
            const tab = tabForPage(webview)
            if (tab && webview.getAttribute("src") === currentUrl
                && isFile(filename)) {
                setPath(tab, filename)
                mappings[currentUrl] = favicon
            }
        }
    })
    ipcRenderer.on("redirect", (_, src, redirect) => {
        mappings.redirects ||= {}
        mappings.redirects[src] = redirect
    })
}

module.exports = {
    forSite, getRedirect, init, loading, show, update, updateMappings
}
