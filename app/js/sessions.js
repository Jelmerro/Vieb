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
/* global DOWNLOADS SETTINGS UTIL */
"use strict"

const {ipcRenderer, remote} = require("electron")
const path = require("path")
const fs = require("fs")
const https = require("https")

const sessions = {}

const init = () => {
    enableAdblocker()
    create("persist:main")
}

const permissionHandler = (_, permission, callback, details) => {
    if (permission === "media") {
        if (details.mediaTypes && details.mediaTypes.includes("video")) {
            permission = "camera"
        } else {
            permission = "microphone"
        }
    }
    const setting = SETTINGS.get(`permissions.${permission}`)
    if (setting === "ask") {
        remote.dialog.showMessageBox(remote.getCurrentWindow(), {
            "type": "question",
            "buttons": ["Allow", "Deny"],
            "defaultId": 0,
            "cancelId": 1,
            "checkboxLabel": "Remember for this session",
            "title": `Allow this page to access '${permission}'?`,
            "message": "The page has requested access to the permission "
                + `'${permission}'. You can allow or deny this below, `
                + "and choose if you want to make this the default for "
                + "the current session when sites ask for this permission."
                + " You can always change this using the settings file,"
                + " or at runtime with the set command like so: "
                + "'set permissions.<name>=<value>'"
        }).then(e => {
            callback(e.response === 0)
            if (e.checkboxChecked) {
                if (e.response === 0) {
                    SETTINGS.set(`permissions.${permission}`, "allow")
                } else {
                    SETTINGS.set(`permissions.${permission}`, "block")
                }
            }
        })
    } else {
        callback(setting === "allow")
    }
}

const create = name => {
    if (Object.keys(sessions).includes(name)) {
        return
    }
    const session = remote.session.fromPartition(name, {
        cache: SETTINGS.get("cache") !== "none"
    })
    session.setPermissionRequestHandler(permissionHandler)
    if (SETTINGS.get("adblocker") !== "off") {
        ipcRenderer.send("adblock-enable", [name])
    }
    session.on("will-download", DOWNLOADS.handleDownload)
    ipcRenderer.send("downloads-path-for-session", name)
    sessions[name] = session
}

const disableAdblocker = () => {
    ipcRenderer.send("adblock-disable", Object.keys(sessions))
}

const recreateAdblocker = () => {
    ipcRenderer.send("adblock-recreate", Object.keys(sessions))
}

const defaultBlocklists = {
    "easylist": "https://easylist.to/easylist/easylist.txt",
    "easyprivacy": "https://easylist.to/easylist/easyprivacy.txt"
}

const enableAdblocker = () => {
    const blocklistsFolder = path.join(
        remote.app.getPath("appData"), "blocklists")
    try {
        fs.mkdirSync(blocklistsFolder)
    } catch (e) {
        // Directory probably already exists
    }
    // Copy the default and included blocklists to the appdata folder
    if (SETTINGS.get("adblocker") !== "custom") {
        for (const list of Object.keys(defaultBlocklists)) {
            copyBlocklist(list)
        }
    }
    // And update default blocklists to the latest version if enabled
    if (SETTINGS.get("adblocker") === "update") {
        for (const list of Object.keys(defaultBlocklists)) {
            UTIL.notify(`Updating ${list} to the latest version`)
            const req = https.request(defaultBlocklists[list], res => {
                let body = ""
                res.on("data", chunk => {
                    body += chunk
                })
                res.on("end", () => {
                    try {
                        fs.writeFileSync(
                            path.join(blocklistsFolder, `${list}.txt`), body)
                        recreateAdblocker()
                    } catch (e) {
                        UTIL.notify(`Failed to update ${list}`, "err")
                    }
                })
            })
            req.on("error", () => {
                UTIL.notify(`Failed to update ${list}`, "err")
            })
            req.end()
        }
    } else {
        recreateAdblocker()
    }
}

const copyBlocklist = name => {
    const packagedName = path.join(__dirname, `../blocklists/${name}.txt`)
    const appdataName = path.join(
        remote.app.getPath("appData"), `blocklists/${name}.txt`)
    try {
        fs.copyFileSync(packagedName, appdataName)
    } catch (e) {
        UTIL.notify(`Failed to copy ${name}`, "err")
    }
}

module.exports = {
    init,
    create,
    enableAdblocker,
    disableAdblocker
}