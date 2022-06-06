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

const {ipcRenderer} = require("electron")

window.addEventListener("load", () => {
    const input = document.querySelector("input")
    ipcRenderer.on("prompt-info", (_, fontsize, customCSS, title) => {
        document.getElementById("info").textContent = title
        input.focus()
        input.click()
        input.value = ""
        document.body.style.fontSize = `${fontsize}px`
        document.getElementById("custom-styling").textContent = customCSS
        document.body.style.opacity = 1
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
        } else if (e.shiftKey || e.metaKey || e.altKey) {
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
