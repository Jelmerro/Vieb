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
/* global SETTINGS SUGGEST TABS UTIL */
"use strict"

const fs = require("fs")
const path = require("path")
const readline = require("readline")
const {remote} = require("electron")

const parseHistLine = line => {
    const parts = line.split("\t")
    if (parts.length < 3) {
        return false
    }
    return {
        date: parts[0],
        title: parts[1],
        url: parts.slice(2).join("")
    }
}

let histStream = null

const suggestHist = search => {
    //Simplify the search to a list of words, or an ordered list of words,
    //ordered matches take priority over unordered matches only.
    //In turn, exact matches get priority over ordered matches.
    search = search.toLowerCase().trim()
    const simpleSearch = search.split(/\W/g).filter(w => w)
    const orderedSearch = RegExp(simpleSearch.join(".*"))
    const histFile = path.join(remote.app.getPath("appData"), "hist")
    document.getElementById("suggest-dropdown").textContent = ""
    SUGGEST.clear()
    if (histStream) {
        histStream.destroy()
    }
    if (!SETTINGS.get("history.suggest") || !search) {
        return
    }
    if (!fs.existsSync(histFile) || !fs.statSync(histFile).isFile()) {
        return
    }
    histStream = fs.createReadStream(histFile)
    const rl = readline.createInterface({
        input: histStream
    })
    rl.on("line", line => {
        const hist = parseHistLine(line)
        if (!hist) {
            //Invalid hist line
        } else if (SUGGEST.indexOf(hist.url) === -1) {
            const simpleUrl = hist.url.replace(/\W/g, "").toLowerCase()
            const simpleTitle = hist.title.replace(/\W/g, "").toLowerCase()
            if (simpleSearch.every(w => simpleUrl.indexOf(w) !== -1)) {
                SUGGEST.addHist(hist,
                    orderedSearch.test(hist.url.toLowerCase()),
                    hist.url.toLowerCase().indexOf(search) !== -1)
            } else if (simpleSearch.every(w => simpleTitle.indexOf(w) !== -1)) {
                SUGGEST.addHist(hist,
                    orderedSearch.test(hist.title.toLowerCase()),
                    hist.title.toLowerCase().indexOf(search) !== -1)
            }
        } else {
            //Update existings urls in the suggestions list,
            //with more up to date titles (duplicate urls later in history)
            //And increase the visit counter to move frequent sites to the top
            const list = document.querySelectorAll("#suggest-dropdown div")
            const duplicate = list[SUGGEST.indexOf(hist.url)]
            if (duplicate) {
                //If the title is currently not a url, but the new one is,
                //the "new" title is not considered an upgrade,
                //even if the title is newer (usually because of failed loads)
                const titleNow = duplicate.querySelector(".title").textContent
                const fromTitleToUrl = UTIL.isUrl(hist.title)
                    && !UTIL.isUrl(titleNow)
                if (hist.title !== hist.url && !fromTitleToUrl) {
                    duplicate.querySelector(".title").textContent = hist.title
                }
                const visits = Number(duplicate.getAttribute("visit-count"))
                duplicate.setAttribute("visit-count", String(visits + 1))
            }
        }
    }).on("close", orderSuggestions)
}

const orderSuggestions = () => {
    SUGGEST.clear()
    const list = [...document.querySelectorAll("#suggest-dropdown div")]
    list.sort((a, b) => {
        let modA = 1
        let modB = 1
        if (a.getAttribute("exact-match") === "yes") {
            modA /= 100
        }
        if (b.getAttribute("exact-match") === "yes") {
            modB /= 100
        }
        if (a.getAttribute("priority-match") === "yes") {
            modA /= 10
        }
        if (b.getAttribute("priority-match") === "yes") {
            modB /= 10
        }
        return Number(b.getAttribute("visit-count")) * modA
            - Number(a.getAttribute("visit-count")) * modB
    }).forEach(el => {
        document.getElementById("suggest-dropdown").appendChild(el)
        SUGGEST.addToList(el.querySelector(".url").textContent)
    })
}

const addToHist = (title, url) => {
    if (!SETTINGS.get("history.storeNewVisits")) {
        return
    }
    for (const specialPage of TABS.specialPagesList()) {
        if (url.startsWith(UTIL.specialPage(specialPage))) {
            return
        }
        const decodedPageUrl = decodeURIComponent(url)
        if (decodedPageUrl.startsWith(UTIL.specialPage(specialPage))) {
            return
        }
    }
    const histFile = path.join(remote.app.getPath("appData"), "hist")
    const date = new Date().toISOString()
    const line = `${date}\t${title.replace(/\t/g, " ")}\t${url}\n`
    fs.appendFileSync(histFile, line)
}

const cancelSuggest = () => {
    if (histStream) {
        histStream.destroy()
    }
    histStream = null
}

const clearHistory = () => {
    const histFile = path.join(remote.app.getPath("appData"), "hist")
    try {
        fs.unlinkSync(histFile)
    } catch (e) {
        //Failed to delete, might not exist
    }
}

module.exports = {
    addToHist,
    suggestHist,
    cancelSuggest,
    clearHistory
}
