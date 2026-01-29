/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2026 Jelmer van Arnhem
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

const {translate} = require("../translate")
const {
    appData,
    deleteFile,
    getSetting,
    hasProtocol,
    isFile,
    joinPath,
    pathToSpecialPageName,
    readJSON,
    specialChars,
    urlToString,
    writeJSONAsync
} = require("../util")

const histFile = joinPath(appData(), "hist")
/** @type {{[url: string]: string}} */
const simpleUrls = {}
/** @type {{[url: string]: string}} */
const simpleTitles = {}
/** @type {NodeJS.Timeout|null} */
let histWriteTimeout = null
/** @type {{[url: string]: {visits: string[], title: string}}} */
let groupedHistory = {}

/** Load the history file from disk to memory. */
const init = () => {
    groupedHistory = readJSON(histFile) || {}
}

/**
 * Get a simplified url for a given regular url, result is cached for speed.
 * @param {string} url
 */
const getSimpleUrl = url => {
    let simpleUrl = simpleUrls[url]
    if (simpleUrl === undefined) {
        simpleUrl = urlToString(url).replace(specialChars, "").toLowerCase()
        simpleUrls[url] = simpleUrl
    }
    return simpleUrl
}

/**
 * Get a simplified name for a given regular page title, result is cached.
 * @param {string} name
 */
const getSimpleName = name => {
    let simpleTitle = simpleTitles[name]
    if (simpleTitle === undefined) {
        simpleTitle = name.replace(specialChars, "").toLowerCase()
        simpleTitles[name] = simpleTitle
    }
    return simpleTitle
}

/**
 * Check if all search words appear anywhere in a simple url or page title.
 * @param {string[]} search
 * @param {string} simpleUrl
 * @param {string} name
 */
const allWordsAnywhere = (search, simpleUrl, name) => search.every(
    w => simpleUrl.includes(w) || getSimpleName(name).includes(w))

/**
 * Get the visit count for a given url, will be 0 if not found or never visited.
 * @param {string|null} url
 */
const visitCount = url => url && groupedHistory[url]?.visits?.length || 0

/**
 * Suggest history for a specific url input, an order and a maximum amount.
 * @param {string} searchStr
 * @param {string} order
 * @param {number} count
 */
const suggestHist = (searchStr, order, count) => {
    // Simplify the search to a list of words, or an ordered list of words,
    // ordered matches take priority over unordered matches only.
    // In turn, exact matches get priority over ordered matches.
    const search = searchStr.toLowerCase().trim()
    const simpleSearch = search.split(specialChars).filter(Boolean)
    if (!isFile(histFile)) {
        // No need to suggest history if it's not stored
        return
    }
    const entries = Object.keys(groupedHistory).map(url => {
        if (!groupedHistory[url]) {
            return null
        }
        const simpleUrl = getSimpleUrl(url)
        const name = groupedHistory[url].title
        let relevance = 1
        if (simpleSearch.every(w => simpleUrl.includes(w))) {
            relevance = 5
        }
        if (url.toLowerCase().includes(search)) {
            relevance *= 10
        }
        if (relevance > 1 || allWordsAnywhere(simpleSearch, simpleUrl, name)) {
            return {
                "icon": url,
                "last": new Date(groupedHistory[url]?.visits?.at(-1) ?? ""),
                "title": name,
                "top": relevance * visitCount(url),
                url
            }
        }
        return null
    }).flatMap(h => h ?? [])
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
        entries.sort((a, b) => b.last.getTime() - a.last.getTime())
    }
    if (order === "relevance") {
        entries.sort((a, b) => b.top - a.top)
    }
    const {addExplore} = require("./suggest")
    for (const entry of entries.slice(0, count)) {
        addExplore(entry)
    }
}

/**
 * Write the history to disk with a debounce mechanism, optionally now instead.
 * @param {boolean} now
 */
const writeHistToFile = (now = false) => {
    clearTimeout(histWriteTimeout ?? undefined)
    if (!now) {
        histWriteTimeout = setTimeout(() => {
            writeHistToFile(true)
        }, 5000)
        return true
    }
    for (const url of Object.keys(groupedHistory)) {
        if (visitCount(url) === 0) {
            delete groupedHistory[url]
        }
    }
    if (Object.keys(groupedHistory).length === 0) {
        return deleteFile(histFile)
    }
    return writeJSONAsync(histFile, groupedHistory)
}

/**
 * Add a specific url to the history if not excluded.
 * @param {string} url
 */
