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
/* global COMMAND FAVICONS MODES SETTINGS TABS */
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

const addHist = hist => {
    if (suggestions.length > SETTINGS.get("suggesthistory")) {
        return
    }
    addToList(hist.url)
    const element = document.createElement("div")
    element.className = "no-focus-reset"
    element.addEventListener("mouseup", e => {
        MODES.setMode("normal")
        TABS.navigateTo(hist.url)
        e.preventDefault()
    })
    const icon = FAVICONS.forSite(hist.url)
    if (icon && SETTINGS.get("favicons") !== "disabled") {
        const thumbnail = document.createElement("img")
        thumbnail.src = icon
        element.appendChild(thumbnail)
    }
    const title = document.createElement("span")
    title.className = "title"
    title.textContent = hist.title
    element.appendChild(title)
    const url = document.createElement("span")
    url.className = "url"
    if (hist.url.startsWith("file://")) {
        url.className = "file"
    }
    url.textContent = hist.url
    element.appendChild(url)
    document.getElementById("suggest-dropdown").appendChild(element)
}

const suggestCommand = search => {
    document.getElementById("suggest-dropdown").textContent = ""
    clear()
    // Remove all redundant spaces
    // Allow commands prefixed with :
    search = search.replace(/^[\s|:]*/, "").replace(/ +/g, " ")
    const limit = SETTINGS.get("suggestcommands")
    if (!limit || !search || !COMMAND.parseAndValidateArgs(search).valid) {
        // Limited to zero, no search or invalid = don't suggest
        return
    }
    const commandName = search.split(" ")[0]
    let subCommandSuggestions = []
    if ("set".startsWith(commandName)) {
        subCommandSuggestions = SETTINGS.suggestionList()
            .map(s => `${search.split(" ").slice(0, -1).join(" ")} ${s}`)
    }
    if ("write".startsWith(commandName)) {
        subCommandSuggestions = ["write ~/Downloads/newfile"]
    }
    if ("mkviebrc".startsWith(commandName)) {
        subCommandSuggestions = ["mkv full", "mkviebrc full"]
    }
    const isBufferCommand = [
        "buffer", "hide", "close", "Vexplore", "Sexplore", "split", "vsplit"
    ].some(b => b.startsWith(commandName))
    if (isBufferCommand && !"hcsv".split("").includes(commandName)) {
        const simpleSearch = search.split(" ").slice(1).join("")
            .replace(/\W/g, "").toLowerCase()
        TABS.listTabs().map((t, index) => {
            return {
                "command": `${commandName} ${index}`,
                "subtext": `${t.querySelector("span").textContent}`,
                "url": TABS.tabOrPageMatching(t).src
            }
        }).filter(t => {
            if (t.command.startsWith(search)) {
                return true
            }
            const simpleTabUrl = t.url.replace(/\W/g, "").toLowerCase()
            if (simpleTabUrl.includes(simpleSearch)) {
                return true
            }
            const simpleTabTitle = t.subtext.replace(/\W/g, "").toLowerCase()
            return simpleTabTitle.includes(simpleSearch)
        }).slice(0, limit).forEach(t => { addCommand(t.command, t.subtext) })
    }
    const possibleCommands = COMMAND.commandList().concat(subCommandSuggestions)
        .filter(c => c.toLowerCase().startsWith(search.toLowerCase()))
    for (const command of possibleCommands.slice(0, limit)) {
        addCommand(command)
    }
}

const addCommand = (command, subtext) => {
    addToList(command)
    const element = document.createElement("div")
    element.className = "no-focus-reset"
    element.addEventListener("mouseup", e => {
        COMMAND.execute(command)
        MODES.setMode("normal")
        e.preventDefault()
    })
    const commandElement = document.createElement("span")
    commandElement.textContent = command
    element.appendChild(commandElement)
    const subtextElement = document.createElement("span")
    subtextElement.textContent = subtext
    subtextElement.className = "file"
    element.appendChild(subtextElement)
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
