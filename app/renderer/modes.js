/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2023 Jelmer van Arnhem
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
    currentPage,
    currentMode,
    guiRelatedUpdate,
    getMouseConf,
    updateScreenshotHighlight
} = require("./common")

// Sort order determines the appearance in the mode list
/* eslint-disable sort-keys/sort-keys-fix */
const modes = {
    "normal": {},
    "insert": {
        "onLeave": newMode => {
            if (currentPage().getAttribute("dom-ready")) {
                currentPage().send("action", "blur")
            }
            if (newMode !== "pointer" && !getMouseConf("pageoutsideinsert")) {
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
            const {resetScreenshotDrag, resetInputHistory} = require("./input")
            resetInputHistory()
            resetScreenshotDrag()
        },
        "onLeave": () => {
            const {emptySuggestions} = require("./suggest")
            emptySuggestions()
            updateScreenshotHighlight(true)
            const {resetScreenshotDrag} = require("./input")
            resetScreenshotDrag()
            document.getElementById("url").setSelectionRange(0, 0)
            window.getSelection().removeAllRanges()
        }
    },
    "search": {
        "onEnter": () => {
            const {resetInputHistory} = require("./input")
            resetInputHistory()
        },
        "onLeave": () => {
            const {resetIncrementalSearch} = require("./actions")
            resetIncrementalSearch()
            document.getElementById("url").setSelectionRange(0, 0)
            window.getSelection().removeAllRanges()
        }
    },
    "explore": {
        "onEnter": () => {
            const {updateUrl} = require("./tabs")
            updateUrl(currentPage(), true)
            const {resetPosition} = require("./explorehistory")
            resetPosition()
            const {resetInputHistory} = require("./input")
            resetInputHistory()
            if (!document.getSelection().toString()) {
                document.getElementById("url").select()
            }
        },
        "onLeave": () => {
            const {emptySuggestions} = require("./suggest")
            emptySuggestions()
            document.getElementById("url").setSelectionRange(0, 0)
            window.getSelection().removeAllRanges()
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
            if (newMode !== "insert" && !getMouseConf("pageoutsideinsert")) {
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
                startFollow("current")
            } else if (mode === "search") {
                const {toSearchMode} = require("./actions")
                toSearchMode()
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
    if (currentPage().getAttribute("dom-ready")) {
        if (currentPage()?.isCrashed() && "fipv".includes(mode[0])) {
            return
        }
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
