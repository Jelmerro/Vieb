/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2021 Jelmer van Arnhem
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

const {ipcRenderer} = require("electron")
const {
    specialChars,
    joinPath,
    notify,
    isUrl,
    appData,
    expandPath,
    isFile,
    isDir,
    readFile,
    writeFile,
    writeJSON,
    pathExists,
    pathToSpecialPageName,
    firefoxUseragent,
    title,
    appName,
    appConfigSettings
} = require("../util")
const {
    listTabs,
    listPages,
    currentTab,
    currentPage,
    tabOrPageMatching,
    updateGuiVisibility
} = require("./common")

const defaultSettings = {
    "adblocker": "static",
    "cache": "clearonquit",
    "clearcookiesonquit": false,
    "cleardownloadsoncompleted": false,
    "cleardownloadsonquit": false,
    "clearhistoryonquit": false,
    "clearlocalstorageonquit": false,
    "closablepinnedtabs": false,
    "commandhist": "useronly",
    "containercolors": "temp\\d+~#ff0",
    "containerkeeponreopen": true,
    "containernewtab": "s:usecurrent",
    "containershowname": "automatic",
    "containersplitpage": "s:usecurrent",
    "containerstartuppage": "main",
    "countlimit": 100,
    "devtoolsposition": "window",
    "downloadmethod": "automatic",
    "downloadpath": "~/Downloads/",
    "explorehist": true,
    "externalcommand": "",
    "favicons": "session",
    "favoritepages": "",
    "firefoxmode": "never",
    "follownewtabswitch": true,
    "fontsize": 14,
    "guifullscreennavbar": "oninput",
    "guifullscreentabbar": "onupdate",
    "guihidetimeout": 2000,
    "guinavbar": "always",
    "guitabbar": "always",
    "ignorecase": true,
    "incsearch": true,
    "keeprecentlyclosed": true,
    "mapsuggest": 50,
    "mapsuggestposition": "topright",
    "maxmapdepth": 10,
    "menupage": "elementasneeded",
    "menuvieb": "both",
    "mintabwidth": 28,
    "mouse": true,
    "mousefocus": false,
    "mousenewtabswitch": true,
    "nativenotification": "never",
    "notificationduration": 6000,
    "notificationforpermissions": false,
    "notificationposition": "bottomright",
    "permissioncamera": "block",
    "permissionclipboardread": "block",
    "permissionclosepage": "allow",
    "permissiondisplaycapture": "block",
    "permissionfullscreen": "allow",
    "permissiongeolocation": "block",
    "permissionmediadevices": "block",
    "permissionmicrophone": "block",
    "permissionmidi": "block",
    "permissionmidisysex": "block",
    "permissionnotifications": "block",
    "permissionopenexternal": "ask",
    "permissionpersistentstorage": "block",
    "permissionpointerlock": "block",
    "permissionsallowed": "",
    "permissionsasked": "",
    "permissionsblocked": "",
    "permissionsensors": "block",
    "permissionunknown": "block",
    "quitonlasttabclose": false,
    "redirects": "https?://(www\\.)?google\\.com(\\.\\w+)?/amp/s/amp\\.(.*)"
        + "~https://$3",
    "redirecttohttp": false,
    "requesttimeout": 20000,
    "restoretabs": true,
    "restorewindowmaximize": true,
    "restorewindowposition": true,
    "restorewindowsize": true,
    "search": "https://duckduckgo.com/?kae=d&kav=1&ko=1&q=%s&ia=web",
    "searchwords": "",
    "showcmd": true,
    "spell": true,
    "spelllang": "system",
    "splitbelow": false,
    "splitright": false,
    "startuppages": "",
    "storenewvisits": "pages",
    "suggestcommands": 9000000000000000,
    "suggestorder": "history,searchword,file",
    "suggesttopsites": 10,
    "suspendonrestore": "regular",
    "suspendtimeout": 0,
    "tabclosefocusright": false,
    "tabcycle": true,
    "tabnexttocurrent": true,
    "taboverflow": "scroll",
    "tabreopenposition": "right",
    "timeout": true,
    "timeoutlen": 1000,
    "vimcommand": "gvim",
    "windowtitle": "simple"
}
let allSettings = {}
const freeText = ["downloadpath", "externalcommand", "search", "vimcommand"]
const listLike = [
    "containercolors",
    "favoritepages",
    "permissionsallowed",
    "permissionsasked",
    "permissionsblocked",
    "redirects",
    "searchwords",
    "spelllang",
    "startuppages",
    "storenewvisits",
    "suggestorder"
]
const validOptions = {
    "adblocker": ["off", "static", "update", "custom"],
    "cache": ["none", "clearonquit", "full"],
    "commandhist": ["all", "useronly", "none"],
    "containershowname": ["automatic", "always", "never"],
    "devtoolsposition": ["window", "split", "vsplit", "tab"],
    "downloadmethod": ["automatic", "confirm", "ask", "block"],
    "favicons": [
        "disabled", "nocache", "session", "1day", "5day", "30day", "forever"
    ],
    "firefoxmode": ["always", "google", "never"],
    "guifullscreennavbar": ["always", "onupdate", "oninput", "never"],
    "guifullscreentabbar": ["always", "onupdate", "never"],
    "guinavbar": ["always", "onupdate", "oninput", "never"],
    "guitabbar": ["always", "onupdate", "never"],
    "mapsuggestposition": ["bottomright", "bottomleft", "topright", "topleft"],
    "menupage": ["always", "globalasneeded", "elementasneeded", "never"],
    "menuvieb": ["both", "navbar", "tabbar", "never"],
    "nativenotification": ["always", "smallonly", "never"],
    "notificationposition": [
        "bottomright", "bottomleft", "topright", "topleft"
    ],
    "permissioncamera": ["block", "ask", "allow"],
    "permissionclipboardread": ["block", "ask", "allow"],
    "permissionclosepage": ["block", "allow"],
    "permissiondisplaycapture": ["block", "ask"],
    "permissionfullscreen": ["block", "ask", "allow"],
    "permissiongeolocation": ["block", "ask", "allow"],
    "permissionmediadevices": ["block", "ask", "allow", "allowfull"],
    "permissionmicrophone": ["block", "ask", "allow"],
    "permissionmidi": ["block", "ask", "allow"],
    "permissionmidisysex": ["block", "ask", "allow"],
    "permissionnotifications": ["block", "ask", "allow"],
    "permissionopenexternal": ["block", "ask", "allow"],
    "permissionpersistentstorage": ["block", "ask", "allow"],
    "permissionpointerlock": ["block", "ask", "allow"],
    "permissionsensors": ["block", "ask", "allow"],
    "permissionunknown": ["block", "ask", "allow"],
    "suspendonrestore": ["all", "regular", "none"],
    "taboverflow": ["hidden", "scroll", "wrap"],
    "tabreopenposition": ["left", "right", "previous"],
    "windowtitle": ["simple", "title", "url", "full"]
}
const numberRanges = {
    "countlimit": [0, 10000],
    "fontsize": [8, 30],
    "guihidetimeout": [0, 9000000000000000],
    "mapsuggest": [0, 9000000000000000],
    "maxmapdepth": [1, 40],
    "mintabwidth": [0, 9000000000000000],
    "notificationduration": [0, 9000000000000000],
    "requesttimeout": [0, 9000000000000000],
    "suggestcommands": [0, 9000000000000000],
    "suggesttopsites": [0, 9000000000000000],
    "suspendtimeout": [0, 9000000000000000],
    "timeoutlen": [0, 9000000000000000]
}
let customStyling = ""
const downloadSettings = [
    "downloadmethod",
    "downloadpath",
    "cleardownloadsonquit",
    "cleardownloadsoncompleted"
]
const containerSettings = [
    "containernewtab", "containersplitpage", "containerstartuppage"
]
let spelllangs = []

