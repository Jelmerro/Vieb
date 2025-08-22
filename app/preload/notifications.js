/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2025 Jelmer van Arnhem
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

import {ipcRenderer} from "electron"
import {translate} from "../translate.js"
import {formatDate} from "../util.js"

/** Translate page and listener for notification info to populate the list. */
const init = () => {
    const h1 = document.querySelector("h1")
    if (h1) {
        h1.textContent = translate("pages.notifications.title")
    }
    const list = document.getElementById("list")
    if (!list) {
        return
    }
    list.textContent = translate("pages.notifications.loading")

    /**
     * Show the list of notifications.
     * @param {Electron.IpcRendererEvent} _
     * @param {import("../preloadutil.js").notificationHistory} notifications
     */
    const showNofitications = (_, notifications) => {
        list.textContent = ""
        notifications.forEach(notification => {
            const element = document.createElement("div")
            element.className = "notification"
            if (notification.click?.type === "download-success") {
                element.classList.add("filelocation")
                element.title = translate("pages.notifications.clickToOpen")
                element.addEventListener("click", () => {
                    ipcRenderer.send("open-download", notification.click?.path)
                })
            }
            const date = document.createElement("div")
            date.textContent = formatDate(notification.date)
            date.className = "date"
            element.append(date)
            const contents = document.createElement("div")
            contents.textContent = notification.message
            contents.className = notification.type
            element.append(contents)
            list.prepend(element)
        })
        if (list.textContent === "") {
            list.textContent = translate("pages.notifications.empty")
        }
    }

    ipcRenderer.on("notification-history", showNofitications)
}

if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init)
} else {
    init()
}
