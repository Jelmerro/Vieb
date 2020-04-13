/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020 Wiebe Beeftink
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
/* global COMMAND DOWNLOADS INPUT PAGELAYOUT SESSIONS TABS UTIL */
"use strict"

const path = require("path")
const {remote} = require("electron")

const defaultSettings = {
    "adblocker": "static",
    "cache": "clearonquit",
    "clearcookiesonquit": false,
    "cleardownloadsoncompleted": false,
    "cleardownloadsonquit": false,
    "clearhistoryonquit": false,
    "clearlocalstorageonquit": false,
    "containertabs": false,
    "countlimit": 100,
    "downloadpath": "~/Downloads/",
    "favicons": "session",
    "favoritepages": "",
    "fontsize": 14,
    "keeprecentlyclosed": true,
    "ignorecase": false,
    "maxmapdepth": 10,
    "mintabwidth": 22,
    "mouse": false,
    "mousehide": true,
    "mousefocus": false,
    "nativenotification": false,
    "notificationposition": "bottomright",
    "notificationduration": 6000,
    "permissioncamera": "block",
    "permissionfullscreen": "allow",
    "permissiongeolocation": "block",
    "permissionmediadevices": "ask",
    "permissionmicrophone": "block",
    "permissionmidisysex": "block",
    "permissionnotifications": "ask",
    "permissionopenexternal": "ask",
    "permissionpointerlock": "block",
    "permissionunknown": "block",
    "redirects": "",
    "redirecttohttp": false,
    "restoretabs": true,
    "restorewindowmaximize": true,
    "restorewindowposition": true,
    "restorewindowsize": true,
    "search": "https://duckduckgo.com/?kae=d&q=",
    "showcmd": true,
    "spell": true,
    "spelllang": "system",
    "splitbelow": false,
    "splitright": false,
    "startuppages": "",
    "storenewvisists": true,
    "suggestcommands": 20,
    "suggesthistory": 20,
    "suggesttopsites": 10,
    "tabnexttocurrent": true,
    "taboverflow": "scroll",
    "timeout": true,
    "timeoutlen": 1000,
    "vimcommand": "gvim"
}
let allSettings = {}
const freeText = ["downloadpath", "search", "vimcommand"]
const listLike = ["favoritepages", "redirects", "startuppages"]
const validOptions = {
    "adblocker": ["off", "static", "update", "custom"],
    "cache": ["none", "clearonquit", "full"],
    "favicons": [
        "disabled", "nocache", "session", "1day", "5day", "30day", "forever"
    ],
    "notificationposition": [
        "bottomright", "bottomleft", "topright", "topleft"
    ],
    "spelllang": [
        "system",
        ...JSON.parse(JSON.stringify(
            remote.session.defaultSession.availableSpellCheckerLanguages || []))
    ],
    "taboverflow": ["hidden", "scroll", "wrap"],
    "permissioncamera": ["block", "ask", "allow"],
    "permissionfullscreen": ["block", "ask", "allow"],
    "permissiongeolocation": ["block", "ask", "allow"],
    "permissionmediadevices": ["block", "ask", "allow", "allowfull"],
    "permissionmicrophone": ["block", "ask", "allow"],
    "permissionmidisysex": ["block", "ask", "allow"],
    "permissionnotifications": ["block", "ask", "allow"],
    "permissionopenexternal": ["block", "ask", "allow"],
    "permissionpointerlock": ["block", "ask", "allow"],
    "permissionunknown": ["block", "ask", "allow"]
}
const numberRanges = {
    "countlimit": [0, 10000],
    "fontsize": [8, 30],
    "maxmapdepth": [1, 40],
    "mintabwidth": [0, 10000],
    "notificationduration": [0, 30000],
    "suggestcommands": [0, 100],
    "suggesthistory": [0, 100],
    "suggesttopsites": [0, 1000],
    "timeoutlen": [0, 10000]
}
const config = path.join(remote.app.getPath("appData"), "viebrc")