const init = () => {
    loadFromDisk()
    updateDownloadSettings()
    updatePermissionSettings()
    updateWebviewSettings()
    ipcRenderer.invoke("list-spelllangs").then(langs => {
        spelllangs = langs || []
        spelllangs.push("system")
        if (!isValidSetting("spelllang", allSettings.spelllang)) {
            set("spelllang", "system")
        }
        ipcRenderer.send("set-spelllang", allSettings.spelllang)
    })
    ipcRenderer.on("set-permission", (_, name, value) => set(name, value))
    ipcRenderer.on("notify", (_, message, type, clickAction) => {
        notify(message, type, clickAction)
    })
    ipcRenderer.send("create-session", `persist:main`,
        allSettings.adblocker, allSettings.cache !== "none")
}

const checkOption = (setting, value) => {
    const optionList = JSON.parse(JSON.stringify(validOptions[setting]))
    if (optionList) {
        const valid = optionList.includes(value)
        if (!valid) {
            const lastOption = optionList.pop()
            const text = `'${optionList.join("', '")}' or '${lastOption}'`
            notify(`The value of setting '${setting}' can only be one of:`
                + ` ${text}`, "warn")
        }
        return valid
    }
    return false
}

const checkNumber = (setting, value) => {
    const numberRange = numberRanges[setting]
    if (numberRange[0] > value || numberRange[1] < value) {
        notify(`The value of setting '${setting}' must be between `
            + `${numberRange[0]} and ${numberRange[1]}`, "warn")
        return false
    }
    return true
}

