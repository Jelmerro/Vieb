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
/* globals HISTORY SETTINGS TABS UTIL */
"use strict"

const path = require("path")
const fs = require("fs")
const {remote} = require("electron")

const faviconFolder = path.join(remote.app.getPath("appData"), "favicons")
const mappingFile = path.join(faviconFolder, "mappings")
let mappings = {}
const sessionStart = new Date()
let isParsed = false

const init = () => {
    const parsed = UTIL.readJSON(mappingFile)
    if (parsed) {
        mappings = parsed
    }
    isParsed = true
}

const updateMappings = (currentUrl = null) => {
    // Don't update the mappings before they are done loading
    if (!isParsed || !HISTORY.isFinishedLoading()) {
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
    try {
        fs.readdirSync(faviconFolder)
            .filter(p => p !== "mappings")
            .map(p => path.join(faviconFolder, p))
            .forEach(img => {
                if (!mappedFavicons.includes(img)) {
                    UTIL.deleteFile(img)
                }
            })
    } catch (e) {
        // Failed to list files, folder might not exist (no favicons yet)
    }
    // Write changes to mapping file
    UTIL.writeJSON(mappingFile, mappings)
}

const urlToPath = url => {
    return path.join(faviconFolder, encodeURIComponent(url).replace(/%/g, "_"))
}

const loading = webview => {
    const tab = TABS.tabOrPageMatching(webview)
    tab.querySelector(".status").style.display = null
    tab.querySelector(".favicon").style.display = "none"
}

const empty = webview => {
    const tab = TABS.tabOrPageMatching(webview)
    tab.querySelector(".status").style.display = null
    tab.querySelector(".favicon").style.display = "none"
    tab.querySelector(".favicon").src = "img/empty.png"
}

const show = webview => {
    const tab = TABS.tabOrPageMatching(webview)
    tab.querySelector(".status").style.display = "none"
    if (tab.querySelector(".favicon").getAttribute("src") !== "img/empty.png") {
        tab.querySelector(".favicon").style.display = null
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
    try {
        fs.mkdirSync(faviconFolder)
    } catch (e) {
        // Directory probably already exists
    }
    const request = remote.net.request({
        "url": favicon, "session": webview.getWebContents().session
    })
    request.on("response", res => {
        const data = []
        res.on("end", () => {
            fs.writeFileSync(urlToPath(favicon), Buffer.concat(data))
            if (webview.src === currentUrl) {
                setPath(tab, urlToPath(favicon))
            }
        })
        res.on("data", chunk => {
            data.push(Buffer.from(chunk, "binary"))
        })
    })
    request.on("abort", () => {
        // Failed to download favicon
    })
    request.on("error", () => {
        // Failed to download favicon
    })
    request.end()
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
        try {
            if (sessionStart > fs.statSync(loc).mtime) {
                fs.unlinkSync(loc)
            }
        } catch (e) {
            // Could not delete cached favicon
        }
        return
    }
    // All other favicon options are suffixed with day, e.g. "1day"
    const cutoff = Number(setting.replace("day", ""))
    if (isNaN(cutoff)) {
        return
    }
    try {
        const days = (new Date() - fs.statSync(loc).mtime) / 1000 / 60 / 60 / 24
        if (days > cutoff) {
            fs.unlinkSync(loc)
        }
    } catch (e) {
        // Could not delete cached favicon
    }
}

const forSite = url => {
    const mapping = mappings[url]
    if (mapping) {
        if (mapping.startsWith("data:") || mapping.startsWith("file:/")) {
            return mapping
        }
        return urlToPath(mapping)
    }
    return ""
}

module.exports = {
    init,
    updateMappings,
    loading,
    empty,
    show,
    update,
    forSite
}
