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

const fs = require("fs")
const path = require("path")
const readline = require("readline")

const histFile = path.join(UTIL.appData(), "hist")
let groupedHistory = {}
let histWriteTimeout = null
let finishedLoading = false
const specialChars = /[`~!@#$%^&*(),./;'[\]\\\-=<>?:"{}|_+\s]/g

const init = () => {
    if (!UTIL.isFile(histFile)) {
        return
    }
    groupedHistory = UTIL.readJSON(histFile) || {}
    if (Object.keys(groupedHistory).length > 0) {
        finishedLoading = true
        return
    }
    // NOTE: deprecated code for reading old format, will be removed in 3.0.0
    const histStream = fs.createReadStream(histFile)
    const rl = readline.createInterface({"input": histStream})
    rl.on("line", line => {
        const hist = parseHistLine(line)
        if (!hist) {
            return
        }
        if (!groupedHistory[hist.url]) {
            groupedHistory[hist.url] = {"title": hist.title, "visits": []}
        }
        groupedHistory[hist.url].visits.push(hist.date)
        if (!UTIL.hasProtocol(hist.title) && hist.title.trim()) {
            groupedHistory[hist.url].title = hist.title
        }
    }).on("close", () => { finishedLoading = true })
}

const parseHistLine = line => {
    // Deprecated, will be unused and removed in 3.0.0
    const parts = line.split("\t")
    if (parts.length < 3) {
        return null
    }
    return {"date": parts[0], "title": parts[1], "url": parts.slice(2).join("")}
}

const suggestHist = search => {
    // Simplify the search to a list of words, or an ordered list of words,
    // ordered matches take priority over unordered matches only.
    // In turn, exact matches get priority over ordered matches.
    search = search.toLowerCase().trim()
    const simpleSearch = search.split(specialChars).filter(w => w)
    document.getElementById("suggest-dropdown").textContent = ""
    SUGGEST.clear()
    if (!SETTINGS.get("suggesthistory") || !search || !UTIL.isFile(histFile)) {
        // Limit set to zero, no search or no history yet = don't suggest
        return
    }
    const suggestions = Object.keys(groupedHistory).map(url => {
        if (!groupedHistory[url]) {
            return null
        }
        const simpleUrl = decodeURI(url).replace(specialChars, "").toLowerCase()
        const simpleTitle = groupedHistory[url].title.replace(
            specialChars, "").toLowerCase()
        let relevance = 1
        if (simpleSearch.every(w => simpleUrl.includes(w))) {
            relevance = 5
        }
        if (url.toLowerCase().includes(search)) {
            relevance *= 10
        }
        const allWordsInTitleOrUrl = simpleSearch.every(
            w => simpleTitle.includes(w) || simpleUrl.includes(w))
        if (relevance > 1 || allWordsInTitleOrUrl) {
            return {
                "url": url,
                "title": groupedHistory[url].title,
                "relevance": relevance * visitCount(url)
            }
        }
        return null
    }).filter(h => h)
    orderAndAddSuggestions(suggestions)
}

const orderAndAddSuggestions = suggestions => {
    SUGGEST.clear()
    suggestions.sort((a, b) => b.relevance - a.relevance)
        .forEach(SUGGEST.addHist)
}

const addToHist = url => {
    if (!SETTINGS.get("storenewvisists")) {
        return
    }
    if (UTIL.pathToSpecialPageName(url).name) {
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
    if (!SETTINGS.get("storenewvisists")) {
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

const isFinishedLoading = () => finishedLoading

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
    updateTitle,
    isFinishedLoading
}
