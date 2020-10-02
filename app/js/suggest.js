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
/* global COMMAND HISTORY INPUT MODES SETTINGS TABS UTIL */
"use strict"

const path = require("path")
const fs = require("fs")

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
    const selected = list.find(s => s.classList.contains("selected"))
    let id = list.indexOf(selected)
    if (!selected) {
        originalValue = document.getElementById("url").value
        id = list.length
    }
    list.forEach(l => {
        l.className = ""
    })
    if (id === 0) {
        setUrlValue(originalValue)
        return
    }
    list[id - 1].className = "selected"
    list[id - 1].scrollIntoView({"block": "center"})
    setUrlValue(suggestions[id - 1])
    updateColors()
}

const nextSuggestion = () => {
    const list = [...document.querySelectorAll("#suggest-dropdown div")]
    if (list.length === 0) {
        return
    }
    const selected = list.find(s => s.classList.contains("selected"))
    let id = list.indexOf(selected)
    if (!selected) {
        originalValue = document.getElementById("url").value
        id = -1
    }
    list.forEach(l => {
        l.className = ""
    })
    if (id === list.length - 1) {
        setUrlValue(originalValue)
        return
    }
    list[id + 1].className = "selected"
    list[id + 1].scrollIntoView({"block": "center"})
    setUrlValue(suggestions[id + 1])
    updateColors()
}

const emptySuggestions = () => {
    document.getElementById("suggest-dropdown").scrollTo(0, 0)
    document.getElementById("suggest-dropdown").textContent = ""
    document.getElementById("url").className = ""
    suggestions = []
}

const locationToSuggestion = (base, location) => {
    let absPath = path.join(base, location)
    let fullPath = UTIL.stringToUrl(absPath)
    if (UTIL.isDir(absPath)) {
        fullPath += "/"
        location += "/"
        absPath += "/"
    }
    if (absPath.includes(" ")) {
        absPath = `"${absPath}"`
    }
    return {"url": fullPath, "title": location, "path": absPath}
}

const suggestFiles = location => {
    location = UTIL.expandPath(location.replace(/file:\/*/, "/"))
    if (path.isAbsolute(location)) {
        let matching = []
        if (path.dirname(location) !== location) {
            try {
                matching = fs.readdirSync(path.dirname(location)).map(
                    p => locationToSuggestion(path.dirname(location), p))
            } catch (_) {
                // Not allowed
            }
            matching = matching.filter(p => {
                if (!path.basename(p.url).startsWith(path.basename(location))) {
                    return false
                }
                return path.basename(p.url) !== path.basename(location)
            })
        }
        let inDir = []
        try {
            inDir = fs.readdirSync(location).map(
                p => locationToSuggestion(location, p))
        } catch (_) {
            // Not allowed
        }
        return [...matching, ...inDir]
    }
    return []
}

const updateColors = search => {
    const urlElement = document.getElementById("url")
    search = search || urlElement.value
    if (MODES.currentMode() === "explore") {
        const local = UTIL.expandPath(search)
        if (search.trim() === "") {
            urlElement.className = ""
        } else if (document.querySelector("#suggest-dropdown div.selected")) {
            urlElement.className = "suggest"
        } else if (search.startsWith("file://")) {
            urlElement.className = "file"
        } else if (UTIL.isUrl(search.trim())) {
            urlElement.className = "url"
        } else if (path.isAbsolute(local) && UTIL.pathExists(local)) {
            urlElement.className = "file"
        } else {
            urlElement.className = "search"
        }
    }
}

const suggestExplore = search => {
    emptySuggestions()
    updateColors(search)
    if (!SETTINGS.get("suggestexplore") || !search.trim()) {
        // Don't suggest if the limit is set to zero or if the search is empty
        return
    }
    if (["all", "explore"].includes(SETTINGS.get("suggestfiles"))) {
        if (SETTINGS.get("suggestfilesfirst")) {
            suggestFiles(search).forEach(f => addExplore(f))
        }
        HISTORY.suggestHist(search)
        if (!SETTINGS.get("suggestfilesfirst")) {
            suggestFiles(search).forEach(f => addExplore(f))
        }
    } else {
        HISTORY.suggestHist(search)
    }
}

const addExplore = explore => {
    if (suggestions.length + 1 > SETTINGS.get("suggestexplore")) {
        return
    }
    if (suggestions.includes(explore.url)) {
        return
    }
    suggestions.push(explore.url)
    const element = document.createElement("div")
    element.className = "no-focus-reset"
    element.addEventListener("mouseup", e => {
        MODES.setMode("normal")
        TABS.navigateTo(explore.url)
        e.preventDefault()
    })
    if (explore.icon && SETTINGS.get("favicons") !== "disabled") {
        const thumbnail = document.createElement("img")
        thumbnail.src = explore.icon
        element.appendChild(thumbnail)
    }
    const title = document.createElement("span")
    title.className = "title"
    title.textContent = explore.title
    element.appendChild(title)
    const url = document.createElement("span")
    url.className = "url"
    if (explore.url.startsWith("file://")) {
        url.className = "file"
    }
    url.textContent = UTIL.urlToString(explore.url)
    element.appendChild(url)
    document.getElementById("suggest-dropdown").appendChild(element)
    setTimeout(() => {
        element.style.pointerEvents = "auto"
    }, 100)
}

const suggestCommand = search => {
    emptySuggestions()
    // Remove all redundant spaces
    // Allow commands prefixed with :
    search = search.replace(/^[\s|:]*/, "").replace(/ +/g, " ")
    const {valid, confirm, command, args} = COMMAND.parseAndValidateArgs(search)
    const urlElement = document.getElementById("url")
    if (valid) {
        urlElement.className = ""
    } else {
        urlElement.className = "invalid"
    }
    if (!SETTINGS.get("suggestcommands") || !search) {
        // Don't suggest when it's disabled or the search is empty
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
    if ("write".startsWith(command) && !confirm && args.length < 2) {
        let location = UTIL.expandPath(args[0]?.replace(/w[a-z]* ?/, "") || "")
        if (!location) {
            addCommand("write ~")
            addCommand("write /")
            addCommand(`write ${SETTINGS.get("downloadpath")}`)
        }
        if (!path.isAbsolute(location)) {
            location = path.join(SETTINGS.get("downloadpath"), location)
        }
        suggestFiles(location).forEach(l => addCommand(`write ${l.path}`))
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
    if (bufferCommand && !["h", "s", "v"].includes(command) && !confirm) {
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
            "erwic",
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
    if (suggestions.includes(command)) {
        return
    }
    suggestions.push(command)
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
    emptySuggestions,
    addExplore,
    suggestExplore,
    suggestCommand
}
