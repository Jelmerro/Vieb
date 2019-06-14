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

// Always load follow mode javascript
require("./preloads/follow.js")
// Always load selection function code (for visual mode)
require("./preloads/select.js")

// Load the special page specific javascript
const util = require("./util.js")
const specialPage = util.pathToSpecialPageName(window.location.href)
if (specialPage.name) {
    require(`./preloads/${specialPage.name}.js`)
}

// Change the background to white for pages with no explicit background styling
window.addEventListener("load", () => {
    const background = getComputedStyle(document.body).background
    if (background.indexOf("rgba(0, 0, 0, 0)") !== -1) {
        document.body.style.background = "white"
    }
})
