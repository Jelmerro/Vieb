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
/* global UTIL */
"use strict"

const fs = require("fs")
const os = require("os")
const path = require("path")
const {ipcRenderer, remote} = require("electron")

const defaultSettings = {
    "keybindings": {},
    "redirectToHttp": false,
    "search": "https://duckduckgo.com/?kae=d&q=",
    "caseSensitiveSearch": true,
    "clearCacheOnQuit": true,
    "clearCookiesOnQuit": false,
    "clearLocalStorageOnQuit": false,
    "suggestCommands": true,
    "allowFollowModeDuringLoad": false,
    "fontSize": 14,
    "digitsRepeatActions": true,
    "adblocker": "static",
    "addTabsNextToCurrentOne": true,
    "notification": {
        "system": false,
        "position": "bottom-right",
        "duration": 6000
    },
    "downloads": {
        "path": "~/Downloads/",
        "method": "automatic",
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
    }
}
let allSettings = {}
const windowstateMessage = "The window state settings are applied on startup,"
    + "therefor they can't be edited with the set command\n"
    + "Instead, open the config file, edit the settings there"
const readOnly = {
    "keybindings": "The keybindings can't be changed with the set command\n"
        + "Instead, open the config file, edit the bindings and "
        + "use the reload command to load them from disk again",
    "tabs.startup": "The startup pages can't be changed with the set command\n"
        + "Instead, open the config file, edit the page list and "
        + "the startup pages will open the next time Vieb is started",
    "windowstate.position": windowstateMessage,
    "windowstate.size": windowstateMessage,
    "windowstate.maximized": windowstateMessage
}
const validOptions = {
    "adblocker": ["off", "static", "update", "custom"],
    "notification.position": [
        "bottom-right", "bottom-left", "top-right", "top-left"
    ],
    "downloads.method": ["automatic", "ask", "confirm"],
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

const checkForValidSetting = (setting, value, castValueFromString=false) => {
    if (get(setting) === undefined) {
        UTIL.notify(`The setting '${setting}' doesn't exist`, "warn")
        return false
    }
    const readOnlyMessage = readOnly[setting]
    if (readOnlyMessage) {
        UTIL.notify(readOnlyMessage, "warn")
        return false
    }
    const expectedType = typeof get(setting)
    if (castValueFromString && typeof value === "string") {
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

const optionallyEnableAdblocker = () => {
    if (allSettings.adblocker !== "off") {
        ipcRenderer.send("enable-adblocker", allSettings.adblocker)
    }
}

const updateDownloadSettingsInMain = () => {
    remote.app.setPath("downloads", expandPath(allSettings.downloads.path))
    ipcRenderer.send("download-settings-change", allSettings.downloads)
}

const loadFromDisk = () => {
    allSettings = JSON.parse(JSON.stringify(defaultSettings))
    const config = path.join(remote.app.getPath("appData"), "viebrc.json")
    if (fs.existsSync(config) && fs.statSync(config).isFile()) {
        try {
            const contents = fs.readFileSync(config).toString()
            const parsed = JSON.parse(contents)
            //TODO loop over the default settings and read them from parsed
        } catch (e) {
            UTIL.notify(
                `The config file located at '${config}' is corrupt`, "err")
        }
    }
    document.body.style.fontSize = `${allSettings.fontSize}px`
    updateDownloadSettingsInMain()
    optionallyEnableAdblocker()
}

const get = setting => {
    if (!setting.includes(".")) {
        return allSettings[setting]
    }
    const [group, config] = setting.split(".")
    if (!allSettings[group]) {
        return undefined
    }
    return allSettings[group][config]
}

const set = (setting, value) => {
    if (checkForValidSetting(setting, value, true)) {
        if (setting.includes(".")) {
            const [group, config] = setting.split(".")
            if (typeof allSettings[group][config] === "boolean") {
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
        } else if (typeof allSettings[setting] === "boolean") {
            allSettings[setting] = value === "true"
        } else if (typeof allSettings[setting] === "number") {
            allSettings[setting] = Number(value)
        } else {
            allSettings[setting] = value
        }
        if (setting === "fontSize") {
            document.body.style.fontSize = `${allSettings.fontSize}px`
        }
        if (setting.startsWith("downloads.")) {
            updateDownloadSettingsInMain()
        }
    }
}

module.exports = {
    init,
    loadFromDisk,
    get,
    set
}
