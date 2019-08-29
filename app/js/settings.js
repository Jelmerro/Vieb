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
    "notification": {
        "system": false,
        "position": "bottom-right",
        "duration": 5000
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
    }
}
let allSettings = {}

const init = () => {
    loadFromDisk()
}

const expandPath = homePath => {
    if (homePath.startsWith("~")) {
        return homePath.replace("~", os.homedir())
    }
    return homePath
}

const optionallyEnableAdblocker = () => {
    if (allSettings.adblocker !== "off") {
        ipcRenderer.send("enable-adblocker", allSettings.adblocker === "update")
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
            if (typeof parsed.keybindings === "object") {
                allSettings.keybindings = parsed.keybindings
            }
            if (typeof parsed.redirectToHttp === "boolean") {
                allSettings.redirectToHttp = parsed.redirectToHttp
            }
            if (typeof parsed.search === "string") {
                allSettings.search = parsed.search
            }
            if (typeof parsed.caseSensitiveSearch === "boolean") {
                allSettings.caseSensitiveSearch = parsed.caseSensitiveSearch
            }
            if (typeof parsed.clearCacheOnQuit === "boolean") {
                allSettings.clearCacheOnQuit = parsed.clearCacheOnQuit
            }
            if (typeof parsed.clearCookiesOnQuit === "boolean") {
                allSettings.clearCookiesOnQuit = parsed.clearCookiesOnQuit
            }
            if (typeof parsed.clearLocalStorageOnQuit === "boolean") {
                allSettings.clearLocalStorageOnQuit
                    = parsed.clearLocalStorageOnQuit
            }
            if (typeof parsed.suggestCommands === "boolean") {
                allSettings.suggestCommands = parsed.suggestCommands
            }
            if (typeof parsed.allowFollowModeDuringLoad === "boolean") {
                allSettings.allowFollowModeDuringLoad
                    = parsed.allowFollowModeDuringLoad
            }
            if (typeof parsed.fontSize === "number") {
                allSettings.fontSize
                    = Math.min(Math.max(Number(parsed.fontSize), 8), 30)
            }
            if (typeof parsed.digitsRepeatActions === "boolean") {
                allSettings.digitsRepeatActions = parsed.digitsRepeatActions
            }
            if (["off", "static", "update"].includes(parsed.adblocker)) {
                allSettings.adblocker = parsed.adblocker
            }
            if (typeof parsed.notification === "object") {
                if (typeof parsed.notification.system === "boolean") {
                    allSettings.notification.system = parsed.notification.system
                }
                const positions = [
                    "bottom-right", "bottom-left", "top-right", "top-left"
                ]
                if (positions.includes(parsed.notification.position)) {
                    allSettings.notification.position
                        = parsed.notification.position
                }
                if (typeof parsed.notification.duration === "number") {
                    allSettings.notification.duration
                        = Math.max(Number(parsed.notification.duration), 100)
                }
            }
            if (typeof parsed.downloads === "object") {
                if (typeof parsed.downloads.path === "string") {
                    const expandedPath = expandPath(parsed.downloads.path)
                    if (fs.existsSync(expandedPath)) {
                        if (fs.statSync(expandedPath).isDirectory()) {
                            allSettings.downloads.path = expandedPath
                        }
                    }
                }
                const methods = ["automatic", "confirm", "ask"]
                if (methods.includes(parsed.downloads.method)) {
                    allSettings.downloads.method = parsed.downloads.method
                }
                if (typeof parsed.downloads.removeCompleted === "boolean") {
                    allSettings.downloads.removeCompleted
                        = parsed.downloads.removeCompleted
                }
                if (typeof parsed.downloads.clearOnQuit === "boolean") {
                    allSettings.downloads.clearOnQuit
                        = parsed.downloads.clearOnQuit
                }
            }
            if (typeof parsed.history === "object") {
                if (typeof parsed.history.suggest === "boolean") {
                    allSettings.history.suggest = parsed.history.suggest
                }
                if (typeof parsed.history.clearOnQuit === "boolean") {
                    allSettings.history.clearOnQuit = parsed.history.clearOnQuit
                }
                if (typeof parsed.history.storeNewVisits === "boolean") {
                    allSettings.history.storeNewVisits
                        = parsed.history.storeNewVisits
                }
            }
            if (typeof parsed.tabs === "object") {
                if (typeof parsed.tabs.restore === "boolean") {
                    allSettings.tabs.restore = parsed.tabs.restore
                }
                if (typeof parsed.tabs.keepRecentlyClosed === "boolean") {
                    allSettings.tabs.keepRecentlyClosed
                        = parsed.tabs.keepRecentlyClosed
                }
                if (Array.isArray(parsed.tabs.startup)) {
                    for (const url of parsed.tabs.startup) {
                        if (UTIL.isUrl(url)) {
                            allSettings.tabs.startup.push(url)
                        }
                    }
                }
            }
            if (typeof parsed.windowstate === "object") {
                if (typeof parsed.windowstate.position === "boolean") {
                    allSettings.windowstate.position
                        = parsed.windowstate.position
                }
                if (typeof parsed.windowstate.size === "boolean") {
                    allSettings.windowstate.size = parsed.windowstate.size
                }
                if (typeof parsed.windowstate.maximized === "boolean") {
                    allSettings.windowstate.maximized
                        = parsed.windowstate.maximized
                }
            }
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
        return null
    }
    return allSettings[group][config]
}

