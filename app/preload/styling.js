/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2022-2025 Jelmer van Arnhem
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

// Change the colors to $FG text on $BG background for plain text pages
// Change the background to white for regular pages with no explicit background
// Optionally loads darkreader to override the page colors and use a dark theme
import {ipcRenderer} from "electron"
import {appData, getSetting, pathToSpecialPageName} from "../preloadutil.js"
import {
    domainName,
    expandPath,
    fetchUrl,
    getAppRootDir,
    joinPath,
    listDir,
    readFile
} from "../util.js"
const specialPage = pathToSpecialPageName(window.location.href)

/**
 * Send a notification to the renderer thread.
 * @param {import("../preloadutil.js").NotificationInfo} opts
 */
const notify = opts => ipcRenderer.sendToHost("notify", opts)

/** Apply the current theme styling from the parent process. */
const applyThemeStyling = () => {
    const style = `html {
        color: ${getSetting("fg") || "#eee"};
        background: ${getSetting("bg") || "#333"};
        font-size: ${getSetting("guifontsize") || 14}px;
    } a {color: ${getSetting("linkcolor") || "#0cf"};}`
    ipcRenderer.sendToHost("custom-style-inject", "theme", style)
}

/** Disable the darkreader custom theme. */
const disableDarkReader = () => {
    try {
        const darkreader = require("darkreader")
        darkreader.disable()
        ipcRenderer.sendToHost("custom-style-inject", "darkreader")
    } catch {
        // Already disabled or never loaded
    }
}

/** Enable the darkreader custom theme. */
const enableDarkReader = async() => {
    disableDarkReader()
    let darkreader = null
    try {
        darkreader = require("darkreader")
    } catch {
        notify({
            "id": "settings.errors.darkreader.missing",
            "src": "user",
            "type": "error"
        })
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
        const darkreaderbrightness = getSetting("darkreaderbrightness")
        if (darkreaderbrightness) {
            darkreaderOpts.brightness = darkreaderbrightness
        }
        const darkreadercontrast = getSetting("darkreadercontrast")
        if (darkreadercontrast) {
            darkreaderOpts.contrast = darkreadercontrast
        }
        const darkreaderbg = getSetting("darkreaderbg")
        if (darkreaderbg) {
            darkreaderOpts.darkSchemeBackgroundColor = darkreaderbg
            darkreaderOpts.lightSchemeBackgroundColor = darkreaderbg
        }
        const darkreaderfg = getSetting("darkreaderfg")
        if (darkreaderfg) {
            darkreaderOpts.darkSchemeTextColor = darkreaderfg
            darkreaderOpts.lightSchemeTextColor = darkreaderfg
        }
        const darkreadergrayscale = getSetting("darkreadergrayscale")
        if (darkreadergrayscale) {
            darkreaderOpts.grayscale = darkreadergrayscale
        }
        const darkreadermode = getSetting("darkreadermode") ?? "dark"
        darkreaderOpts.mode = themeDict[darkreadermode]
        const darkreadersepia = getSetting("darkreadersepia")
        if (darkreadersepia) {
            darkreaderOpts.sepia = darkreadersepia
        }
        const darkreadertextstroke = getSetting("darkreadertextstroke")
        if (darkreadertextstroke) {
            darkreaderOpts.textStroke = darkreadertextstroke
        }
        darkreader.enable(darkreaderOpts)
        const style = await darkreader.exportGeneratedCSS()
        ipcRenderer.sendToHost("custom-style-inject", "darkreader", style)
    } catch(e) {
        console.error("Darkreader failed to apply:", e)
    }
}

/** Hide all scrollbars on the page. */
const hideScrollbar = () => {
    const style = "::-webkit-scrollbar {display: none !important;}"
    ipcRenderer.sendToHost("custom-style-inject", "scrollbar", style)
}

/** Hide the scrollbar if not configured to always show. */
const updateScrollbar = () => {
    if (getSetting("guiscrollbar") !== "always") {
        hideScrollbar()
    }
}

/**
 * General check for applying all custom styling, will do more once loaded.
 * @param {boolean} loadedFully
 */
const loadThemes = (loadedFully = false) => {
    const html = document.querySelector("html")
    if (!html || !document.body) {
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
    if (loadedFully && !specialPage?.name) {
        const htmlBG = html.computedStyleMap().get(
            "background")?.toString() ?? "unset"
        const bodyBG = document.body.computedStyleMap().get(
            "background")?.toString() ?? "unset"
        const htmlBGImg = html.computedStyleMap().get(
            "background-image")?.toString() ?? "none"
        const bodyBGImg = document.body.computedStyleMap().get(
            "background-image")?.toString() ?? "none"
        const unset = "rgba(0, 0, 0, 0)"
        const darkPage = document.querySelector(
            "head meta[name='color-scheme'][content~='dark']")
        const noXMLOrSpecial = !document.querySelector("style#xml-viewer-style")
            && !window.location.href.startsWith("chrome://")
            && !window.location.href.startsWith("sourceviewer:")
            && !window.location.href.startsWith("readerview:")
            && !window.location.href.startsWith("markdownviewer:")
        if (htmlBG.includes(unset) && bodyBG.includes(unset) && !darkPage) {
            if (htmlBGImg === "none" && bodyBGImg === "none") {
                if (noXMLOrSpecial) {
                    html.style.background = "white"
                } else {
                    applyThemeStyling()
                }
            }
        } else if (window.location.href.startsWith("chrome://")) {
            applyThemeStyling()
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
    } else if (document.body.id === "filebrowser") {
        domain = "file"
        scope = "file"
    }
    if (getSetting("darkreader")
        && getSetting("darkreaderscope")?.includes(scope)) {
        const blocked = (getSetting("darkreaderblocklist") ?? [])
            .find(m => window.location.href.match(m))
        if (!blocked) {
            enableDarkReader()
        }
    }
    if (getSetting("userstyle")
        && getSetting("userstylescope")?.includes(scope)) {
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
window.addEventListener("load", () => {
    loadThemes(true)
    setTimeout(loadThemes, 1000)
})
ipcRenderer.on("reload-basic-theme-styling", () => loadThemes(true))
ipcRenderer.on("add-colorscheme-styling", (_, fontsize, custom) => {
    const linkedCss = document.querySelector(`link[href$="colors/default.css"]`)
    if (!linkedCss && !document.getElementById("default-styling")) {
        const styleElement = document.createElement("style")
        styleElement.id = "default-styling"
        document.head.append(styleElement)
    }
    const defaultStyle = document.querySelector("style#default-styling")
    if (defaultStyle) {
        defaultStyle.textContent = readFile(joinPath(
            getAppRootDir(), "colors/default.css"))
    }
    if (!document.getElementById("custom-styling")) {
        const styleElement = document.createElement("style")
        styleElement.id = "custom-styling"
        document.head.append(styleElement)
    }
    const customStyle = document.getElementById("custom-styling")
    if (customStyle) {
        customStyle.textContent = custom
    }
    document.body.style.fontSize = `${fontsize}px`
    document.body.style.opacity = "1"
})
