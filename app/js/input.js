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
/* global MODES TABS COMMAND */
"use strict"

const urlLib = require("url")
const remoteLib = require("electron").remote
let currentSearch = ""

const init = () => {
    window.addEventListener("keydown", handleKeyboard)
    window.addEventListener("keypress", handleUserInput)
    window.addEventListener("keyup", handleUserInput)
    window.addEventListener("click", () => {
        setFocus()
    })
    remoteLib.getCurrentWindow().on("close", e => {
        e.preventDefault()
        COMMAND.quit()
    })
}

const handleKeyboard = e => {
    if (e.altKey || e.metaKey) {
        e.preventDefault()
        return
    }
    if (MODES.currentMode() === "normal") {
        if (!e.shiftKey && !e.ctrlKey) {
            if (e.code === "KeyB") {
                TABS.switchToTab(TABS.listTabs().indexOf(TABS.currentTab()) - 1)
                e.preventDefault()
                return
            }
            if (e.code === "KeyD") {
                TABS.closeTab()
                e.preventDefault()
                return
            }
            if (e.code === "KeyE") {
                MODES.setMode("nav")
                e.preventDefault()
                return
            }
            if (e.code === "KeyI") {
                MODES.setMode("insert")
                e.preventDefault()
                return
            }
            if (e.code === "KeyN") {
                if (currentSearch !== "") {
                    try {
                        TABS.currentPage().findInPage(currentSearch, {
                            findNext: true,
                            matchCase: true
                        })
                    } catch (e) {
                        //Searching an empty tab with an existing search
                    }
                }
                e.preventDefault()
                return
            }
            if (e.code === "KeyR") {
                TABS.currentPage().reload()
                e.preventDefault()
                return
            }
            if (e.code === "KeyT") {
                TABS.addTab()
                MODES.setMode("nav")
                e.preventDefault()
                return
            }
            if (e.code === "KeyW") {
                TABS.switchToTab(TABS.listTabs().indexOf(TABS.currentTab()) + 1)
                e.preventDefault()
                return
            }
            if (e.code === "Slash") {
                MODES.setMode("search")
                e.preventDefault()
                return
            }
        }
        if (e.shiftKey && !e.ctrlKey) {
            if (e.code === "KeyN") {
                if (currentSearch !== "") {
                    try {
                        TABS.currentPage().findInPage(currentSearch, {
                            forward: false,
                            findNext: true,
                            matchCase: true
                        })
                    } catch (e) {
                        //Searching an empty tab with an existing search
                    }
                }
                e.preventDefault()
                return
            }
            if (e.code === "KeyR") {
                TABS.currentPage().reloadIgnoringCache()
                e.preventDefault()
                return
            }
            if (e.code === "Semicolon") {
                MODES.setMode("command")
                e.preventDefault()
                return
            }
        }
    }
    const escapableModes = ["insert", "command", "search", "nav"]
    if (escapableModes.indexOf(MODES.currentMode()) !== -1) {
        if (!e.shiftKey && !e.ctrlKey) {
            if (e.code === "Escape") {
                //TODO setting to disable this when in insert mode
                MODES.setMode("normal")
                e.preventDefault()
                return
            }
        }
        if (!e.shiftKey && e.ctrlKey) {
            if (e.code === "BracketLeft") {
                MODES.setMode("normal")
                e.preventDefault()
                return
            }
        }
    }
    handleUserInput(e)
}

const handleUserInput = e => {
    if (e.ctrlKey || e.altKey || e.metaKey) {
        e.preventDefault()
        return
    }
    if (MODES.currentMode() === "command") {
        if (e.code === "Tab") {
            e.preventDefault()
        }
        if (e.code === "Enter") {
            COMMAND.execute(document.getElementById("url").value.trim())
            MODES.setMode("normal")
        }
    }
    if (MODES.currentMode() === "search") {
        if (e.code === "Tab") {
            e.preventDefault()
        }
        if (e.code === "Enter") {
            currentSearch = document.getElementById("url").value
            try {
                TABS.currentPage().stopFindInPage("clearSelection")
                TABS.currentPage().findInPage(currentSearch, {matchCase: true})
            } catch (e) {
                //Not a problem, will be catched when pressing n or N
            }
            MODES.setMode("normal")
            e.preventDefault()
            return
        }
    }
    if (MODES.currentMode() === "nav") {
        if (e.code === "Tab") {
            e.preventDefault()
        }
        if (e.code === "Enter") {
            const urlElement = document.getElementById("url")
            if (urlElement.value.trim() !== "") {
                if (isUrl(urlElement.value.trim())) {
                    const parsed = urlLib.parse(urlElement.value.trim())
                    if (parsed.protocol === null) {
                        TABS.currentPage().src = `https://${parsed.href}`
                    } else {
                        TABS.currentPage().src = parsed.href
                    }
                } else {
                    TABS.currentPage().src =
                        `https://duckduckgo.com/?q=${urlElement.value.trim()}`
                }
            }
            urlElement.className = ""
            MODES.setMode("normal")
            e.preventDefault()
            return
        }
    }
    setFocus()
}

const isUrl = location => {
    if (location.indexOf(".") === -1) {
        return false
    }
    //TODO more conditions
    return true
}

const setFocus = () => {
    const urlElement = document.getElementById("url")
    if (MODES.currentMode() === "normal") {
        window.focus()
        urlElement.className = ""
        urlElement.blur()
        urlElement.value = TABS.currentPage().src
        window.focus()
    }
    if (MODES.currentMode() === "insert") {
        TABS.currentPage().focus()
        TABS.currentPage().click()
    }
    if (document.activeElement !== urlElement) {
        if (MODES.currentMode() === "command") {
            window.focus()
            urlElement.focus()
            if (urlElement.value === TABS.currentPage().src) {
                urlElement.value = ""
            }
        }
        if (MODES.currentMode() === "search") {
            window.focus()
            urlElement.focus()
            if (urlElement.value === TABS.currentPage().src) {
                urlElement.value = currentSearch
                urlElement.select()
            }
        }
        if (MODES.currentMode() === "nav") {
            window.focus()
            urlElement.focus()
            if (urlElement.value === TABS.currentPage().src) {
                urlElement.select()
            }
        }
    }
    if (MODES.currentMode() === "nav") {
        if (urlElement.value.trim() === "") {
            urlElement.className = ""
        } else if (isUrl(urlElement.value.trim())) {
            urlElement.className = "url"
        } else {
            urlElement.className = "search"
        }
    }
}

module.exports = {
    init,
    setFocus
}
