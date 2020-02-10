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
/* global SETTINGS TABS UTIL */
"use strict"

const {ipcRenderer, remote} = require("electron")
const path = require("path")

const dlsFile = path.join(remote.app.getPath("appData"), "dls")
let downloads = []

const init = () => {
    if (SETTINGS.get("cleardownloadsonquit")) {
        UTIL.deleteFile(dlsFile)
    } else if (UTIL.isFile(dlsFile)) {
        const parsed = UTIL.readJSON(dlsFile)
        for (const download of parsed) {
            if (download.state === "completed") {
                if (!SETTINGS.get("cleardownloadsoncompleted")) {
                    downloads.push(download)
                }
            } else {
                download.state = "cancelled"
                downloads.push(download)
            }
        }
    }
    ipcRenderer.on("downloads-details", (_, details) => {
        // If the download item was already destroyed when it arrived,
        // Try to update the fields with the details from main.
        const info = downloads[downloads.length - 1]
        for (const field of ["name", "url", "total", "file"]) {
            info[field] = info[field] || details[field]
        }
    })
}

const handleDownload = (_, item) => {
    const info = {
        "name": "",
        "url": "",
        "total": 0,
        "file": "",
        "item": item,
        "state": "waiting_to_start",
        "current": 0,
        "date": new Date()
    }
    downloads.push(info)
    try {
        info.name = item.getFilename()
        info.url = item.getURL()
        info.file = item.getSavePath()
        info.total = item.getTotalBytes()
    } catch (err) {
        // When a download is finished before the event is detected by electron,
        // The item will throw an error for all the mapped functions.
    }
    try {
        if (info.name) {
            UTIL.notify(`Download started:\n${info.name}`)
        } else {
            UTIL.notify("Download started")
        }
        item.on("updated", (__, state) => {
            try {
                info.current = item.getReceivedBytes()
                if (state === "progressing" && !item.isPaused()) {
                    info.state = "downloading"
                } else {
                    info.state = "paused"
                }
            } catch (___) {
                // When a download is finished before the event is detected,
                // The item will throw an error for all the mapped functions.
            }
            writeToFile()
        })
        item.once("done", (__, state) => {
            if (state === "completed") {
                info.state = "completed"
                if (SETTINGS.get("cleardownloadsoncompleted")) {
                    downloads = downloads.filter(d => d.state !== "completed")
                }
            } else if (info.state !== "removed") {
                info.state = "cancelled"
            }
            if (info.state === "completed") {
                UTIL.notify(`Download finished:\n${info.name}`)
            } else {
                UTIL.notify(`Download failed:\n${info.name}`, "warn")
            }
        })
    } catch (err) {
        // When a download is finished before the event is detected by electron,
        // The item will throw an error for all the mapped functions.
    }
}

const sendDownloadList = (action, downloadId) => {
    if (action === "removeall") {
        downloads.forEach(download => {
            try {
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
    writeToFile()
    TABS.webContents(TABS.currentPage()).send("download-list", downloads)
}

const writeToFile = () => {
    downloads.forEach(d => {
        // Update downloads that are stuck on waiting to start,
        // But have already been destroyed by electron.
        try {
            d.item.getFilename()
        } catch (e) {
            if (d.state === "waiting_to_start") {
                d.state = "completed"
            }
        }
    })
    if (SETTINGS.get("cleardownloadsonquit") || downloads.length === 0) {
        UTIL.deleteFile(dlsFile)
    } else {
        UTIL.writeJSON(dlsFile, downloads)
    }
}

const cancelAll = () => {
    downloads.forEach(download => {
        try {
            if (download.state !== "completed") {
                download.state = "cancelled"
            }
            download.item.cancel()
        } catch (e) {
            // Download was already removed or is already done
        }
    })
    writeToFile()
}

const removeCompletedIfDesired = () => {
    if (SETTINGS.get("cleardownloadsoncompleted")) {
        downloads = downloads.filter(d => d.state !== "completed")
    }
}

module.exports = {
    init,
    handleDownload,
    sendDownloadList,
    cancelAll,
    removeCompletedIfDesired
}
