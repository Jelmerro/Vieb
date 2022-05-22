/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2022 Jelmer van Arnhem
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
    urlToString,
    isDir,
    listDir,
    joinPath,
    readFile,
    expandPath,
    basePath,
    dirname,
    pathExists,
    isAbsolutePath,
    downloadPath,
    appData,
    isUrl,
    searchword,
    specialChars,
    stringToUrl
} = require("../util")
const {
    listTabs,
    tabOrPageMatching,
    currentMode,
    getSetting,
    getMouseConf,
    updateScreenshotHighlight
} = require("./common")

let suggestions = []
let originalValue = ""

const setUrlValue = url => {
    if (currentMode() === "explore") {
        document.getElementById("url").value = urlToString(url)
    } else {
        document.getElementById("url").value = url
    }
    updateColors()
}

const topOfSection = () => {
    const list = [...document.querySelectorAll("#suggest-dropdown div")]
    const selected = list.find(s => s.classList.contains("selected"))
    if (selected.previousSibling) {
        return selected.previousSibling.lastChild.className
            !== selected.lastChild.className
    }
    return true
}

const previousSection = () => {
    previous()
    while (!topOfSection()) {
        previous()
    }
}

const previous = () => {
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
    const index = suggestions[id - 1].indexOf("%s")
    if (index !== -1) {
        document.getElementById("url").setSelectionRange(index, index + 2)
    }
}

const nextSection = () => {
    next()
    while (!topOfSection()) {
        next()
    }
}

const next = () => {
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
    const index = suggestions[id + 1].indexOf("%s")
    if (index !== -1) {
        document.getElementById("url").setSelectionRange(index, index + 2)
    }
}

const emptySuggestions = () => {
    document.getElementById("suggest-dropdown").scrollTo(0, 0)
    document.getElementById("suggest-dropdown").textContent = ""
    document.getElementById("url").className = ""
    suggestions = []
}

const locationToSuggestion = (base, loc) => {
    let absPath = joinPath(base, loc)
    let fullPath = stringToUrl(absPath)
    let location = loc
    if (isDir(absPath)) {
        fullPath += "/"
        location += "/"
        absPath += "/"
    }
    if (absPath.includes(" ")) {
        absPath = `"${absPath}"`
    }
    return {"path": absPath, "title": location, "url": fullPath}
}

const suggestFiles = loc => {
    let location = expandPath(loc.replace(/^file:\/+/g, "/"))
    if (process.platform === "win32") {
        location = expandPath(loc.replace(/^file:\/+/g, ""))
    }
    if (isAbsolutePath(location)) {
        let matching = []
        if (dirname(location) !== location) {
            matching = listDir(dirname(location))?.map(
                p => locationToSuggestion(dirname(location), p)) || []
            matching = matching.filter(p => {
                if (!basePath(p.url).startsWith(basePath(location))) {
                    return false
                }
                return basePath(p.url) !== basePath(location)
            })
        }
        const inDir = listDir(location)?.map(
            p => locationToSuggestion(location, p)) || []
        return [...matching, ...inDir]
    }
    return []
}

const updateColors = searchStr => {
    const urlElement = document.getElementById("url")
    const search = searchStr || urlElement.value
    if (currentMode() === "explore") {
        const local = expandPath(search)
        if (search.trim() === "") {
            urlElement.className = ""
        } else if (document.querySelector("#suggest-dropdown div.selected")) {
            urlElement.className = "suggest"
        } else if (search.startsWith("file://")) {
            urlElement.className = "file"
        } else if (isUrl(search.trim())) {
            urlElement.className = "url"
        } else if (isAbsolutePath(local) && pathExists(local)) {
            urlElement.className = "file"
        } else if (searchword(search.trim()).word) {
            urlElement.className = "searchwords"
        } else {
            urlElement.className = "search"
        }
    }
}

const suggestExplore = search => {
    emptySuggestions()
    updateColors(search)
    if (!search.trim()) {
        return
    }
    const {suggestHist} = require("./history")
    getSetting("suggestorder").split(",").filter(s => s).forEach(suggest => {
        const args = suggest.split("~")
        const type = args.shift()
        let count = 10
        let order = null
        args.forEach(arg => {
            const potentialCount = Number(arg)
            if (potentialCount > 0 && potentialCount <= 9000000000000000) {
                count = potentialCount
            } else {
                order = arg
            }
        })
        if (type === "history") {
            if (!order) {
                order = "relevance"
            }
            suggestHist(search, order, count)
        }
        if (type === "file") {
            suggestFiles(search).slice(0, count).forEach(f => addExplore(f))
        }
        if (type === "searchword") {
            if (!order) {
                order = "alpha"
            }
            const words = getSetting("searchwords").split(",").map(s => {
                const [title, url] = s.split("~")
                return {title, url}
            })
            if (order === "alpha") {
                words.sort((a, b) => {
                    if (a.title > b.title) {
                        return 1
                    }
                    if (a.title < b.title) {
                        return -1
                    }
                    return 0
                })
            }
            words.filter(s => s.title.startsWith(search.trim()))
                .forEach(s => addExplore(s))
        }
    })
}

