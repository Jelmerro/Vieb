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

import {
    currentMode,
    currentPage,
    getMouseConf,
    getUrl,
    guiRelatedUpdate,
    updateScreenshotHighlight
} from "../preloadutil.js"
import {
    resetIncrementalSearch, setFocusCorrectly, toSearchMode
} from "./actions.js"
import {resetPosition} from "./commandhistory.js"
import {cancelFollow, startFollow} from "./follow.js"
import {
    requestSuggestUpdate, resetInputHistory, resetScreenshotDrag
} from "./input.js"
import {releaseKeys, start, startVisualSelect} from "./pointer.js"
import {emptySuggestions} from "./suggest.js"
import {updateUrl} from "./tabs.js"

// Sort order determines the appearance in the mode list
/* eslint-disable perfectionist/sort-objects */
/** @type {{[K in import("../preloadutil.js").Mode]: {
 *   onLeave?: (newMode: import("../preloadutil.js").Mode) => void,
 *   onEnter?: () => void
 * }}} */
const modes = {
    "normal": {},
    "insert": {
        /**
         * When leaving insert mode, all page elements should be unfocused.
         * @param {import("../preloadutil.js").Mode} newMode
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
            resetPosition()
            resetInputHistory()
            resetScreenshotDrag()
        },
        /** Restore url value then hide suggestions, selection and highlight. */
        "onLeave": () => {
            const url = getUrl()
            emptySuggestions()
            updateScreenshotHighlight(true)
            resetScreenshotDrag()
            url?.setSelectionRange(0, 0)
            window.getSelection()?.removeAllRanges()
        }
    },
    "search": {
        /** Restart the search history. */
        "onEnter": () => {
            resetInputHistory()
        },
        /** Clear any temporary searches and remove selection. */
        "onLeave": () => {
            const url = getUrl()
            resetIncrementalSearch({"src": "user"})
            url?.setSelectionRange(0, 0)
            window.getSelection()?.removeAllRanges()
        }
    },
    "explore": {
        /** Select the url value and restart explore history. */
        "onEnter": () => {
            const url = getUrl()
            const page = currentPage()
            if (page) {
                updateUrl(page, true)
            }
            resetPosition()
            resetInputHistory()
            requestSuggestUpdate()
            if (!document.getSelection()?.toString() && url) {
                url.select()
            }
        },
        /** Show the current url again and clear suggestions. */
        "onLeave": () => {
            const url = getUrl()
            emptySuggestions()
            url?.setSelectionRange(0, 0)
            window.getSelection()?.removeAllRanges()
        }
    },
    "follow": {
        /**
         * Stop running the follow mode parts then release keys if needed.
         * @param {import("../preloadutil.js").Mode} newMode
         */
        "onLeave": newMode => {
            cancelFollow()
            if (!["pointer", "visual"].includes(newMode)) {
                releaseKeys()
            }
        }
    },
    "pointer": {
        /**
         * Hide url hover and release keys if needed.
         * @param {import("../preloadutil.js").Mode} newMode
         */
        "onLeave": newMode => {
            if (!["follow", "visual"].includes(newMode)) {
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
         * @param {import("../preloadutil.js").Mode} newMode
         */
        "onLeave": newMode => {
            if (!["follow", "pointer"].includes(newMode)) {
                releaseKeys()
            }
        }
    }
}
/* eslint-enable perfectionist/sort-objects */

/**
 * Set the current mode.
 * @param {import("../preloadutil.js").Mode} mode
 */
export const setMode = mode => {
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
    setFocusCorrectly()
}

/** Generate the mode suggestions dropdown with click actions. */
export const init = () => {
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
                startFollow("current")
            } else if (mode === "search") {
                toSearchMode({"src": "user"})
            } else if (mode === "pointer") {
                start()
            } else if (mode === "visual") {
                startVisualSelect()
            } else {
                setMode(mode)
            }
            e.preventDefault()
        })
        modeList?.append(modeEntry)
    })
}
