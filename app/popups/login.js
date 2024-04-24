/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2023 Jelmer van Arnhem
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
const {translate} = require("../translate")

window.addEventListener("load", () => {
    const username = document.getElementById("username")
    const password = document.getElementById("password")
    if (!(username instanceof HTMLInputElement)) {
        return
    }
    if (!(password instanceof HTMLInputElement)) {
        return
    }
    const inputs = [username, password]
    ipcRenderer.on("login-information", (_, fontsize, customCSS, auth) => {
        const h3 = document.querySelector("h3")
        if (h3) {
            h3.textContent = translate("popups.login.title")
        }
        username.placeholder = translate("popups.login.username")
        password.placeholder = translate("popups.login.password")
        const info = document.getElementById("info")
        if (info) {
            info.textContent = translate("popups.login.info",
                {"fields": [auth.host, auth.realm]})
        }
        username.focus()
        username.click()
        username.value = ""
        password.value = ""
        document.body.style.fontSize = `${fontsize}px`
        if (!document.getElementById("custom-styling")) {
            const styleElement = document.createElement("style")
            styleElement.id = "custom-styling"
            document.head.append(styleElement)
        }
        const customStyle = document.getElementById("custom-styling")
        if (customStyle) {
            customStyle.textContent = customCSS
        }
        document.body.style.opacity = "1"
    })
    window.addEventListener("keydown", e => {
        if (e.key === "Tab" && !e.altKey) {
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
            if (e.key === "Enter") {
                ipcRenderer.send("login-credentials",
                    [username.value, password.value])
            } else if (e.shiftKey || e.metaKey || e.altKey) {
                // Don't trigger the escape keys below
            } else if (e.ctrlKey && e.key === "[") {
                ipcRenderer.send("hide-login-window")
            } else if (!e.ctrlKey && e.key === "Escape") {
                ipcRenderer.send("hide-login-window")
            }
        })
        input.addEventListener("focusout", e => {
            if (!(e.relatedTarget instanceof HTMLInputElement)) {
                input.focus()
                input.click()
            }
        })
    })
})
