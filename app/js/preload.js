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

// Always load the misc action functions (such as scrolling before page loads)
require("./preloads/actions.js")
// Always load follow mode JavaScript
require("./preloads/follow.js")
// Always load selection function code (for visual mode)
require("./preloads/select.js")
// Always load the failed page information handler
require("./preloads/failedload.js")
// Always load the local directory browser
require("./preloads/filebrowser.js")

// Load the special page specific JavaScript
const util = require("./util.js")
const specialPage = util.pathToSpecialPageName(window.location.href)
if (specialPage.name) {
    require(`./preloads/${specialPage.name}.js`)
}

// Change the colors to white text on black for plain text pages
// Change the background to white for pages with no explicit background styling
window.addEventListener("load", () => {
    if (!document.querySelector("html")) {
        return
    }
    if (document.head && document.head.innerText === "") {
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
