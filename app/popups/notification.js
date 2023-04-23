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

let fontsize = 14
const fixScrollHeight = () => {
    const notify = document.getElementById("notification")
    notify.scrollTop = Math.round(notify.scrollTop / fontsize) * fontsize
}
ipcRenderer.on("notification-details", (_, message, fs, customCSS, lvl) => {
    document.getElementById("notification").scrollBy(0, -1000000000)
    document.getElementById("notification").innerHTML = message
    document.querySelector("footer").style.color = `var(--notification-${lvl}`
    fontsize = fs
    document.body.style.fontSize = `${fontsize}px`
    document.getElementById("custom-styling").textContent = customCSS
    document.body.style.opacity = "1"
})
window.addEventListener("keydown", e => {
    if (e.metaKey || e.altKey) {
        return
    }
    if (e.ctrlKey) {
        if (e.key === "[" && !e.shiftKey) {
            ipcRenderer.send("hide-notification-window")
        }
        return
    }
    const notification = document.getElementById("notification")
    if (e.key === "G") {
        notification.scrollBy(0, 1000000000)
        fixScrollHeight()
    }
    if (e.key === "k") {
        notification.scrollBy(0, -fontsize)
        fixScrollHeight()
    } else if (e.key === "j") {
        notification.scrollBy(0, fontsize)
        fixScrollHeight()
    } else if (e.key === "g") {
        notification.scrollBy(0, -1000000000)
        fixScrollHeight()
    } else if (e.key === "u") {
        notification.scrollBy(0, -window.innerHeight / 2 + fontsize)
        fixScrollHeight()
    } else if (e.key === "d") {
        notification.scrollBy(0, window.innerHeight / 2 - fontsize)
        fixScrollHeight()
    } else if (e.key === "b") {
        notification.scrollBy(0, -window.innerHeight + fontsize * 2)
        fixScrollHeight()
    } else if (e.key === "f" || e.key === " ") {
        notification.scrollBy(0, window.innerHeight - fontsize * 2)
        fixScrollHeight()
    } else if (e.key === "Escape" || e.key === "q") {
        ipcRenderer.send("hide-notification-window")
    }
})
