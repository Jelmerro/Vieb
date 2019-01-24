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
const path = require("path")
const { remote } = require("electron")

const defaultSettings = {
    "keybindings": {},
    "redirectToHttp": false,
    "search": "https://duckduckgo.com/?q=",
    "caseSensitiveSearch": true,
    "notification": {
        "system": false,
        "position": "bottom-right",
        "duration": 5000
    }
}
let allSettings = {}

const init = () => {
    loadFromDisk()
}

const loadFromDisk = () => {
    allSettings = JSON.parse(JSON.stringify(defaultSettings))
    const config = path.join(remote.app.getPath("appData"), "viebrc.json")
    if (fs.existsSync(config) && fs.statSync(config).isFile()) {
        const contents = fs.readFileSync(config, {encoding: "utf8"}).toString()
        try {
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
            if (typeof parsed.notification === "object") {
                if (typeof parsed.notification.system === "boolean") {
                    allSettings.notification.system = parsed.notification.system
                }
                const positions = [
                    "bottom-right", "bottom-left", "top-right", "top-left"]
                if (positions.indexOf(parsed.notification.position) !== -1) {
                    allSettings.notification.position =
                        parsed.notification.position
                }
                if (typeof parsed.notification.duration === "number") {
                    allSettings.notification.duration =
                        Math.max(Number(parsed.notification.duration), 100)
                }
            }
        } catch (e) {
            UTIL.notify(
                `The config file located at '${config}' is corrupt`, "err")
        }
    }
}

const get = () => {
    return allSettings
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
            value = "https://" + value
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
    const positions = [
        "bottom-right", "bottom-left", "top-right", "top-left"]
    if (setting === "notification.position") {
        if (positions.indexOf(value) === -1) {
            UTIL.notify("This is an invalid value for this setting, only "
                + "the following options are available: "
                + positions.join(", "), "warn")
        } else {
            allSettings.notification.position = value
        }
        return
    }
    if (setting === "notification.duration") {
        if (/^[0-9]+$/.test(value)) {
            allSettings.notification.duration = Math.max(Number(value), 100)
        } else {
            UTIL.notify("This is an invalid value for this setting, only "
                + "numbers are accepted here", "warn")
        }
        return
    }
    UTIL.notify(`The requested setting '${setting}' does not exist`, "warn")
}

module.exports = {
    init,
    loadFromDisk,
    get,
    set
}
