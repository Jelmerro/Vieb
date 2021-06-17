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

// Always load the misc action functions (such as scrolling before page loads)
require("./actions")
// Always load follow mode JavaScript
require("./follow")
// Always load the failed page information handler
require("./failedload")
// Always load the local directory browser
require("./filebrowser")
// Always load the privacy related fixes
require("./privacy")

// Load the special page specific JavaScript
const {pathToSpecialPageName, appData, readJSON, joinPath} = require("../util")
const specialPage = pathToSpecialPageName(window.location.href)
if (specialPage.name) {
    require(`./${specialPage.name}`)
}
// Load Vieb settings that are relevant for the webview
const webviewSettingsFile = joinPath(appData(), "webviewsettings")
const settings = readJSON(webviewSettingsFile)

// Change the colors to $FG text on $BG background for plain text pages
// Change the background to white for regular pages with no explicit background
window.addEventListener("load", () => {
    if (!document.querySelector("html")) {
        return
    }
    if (document.body?.classList.contains("specialpage")) {
        return
    }
    if (document.head?.innerText === "") {
        document.querySelector("html").style.color = settings?.fg || "#eee"
        document.querySelector("html").style.background = settings?.bg || "#333"
        return
    }
    const html = getComputedStyle(document.querySelector("html")).background
    const body = getComputedStyle(document.body).background
    const unset = "rgba(0, 0, 0, 0)"
    if (html.includes(unset) && body.includes(unset)) {
        // Check for regular pages that should have a white background
        if (document.body.querySelector("div")) {
            document.querySelector("html").style.background = "white"
            return
        }
        document.querySelector("html").style.color = settings?.fg || "#eee"
        document.querySelector("html").style.background = settings?.bg || "#333"
    }
})