const checkOther = (setting, value) => {
    // Special cases
    if (setting === "search") {
        let baseUrl = value
        if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
            baseUrl = baseUrl.replace(/^https?:\/\//g, "")
        }
        if (baseUrl.length === 0 || !baseUrl.includes("%s")) {
            notify(`Invalid search value: ${baseUrl}\n`
                    + "URL must contain a %s parameter, which will be "
                    + "replaced by the search string", "warn")
            return false
        }
        if (!isUrl(baseUrl)) {
            notify("The value of the search setting must be a valid url",
                "warn")
            return false
        }
    }
    if (containerSettings.includes(setting)) {
        const specialNames = ["s:usematching", "s:usecurrent"]
        if (setting !== "containersplitpage") {
            specialNames.push("s:replacematching", "s:replacecurrent")
        }
        if (setting === "containernewtab") {
            specialNames.push("s:external")
        }
        if (value.startsWith("s:")) {
            if (specialNames.includes(value)) {
                return true
            }
            const lastName = specialNames.pop()
            const text = `'${specialNames.join("', '")}' or '${lastName}'`
            notify(
                `Special container name for '${setting}' can only be one of:`
                + ` ${text}`, "warn")
            return false
        }
        const simpleValue = value.replace("%n", "valid").replace(/_/g, "")
        if (simpleValue.match(specialChars)) {
            notify(
                "No special characters besides underscores are allowed in the "
                + `name of a container, invalid ${setting}: ${value}`, "warn")
            return false
        }
    }
    if (setting === "containercolors") {
        for (const colorMatch of value.split(",")) {
            if (!colorMatch.trim()) {
                continue
            }
            if ((colorMatch.match(/~/g) || []).length === 0) {
                notify(`Invalid ${setting} entry: ${colorMatch}\n`
                    + "Entries must have exactly one ~ to separate the "
                    + "name regular expression and color name/hex", "warn")
                return false
            }
            const [match, color] = colorMatch.split("~")
            try {
                RegExp(match)
            } catch (e) {
                notify(
                    `Invalid regular expression in containercolors: ${match}`,
                    "warn")
                return false
            }
            const {style} = document.createElement("div")
            style.color = "white"
            style.color = color
            if (style.color === "white" && color !== "white" || !color) {
                notify("Invalid color, must be a valid color name or hex"
                    + `, not: ${color}`, "warn")
                return false
            }
        }
    }
    if (setting === "downloadpath") {
        const expandedPath = expandPath(value)
        if (!pathExists(expandedPath)) {
            notify("The download path does not exist", "warn")
            return false
        }
        if (!isDir(expandedPath)) {
            notify("The download path is not a directory", "warn")
            return false
        }
    }
    const permissionSettings = [
        "permissionsallowed", "permissionsasked", "permissionsblocked"
    ]
    if (permissionSettings.includes(setting)) {
        for (const override of value.split(",")) {
            if (!override.trim()) {
                continue
            }
            if ((override.match(/~/g) || []).length === 0) {
                notify(`Invalid ${setting} entry: ${override}\n`
                    + "Entries must have at least one ~ to separate the "
                    + "domain regular expression and permission names", "warn")
                return false
            }
            const [match, ...names] = override.split("~")
            try {
                RegExp(match)
            } catch (e) {
                notify(
                    `Invalid regular expression in permission: ${match}`,
                    "warn")
                return false
            }
            for (let name of names) {
                if (!name.startsWith("permission")) {
                    name = `permission${name}`
                }
                const reservedName = permissionSettings.includes(name)
                if (reservedName || !allSettings[name]) {
                    notify(
                        `Invalid name for a permission: ${name}`, "warn")
                    return false
                }
                if (setting.endsWith("allowed") && name.endsWith("capture")) {
                    notify(
                        "Display capture permission can't be allowed, "
                        + "only asked or blocked", "warn")
                    return false
                }
            }
        }
    }
    if (setting === "redirects") {
        for (const redirect of value.split(",")) {
            if (!redirect.trim()) {
                continue
            }
            if ((redirect.match(/~/g) || []).length !== 1) {
                notify(`Invalid redirect entry: ${redirect}\n`
                    + "Entries must have exactly one ~ to separate the "
                    + "regular expression from the replacement", "warn")
                return false
            }
            const [match] = redirect.split("~")
            try {
                RegExp(match)
            } catch (e) {
                notify(
                    `Invalid regular expression in redirect: ${match}`, "warn")
                return false
            }
        }
    }
    if (setting === "searchwords") {
        const knownSearchwords = []
        for (const searchword of value.split(",")) {
            if (!searchword.trim()) {
                continue
            }
            if ((searchword.match(/~/g) || []).length !== 1) {
                notify(`Invalid searchwords entry: ${searchword}\n`
                    + "Entries must have exactly one ~ to separate the "
                    + "searchword from the URL", "warn")
                return false
            }
            const [keyword, url] = searchword.split("~")
            const simpleKeyword = keyword.replace(/_/g, "")
            if (keyword.length === 0 || simpleKeyword.match(specialChars)) {
                notify(`Invalid searchwords entry: ${searchword}\n`
                    + "Searchwords before the ~ must not contain any special "
                    + "characters besides underscores", "warn")
                return false
            }
            if (url.length === 0 || !url.includes("%s")) {
                notify(`Invalid searchwords entry: ${searchword}\n`
                    + "URLs for searchwords must exist and must "
                    + "contain a %s parameter, which will be "
                    + "replaced by the search string", "warn")
                return false
            }
            if (knownSearchwords.includes(keyword)) {
                notify(`Invalid searchwords entry: ${searchword}\n`
                    + `The searchword ${keyword} was already defined. `
                    + "A searchword must be defined only once", "warn")
                return false
            }
            knownSearchwords.push(keyword)
        }
    }
    if (setting === "spelllang" && value !== "") {
        for (const lang of value.split(",")) {
            if (lang && spelllangs.length && !spelllangs.includes(lang)) {
                notify(`Invalid language passed to spelllang: ${lang}`,
                    "warn")
                return false
            }
        }
    }
    if (["favoritepages", "startuppages"].includes(setting)) {
        for (const page of value.split(",")) {
            if (page.trim() && !isUrl(page)) {
                notify(`Invalid URL passed to ${setting}: ${page}`, "warn")
                return false
            }
        }
    }
    if (setting === "storenewvisits") {
        for (const visitType of value.split(",")) {
            if (!["pages", "files", "builtin"].includes(visitType)) {
                notify(`Invalid type of history passed: ${visitType}, `
                    + "must be one of: pages, files or builtin", "warn")
                return false
            }
        }
    }
    if (setting === "suggestorder") {
        return checkSuggestOrder(value)
    }
    return true
}

