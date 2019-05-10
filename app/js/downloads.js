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

const {ipcRenderer, remote} = require("electron")

let unconfirmedDownload = {}
let downloads = []

const init = () => {
    //TODO load downloads from previous sessions, requires some sort of history
    ipcRenderer.on("prevented-download", (event, download) => {
        UTIL.notify(`New download request:\n${download.name}\n`
            + "Use :accept or :deny to answer.\nSee :downloads for a list.")
        unconfirmedDownload = download
    })
    remote.session.defaultSession.on("will-download", (event, item) => {
        if (item.isDestroyed()) {
            return
        }
        const info = {
            item: item,
            state: "waiting_to_start",
            url: item.getURL(),
            total: item.getTotalBytes(),
            current: 0,
            file: item.getSavePath(),
            name: item.getFilename(),
            date: new Date()
        }
        downloads.push(info)
        UTIL.notify(`Download started:\n${info.name}`)
        item.on("updated", (_event, state) => {
            try {
                info.current = item.getReceivedBytes()
                if (state === "progressing" && !item.isPaused()) {
                    info.state = "downloading"
                } else {
                    info.state = "paused"
                }
            } catch (e) {
                //Download is done and the item is destroyed automatically
                info.state = "cancelled"
            }
        })
        item.once("done", (_event, state) => {
            if (state === "completed") {
                UTIL.notify(`Download complete:\n${info.name}`)
                info.state = "completed"
            } else if (info.state !== "removed") {
                UTIL.notify(`Download failed:\n${info.name}`, "warn")
                info.state = "cancelled"
            }
        })
    })
}

const downloadFile = (name, downloadUrl) => {
    ipcRenderer.send("download-confirm-url", downloadUrl)
    const escapedUrl = downloadUrl.replace(/"/g, '\\"')
    const escapedName = name.replace(/"/g, '\\"')
    TABS.currentPage().executeJavaScript(`
        window.anchorDownloadElement = document.createElement("a")
        window.anchorDownloadElement.href = "${escapedUrl}"
        window.anchorDownloadElement.download = "${escapedName}"
        document.body.appendChild(window.anchorDownloadElement)
        window.anchorDownloadElement.click()
        document.body.removeChild(window.anchorDownloadElement)
        window.anchorDownloadElement = undefined`)
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
        ipcRenderer.send("download-confirm-url", "")
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
    ipcRenderer.send("download-confirm-url", "")
    unconfirmedDownload = {}
}

const sendDownloadList = (action, downloadId) => {
    if (action === "removeall") {
        downloads.forEach(download => {
            try {
                download.state = "removed"
                download.item.cancel()
            } catch (e) {
                // Download was already removed or is already done
            }
        })
        downloads = []
    }
    if (action === "pause") {
        try {
            downloads[downloadId].item.pause()
        } catch (e) {
            // Download just finished or some other silly reason
        }
    }
    if (action === "resume") {
        try {
            downloads[downloadId].item.resume()
        } catch (e) {
            // Download can't be resumed
        }
    }
    if (action === "remove") {
        try {
            downloads[downloadId].state = "removed"
            downloads[downloadId].item.cancel()
        } catch (e) {
            // Download was already removed from the list or something
        }
        try {
            downloads.splice(downloadId, 1)
        } catch (e) {
            // Download was already removed from the list or something
        }
    }
    if (Object.keys(unconfirmedDownload).length === 0) {
        TABS.currentPage().getWebContents().send("download-list", downloads)
    } else if (SETTINGS.get("downloads.method") === "confirm") {
        TABS.currentPage().getWebContents().send(
            "download-list", downloads, unconfirmedDownload)
    } else {
        TABS.currentPage().getWebContents().send("download-list", downloads)
    }
}

module.exports = {
    init,
    confirmRequest,
    rejectRequest,
    sendDownloadList
}