const addToHist = url => {
    if (url.startsWith("devtools://")) {
        return
    }
    const saveTypes = getSetting("storenewvisits")
    if (pathToSpecialPageName(url)?.name) {
        if (!saveTypes.includes("special")) {
            return
        }
    } else if (url.startsWith("file://")) {
        if (!saveTypes.includes("files")) {
            return
        }
    } else if (url.startsWith("sourceviewer:")) {
        if (!saveTypes.includes("sourceviewer")) {
            return
        }
    } else if (url.startsWith("readerview:")) {
        if (!saveTypes.includes("readerview")) {
            return
        }
    } else if (url.startsWith("markdownviewer:")) {
        if (!saveTypes.includes("markdownviewer")) {
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

/**
 * Remove old history from before a specific date.
 * @param {Date} date
 */
const removeOldHistory = date => {
    for (const url of Object.keys(groupedHistory)) {
        groupedHistory[url].visits = groupedHistory[url].visits
            .filter(d => new Date(d) > date)
    }
    return writeHistToFile(true)
}

/**
 * Remove history newer than a specific date.
 * @param {Date} date
 */
const removeRecentHistory = date => {
    for (const url of Object.keys(groupedHistory)) {
        groupedHistory[url].visits = groupedHistory[url].visits
            .filter(d => new Date(d) < date)
    }
    return writeHistToFile(true)
}

/**
 * Remove history based on a partial url query.
 * @param {string} urlSnippet
 */
const removeHistoryByPartialUrl = urlSnippet => {
    for (const url of Object.keys(groupedHistory)) {
        if (url.includes(urlSnippet)) {
            groupedHistory[url].visits = []
        }
    }
    return writeHistToFile(true)
}

/**
 * Remove specific entries from the preload from history.
 * @param {{date: string, url: string}[]} entries
 */
const removeFromHistory = entries => {
    for (const entry of entries) {
        const {date, url} = entry
        if (groupedHistory[url]) {
            groupedHistory[url].visits = groupedHistory[url].visits
                .filter(d => d !== date)
        }
    }
    return writeHistToFile(true)
}

/**
 * @typedef {{
 *   date: Date,
 *   icon: string,
 *   title: string,
 *   url: string,
 *   visits: number
 * }} historyItem
 */

/**
 * Handle a request from the preload to remove history or just list it.
 * @param {Electron.WebviewTag} webview
 * @param {"range"|null} action
 * @param {{date: string, url: string}[]} entries
 */
const handleRequest = async(webview, action = null, entries = []) => {
    const {updateMappings} = require("./favicons")
    if (action) {
        let success = false
        if (action === "range" && entries.length > 0) {
            success = await removeFromHistory(entries)
        }
        webview.send("history-removal-status", success)
        updateMappings()
        return
    }
    /** @type {historyItem[]} */
    let history = []
    const {forSite} = require("./favicons")
    for (const site of Object.keys(groupedHistory)) {
        for (const visit of groupedHistory[site].visits) {
            history.push({
                "date": new Date(visit),
                "icon": forSite(site),
                "title": groupedHistory[site].title,
                "url": site,
                "visits": groupedHistory[site].visits.length
            })
        }
    }
    history = history.toSorted((a, b) => b.date.getTime() - a.date.getTime())
    webview.send("history-list", history)
    updateMappings()
}

/** Return a list of top sites by visit count, depending on suggesttopsites. */
const suggestTopSites = () => {
    const {forSite} = require("./favicons")
    return Object.keys(groupedHistory).filter(g => groupedHistory[g])
        .toSorted((a, b) => visitCount(b) - visitCount(a))
        .slice(0, getSetting("suggesttopsites")).map(site => ({
            "icon": forSite(site),
            "name": groupedHistory[site]?.title,
            "url": urlToString(site)
        }))
}

/**
 * Get the latest title for a page by url.
 * @param {string} originalUrl
 */
const titleForPage = originalUrl => {
    const {getRedirect} = require("./favicons")
    const url = getRedirect(originalUrl)
    const specialPage = pathToSpecialPageName(url)
    if (specialPage?.name) {
        return translate(`pages.${specialPage.name}.title`)
    }
    return groupedHistory[url]?.title ?? ""
}

/**
 * Update the title for a page by url.
 * @param {string} rawUrl
 * @param {string} rawName
 */
const updateTitle = (rawUrl, rawName) => {
    const url = rawUrl.replace(/\t/g, "")
    const name = rawName.replace(/\t/g, "")
    if (!groupedHistory[url]) {
        addToHist(url)
    }
    if (groupedHistory[url]) {
        if (groupedHistory[url].title === name) {
            return
        }
        if (groupedHistory[url].title && hasProtocol(name)) {
            return
        }
        groupedHistory[url].title = name
    }
    writeHistToFile()
}

module.exports = {
    addToHist,
    getSimpleName,
    getSimpleUrl,
    handleRequest,
    init,
    removeHistoryByPartialUrl,
    removeOldHistory,
    removeRecentHistory,
    suggestHist,
    suggestTopSites,
    titleForPage,
    updateTitle,
    visitCount,
    writeHistToFile
}
