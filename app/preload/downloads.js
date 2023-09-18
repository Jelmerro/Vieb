/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2023 Jelmer van Arnhem
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

const {ipcRenderer} = require("electron")
const {joinPath, formatDate, formatSize, urlToString} = require("../util")

let lastUpdate = new Date()

/**
 * Send an update to the main thread regarding the download status.
 * @param {"removeall"|"remove"|"pause"|"resume"|null} action
 * @param {number|null} downloadId
 */
const update = (action = null, downloadId = null) => {
    ipcRenderer.send("download-list-request", action, downloadId)
}

window.addEventListener("load", () => {
    const removeAll = document.createElement("img")
    removeAll.id = "remove-all"
    removeAll.style.display = "none"
    removeAll.src = joinPath(__dirname, "../img/trash.png")
    removeAll.addEventListener("click", () => update("removeall"))
    document.body.insertBefore(removeAll, document.body.firstChild)
    lastUpdate = new Date()
    setInterval(update, 500)
    update()
})

/**
 * Add a download to the list.
 * @param {import("../index").downloadItem} download
 * @param {number} id
 */
const addDownload = (download, id) => {
    const element = document.createElement("div")
    element.className = "download"
    // Toggle pause and remove buttons
    const remove = document.createElement("img")
    remove.className = "remove"
    remove.src = joinPath(__dirname, "../img/trash.png")
    remove.addEventListener("click", () => update("remove", id))
    element.append(remove)
    let togglePause = document.createElement("img")
    togglePause.className = "toggle-pause"
    togglePause.src = joinPath(__dirname, "../img/pause.png")
    togglePause.addEventListener("click", () => update("pause", id))
    element.append(togglePause)
    // Title
    const title = document.createElement("div")
    title.title = "Click to open"
    title.textContent = download.name
    title.className = "title"
    element.append(title)
    // Progress
    const progress = document.createElement("progress")
    if (download.current > download.total) {
        progress.max = download.current
    } else {
        progress.max = download.total
    }
    progress.value = download.current
    element.append(progress)
    // Change looks depending on the state
    if (download.state === "completed") {
        title.style.color = "var(--notification-success)"
        progress.style.display = "none"
        togglePause.style.display = "none"
    }
    if (download.state === "cancelled") {
        title.style.color = "var(--notification-error)"
        progress.style.display = "none"
        togglePause.style.display = "none"
    }
    if (download.state === "paused") {
        title.style.color = "var(--notification-warning)"
        togglePause.src = joinPath(__dirname, "../img/resume.png")
        togglePause.parentNode?.replaceChild(
            togglePause.cloneNode(true), togglePause)
        togglePause = document.createElement("img")
        togglePause.addEventListener("click", () => update("resume", id))
    }
    // Other info
    const misc = document.createElement("div")
    misc.className = "misc"
    const state = document.createElement("span")
    state.className = "state"
    state.textContent = download.state
    misc.append(state)
    const downloadUrl = document.createElement("a")
    downloadUrl.href = encodeURI(download.url)
    downloadUrl.textContent = urlToString(download.url)
    misc.append(downloadUrl)
    const file = document.createElement("span")
    file.title = "Click to open"
    file.className = "filelocation"
    file.textContent = download.file
    title.addEventListener("click", () => {
        ipcRenderer.send("open-download", file.textContent)
    })
    file.addEventListener("click", () => {
        ipcRenderer.send("open-download", file.textContent)
    })
    misc.append(file)
    const date = document.createElement("span")
    date.className = "date"
    date.textContent = formatDate(download.date)
    misc.append(date)
    const speed = document.createElement("span")
    speed.className = "speed"
    if (download.total === 0) {
        speed.textContent = formatSize(download.current)
    } else {
        speed.textContent = formatSize(download.total)
    }
    misc.append(speed)
    element.append(misc)
    document.getElementById("list")?.append(element)
}

/**
 * Update a download element with new data.
 * @param {import("../index").downloadItem} download
 * @param {Element} element
 * @param {number} id
 */
