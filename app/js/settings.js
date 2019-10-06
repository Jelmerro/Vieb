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
/* global DOWNLOADS SESSIONS UTIL */
"use strict"

const fs = require("fs")
const os = require("os")
const path = require("path")
const {remote} = require("electron")

const defaultSettings = {
    "keybindings": {},
    "redirectToHttp": false,
    "search": "https://duckduckgo.com/?kae=d&q=",
    "caseSensitiveSearch": true,
    "clearCookiesOnQuit": false,
    "clearLocalStorageOnQuit": false,
    "suggestCommands": true,
    "allowFollowModeDuringLoad": false,
    "fontSize": 14,
    "digitsRepeatActions": true,
    "adblocker": "static",
    "cache": "clearonquit",
    "notification": {
        "system": false,
        "position": "bottom-right",
        "duration": 6000
    },
    "downloads": {
        "path": "~/Downloads/",
        "removeCompleted": false,
        "clearOnQuit": false
    },
    "history": {
        "suggest": true,
        "clearOnQuit": false,
        "storeNewVisits": true
    },
    "tabs": {
        "restore": true,
        "keepRecentlyClosed": true,
        "startup": []
    },
    "windowstate": {
        "position": true,
        "size": true,
        "maximized": true
    },
    "permissions": {
        "camera": "block",
        "fullscreen": "allow",
        "geolocation": "block",
        "microphone": "block",
        "midiSysex": "block",
        "notifications": "ask",
        "openExternal": "block",
        "pointerLock": "block",
        "unknown": "block"
    },
    "newtab": {
        "nextToCurrentOne": true,
        "enterNavMode": false,
        "showTopSites": true,
        "container": false
    }
}
let allSettings = {}
const windowstateMessage = "The window state settings are applied on startup,"
    + "therefor they can't be edited with the set command\n"
    + "Instead, open the config file, edit the settings there"
const collectionMessage = "This collection of settings should be"
    + " updated one field at the time"
const readOnly = {
    "keybindings": "The keybindings can't be changed with the set command\n"
        + "Instead, open the config file, edit the bindings and "
        + "use the reload command to load them from disk again",
    "notification": collectionMessage,
    "downloads": collectionMessage,
    "history": collectionMessage,
    "tabs": collectionMessage,
    "windowstate": collectionMessage,
    "permissions": collectionMessage,
    "newtab": collectionMessage,
    "tabs.startup": "The startup pages can't be changed with the set command\n"
        + "Instead, open the config file, edit the page list and "
        + "the startup pages will open the next time Vieb is started",
    "windowstate.position": windowstateMessage,
    "windowstate.size": windowstateMessage,
    "windowstate.maximized": windowstateMessage
}
const validOptions = {
    "adblocker": ["off", "static", "update", "custom"],
    "cache": ["none", "clearonquit", "full"],
    "notification.position": [
        "bottom-right", "bottom-left", "top-right", "top-left"
    ],
    "permissions.camera": ["block", "ask", "allow"],
    "permissions.fullscreen": ["block", "ask", "allow"],
    "permissions.geolocation": ["block", "ask", "allow"],
    "permissions.microphone": ["block", "ask", "allow"],
    "permissions.midiSysex": ["block", "ask", "allow"],
    "permissions.notifications": ["block", "ask", "allow"],
    "permissions.openExternal": ["block", "ask", "allow"],
    "permissions.pointerLock": ["block", "ask", "allow"],
    "permissions.unknown": ["block", "ask", "allow"]
}
const numberRanges = {
    "fontSize": [8, 30],
    "notification.duration": [100, 30000]
}

const init = () => {
    loadFromDisk()
}

