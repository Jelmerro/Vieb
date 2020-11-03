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
/* global SETTINGS UTIL */
"use strict"

const {ipcRenderer} = require("electron")
const path = require("path")
const fs = require("fs")
const https = require("https")

const blocklistDir = path.join(UTIL.appData(), "blocklists")
const defaultBlocklists = {
    "easylist": "https://easylist.to/easylist/easylist.txt",
    "easyprivacy": "https://easylist.to/easylist/easyprivacy.txt"
}

const init = () => {
    UTIL.clearTempContainers()
    enableAdblocker()
    create("main")
    ipcRenderer.on("notify", (_, message, type) => UTIL.notify(message, type))
}

const create = name => {
    ipcRenderer.send("create-session", `persist:${name}`,
        SETTINGS.get("adblock"), SETTINGS.get("cache") !== "none")
}

const disableAdblocker = () => ipcRenderer.send("adblock-disable")

const enableAdblocker = () => {
    try {
        fs.mkdirSync(blocklistDir)
    } catch (e) {
        // Directory probably already exists
    }
    // Copy the default and included blocklists to the appdata folder
    if (SETTINGS.get("adblocker") !== "custom") {
        for (const name of Object.keys(defaultBlocklists)) {
            const list = path.join(__dirname, `../blocklists/${name}.txt`)
            try {
                // File is read and written separately to discard permission
                const body = fs.readFileSync(list)
                fs.writeFileSync(path.join(blocklistDir, `${name}.txt`), body)
            } catch (e) {
                const msg = e.message || e
                UTIL.notify(`Failed to copy ${name}:\n${msg}`, "err")
            }
        }
    }
    // And update default blocklists to the latest version if enabled
    if (SETTINGS.get("adblocker") === "update") {
        for (const list of Object.keys(defaultBlocklists)) {
            UTIL.notify(`Updating ${list} to the latest version`)
            const req = https.request(defaultBlocklists[list], res => {
                let body = ""
                res.on("end", () => {
                    try {
                        fs.writeFileSync(
                            path.join(blocklistDir, `${list}.txt`), body)
                        ipcRenderer.send("adblock-enable")
                    } catch (e) {
                        const msg = e.message || e
                        UTIL.notify(`Failed to update ${list}:\n${msg}`, "err")
                    }
                })
                res.on("data", chunk => {
                    body += chunk
                })
            })
            req.on("error", e => {
                UTIL.notify(`Failed to update ${list}:\n${e.message}`, "err")
            })
            req.end()
        }
    } else if (SETTINGS.get("adblocker") !== "off") {
        ipcRenderer.send("adblock-enable")
    }
}

const setSpellLang = lang => ipcRenderer.send("set-spelllang", lang)

module.exports = {init, create, enableAdblocker, disableAdblocker, setSpellLang}
