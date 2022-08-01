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
const {
    appData, readJSON, joinPath, domainName, expandPath, readFile, listDir
} = require("../util")
const webviewSettingsFile = joinPath(appData(), "webviewsettings")
let settings = readJSON(webviewSettingsFile)
const darkreaderStyle = document.createElement("style")
const usercustomStyle = document.createElement("style")
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
    darkreaderStyle.textContent = await darkreader.exportGeneratedCSS()
    if (darkreaderStyle.textContent) {
        if (document.head) {
            document.head.appendChild(darkreaderStyle)
        } else if (document.body) {
            document.body.appendChild(darkreaderStyle)
        } else {
            document.querySelector("html").appendChild(darkreaderStyle)
        }
    }
}
const disableDarkReader = () => {
    const darkreader = require("darkreader")
    darkreader.disable()
    darkreaderStyle.remove()
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
    settings = readJSON(webviewSettingsFile)
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
        if (settings.userstyle) {
            const domain = domainName(window.location.href)
            const userStyleFiles = [
                ...(listDir(joinPath(appData(), "userstyle/global"), true)
                    || []).filter(f => f.endsWith(".css")),
                joinPath(appData(), "userstyle/global.css"),
                ...(listDir(expandPath("~/.vieb/userstyle/global"), true)
                    || []).filter(f => f.endsWith(".css")),
                expandPath("~/.vieb/userstyle/global.css"),
                joinPath(appData(), `userstyle/${domain}.css`),
                expandPath(`~/.vieb/userstyle/${domain}.css`)
            ]
            usercustomStyle.textContent = userStyleFiles.map(f => readFile(f))
                .filter(s => s).join("\n")
            if (usercustomStyle.textContent) {
                if (document.head) {
                    document.head.appendChild(usercustomStyle)
                } else if (document.body) {
                    document.body.appendChild(usercustomStyle)
                } else {
                    document.querySelector("html").appendChild(usercustomStyle)
                }
            }
        }
    }
    if (settings.darkreader) {
        const blocked = settings.darkreaderblocklist.split("~")
            .find(m => window.location.href.match(m))
        if (!blocked) {
            enableDarkReader()
        }
    }
}
ipcRenderer.on("enable-darkreader", () => loadThemes(true))
ipcRenderer.on("enable-userstyle", () => loadThemes(true))
ipcRenderer.on("disable-darkreader", () => disableDarkReader())
ipcRenderer.on("disable-userstyle", () => usercustomStyle.remove())
loadThemes()
window.addEventListener("DOMContentLoaded", () => loadThemes())
window.addEventListener("load", () => loadThemes(true))
