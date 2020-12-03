/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2020 Jelmer van Arnhem
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
/* global FAVICONS SETTINGS SUGGEST TABS UTIL */
"use strict"

const path = require("path")

const histFile = path.join(UTIL.appData(), "hist")
let groupedHistory = {}
const simpleUrls = {}
let histWriteTimeout = null
const specialChars = /[`~!@#$%^&*(),./;'[\]\\\-=<>?:"{}|_+\s]/g

const init = () => {
    groupedHistory = UTIL.readJSON(histFile) || {}
}

const suggestHist = search => {
    // Simplify the search to a list of words, or an ordered list of words,
    // ordered matches take priority over unordered matches only.
    // In turn, exact matches get priority over ordered matches.
    search = search.toLowerCase().trim()
    const simpleSearch = search.split(specialChars).filter(w => w)
    if (!UTIL.isFile(histFile)) {
        // No need to suggest history if it's not stored
        return
    }
    Object.keys(groupedHistory).map(url => {
        if (!groupedHistory[url]) {
            return null
        }
        let simpleUrl = simpleUrls[url]
        if (simpleUrl === undefined) {
            simpleUrl = decodeURI(url).replace(specialChars, "").toLowerCase()
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
                "url": url,
                "title": groupedHistory[url].title,
                "top": relevance * visitCount(url)
            }
        }
        return null
    }).filter(h => h).sort((a, b) => b.top - a.top)
        .slice(0, SETTINGS.get("suggestexplore"))
        .forEach(h => SUGGEST.addExplore(
            {...h, "icon": FAVICONS.forSite(h.url)}))
}

const addToHist = url => {
    if (!SETTINGS.get("storenewvisits")) {
        return
    }
    if (UTIL.pathToSpecialPageName(url).name) {
        return
    }
    if (url.startsWith("devtools://")) {
        return
    }
    url = url.replace(/\t/g, "")
    const date = new Date().toISOString()
    if (!groupedHistory[url]) {
        groupedHistory[url] = {"title": url, "visits": []}
    }
    groupedHistory[url].visits.push(date)
    writeHistToFile()
}

const clearHistory = () => {
    groupedHistory = {}
    return UTIL.deleteFile(histFile)
}

const writeHistToFile = (now = false) => {
    if (Object.keys(groupedHistory).length === 0) {
        UTIL.deleteFile(histFile)
        return
    }
    Object.keys(groupedHistory).forEach(url => {
        if (visitCount(url) === 0) {
            delete groupedHistory[url]
        }
    })
    clearTimeout(histWriteTimeout)
    if (now) {
        return UTIL.writeJSON(histFile, groupedHistory)
    }
    histWriteTimeout = setTimeout(() => {
        writeHistToFile(true)
    }, 5000)
}

const removeFromHistory = entries => {
    entries.forEach(entry => {
        const url = entry.url
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

const handleRequest = (action = "", entries = []) => {
    if (!action) {
        let history = []
        Object.keys(groupedHistory).forEach(site => {
            groupedHistory[site].visits.forEach(visit => {
                history.push({
                    "url": site,
                    "title": groupedHistory[site].title,
                    "icon": FAVICONS.forSite(site),
                    "date": new Date(visit),
                    "visits": groupedHistory[site].visits.length
                })
            })
        })
        history = history.sort((a, b) => a.date.getTime() - b.date.getTime())
        TABS.currentPage().send("history-list", JSON.stringify(history))
        return
    }
    let success = false
    if (action === "range" && entries.length > 0) {
        success = removeFromHistory(entries)
    }
    TABS.currentPage().send("history-removal-status", success)
}

const suggestTopSites = () => Object.keys(groupedHistory)
    .filter(g => groupedHistory[g])
    .sort((a, b) => visitCount(b) - visitCount(a))
    .slice(0, SETTINGS.get("suggesttopsites")).map(site => {
        if (SETTINGS.get("favicons") === "disabled") {
            return {
                "url": UTIL.urlToString(site),
                "name": groupedHistory[site]?.title
            }
        }
        return {
            "url": UTIL.urlToString(site),
            "icon": FAVICONS.forSite(site),
            "name": groupedHistory[site]?.title
        }
    })

const visitCount = url => groupedHistory[url]?.visits?.length || 0

const titleForPage = url => groupedHistory[url]?.title || ""

const updateTitle = (url, title) => {
    if (!SETTINGS.get("storenewvisits")) {
        return
    }
    if (UTIL.pathToSpecialPageName(url).name) {
        return
    }
    url = url.replace(/\t/g, "")
    title = title.replace(/\t/g, "")
    if (groupedHistory[url]) {
        if (groupedHistory[url].title === title) {
            return
        }
        if (groupedHistory[url].title && UTIL.hasProtocol(title)) {
            return
        }
        groupedHistory[url].title = title
    } else {
        groupedHistory[url] = {"visits": [], "title": title}
    }
    writeHistToFile()
}

module.exports = {
    init,
    addToHist,
    suggestHist,
    clearHistory,
    writeHistToFile,
    handleRequest,
    suggestTopSites,
    visitCount,
    titleForPage,
    updateTitle
}
