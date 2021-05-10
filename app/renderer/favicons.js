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

const {
    joinPath,
    appData,
    isFile,
    readJSON,
    writeJSON,
    deleteFile,
    modifiedAt,
    makeDir,
    appIcon,
    listDir,
    pathToSpecialPageName,
    stringToUrl
} = require("../util")
const {tabOrPageMatching, getSetting} = require("./common")

const faviconFolder = joinPath(appData(), "favicons")
const mappingFile = joinPath(faviconFolder, "mappings")
let mappings = {}
const sessionStart = new Date()
let isParsed = false
const viebIcon = `file:///${joinPath(
    __dirname, "../img/icons/256x256.png").replace(/^\/*/g, "")}`

const init = () => {
    const parsed = readJSON(mappingFile)
    if (parsed) {
        mappings = parsed
    }
    isParsed = true
    const {ipcRenderer} = require("electron")
    ipcRenderer.on("favicon-downloaded", (_, linkId, currentUrl, favicon) => {
        const webview = document.querySelector(`#pages [link-id='${linkId}']`)
        const filename = urlToPath(favicon)
        if (webview?.src === currentUrl && isFile(filename)) {
            setPath(tabOrPageMatching(webview), filename)
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
    const {visitCount} = require("./history")
    Object.keys(mappings).forEach(m => {
        if (visitCount(m) === 0 && m !== currentUrl) {
            delete mappings[m]
        }
    })
    // Delete unmapped favicon icons from disk
    const mappedFavicons = Object.values(mappings).map(f => urlToPath(f))
    const files = listDir(faviconFolder)
    if (files) {
        files.filter(p => p !== "mappings")
            .map(p => joinPath(faviconFolder, p))
            .forEach(img => {
                if (!mappedFavicons.includes(img)) {
                    deleteFile(img)
                }
            })
    }
    // Write changes to mapping file
    writeJSON(mappingFile, mappings)
}

const urlToPath = url => joinPath(faviconFolder,
    encodeURIComponent(url).replace(/%/g, "_")).slice(0, 256)

const loading = webview => {
    const tab = tabOrPageMatching(webview)
    tab.querySelector(".status").style.display = null
    tab.querySelector(".favicon").style.display = "none"
}

const empty = webview => {
    const tab = tabOrPageMatching(webview)
    tab.querySelector(".status").style.display = null
    tab.querySelector(".favicon").style.display = "none"
    if (webview.src.startsWith("devtools://")) {
        tab.querySelector(".favicon").src = viebIcon
    } else {
        tab.querySelector(".favicon").src = "img/empty.png"
    }
}

const show = webview => {
    const tab = tabOrPageMatching(webview)
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
    if (getSetting("favicons") === "disabled") {
        return
    }
    const [favicon] = urls
    if (!favicon) {
        return
    }
    if (viebIcon === favicon) {
        if (!pathToSpecialPageName(webview.src).name) {
            // Don't allow non-special pages to use the built-in favicon
            return
        }
        if (appIcon()) {
            setPath(tabOrPageMatching(webview),
                stringToUrl(appIcon()))
            return
        }
    }
    const currentUrl = String(webview.src)
    const tab = tabOrPageMatching(webview)
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
    const days = (new Date() - modifiedAt(loc)) / 1000 / 60 / 60 / 24
    if (days > cutoff) {
        deleteFile(loc)
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
            file = mapping.replace(/^file:\/*/g, "")
        } else {
            file = urlToPath(mapping)
        }
        if (isFile(file)) {
            return file
        }
    }
    if (pathToSpecialPageName(url).name) {
        return viebIcon
    }
    return ""
}

module.exports = {empty, forSite, init, loading, show, update, updateMappings}
