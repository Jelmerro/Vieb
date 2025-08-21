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

import {ipcRenderer} from "electron"

window.addEventListener("load", () => {
    const input = document.querySelector("input")
    if (!input) {
        return
    }
    ipcRenderer.on("prompt-info", (_, information) => {
        const h3 = document.querySelector("h3")
        if (h3) {
            h3.textContent = information.translations.prompt
        }
        const info = document.getElementById("info")
        if (info) {
            info.textContent = information.translations.title
        }
        input.focus()
        input.click()
        input.value = information.translations.defaultText
        input.select()
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
        document.body.style.opacity = "1"
    })
    window.addEventListener("keydown", e => {
        if (e.key === "Tab" && !e.altKey) {
            e.preventDefault()
            input.focus()
            input.click()
        }
    })
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            ipcRenderer.send("prompt-response", input.value)
        } else if (e.metaKey || e.altKey) {
            // Don't trigger the escape keys below
        } else if (e.ctrlKey && e.key === "[") {
            ipcRenderer.send("hide-prompt-window")
        } else if (!e.ctrlKey && e.key === "Escape") {
            ipcRenderer.send("hide-prompt-window")
        }
    })
    input.addEventListener("focusout", e => {
        if (input !== e.relatedTarget) {
            input.focus()
            input.click()
        }
    })
})
