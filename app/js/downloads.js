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

const {remote} = require("electron")
const path = require("path")
const fs = require("fs")

const dlsFile = path.join(remote.app.getPath("appData"), "dls")
let downloads = []
let downloadCounter = 0

const init = () => {
    if (SETTINGS.get("downloads.clearOnQuit")) {
        try {
            fs.unlinkSync(dlsFile)
        } catch (e) {
            // Failed to delete, might not exist
        }
    } else if (fs.existsSync(dlsFile) && fs.statSync(dlsFile).isFile()) {
        try {
            const contents = fs.readFileSync(dlsFile).toString()
            const parsed = JSON.parse(contents)
            for (const download of parsed) {
                if (download.state === "completed") {
                    if (!SETTINGS.get("downloads.removeCompleted")) {
                        downloads.push(download)
                    }
                } else {
                    download.state = "cancelled"
                    downloads.push(download)
                }
            }
        } catch (e) {
            // No downloads file yet
        }
    }
}

const handleDownload = (e, item) => {
    downloadCounter += 1
    const downloadIndex = Number(downloadCounter)
    try {
        const info = {
            index: downloadIndex,
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
            } catch (_e) {
                // The download was already destroyed automatically by electron,
                // therefor we simply remove it from the list to avoid confusion
                downloads = downloads.filter(d => d.id !== downloadIndex)
            }
            writeToFile()
        })
        item.once("done", (_event, state) => {
            if (state === "completed") {
                info.state = "completed"
                if (SETTINGS.get("downloads.removeCompleted")) {
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
        // the item will throw an error for all the mapped functions.
        UTIL.notify("Download finished")
        downloads = downloads.filter(d => d.id !== downloadIndex)
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
    TABS.currentPage().getWebContents().send("download-list", downloads)
}

const writeToFile = () => {
    downloads = downloads.filter(d => {
        // Remove downloads that are stuck on waiting to start,
        // but have already been destroyed by electron.
        try {
            d.item.getFilename()
        } catch (_) {
            return d.state !== "waiting_to_start"
        }
        return true
    })
    if (SETTINGS.get("downloads.clearOnQuit")) {
        try {
            fs.unlinkSync(dlsFile)
        } catch (e) {
            //Failed to delete, might not exist
        }
    } else {
        try {
            fs.writeFileSync(dlsFile, JSON.stringify(downloads))
        } catch (e) {
            //Failed to write, try again later
        }
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
    if (SETTINGS.get("downloads.removeCompleted")) {
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
