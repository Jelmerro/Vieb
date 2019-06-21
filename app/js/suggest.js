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
/* global HISTORY SETTINGS */
"use strict"

let suggestions = []
let originalValue = ""

const prevSuggestion = () => {
    const list = [...document.querySelectorAll("#suggest-dropdown div")]
    if (list.length === 0) {
        return
    }
    const selected = document.querySelector("#suggest-dropdown div.selected")
    if (selected) {
        const id = list.indexOf(selected)
        list.forEach(l => {
            l.className = ""
        })
        if (id === 0) {
            document.getElementById("url").value = originalValue
        } else {
            list[id - 1].className = "selected"
            document.getElementById("url").value = suggestions[id - 1]
        }
    } else {
        originalValue = document.getElementById("url").value
        list.forEach(l => {
            l.className = ""
        })
        list[list.length - 1].className = "selected"
        document.getElementById("url").value = suggestions[list.length - 1]
    }
}

const nextSuggestion = () => {
    const list = [...document.querySelectorAll("#suggest-dropdown div")]
    if (list.length === 0) {
        return
    }
    const selected = document.querySelector("#suggest-dropdown div.selected")
    if (selected) {
        const id = list.indexOf(selected)
        list.forEach(l => {
            l.className = ""
        })
        if (id < list.length - 1) {
            list[id + 1].className = "selected"
            document.getElementById("url").value = suggestions[id + 1]
        } else {
            document.getElementById("url").value = originalValue
        }
    } else {
        originalValue = document.getElementById("url").value
        list.forEach(l => {
            l.className = ""
        })
        list[0].className = "selected"
        document.getElementById("url").value = suggestions[0]
    }
}

const cancelSuggestions = () => {
    document.getElementById("suggest-dropdown").textContent = ""
    HISTORY.cancelSuggest()
}

const clear = () => {
    suggestions = []
}

const addToList = suggestion => {
    suggestions.push(suggestion)
}

const includes = suggestion => {
    return suggestions.includes(suggestion)
}

const indexOf = suggestion => {
    return suggestions.indexOf(suggestion)
}

const addHist = (hist, priority, exact) => {
    addToList(hist.url)
    const element = document.createElement("div")
    element.setAttribute("visit-count", "1")
    if (exact) {
        element.setAttribute("exact-match", "yes")
    } else if (priority) {
        element.setAttribute("priority-match", "yes")
    }
    const title = document.createElement("span")
    title.className = "title"
    title.textContent = hist.title
    element.appendChild(title)
    element.appendChild(document.createTextNode(" - "))
    const url = document.createElement("span")
    url.className = "url"
    url.textContent = hist.url
    element.appendChild(url)
    document.getElementById("suggest-dropdown").appendChild(element)
}

const commandList = [
    "quit",
    "devtools",
    "reload",
    "version",
    "help",
    "help basics",
    "history",
    "downloads",
    "accept",
    "confirm",
    "reject",
    "deny",
    "set ",
    "set redirectToHttp ",
    "set redirectToHttp true",
    "set redirectToHttp false",
    "set search ",
    "set search https://duckduckgo.com/?kae=d&q=",
    "set caseSensitiveSearch ",
    "set caseSensitiveSearch true",
    "set caseSensitiveSearch false",
    "set clearCacheOnQuit ",
    "set clearCacheOnQuit true",
    "set clearCacheOnQuit false",
    "set clearLocalStorageOnQuit ",
    "set clearLocalStorageOnQuit true",
    "set clearLocalStorageOnQuit false",
    "set suggestCommands ",
    "set suggestCommands true",
    "set suggestCommands false",
    "set allowFollowModeDuringLoad ",
    "set allowFollowModeDuringLoad true",
    "set allowFollowModeDuringLoad false",
    "set fontSize ",
    "set fontSize 14",
    "set digitsRepeatActions ",
    "set digitsRepeatActions true",
    "set digitsRepeatActions false",
    "set notification.",
    "set notification.system ",
    "set notification.system true",
    "set notification.system false",
    "set notification.position ",
    "set notification.position bottom-right",
    "set notification.position bottom-left",
    "set notification.position top-right",
    "set notification.position top-left",
    "set notification.duration ",
    "set notification.duration 5000",
    "set downloads.",
    "set downloads.path ",
    "set downloads.path ~/Downloads/",
    "set downloads.method ",
    "set downloads.method automatic",
    "set downloads.method ask",
    "set downloads.method confirm",
    "set downloads.removeCompleted ",
    "set downloads.removeCompleted true",
    "set downloads.removeCompleted false",
    "set downloads.clearOnQuit ",
    "set downloads.clearOnQuit true",
    "set downloads.clearOnQuit false",
    "set history.",
    "set history.suggest ",
    "set history.suggest true",
    "set history.suggest false",
    "set history.clearOnQuit ",
    "set history.clearOnQuit true",
    "set history.clearOnQuit false",
    "set history.storeNewVisits ",
    "set history.storeNewVisits true",
    "set history.storeNewVisits false",
    "set tabs.",
    "set tabs.restore ",
    "set tabs.restore true",
    "set tabs.restore false",
    "set tabs.keepRecentlyClosed ",
    "set tabs.keepRecentlyClosed true",
    "set tabs.keepRecentlyClosed false"
]

const suggestCommand = search => {
    document.getElementById("suggest-dropdown").textContent = ""
    clear()
    if (search.startsWith(":")) {
        search = search.replace(":", "")
    }
    if (!SETTINGS.get("suggestCommands") || !search) {
        return
    }
    const possibleCommands = commandList.filter(c => {
        if (c.toLowerCase().startsWith(search.toLowerCase())) {
            if (c.toLowerCase().trim() !== search.toLowerCase().trim()) {
                return true
            }
        }
        return false
    })
    for (const command of possibleCommands.slice(0, 10)) {
        addCommand(command)
    }
}

const addCommand = command => {
    addToList(command)
    const element = document.createElement("div")
    element.textContent = command
    document.getElementById("suggest-dropdown").appendChild(element)
}

module.exports = {
    prevSuggestion,
    nextSuggestion,
    cancelSuggestions,
    clear,
    addToList,
    includes,
    indexOf,
    addHist,
    suggestCommand
}
