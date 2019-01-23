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
/* global COMMAND MODES TABS */
"use strict"

const url = require("url")
let currentSearch = ""

const previousTab = () => {
    TABS.switchToTab(TABS.listTabs().indexOf(TABS.currentTab()) - 1)
}

const closeTab = () => {
    TABS.closeTab()
}

const toNavMode = () => {
    MODES.setMode("nav")
}

const scrollTop = () => {
    try {
        TABS.currentPage().executeJavaScript("window.scrollTo(0, 0)", true)
    } catch (e) {
        //No page is available, not an issue
    }
}

const scrollLeft = () => {
    try {
        TABS.currentPage().executeJavaScript("window.scrollBy(-100, 0)", true)
    } catch (e) {
        //No page is available, not an issue
    }
}

const toInsertMode = () => {
    MODES.setMode("insert")
}

const scrollDown = () => {
    try {
        TABS.currentPage().executeJavaScript("window.scrollBy(0, 100)", true)
    } catch (e) {
        //No page is available, not an issue
    }
}

const scrollUp = () => {
    try {
        TABS.currentPage().executeJavaScript("window.scrollBy(0, -100)", true)
    } catch (e) {
        //No page is available, not an issue
    }
}

const scrollRight = () => {
    try {
        TABS.currentPage().executeJavaScript("window.scrollBy(100, 0)", true)
    } catch (e) {
        //No page is available, not an issue
    }
}

const nextSearchMatch = () => {
    if (currentSearch !== "") {
        try {
            TABS.currentPage().findInPage(currentSearch, {
                findNext: true,
                matchCase: true
            })
        } catch (e) {
            //No page is available, not an issue
        }
    }
}

const reload = () => {
    try {
        TABS.currentPage().reload()
    } catch (e) {
        //No page is available, not an issue
    }
}

const openNewTab = () => {
    TABS.addTab()
    MODES.setMode("nav")
}

const nextTab = () => {
    TABS.switchToTab(TABS.listTabs().indexOf(TABS.currentTab()) + 1)
}

const toSearchMode = () => {
    MODES.setMode("search")
}

const scrollBottom = () => {
    const javascript =
        "window.scrollTo(document.body.scrollWidth, document.body.scrollHeight)"
    try {
        TABS.currentPage().executeJavaScript(javascript, true)
    } catch (e) {
        //No page is available, not an issue
    }
}

const backInHistory = () => {
    try {
        TABS.currentPage().goBack()
    } catch (e) {
        //No page is available, not an issue
    }
}

const forwardInHistory = () => {
    try {
        TABS.currentPage().goForward()
    } catch (e) {
        //No page is available, not an issue
    }
}

const previousSearchMatch = () => {
    if (currentSearch !== "") {
        try {
            TABS.currentPage().findInPage(currentSearch, {
                forward: false,
                findNext: true,
                matchCase: true
            })
        } catch (e) {
            //No page is available, not an issue
        }
    }
}

const reloadWithoutCache = () => {
    try {
        TABS.currentPage().reloadIgnoringCache()
    } catch (e) {
        //No page is available, not an issue
    }
}

const toCommandMode = () => {
    MODES.setMode("command")
}

const zoomReset = () => {
    try {
        TABS.currentPage().setZoomLevel(0)
    } catch (e) {
        //No page is available, not an issue
    }
}

const zoomOut = () => {
    try {
        TABS.currentPage().getZoomLevel(level => {
            if (level <= -7) {
                return
            }
            TABS.currentPage().setZoomLevel(level - 1)
        })
    } catch (e) {
        //No page is available, not an issue
    }
}

const zoomIn = () => {
    try {
        TABS.currentPage().getZoomLevel(level => {
            if (level >= 7) {
                return
            }
            TABS.currentPage().setZoomLevel(level + 1)
        })
    } catch (e) {
        //No page is available, not an issue
    }
}

const toNormalMode = () => {
    MODES.setMode("normal")
}

const useEnteredData = () => {
    if (MODES.currentMode() === "command") {
        COMMAND.execute(document.getElementById("url").value.trim())
        MODES.setMode("normal")
    }
    if (MODES.currentMode() === "search") {
        currentSearch = document.getElementById("url").value
        try {
            TABS.currentPage().stopFindInPage("clearSelection")
            TABS.currentPage().findInPage(currentSearch, {matchCase: true})
        } catch (e) {
            //No page is available, not an issue
        }
        MODES.setMode("normal")
    }
    if (MODES.currentMode() === "nav") {
        const urlElement = document.getElementById("url")
        if (urlElement.value.trim() !== "") {
            if (isUrl(urlElement.value.trim())) {
                const parsed = url.parse(urlElement.value.trim())
                if (parsed.protocol === null) {
                    TABS.navigateTo("https://" + parsed.href)
                } else {
                    TABS.navigateTo(parsed.href)
                }
            } else {
                //TODO search engine setting
                const search = "https://duckduckgo.com/?q="
                TABS.navigateTo(search + urlElement.value.trim())
            }
        }
        urlElement.className = ""
        MODES.setMode("normal")
    }
}

const isUrl = location => {
    if (url.parse(location).protocol !== null) {
        return true
    }
    if (location.indexOf(".") === -1) {
        return false
    }
    //TODO more conditions
    return true
}

const setFocusCorrectly = () => {
    const urlElement = document.getElementById("url")
    if (MODES.currentMode() === "normal") {
        window.focus()
        urlElement.className = ""
        urlElement.blur()
        TABS.updateUrl(TABS.currentPage())
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
    previousTab,
    closeTab,
    toNavMode,
    scrollTop,
    scrollLeft,
    toInsertMode,
    scrollDown,
    scrollUp,
    scrollRight,
    nextSearchMatch,
    reload,
    openNewTab,
    nextTab,
    toSearchMode,
    scrollBottom,
    backInHistory,
    forwardInHistory,
    previousSearchMatch,
    reloadWithoutCache,
    toCommandMode,
    zoomReset,
    zoomIn,
    zoomOut,
    toNormalMode,
    useEnteredData,
    setFocusCorrectly
}
