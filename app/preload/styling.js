/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2022 Jelmer van Arnhem
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

// Change the colors to $FG text on $BG background for plain text pages
// Change the background to white for regular pages with no explicit background
// Optionally loads darkreader to override the page colors and use a dark theme
const {ipcRenderer} = require("electron")
const {appData, readJSON, joinPath} = require("../util")
const webviewSettingsFile = joinPath(appData(), "webviewsettings")
let settings = readJSON(webviewSettingsFile)
const customStyle = document.createElement("style")
const applyThemeStyling = () => {
    const themeStyle = document.createElement("style")
    themeStyle.textContent = `html {
        color: ${settings?.fg || "#eee"};background: ${settings?.bg || "#333"};
        font-size: ${settings.fontsize || 14}px;
    } a {color: ${settings?.linkcolor || "#0cf"};}`
    if (document.head) {
        document.head.appendChild(themeStyle)
    } else if (document.body) {
        document.body.appendChild(themeStyle)
    } else {
        document.querySelector("html").appendChild(themeStyle)
    }
}
const cleanFetchMethod = window.fetch
const enableDarkReader = async() => {
    try {
        disableDarkReader()
    } catch {
        // Already disabled or never loaded
    }
    const darkreader = require("darkreader")
    darkreader.setFetchMethod(cleanFetchMethod)
    darkreader.enable({
        "brightness": settings.darkreaderbrightness,
        "contrast": settings.darkreadercontrast,
        "darkSchemeBackgroundColor": settings.darkreaderbg,
        "darkSchemeTextColor": settings.darkreaderfg,
        "grayscale": settings.darkreadergrayscale,
        "sepia": settings.darkreadersepia,
        "textStroke": settings.darkreadertextstroke
    })
    customStyle.textContent = await darkreader.exportGeneratedCSS()
    if (document.head) {
        document.head.appendChild(customStyle)
    } else if (document.body) {
        document.body.appendChild(customStyle)
    } else {
        document.querySelector("html").appendChild(customStyle)
    }
}
const disableDarkReader = () => {
    const darkreader = require("darkreader")
    darkreader.disable()
    customStyle.remove()
}
const loadThemes = (loadedFully = false) => {
    const html = document.querySelector("html")
    if (!html) {
        return
    }
    if (document.head?.innerText === "") {
        applyThemeStyling()
        return
    }
    if (["sourceviewer:", "readerview:"].includes(window.location.protocol)) {
        return
    }
    if (loadedFully) {
        const htmlBG = getComputedStyle(html).background
        const bodyBG = getComputedStyle(document.body).background
        const htmlBGImg = getComputedStyle(html).backgroundImage
        const bodyBGImg = getComputedStyle(document.body).backgroundImage
        const unset = "rgba(0, 0, 0, 0)"
        const noXMLButHasDiv = !document.querySelector("style#xml-viewer-style")
        && document.querySelector("div")
        if (htmlBG.includes(unset) && bodyBG.includes(unset)) {
            if (htmlBGImg === "none" && bodyBGImg === "none") {
                if (noXMLButHasDiv) {
                    html.style.background = "white"
                } else {
                    applyThemeStyling()
                }
            }
        }
    }
    settings = readJSON(webviewSettingsFile)
    if (settings.darkreader) {
        const blocked = settings.darkreaderblocklist.split("~")
            .find(m => window.location.href.match(m))
        if (!blocked) {
            enableDarkReader()
        }
    }
}
ipcRenderer.on("enable-darkreader", loadThemes)
ipcRenderer.on("disable-darkreader", () => disableDarkReader())
window.addEventListener("DOMContentLoaded", () => loadThemes())
window.addEventListener("load", () => loadThemes(true))
