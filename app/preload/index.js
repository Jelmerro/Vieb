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

// Change the colors to $FG text on $BG background for plain text pages
// Change the background to white for regular pages with no explicit background
const applyThemeStyling = () => {
    const webviewSettingsFile = joinPath(appData(), "webviewsettings")
    const colors = readJSON(webviewSettingsFile)
    const style = document.createElement("style")
    style.textContent = `html {
        color: ${colors?.fg || "#eee"};background: ${colors?.bg || "#333"};
    } a {color: ${colors?.linkcolor || "#0cf"};}`
    document.querySelector("html").appendChild(style)
}
window.addEventListener("load", () => {
    const html = document.querySelector("html")
    if (!html || specialPage.name) {
        return
    }
    if (document.head?.innerText === "") {
        applyThemeStyling()
        return
    }
    const htmlBG = getComputedStyle(html).background
    const bodyBG = getComputedStyle(document.body).background
    const unset = "rgba(0, 0, 0, 0)"
    if (htmlBG.includes(unset) && bodyBG.includes(unset)) {
        if (document.querySelector("div")) {
            html.style.background = "white"
            return
        }
        applyThemeStyling()
    }
})