const addExplore = explore => {
    if (suggestions.includes(explore.url)) {
        return
    }
    suggestions.push(explore.url)
    const element = document.createElement("div")
    element.className = "no-focus-reset"
    element.addEventListener("mouseup", e => {
        if (e.button === 2) {
            if (getMouseConf("suggestselect")) {
                if (["both", "explore"].includes(getSetting("menusuggest"))) {
                    const {linkMenu} = require("./contextmenu")
                    linkMenu({"link": explore.url, "x": e.x, "y": e.y})
                }
            }
        } else if (getMouseConf("menusuggest")) {
            const {setMode} = require("./modes")
            setMode("normal")
            const {clear} = require("./contextmenu")
            clear()
            if (e.button === 0) {
                const {navigateTo} = require("./tabs")
                navigateTo(explore.url)
            }
            if (e.button === 1) {
                const {addTab} = require("./tabs")
                addTab({"url": explore.url})
            }
        }
        e.preventDefault()
    })
    if (explore.icon && getSetting("favicons") !== "disabled") {
        const thumbnail = document.createElement("img")
        thumbnail.className = "icon"
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
    if (explore.url.includes("%s")) {
        url.className = "searchwords"
    }
    url.textContent = urlToString(explore.url)
    element.appendChild(url)
    document.getElementById("suggest-dropdown").appendChild(element)
    setTimeout(() => {
        element.style.pointerEvents = "auto"
    }, 100)
}

const suggestCommand = searchStr => {
    emptySuggestions()
    // Remove all redundant spaces
    // Allow commands prefixed with :
    const search = searchStr.replace(/^[\s|:]*/, "").replace(/ +/g, " ")
    const {parseAndValidateArgs} = require("./command")
    const {
        range, valid, confirm, command, args
    } = parseAndValidateArgs(search)
    const urlElement = document.getElementById("url")
    if (valid) {
        urlElement.className = ""
    } else {
        urlElement.className = "invalid"
    }
    if (!search) {
        // Don't suggest when it's disabled or the search is empty
        return
    }
    // List all commands unconditionally
    const {commandList, customCommandsAsCommandList} = require("./command")
    commandList().filter(
        c => c.startsWith(search)).forEach(c => addCommand(c))
    // Command: screenshot
    if ("screenshot".startsWith(command) && !confirm && args.length < 3) {
        let [dims] = args
        let [, location] = args
        if (!dims?.match(/^\d+,\d+,\d+,\d+$/g)) {
            [, dims] = args
            ;[location] = args
        }
        dims = ` ${dims || ""}`
        location = expandPath(location || "")
        if (location.startsWith("\"") && location.endsWith("\"")) {
            location = location.slice(1, location.length - 1)
        }
        if (!location && !dims) {
            if (range) {
                addCommand(`${range}screenshot`)
            } else {
                addCommand("screenshot ~")
                addCommand("screenshot /")
                if (downloadPath()) {
                    addCommand(`screenshot ${downloadPath()}`)
                }
            }
        }
        if (range && dims) {
            addCommand(`${range}screenshot${dims}`)
        } else if (!range && (location || search.endsWith(" "))) {
            if (!isAbsolutePath(location)) {
                location = joinPath(downloadPath(), location)
            }
            suggestFiles(location).forEach(l => addCommand(
                `screenshot${dims} ${l.path}`))
        }
        updateScreenshotHighlight()
    } else {
        updateScreenshotHighlight(false)
    }
    // Command: set
    const {suggestionList, settingsWithDefaults} = require("./settings")
    if ("set".startsWith(command) && !confirm && !range) {
        if (args.length) {
            suggestionList().filter(s => s.startsWith(args[args.length - 1]))
                .map(s => `${command} ${args.slice(0, -1).join(" ")} ${s}`
                    .replace(/ +/g, " "))
                .forEach(c => addCommand(c))
        } else {
            suggestionList().map(s => `${command} ${s}`)
                .forEach(c => addCommand(c))
        }
    }
    // Command: source
    if ("source".startsWith(command) && !confirm && args.length < 2 && !range) {
        let location = expandPath(search.replace("source ", "") || "")
        if (location.startsWith("\"") && location.endsWith("\"")) {
            location = location.slice(1, location.length - 1)
        }
        if (isAbsolutePath(location)) {
            suggestFiles(location).forEach(l => addCommand(`source ${l.path}`))
        }
    }
    // Command: write
    if ("write".startsWith(command) && !confirm && args.length < 2) {
        let location = expandPath(search.replace(/w[a-z]* ?/, "") || "")
        if (location.startsWith("\"") && location.endsWith("\"")) {
            location = location.slice(1, location.length - 1)
        }
        if (range) {
            addCommand(`${range}write`)
        } else if (!location) {
            addCommand("write ~")
            addCommand("write /")
            if (downloadPath()) {
                addCommand(`write ${downloadPath()}`)
            }
        }
        if (!range && (location || search.endsWith(" "))) {
            if (!isAbsolutePath(location)) {
                location = joinPath(downloadPath(), location)
            }
            suggestFiles(location).forEach(l => addCommand(`write ${l.path}`))
        }
    }
    // Command: mkviebrc
    if ("mkviebrc full".startsWith(search) && !range) {
        addCommand("mkviebrc full")
    }
    // Command: extensions
    if ("extensions".startsWith(command)
    && !confirm && args.length < 3 && !range) {
        if (args.length < 2) {
            for (const action of ["install", "list", "remove"]) {
                if (action.startsWith(args[0] || "") && action !== args[0]) {
                    addCommand(`extensions ${action}`)
                }
            }
        }
        if (args.length >= 1) {
            const {ipcRenderer} = require("electron")
            ipcRenderer.sendSync("list-extensions").forEach(e => {
                const id = e.path.replace(/^.*(\/|\\)/g, "")
                if (`remove ${id}`.startsWith(args.join(" "))) {
                    addCommand(`extensions remove ${id}`,
                        `${e.name}: ${e.version}`)
                }
            })
        }
    }
    // Command: devtools
    if ("devtools".startsWith(command)
    && !confirm && args.length < 2 && !range) {
        const options = ["window", "split", "vsplit", "tab"]
        options.forEach(option => {
            if (!args[0] || option.startsWith(args[0])) {
                addCommand(`devtools ${option}`)
            }
        })
    }
    // Command: colorscheme
    if ("colorscheme".startsWith(command) && !range) {
        if (args.length > 1 || confirm) {
            return
        }
        const themes = {}
        listDir(joinPath(__dirname, "../colors/"))?.forEach(p => {
            themes[p.replace(/\.css$/g, "")] = "built-in"
        })
        const customDirs = [
            joinPath(appData(), "colors"),
            expandPath("~/.vieb/colors")
        ]
        customDirs.forEach(dir => {
            listDir(dir)?.filter(p => p.endsWith(".css")).forEach(p => {
                const location = joinPath(dir, p)
                if (p === "default.css" || !readFile(location)) {
                    return
                }
                themes[p.replace(/\.css$/g, "")] = location
            })
        })
        Object.keys(themes).forEach(t => {
            if (t.startsWith(args[0] || "")) {
                addCommand(`colorscheme ${t}`, themes[t])
            }
        })
    }
    // Command: command and delcommand
    for (const custom of ["command", "command!", "delcommand"]) {
        if (custom.startsWith(command)
        && (custom.endsWith("!") || !confirm) && !range) {
            customCommandsAsCommandList().split("\n")
                .filter(cmd => cmd.split(" ")[0] === "command")
                .map(cmd => cmd.split(" ")[1])
                .filter(cmd => !args[0] || cmd.startsWith(args[0]))
                .forEach(cmd => addCommand(`${custom} ${cmd}`))
        }
    }
    // Command: help
    if ("help".startsWith(command) && !confirm && !range) {
        const {
            listSupportedActions, listMappingsAsCommandList
        } = require("./input")
        const sections = [
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
            "lastusedtab",
            "viebrc",
            "examples",
            "datafolder",
            "erwic",
            "modes",
            "scrolling",
            "navigation",
            "url-modifications",
            "splitting",
            "pointer",
            "visual",
            "link-related",
            "media-related",
            "menu",
            "license",
            "mentions",
            ...commandList(false).map(c => `:${c}`),
            ...Object.values(settingsWithDefaults()).map(s => s.name),
            ...listSupportedActions(),
            ...listMappingsAsCommandList(false, true).split("\n")
                .map(m => m.split(" ")[1])
        ]
        listMappingsAsCommandList(false, true).split("\n").forEach(map => {
            const mode = map.split(" ")[0].replace(/(nore)?map$/g, "")
            const [, keys] = map.split(" ")
            if (mode) {
                sections.push(`${mode}_${keys}`)
            } else {
                "nicsefpvm".split("").forEach(m => {
                    sections.push(`${m}_${keys}`)
                })
            }
        })
        const simpleSearch = args.join(" ").replace(/^#?:?/, "")
            .replace(/!$/, "").replace(/-/g, "").toLowerCase().trim()
            .replace(/^a\w*\./, "").replace(/^p\w*\./, "p.")
        sections.filter(section => {
            const simpleSection = section.replace(/^#?:?/, "")
                .replace(/!$/, "").replace(/-/g, "").toLowerCase().trim()
            return `${command} ${simpleSection.replace(/^pointer\./, "p.")}`
                .startsWith(`${command} ${simpleSearch}`.trim())
            || `${command} ${simpleSection}`.startsWith(
                `${command} ${simpleSearch}`.trim())
        }).forEach(section => addCommand(`help ${section}`))
    }
    // Command: buffer, hide, Vexplore, Sexplore, split, vsplit etc.
    const bufferCommand = [
        "buffer",
        "hide",
        "mute",
        "pin",
        "Vexplore",
        "Sexplore",
        "split",
        "suspend",
        "vsplit",
        "close"
    ].find(b => b.startsWith(command))
    if (bufferCommand && (bufferCommand === "close" || !confirm)) {
        if (range) {
            addCommand(`${range}${bufferCommand}`)
            return
        }
        const simpleSearch = args.join("")
            .replace(specialChars, "").toLowerCase()
        const tabs = listTabs()
        tabs.filter(tab => {
            if (["close", "buffer", "mute", "pin"].includes(bufferCommand)) {
                return true
            }
            if (bufferCommand === "suspend") {
                return !tab.classList.contains("visible-tab")
                    && !tab.getAttribute("suspended")
            }
            if (bufferCommand === "hide") {
                return tab.classList.contains("visible-tab")
            }
            return !tab.classList.contains("visible-tab")
        }).map(t => ({
            "command": `${bufferCommand} ${tabs.indexOf(t)}`,
            "ref": t,
            "subtext": `${t.querySelector("span").textContent}`,
            "url": tabOrPageMatching(t).src
        })).filter(t => {
            let num = Number(args.join(""))
            if (args.length === 1) {
                if (!isNaN(num)) {
                    if (num >= tabs.length) {
                        num = tabs.length - 1
                    }
                    if (num < 0) {
                        num += tabs.length
                    }
                    if (num < 0) {
                        num = 0
                    }
                    return num === tabs.indexOf(t.ref)
                }
                if (args.join("") === "#") {
                    const {getLastTabId} = require("./pagelayout")
                    return t.ref === document.querySelector(
                        `#tabs span[link-id='${getLastTabId()}']`)
                }
            }
            const tabUrl = t.url.replace(specialChars, "").toLowerCase()
            if (tabUrl.includes(simpleSearch) && t.command.startsWith(search)) {
                return true
            }
            const tabTitle = t.subtext.replace(specialChars, "").toLowerCase()
            return tabTitle.includes(simpleSearch)
        }).forEach(t => addCommand(t.command, t.subtext))
    }
}

const addCommand = (command, subtext) => {
    if (suggestions.length + 1 > getSetting("suggestcommands")) {
        return
    }
    if (suggestions.includes(command)) {
        return
    }
    suggestions.push(command)
    const element = document.createElement("div")
    element.className = "no-focus-reset"
    element.addEventListener("mouseup", e => {
        if (e.button === 2) {
            if (getMouseConf("suggestselect")) {
                if (["both", "command"].includes(getSetting("menusuggest"))) {
                    const {commandMenu} = require("./contextmenu")
                    commandMenu({command, "x": e.x, "y": e.y})
                }
            }
        } else if (getMouseConf("menusuggest")) {
            const {setMode} = require("./modes")
            setMode("normal")
            const {execute} = require("./command")
            execute(command)
            const {clear} = require("./contextmenu")
            clear()
        }
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
    addExplore,
    emptySuggestions,
    next,
    nextSection,
    previous,
    previousSection,
    suggestCommand,
    suggestExplore
}
