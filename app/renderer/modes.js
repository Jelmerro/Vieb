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
"use strict"

const {
    currentPage, currentMode, getSetting, guiRelatedUpdate
} = require("./common")

// Sort order determines the appearance in the mode list
/* eslint-disable sort-keys-fix/sort-keys-fix */
const modes = {
    "normal": {},
    "insert": {
        "onLeave": newMode => {
            if (currentPage().getAttribute("dom-ready")) {
                currentPage().send("action", "blur")
            }
            if (newMode !== "pointer" && !getSetting("mouse")) {
                document.getElementById("url-hover").textContent = ""
                document.getElementById("url-hover").style.display = "none"
            }
        }
    },
    "command": {
        "onEnter": () => {
            document.getElementById("url").value = ""
            const {resetPosition} = require("./commandhistory")
            resetPosition()
            const {resetInputHistory} = require("./input")
            resetInputHistory()
        },
        "onLeave": () => {
            const {emptySuggestions} = require("./suggest")
            emptySuggestions()
        }
    },
    "search": {
        "onEnter": () => {
            const {resetInputHistory} = require("./input")
            resetInputHistory()
        }
    },
    "explore": {
        "onEnter": () => {
            const {updateUrl} = require("./tabs")
            updateUrl(currentPage(), true)
            document.getElementById("url").select()
            const {resetPosition} = require("./explorehistory")
            resetPosition()
            const {resetInputHistory} = require("./input")
            resetInputHistory()
        },
        "onLeave": () => {
            const {emptySuggestions} = require("./suggest")
            emptySuggestions()
        }
    },
    "follow": {
        "onLeave": newMode => {
            const {cancelFollow} = require("./follow")
            cancelFollow()
            if (!["visual", "pointer"].includes(newMode)) {
                const {releaseKeys} = require("./pointer")
                releaseKeys()
            }
        }
    },
    "pointer": {
        "onLeave": newMode => {
            if (!["visual", "follow"].includes(newMode)) {
                const {releaseKeys} = require("./pointer")
                releaseKeys()
            }
            if (newMode !== "insert" && !getSetting("mouse")) {
                document.getElementById("url-hover").style.display = "none"
            }
        }
    },
    "visual": {
        "onLeave": newMode => {
            if (!["pointer", "follow"].includes(newMode)) {
                const {releaseKeys} = require("./pointer")
                releaseKeys()
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
                const {startFollow} = require("./follow")
                startFollow(false)
            } else if (mode === "pointer") {
                const {start} = require("./pointer")
                start()
            } else if (mode === "visual") {
                const {startVisualSelect} = require("./pointer")
                startVisualSelect()
            } else {
                setMode(mode)
            }
            e.preventDefault()
        })
        modeList.appendChild(modeEntry)
    })
}

const setMode = m => {
    const mode = m.trim().toLowerCase()
    if (!modes[mode] || currentMode() === mode || !currentPage()) {
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
    guiRelatedUpdate("navbar")
    const {setFocusCorrectly} = require("./actions")
    setFocusCorrectly()
}

module.exports = {init, setMode}