const set = (setting, value) => {
    setting = setting.toLowerCase()
    if (setting === "keybindings") {
        UTIL.notify("The keybindings can't be changed with the set command\n"
            + "Instead, open the config file, edit the bindings and "
            + "use the reload command to load them from disk again")
        return
    }
    if (setting === "redirecttohttp") {
        if (value === "true") {
            allSettings.redirectToHttp = true
            return
        }
        if (value === "false") {
            allSettings.redirectToHttp = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "search") {
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            value = `https://${value}`
        }
        allSettings.search = value
        return
    }
    if (setting === "casesensitivesearch") {
        if (value === "true") {
            allSettings.caseSensitiveSearch = true
            return
        }
        if (value === "false") {
            allSettings.caseSensitiveSearch = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "clearcacheonquit") {
        if (value === "true") {
            allSettings.clearCacheOnQuit = true
            return
        }
        if (value === "false") {
            allSettings.clearCacheOnQuit = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "clearcookiesonquit") {
        if (value === "true") {
            allSettings.clearCookiesOnQuit = true
            return
        }
        if (value === "false") {
            allSettings.clearCookiesOnQuit = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "clearlocalstorageonquit") {
        if (value === "true") {
            allSettings.clearLocalStorageOnQuit = true
            return
        }
        if (value === "false") {
            allSettings.clearLocalStorageOnQuit = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "suggestcommands") {
        if (value === "true") {
            allSettings.suggestCommands = true
            return
        }
        if (value === "false") {
            allSettings.suggestCommands = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "allowfollowmodeduringload") {
        if (value === "true") {
            allSettings.allowFollowModeDuringLoad = true
            return
        }
        if (value === "false") {
            allSettings.allowFollowModeDuringLoad = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "fontsize") {
        if (/^[0-9]+$/.test(value)) {
            const numberValue = Number(value)
            if (numberValue < 8) {
                UTIL.notify(
                    "The fontsize can not be smaller than 8", "warn")
            } else if (numberValue > 30) {
                UTIL.notify(
                    "The fontsize can not be larger than 30", "warn")
            } else {
                allSettings.fontSize = numberValue
                document.body.style.fontSize = `${numberValue}px`
            }
        } else {
            UTIL.notify("This is an invalid value for this setting, only "
                + "numbers are accepted here", "warn")
        }
        return
    }
    if (setting === "digitsrepeatactions") {
        if (value === "true") {
            allSettings.digitsRepeatActions = true
            return
        }
        if (value === "false") {
            allSettings.digitsRepeatActions = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "adblocker") {
        UTIL.notify("The adblocker can't be enabled or disabled when running"
            + "\nInstead, open the config file, edit the setting there")
        return
    }
    if (setting === "notification.system") {
        if (value === "true") {
            allSettings.notification.system = true
            return
        }
        if (value === "false") {
            allSettings.notification.system = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    const positions = ["bottom-right", "bottom-left", "top-right", "top-left"]
    if (setting === "notification.position") {
        if (positions.includes(value)) {
            allSettings.notification.position = value
        } else {
            UTIL.notify(`${"This is an invalid value for this setting, only "
                + "the following options are available: "}
                ${positions.join(", ")}`, "warn")
        }
        return
    }
    if (setting === "notification.duration") {
        if (/^[0-9]+$/.test(value)) {
            const numberValue = Number(value)
            if (numberValue < 100) {
                UTIL.notify(
                    "The duration must be at least a 100 milliseconds", "warn")
            } else {
                allSettings.notification.duration = numberValue
            }
        } else {
            UTIL.notify("This is an invalid value for this setting, only "
                + "numbers are accepted here", "warn")
        }
        return
    }
    if (setting === "downloads.path") {
        const expandedPath = expandPath(value)
        if (fs.existsSync(expandedPath)) {
            if (fs.statSync(expandedPath).isDirectory()) {
                allSettings.downloads.path = expandedPath
                updateDownloadSettingsInMain()
            } else {
                UTIL.notify("The given path is not a directory", "warn")
            }
        } else {
            UTIL.notify("The given path does not exist", "warn")
        }
        return
    }
    if (setting === "downloads.method") {
        const options = ["ask", "automatic", "confirm"]
        if (options.includes(value)) {
            allSettings.downloads.method = value
            updateDownloadSettingsInMain()
        } else {
            UTIL.notify(`The download method must be one of:\n
                ${options.join(", ")}`, "warn")
        }
        return
    }
    if (setting === "downloads.removecompleted") {
        if (value === "true") {
            allSettings.downloads.removeCompleted = true
            updateDownloadSettingsInMain()
            return
        }
        if (value === "false") {
            allSettings.downloads.removeCompleted = false
            updateDownloadSettingsInMain()
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "downloads.clearonquit") {
        if (value === "true") {
            allSettings.downloads.clearOnQuit = true
            updateDownloadSettingsInMain()
            return
        }
        if (value === "false") {
            allSettings.downloads.clearOnQuit = false
            updateDownloadSettingsInMain()
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "history.suggest") {
        if (value === "true") {
            allSettings.history.suggest = true
            return
        }
        if (value === "false") {
            allSettings.history.suggest = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "history.clearonquit ") {
        if (value === "true") {
            allSettings.history.clearOnQuit = true
            return
        }
        if (value === "false") {
            allSettings.history.clearOnQuit = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "history.storenewvisits") {
        if (value === "true") {
            allSettings.history.storeNewVisits = true
            return
        }
        if (value === "false") {
            allSettings.history.storeNewVisits = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "tabs.restore") {
        if (value === "true") {
            allSettings.tabs.restore = true
            return
        }
        if (value === "false") {
            allSettings.tabs.restore = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "tabs.keeprecentlyclosed") {
        if (value === "true") {
            allSettings.tabs.keepRecentlyClosed = true
            return
        }
        if (value === "false") {
            allSettings.tabs.keepRecentlyClosed = false
            return
        }
        UTIL.notify("This is an invalid value for this setting, only "
            + "true and false are accepted here", "warn")
        return
    }
    if (setting === "tabs.startup") {
        UTIL.notify("The startup pages can't be changed with the set command\n"
            + "Instead, open the config file, edit the page list and "
            + "the startup pages will open the next time Vieb is started")
        return
    }
    const states = [
        "windowstate.position",
        "windowstate.size",
        "windowstate.maximized"
    ]
    if (states.includes(setting)) {
        UTIL.notify("The window state settings are applied on startup,"
            + "therefor they can't be edited with the set command\n"
            + "Instead, open the config file, edit the settings there")
    }
    UTIL.notify(`The requested setting '${setting}' does not exist`, "warn")
}

module.exports = {
    init,
    loadFromDisk,
    get,
    set
}