const checkSuggestOrder = value => {
    for (const suggest of value.split(",")) {
        if (!suggest.trim()) {
            continue
        }
        const parts = (suggest.match(/~/g) || []).length
        if (parts > 2) {
            notify(`Invalid suggestorder entry: ${suggest}\n`
                    + "Entries must have at most two ~ to separate the type "
                    + "from the count and the order (both optional)", "warn")
            return false
        }
        const args = suggest.split("~")
        const type = args.shift()
        if (!["history", "file", "searchword"].includes(type)) {
            notify(`Invalid suggestorder type: ${type}\n`
                    + "Suggestion type must be one of: history, file or "
                    + "searchword", "warn")
            return false
        }
        let hasHadCount = false
        let hasHadOrder = false
        for (const arg of args) {
            if (!arg) {
                notify("Configuration for suggestorder after the type can "
                        + "not be empty", "warn")
                return false
            }
            const potentialCount = Number(arg)
            if (potentialCount > 0 && potentialCount <= 9000000000000000) {
                if (hasHadCount) {
                    notify("Count configuration for a suggestorder entry "
                            + "can only be set once per entry", "warn")
                    return false
                }
                hasHadCount = true
                continue
            }
            const validOrders = []
            if (type === "history") {
                validOrders.push("alpha", "relevance", "date")
            }
            if (type === "file") {
                validOrders.push("alpha")
            }
            if (type === "searchword") {
                validOrders.push("alpha", "setting")
            }
            if (validOrders.includes(arg)) {
                if (hasHadOrder) {
                    notify("Order configuration for a suggestorder entry "
                            + "can only be set once per entry", "warn")
                    return false
                }
                hasHadOrder = true
                continue
            }
            notify(`Order configuration is invalid, supported orders for ${
                type} suggestions are: ${validOrders.join(", ")}`, "warn")
            return false
        }
    }
    return true
}

