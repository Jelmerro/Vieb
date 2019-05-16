/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019 Jelmer van Arnhem
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
/* global ACTIONS INPUT SUGGEST TABS */
"use strict"

const colors = {
    "normal": "#eee",
    "insert": "#3f3",
    "command": "#f33",
    "search": "#ff3",
    "nav": "#3ff",
    "follow": "#f3f"
}

const setMode = mode => {
    if (mode !== "nav" && mode !== "command") {
        SUGGEST.cancelSuggestions()
    }
    mode = mode.trim().toLowerCase()
    if (colors[mode] === undefined) {
        return
    }
    document.getElementById("mode").textContent = mode
    document.getElementById("mode").style.color = colors[mode]
    // Mode specific changes
    if (mode === "normal") {
        TABS.listPages().forEach(page => {
            page.style.pointerEvents = "none"
        })
    }
    if (mode === "insert") {
        TABS.listPages().forEach(page => {
            page.style.pointerEvents = "auto"
            page.getWebContents().removeAllListeners("before-input-event")
            page.getWebContents().on("before-input-event", (e, input) => {
                if (input.code === "Tab") {
                    TABS.currentPage().focus()
                }
                // Check if fullscreen should be disabled
                const noMods = !input.shift && !input.meta && !input.alt
                const ctrl = input.control
                const escapeKey = input.code === "Escape" && noMods && !ctrl
                const ctrlBrack = input.code === "BracketLeft" && noMods && ctrl
                if (escapeKey || ctrlBrack) {
                    if (document.body.className === "fullscreen") {
                        page.executeJavaScript(
                            "document.webkitExitFullscreen()")
                        return
                    }
                }
                // Translate to regular keyboard event
                const keyEvent = {
                    "ctrlKey": input.control,
                    "shiftKey": input.shift,
                    "metaKey": input.meta,
                    "altKey": input.alt,
                    "code": input.code
                }
                // Find the action
                INPUT.executeAction(INPUT.eventToAction(keyEvent))
            })
        })
    }
    ACTIONS.setFocusCorrectly()
}

const currentMode = () => {
    return document.getElementById("mode").textContent.trim()
}

module.exports = {
    setMode,
    currentMode
}
