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
"use strict"

const fs = require("fs")
const path = require("path")
const { remote } = require("electron")

const defaultSettings = {
    "keybindings": {},
    "redirectToHttp": false,
    "search": "https://duckduckgo.com/?q=",
    "caseSensitiveSearch": true
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
        } catch (e) {
            //TODO notify the user that the config is corrupt (not json)
        }
    }
}

const get = () => {
    return allSettings
}

const set = (setting, value) => {
    setting = setting.toLowerCase()
    if (setting === "keybindings") {
        //TODO notify the user that these can't be changed with the set command
        //Refer to the viebrc.json file and the reload command
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
        //TODO notify the user that the value is not valid for this setting
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
        //TODO notify the user that the value is not valid for this setting
        return
    }
    //TODO notify that the chosen setting does not exist
}

module.exports = {
    init,
    loadFromDisk,
    get,
    set
}
