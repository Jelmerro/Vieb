/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2025 Jelmer van Arnhem
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
import {currentMode, getSetting} from "../preloadutil.js"
import {applyLayout} from "./pagelayout.js"
import {updateElement} from "./pointer.js"

let topOfPageWithMouse = false
/** @type {number|null} */
let navbarGuiTimer = null
/** @type {number|null} */
let tabbarGuiTimer = null

/**
 * Get the current gui status value depending on window status.
 * @param {"navbar"|"tabbar"} type
 * @returns {"always"|"onupdate"|"oninput"|"never"}
 */
const getGuiStatus = type => {
    let setting = getSetting(`gui${type}`)
    if (ipcRenderer.sendSync("is-fullscreen")) {
        setting = getSetting(`guifullscreen${type}`)
    }
    if (topOfPageWithMouse && setting !== "never") {
        setting = "always"
    }
    return setting
}

/** Update the GUI visibility based on navbar and tabbar settings. */
export const updateGuiVisibility = () => {
    const navbar = getGuiStatus("navbar")
    const tabbar = getGuiStatus("tabbar")
    if (!navbarGuiTimer) {
        const notTyping = !"ces".includes(currentMode()[0])
        if (navbar === "never" || navbar !== "always" && notTyping) {
            document.body.classList.add("navigationhidden")
        } else {
            document.body.classList.remove("navigationhidden")
        }
    }
    if (!tabbarGuiTimer) {
        if (tabbar === "always") {
            document.body.classList.remove("tabshidden")
        } else {
            document.body.classList.add("tabshidden")
        }
    }
    applyLayout()
    if (currentMode() === "pointer") {
        updateElement()
    }
}

/**
 * Update the mouse state to reflect if it's at the top of the page or not.
 * @param {boolean} status
 */
export const setTopOfPageWithMouse = status => {
    if (topOfPageWithMouse !== status) {
        topOfPageWithMouse = status
        updateGuiVisibility()
    }
}

/**
 * Update the GUI to briefly show it again if configured.
 * @param {"navbar"|"tabbar"} type
 */
export const guiRelatedUpdate = type => {
    updateGuiVisibility()
    const timeout = getSetting("guihidetimeout")
    if (type === "navbar" && getGuiStatus("navbar") === "onupdate") {
        window.clearTimeout(navbarGuiTimer ?? undefined)
        document.body.classList.remove("navigationhidden")
        if (timeout) {
            navbarGuiTimer = window.setTimeout(() => {
                navbarGuiTimer = null
                updateGuiVisibility()
            }, timeout)
        }
    }
    if (type === "tabbar" && getGuiStatus("tabbar") === "onupdate") {
        window.clearTimeout(tabbarGuiTimer ?? undefined)
        document.body.classList.remove("tabshidden")
        if (timeout) {
            tabbarGuiTimer = window.setTimeout(() => {
                tabbarGuiTimer = null
                updateGuiVisibility()
            }, timeout)
        }
    }
}
