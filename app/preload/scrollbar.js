/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2023 Jelmer van Arnhem
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
const {appData, readJSON, joinPath} = require("../util")
const webviewSettingsFile = joinPath(appData(), "webviewsettings")
let settings = readJSON(webviewSettingsFile)
const scrollStyle = document.createElement("style")
const hideScrollbar = () => {
    scrollStyle.textContent = "::-webkit-scrollbar {display: none !important;}"
    if (document.head) {
        document.head.appendChild(scrollStyle)
    } else if (document.body) {
        document.body.appendChild(scrollStyle)
    } else {
        document.querySelector("html").appendChild(scrollStyle)
    }
}
ipcRenderer.on("show-scrollbar", () => scrollStyle.remove())
ipcRenderer.on("hide-scrollbar", () => hideScrollbar())
const updateScrollbar = () => {
    settings = readJSON(webviewSettingsFile)
    if (settings.guiscrollbar !== "always" && scrollStyle.textContent === "") {
        hideScrollbar()
    }
}
updateScrollbar()
window.addEventListener("DOMContentLoaded", () => updateScrollbar())
window.addEventListener("load", () => updateScrollbar(true))
