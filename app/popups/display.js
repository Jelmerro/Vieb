/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2024-2026 Jelmer van Arnhem
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

const {ipcRenderer} = require("electron")

/**
 * @typedef {{
 *   title: string,
 *   img: string,
 *   icon: string,
 *   type: "desktop"|"currenttab"|"tab",
 *   id?: number
 * }} SourceInfo
 */
/**
 * @typedef {{
 *   type: "desktop"|"currenttab"|"tab",
 *   id?: number
 * }} SourceSelect
 */

const keys = [..."abcdefghijklmnopqrstuvwxyz0123456789"]
/** @type {SourceInfo[]} */
let sources = []
window.addEventListener("load", () => {
    const screensContainer = document.getElementById("screens")
    if (!screensContainer) {
        return
    }
    const audioEnabledBox = document.getElementById("audio-enabled")
    if (!(audioEnabledBox instanceof HTMLInputElement)) {
        return
    }
    const echoEnabledBox = document.getElementById("echo-enabled")
    if (!(echoEnabledBox instanceof HTMLInputElement)) {
        return
    }
    /**
     * Confirm a source as the selected one for desktop/tab sharing.
     * @param {SourceSelect} source
     */
    const sendSelectedSource = source => {
        /** @type {{source: SourceSelect, audio: boolean, echo: boolean}} */
        ipcRenderer.send("display-response", {
            "audio": audioEnabledBox.checked,
            "echo": echoEnabledBox.checked,
            source
        })
    }
    ipcRenderer.on("display-info", (_, information) => {
        ({sources} = information)
        const h3 = document.querySelector("h3")
        if (h3) {
            h3.textContent = information.translations.title
        }
        const audioLabel = document.querySelector("label[for=audio-enabled]")
        if (audioLabel) {
            audioLabel.textContent = information.translations.audio
        }
        const echoLabel = document.querySelector("label[for=echo-enabled]")
        if (echoLabel) {
            echoLabel.textContent = information.translations.echo
        }
        document.body.style.fontSize = `${information.fontsize}px`
        if (!document.getElementById("custom-styling")) {
            const styleElement = document.createElement("style")
            styleElement.id = "custom-styling"
            document.head.append(styleElement)
        }
        const customStyle = document.getElementById("custom-styling")
        if (customStyle) {
            customStyle.textContent = information.customCSS
        }
        screensContainer.textContent = ""
        screensContainer.scrollBy(0, -1000000000)
        for (const [index, source] of sources.entries()) {
            const screenEl = document.createElement("div")
            screenEl.classList.add("screen")
            screenEl.addEventListener("click", () => {
                sendSelectedSource(source)
            })
            const keyEl = document.createElement("span")
            keyEl.classList.add("screen-key")
            keyEl.textContent = keys[index] ?? ""
            const previewEl = document.createElement("img")
            previewEl.classList.add("screen-preview")
            previewEl.src = source.img
            const iconEl = document.createElement("img")
            iconEl.classList.add("screen-icon")
            iconEl.src = source.icon
            iconEl.addEventListener("error", () => {
                iconEl.style.opacity = "0"
            })
            const titleEl = document.createElement("span")
            titleEl.classList.add("screen-title")
            titleEl.textContent = source.title
            screenEl.append(keyEl, previewEl, iconEl, titleEl)
            screensContainer.append(screenEl)
        }
        document.body.style.opacity = "1"
    })
    window.addEventListener("keydown", e => {
        if (e.metaKey || e.altKey) {
            return
        }
        if (e.ctrlKey) {
            if (e.key === "[") {
                ipcRenderer.send("hide-display-window")
            } else if (e.key === "a") {
                audioEnabledBox.checked = !audioEnabledBox.checked
            } else if (e.key === "e") {
                echoEnabledBox.checked = !echoEnabledBox.checked
            } else if (e.key === "u") {
                screensContainer.scrollBy(0, -screensContainer.clientHeight / 2)
            } else if (e.key === "d") {
                screensContainer.scrollBy(0, screensContainer.clientHeight / 2)
            } else if (e.key === "b") {
                screensContainer.scrollBy(0, -screensContainer.clientHeight)
            } else if (e.key === "f") {
                screensContainer.scrollBy(0, screensContainer.clientHeight)
            }
            return
        }
        if (e.key === "Escape") {
            ipcRenderer.send("hide-display-window")
        } else if (!e.ctrlKey && keys.includes(e.key.toLowerCase())) {
            const index = keys.indexOf(e.key.toLowerCase())
            sendSelectedSource(sources[index])
        }
    })
})
