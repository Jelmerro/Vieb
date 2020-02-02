/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2020 Jelmer van Arnhem
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
/* global ACTIONS COMMANDHISTORY CURSOR FOLLOW INPUT SUGGEST TABS */
"use strict"

const modes = {
    "normal": {
        "fg": "#ddd",
        "bg": ""
    },
    "insert": {
        "fg": "#3f3",
        "bg": ""
    },
    "command": {
        "fg": "#f33",
        "bg": ""
    },
    "search": {
        "fg": "#ff3",
        "bg": ""
    },
    "nav": {
        "fg": "#3ff",
        "bg": ""
    },
    "follow": {
        "fg": "#f3f",
        "bg": ""
    },
    "cursor": {
        "fg": "#777",
        "bg": "#fff"
    },
    "visual": {
        "fg": "#000",
        "bg": "#3af"
    }
}

const init = () => {
    const modeList = document.getElementById("mode-suggestions")
    Object.keys(modes).forEach(mode => {
        const modeEntry = document.createElement("div")
        modeEntry.textContent = mode
        modeEntry.className = "no-focus-reset"
        modeEntry.addEventListener("click", e => {
            if (currentMode() === mode) {
                return
            }
            if (mode === "follow") {
                FOLLOW.startFollow(false)
            } else if (mode === "cursor") {
                CURSOR.start()
            } else if (mode === "visual") {
                CURSOR.startVisualSelect()
            } else {
                setMode(mode)
            }
            e.preventDefault()
        })
        modeEntry.style.backgroundColor = modes[mode].bg
        modeEntry.style.color = modes[mode].fg
        modeList.appendChild(modeEntry)
    })
}

const setMode = mode => {
    mode = mode.trim().toLowerCase()
    if (currentMode() === "insert" && mode !== "insert") {
        TABS.currentPage().getWebContents().send("action", "blur")
    }
    if (mode !== "follow") {
        FOLLOW.cancelFollow()
    }
    if (mode === "command") {
        COMMANDHISTORY.resetPosition()
    }
    if (mode !== "nav" && mode !== "command") {
        SUGGEST.cancelSuggestions()
    }
    if (["cursor", "visual"].includes(currentMode())) {
        if (!["cursor", "visual"].includes(mode)) {
            CURSOR.releaseKeys(mode === "visual")
        }
    }
    if (["cursor", "visual"].includes(mode)) {
        document.getElementById("cursor").style.display = "block"
    } else {
        document.getElementById("cursor").style.display = "none"
    }
    if (!["cursor", "insert"].includes(mode)) {
        document.getElementById("url-hover").textContent = ""
        document.getElementById("url-hover").style.display = "none"
    }
    if (!modes[mode]) {
        return
    }
    if (mode === "insert") {
        document.getElementById("invisible-overlay").style.display = "none"
    } else {
        document.getElementById("invisible-overlay").style.display = ""
    }
    document.getElementById("mode").textContent = mode
    document.getElementById("mode").style.color = modes[mode].fg
    document.getElementById("mode-container")
        .style.backgroundColor = modes[mode].bg
    TABS.listPages().forEach(page => {
        page.getWebContents().removeAllListeners("before-input-event")
        if (mode === "insert") {
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
                    if (document.body.classList.contains("fullscreen")) {
                        page.getWebContents().send("action", "exitFullscreen")
                        return
                    }
                }
                if (input.type.toLowerCase() !== "keydown") {
                    return
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
                const actionFunction = INPUT.actionToFunction(
                    INPUT.eventToAction(keyEvent))
                if (actionFunction) {
                    e.preventDefault()
                    if (currentMode() === "insert") {
                        actionFunction()
                    }
                }
            })
        }
    })
    ACTIONS.setFocusCorrectly()
}

const currentMode = () => {
    return document.getElementById("mode").textContent.trim()
}

module.exports = {
    init,
    setMode,
    currentMode
}
