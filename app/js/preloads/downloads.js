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

const { ipcRenderer } = require("electron")

ipcRenderer.sendToHost("download-list-request")
setInterval(() => {
    ipcRenderer.sendToHost("download-list-request")
}, 500)

ipcRenderer.on("download-list", (e, list) => {
    const listOnPage = [...document.querySelectorAll("#list .download")]
    if (listOnPage.length === 0) {
        if (list.length === 0) {
            document.getElementById("list").textContent =
                "Nothing has been downloaded during the current session."
        } else {
            document.getElementById("list").textContent = ""
        }
    }
    for (let i = 0;i < list.length;i++) {
        if (listOnPage[i] === undefined) {
            addDownload(list[i])
        } else {
            updateDownload(list[i], listOnPage[i])
        }
    }
})

const addDownload = download => {
    const element = document.createElement("div")
    element.className = "download"
    // title
    const title = document.createElement("div")
    title.textContent = download.name
    title.className = "title"
    element.appendChild(title)
    // progress
    const progress = document.createElement("progress")
    if (download.current > download.total) {
        progress.max = download.current
    } else {
        progress.max = download.total
    }
    progress.value = download.current
    element.appendChild(progress)
    if (download.state === "completed") {
        progress.style.display = "none"
    }
    // other info
    const misc = document.createElement("div")
    misc.className = "misc"
    const state = document.createElement("span")
    state.className = "state"
    state.textContent = download.state
    misc.appendChild(state)
    const downloadUrl = document.createElement("a")
    downloadUrl.href = download.url
    downloadUrl.textContent = decodeURIComponent(download.url)
    misc.appendChild(downloadUrl)
    const file = document.createElement("span")
    file.textContent = download.file
    misc.appendChild(file)
    const date = document.createElement("span")
    date.textContent = formatDate(download.date)
    misc.appendChild(date)
    const speed = document.createElement("span")
    speed.className = "speed"
    if (download.total === 0) {
        speed.textContent = formatSize(download.current)
    } else {
        speed.textContent = formatSize(download.total)
    }
    misc.appendChild(speed)
    element.appendChild(misc)
    document.getElementById("list").appendChild(element)
}

const updateDownload = (download, element) => {
    const progress = element.querySelector("progress")
    // speed
    const speed = formatSize((download.current - progress.value) * 2)
    const done = download.state === "completed"
    if (download.total === 0) {
        if (done) {
            element.querySelector(".speed").textContent =
                formatSize(download.current)
        } else {
            element.querySelector(".speed").textContent =
                `${formatSize(download.current)} / ??? - ${speed}/s`
        }
    } else if (download.current === download.total || done) {
        element.querySelector(".speed").textContent = formatSize(download.total)
    } else if (download.current === progress.value) {
        element.querySelector(".speed").textContent =
            `${formatSize(download.current)} / ${formatSize(download.total)}`
    } else {
        element.querySelector(".speed").textContent =
            `${formatSize(download.current)} / ${formatSize(download.total)}
            - ${speed}/s`
    }
    // progress
    if (download.current > download.total) {
        progress.max = download.current
    } else {
        progress.max = download.total
    }
    progress.value = download.current
    if (download.state === "completed") {
        progress.style.display = "none"
    }
    // state
    element.querySelector(".state").textContent = download.state
}

const formatDate = date => {
    if (typeof date === "string") {
        date = new Date(date)
    }
    return `${date.toISOString().slice(0, -14)}
        ${date.toTimeString().slice(0, 8)}`
}

const formatSize = size => {
    if (size < 1024) {
        return size + " B"
    }
    const exp = Math.floor(Math.log(size) / Math.log(1024))
    return `${(size / Math.pow(1024, exp)).toFixed(2)} ${"KMGTPE"[exp - 1]}B`
}
