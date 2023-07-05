/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2022-2023 Jelmer van Arnhem
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
    appData,
    joinPath,
    domainName,
    expandPath,
    readFile,
    listDir,
    fetchUrl,
    pathToSpecialPageName,
    getWebviewSetting
} = require("../util")
const specialPage = pathToSpecialPageName(window.location.href)
const applyThemeStyling = () => {
    const style = `html {
        color: ${getWebviewSetting("fg") || "#eee"};
        background: ${getWebviewSetting("bg") || "#333"};
        font-size: ${getWebviewSetting("guifontsize") || 14}px;
    } a {color: ${getWebviewSetting("linkcolor") || "#0cf"};}`
    ipcRenderer.sendToHost("custom-style-inject", "theme", style)
}
const enableDarkReader = async() => {
    disableDarkReader()
    let darkreader = null
    try {
        darkreader = require("darkreader")
    } catch {
        ipcRenderer.sendToHost("notify",
            "Darkreader module not present, can't show dark pages", "err")
        return
    }
    darkreader.setFetchMethod(url => new Promise(res => {
        fetchUrl(url, {
            "headers": {"Sec-Fetch-Dest": "style", "Sec-Fetch-Mode": "no-cors"}
        }).then(data => res(new Response(data))).catch(() => console.warn)
    }))
    try {
        /** @type {{"dark": 1, "light": 0}} */
        const themeDict = {"dark": 1, "light": 0}
        /** @type {Partial<import("darkreader").Theme>} */
        const darkreaderOpts = {}
        const darkreaderbrightness = getWebviewSetting("darkreaderbrightness")
        if (darkreaderbrightness) {
            darkreaderOpts.brightness = darkreaderbrightness
        }
        const darkreadercontrast = getWebviewSetting("darkreadercontrast")
        if (darkreadercontrast) {
            darkreaderOpts.contrast = darkreadercontrast
        }
        const darkreaderbg = getWebviewSetting("darkreaderbg")
        if (darkreaderbg) {
            darkreaderOpts.darkSchemeBackgroundColor = darkreaderbg
            darkreaderOpts.lightSchemeBackgroundColor = darkreaderbg
        }
        const darkreaderfg = getWebviewSetting("darkreaderfg")
        if (darkreaderfg) {
            darkreaderOpts.darkSchemeTextColor = darkreaderfg
            darkreaderOpts.lightSchemeTextColor = darkreaderfg
        }
        const darkreadergrayscale = getWebviewSetting("darkreadergrayscale")
        if (darkreadergrayscale) {
            darkreaderOpts.grayscale = darkreadergrayscale
        }
        const darkreadermode = getWebviewSetting("darkreadermode") ?? "dark"
        darkreaderOpts.mode = themeDict[darkreadermode]
        const darkreadersepia = getWebviewSetting("darkreadersepia")
        if (darkreadersepia) {
            darkreaderOpts.sepia = darkreadersepia
        }
        const darkreadertextstroke = getWebviewSetting("darkreadertextstroke")
        if (darkreadertextstroke) {
            darkreaderOpts.textStroke = darkreadertextstroke
        }
        darkreader.enable(darkreaderOpts)
        const style = await darkreader.exportGeneratedCSS()
        ipcRenderer.sendToHost("custom-style-inject", "darkreader", style)
    } catch (e) {
        console.error("Darkreader failed to apply:", e)
    }
}
const disableDarkReader = () => {
    try {
        const darkreader = require("darkreader")
        darkreader.disable()
        ipcRenderer.sendToHost("custom-style-inject", "darkreader")
    } catch {
        // Already disabled or never loaded
    }
}
const hideScrollbar = () => {
    const style = "::-webkit-scrollbar {display: none !important;}"
    ipcRenderer.sendToHost("custom-style-inject", "scrollbar", style)
}
const updateScrollbar = () => {
    if (getWebviewSetting("guiscrollbar") !== "always") {
        hideScrollbar()
    }
}
const loadThemes = (loadedFully = false) => {
    const html = document.querySelector("html")
    if (!html) {
        return
    }
    if (document.location.ancestorOrigins.length) {
        updateScrollbar()
        return
    }
    if (document.head?.innerText === "") {
        if (!specialPage?.name) {
            applyThemeStyling()
        }
        updateScrollbar()
        return
    }
    if (loadedFully && !specialPage?.name
        && !window.location.href.startsWith("chrome")) {
        const htmlBG = getComputedStyle(html).background
        const bodyBG = getComputedStyle(document.body).background
        const htmlBGImg = getComputedStyle(html).backgroundImage
        const bodyBGImg = getComputedStyle(document.body).backgroundImage
        const unset = "rgba(0, 0, 0, 0)"
        const darkPage = document.querySelector(
            "head meta[name='color-scheme'][content~='dark']")
        const noXMLButHasEl = !document.querySelector("style#xml-viewer-style")
            && (document.querySelector("div") || document.querySelector("main"))
        if (htmlBG.includes(unset) && bodyBG.includes(unset) && !darkPage) {
            if (htmlBGImg === "none" && bodyBGImg === "none") {
                if (noXMLButHasEl) {
                    html.style.background = "white"
                } else {
                    applyThemeStyling()
                }
            }
        }
    }
    let domain = domainName(window.location.href)
    let scope = "page"
    if (specialPage?.name) {
        domain = "special"
        scope = "special"
    } else if (window.location.href.startsWith("file://")) {
        domain = "file"
        scope = "file"
    }
    if (getWebviewSetting("darkreader")
        && getWebviewSetting("darkreaderscope")?.includes(scope)) {
        const blocked = getWebviewSetting("darkreaderblocklist")?.split("~")
            .find(m => window.location.href.match(m))
        if (!blocked) {
            enableDarkReader()
        }
    }
    if (getWebviewSetting("userstyle")
        && getWebviewSetting("userstylescope")?.includes(scope)) {
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
        const style = userStyleFiles.map(f => readFile(f))
            .filter(s => s).join("\n")
        ipcRenderer.sendToHost("custom-style-inject", "userstyle", style)
    }
    updateScrollbar()
}
ipcRenderer.on("enable-darkreader", () => loadThemes(true))
ipcRenderer.on("enable-userstyle", () => loadThemes(true))
ipcRenderer.on("disable-darkreader", () => disableDarkReader())
ipcRenderer.on("disable-userstyle", () => ipcRenderer.sendToHost(
    "custom-style-inject", "userstyle"))
ipcRenderer.on("show-scrollbar", () => ipcRenderer.sendToHost(
    "custom-style-inject", "scrollbar"))
ipcRenderer.on("hide-scrollbar", () => hideScrollbar())
loadThemes()
window.addEventListener("DOMContentLoaded", () => loadThemes())
window.addEventListener("load", () => loadThemes(true))
