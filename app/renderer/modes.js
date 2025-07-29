/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2025 Jelmer van Arnhem
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
    currentMode,
    currentPage,
    getMouseConf,
    getUrl,
    guiRelatedUpdate,
    updateScreenshotHighlight
} = require("./common")

// Sort order determines the appearance in the mode list
/* eslint-disable perfectionist/sort-objects */
/** @type {{[K in import("./common").Mode]: {
 *   onLeave?: (newMode: import("./common").Mode) => void, onEnter?: () => void
 * }}} */
const modes = {
    "normal": {},
    "insert": {
        /**
         * When leaving insert mode, all page elements should be unfocused.
         * @param {import("./common").Mode} newMode
         */
        "onLeave": newMode => {
            if (currentPage()?.getAttribute("dom-ready")) {
                currentPage()?.send("action", "blur")
            }
            if (newMode !== "pointer" && !getMouseConf("pageoutsideinsert")) {
                const hoverEl = document.getElementById("url-hover")
                if (hoverEl) {
                    hoverEl.textContent = ""
                    hoverEl.style.display = "none"
                }
            }
        }
    },
    "command": {
        /** Clear the url value and restart the command history. */
        "onEnter": () => {
            const url = getUrl()
            if (url) {
                url.value = ""
            }
            const {resetPosition} = require("./commandhistory")
            resetPosition()
            const {resetScreenshotDrag, resetInputHistory} = require("./input")
            resetInputHistory()
            resetScreenshotDrag()
        },
        /** Restore url value then hide suggestions, selection and highlight. */
        "onLeave": () => {
            const url = getUrl()
            const {emptySuggestions} = require("./suggest")
            emptySuggestions()
            updateScreenshotHighlight(true)
            const {resetScreenshotDrag} = require("./input")
            resetScreenshotDrag()
            url?.setSelectionRange(0, 0)
            window.getSelection()?.removeAllRanges()
        }
    },
    "search": {
        /** Restart the search history. */
        "onEnter": () => {
            const {resetInputHistory} = require("./input")
            resetInputHistory()
        },
        /** Clear any temporary searches and remove selection. */
        "onLeave": () => {
            const url = getUrl()
            const {resetIncrementalSearch} = require("./actions")
            resetIncrementalSearch({"src": "user"})
            url?.setSelectionRange(0, 0)
            window.getSelection()?.removeAllRanges()
        }
    },
    "explore": {
        /** Select the url value and restart explore history. */
        "onEnter": () => {
            const url = getUrl()
            const {updateUrl} = require("./tabs")
            const page = currentPage()
            if (page) {
                updateUrl(page, true)
            }
            const {resetPosition} = require("./explorehistory")
            resetPosition()
            const {resetInputHistory, requestSuggestUpdate} = require("./input")
            resetInputHistory()
            requestSuggestUpdate()
            if (!document.getSelection()?.toString() && url) {
                url.select()
            }
        },
        /** Show the current url again and clear suggestions. */
        "onLeave": () => {
            const url = getUrl()
            const {emptySuggestions} = require("./suggest")
            emptySuggestions()
            url?.setSelectionRange(0, 0)
            window.getSelection()?.removeAllRanges()
        }
    },
    "follow": {
        /**
         * Stop running the follow mode parts then release keys if needed.
         * @param {import("./common").Mode} newMode
         */
        "onLeave": newMode => {
            const {cancelFollow} = require("./follow")
            cancelFollow()
            if (!["pointer", "visual"].includes(newMode)) {
                const {releaseKeys} = require("./pointer")
                releaseKeys()
            }
        }
    },
    "pointer": {
        /**
         * Hide url hover and release keys if needed.
         * @param {import("./common").Mode} newMode
         */
        "onLeave": newMode => {
            if (!["follow", "visual"].includes(newMode)) {
                const {releaseKeys} = require("./pointer")
                releaseKeys()
            }
            if (newMode !== "insert" && !getMouseConf("pageoutsideinsert")) {
                const hoverEl = document.getElementById("url-hover")
                if (hoverEl) {
                    hoverEl.style.display = "none"
                }
            }
        }
    },
    "visual": {
        /**
         * Release keys if needed.
         * @param {import("./common").Mode} newMode
         */
        "onLeave": newMode => {
            if (!["follow", "pointer"].includes(newMode)) {
                const {releaseKeys} = require("./pointer")
                releaseKeys()
            }
        }
    }
}
/* eslint-enable perfectionist/sort-objects */

/**
 * Set the current mode.
 * @param {import("./common").Mode} mode
 */
const setMode = mode => {
    const page = currentPage()
    if (!modes[mode] || currentMode() === mode || !page) {
        return
    }
    if (page.getAttribute("dom-ready")) {
        if (page.isCrashed() && "fipv".includes(mode[0])) {
            return
        }
    }
    modes[currentMode()].onLeave?.(mode)
    modes[mode]?.onEnter?.()
    const modeEl = document.getElementById("mode")
    if (modeEl) {
        modeEl.textContent = mode
    }
    document.body.setAttribute("current-mode", mode)
    guiRelatedUpdate("navbar")
    const {setFocusCorrectly} = require("./actions")
    setFocusCorrectly()
}

/** Generate the mode suggestions dropdown with click actions. */
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
                toSearchMode({"src": "user"})
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
        modeList?.append(modeEntry)
    })
}

module.exports = {init, setMode}