const isValidSetting = (setting, value) => {
    if (allSettings[setting] === undefined) {
        notify(`The setting '${setting}' doesn't exist`, "warn")
        return false
    }
    const expectedType = typeof allSettings[setting]
    let parsedValue = String(value)
    if (expectedType === "number" && !isNaN(Number(parsedValue))) {
        parsedValue = Number(value)
    }
    if (expectedType === "boolean") {
        if (["true", "false"].includes(parsedValue)) {
            parsedValue = value === "true"
        }
    }
    if (expectedType !== typeof parsedValue) {
        notify(`The value of setting '${setting}' is of an incorrect `
            + `type, expected '${expectedType}' but got `
            + `'${typeof parsedValue}' instead.`, "warn")
        return false
    }
    if (validOptions[setting]) {
        return checkOption(setting, parsedValue)
    }
    if (numberRanges[setting]) {
        return checkNumber(setting, parsedValue)
    }
    return checkOther(setting, parsedValue)
}

const updateContainerSettings = (full = true) => {
    if (full) {
        for (const page of listPages()) {
            const color = allSettings.containercolors.split(",").find(
                c => page.getAttribute("container").match(c.split("~")[0]))
            if (color) {
                [, tabOrPageMatching(page).style.color] = color.split("~")
            } else {
                tabOrPageMatching(page).style.color = null
            }
        }
    }
    const container = currentPage()?.getAttribute("container")
    if (!container) {
        return
    }
    const color = allSettings.containercolors.split(",").find(
        c => container.match(c.split("~")[0]))
    const show = allSettings.containershowname
    if (container === "main" && show === "automatic" || show === "never") {
        document.getElementById("containername").style.display = "none"
    } else {
        document.getElementById("containername").textContent = container
        if (color) {
            [, document.getElementById("containername")
                .style.color] = color.split("~")
        } else {
            document.getElementById("containername").style.color = null
        }
        document.getElementById("containername").style.display = null
    }
}

const updateDownloadSettings = () => {
    const downloads = {}
    downloadSettings.forEach(setting => {
        downloads[setting] = allSettings[setting]
    })
    ipcRenderer.send("set-download-settings", downloads)
}

const updateMouseSettings = () => {
    if (allSettings.mouse) {
        document.body.classList.add("mouse")
    } else {
        document.body.classList.remove("mouse")
    }
}

const updateWebviewSettings = () => {
    const webviewSettingsFile = joinPath(
        appData(), "webviewsettings")
    writeJSON(webviewSettingsFile, {
        "bg": getComputedStyle(document.body).getPropertyValue("--bg"),
        "fg": getComputedStyle(document.body).getPropertyValue("--fg"),
        "permissiondisplaycapture": allSettings.permissiondisplaycapture,
        "permissionmediadevices": allSettings.permissionmediadevices,
        "permissionsallowed": allSettings.permissionsallowed,
        "permissionsasked": allSettings.permissionsasked,
        "permissionsblocked": allSettings.permissionsblocked
    })
}

const updatePermissionSettings = () => {
    const permissions = {}
    Object.keys(allSettings).forEach(setting => {
        if (setting.startsWith("permission")) {
            permissions[setting] = allSettings[setting]
        }
    })
    ipcRenderer.send("set-permissions", permissions)
}

const updateHelpPage = () => {
    listPages().forEach(p => {
        if (pathToSpecialPageName(p.src).name === "help") {
            const {
                listMappingsAsCommandList, uncountableActions
            } = require("./input")
            p.send("settings", settingsWithDefaults(),
                listMappingsAsCommandList(false, true), uncountableActions)
        }
    })
}

