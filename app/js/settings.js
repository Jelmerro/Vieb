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
/* global COMMAND INPUT MODES PAGELAYOUT POINTER SESSIONS TABS UTIL */
"use strict"

const path = require("path")
const {ipcRenderer} = require("electron")

const defaultSettings = {
    "adblocker": "static",
    "cache": "clearonquit",
    "clearcookiesonquit": false,
    "cleardownloadsoncompleted": false,
    "cleardownloadsonquit": false,
    "clearhistoryonquit": false,
    "clearlocalstorageonquit": false,
    "closablepinnedtabs": false,
    "containercolors": "temp\\d+~#ff0",
    "containerkeeponreopen": true,
    "containernewtab": "s:usecurrent",
    "containershowname": "automatic",
    "containersplitpage": "s:usecurrent",
    "containerstartuppage": "main",
    "countlimit": 100,
    "darkreader": false,
    "devtoolsposition": "window",
    "downloadmethod": "automatic",
    "downloadpath": "~/Downloads/",
    "favicons": "session",
    "favoritepages": "",
    "firefoxmode": "never",
    "fontsize": 14,
    "guifullscreennavbar": "oninput",
    "guifullscreentabbar": "onupdate",
    "guihidetimeout": 2000,
    "guinavbar": "always",
    "guitabbar": "always",
    "keeprecentlyclosed": true,
    "ignorecase": false,
    "maxmapdepth": 10,
    "mintabwidth": 28,
    "mouse": false,
    "mousefocus": false,
    "mousenewtabswitch": false,
    "nativenotification": false,
    "notificationduration": 6000,
    "notificationforpermissions": false,
    "notificationposition": "bottomright",
    "permissioncamera": "block",
    "permissionclosepage": "allow",
    "permissionfullscreen": "allow",
    "permissiongeolocation": "block",
    "permissionmediadevices": "ask",
    "permissionmicrophone": "block",
    "permissionmidisysex": "block",
    "permissionnotifications": "ask",
    "permissionopenexternal": "ask",
    "permissionpointerlock": "block",
    "permissionsallowed": "",
    "permissionsblocked": "",
    "permissionunknown": "block",
    "redirects": "https?://(www\\.)?google\\.com(\\.\\w+)?/amp/s/amp\\.(.*)"
        + "~https://$3",
    "redirecttohttp": false,
    "requesttimeout": 20000,
    "restoretabs": true,
    "restorewindowmaximize": true,
    "restorewindowposition": true,
    "restorewindowsize": true,
    "search": "https://duckduckgo.com/?kae=d&kav=1&ko=1&q=%s&ia=web",
    "showcmd": true,
    "spell": true,
    "spelllang": "system",
    "splitbelow": false,
    "splitright": false,
    "startuppages": "",
    "storenewvisits": true,
    "suggestcommands": 1000,
    "suggestfiles": "all",
    "suggestfilesfirst": false,
    "suggestexplore": 20,
    "suggesttopsites": 10,
    "tabcycle": true,
    "tabnexttocurrent": true,
    "taboverflow": "scroll",
    "timeout": true,
    "timeoutlen": 1000,
    "vimcommand": "gvim",
    "windowtitle": "simple"
}
let allSettings = {}
const freeText = ["downloadpath", "search", "vimcommand"]
const listLike = [
    "containercolors",
    "favoritepages",
    "permissionsallowed",
    "permissionsblocked",
    "redirects",
    "startuppages"
]
const validOptions = {
    "adblocker": ["off", "static", "update", "custom"],
    "cache": ["none", "clearonquit", "full"],
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
    "notificationposition": [
        "bottomright", "bottomleft", "topright", "topleft"
    ],
    "taboverflow": ["hidden", "scroll", "wrap"],
    "permissioncamera": ["block", "ask", "allow"],
    "permissionclosepage": ["block", "allow"],
    "permissionfullscreen": ["block", "ask", "allow"],
    "permissiongeolocation": ["block", "ask", "allow"],
    "permissionmediadevices": ["block", "ask", "allow", "allowfull"],
    "permissionmicrophone": ["block", "ask", "allow"],
    "permissionmidisysex": ["block", "ask", "allow"],
    "permissionnotifications": ["block", "ask", "allow"],
    "permissionopenexternal": ["block", "ask", "allow"],
    "permissionpointerlock": ["block", "ask", "allow"],
    "permissionunknown": ["block", "ask", "allow"],
    "suggestfiles": ["none", "commands", "explore", "all"],
    "windowtitle": ["simple", "title", "url", "full"]
}
const numberRanges = {
    "countlimit": [0, 10000],
    "fontsize": [8, 30],
    "guihidetimeout": [0, 10000],
    "maxmapdepth": [1, 40],
    "mintabwidth": [0, 10000],
    "notificationduration": [0, 30000],
    "requesttimeout": [0, 300000],
    "suggestcommands": [0, 1000],
    "suggestexplore": [0, 1000],
    "suggesttopsites": [0, 1000],
    "timeoutlen": [0, 10000]
}
const config = path.join(UTIL.appData(), "viebrc")
let navbarGuiTimer = null
let tabbarGuiTimer = null
let topOfPageWithMouse = false
const downloadSettings = [
    "downloadmethod",
    "downloadpath",
    "cleardownloadsonquit",
    "cleardownloadsoncompleted"
]
const containerSettings = [
    "containernewtab", "containersplitpage", "containerstartuppage"
]

