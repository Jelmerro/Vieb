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
    expandPath,
    getAppRootDir,
    isAbsolutePath,
    isDir,
    joinPath,
    listDir,
    pathExists,
    readFile,
    urlToString
} = require("../util")
const {
    currentMode,
    currentPage,
    downloadPath,
    getUrl,
    isUrl,
    listTabs,
    pageForTab,
    searchword,
    stringToUrl,
    updateScreenshotHighlight
} = require("./common")
const {getSetting} = require("./settings")

/** @type {string[]} */
let suggestions = []
let originalValue = ""

/**
 * Update the explore border colors based on the input type.
 * @param {string|null} searchStr
 */
const updateColors = async(searchStr = null) => {
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
        } else if (await isUrl(search.trim())) {
            urlElement.className = "url"
        } else if (isAbsolutePath(local) && pathExists(local)) {
            urlElement.className = "file"
        } else {
            const match = searchword(search.trim())
            if (match.word) {
                urlElement.className = "searchwords"
            } else {
                urlElement.className = "search"
            }
        }
    }
}

/**
 * Set the url value correctly formatted and update border colors.
 * @param {string} url
 */
const setUrlValue = async url => {
    const urlInput = getUrl()
    if (!urlInput) {
        return
    }
    if (currentMode() === "explore") {
        urlInput.value = await urlToString(url)
    } else {
        urlInput.value = url
    }
    await updateColors()
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
const previous = async() => {
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
        await setUrlValue(originalValue)
        return
    }
    list[id - 1].className = "selected"
    list[id - 1].scrollIntoView({"block": "center"})
    await setUrlValue(suggestions[id - 1])
    const index = suggestions[id - 1].indexOf("%s")
    if (index !== -1) {
        url?.setSelectionRange(index, index + 2)
    }
}

/** Go the previous section in the suggestion list. */
const previousSection = async() => {
    await previous()
    while (!topOfSection()) {
        await previous()
    }
}

/** Select the next suggestion from the list. */
const next = async() => {
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
        await setUrlValue(originalValue)
        return
    }
    list[id + 1].className = "selected"
    list[id + 1].scrollIntoView({"block": "center"})
    await setUrlValue(suggestions[id + 1])
    const index = suggestions[id + 1].indexOf("%s")
    if (index !== -1) {
        url?.setSelectionRange(index, index + 2)
    }
}

/** Go the next section in the suggestion list. */
const nextSection = async() => {
    await next()
    while (!topOfSection()) {
        await next()
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
const suggestFiles = async loc => {
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
            const dirfiles = await listDir(dirname(location))
            matching = dirfiles.map(
                p => locationToSuggestion(dirname(location), p))
            matching = matching.filter(p => {
                if (!basePath(p.url).startsWith(basePath(location))) {
                    return false
                }
                return basePath(p.url) !== basePath(location)
            })
        }
        const indirfiles = await listDir(location)
        const inDir = indirfiles.map(p => locationToSuggestion(location, p))
        return [...matching, ...inDir]
    }
    return []
}

/**
 * Add a suggestion to the explore mode suggestions.
 * @param {{title: string, type?: string, url: string, icon?: string}} explore
 */
