/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2024 Jelmer van Arnhem
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

let fontsize = 14

/** Align the scroll height to a multiple of fontsizes. */
const fixScrollHeight = () => {
    const notification = document.getElementById("notification")
    if (!notification) {
        return
    }
    notification.scrollTop = Math.round(
        notification.scrollTop / fontsize) * fontsize
}

ipcRenderer.on("notification-details", (_, information) => {
    const notification = document.getElementById("notification")
    if (!notification) {
        return
    }
    notification.textContent = ""
    notification.scrollBy(0, -1000000000)
    notification.textContent = information.translations.escapedMessage
    const footer = document.querySelector("footer")
    if (footer) {
        footer.style.color = `var(--notification-${information.properType}`
        footer.textContent = information.translations.shortcuts
    }
    ({fontsize} = information)
    document.body.style.fontSize = `${fontsize}px`
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
    const notification = document.getElementById("notification")
    if (e.metaKey || e.altKey || !notification) {
        return
    }
    if (e.ctrlKey) {
        if (e.key === "[") {
            ipcRenderer.send("hide-notification-window")
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
        }
        return
    }
    if (e.key === "G") {
        notification.scrollBy(0, 1000000000)
        fixScrollHeight()
    } else if (e.key === "k") {
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