const init = () => {
    loadFromDisk()
    updateDownloadSettings()
    updateTabOverflow()
    updateMouseHideSettings()
    SESSIONS.setSpellLang(get("spelllang"))
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
        return true
    }
    if (setting === "downloadpath") {
        const expandedPath = UTIL.expandPath(value)
        if (UTIL.pathExists(expandedPath)) {
            if (UTIL.isDir(expandedPath)) {
                return true
            }
            UTIL.notify("The download path is not a directory", "warn")
            return false
        }
        UTIL.notify("The download path does not exist", "warn")
        return false
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

const updateFontSize = () => {
    document.body.style.fontSize = `${get("fontsize")}px`
    TABS.listPages().forEach(p => {
        const isSpecialPage = UTIL.pathToSpecialPageName(p.src).name
        const isLocal = p.src.startsWith("file:/")
        const isErrorPage = p.getAttribute("failed-to-load")
        if (isSpecialPage || isLocal || isErrorPage) {
            TABS.webContents(p).send("fontsize", get("fontsize"))
        }
    })
    PAGELAYOUT.applyLayout()
}

const updateDownloadSettings = () => {
    remote.app.setPath("downloads", UTIL.expandPath(get("downloadpath")))
    DOWNLOADS.removeCompletedIfDesired()
}

const updateTabOverflow = () => {
    const setting = get("taboverflow")
    const tabs = document.getElementById("tabs")
    const spacer = document.querySelector("#tabs > .spacer")
    tabs.style.overflowX = ""
    tabs.style.flexWrap = ""
    tabs.style.marginLeft = "4em"
    tabs.style.width = "calc(100vw - 4em)"
    spacer.style.display = "none"
    if (setting === "scroll") {
        tabs.style.overflowX = "auto"
    }
    if (setting === "wrap") {
        tabs.style.flexWrap = "wrap"
        tabs.style.marginLeft = "0"
        tabs.style.width = "100vw"
        spacer.style.display = "inline-block"
    }
    try {
        TABS.currentTab().scrollIntoView({"inline": "center"})
    } catch (e) {
        // No tabs present yet
    }
}

const updateMouseSettings = () => {
    document.body.classList.remove("mouse")

    if(get("mouse")) {
        document.body.classList.add("mouse")
    }
}

const updateMouseHideSettings = () => {
    if(get("mousehide")) {
        document.body.classList.add("mousehide")
    } else {
        document.body.classList.remove("mousehide")
    }
}

const updateWebviewSettings = () => {
    const webviewSettingsFile = path.join(
        remote.app.getPath("appData"), "webviewsettings")
    UTIL.writeJSON(webviewSettingsFile, {
        "permissionmediadevices": get("permissionmediadevices")
    })
}

const updateHelpPage = () => {
    TABS.listPages().forEach(p => {
        if (UTIL.pathToSpecialPageName(p.src).name === "help") {
            TABS.webContents(p).send(
                "settings", settingsWithDefaults(),
                INPUT.listMappingsAsCommandList(false, true))
        }
    })
}

const listSettingsAsArray = () => {
    const listOfSettings = []
    for (const topLevel of Object.keys(defaultSettings)) {
        if (defaultSettings[topLevel].length === undefined) {
            if (typeof defaultSettings[topLevel] === "object") {
                for (const subLevel of Object.keys(defaultSettings[topLevel])) {
                    listOfSettings.push(`${topLevel}.${subLevel}`)
                }
                continue
            }
        }
        listOfSettings.push(topLevel)
    }
    return listOfSettings
}

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
        Object.keys(defaultSettings).forEach(s => {
            set(s, defaultSettings[s])
        })
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
            allSettings[setting] = value.split(",").filter(e => e).join(",")
        } else {
            allSettings[setting] = value
        }
        // Update settings elsewhere
        if (setting === "fontsize") {
            updateFontSize()
        }
        if (setting === "adblocker") {
            if (value === "off") {
                SESSIONS.disableAdblocker()
            } else {
                SESSIONS.enableAdblocker()
            }
        }
        const downloadSettings = [
            "downloadpath", "cleardownloadsonquit", "cleardownloadsoncompleted"
        ]
        if (downloadSettings.includes(setting)) {
            updateDownloadSettings()
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
        if(setting === "mousehide") {
            updateMouseHideSettings()
        }
        if (setting === "spelllang") {
            SESSIONS.setSpellLang(get("spelllang"))
        }
        if (setting === "taboverflow") {
            updateTabOverflow()
            PAGELAYOUT.applyLayout()
        }
        if (setting === "permissionmediadevices") {
            updateWebviewSettings()
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
    suggestionList,
    loadFromDisk,
    get,
    reset,
    set,
    updateHelpPage,
    settingsWithDefaults,
    listCurrentSettings,
    saveToDisk
}