const init = () => {
    loadFromDisk()
    updateDownloadSettings()
    updateTabOverflow()
    updatePermissionSettings()
    updateWebviewSettings()
    ipcRenderer.invoke("list-spelllangs").then(spelllangs => {
        validOptions.spelllang = spelllangs || []
        validOptions.spelllang.push("system")
        if (!isValidSetting("spelllang", get("spelllang"))) {
            set("spelllang", "system")
        }
        SESSIONS.setSpellLang(get("spelllang"))
    })
    ipcRenderer.on("set-permission", (_, name, value) => set(name, value))
}

const checkOption = (setting, value) => {
    const optionList = JSON.parse(JSON.stringify(validOptions[setting]))
    if (optionList) {
        const valid = optionList.includes(value)
        if (!valid) {
            const lastOption = optionList.pop()
            const text = `'${optionList.join("', '")}' or '${lastOption}'`
            UTIL.notify(`The value of setting '${setting}' can only be one of:`
                + ` ${text}`, "warn")
        }
        return valid
    }
    return false
}

const checkNumber = (setting, value) => {
    const numberRange = numberRanges[setting]
    if (numberRange[0] > value || numberRange[1] < value) {
        UTIL.notify(`The value of setting '${setting}' must be between `
            + `${numberRange[0]} and ${numberRange[1]}`, "warn")
        return false
    }
    return true
}

