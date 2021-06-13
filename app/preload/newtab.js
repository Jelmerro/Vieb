/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2021 Jelmer van Arnhem
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
const {urlToString} = require("../util")

const addSiteToList = (listname, site) => {
    const link = document.createElement("a")
    link.href = encodeURI(site.url)
    const icon = document.createElement("img")
    icon.src = site.icon || "../img/empty.png"
    link.appendChild(icon)
    const text = document.createElement("div")
    const title = document.createElement("span")
    title.textContent = site.name
    text.appendChild(title)
    const url = document.createElement("small")
    url.textContent = urlToString(site.url)
    text.appendChild(url)
    link.appendChild(text)
    document.getElementById(listname).appendChild(link)
}

ipcRenderer.on("insert-new-tab-info", (_, topsites, favorites) => {
    document.body.style.display = "flex"
    if (topsites) {
        document.getElementById("topsites").style.display = "inline-block"
        if (topsites.length) {
            document.getElementById("topsites").innerHTML = "<h2>Top sites</h2>"
            for (const site of topsites) {
                addSiteToList("topsites", site)
            }
        }
    }
    if (favorites.length) {
        document.getElementById("favorites").style.display = "inline-block"
        document.getElementById("favorites").innerHTML = "<h2>Favorites</h2>"
        for (const site of favorites) {
            addSiteToList("favorites", site)
        }
    }
})

window.addEventListener("load", () => {
    ipcRenderer.sendToHost("new-tab-info-request")
})
