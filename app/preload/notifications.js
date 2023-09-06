/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2023 Jelmer van Arnhem
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
const {formatDate} = require("../util")

window.addEventListener("DOMContentLoaded", () => {
    /**
     * Show the list of notifications.
     * @param {Electron.IpcRendererEvent} _
     * @param {import("../util").notificationHistory} notifications
     */
    const showNofitications = (_, notifications) => {
        const listEl = document.getElementById("list")
        if (!listEl) {
            return
        }
        listEl.textContent = ""
        notifications.forEach(notification => {
            const element = document.createElement("div")
            element.className = "notification"
            if (notification.click?.type === "download-success") {
                element.classList.add("filelocation")
                element.title = "Click to open"
                element.addEventListener("click", () => {
                    ipcRenderer.send("open-download", notification.click?.path)
                })
            }
            const date = document.createElement("div")
            date.textContent = formatDate(notification.date)
            date.className = "date"
            element.append(date)
            const contents = document.createElement("div")
            contents.innerHTML = notification.message
            contents.className = notification.type
            element.append(contents)
            listEl.append(element)
        })
        if (listEl.textContent === "") {
            listEl.textContent = "There have been no notifications so far"
        }
    }

    ipcRenderer.on("notification-history", showNofitications)
})