const updateDownload = (download, element, id) => {
    const progress = element.querySelector("progress")
    const title = element.querySelector(".title")
    const speedEl = element.querySelector(".speed")
    const downloadUrl = element.querySelector("a")
    let togglePause = element.querySelector(".toggle-pause")
    if (!progress || !title || !speedEl || !downloadUrl || !togglePause) {
        return
    }
    if (!(title instanceof HTMLElement)) {
        return
    }
    // Speed
    const timeSinceUpdate = (new Date().getTime() - lastUpdate.getTime()) / 1000
    const speed = formatSize(
        (download.current - progress.value) / timeSinceUpdate)
    const done = download.state === "completed"
    if (download.total === 0) {
        if (done) {
            speedEl.textContent = formatSize(download.current)
        } else {
            speedEl.textContent
                = `${formatSize(download.current)} / ??? - ${speed}/s`
        }
    } else if (download.current === download.total || done) {
        speedEl.textContent = formatSize(download.total)
    } else if (download.current === progress.value) {
        speedEl.textContent
            = `${formatSize(download.current)} / ${formatSize(download.total)}`
    } else {
        speedEl.textContent
            = `${formatSize(download.current)} / ${formatSize(download.total)}
            - ${speed}/s`
    }
    // Update progress
    if (download.current > download.total) {
        progress.max = download.current
    } else {
        progress.max = download.total
    }
    progress.value = download.current
    // Update other info (for when other downloads are removed)
    title.style.color = ""
    title.textContent = download.name
    downloadUrl.href = download.url
    downloadUrl.textContent = decodeURIComponent(download.url)
    const fileloc = element.querySelector(".filelocation")
    if (fileloc) {
        fileloc.textContent = download.file
    }
    const dateEl = element.querySelector(".date")
    if (dateEl) {
        dateEl.textContent = formatDate(download.date)
    }
    // Change looks depending on the state
    let remove = element.querySelector(".remove")
    remove?.parentNode?.replaceChild(remove.cloneNode(true), remove)
    remove = element.querySelector(".remove")
    remove?.addEventListener("click", () => update("remove", id))
    togglePause.setAttribute("src", joinPath(__dirname, "../img/pause.png"))
    togglePause.parentNode?.replaceChild(
        togglePause.cloneNode(true), togglePause)
    togglePause = element.querySelector(".toggle-pause")
    if (!(togglePause instanceof HTMLElement)) {
        return
    }
    togglePause.addEventListener("click", () => update("pause", id))
    progress.style.display = ""
    togglePause.style.display = ""
    if (download.state === "completed") {
        title.style.color = "var(--notification-success)"
        progress.style.display = "none"
        togglePause.style.display = "none"
    }
    if (download.state === "cancelled") {
        title.style.color = "var(--notification-error)"
        progress.style.display = "none"
        togglePause.style.display = "none"
    }
    if (download.state === "paused") {
        title.style.color = "var(--notification-warning)"
        togglePause.setAttribute("src",
            joinPath(__dirname, "../img/resume.png"))
        togglePause.parentNode?.replaceChild(
            togglePause.cloneNode(true), togglePause)
        togglePause = element.querySelector(".toggle-pause")
        togglePause?.addEventListener("click", () => update("resume", id))
    }
    // State
    const state = element.querySelector(".state")
    if (state) {
        state.textContent = download.state
    }
}

/**
 * Generate the download list based on main info data.
 * @param {Electron.IpcRendererEvent} _
 * @param {string} l
 */
const generateDownloadList = (_, l) => {
    /** @type {import("../index").downloadItem[]} */
    const list = JSON.parse(l)
    // List
    if (list.length === 0) {
        const listEl = document.getElementById("list")
        if (listEl) {
            listEl.textContent = "Nothing has been downloaded yet"
        }
        const removeAll = document.getElementById("remove-all")
        if (removeAll) {
            removeAll.style.display = "none"
        }
        return
    }
    const listOnPage = [...document.querySelectorAll("#list .download")]
    if (listOnPage.length === 0) {
        const listEl = document.getElementById("list")
        if (listEl) {
            listEl.textContent = ""
        }
        const removeAll = document.getElementById("remove-all")
        if (removeAll) {
            removeAll.style.display = ""
        }
    }
    if (listOnPage.length > list.length) {
        for (let i = 0; i < listOnPage.length; i++) {
            if (list[i]) {
                updateDownload(list[i], listOnPage[i], i)
            } else {
                try {
                    document.querySelectorAll("#list .download")[i].remove()
                } catch {
                    // List might be shorter the second time this is called
                }
            }
        }
    } else {
        for (let i = 0; i < list.length; i++) {
            if (listOnPage[i]) {
                updateDownload(list[i], listOnPage[i], i)
            } else {
                addDownload(list[i], i)
            }
        }
    }
    lastUpdate = new Date()
}

ipcRenderer.on("download-list", generateDownloadList)