const addExplore = async explore => {
    if (suggestions.includes(explore.url)) {
        return
    }
    suggestions.push(explore.url)
    const element = document.createElement("div")
    element.className = "no-focus-reset"
    element.addEventListener("mouseup", async e => {
        e.preventDefault()
        const {getMouseConf} = require("./settings")
        if (e.button === 2) {
            if (getMouseConf("suggestselect") && ["both", "explore"]
                .includes(getSetting("menusuggest"))) {
                const {linkMenu} = require("./contextmenu")
                linkMenu("user", {"link": explore.url, "x": e.x, "y": e.y})
            }
        } else if (getMouseConf("menusuggest")) {
            const {setMode} = require("./modes")
            await setMode("normal")
            const {clear} = require("./contextmenu")
            clear()
            if (e.button === 0) {
                const {navigateTo} = require("./tabs")
                await navigateTo("user", explore.url)
            }
            if (e.button === 1) {
                const {addTab} = require("./tabs")
                await addTab({"src": "user", "url": explore.url})
            }
        }
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
    url.textContent = await urlToString(explore.url)
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
const suggestExplore = async search => {
    emptySuggestions()
    await updateColors(search)
    if (!search.trim()) {
        return
    }
    const {suggestHist} = require("./history")
    const suggestorder = getSetting("suggestorder")
    for (const suggest of suggestorder.filter(Boolean)) {
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
            await suggestHist(search, order, count)
        }
        if (type === "file") {
            const suggestedFiles = await suggestFiles(search)
            for (const f of suggestedFiles.slice(0, count)) {
                await addExplore(f)
            }
        }
        if (type === "searchword") {
            if (!order) {
                order = "alpha"
            }
            const searchwords = getSetting("searchwords")
            const words = Object.entries(searchwords).map(([title, url]) => {
                const match = searchword(search)
                let filledUrl = match.url
                if (filledUrl === search) {
                    filledUrl = url
                }
                return {title, "type": "searchword", "url": filledUrl}
            })
            if (order === "alpha") {
                words.sort((a, b) => a.title.localeCompare(b.title))
            }
            const searchStr = search.split(" ").find(Boolean)?.trim() ?? ""
            for (const word of words.filter(
                s => s.title.startsWith(searchStr))) {
                await addExplore(word)
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
const addCommand = async(
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
    element.addEventListener("mouseup", async e => {
        e.preventDefault()
        const {getMouseConf} = require("./settings")
        if (e.button === 2) {
            if (getMouseConf("suggestselect") && ["both", "command"]
                .includes(getSetting("menusuggest"))) {
                const {commandMenu} = require("./contextmenu")
                commandMenu("user", {command, "x": e.x, "y": e.y})
            }
        } else if (getMouseConf("menusuggest")) {
            const {setMode} = require("./modes")
            await setMode("normal")
            const {execute} = require("./command")
            await execute(command, {"src": "user"})
            const {clear} = require("./contextmenu")
            clear()
        }
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
        urlElement.textContent = await urlToString(url)
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
const suggestCommand = async searchStr => {
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
        await addCommand(cmd)
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
        const pageHeight = Number(currentPage()?.style.height.split(/[.px]/g, 1)[0])
        const pageWidth = Number(currentPage()?.style.width.split(/[.px]/g, 1)[0])
        const rect = {
            "height": Number(dims?.split(",", 2)[1] ?? pageHeight),
            "width": Number(dims?.split(",", 1)[0] ?? pageWidth),
            "x": Number(dims?.split(",", 3)[2] ?? 0),
            "y": Number(dims?.split(",", 4)[3] ?? 0)
        }
        const dimsSuggest = `${rect.width},${rect.height},${rect.x},${rect.y}`
        location = expandPath(location || "")
        if (location && !isAbsolutePath(location)) {
            location = joinPath(await downloadPath(), location)
        }
        if (fullCommand === "screencopy") {
            if (!dims) {
                await addCommand(`${fullCommand}`)
            }
            await addCommand(`${fullCommand} ${dimsSuggest}`)
        } else if (location) {
            const fileSuggestions = await suggestFiles(location)
            for (const l of fileSuggestions) {
                let loc = l.path
                if (l.path.includes(" ")) {
                    loc = `"${loc}"`
                }
                if (dimsFirst) {
                    await addCommand(`${fullCommand} ${dimsSuggest} ${loc}`)
                } else if (dims) {
                    await addCommand(`${fullCommand} ${loc} ${dimsSuggest}`)
                } else {
                    await addCommand(`${fullCommand} ${loc}`)
                    await addCommand(`${fullCommand} ${loc} ${dimsSuggest}`)
                }
            }
            if (fileSuggestions.length === 0) {
                if (dimsFirst) {
                    await addCommand(
                        `${fullCommand} ${dimsSuggest} ${location}`)
                } else if (dims) {
                    await addCommand(
                        `${fullCommand} ${location} ${dimsSuggest}`)
                } else {
                    await addCommand(`${fullCommand} ${location}`)
                    await addCommand(
                        `${fullCommand} ${location} ${dimsSuggest}`)
                }
            }
        } else {
            if (!dims) {
                await addCommand(`${fullCommand} ~`)
            }
            await addCommand(`${fullCommand} ~ ${dimsSuggest}`)
            await addCommand(`${fullCommand} ${dimsSuggest} ~`)
            if (!dims) {
                await addCommand(`${fullCommand} /`)
            }
            await addCommand(`${fullCommand} / ${dimsSuggest}`)
            await addCommand(`${fullCommand} ${dimsSuggest} /`)
            if (!dims) {
                await addCommand(`${fullCommand} ${await downloadPath()}`)
            }
            await addCommand(
                `${fullCommand} ${await downloadPath()} ${dimsSuggest}`)
            await addCommand(
                `${fullCommand} ${dimsSuggest} ${await downloadPath()}`)
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
                await addCommand(c)
            }
        } else {
            for (const c of suggestionList().map(s => `${command} ${s}`)) {
                await addCommand(c)
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
            for (const l of await suggestFiles(location)) {
                await addCommand(`source ${l.path}`)
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
                    await addCommand(`write ${typeSuggest}`)
                    await addCommand(`write ${typeSuggest} ~`)
                    await addCommand(`write ${typeSuggest} /`)
                    await addCommand(
                        `write ${typeSuggest} ${await downloadPath()}`)
                } else {
                    await addCommand(`write ~ ${typeSuggest}`)
                    await addCommand(`write / ${typeSuggest}`)
                    await addCommand(
                        `write ${await downloadPath()} ${typeSuggest}`)
                }
            } else {
                await addCommand(`write`)
                await addCommand(`write ~`)
                await addCommand(`write ~ html`)
                await addCommand(`write html ~`)
                await addCommand(`write ~ mhtml`)
                await addCommand(`write mhtml ~`)
                await addCommand(`write /`)
                await addCommand(`write / html`)
                await addCommand(`write html /`)
                await addCommand(`write / mhtml`)
                await addCommand(`write mhtml /`)
                await addCommand(`write ${await downloadPath()}`.trim())
                await addCommand(`write ${await downloadPath()} html`)
                await addCommand(`write html ${await downloadPath()}`.trim())
                await addCommand(`write ${await downloadPath()} mhtml`)
                await addCommand(`write mhtml ${await downloadPath()}`.trim())
            }
        }
        if ((path || search.endsWith(" ")) && !range) {
            if (!isAbsolutePath(path)) {
                path = joinPath(await downloadPath(), path)
            }
            const fileSuggestions = await suggestFiles(path)
            for (const l of fileSuggestions) {
                let loc = l.path
                if (l.path.includes(" ")) {
                    loc = `"${loc}"`
                }
                if (type && args[0] === type) {
                    await addCommand(`write ${typeSuggest} ${loc}`)
                } else if (type) {
                    await addCommand(`write ${loc} ${typeSuggest}`)
                } else {
                    await addCommand(`write ${loc}`)
                    await addCommand(`write ${loc} html`)
                    await addCommand(`write ${loc} mhtml`)
                    await addCommand(`write html ${loc}`)
                    await addCommand(`write mtml ${loc}`)
                }
            }
            if (fileSuggestions.length === 0) {
                if (type && args[0] === type) {
                    await addCommand(`write ${typeSuggest} ${path}`)
                } else if (type) {
                    await addCommand(`write ${path} ${typeSuggest}`)
                } else {
                    await addCommand(`write ${path}`)
                    await addCommand(`write ${path} html`)
                    await addCommand(`write ${path} mhtml`)
                }
            }
        }
        if (range) {
            if (type) {
                await addCommand(`${range}write ${typeSuggest}`)
            } else {
                await addCommand(`${range}write`)
                await addCommand(`${range}write html`)
                await addCommand(`${range}write mhtml`)
            }
            const tabs = listTabs()
            const indexes = await rangeToTabIdxs("user", range, true)
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
                await addCommand(c.command, c.title, c.url, c.icon, true)
            }
        }
    }
    // Command: mkviebrc
    if ("mkviebrc full".startsWith(search) && !range) {
        await addCommand("mkviebrc full")
    }
    // Command: devtools
    if ("devtools".startsWith(command)
    && !confirm && args.length < 2 && !range) {
        for (const option of validOptions.devtoolsposition) {
            if (!args[0] || option.startsWith(args[0])) {
                await addCommand(`devtools ${option}`)
            }
        }
    }
    // Command: colorscheme
    if ("colorscheme".startsWith(command) && !range) {
        if (args.length > 1) {
            return
        }
        /** @type {{[theme: string]: string}} */
        const themes = {}
        const cssfiles = await listDir(joinPath(getAppRootDir(), "colors"))
        for (const part of cssfiles) {
            themes[part.replace(/\.css$/g, "")] = "built-in"
        }
        const customDirs = [
            joinPath(await appData(), "colors"),
            expandPath("~/.vieb/colors")
        ]
        for (const dir of customDirs) {
            const dirfiles = await listDir(dir)
            for (const part of dirfiles.filter(p => p.endsWith(".css"))) {
                const location = joinPath(dir, part)
                if (part === "default.css" || !await readFile(location)) {
                    continue
                }
                themes[part.replace(/\.css$/g, "")] = location
            }
        }
        for (const [themeName, themePath] of Object.entries(themes)) {
            if (themeName.startsWith(args[0] || "")) {
                await addCommand(`colorscheme${confirmChar} ${themeName}`, themePath)
            }
        }
    }
    // Command: command and delcommand
    for (const custom of ["command", "command!", "delcommand"]) {
        if (custom.startsWith(command)
        && (custom.endsWith("!") || !confirm) && !range) {
            for (const cmd of customCommandsAsCommandList().split("\n")
                .filter(c => c.split(" ", 1)[0] === "command")
                .map(c => c.split(" ", 2)[1])
                .filter(c => !args[0] || c.startsWith(args[0]))) {
                await addCommand(`${custom} ${cmd}`)
            }
        }
    }
    // Command: help
    if ("help".startsWith(command) && !range) {
        const {
            listMappingsAsCommandList, listSupportedActions
        } = require("./input")
        const mapCommandString = await listMappingsAsCommandList(
            "user", null, true)
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
            ...mapCommandString.split("\n").map(m => m.split(" ", 2)[1])
        ]
        for (const map of mapCommandString.split("\n")) {
            const mode = map.split(" ", 1)[0].replace(/(nore)?map$/g, "")
            const [, keys] = map.split(" ", 2)
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
        })) {
            await addCommand(`help${confirmChar} ${section}`)
        }
    }
    // Command: translatepage
    if ("translatepage".startsWith(command)
    && !confirm && args.length < 2 && !range) {
        for (const option of validOptions.translatelang) {
            if (!args[0] || option.startsWith(args[0])) {
                await addCommand(`translatepage ${option}`)
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
        if (!bufferCommand.startsWith(command)) {
            continue
        }
        const acceptsConfirm = new Set(["close", "mute", "pin"])
        if (!acceptsConfirm.has(bufferCommand) && confirm) {
            continue
        }
        if (range) {
            if (!confirm || args.length === 0) {
                await addCommand(`${range}${bufferCommand}${confirmChar}`)
                if (acceptsConfirm.has(bufferCommand) && !confirm) {
                    await addCommand(`${range}${bufferCommand}!`)
                }
            }
            let a = ""
            if (["mute", "pin"].includes(bufferCommand) && confirm) {
                await addCommand(`${range}${bufferCommand}${confirmChar} true`)
                await addCommand(`${range}${bufferCommand}${confirmChar} false`)
                a = " true"
                if (args.join("").trimStart().startsWith("f")) {
                    a = " false"
                }
            } else if (args.length > 0) {
                continue
            }
            const tabs = listTabs()
            const indexes = await rangeToTabIdxs("user", range, true)
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
                await addCommand(c.command, c.title, c.url, c.icon, true)
            }
            continue
        }
        if (["mute", "pin"].includes(bufferCommand) && confirm) {
            await addCommand(`${bufferCommand}${confirmChar} true`)
            await addCommand(`${bufferCommand}${confirmChar} false`)
            continue
        }
        const {allTabsForBufferArg} = require("./command")
        const tabs = listTabs()
        const relevantTabs = await allTabsForBufferArg(args)
        for (const t of relevantTabs.map(b => {
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
                await addCommand(t.command, t.title, t.url, t.icon)
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
                await addCommand(suggest)
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
