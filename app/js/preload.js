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

require("./preloads/follow.js")
const path = require("path")
const url = require("url")

const loadPageSpecificJS = page => {
    const pageUrl = url.pathToFileURL(path.join(__dirname, `../${page}.html`))
    if (window.location.href.startsWith(pageUrl.href)) {
        require(`./preloads/${page}.js`)
    }
}

loadPageSpecificJS("downloads")
loadPageSpecificJS("help")
loadPageSpecificJS("history")
loadPageSpecificJS("version")
