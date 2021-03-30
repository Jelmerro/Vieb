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
/* globals HISTORY SETTINGS TABS UTIL */
"use strict"

const {ipcRenderer} = require("electron")

const faviconFolder = UTIL.joinPath(UTIL.appData(), "favicons")
const mappingFile = UTIL.joinPath(faviconFolder, "mappings")
let mappings = {}
const sessionStart = new Date()
let isParsed = false
const viebIcon = `file:///${UTIL.joinPath(
    __dirname, "../img/icons/256x256.png").replace(/^\/*/g, "")}`

const init = () => {
    const parsed = UTIL.readJSON(mappingFile)
    if (parsed) {
        mappings = parsed
    }
    isParsed = true
    ipcRenderer.on("favicon-downloaded", (_, linkId, currentUrl, favicon) => {
        const webview = document.querySelector(`#pages [link-id='${linkId}']`)
        if (webview?.src === currentUrl) {
            setPath(TABS.tabOrPageMatching(webview), urlToPath(favicon))
            mappings[currentUrl] = favicon
        }
    })
}

const updateMappings = (currentUrl = null) => {
    // Don't update the mappings before they are done loading
    if (!isParsed) {
        return
    }
    // Delete mappings for urls that aren't present in the history
    Object.keys(mappings).forEach(m => {
        if (HISTORY.visitCount(m) === 0 && m !== currentUrl) {
            delete mappings[m]
        }
    })
    // Delete unmapped favicon icons from disk
    const mappedFavicons = Object.values(mappings).map(f => urlToPath(f))
    const files = UTIL.listDir(faviconFolder)
    if (files) {
        files.filter(p => p !== "mappings")
            .map(p => UTIL.joinPath(faviconFolder, p))
            .forEach(img => {
                if (!mappedFavicons.includes(img)) {
                    UTIL.deleteFile(img)
                }
            })
    }
    // Write changes to mapping file
    UTIL.writeJSON(mappingFile, mappings)
}

const urlToPath = url => UTIL.joinPath(faviconFolder,
    encodeURIComponent(url).replace(/%/g, "_")).slice(0, 256)

const loading = webview => {
    const tab = TABS.tabOrPageMatching(webview)
    tab.querySelector(".status").style.display = null
    tab.querySelector(".favicon").style.display = "none"
}

const empty = webview => {
    const tab = TABS.tabOrPageMatching(webview)
    tab.querySelector(".status").style.display = null
    tab.querySelector(".favicon").style.display = "none"
    if (webview.src.startsWith("devtools://")) {
        tab.querySelector(".favicon").src = viebIcon
    } else {
        tab.querySelector(".favicon").src = "img/empty.png"
    }
}

const show = webview => {
    const tab = TABS.tabOrPageMatching(webview)
    tab.querySelector(".status").style.display = "none"
    const favicon = tab.querySelector(".favicon")
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

const update = (webview, urls) => {
    if (SETTINGS.get("favicons") === "disabled") {
        return
    }
    const favicon = urls[0]
    if (!favicon) {
        return
    }
    if (viebIcon === favicon) {
        if (!UTIL.pathToSpecialPageName(webview.src).name) {
            // Don't allow non-special pages to use the built-in favicon
            return
        }
        if (UTIL.appIcon()) {
            setPath(TABS.tabOrPageMatching(webview),
                UTIL.stringToUrl(UTIL.appIcon()))
            return
        }
    }
    const currentUrl = String(webview.src)
    const tab = TABS.tabOrPageMatching(webview)
    mappings[currentUrl] = favicon
    updateMappings(currentUrl)
    if (favicon.startsWith("file:/") || favicon.startsWith("data:")) {
        setPath(tab, favicon)
        return
    }
    deleteIfTooOld(urlToPath(favicon))
    if (UTIL.isFile(urlToPath(favicon))) {
        setPath(tab, urlToPath(favicon))
        return
    }
    UTIL.makeDir(faviconFolder)
    ipcRenderer.send("download-favicon", favicon, urlToPath(favicon),
        webview.getWebContentsId(), webview.getAttribute("link-id"), currentUrl)
}

const deleteIfTooOld = loc => {
    const setting = SETTINGS.get("favicons")
    if (setting === "forever") {
        return
    }
    if (setting === "nocache") {
        UTIL.deleteFile(loc)
        return
    }
    if (setting === "session") {
        if (sessionStart > UTIL.modifiedAt(loc)) {
            UTIL.deleteFile(loc)
        }
        return
    }
    // All other favicon options are suffixed with day, e.g. "1day"
    const cutoff = Number(setting.replace("day", ""))
    if (isNaN(cutoff)) {
        return
    }
    const days = (new Date() - UTIL.modifiedAt(loc)) / 1000 / 60 / 60 / 24
    if (days > cutoff) {
        UTIL.deleteFile(loc)
    }
}

const forSite = url => {
    const mapping = mappings[url]
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
        if (UTIL.isFile(file)) {
            return file
        }
    }
    return ""
}

module.exports = {init, updateMappings, loading, empty, show, update, forSite}
