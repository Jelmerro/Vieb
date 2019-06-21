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
/* global SETTINGS TABS UTIL */
"use strict"

const {ipcRenderer} = require("electron")

let unconfirmedDownload = {}

const init = () => {
    ipcRenderer.on("prevented-download", (event, download) => {
        UTIL.notify(`New download request:\n${download.name}\n`
            + "Use :accept or :deny to answer.\nSee :downloads for a list.")
        unconfirmedDownload = download
    })
    ipcRenderer.on("started-download", (event, name) => {
        UTIL.notify(`Download started:\n${name}`)
    })
    ipcRenderer.on("finish-download", (event, name, state) => {
        if (state === "completed") {
            UTIL.notify(`Download finished:\n${name}`)
        } else {
            UTIL.notify(`Download failed:\n${name}`, "warn")
        }
    })
    ipcRenderer.on("download-list", (event, downloads) => {
        TABS.currentPage().getWebContents().send(
            "download-list", downloads, unconfirmedDownload)
    })
}

const downloadFile = (name, url) => {
    ipcRenderer.send("download-confirm", name, url)
    TABS.currentPage().downloadURL(url)
}

const confirmRequest = () => {
    if (SETTINGS.get("downloads.method") !== "confirm") {
        UTIL.notify("Confirm mode is not enabled, there is no need to "
            + "use this command", "warn")
        return
    }
    if (Object.keys(unconfirmedDownload).length > 0) {
        downloadFile(unconfirmedDownload.name, unconfirmedDownload.url)
        unconfirmedDownload = {}
    } else {
        ipcRenderer.send("download-confirm", "", "")
        UTIL.notify("No download requested, nothing to accept/confirm", "warn")
    }
}

const rejectRequest = () => {
    if (SETTINGS.get("downloads.method") !== "confirm") {
        UTIL.notify("Confirm mode is not enabled, there is no need to "
            + "use this command", "warn")
        return
    }
    if (Object.keys(unconfirmedDownload).length === 0) {
        UTIL.notify("No download requested, nothing to deny/reject", "warn")
    }
    ipcRenderer.send("download-confirm", "", "")
    unconfirmedDownload = {}
}

module.exports = {
    init,
    downloadFile,
    confirmRequest,
    rejectRequest
}
