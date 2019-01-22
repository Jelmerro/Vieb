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
    "search": "https://duckduckgo.com/?q="
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
        } catch (e) {
            //TODO notify the user that the config is corrupt (not json)
        }
    }
}

const get = () => {
    return allSettings
}

module.exports = {
    init,
    loadFromDisk,
    get
}
