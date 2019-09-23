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

const {ipcRenderer} = require("electron")

ipcRenderer.on("insert-new-tab-info", (_, sites) => {
    document.body.style.display = "flex"
    if (sites && sites.length > 0) {
        document.getElementById("topsites").innerHTML = ""
    }
    for (const site of sites) {
        const link = document.createElement("a")
        link.href = site.url
        link.textContent = site.name
        link.appendChild(document.createElement("br"))
        const url = document.createElement("small")
        url.textContent = site.url
        link.appendChild(url)
        document.getElementById("topsites").appendChild(link)
    }
})

window.addEventListener("load", () => {
    ipcRenderer.sendToHost("new-tab-info-request")
})
