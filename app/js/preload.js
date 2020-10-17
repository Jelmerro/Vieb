/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2020 Jelmer van Arnhem
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

const path = require("path")

// Always load the misc action functions (such as scrolling before page loads)
require("./preloads/actions")
// Always load follow mode JavaScript
require("./preloads/follow")
// Always load selection function code (for visual mode)
require("./preloads/select")
// Always load the failed page information handler
require("./preloads/failedload")
// Always load the local directory browser
require("./preloads/filebrowser")
// Always load the privacy related fixes
require("./preloads/privacy")

// Load the special page specific JavaScript
const util = require("./util")
const specialPage = util.pathToSpecialPageName(window.location.href)
if (specialPage.name) {
    require(`./preloads/${specialPage.name}`)
}

// Change the colors to white text on black for plain text pages
// Change the background to white for pages with no explicit background
window.addEventListener("load", () => {
    if (!document.querySelector("html")) {
        return
    }
    if (document.head?.innerText === "") {
        document.querySelector("html").style.color = "white"
        return
    }
    const html = getComputedStyle(document.querySelector("html")).background
    const body = getComputedStyle(document.body).background
    const unset = "rgba(0, 0, 0, 0)"
    if (html.includes(unset) && body.includes(unset)) {
        document.querySelector("html").style.background = "white"
    }
})
// Apply darkreader styling if enabled
const webviewSettingsFile = path.join(util.appData(), "webviewsettings")
const settings = util.readJSON(webviewSettingsFile)
if (settings?.darkreader && !specialPage.name) {
    const darkreader = require("darkreader")
    const interval = setInterval(() => {
        try {
            darkreader.setFetchMethod(window.fetch)
            darkreader.enable()
        } catch (_) {
            // Document not ready yet, try again later
        }
    }, 10)
    window.addEventListener("load", () => {
        setTimeout(() => clearInterval(interval), 1000)
    })
}
