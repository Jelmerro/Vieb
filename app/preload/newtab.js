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
const {translate} = require("../translate")
const {urlToString} = require("../util")

/**
 * Add a site the the top sites or favorites list.
 * @param {"topsites"|"favorites"} listname
 * @param {{url: string, icon?: string, name: string}} site
 */
const addSiteToList = (listname, site) => {
    const link = document.createElement("a")
    link.href = encodeURI(site.url)
    const icon = document.createElement("img")
    icon.src = site.icon || "../img/empty.png"
    link.append(icon)
    const text = document.createElement("div")
    const title = document.createElement("span")
    title.textContent = site.name
    text.append(title)
    const url = document.createElement("small")
    url.textContent = urlToString(site.url)
    text.append(url)
    link.append(text)
    document.getElementById(listname)?.append(link)
}

ipcRenderer.on("insert-new-tab-info", (_, topsites, favorites) => {
    document.body.style.display = "flex"
    const topsitesEl = document.getElementById("topsites")
    if (topsites?.length && topsitesEl) {
        topsitesEl.style.display = "inline-block"
        const heading = document.createElement("h2")
        heading.textContent = translate("pages.newtab.topsites")
        topsitesEl.textContent = ""
        topsitesEl.append(heading)
        for (const site of topsites) {
            addSiteToList("topsites", site)
        }
    }
    const favoritesEl = document.getElementById("favorites")
    if (favorites?.length && favoritesEl) {
        favoritesEl.style.display = "inline-block"
        const heading = document.createElement("h2")
        heading.textContent = translate("pages.newtab.favorites")
        favoritesEl.textContent = ""
        favoritesEl.append(heading)
        for (const site of favorites) {
            addSiteToList("favorites", site)
        }
    }
})
window.addEventListener("load", () => {
    ipcRenderer.sendToHost("new-tab-info-request")
})
