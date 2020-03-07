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
/* global DOWNLOADS SETTINGS UTIL */
"use strict"

const {ipcRenderer, remote} = require("electron")
const path = require("path")
const fs = require("fs")
const https = require("https")

const blocklistDir = path.join(remote.app.getPath("appData"), "blocklists")
const defaultBlocklists = {
    "easylist": "https://easylist.to/easylist/easylist.txt",
    "easyprivacy": "https://easylist.to/easylist/easyprivacy.txt"
}
const sessions = {}

const init = () => {
    UTIL.clearContainerTabs()
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
    const permissionName = `permission${permission.toLowerCase()}`
    const setting = SETTINGS.get(permissionName)
    if (setting === "ask") {
        let url = details.requestingUrl
        if (url.length > 100) {
            url = url.replace(/.{50}/g, "$&\n")
        }
        let message = "The page has requested access to the permission "
            + `'${permission}'. You can allow or deny this below, `
            + "and choose if you want to make this the default for "
            + "the current session when sites ask for this permission."
            + " You can always change this using the settings file,"
            + " or at runtime with the set command like so: "
            + `'set ${permissionName}=<value>'\n\npage:\n${url}`
        if (permission === "openExternal") {
            let exturl = details.externalURL
            if (exturl.length > 100) {
                exturl = exturl.replace(/.{50}/g, "$&\n")
            }
            message = "The page has requested to open an external application."
                + " You can allow or deny this below, and choose if you want to"
                + " make this the default for the current session when sites "
                + "ask to open urls in external programs. You can always change"
                + " this using the settings file, or at runtime with the set "
                + "command like so: 'set permissionopenexternal=<value>\n\n"
                + `page:\n${details.requestingUrl}\n\nexternal:\n${exturl}`
        }
        remote.dialog.showMessageBox(remote.getCurrentWindow(), {
            "type": "question",
            "buttons": ["Allow", "Deny"],
            "defaultId": 0,
            "cancelId": 1,
            "checkboxLabel": "Remember for this session",
            "title": `Allow this page to access '${permission}'?`,
            "message": message
        }).then(e => {
            callback(e.response === 0)
            if (e.checkboxChecked) {
                if (e.response === 0) {
                    SETTINGS.set(permissionName, "allow")
                } else {
                    SETTINGS.set(permissionName, "block")
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
    applyDevtoolsSettings(name.split(":")[1] || name)
    const session = remote.session.fromPartition(name, {
        "cache": SETTINGS.get("cache") !== "none"
    })
    session.setPermissionRequestHandler(permissionHandler)
    if (SETTINGS.get("adblocker") !== "off") {
        ipcRenderer.send("adblock-enable", [name])
    }
    session.on("will-download", DOWNLOADS.handleDownload)
    ipcRenderer.send("downloads-path-for-session", name)
    sessions[name] = session
}

const applyDevtoolsSettings = session => {
    const sessionFolder = path.join(
        remote.app.getPath("appData"), "Partitions", session)
    const preferencesFile = path.join(sessionFolder, "Preferences")
    try {
        fs.mkdirSync(sessionFolder)
    } catch (e) {
        // Directory probably already exists
    }
    let preferences = UTIL.readJSON(preferencesFile)
    if (!preferences) {
        preferences = {}
    }
    if (!preferences.electron) {
        preferences.electron = {}
    }
    if (!preferences.electron.devtools) {
        preferences.electron.devtools = {}
    }
    if (!preferences.electron.devtools.preferences) {
        preferences.electron.devtools.preferences = {}
    }
    // Disable source maps as they leak internal structure to the webserver
    preferences.electron.devtools.preferences.cssSourceMapsEnabled = false
    preferences.electron.devtools.preferences.jsSourceMapsEnabled = false
    // Disable release notes, most are not relevant for Vieb
    preferences.electron.devtools.preferences["help.show-release-note"] = false
    // Show timestamps in the console
    preferences.electron.devtools.preferences.consoleTimestampsEnabled = true
    // Enable dark theme
    preferences.electron.devtools.preferences.uiTheme = "\"dark\""
    UTIL.writeJSON(preferencesFile, preferences)
}

const disableAdblocker = () => {
    ipcRenderer.send("adblock-disable", Object.keys(sessions))
}

const recreateAdblocker = () => {
    ipcRenderer.send("adblock-recreate", Object.keys(sessions))
}

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
                fs.copyFileSync(list, path.join(blocklistDir, `${name}.txt`))
            } catch (e) {
                UTIL.notify(`Failed to copy ${name}`, "err")
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
                        recreateAdblocker()
                    } catch (e) {
                        UTIL.notify(`Failed to update ${list}`, "err")
                    }
                })
                res.on("data", chunk => {
                    body += chunk
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

const setSpellLang = lang => {
    Object.keys(sessions).forEach(ses => {
        if (lang === "system") {
            remote.session.fromPartition(ses).setSpellCheckerLanguages([])
        } else {
            remote.session.fromPartition(ses).setSpellCheckerLanguages([lang])
        }
    })
}

module.exports = {init, create, enableAdblocker, disableAdblocker, setSpellLang}