const listSettingsAsArray = () => Object.keys(defaultSettings)

const suggestionList = () => {
    const listOfSuggestions = ["all", ...listSettingsAsArray()]
    listOfSuggestions.push("all&")
    listOfSuggestions.push("all?")
    for (const setting of listSettingsAsArray()) {
        if (typeof defaultSettings[setting] === "boolean") {
            listOfSuggestions.push(`${setting}!`)
            listOfSuggestions.push(`no${setting}`)
            listOfSuggestions.push(`inv${setting}`)
        } else if (validOptions[setting]) {
            listOfSuggestions.push(`${setting}!`)
            listOfSuggestions.push(`${setting}=`)
            for (const option of validOptions[setting]) {
                listOfSuggestions.push(`${setting}=${option}`)
            }
        } else {
            listOfSuggestions.push(`${setting}=`)
            listOfSuggestions.push(`${setting}=${defaultSettings[setting]}`)
        }
        if (containerSettings.includes(setting)) {
            listOfSuggestions.push(`${setting}=s:usematching`)
            listOfSuggestions.push(`${setting}=s:usecurrent`)
            if (setting !== "containersplitpage") {
                listOfSuggestions.push(`${setting}=s:replacematching`)
                listOfSuggestions.push(`${setting}=s:replacecurrent`)
            }
            if (setting === "containernewtab") {
                listOfSuggestions.push(`${setting}=s:external`)
            }
            listOfSuggestions.push(`${setting}=temp%n`)
        }
        const isNumber = typeof defaultSettings[setting] === "number"
        const isFreeText = freeText.includes(setting)
        const isListLike = listLike.includes(setting)
        if (isNumber || isFreeText || isListLike) {
            listOfSuggestions.push(`${setting}+=`)
            listOfSuggestions.push(`${setting}^=`)
            listOfSuggestions.push(`${setting}-=`)
        }
        listOfSuggestions.push(`${setting}&`)
        listOfSuggestions.push(`${setting}?`)
    }
    return listOfSuggestions
}

const loadFromDisk = () => {
    const {pause, resume} = require("./commandhistory")
    pause()
    allSettings = JSON.parse(JSON.stringify(defaultSettings))
    sessionStorage.setItem("settings", JSON.stringify(allSettings))
    if (isFile(joinPath(appData(), "erwicmode"))) {
        set("containernewtab", "s:external")
        set("containerstartuppage", "s:usematching")
        set("permissioncamera", "allow")
        set("permissionnotifications", "allow")
        set("permissionmediadevices", "allowfull")
        set("permissionmicrophone", "allow")
    }
    for (const conf of appConfigSettings().files) {
        if (isFile(conf)) {
            const parsed = readFile(conf)
            if (!parsed) {
                notify(`Read error for config file located at '${conf}'`, "err")
                continue
            }
            for (const line of parsed.split("\n")) {
                if (line && !line.trim().startsWith("\"")) {
                    const {execute} = require("./command")
                    execute(line, conf)
                }
            }
        }
    }
    resume()
}

const reset = setting => {
    if (setting === "all") {
        Object.keys(defaultSettings).forEach(s => set(s, defaultSettings[s]))
    } else if (allSettings[setting] === undefined) {
        notify(`The setting '${setting}' doesn't exist`, "warn")
    } else {
        set(setting, defaultSettings[setting])
    }
}

