/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2021 Jelmer van Arnhem
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

window.addEventListener("DOMContentLoaded", () => {
    ipcRenderer.on("notification-history", (_, notifications) => {
        document.getElementById("list").innerHTML = ""
        notifications.forEach(notification => {
            const element = document.createElement("div")
            element.className = "notification"
            if (notification.click?.type === "download-success") {
                element.classList.add("filelocation")
                element.title = "Click to open"
                element.addEventListener("click", () => {
                    ipcRenderer.send("open-download", notification.click.path)
                })
            }
            const date = document.createElement("div")
            const {formatDate} = require("./util")
            date.textContent = formatDate(notification.date)
            date.className = "date"
            element.appendChild(date)
            const contents = document.createElement("div")
            contents.innerHTML = notification.message
            contents.className = notification.type
            element.appendChild(contents)
            document.getElementById("list").appendChild(element)
        })
        if (document.getElementById("list").innerHTML === "") {
            document.getElementById("list").textContent
                = "There have been no notifications so far"
        }
    })
})
