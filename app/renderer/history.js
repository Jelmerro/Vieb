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
    isFile,
    joinPath,
    appData,
    readJSON,
    writeJSON,
    deleteFile,
    urlToString,
    pathToSpecialPageName,
    hasProtocol,
    title,
    specialChars
} = require("../util")
const {getSetting} = require("./common")

const histFile = joinPath(appData(), "hist")
const simpleUrls = {}
let histWriteTimeout = null
let groupedHistory = {}

const init = () => {
    groupedHistory = readJSON(histFile) || {}
}

const suggestHist = (searchStr, order, count) => {
    // Simplify the search to a list of words, or an ordered list of words,
    // ordered matches take priority over unordered matches only.
    // In turn, exact matches get priority over ordered matches.
    const search = searchStr.toLowerCase().trim()
    const simpleSearch = search.split(specialChars).filter(w => w)
    if (!isFile(histFile)) {
        // No need to suggest history if it's not stored
        return
    }
    const entries = Object.keys(groupedHistory).map(url => {
        if (!groupedHistory[url]) {
            return null
        }
        let simpleUrl = simpleUrls[url]
        if (simpleUrl === undefined) {
            simpleUrl = urlToString(url).replace(specialChars, "").toLowerCase()
            simpleUrls[url] = simpleUrl
        }
        let relevance = 1
        if (simpleSearch.every(w => simpleUrl.includes(w))) {
            relevance = 5
        }
        if (url.toLowerCase().includes(search)) {
            relevance *= 10
        }
        const allWordsInTitleOrUrl = () => {
            const simpleTitle = groupedHistory[url].title.replace(
                specialChars, "").toLowerCase()
            return simpleSearch.every(
                w => simpleTitle.includes(w) || simpleUrl.includes(w))
        }
        if (relevance > 1 || allWordsInTitleOrUrl()) {
            return {
                "last": new Date(groupedHistory[url]?.visits?.slice(-1)[0]),
                "title": groupedHistory[url].title,
                "top": relevance * visitCount(url),
                url
            }
        }
        return null
    }).filter(h => h)
    if (order === "alpha") {
        entries.sort((a, b) => {
            const first = a.url.replace(/^\w+:\/\/(www\.)?/g, "")
            const second = b.url.replace(/^\w+:\/\/(www\.)?/g, "")
            if (first > second) {
                return 1
            }
            if (first < second) {
                return -1
            }
            return 0
        })
    }
    if (order === "date") {
        entries.sort((a, b) => b.last - a.last)
    }
    if (order === "relevance") {
        entries.sort((a, b) => b.top - a.top)
    }
    const {addExplore} = require("./suggest")
    const {forSite} = require("./favicons")
    entries.slice(0, count).forEach(h => addExplore(
        {...h, "icon": forSite(h.url)}))
}

const addToHist = rawUrl => {
    const url = rawUrl.replace(/\t/g, "")
    if (url.startsWith("devtools://")) {
        return
    }
    const saveTypes = getSetting("storenewvisits").split(",")
    if (pathToSpecialPageName(url).name) {
        if (!saveTypes.includes("builtin")) {
            return
        }
    } else if (url.startsWith("file://")) {
        if (!saveTypes.includes("files")) {
            return
        }
    } else if (!saveTypes.includes("pages")) {
        return
    }
    const date = new Date().toISOString()
    if (!groupedHistory[url]) {
        groupedHistory[url] = {"title": url, "visits": []}
    }
    groupedHistory[url].visits.push(date)
    writeHistToFile()
}

const writeHistToFile = (now = false) => {
    if (Object.keys(groupedHistory).length === 0) {
        deleteFile(histFile)
        return
    }
    Object.keys(groupedHistory).forEach(url => {
        if (visitCount(url) === 0) {
            delete groupedHistory[url]
        }
    })
    clearTimeout(histWriteTimeout)
    if (now) {
        return writeJSON(histFile, groupedHistory)
    }
    histWriteTimeout = setTimeout(() => {
        writeHistToFile(true)
    }, 5000)
}

const removeFromHistory = entries => {
    entries.forEach(entry => {
        const {url} = entry
        if (groupedHistory[url]) {
            groupedHistory[url].visits = groupedHistory[url].visits
                .filter(d => d !== entry.date)
            if (visitCount(url) === 0) {
                delete groupedHistory[url]
            }
        }
    })
    return writeHistToFile(true)
}

const handleRequest = (webview, action = "", entries = []) => {
    const {updateMappings} = require("./favicons")
    if (action) {
        let success = false
        if (action === "range" && entries.length > 0) {
            success = removeFromHistory(entries)
        }
        webview.send("history-removal-status", success)
        updateMappings()
        return
    }
    let history = []
    const {forSite} = require("./favicons")
    Object.keys(groupedHistory).forEach(site => {
        groupedHistory[site].visits.forEach(visit => {
            history.push({
                "date": new Date(visit),
                "icon": forSite(site),
                "title": groupedHistory[site].title,
                "url": site,
                "visits": groupedHistory[site].visits.length
            })
        })
    })
    history = history.sort((a, b) => a.date.getTime() - b.date.getTime())
    webview.send("history-list", JSON.stringify(history))
    updateMappings()
}

const suggestTopSites = () => {
    const {forSite} = require("./favicons")
    return Object.keys(groupedHistory).filter(g => groupedHistory[g])
        .sort((a, b) => visitCount(b) - visitCount(a))
        .slice(0, getSetting("suggesttopsites")).map(site => ({
            "icon": forSite(site),
            "name": groupedHistory[site]?.title,
            "url": urlToString(site)
        }))
}

const visitCount = url => groupedHistory[url]?.visits?.length || 0

const titleForPage = originalUrl => {
    const {getRedirect} = require("./favicons")
    const url = getRedirect(originalUrl)
    return groupedHistory[url]?.title || title(pathToSpecialPageName(url).name)
}

const updateTitle = (rawUrl, rawName) => {
    const url = rawUrl.replace(/\t/g, "")
    const name = rawName.replace(/\t/g, "")
    if (groupedHistory[url]) {
        if (groupedHistory[url].title === name) {
            return
        }
        if (groupedHistory[url].title && hasProtocol(name)) {
            return
        }
        groupedHistory[url].title = name
    } else {
        groupedHistory[url] = {"title": name, "visits": []}
    }
    writeHistToFile()
}

module.exports = {
    addToHist,
    handleRequest,
    init,
    suggestHist,
    suggestTopSites,
    titleForPage,
    updateTitle,
    visitCount,
    writeHistToFile
}
