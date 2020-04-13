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
/* global ACTIONS COMMANDHISTORY POINTER FOLLOW INPUT SUGGEST TABS */
"use strict"

const modes = {
    "normal": {
        "fg": "#ddd"
    },
    "insert": {
        "fg": "#3f3",
        "onEnter": () => {
            document.getElementById("invisible-overlay").style.display = "none"
        },
        "onLeave": newMode => {
            if (TABS.currentPage().getAttribute("webview-id")) {
                TABS.webContents(TABS.currentPage()).send("action", "blur")
            }
            document.getElementById("invisible-overlay").style.display = ""
            if (newMode !== "pointer") {
                document.getElementById("url-hover").textContent = ""
                document.getElementById("url-hover").style.display = "none"
            }
        }
    },
    "command": {
        "fg": "#f33",
        "onEnter": () => {
            document.getElementById("url").value = ""
            COMMANDHISTORY.resetPosition()
        },
        "onLeave": () => {
            SUGGEST.cancelSuggestions()
        }
    },
    "search": {
        "fg": "#ff3",
        "onEnter": () => {
            document.getElementById("url").value = ""
        }
    },
    "explore": {
        "fg": "#3ff",
        "onEnter": () => {
            TABS.updateUrl(TABS.currentPage(), true)
            document.getElementById("url").select()
        },
        "onLeave": () => {
            SUGGEST.cancelSuggestions()
            document.getElementById("url").className = ""
        }
    },
    "follow": {
        "fg": "#f3f",
        "onLeave": newMode => {
            FOLLOW.cancelFollow()
            if (!["visual", "pointer"].includes(newMode)) {
                POINTER.releaseKeys()
            }
        }
    },
    "pointer": {
        "fg": "#777",
        "bg": "#fff",
        "onEnter": () => {
            document.getElementById("pointer").style.display = "block"
        },
        "onLeave": newMode => {
            if (newMode !== "visual") {
                document.getElementById("pointer").style.display = "none"
                if (newMode !== "follow") {
                    POINTER.releaseKeys()
                }
            }
            if (newMode !== "insert") {
                document.getElementById("url-hover").style.display = "none"
            }
        }
    },
    "visual": {
        "fg": "#000",
        "bg": "#3af",
        "onEnter": () => {
            document.getElementById("pointer").style.display = "block"
        },
        "onLeave": newMode => {
            if (newMode !== "pointer") {
                document.getElementById("pointer").style.display = "none"
            }
            if (!["pointer", "follow"].includes(newMode)) {
                POINTER.releaseKeys()
            }
        }
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
            } else if (mode === "pointer") {
                POINTER.start()
            } else if (mode === "visual") {
                POINTER.startVisualSelect()
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

const insertModeHandler = (page, e, input) => {
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
            TABS.webContents(page).send("action", "exitFullscreen")
            return
        }
    }
    if (input.type.toLowerCase() !== "keydown") {
        return
    }
    // Translate to regular keyboard event
    INPUT.handleKeyboard({
        "ctrlKey": input.control,
        "shiftKey": input.shift,
        "metaKey": input.meta,
        "altKey": input.alt,
        "key": input.key,
        "isTrusted": true,
        "preventDefault": e.preventDefault
    })
}

const setMode = mode => {
    mode = mode.trim().toLowerCase()
    if (!modes[mode] || currentMode() === mode) {
        return
    }
    if (modes[currentMode()].onLeave) {
        modes[currentMode()].onLeave(mode)
    }
    if (modes[mode].onEnter) {
        modes[mode].onEnter(currentMode())
    }
    document.getElementById("mode").textContent = mode.toLowerCase()
    document.getElementById("mode").style.color = modes[mode].fg || ""
    document.getElementById("mode-container")
        .style.backgroundColor = modes[mode].bg || ""
    TABS.listPages().forEach(page => {
        if (page.getAttribute("webview-id")) {
            TABS.webContents(page).removeAllListeners("before-input-event")
            if (mode === "insert") {
                TABS.webContents(page).on("before-input-event", (e, input) => {
                    insertModeHandler(page, e, input)
                })
            }
        }
    })
    ACTIONS.setFocusCorrectly()
}

const currentMode = () => document.getElementById("mode").textContent.trim()

const allModes = () => Object.keys(modes)

module.exports = {init, setMode, currentMode, allModes}
