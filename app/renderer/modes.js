/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2024 Jelmer van Arnhem
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
} from "./common.js"

// Sort order determines the appearance in the mode list
/* eslint-disable sort-keys/sort-keys-fix */
/** @type {{[K in import("./common.js").Mode]: {
 *   onLeave?: (newMode: import("./common.js").Mode) => Promise<void>,
 *   onEnter?: () => Promise<void>
 * }}} */
const modes = {
    "normal": {},
    "insert": {
        /**
         * When leaving insert mode, all page elements should be unfocused.
         * @param {import("./common.js").Mode} newMode
         */
        "onLeave": async newMode => {
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
        "onEnter": async() => {
            const url = getUrl()
            if (url) {
                url.value = ""
            }
            const {resetPosition} = await import("./commandhistory.js")
            resetPosition()
            const {
                resetScreenshotDrag, resetInputHistory
            } = await import("./input.js")
            resetInputHistory()
            resetScreenshotDrag()
        },
        /** Restore url value then hide suggestions, selection and highlight. */
        "onLeave": async() => {
            const url = getUrl()
            const {emptySuggestions} = await import("./suggest.js")
            emptySuggestions()
            updateScreenshotHighlight(true)
            const {resetScreenshotDrag} = await import("./input.js")
            resetScreenshotDrag()
            url?.setSelectionRange(0, 0)
            window.getSelection()?.removeAllRanges()
        }
    },
    "search": {
        /** Restart the search history. */
        "onEnter": async() => {
            const {resetInputHistory} = await import("./input.js")
            resetInputHistory()
        },
        /** Clear any temporary searches and remove selection. */
        "onLeave": async() => {
            const url = getUrl()
            const {resetIncrementalSearch} = await import("./actions.js")
            resetIncrementalSearch({"src": "user"})
            url?.setSelectionRange(0, 0)
            window.getSelection()?.removeAllRanges()
        }
    },
    "explore": {
        /** Select the url value and restart explore history. */
        "onEnter": async() => {
            const url = getUrl()
            const {updateUrl} = await import("./tabs.js")
            const page = currentPage()
            if (page) {
                updateUrl(page, true)
            }
            const {resetPosition} = await import("./explorehistory.js")
            resetPosition()
            const {
                resetInputHistory, requestSuggestUpdate
            } = await import("./input.js")
            resetInputHistory()
            requestSuggestUpdate()
            if (!document.getSelection()?.toString() && url) {
                url.select()
            }
        },
        /** Show the current url again and clear suggestions. */
        "onLeave": async() => {
            const url = getUrl()
            const {emptySuggestions} = await import("./suggest.js")
            emptySuggestions()
            url?.setSelectionRange(0, 0)
            window.getSelection()?.removeAllRanges()
        }
    },
    "follow": {
        /**
         * Stop running the follow mode parts then release keys if needed.
         * @param {import("./common.js").Mode} newMode
         */
        "onLeave": async newMode => {
            const {cancelFollow} = await import("./follow.js")
            cancelFollow()
            if (!["visual", "pointer"].includes(newMode)) {
                const {releaseKeys} = await import("./pointer.js")
                releaseKeys()
            }
        }
    },
    "pointer": {
        /**
         * Hide url hover and release keys if needed.
         * @param {import("./common.js").Mode} newMode
         */
        "onLeave": async newMode => {
            if (!["visual", "follow"].includes(newMode)) {
                const {releaseKeys} = await import("./pointer.js")
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
         * @param {import("./common.js").Mode} newMode
         */
        "onLeave": async newMode => {
            if (!["pointer", "follow"].includes(newMode)) {
                const {releaseKeys} = await import("./pointer.js")
                releaseKeys()
            }
        }
    }
}

/**
 * Set the current mode.
 * @param {import("./common.js").Mode} mode
 */
export const setMode = async mode => {
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
    const {setFocusCorrectly} = await import("./actions.js")
    setFocusCorrectly()
}

/** Generate the mode suggestions dropdown with click actions. */
export const init = () => {
    const modeList = document.getElementById("mode-suggestions")
    Object.keys(modes).forEach(mode => {
        const modeEntry = document.createElement("div")
        modeEntry.textContent = mode
        modeEntry.className = `no-focus-reset ${mode}`
        modeEntry.addEventListener("click", async e => {
            if (currentMode() === mode) {
                return
            }
            if (mode === "follow") {
                const {startFollow} = await import("./follow.js")
                startFollow("current")
            } else if (mode === "search") {
                const {toSearchMode} = await import("./actions.js")
                toSearchMode({"src": "user"})
            } else if (mode === "pointer") {
                const {start} = await import("./pointer.js")
                start()
            } else if (mode === "visual") {
                const {startVisualSelect} = await import("./pointer.js")
                startVisualSelect()
            } else {
                setMode(mode)
            }
            e.preventDefault()
        })
        modeList?.append(modeEntry)
    })
}