const set = (setting, value) => {
    if (isValidSetting(setting, value)) {
        if (setting === "search") {
            if (!value.startsWith("http://") && !value.startsWith("https://")) {
                allSettings.search = `https://${value}`
            } else {
                allSettings.search = value
            }
        } else if (typeof allSettings[setting] === "boolean") {
            allSettings[setting] = ["true", true].includes(value)
        } else if (typeof allSettings[setting] === "number") {
            allSettings[setting] = Number(value)
        } else if (listLike.includes(setting)) {
            // Remove empty elements from the comma seperated list
            allSettings[setting] = value.split(",")
                .map(e => e.trim()).filter(e => e).join(",")
        } else {
            allSettings[setting] = value
        }
        sessionStorage.setItem("settings", JSON.stringify(allSettings))
        // Update settings elsewhere
        if (setting === "adblocker") {
            if (value === "off") {
                ipcRenderer.send("adblock-disable")
            } else {
                ipcRenderer.send("adblock-enable", allSettings.adblocker)
            }
        }
        if (setting === "containercolors" || setting === "containershowname") {
            updateContainerSettings()
        }
        if (setting === "firefoxmode") {
            if (value === "always") {
                ipcRenderer.sendSync(
                    "override-global-useragent", firefoxUseragent())
            } else {
                ipcRenderer.sendSync("override-global-useragent", false)
            }
            // Reset webview specific useragent override for every setting value
            // If needed, it will overridden again before loading a page
            listPages().forEach(page => {
                try {
                    page.setUserAgent("")
                } catch (e) {
                    // Page not ready yet
                }
            })
        }
        if (setting === "fontsize") {
            updateCustomStyling()
        }
        if (downloadSettings.includes(setting)) {
            updateDownloadSettings()
        }
        if (setting.startsWith("gui")) {
            updateGuiVisibility()
        }
        if (setting === "mintabwidth") {
            listTabs().forEach(tab => {
                tab.style.minWidth = `${allSettings.mintabwidth}px`
            })
            try {
                currentTab().scrollIntoView({"inline": "center"})
            } catch (e) {
                // No tabs present yet
            }
            const {applyLayout} = require("./pagelayout")
            applyLayout()
        }
        if (setting === "mouse") {
            updateMouseSettings()
        }
        if (setting === "spelllang") {
            allSettings.spelllang = Array.from(new Set(
                value.split(","))).join(",")
        }
        if (setting === "spelllang" || setting === "spell") {
            if (allSettings.spell) {
                ipcRenderer.send("set-spelllang", allSettings.spelllang)
            } else {
                ipcRenderer.send("set-spelllang", "")
            }
        }
        if (setting === "taboverflow") {
            const tabs = document.getElementById("tabs")
            tabs.classList.remove("scroll")
            tabs.classList.remove("wrap")
            if (value !== "hidden") {
                tabs.classList.add(value)
            }
            currentTab()?.scrollIntoView({"inline": "center"})
            const {applyLayout} = require("./pagelayout")
            applyLayout()
        }
        const webviewSettings = [
            "permissiondisplaycapture",
            "permissionmediadevices",
            "permissionsallowed",
            "permissionsasked",
            "permissionsblocked"
        ]
        if (webviewSettings.includes(setting)) {
            updateWebviewSettings()
        }
        if (setting.startsWith("permission")) {
            updatePermissionSettings()
        }
        if (setting === "redirects") {
            ipcRenderer.send("set-redirects", allSettings.redirects)
        }
        if (setting === "windowtitle") {
            updateWindowTitle()
        }
        updateHelpPage()
    }
}

const updateWindowTitle = () => {
    const application = title(appName())
    if (allSettings.windowtitle === "simple" || !currentPage()) {
        ipcRenderer.send("set-window-title", application)
        return
    }
    const name = tabOrPageMatching(currentPage())
        .querySelector("span").textContent
    if (allSettings.windowtitle === "title" || !currentPage().src) {
        ipcRenderer.send("set-window-title", `${application} - ${name}`)
        return
    }
    let url = currentPage().src
    const specialPage = pathToSpecialPageName(url)
    if (specialPage.name) {
        url = `${appName()}://${specialPage.name}`
        if (specialPage.section) {
            url += `#${specialPage.section}`
        }
    }
    if (allSettings.windowtitle === "url") {
        ipcRenderer.send("set-window-title", `${application} - ${url}`)
        return
    }
    ipcRenderer.send("set-window-title", `${application} - ${name} - ${url}`)
}

const settingsWithDefaults = () => Object.keys(allSettings).map(setting => {
    let typeLabel = "String"
    let allowedValues = ""
    if (listLike.includes(setting)) {
        typeLabel = "Like-like String"
        allowedValues = "Comma-separated list"
    }
    if (validOptions[setting]) {
        typeLabel = "Fixed-set String"
        allowedValues = validOptions[setting]
    }
    if (typeof allSettings[setting] === "boolean") {
        typeLabel = "Boolean flag"
        allowedValues = "true,false"
    }
    if (containerSettings.includes(setting)) {
        allowedValues = "see description"
    }
    if (setting === "downloadpath") {
        allowedValues = "any directory on disk"
    }
    if (setting === "externalcommand") {
        allowedValues = "any system command"
    }
    if (setting === "search") {
        allowedValues = "any URL"
    }
    if (setting === "spelllang") {
        allowedValues = `A list containing any of these supported languages: ${
            spelllangs.join(", ")}`
    }
    if (setting === "vimcommand") {
        allowedValues = "any system command"
    }
    if (typeof allSettings[setting] === "number") {
        typeLabel = "Number"
        if (numberRanges[setting]) {
            allowedValues = `from ${
                numberRanges[setting][0]} to ${numberRanges[setting][1]}`
        }
    }
    return {
        allowedValues,
        "current": allSettings[setting],
        "default": defaultSettings[setting],
        "name": setting,
        typeLabel
    }
})

