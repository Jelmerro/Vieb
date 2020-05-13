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
/* global COMMAND FAVICONS INPUT MODES SETTINGS TABS UTIL */
"use strict"

let suggestions = []
let originalValue = ""

const setUrlValue = url => {
    if (MODES.currentMode() === "explore") {
        document.getElementById("url").value = UTIL.urlToString(url)
    } else {
        document.getElementById("url").value = url
    }
}

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
            setUrlValue(suggestions[id - 1])
        }
    } else {
        originalValue = document.getElementById("url").value
        list.forEach(l => {
            l.className = ""
        })
        list[list.length - 1].className = "selected"
        setUrlValue(suggestions[list.length - 1])
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
            setUrlValue(suggestions[id + 1])
        } else {
            document.getElementById("url").value = originalValue
        }
    } else {
        originalValue = document.getElementById("url").value
        list.forEach(l => {
            l.className = ""
        })
        list[0].className = "selected"
        setUrlValue(suggestions[0])
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

const includes = suggestion => suggestions.includes(suggestion)

const indexOf = suggestion => suggestions.indexOf(suggestion)

const addHist = hist => {
    if (suggestions.length + 1 > SETTINGS.get("suggesthistory")) {
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
    url.textContent = UTIL.urlToString(hist.url)
    element.appendChild(url)
    document.getElementById("suggest-dropdown").appendChild(element)
    setTimeout(() => {
        element.style.pointerEvents = "auto"
    }, 100)
}

const suggestCommand = search => {
    document.getElementById("suggest-dropdown").textContent = ""
    clear()
    // Remove all redundant spaces
    // Allow commands prefixed with :
    search = search.replace(/^[\s|:]*/, "").replace(/ +/g, " ")
    const {valid, confirm, command, args} = COMMAND.parseAndValidateArgs(search)
    if (!SETTINGS.get("suggestcommands") || !search || !valid) {
        // Limited to zero, no search or invalid = don't suggest
        return
    }
    // List all commands unconditionally
    COMMAND.commandList().filter(
        c => c.startsWith(search)).forEach(c => addCommand(c))
    // Command: set
    if ("set".startsWith(command) && !confirm) {
        if (args.length) {
            SETTINGS.suggestionList()
                .filter(s => s.startsWith(args[args.length - 1]))
                .map(s => `${command} ${args.slice(0, -1).join(" ")} ${s}`
                    .replace(/ +/g, " "))
                .forEach(c => addCommand(c))
        } else {
            SETTINGS.suggestionList().map(s => `${command} ${s}`)
                .forEach(c => addCommand(c))
        }
    }
    // Command: write
    if ("write ~/Downloads/newfile".startsWith(search) && !confirm) {
        addCommand("write ~/Downloads/newfile")
    }
    // Command: mkviebrc
    if ("mkviebrc full".startsWith(search) && !confirm) {
        addCommand("mkviebrc full")
    }
    // Command: buffer, hide, Vexplore, Sexplore, split and vsplit
    const bufferCommand = [
        "buffer", "hide", "Vexplore", "Sexplore", "split", "vsplit"
    ].find(b => b.startsWith(command))
    let suggestedCommandName = command
    if (suggestions.length > 1) {
        suggestedCommandName = bufferCommand
    }
    if (bufferCommand && command !== "h" && !confirm) {
        const simpleSearch = args.join("").replace(/\W/g, "").toLowerCase()
        TABS.listTabs().filter(tab => {
            if (bufferCommand === "buffer") {
                return true
            }
            if (bufferCommand === "hide") {
                return tab.classList.contains("visible-tab")
            }
            return !tab.classList.contains("visible-tab")
        }).map(t => ({
            "command": `${suggestedCommandName} ${TABS.listTabs().indexOf(t)}`,
            "subtext": `${t.querySelector("span").textContent}`,
            "url": TABS.tabOrPageMatching(t).src
        })).filter(t => {
            if (t.command.startsWith(search)) {
                return true
            }
            const simpleTabUrl = t.url.replace(/\W/g, "").toLowerCase()
            if (simpleTabUrl.includes(simpleSearch)) {
                return true
            }
            const simpleTabTitle = t.subtext.replace(/\W/g, "").toLowerCase()
            return simpleTabTitle.includes(simpleSearch)
        }).forEach(t => addCommand(t.command, t.subtext))
    }
    // Command: call
    suggestedCommandName = command
    if (suggestions.length > 1) {
        suggestedCommandName = "call"
    }
    if ("call".startsWith(command) && !confirm) {
        INPUT.listSupportedActions().filter(
            action => `${command} ${action.replace(/(^<|>$)/g, "")}`.startsWith(
                `${command} ${args.join(" ")}`.trim()))
            .forEach(action => addCommand(`${suggestedCommandName} ${action}`))
    }
    if ("help".startsWith(command) && !confirm) {
        [
            "intro",
            "commands",
            "settings",
            "actions",
            "settingcommands",
            "specialpages",
            "mappings",
            "key-codes",
            "<>",
            "customcommands",
            "splits",
            "viebrc",
            "datafolder",
            "modes",
            "scrolling",
            "navigation",
            "splitting",
            "pointer",
            "license",
            "mentions",
            ...COMMAND.commandList().map(c => `:${c}`),
            ...INPUT.listSupportedActions(),
            ...Object.values(SETTINGS.settingsWithDefaults()).map(s => s.name),
            ...COMMAND.commandList()
        ].filter(section => `${command} ${section}`.startsWith(
            `${command} ${args.join(" ")}`.trim())
        ).forEach(section => addCommand(`help ${section}`))
    }
}

const addCommand = (command, subtext) => {
    if (suggestions.length + 1 > SETTINGS.get("suggestcommands")) {
        return
    }
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
    setTimeout(() => {
        element.style.pointerEvents = "auto"
    }, 100)
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
