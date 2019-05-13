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
/* global SETTINGS SUGGEST */
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
    const histFile = path.join(remote.app.getPath("appData"), "hist")
    if (!fs.existsSync(histFile) || !fs.statSync(histFile).isFile()) {
        document.getElementById("suggest-dropdown").innerHTML = ""
        SUGGEST.clear()
        return
    }
    if (!SETTINGS.get("history.suggest")) {
        if (histStream) {
            histStream.destroy()
        }
        document.getElementById("suggest-dropdown").innerHTML = ""
        SUGGEST.clear()
        return
    }
    search = search.replace(/\W/g, "").trim().toLowerCase()
    if (!search) {
        document.getElementById("suggest-dropdown").innerHTML = ""
        return
    }
    if (histStream) {
        histStream.destroy()
        document.getElementById("suggest-dropdown").innerHTML = ""
        SUGGEST.clear()
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
            if (simpleUrl.indexOf(search) !== -1) {
                SUGGEST.addHist(hist)
            } else if (simpleTitle.indexOf(search) !== -1) {
                SUGGEST.addHist(hist)
            }
        } else {
            //Update existings urls in the suggestions list,
            //with more up to date titles (duplicate urls later in history)
            //And increase the visit counter to move frequent sites to the top
            const list = document.querySelectorAll("#suggest-dropdown div")
            const duplicate = list[SUGGEST.indexOf(hist.url)]
            if (duplicate && hist.title !== hist.url) {
                duplicate.querySelector(".title").textContent = hist.title
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
        return Number(b.getAttribute("visit-count"))
            - Number(a.getAttribute("visit-count"))
    }).forEach(el => {
        document.getElementById("suggest-dropdown").appendChild(el)
        SUGGEST.addToList(el.querySelector(".url").textContent)
    })
}

const addToHist = (title, url) => {
    if (!SETTINGS.get("history.storeNewVisits")) {
        return
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
