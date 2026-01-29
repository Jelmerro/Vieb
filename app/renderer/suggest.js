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

const {
    appData,
    basePath,
    dirname,
    downloadPath,
    expandPath,
    getAppRootDir,
    getSetting,
    isAbsolutePath,
    isDir,
    isUrl,
    joinPath,
    listDir,
    pathExists,
    readFile,
    searchword,
    stringToUrl,
    urlToString
} = require("../util")
const {
    currentMode,
    currentPage,
    getMouseConf,
    getUrl,
    listTabs,
    pageForTab,
    updateScreenshotHighlight
} = require("./common")

/** @type {string[]} */
let suggestions = []
let originalValue = ""

/**
 * Update the explore border colors based on the input type.
 * @param {string|null} searchStr
 */
const updateColors = (searchStr = null) => {
    const urlElement = getUrl()
    const search = searchStr || urlElement?.value
    if (search !== undefined && urlElement && currentMode() === "explore") {
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

/**
 * Set the url value correctly formatted and update border colors.
 * @param {string} url
 */
const setUrlValue = url => {
    const urlInput = getUrl()
    if (!urlInput) {
        return
    }
    if (currentMode() === "explore") {
        urlInput.value = urlToString(url)
    } else {
        urlInput.value = url
    }
    updateColors()
}

/** Check if the currently selected suggestion is the very first one (yet). */
const topOfSection = () => {
    const list = [...document.querySelectorAll("#suggest-dropdown div")]
    const selected = list.find(s => s.classList.contains("selected"))
    if (selected && selected.previousElementSibling) {
        return selected.previousElementSibling.lastElementChild?.className
            !== selected.lastElementChild?.className
    }
    return true
}

/** Select the previous suggestion from the list. */
const previous = () => {
    const list = [...document.querySelectorAll("#suggest-dropdown div")]
    if (list.length === 0) {
        return
    }
    const selected = list.find(s => s.classList.contains("selected"))
    let id = list.length
    const url = getUrl()
    if (selected) {
        id = list.indexOf(selected)
    } else {
        originalValue = url?.value ?? ""
    }
    for (const l of list) {
        l.className = ""
    }
    if (id === 0) {
        setUrlValue(originalValue)
        return
    }
    list[id - 1].className = "selected"
    list[id - 1].scrollIntoView({"block": "center"})
    setUrlValue(suggestions[id - 1])
    const index = suggestions[id - 1].indexOf("%s")
    if (index !== -1) {
        url?.setSelectionRange(index, index + 2)
    }
}

/** Go the previous section in the suggestion list. */
const previousSection = () => {
    previous()
    while (!topOfSection()) {
        previous()
    }
}

/** Select the next suggestion from the list. */
const next = () => {
    const list = [...document.querySelectorAll("#suggest-dropdown div")]
    if (list.length === 0) {
        return
    }
    const selected = list.find(s => s.classList.contains("selected"))
    let id = -1
    const url = getUrl()
    if (selected) {
        id = list.indexOf(selected)
    } else {
        originalValue = url?.value ?? ""
    }
    for (const l of list) {
        l.className = ""
    }
    if (id === list.length - 1) {
        setUrlValue(originalValue)
        return
    }
    list[id + 1].className = "selected"
    list[id + 1].scrollIntoView({"block": "center"})
    setUrlValue(suggestions[id + 1])
    const index = suggestions[id + 1].indexOf("%s")
    if (index !== -1) {
        url?.setSelectionRange(index, index + 2)
    }
}

/** Go the next section in the suggestion list. */
const nextSection = () => {
    next()
    while (!topOfSection()) {
        next()
    }
}

/** Remove all suggestions and empty the list. */
const emptySuggestions = () => {
    const suggestDropdown = document.getElementById("suggest-dropdown")
    const url = getUrl()
    if (suggestDropdown && url) {
        suggestDropdown.scrollTo(0, 0)
        suggestDropdown.textContent = ""
        url.className = ""
    }
    suggestions = []
}

/**
 * Translate a location to an informative object that can be suggested.
 * @param {string} base
 * @param {string} loc
 * @returns {{path: string, title: string, type: "file", url: string}}
 */
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
    return {"path": absPath, "title": location, "type": "file", "url": fullPath}
}

/**
 * Suggest files based on current path entry.
 * @param {string} loc
 */
const suggestFiles = loc => {
    let location = expandPath(loc.replace(/^file:\/+/g, "/"))
    if (process.platform === "win32") {
        location = expandPath(loc.replace(/^file:\/+/g, ""))
    }
    if (isAbsolutePath(location)) {
        /**
         * @type {{
         *   path: string, title: string, type: "file", url: string
         * }[]}
         */
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

/**
 * Add a suggestion to the explore mode suggestions.
 * @param {{title: string, type?: string, url: string, icon?: string}} explore
 */
const addExplore = explore => {
    if (suggestions.includes(explore.url)) {
        return
    }
    suggestions.push(explore.url)
    const element = document.createElement("div")
    element.className = "no-focus-reset"
    element.addEventListener("mouseup", e => {
        if (e.button === 2) {
            if (getMouseConf("suggestselect")
                && ["both", "explore"].includes(getSetting("menusuggest"))) {
                const {linkMenu} = require("./contextmenu")
                linkMenu("user", {"link": explore.url, "x": e.x, "y": e.y})
            }
        } else if (getMouseConf("menusuggest")) {
            const {setMode} = require("./modes")
            setMode("normal")
            const {clear} = require("./contextmenu")
            clear()
            if (e.button === 0) {
                const {navigateTo} = require("./tabs")
                navigateTo("user", explore.url)
            }
            if (e.button === 1) {
                const {addTab} = require("./tabs")
                addTab({"src": "user", "url": explore.url})
            }
        }
        e.preventDefault()
    })
    if (explore.icon && getSetting("favicons") !== "disabled") {
        const thumbnail = document.createElement("img")
        thumbnail.className = "icon"
        const {forSite} = require("./favicons")
        thumbnail.src = forSite(explore.icon) || "img/empty.png"
        element.append(thumbnail)
    }
    const title = document.createElement("span")
    title.className = "title"
    title.textContent = explore.title
    element.append(title)
    const url = document.createElement("span")
    url.className = "url"
    if (explore.type === "file") {
        url.className = "file"
    }
    if (explore.type === "searchword") {
        url.className = "searchwords"
    }
    url.textContent = urlToString(explore.url)
    element.append(url)
    document.getElementById("suggest-dropdown")?.append(element)
    setTimeout(() => {
        element.style.pointerEvents = "auto"
    }, 100)
}

/**
 * Suggest urls, files and searchwords based on the current input and settings.
 * @param {string} search
 */
const suggestExplore = search => {
    emptySuggestions()
    updateColors(search)
    if (!search.trim()) {
        return
    }
    const {suggestHist} = require("./history")
    for (const suggest of getSetting("suggestorder").filter(Boolean)) {
        const args = suggest.split("~")
        const type = args.shift()
        let count = 10
        let order = null
        for (const arg of args) {
            const potentialCount = Number(arg)
            if (potentialCount > 0 && potentialCount <= 9000000000000000) {
                count = potentialCount
            } else {
                order = arg
            }
        }
        if (type === "history") {
            if (!order) {
                order = "relevance"
            }
            suggestHist(search, order, count)
        }
        if (type === "file") {
            for (const f of suggestFiles(search).slice(0, count)) {
                addExplore(f)
            }
        }
        if (type === "searchword") {
            if (!order) {
                order = "alpha"
            }
            const searchwords = getSetting("searchwords")
            const words = Object.keys(searchwords).map(title => {
                const url = searchwords[title]
                let filledUrl = searchword(search).url
                if (filledUrl === search) {
                    filledUrl = url
                }
                return {title, "type": "searchword", "url": filledUrl}
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
            const searchStr = search.split(" ").find(Boolean)?.trim() ?? ""
            for (const word of words.filter(
                s => s.title.startsWith(searchStr))) {
                addExplore(word)
            }
        }
    }
}

/**
 * Add a command to the suggestion list.
 * @param {string} command
 * @param {string|null} subtext
 * @param {string|null} url
 * @param {string|null} icon
 * @param {boolean} allowDuplicate
 */
const addCommand = (
    command, subtext = null, url = null, icon = null, allowDuplicate = false
) => {
    if (suggestions.length + 1 > getSetting("suggestcommands")) {
        return
    }
    if (suggestions.includes(command) && !allowDuplicate) {
        return
    }
    suggestions.push(command)
    const element = document.createElement("div")
    element.className = "no-focus-reset"
    element.addEventListener("mouseup", e => {
        if (e.button === 2) {
            if (getMouseConf("suggestselect")
                && ["both", "command"].includes(getSetting("menusuggest"))) {
                const {commandMenu} = require("./contextmenu")
                commandMenu("user", {command, "x": e.x, "y": e.y})
            }
        } else if (getMouseConf("menusuggest")) {
            const {setMode} = require("./modes")
            setMode("normal")
            const {execute} = require("./command")
            execute(command, {"src": "user"})
            const {clear} = require("./contextmenu")
            clear()
        }
        e.preventDefault()
    })
    if (icon && getSetting("favicons") !== "disabled") {
        const thumbnail = document.createElement("img")
        thumbnail.className = "icon"
        const {forSite} = require("./favicons")
        thumbnail.src = forSite(icon) || "img/empty.png"
        element.append(thumbnail)
    }
    const commandElement = document.createElement("span")
    commandElement.className = "title"
    commandElement.textContent = command
    element.append(commandElement)
    if (subtext) {
        const subtextElement = document.createElement("span")
        subtextElement.textContent = subtext
        subtextElement.className = "file"
        element.append(subtextElement)
    }
    if (url) {
        const urlElement = document.createElement("span")
        urlElement.textContent = urlToString(url)
        urlElement.className = "url"
        element.append(urlElement)
    }
    document.getElementById("suggest-dropdown")?.append(element)
    setTimeout(() => {
        element.style.pointerEvents = "auto"
    }, 100)
}

/**
 * Suggest a command based on the current input text.
 * @param {string} searchStr
 */
const suggestCommand = searchStr => {
    emptySuggestions()
    // Remove all redundant spaces
    // Allow commands prefixed with :
    const search = searchStr.replace(/^[\s:|]*/, "").replace(/ +/g, " ")
    const {parseAndValidateArgs} = require("./command")
    const {
        args, command, confirm, range, valid
    } = parseAndValidateArgs(search)
    const urlElement = document.getElementById("url")
    if (urlElement) {
        if (valid) {
            urlElement.className = ""
        } else {
            urlElement.className = "invalid"
        }
    }
    if (!search) {
        // Don't suggest when it's disabled or the search is empty
        return
    }
    let confirmChar = ""
    if (confirm) {
        confirmChar = "!"
    }
    // List all commands unconditionally
    const {
        commandList, customCommandsAsCommandList, rangeToTabIdxs
    } = require("./command")
    for (const cmd of commandList().filter(c => c.startsWith(search))) {
        addCommand(cmd)
    }
    const {validOptions} = require("./settings")
    // Command: screenshot and screencopy
    if (command.startsWith("screen")
        && !range && !confirm && args.length < 3) {
        let fullCommand = "screenshot"
        if (command.startsWith("screenc")) {
            fullCommand = "screencopy"
        }
        let [dims, location] = args
        let dimsFirst = true
        if (!dims?.match(/^[\d,]+$/g)
            || location && !dims?.match(/^(?:\d+,){3}\d+$/g)) {
            [location, dims] = args
            dimsFirst = false
        }
        if (dims && !dims?.match(/^[\d,]+$/g)) {
            return
        }
        const pageHeight = Number(currentPage()?.style.height.split(/[.px]/g)[0])
        const pageWidth = Number(currentPage()?.style.width.split(/[.px]/g)[0])
        const rect = {
            "height": Number(dims?.split(",")[1] ?? pageHeight),
            "width": Number(dims?.split(",")[0] ?? pageWidth),
            "x": Number(dims?.split(",")[2] ?? 0),
            "y": Number(dims?.split(",")[3] ?? 0)
        }
        const dimsSuggest = `${rect.width},${rect.height},${rect.x},${rect.y}`
        location = expandPath(location || "")
        if (location && !isAbsolutePath(location)) {
            location = joinPath(downloadPath(), location)
        }
        if (fullCommand === "screencopy") {
            if (!dims) {
                addCommand(`${fullCommand}`)
            }
            addCommand(`${fullCommand} ${dimsSuggest}`)
        } else if (location) {
            const fileSuggestions = suggestFiles(location)
            for (const l of fileSuggestions) {
                let loc = l.path
                if (l.path.includes(" ")) {
                    loc = `"${loc}"`
                }
                if (dimsFirst) {
                    addCommand(`${fullCommand} ${dimsSuggest} ${loc}`)
                } else if (dims) {
                    addCommand(`${fullCommand} ${loc} ${dimsSuggest}`)
                } else {
                    addCommand(`${fullCommand} ${loc}`)
                    addCommand(`${fullCommand} ${loc} ${dimsSuggest}`)
                }
            }
            if (fileSuggestions.length === 0) {
                if (dimsFirst) {
                    addCommand(`${fullCommand} ${dimsSuggest} ${location}`)
                } else if (dims) {
                    addCommand(`${fullCommand} ${location} ${dimsSuggest}`)
                } else {
                    addCommand(`${fullCommand} ${location}`)
                    addCommand(`${fullCommand} ${location} ${dimsSuggest}`)
                }
            }
        } else {
            if (!dims) {
                addCommand(`${fullCommand} ~`)
            }
            addCommand(`${fullCommand} ~ ${dimsSuggest}`)
            addCommand(`${fullCommand} ${dimsSuggest} ~`)
            if (!dims) {
                addCommand(`${fullCommand} /`)
            }
            addCommand(`${fullCommand} / ${dimsSuggest}`)
            addCommand(`${fullCommand} ${dimsSuggest} /`)
            if (!dims) {
                addCommand(`${fullCommand} ${downloadPath()}`)
            }
            addCommand(`${fullCommand} ${downloadPath()} ${dimsSuggest}`)
            addCommand(`${fullCommand} ${dimsSuggest} ${downloadPath()}`)
        }
    }
    updateScreenshotHighlight()
    // Command: set
    const {settingsWithDefaults, suggestionList} = require("./settings")
    if ("set".startsWith(command) && !confirm && !range) {
        if (args.length > 0) {
            for (const c of suggestionList().filter(
                s => s.startsWith(args.at(-1) ?? "")).map(s => `${command} ${
                args.slice(0, -1).join(" ")} ${s}`.replace(/ +/g, " "))) {
                addCommand(c)
            }
        } else {
            for (const c of suggestionList().map(s => `${command} ${s}`)) {
                addCommand(c)
            }
        }
    }
    // Command: source
    if ("source".startsWith(command) && !confirm && args.length < 2 && !range) {
        let location = expandPath(search.replace("source ", "") || "")
        if (location.startsWith("\"") && location.endsWith("\"")) {
            location = location.slice(1, -1)
        }
        if (isAbsolutePath(location)) {
            for (const l of suggestFiles(location)) {
                addCommand(`source ${l.path}`)
            }
        }
    }
    // Command: write
    if ("write".startsWith(command) && !confirm && args.length < 3) {
        let [path = "", type = ""] = args
        if (!["html", "mhtml"].includes(type)
            && ["mhtml", "html"].some(h => h.startsWith(path))) {
            [type = "", path = ""] = args
        }
        path = expandPath(path)
        let typeSuggest = "html"
        if (type.startsWith("m")) {
            typeSuggest = "mhtml"
        }
        if (!path && !range) {
            if (type) {
                if (args[0] === type) {
                    addCommand(`write ${typeSuggest}`)
                    addCommand(`write ${typeSuggest} ~`)
                    addCommand(`write ${typeSuggest} /`)
                    addCommand(`write ${typeSuggest} ${downloadPath()}`)
                } else {
                    addCommand(`write ~ ${typeSuggest}`)
                    addCommand(`write / ${typeSuggest}`)
                    addCommand(`write ${downloadPath()} ${typeSuggest}`)
                }
            } else {
                addCommand(`write`.trim())
                addCommand(`write ~`.trim())
                addCommand(`write ~ html`.trim())
                addCommand(`write html ~`.trim())
                addCommand(`write ~ mhtml`.trim())
                addCommand(`write mhtml ~`.trim())
                addCommand(`write /`.trim())
                addCommand(`write / html`.trim())
                addCommand(`write html /`.trim())
                addCommand(`write / mhtml`.trim())
                addCommand(`write mhtml /`.trim())
                addCommand(`write ${downloadPath()}`.trim())
                addCommand(`write ${downloadPath()} html`.trim())
                addCommand(`write html ${downloadPath()}`.trim())
                addCommand(`write ${downloadPath()} mhtml`.trim())
                addCommand(`write mhtml ${downloadPath()}`.trim())
            }
        }
        if ((path || search.endsWith(" ")) && !range) {
            if (!isAbsolutePath(path)) {
                path = joinPath(downloadPath(), path)
            }
            const fileSuggestions = suggestFiles(path)
            for (const l of fileSuggestions) {
                let loc = l.path
                if (l.path.includes(" ")) {
                    loc = `"${loc}"`
                }
                if (type) {
                    if (args[0] === type) {
                        addCommand(`write ${typeSuggest} ${loc}`)
                    } else {
                        addCommand(`write ${loc} ${typeSuggest}`)
                    }
                } else {
                    addCommand(`write ${loc}`)
                    addCommand(`write ${loc} html`)
                    addCommand(`write ${loc} mhtml`)
                    addCommand(`write html ${loc}`)
                    addCommand(`write mtml ${loc}`)
                }
            }
            if (fileSuggestions.length === 0) {
                if (type && args[0] === type) {
                    addCommand(`write ${typeSuggest} ${path}`)
                } else if (type) {
                    addCommand(`write ${path} ${typeSuggest}`)
                } else {
                    addCommand(`write ${path}`)
                    addCommand(`write ${path} html`)
                    addCommand(`write ${path} mhtml`)
                }
            }
        }
        if (range) {
            if (type) {
                addCommand(`${range}write ${typeSuggest}`)
            } else {
                addCommand(`${range}write`)
                addCommand(`${range}write html`)
                addCommand(`${range}write mhtml`)
            }
            const tabs = listTabs()
            const indexes = rangeToTabIdxs("user", range, true)
            const cmds = indexes.tabs.map(num => {
                const tab = tabs.at(num)
                if (!tab) {
                    return null
                }
                const index = tabs.indexOf(tab)
                return {
                    "command": `${index}write ${typeSuggest}`.trim(),
                    "icon": pageForTab(tab)?.getAttribute("src") ?? "",
                    "title": tab.querySelector("span")?.textContent ?? "",
                    "url": pageForTab(tab)?.getAttribute("src") ?? ""
                }
            }).filter(Boolean)
            for (const c of cmds) {
                addCommand(c.command, c.title, c.url, c.icon, true)
            }
        }
    }
    // Command: mkviebrc
    if ("mkviebrc full".startsWith(search) && !range) {
        addCommand("mkviebrc full")
    }
    // Command: devtools
    if ("devtools".startsWith(command)
    && !confirm && args.length < 2 && !range) {
        for (const option of validOptions.devtoolsposition) {
            if (!args[0] || option.startsWith(args[0])) {
                addCommand(`devtools ${option}`)
            }
        }
    }
    // Command: colorscheme
    if ("colorscheme".startsWith(command) && !range) {
        if (args.length > 1 || confirm) {
            return
        }
        /** @type {{[theme: string]: string}} */
        const themes = {}
        for (const part of listDir(joinPath(getAppRootDir(), "colors")) ?? []) {
            themes[part.replace(/\.css$/g, "")] = "built-in"
        }
        const customDirs = [
            joinPath(appData(), "colors"),
            expandPath("~/.vieb/colors")
        ]
        for (const dir of customDirs) {
            for (const part of listDir(dir)
                ?.filter(p => p.endsWith(".css")) ?? []) {
                const location = joinPath(dir, part)
                if (part === "default.css" || !readFile(location)) {
                    continue
                }
                themes[part.replace(/\.css$/g, "")] = location
            }
        }
        for (const t of Object.keys(themes)) {
            if (t.startsWith(args[0] || "")) {
                addCommand(`colorscheme ${t}`, themes[t])
            }
        }
    }
    // Command: command and delcommand
    for (const custom of ["command", "command!", "delcommand"]) {
        if (custom.startsWith(command)
        && (custom.endsWith("!") || !confirm) && !range) {
            for (const cmd of customCommandsAsCommandList().split("\n")
                .filter(c => c.split(" ")[0] === "command")
                .map(c => c.split(" ")[1])
                .filter(c => !args[0] || c.startsWith(args[0]))) {
                addCommand(`${custom} ${cmd}`)
            }
        }
    }
    // Command: help
    if ("help".startsWith(command) && !range) {
        const {
            listMappingsAsCommandList, listSupportedActions
        } = require("./input")
        const sections = [
            "intro",
            "commands",
            "settings",
            "actions",
            "commandsyntax",
            "ranges",
            "settingcommands",
            "specialpages",
            "mappings",
            "key-codes",
            "<>",
            "any",
            "customcommands",
            "use",
            "splits",
            "lastusedtab",
            "quickmarks",
            "viebrc",
            "examples",
            "datafolder",
            "erwic",
            "modes",
            "normal",
            "command",
            "explore",
            "search",
            "insert",
            "follow",
            "scrolling",
            "navigation",
            "url-modifications",
            "splitting",
            "pointer",
            "visual",
            "link-related",
            "media-related",
            "menu",
            "quickmarking",
            "license",
            "mentions",
            "boolean",
            "number",
            "string",
            "enum",
            "array",
            "object",
            "interval",
            ...commandList(false).map(c => `:${c}`),
            ...Object.values(settingsWithDefaults()).map(s => s.name),
            ...listSupportedActions(),
            ...listMappingsAsCommandList("user", null, true).split("\n")
                .map(m => m.split(" ")[1])
        ]
        const mapCommandString = listMappingsAsCommandList("user", null, true)
        for (const map of mapCommandString.split("\n")) {
            const mode = map.split(" ")[0].replace(/(nore)?map$/g, "")
            const [, keys] = map.split(" ")
            if (mode) {
                sections.push(`${mode}_${keys}`)
            } else {
                for (const m of "nicsefpvm") {
                    sections.push(`${m}_${keys}`)
                }
            }
        }
        const simpleSearch = args.join(" ").replace(/^#?:?/, "")
            .replace(/!$/, "").replace(/-/g, "").toLowerCase().trim()
            .replace(/^a\w*\./, "").replace(/^p\w*\./, "p.")
        for (const section of sections.filter(s => {
            const simpleSection = s.replace(/^#?:?/, "")
                .replace(/!$/, "").replace(/-/g, "").toLowerCase().trim()
            return `${command} ${simpleSection.replace(/^pointer\./, "p.")}`
                .startsWith(`${command} ${simpleSearch}`.trim())
            || `${command} ${simpleSection}`.startsWith(
                `${command} ${simpleSearch}`.trim())
        })) { addCommand(`help${confirmChar} ${section}`) }
    }
    // Command: translatepage
    if ("translatepage".startsWith(command)
    && !confirm && args.length < 2 && !range) {
        for (const option of validOptions.translatelang) {
            if (!args[0] || option.startsWith(args[0])) {
                addCommand(`translatepage ${option}`)
            }
        }
    }
    // Command: buffer, hide, Vexplore, Sexplore, split, vsplit etc.
    for (const bufferCommand of [
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
    ]) {
        if (bufferCommand.startsWith(command)) {
            const acceptsConfirm = new Set(["close", "mute", "pin"])
            if (!acceptsConfirm.has(bufferCommand) && confirm) {
                continue
            }
            if (range) {
                if (!confirm || args.length === 0) {
                    addCommand(`${range}${bufferCommand}${confirmChar}`)
                    if (acceptsConfirm.has(bufferCommand) && !confirm) {
                        addCommand(`${range}${bufferCommand}!`)
                    }
                }
                let a = ""
                if (["mute", "pin"].includes(bufferCommand) && confirm) {
                    addCommand(`${range}${bufferCommand}${confirmChar} true`)
                    addCommand(`${range}${bufferCommand}${confirmChar} false`)
                    a = " true"
                    if (args.join("").trim().startsWith("f")) {
                        a = " false"
                    }
                } else if (args.length > 0) {
                    continue
                }
                const tabs = listTabs()
                const indexes = rangeToTabIdxs("user", range, true)
                const cmds = indexes.tabs.map(num => {
                    const tab = tabs.at(num)
                    if (!tab) {
                        return null
                    }
                    const index = tabs.indexOf(tab)
                    return {
                        "command": `${index}${bufferCommand}${confirmChar}${a}`,
                        "icon": pageForTab(tab)?.getAttribute("src") ?? "",
                        "title": tab.querySelector("span")?.textContent ?? "",
                        "url": pageForTab(tab)?.getAttribute("src") ?? ""
                    }
                }).filter(Boolean)
                for (const c of cmds) {
                    addCommand(c.command, c.title, c.url, c.icon, true)
                }
                continue
            }
            if (["mute", "pin"].includes(bufferCommand) && confirm) {
                addCommand(`${bufferCommand}${confirmChar} true`)
                addCommand(`${bufferCommand}${confirmChar} false`)
                continue
            }
            const {allTabsForBufferArg} = require("./command")
            const tabs = listTabs()
            for (const t of allTabsForBufferArg(args).map(b => {
                if (!b?.tab) {
                    return null
                }
                const index = tabs.indexOf(b.tab)
                return {
                    "command": `${bufferCommand}${confirmChar} ${index}`,
                    "icon": b.url,
                    "title": b.title,
                    "url": b.url
                }
            })) {
                if (t) {
                    addCommand(t.command, t.title, t.url, t.icon)
                }
            }
        }
    }
    // Command: clear
    if ("clear".startsWith(command) && !range && !confirm && args.length < 3) {
        const argStr = `clear ${search.split(" ").slice(1).join(" ")}`
        const clearSuggestionList = [
            "clear history all",
            "clear history 15minutes",
            "clear history 1hour",
            "clear history 1day",
            "clear history 7days",
            "clear history 1month",
            "clear history 1year",
            "clear history last15minutes",
            "clear history last1hour",
            "clear history last1day",
            "clear history last7days",
            "clear history last1month",
            "clear history last1year"
        ]
        for (const suggest of clearSuggestionList) {
            if (suggest.startsWith(argStr)) {
                addCommand(suggest)
            }
        }
    }
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