const checkOther = (setting, value) => {
    // Special cases
    if (setting === "search") {
        if (value.startsWith("http://") || value.startsWith("https://")) {
            value = value.replace(/^https?:\/\//g, "")
        }
        if (UTIL.hasProtocol(value) || !UTIL.isUrl(value)) {
            UTIL.notify("The value of the search setting must be a valid url",
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
            UTIL.notify(
                `Special container name for '${setting}' can only be one of:`
                + ` ${text}`, "warn")
            return false
        }
        if (value.replace("%n", "valid").match(/[^A-Za-z0-9_]/g)) {
            UTIL.notify(
                "Only letters, numbers and undercores can appear in the name "
                + `of a container, invalid ${setting}: ${value}`, "warn")
            return false
        }
    }
    if (setting === "containercolors") {
        for (const colorMatch of value.split(",")) {
            if (!colorMatch.trim()) {
                continue
            }
            if ((colorMatch.match(/~/g) || []).length === 0) {
                UTIL.notify(`Invalid ${setting} entry: ${colorMatch}\n`
                    + "Entries must have exactly one ~ to separate the "
                    + "name regular expression and color name/hex", "warn")
                return false
            }
            const [match, color] = colorMatch.split("~")
            try {
                RegExp(match)
            } catch (e) {
                UTIL.notify(
                    `Invalid regular expression in containercolors: ${match}`,
                    "warn")
                return false
            }
            const style = document.createElement("div").style
            style.color = "white"
            style.color = color
            if (style.color === "white" && color !== "white" || !color) {
                UTIL.notify("Invalid color, must be a valid color name or hex"
                    + `, not: ${color}`, "warn")
                return false
            }
        }
    }
    if (setting === "downloadpath") {
        const expandedPath = UTIL.expandPath(value)
        if (!UTIL.pathExists(expandedPath)) {
            UTIL.notify("The download path does not exist", "warn")
            return false
        }
        if (!UTIL.isDir(expandedPath)) {
            UTIL.notify("The download path is not a directory", "warn")
            return false
        }
    }
    const permissionSettings = ["permissionsallowed", "permissionsblocked"]
    if (permissionSettings.includes(setting)) {
        for (const override of value.split(",")) {
            if (!override.trim()) {
                continue
            }
            if ((override.match(/~/g) || []).length === 0) {
                UTIL.notify(`Invalid ${setting} entry: ${override}\n`
                    + "Entries must have at least one ~ to separate the "
                    + "domain regular expression and permission names", "warn")
                return false
            }
            const [match, ...names] = override.split("~")
            try {
                RegExp(match)
            } catch (e) {
                UTIL.notify(
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
                    UTIL.notify(
                        `Invalid name for a permission: ${name}`, "warn")
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
                UTIL.notify(`Invalid redirect entry: ${redirect}\n`
                    + "Entries must have exactly one ~ to separate the "
                    + "regular expression from the replacement", "warn")
                return false
            }
            const match = redirect.split("~")[0]
            try {
                RegExp(match)
            } catch (e) {
                UTIL.notify(
                    `Invalid regular expression in redirect: ${match}`, "warn")
                return false
            }
        }
    }
    if (["favoritepages", "startuppages"].includes(setting)) {
        for (const page of value.split(",")) {
            if (page.trim() && !UTIL.isUrl(page)) {
                UTIL.notify(`Invalid URL passed to ${setting}: ${page}`, "warn")
                return false
            }
        }
    }
    return true
}

const isValidSetting = (setting, value) => {
    if (get(setting) === undefined) {
        UTIL.notify(`The setting '${setting}' doesn't exist`, "warn")
        return false
    }
    const expectedType = typeof get(setting)
    if (typeof value === "string") {
        if (expectedType !== typeof value) {
            if (expectedType === "number" && !isNaN(Number(value))) {
                value = Number(value)
            }
            if (expectedType === "boolean") {
                if (["true", "false"].includes(value)) {
                    value = value === "true"
                }
            }
        }
    }
    if (expectedType !== typeof value) {
        UTIL.notify(`The value of setting '${setting}' is of an incorrect `
            + `type, expected '${expectedType}' but got `
            + `'${typeof value}' instead.`, "warn")
        return false
    }
    if (validOptions[setting]) {
        return checkOption(setting, value)
    }
    if (numberRanges[setting]) {
        return checkNumber(setting, value)
    }
    return checkOther(setting, value)
}

const updateContainerSettings = (full = true) => {
    if (full) {
        for (const page of TABS.listPages()) {
            const color = get("containercolors").split(",").find(
                c => page.getAttribute("container").match(c.split("~")[0]))
            if (color) {
                TABS.tabOrPageMatching(page).style.color = color.split("~")[1]
            }
        }
    }
    const container = TABS.currentPage().getAttribute("container")
    const color = get("containercolors").split(",").find(
        c => container.match(c.split("~")[0]))
    const show = get("containershowname")
    if (container === "main" && show === "automatic" || show === "never") {
        document.getElementById("containername").style.display = "none"
    } else {
        document.getElementById("containername").textContent = container
        if (color) {
            document.getElementById("containername")
                .style.color = color.split("~")[1]
        } else {
            document.getElementById("containername").style.color = null
        }
        document.getElementById("containername").style.display = null
    }
}

const updateFontSize = () => {
    document.body.style.fontSize = `${get("fontsize")}px`
    TABS.listPages().forEach(p => {
        const isSpecialPage = UTIL.pathToSpecialPageName(p.src).name
        const isLocal = p.src.startsWith("file:/")
        const isErrorPage = p.getAttribute("failed-to-load")
        if (isSpecialPage || isLocal || isErrorPage) {
            p.send("fontsize", get("fontsize"))
        }
    })
    PAGELAYOUT.applyLayout()
    ipcRenderer.send("set-fontsize", get("fontsize"))
}

const getGuiStatus = type => {
    let setting = get(`gui${type}`)
    if (ipcRenderer.sendSync("is-fullscreen")) {
        setting = get(`guifullscreen${type}`)
    }
    if (topOfPageWithMouse && setting !== "never") {
        setting = "always"
    }
    return setting
}

const setTopOfPageWithMouse = status => {
    topOfPageWithMouse = status
    updateGuiVisibility()
}

const guiRelatedUpdate = type => {
    updateGuiVisibility()
    if (type === "navbar" && getGuiStatus("navbar") === "onupdate") {
        clearTimeout(navbarGuiTimer)
        document.body.classList.remove("navigationhidden")
        navbarGuiTimer = setTimeout(() => {
            navbarGuiTimer = null
            updateGuiVisibility()
        }, get("guihidetimeout"))
    }
    if (type === "tabbar" && getGuiStatus("tabbar") === "onupdate") {
        clearTimeout(tabbarGuiTimer)
        document.body.classList.remove("tabshidden")
        tabbarGuiTimer = setTimeout(() => {
            tabbarGuiTimer = null
            updateGuiVisibility()
        }, get("guihidetimeout"))
    }
}

const updateGuiVisibility = () => {
    const navbar = getGuiStatus("navbar")
    const tabbar = getGuiStatus("tabbar")
    if (!navbarGuiTimer) {
        const notTyping = !"ces".includes(MODES.currentMode()[0])
        if (navbar === "never" || navbar !== "always" && notTyping) {
            document.body.classList.add("navigationhidden")
        } else {
            document.body.classList.remove("navigationhidden")
        }
    }
    if (!tabbarGuiTimer) {
        if (tabbar === "always") {
            document.body.classList.remove("tabshidden")
        } else {
            document.body.classList.add("tabshidden")
        }
    }
    setTimeout(PAGELAYOUT.applyLayout, 1)
    if (MODES.currentMode() === "pointer") {
        POINTER.updateElement()
    }
}


const updateDownloadSettings = () => {
    const downloads = {}
    downloadSettings.forEach(setting => {
        downloads[setting] = get(setting)
    })
    ipcRenderer.send("set-download-settings", downloads)
}

const updateTabOverflow = () => {
    const setting = get("taboverflow")
    const tabs = document.getElementById("tabs")
    tabs.classList.remove("scroll")
    tabs.classList.remove("wrap")
    if (setting !== "hidden") {
        tabs.classList.add(setting)
    }
    try {
        TABS.currentTab().scrollIntoView({"inline": "center"})
    } catch (e) {
        // No tabs present yet
    }
}

const updateMouseSettings = () => {
    if (get("mouse")) {
        document.body.classList.add("mouse")
    } else {
        document.body.classList.remove("mouse")
    }
}

const updateWebviewSettings = () => {
    const webviewSettingsFile = path.join(
        UTIL.appData(), "webviewsettings")
    UTIL.writeJSON(webviewSettingsFile, {
        "darkreader": get("darkreader"),
        "permissionmediadevices": get("permissionmediadevices"),
        "permissionsallowed": get("permissionsallowed"),
        "permissionsblocked": get("permissionsblocked")
    })
}

const updatePermissionSettings = () => {
    const permissions = {}
    Object.keys(allSettings).forEach(setting => {
        if (setting.startsWith("permission")) {
            permissions[setting] = get(setting)
        }
    })
    ipcRenderer.send("set-permissions", permissions)
}

const updateHelpPage = () => {
    TABS.listPages().forEach(p => {
        if (UTIL.pathToSpecialPageName(p.src).name === "help") {
            p.send("settings", settingsWithDefaults(),
                INPUT.listMappingsAsCommandList(false, true))
        }
    })
}

const listSettingsAsArray = () => Object.keys(defaultSettings)

const suggestionList = () => {
    const listOfSuggestions = ["all", ...listSettingsAsArray()]
    listOfSuggestions.push("all&")
    listOfSuggestions.push("all?")
    for (const setting of listSettingsAsArray()) {
        if (typeof get(setting, defaultSettings) === "boolean") {
            listOfSuggestions.push(`${setting}!`)
            listOfSuggestions.push(`no${setting}`)
            listOfSuggestions.push(`inv${setting}`)
        } else if (validOptions[setting]) {
            listOfSuggestions.push(`${setting}=`)
            for (const option of validOptions[setting]) {
                listOfSuggestions.push(`${setting}=${option}`)
            }
        } else {
            listOfSuggestions.push(`${setting}=`)
            listOfSuggestions.push(
                `${setting}=${get(setting, defaultSettings)}`)
        }
        const isNumber = typeof get(setting, defaultSettings) === "number"
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
    allSettings = JSON.parse(JSON.stringify(defaultSettings))
    if (UTIL.isFile(path.join(UTIL.appData(), "erwicmode"))) {
        set("containernewtab", "s:external")
        set("containerstartuppage", "s:usematching")
        set("permissioncamera", "allow")
        set("permissionnotifications", "allow")
        set("permissionmediadevices", "allowfull")
        set("permissionmicrophone", "allow")
    }
    for (const conf of [config, UTIL.expandPath("~/.viebrc")]) {
        if (UTIL.isFile(conf)) {
            const parsed = UTIL.readFile(conf)
            if (parsed) {
                for (const line of parsed.split("\n")) {
                    if (line && !line.trim().startsWith("\"")) {
                        COMMAND.execute(line)
                    }
                }
            } else {
                UTIL.notify(
                    `Read error for config file located at '${conf}'`, "err")
            }
        }
    }
}

const get = (setting, settingObject = allSettings) => settingObject[setting]

const reset = setting => {
    if (setting === "all") {
        Object.keys(defaultSettings).forEach(s => set(s, defaultSettings[s]))
    } else if (allSettings[setting] === undefined) {
        UTIL.notify(`The setting '${setting}' doesn't exist`, "warn")
    } else {
        set(setting, defaultSettings[setting])
    }
}

const set = (setting, value) => {
    if (isValidSetting(setting, value)) {
        if (setting === "search") {
            if (!value.startsWith("http://") && !value.startsWith("https://")) {
                value = `https://${value}`
            }
            allSettings.search = value
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
        // Update settings elsewhere
        if (setting === "adblocker") {
            if (value === "off") {
                SESSIONS.disableAdblocker()
            } else {
                SESSIONS.enableAdblocker()
            }
        }
        if (setting === "containercolors" || setting === "containershowname") {
            updateContainerSettings()
        }
        if (setting === "firefoxmode") {
            if (value === "always") {
                ipcRenderer.sendSync(
                    "override-global-useragent", UTIL.firefoxUseragent())
            } else {
                ipcRenderer.sendSync("override-global-useragent", false)
            }
            // Reset webview specific useragent override for every setting value
            // If needed, it will overridden again before loading a page
            TABS.listPages().forEach(page => {
                try {
                    page.setUserAgent("")
                } catch (e) {
                    // Page not ready yet
                }
            })
        }
        if (setting === "fontsize") {
            updateFontSize()
        }
        if (downloadSettings.includes(setting)) {
            updateDownloadSettings()
        }
        if (setting.startsWith("gui")) {
            updateGuiVisibility()
        }
        if (setting === "mintabwidth") {
            TABS.listTabs().forEach(tab => {
                tab.style.minWidth = `${allSettings.mintabwidth}px`
            })
            try {
                TABS.currentTab().scrollIntoView({"inline": "center"})
            } catch (e) {
                // No tabs present yet
            }
            PAGELAYOUT.applyLayout()
        }
        if (setting === "mouse") {
            updateMouseSettings()
        }
        if (setting === "spelllang") {
            SESSIONS.setSpellLang(get("spelllang"))
        }
        if (setting === "taboverflow") {
            updateTabOverflow()
            PAGELAYOUT.applyLayout()
        }
        const webviewSettings = [
            "darkreader",
            "permissionmediadevices",
            "permissionsallowed",
            "permissionsblocked"
        ]
        if (webviewSettings.includes(setting)) {
            updateWebviewSettings()
        }
        if (setting.startsWith("permission")) {
            updatePermissionSettings()
        }
        if (setting === "redirects") {
            ipcRenderer.send("set-redirects", get("redirects"))
        }
        if (setting === "windowtitle") {
            TABS.updateWindowTitle()
        }
        updateHelpPage()
    }
}

const settingsWithDefaults = () => Object.keys(allSettings).map(setting => {
    let typeLabel = "String"
    let allowedValues = ""
    if (listLike.includes(setting)) {
        typeLabel = "Like-like String"
        allowedValues = "Comma-separated list"
    }
    if (validOptions[setting]) {
        allowedValues = validOptions[setting]
    }
    if (typeof allSettings[setting] === "boolean") {
        typeLabel = "Boolean flag"
        allowedValues = "true,false"
    }
    if (setting === "containernewtab") {
        allowedValues = "see description"
    }
    if (setting === "containersplitpage") {
        allowedValues = "see description"
    }
    if (setting === "containerstartuppage") {
        allowedValues = "see description"
    }
    if (setting === "downloadpath") {
        allowedValues = "any directory on disk"
    }
    if (setting === "search") {
        allowedValues = "any URL"
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
        "name": setting,
        "current": allSettings[setting],
        "default": defaultSettings[setting],
        "typeLabel": typeLabel,
        "allowedValues": allowedValues
    }
})

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
        if (typeof settings[setting] === "boolean") {
            if (settings[setting]) {
                setCommands += `${setting}\n`
            } else {
                setCommands += `no${setting}\n`
            }
        } else {
            setCommands += `${setting}=${settings[setting]}\n`
        }
    })
    return setCommands
}

const saveToDisk = full => {
    let settingsAsCommands = ""
    const options = listCurrentSettings(full).split("\n").filter(s => s)
        .map(s => `set ${s}`).join("\n").trim()
    const mappings = INPUT.listMappingsAsCommandList().trim()
    const commands = COMMAND.customCommandsAsCommandList().trim()
    if (!options && !mappings && !commands) {
        UTIL.notify("There are no options set, no mappings changed and no "
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
    UTIL.writeFile(config, settingsAsCommands,
        `Could not write to '${config}'`, `Viebrc saved to '${config}'`, 4)
}
module.exports = {
    init,
    freeText,
    listLike,
    updateContainerSettings,
    suggestionList,
    loadFromDisk,
    get,
    reset,
    set,
    updateHelpPage,
    settingsWithDefaults,
    listCurrentSettings,
    saveToDisk,
    setTopOfPageWithMouse,
    guiRelatedUpdate,
    updateGuiVisibility
}
