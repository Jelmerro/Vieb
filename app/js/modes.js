/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2021 Jelmer van Arnhem
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
/* global ACTIONS COMMANDHISTORY EXPLOREHISTORY POINTER FOLLOW SETTINGS SUGGEST
 TABS */
"use strict"

const modes = {
    "normal": {},
    "insert": {
        "onLeave": newMode => {
            if (TABS.currentPage().getAttribute("dom-ready")) {
                TABS.currentPage().send("action", "blur")
            }
            if (newMode !== "pointer" && !SETTINGS.get("mouse")) {
                document.getElementById("url-hover").textContent = ""
                document.getElementById("url-hover").style.display = "none"
            }
        }
    },
    "command": {
        "onEnter": () => {
            document.getElementById("url").value = ""
            COMMANDHISTORY.resetPosition()
        },
        "onLeave": () => SUGGEST.emptySuggestions()
    },
    "search": {},
    "explore": {
        "onEnter": () => {
            TABS.updateUrl(TABS.currentPage(), true)
            document.getElementById("url").select()
            EXPLOREHISTORY.resetPosition()
        },
        "onLeave": () => SUGGEST.emptySuggestions()
    },
    "follow": {
        "onLeave": newMode => {
            FOLLOW.cancelFollow()
            if (!["visual", "pointer"].includes(newMode)) {
                POINTER.releaseKeys()
            }
        }
    },
    "pointer": {
        "onLeave": newMode => {
            if (!["visual", "follow"].includes(newMode)) {
                POINTER.releaseKeys()
            }
            if (newMode !== "insert" && !SETTINGS.get("mouse")) {
                document.getElementById("url-hover").style.display = "none"
            }
        }
    },
    "visual": {
        "onLeave": newMode => {
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
        modeEntry.className = `no-focus-reset ${mode}`
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
        modeList.appendChild(modeEntry)
    })
}

const setMode = mode => {
    mode = mode.trim().toLowerCase()
    if (!modes[mode] || currentMode() === mode || !TABS.currentPage()) {
        return
    }
    if (modes[currentMode()].onLeave) {
        modes[currentMode()].onLeave(mode)
    }
    if (modes[mode].onEnter) {
        modes[mode].onEnter(currentMode())
    }
    document.getElementById("mode").textContent = mode
    document.body.setAttribute("current-mode", mode)
    SETTINGS.guiRelatedUpdate("navbar")
    ACTIONS.setFocusCorrectly()
}

const currentMode = () => document.body.getAttribute("current-mode")

const allModes = () => Object.keys(modes)

module.exports = {init, setMode, currentMode, allModes}
