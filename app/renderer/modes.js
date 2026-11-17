/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2026 Jelmer van Arnhem
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
    getUrl,
    guiRelatedUpdate,
    updateScreenshotHighlight
} = require("./common")

// Sort order determines the appearance in the mode list
/* eslint-disable perfectionist/sort-objects */
/**
 * @type {{[K in import("./common").Mode]: {
 *   onLeave?: (newMode: import("./common").Mode) => Promise<void>|void,
 *   onEnter?: () => Promise<void>|void
 * }}}
 */
const modes = {
    "normal": {},
    "insert": {
        /** When entering or leaving insert mode, reset the leave timeout. */
        "onEnter": () => {
            const {resetInsertLeaveTimeout} = require("./input")
            resetInsertLeaveTimeout()
        },
        /**
         * When leaving insert mode, all page elements should be unfocused.
         * @param {import("./common").Mode} newMode
         */
        "onLeave": newMode => {
            if (currentPage()?.hasAttribute("dom-ready")) {
                currentPage()?.send("action", "blur").catch(() => null)
            }
            const {getMouseConf} = require("./settings")
            if (newMode !== "pointer" && !getMouseConf("pageoutsideinsert")) {
                const hoverEl = document.getElementById("url-hover")
                if (hoverEl) {
                    hoverEl.textContent = ""
                    hoverEl.style.display = "none"
                }
            }
            const {resetInsertLeaveTimeout} = require("./input")
            resetInsertLeaveTimeout()
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
        "onEnter": async() => {
            const url = getUrl()
            const {updateUrl} = require("./tabs")
            const page = currentPage()
            if (page) {
                await updateUrl(page, true)
            }
            const {resetPosition} = require("./explorehistory")
            resetPosition()
            const {resetInputHistory, requestSuggestUpdate} = require("./input")
            resetInputHistory()
            await requestSuggestUpdate()
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
            const {getMouseConf} = require("./settings")
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
            if (["follow", "pointer"].includes(newMode)) {
                return
            }
            const {releaseKeys} = require("./pointer")
            releaseKeys()
        }
    }
}
/* eslint-enable perfectionist/sort-objects */

/**
 * Set the current mode.
 * @param {import("./common").Mode} mode
 */
const setMode = async mode => {
    const page = currentPage()
    if (!modes[mode] || currentMode() === mode || !page) {
        return
    }
    if (page.hasAttribute("dom-ready")
        && page.isCrashed() && "fipv".includes(mode[0])) {
        return
    }
    if (mode === "insert") {
        const isCustomView = page?.src.startsWith("sourceviewer:")
            || page?.src.startsWith("readerview:")
            || page?.src.startsWith("markdownviewer:")
        if (isCustomView) {
            return
        }
    }
    await modes[currentMode()].onLeave?.(mode)
    const modeEl = document.getElementById("mode")
    if (modeEl) {
        modeEl.textContent = mode
    }
    document.body.setAttribute("current-mode", mode)
    await modes[mode]?.onEnter?.()
    await guiRelatedUpdate("navbar")
    const {setFocusCorrectly} = require("./actions")
    await setFocusCorrectly()
}

/** Generate the mode suggestions dropdown with click actions. */
const init = () => {
    const modeList = document.getElementById("mode-suggestions")
    for (const mode of Object.keys(modes)) {
        const modeEntry = document.createElement("div")
        modeEntry.textContent = mode
        modeEntry.className = `no-focus-reset ${mode}`
        modeEntry.addEventListener("click", async e => {
            e.preventDefault()
            if (currentMode() === mode) {
                return
            }
            if (mode === "follow") {
                const {startFollow} = require("./follow")
                await startFollow("current")
            } else if (mode === "search") {
                const {toSearchMode} = require("./actions")
                await toSearchMode({"src": "user"})
            } else if (mode === "pointer") {
                const {start} = require("./pointer")
                await start()
            } else if (mode === "visual") {
                const {startVisualSelect} = require("./pointer")
                await startVisualSelect()
            } else {
                await setMode(mode)
            }
        })
        modeList?.append(modeEntry)
    }
}

module.exports = {init, setMode}