const escapeValueChars = value => {
    if (value?.match?.(/(')/g)?.length) {
        return `"${value}"`
    }
    if (value?.match?.(/("| )/g)?.length) {
        return `'${value}'`
    }
    return value
}

const listCurrentSettings = full => {
    const settings = JSON.parse(JSON.stringify(allSettings))
    if (!full) {
        const defaults = JSON.parse(JSON.stringify(defaultSettings))
        Object.keys(settings).forEach(t => {
            if (JSON.stringify(settings[t]) === JSON.stringify(defaults[t])) {
                delete settings[t]
            }
        })
    }
    let setCommands = ""
    Object.keys(settings).forEach(setting => {
        const value = settings[setting]
        if (typeof value === "boolean") {
            if (value) {
                setCommands += `${setting}\n`
            } else {
                setCommands += `no${setting}\n`
            }
            return
        }
        if (listLike.includes(setting)) {
            const entries = value.split(",").filter(v => v)
            if (entries.length > 1 || value.match(/( |'|")/g)) {
                setCommands += `${setting}=\n`
                entries.forEach(entry => {
                    setCommands += `${setting}+=${escapeValueChars(entry)}\n`
                })
                return
            }
        }
        setCommands += `${setting}=${escapeValueChars(value)}\n`
    })
    return setCommands
}

const saveToDisk = full => {
    let settingsAsCommands = ""
    const options = listCurrentSettings(full).split("\n").filter(s => s)
        .map(s => `set ${s}`).join("\n").trim()
    const {listMappingsAsCommandList} = require("./input")
    const mappings = listMappingsAsCommandList().trim()
    const {customCommandsAsCommandList} = require("./command")
    const commands = customCommandsAsCommandList(full).trim()
    if (!options && !mappings && !commands) {
        notify("There are no options set, no mappings changed and no "
            + "custom commands that have been added, no viebrc written")
        return
    }
    if (options) {
        settingsAsCommands += `" Options\n${options}\n\n`
    }
    if (mappings) {
        settingsAsCommands += `" Mappings\n${mappings}\n\n`
    }
    if (commands) {
        settingsAsCommands += `" Commands\n${commands}\n\n`
    }
    settingsAsCommands += "\" Viebrc generated by Vieb\n\" vim: ft=vim\n"
    const destFile = appConfigSettings().config
    writeFile(destFile, settingsAsCommands,
        `Could not write to '${destFile}'`, `Viebrc saved to '${destFile}'`, 4)
}

const setCustomStyling = css => {
    customStyling = css
    updateCustomStyling()
}

const getCustomStyling = () => customStyling

const updateCustomStyling = () => {
    document.body.style.fontSize = `${allSettings.fontsize}px`
    updateWebviewSettings()
    listPages().forEach(p => {
        const isSpecialPage = pathToSpecialPageName(p.src).name
        const isLocal = p.src.startsWith("file:/")
        const isErrorPage = p.getAttribute("failed-to-load")
        if (isSpecialPage || isLocal || isErrorPage) {
            p.send("set-custom-styling", allSettings.fontsize, customStyling)
        }
    })
    const {applyLayout} = require("./pagelayout")
    applyLayout()
    ipcRenderer.send("set-custom-styling", allSettings.fontsize, customStyling)
}

module.exports = {
    freeText,
    getCustomStyling,
    init,
    listCurrentSettings,
    listLike,
    loadFromDisk,
    reset,
    saveToDisk,
    set,
    setCustomStyling,
    settingsWithDefaults,
    suggestionList,
    updateContainerSettings,
    updateCustomStyling,
    updateHelpPage,
    updateWindowTitle,
    validOptions
}