const checkForValidSetting = (setting, value, startup) => {
    if (get(setting) === undefined) {
        UTIL.notify(`The setting '${setting}' doesn't exist`, "warn")
        return false
    }
    const readOnlyMessage = readOnly[setting]
    if (!startup && readOnlyMessage) {
        UTIL.notify(readOnlyMessage, "warn")
        return false
    }
    if (!startup && !value) {
        UTIL.notify(`The new '${setting}' value may not be empty`, "warn")
        return false
    }
    const expectedType = typeof get(setting)
    if (!startup && typeof value === "string") {
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
    const optionList = validOptions[setting]
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
    const numberRange = numberRanges[setting]
    if (numberRange) {
        if (numberRange[0] > value || numberRange[1] < value) {
            UTIL.notify(`The value of setting '${setting}' must be between `
                + `${numberRange[0]} and ${numberRange[1]}`, "warn")
            return false
        }
        return true
    }
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
    if (setting === "downloads.path") {
        const expandedPath = expandPath(value)
        if (fs.existsSync(expandedPath)) {
            if (fs.statSync(expandedPath).isDirectory()) {
                allSettings.downloads.path = expandedPath
                return true
            }
            UTIL.notify("The download path is not a directory", "warn")
            return false
        }
        UTIL.notify("The download path does not exist", "warn")
        return false
    }
    return true
}

const expandPath = homePath => {
    if (homePath.startsWith("~")) {
        return homePath.replace("~", os.homedir())
    }
    return homePath
}

const updateDownloadSettings = () => {
    remote.app.setPath("downloads", expandPath(allSettings.downloads.path))
    DOWNLOADS.removeCompletedIfDesired()
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
    listOfSettings.push("keybindings")
    return listOfSettings
}

const suggestionList = () => {
    const listOfSuggestions = listSettingsAsArray()
    for (const setting of listSettingsAsArray()) {
        if (setting.includes(".")) {
            const prefix = setting.split(".")[0]
            const previous = listOfSuggestions[listOfSuggestions.length - 1]
            if (!previous.startsWith(`${prefix}.`)) {
                listOfSuggestions.push(prefix)
                listOfSuggestions.push(`${prefix}?`)
            }
        }
        if (!readOnly[setting]) {
            listOfSuggestions.push(`${setting}=`)
            if (typeof get(setting, defaultSettings) === "boolean") {
                listOfSuggestions.push(`${setting}!`)
                listOfSuggestions.push(`${setting}=true`)
                listOfSuggestions.push(`${setting}=false`)
            } else if (validOptions[setting]) {
                for (const option of validOptions[setting]) {
                    listOfSuggestions.push(`${setting}=${option}`)
                }
            } else {
                listOfSuggestions.push(
                    `${setting}=${get(setting, defaultSettings)}`)
            }
        }
        listOfSuggestions.push(`${setting}?`)
    }
    return listOfSuggestions
}

const loadFromDisk = () => {
    allSettings = JSON.parse(JSON.stringify(defaultSettings))
    const config = path.join(remote.app.getPath("appData"), "viebrc.json")
    if (fs.existsSync(config) && fs.statSync(config).isFile()) {
        try {
            const contents = fs.readFileSync(config).toString()
            const parsed = JSON.parse(contents)
            for (const setting of listSettingsAsArray()) {
                const configuredValue = get(setting, parsed)
                if (configuredValue !== undefined) {
                    set(setting, configuredValue, true)
                }
            }
        } catch (e) {
            UTIL.notify(
                `The config file located at '${config}' is corrupt`, "err")
        }
    }
    document.body.style.fontSize = `${allSettings.fontSize}px`
    updateDownloadSettings()
}

const get = (setting, settingObject=allSettings) => {
    if (!setting.includes(".")) {
        return settingObject[setting]
    }
    const [group, config] = setting.split(".")
    if (!settingObject[group]) {
        return undefined
    }
    return settingObject[group][config]
}

const set = (setting, value, startup=false) => {
    if (checkForValidSetting(setting, value, startup)) {
        if (setting.includes(".")) {
            const [group, config] = setting.split(".")
            if (startup) {
                allSettings[group][config] = value
            } else if (typeof allSettings[group][config] === "boolean") {
                allSettings[group][config] = value === "true"
            } else if (typeof allSettings[group][config] === "number") {
                allSettings[group][config] = Number(value)
            } else {
                allSettings[group][config] = value
            }
        } else if (setting === "search") {
            if (!value.startsWith("http://") && !value.startsWith("https://")) {
                value = `https://${value}`
            }
            allSettings.search = value
        } else if (startup) {
            allSettings[setting] = value
        } else if (typeof allSettings[setting] === "boolean") {
            allSettings[setting] = value === "true"
        } else if (typeof allSettings[setting] === "number") {
            allSettings[setting] = Number(value)
        } else {
            allSettings[setting] = value
        }
        // Update settings elsewhere
        if (setting === "fontSize") {
            document.body.style.fontSize = `${allSettings.fontSize}px`
        }
        if (setting === "adblocker") {
            if (value === "off") {
                SESSIONS.disableAdblocker()
            } else {
                SESSIONS.enableAdblocker()
            }
        }
        if (setting.startsWith("downloads.")) {
            updateDownloadSettings()
        }
    }
}

module.exports = {
    init,
    suggestionList,
    loadFromDisk,
    get,
    set
}
