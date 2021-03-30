/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020 Jelmer van Arnhem
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
    const username = document.getElementById("username")
    const password = document.getElementById("password")
    const inputs = [...document.getElementsByTagName("input")]
    ipcRenderer.on("login-information", (_, fontsize, customCSS, title) => {
        document.getElementById("info").textContent = title
        username.focus()
        username.click()
        username.value = ""
        password.value = ""
        document.body.style.fontSize = `${fontsize}px`
        document.getElementById("custom-styling").textContent = customCSS
        document.body.style.opacity = 1
    })
    window.addEventListener("keydown", e => {
        if (e.code === "Tab" && !e.altKey) {
            e.preventDefault()
            if (document.activeElement === username) {
                password.focus()
                password.click()
            } else {
                username.focus()
                username.click()
            }
        }
    })
    inputs.forEach(input => {
        input.addEventListener("keydown", e => {
            if (e.code === "Enter") {
                ipcRenderer.send("login-credentials",
                    [username.value, password.value])
            } else if (e.shiftKey || e.metaKey || e.altKey) {
                // Don't trigger the escape keys below
            } else if (e.ctrlKey && e.code === "BracketLeft") {
                ipcRenderer.send("hide-login-window")
            } else if (!e.ctrlKey && e.code === "Escape") {
                ipcRenderer.send("hide-login-window")
            }
        })
        input.addEventListener("focusout", e => {
            if (!inputs.includes(e.relatedTarget)) {
                input.focus()
                input.click()
            }
        })
    })
})
