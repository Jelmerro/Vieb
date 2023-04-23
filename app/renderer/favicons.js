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

const {
    joinPath,
    appData,
    isFile,
    readJSON,
    writeJSON,
    deleteFile,
    modifiedAt,
    makeDir,
    appConfig,
    listDir,
    pathToSpecialPageName,
    stringToUrl
} = require("../util")
const {getSetting, tabForPage, listPages} = require("./common")

const faviconFolder = joinPath(appData(), "favicons")
const mappingFile = joinPath(faviconFolder, "mappings")
let mappings = {}
const sessionStart = new Date()
let isParsed = false
const viebIcon = `file:///${joinPath(
    __dirname, "../img/vieb.svg").replace(/^\/*/g, "")}`

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
        if (webview?.getAttribute("src") === currentUrl && isFile(filename)) {
            setPath(tabForPage(webview), filename)
            mappings[currentUrl] = favicon
        }
    })
    ipcRenderer.on("redirect", (_, src, redirect) => {
        mappings.redirects = mappings.redirects || {}
        mappings.redirects[src] = redirect
    })
}

const updateMappings = (currentUrl = null) => {
    // Don't update the mappings before they are done loading
    if (!isParsed) {
        return
    }
    // Delete mappings for urls that aren't present in the history
    const {visitCount} = require("./history")
    Object.keys(mappings).forEach(m => {
        if (m === "redirects") {
            Object.keys(mappings.redirects).forEach(r => {
                const dest = mappings.redirects[r]
                if (dest !== currentUrl && visitCount(dest) === 0) {
                    delete mappings.redirects[r]
                }
            })
            if (Object.keys(mappings.redirects).length === 0) {
                delete mappings.redirects
            }
        } else if (m !== currentUrl && visitCount(m) === 0) {
            delete mappings[m]
        }
    })
    // Delete unmapped favicon icons from disk
    const mappedFavicons = Object.values(mappings).map(f => urlToPath(f))
    const files = listDir(faviconFolder)
    files?.filter(p => p !== "mappings").map(p => joinPath(faviconFolder, p))
        .forEach(img => {
            if (!mappedFavicons.includes(img)) {
                deleteFile(img)
            }
        })
    // Write changes to mapping file
    if (Object.keys(mappings).length === 0) {
        deleteFile(mappingFile)
    } else {
        writeJSON(mappingFile, mappings, null, null, 4)
    }
}

const urlToPath = url => joinPath(faviconFolder,
    encodeURIComponent(url).replace(/%/g, "_")).slice(0, 256)

/**
 * Show the loading spinner in place of the favicon
 *
 * @param {Electron.WebviewTag} webview
 */
const loading = webview => {
    const tab = tabForPage(webview)
    tab.querySelector(".status").style.display = null
    const favicon = tab.querySelector(".favicon")
    if (!(favicon instanceof HTMLImageElement)) {
        return
    }
    favicon.style.display = "none"
}

const empty = webview => {
    const tab = tabForPage(webview)
    tab.querySelector(".status").style.display = null
    const favicon = tab.querySelector(".favicon")
    if (!(favicon instanceof HTMLImageElement)) {
        return
    }
    favicon.style.display = "none"
    if (webview.src.startsWith("devtools://")) {
        favicon.src = viebIcon
    } else {
        favicon.src = "img/empty.png"
    }
}

const show = webview => {
    const tab = tabForPage(webview)
    tab.querySelector(".status").style.display = "none"
    const favicon = tab.querySelector(".favicon")
    if (!(favicon instanceof HTMLImageElement)) {
        return
    }
    if (favicon.getAttribute("src") === "img/empty.png") {
        favicon.src = forSite(webview.src) ?? favicon.src
    }
    if (favicon.getAttribute("src") !== "img/empty.png") {
        favicon.style.display = null
    }
}

const setPath = (tab, loc) => {
    tab.querySelector(".favicon").src = loc
    if (tab.querySelector(".status").style.display === "none") {
        tab.querySelector(".favicon").style.display = null
    }
}

const update = (webview, favicon) => {
    if (getSetting("favicons") === "disabled") {
        return
    }
    if (viebIcon === favicon) {
        if (!pathToSpecialPageName(webview.src)?.name) {
            // Don't allow non-special pages to use the built-in favicon
            return
        }
        if (appConfig().icon) {
            setPath(tabForPage(webview), stringToUrl(appConfig().icon))
            return
        }
    }
    const currentUrl = String(webview.src)
    const tab = tabForPage(webview)
    mappings[currentUrl] = favicon
    updateMappings(currentUrl)
    if (favicon.startsWith("file:/") || favicon.startsWith("data:")) {
        setPath(tab, favicon)
        return
    }
    const filename = urlToPath(favicon)
    deleteIfTooOld(filename)
    if (isFile(filename)) {
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

const getRedirect = url => mappings.redirects?.[url] || url

const forSite = url => {
    if (getSetting("favicons") === "disabled") {
        return ""
    }
    const mapping = mappings[getRedirect(url)]
    if (mapping) {
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

module.exports = {
    empty, forSite, getRedirect, init, loading, show, update, updateMappings
}
