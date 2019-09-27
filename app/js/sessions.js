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
/* global DOWNLOADS SETTINGS */
"use strict"

const {ipcRenderer, remote} = require("electron")
const path = require("path")
const fs = require("fs")
const {ElectronBlocker} = require("@cliqz/adblocker-electron")

const sessions = {}
let blocker = null

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

const init = () => {
    create("persist:main")
}

const create = name => {
    if (Object.keys(sessions).includes(name)) {
        return
    }
    const session = remote.session.fromPartition(name, {
        cache: SETTINGS.get("cache") === "none"
    })
    session.setPermissionRequestHandler(permissionHandler)
    if (SETTINGS.get("adblocker") !== "off") {
        enableAdblocker(session)
    }
    session.on("will-download", DOWNLOADS.handleDownload)
    ipcRenderer.send("set-download-path-for-session", name)
    sessions[name] = session
}

const loadBlocklist = file => {
    const appdataName = path.join(
        remote.app.getPath("appData"), `blocklists/${file}`)
    try {
        return `${fs.readFileSync(appdataName).toString()}\n`
    } catch (e) {
        return ""
    }
}

const createBlocker = () => {
    const blocklistsFolder = path.join(
        remote.app.getPath("appData"), "blocklists")
    // Read all filter files from the blocklists folder (including user added)
    let filters = ""
    try {
        for (const file of fs.readdirSync(blocklistsFolder)) {
            if (file.endsWith(".txt")) {
                filters += loadBlocklist(file)
            }
        }
    } catch (e) {
        console.log("Failed to read the files from blocklists folder", e)
    }
    return ElectronBlocker.parse(filters)
}

const enableAdblocker = (session=null) => {
    try {
        if (session) {
            if (!blocker) {
                blocker = createBlocker()
            }
            blocker.enableBlockingInSession(session)
        } else {
            // Recreate blocker to reload filters
            blocker = createBlocker()
            Object.values(sessions).forEach(
                s => blocker.enableBlockingInSession(s))
        }
    } catch (e) {
        console.log("Failed to initialize adblocker", e)
    }
}

const disableAdblocker = (session=null) => {
    if (!blocker) {
        return
    }
    if (session) {
        blocker.disableBlockingInSession(session)
    } else {
        Object.values(sessions).forEach(
            s => blocker.disableBlockingInSession(s))
    }
}

module.exports = {
    init,
    create,
    enableAdblocker,
    disableAdblocker
}
