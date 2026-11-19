/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2022-2026 Jelmer van Arnhem
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
const {ipcRenderer, webFrame} = require("electron")
const {
    appData,
    domainName,
    expandPath,
    fetchUrl,
    getAppRootDir,
    joinPath,
    listDir,
    pathToSpecialPageName,
    readFile
} = require("../util")
const {getSetting, notify} = require("./util")

const specialPage = pathToSpecialPageName(window.location.href)

/** Apply the current theme styling from the parent process. */
const applyThemeStyling = async() => {
    const style = `html {
        color: ${await getSetting("fg") || "#eee"};
        background: ${await getSetting("bg") || "#333"};
        font-size: ${await getSetting("guifontsize") || 14}px;
    } a {color: ${await getSetting("linkcolor") || "#0cf"};}`
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
        const darkreaderbrightness = await getSetting("darkreaderbrightness")
        if (darkreaderbrightness) {
            darkreaderOpts.brightness = darkreaderbrightness
        }
        const darkreadercontrast = await getSetting("darkreadercontrast")
        if (darkreadercontrast) {
            darkreaderOpts.contrast = darkreadercontrast
        }
        const darkreaderbg = await getSetting("darkreaderbg")
        if (darkreaderbg) {
            darkreaderOpts.darkSchemeBackgroundColor = darkreaderbg
            darkreaderOpts.lightSchemeBackgroundColor = darkreaderbg
        }
        const darkreaderfg = await getSetting("darkreaderfg")
        if (darkreaderfg) {
            darkreaderOpts.darkSchemeTextColor = darkreaderfg
            darkreaderOpts.lightSchemeTextColor = darkreaderfg
        }
        const darkreadergrayscale = await getSetting("darkreadergrayscale")
        if (darkreadergrayscale) {
            darkreaderOpts.grayscale = darkreadergrayscale
        }
        const darkreadermode = await getSetting("darkreadermode") ?? "dark"
        darkreaderOpts.mode = themeDict[darkreadermode]
        const darkreadersepia = await getSetting("darkreadersepia")
        if (darkreadersepia) {
            darkreaderOpts.sepia = darkreadersepia
        }
        const darkreadertextstroke = await getSetting("darkreadertextstroke")
        if (darkreadertextstroke) {
            darkreaderOpts.textStroke = darkreadertextstroke
        }
        darkreader.enable(darkreaderOpts)
        const style = await darkreader.exportGeneratedCSS()
        ipcRenderer.sendToHost("custom-style-inject", "darkreader", style)
    } catch(error) {
        console.error("Darkreader failed to apply:", error)
    }
}

/** Hide all scrollbars on the page. */
const hideScrollbar = () => {
    const style = "::-webkit-scrollbar {display: none !important;}"
    ipcRenderer.sendToHost("custom-style-inject", "scrollbar", style)
}

/** Hide the scrollbar if not configured to always show. */
const updateScrollbar = async() => {
    if (await getSetting("guiscrollbar") !== "always") {
        hideScrollbar()
    }
}

/**
 * General check for applying all custom styling, will do more once loaded.
 * @param {boolean} loadedFully
 */
const loadThemes = async(loadedFully = false) => {
    const html = document.querySelector("html")
    if (!html) {
        return
    }
    if (document.location.ancestorOrigins.length > 0) {
        await updateScrollbar()
        return
    }
    if (!document.head?.children.length) {
        if (!specialPage?.name) {
            await applyThemeStyling()
        }
        await updateScrollbar()
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
                    await applyThemeStyling()
                }
            }
        } else if (window.location.href.startsWith("chrome://")) {
            await applyThemeStyling()
        }
    }
    let domain = domainName(window.location.href)
    let scope = "page"
    if (specialPage?.name) {
        domain = "special"
        scope = "special"
    } else if (window.location.href.startsWith("file://")
        || document.body.id === "filebrowser") {
        domain = "file"
        scope = "file"
    }
    const darkreader = await getSetting("darkreader")
    const darkreaderscope = darkreader && await getSetting(
        "darkreaderscope") || []
    if (darkreaderscope?.includes(scope)) {
        const blocked = (await getSetting("darkreaderblocklist") ?? [])
            .some(m => window.location.href.match(m))
        if (!blocked) {
            await enableDarkReader()
        }
    }
    if (webFrame.getZoomFactor() === 1) {
        const zoom = await getSetting("zoomdefault")
        if (zoom !== 100) {
            webFrame.setZoomFactor(zoom / 100)
        }
    }
    const userstyle = await getSetting("userstyle")
    const userstylescope = userstyle && await getSetting("userstylescope") || []
    if (userstylescope?.includes(scope)) {
        const appdata = await appData()
        const userStyleFiles = [
            ...(listDir(joinPath(appdata, "userstyle/global"), true)
                || []).filter(f => f.endsWith(".css")),
            joinPath(appdata, "userstyle/global.css"),
            ...(listDir(expandPath("~/.vieb/userstyle/global"), true)
                || []).filter(f => f.endsWith(".css")),
            expandPath("~/.vieb/userstyle/global.css"),
            joinPath(appdata, `userstyle/${domain}.css`),
            expandPath(`~/.vieb/userstyle/${domain}.css`)
        ]
        const userStyleFileData = await Promise.all(userStyleFiles
            .map(f => readFile(f)))
        const style = userStyleFileData.filter(Boolean).join("\n")
        ipcRenderer.sendToHost("custom-style-inject", "userstyle", style)
    }
    await updateScrollbar()
}

ipcRenderer.on("enable-darkreader", () => loadThemes(true))
ipcRenderer.on("enable-userstyle", () => loadThemes(true))
ipcRenderer.on("disable-darkreader", () => disableDarkReader())
ipcRenderer.on("disable-userstyle", () => ipcRenderer.sendToHost(
    "custom-style-inject", "userstyle"))
ipcRenderer.on("show-scrollbar", () => ipcRenderer.sendToHost(
    "custom-style-inject", "scrollbar"))
ipcRenderer.on("hide-scrollbar", () => hideScrollbar())
loadThemes().catch(() => null)
window.addEventListener("DOMContentLoaded", () => loadThemes())
window.addEventListener("load", async() => {
    await loadThemes(true)
    setTimeout(loadThemes, 1000)
})
ipcRenderer.on("reload-basic-theme-styling", () => loadThemes(true))
ipcRenderer.on("add-colorscheme-styling", async(_, fontsize, custom) => {
    const linkedCss = document.querySelector(`link[href$="colors/default.css"]`)
    if (!linkedCss && !document.getElementById("default-styling")) {
        const styleElement = document.createElement("style")
        styleElement.id = "default-styling"
        document.head.append(styleElement)
    }
    const defaultStyle = document.querySelector("style#default-styling")
    if (defaultStyle) {
        defaultStyle.textContent = await readFile(joinPath(
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
