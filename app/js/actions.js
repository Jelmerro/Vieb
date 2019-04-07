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
/* global COMMAND MODES TABS SETTINGS UTIL */
"use strict"

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
                matchCase: SETTINGS.get("caseSensitiveSearch")
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
                matchCase: SETTINGS.get("caseSensitiveSearch")
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

const scrollPageUp = () => {
    try {
        TABS.currentPage().executeJavaScript(
            "window.scrollBy(0, -window.innerHeight + 50)", true)
    } catch (e) {
        //No page is available, not an issue
    }
}

const scrollPageDownHalf = () => {
    try {
        TABS.currentPage().executeJavaScript(
            "window.scrollBy(0, window.innerHeight / 2 - 25)", true)
    } catch (e) {
        //No page is available, not an issue
    }
}

const scrollPageDown = () => {
    try {
        TABS.currentPage().executeJavaScript(
            "window.scrollBy(0, window.innerHeight - 50)", true)
    } catch (e) {
        //No page is available, not an issue
    }
}

const scrollPageUpHalf = () => {
    try {
        TABS.currentPage().executeJavaScript(
            "window.scrollBy(0, -window.innerHeight / 2 + 25)", true)
    } catch (e) {
        //No page is available, not an issue
    }
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
        const level = TABS.currentPage().getZoomLevel()
        if (level <= -7) {
            return
        }
        TABS.currentPage().setZoomLevel(level - 1)
    } catch (e) {
        //No page is available, not an issue
    }
}

const zoomIn = () => {
    try {
        const level = TABS.currentPage().getZoomLevel()
        if (level >= 7) {
            return
        }
        TABS.currentPage().setZoomLevel(level + 1)
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
            TABS.currentPage().findInPage(currentSearch, {
                matchCase: SETTINGS.get("caseSensitiveSearch")
            })
        } catch (e) {
            //No page is available, not an issue
        }
        MODES.setMode("normal")
    }
    if (MODES.currentMode() === "nav") {
        const urlElement = document.getElementById("url")
        const location = urlElement.value.trim()
        if (location !== "") {
            if (location.startsWith("vieb://")) {
                const specialPage = location.replace(
                    "vieb://", "").split("#")[0]
                const section = location.split("#").slice(1).join("#")
                if (TABS.specialPagesList().indexOf(specialPage) !== -1) {
                    COMMAND.openSpecialPage(specialPage, section || null)
                } else {
                    COMMAND.openSpecialPage("help")
                }
            } else if (UTIL.hasProtocol(location)) {
                TABS.navigateTo(location)
            } else if (UTIL.isUrl(location)) {
                TABS.navigateTo("https://" + location)
            } else {
                TABS.navigateTo(SETTINGS.get("search") + location)
            }
        }
        urlElement.className = ""
        MODES.setMode("normal")
    }
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
        if (["search", "command"].indexOf(MODES.currentMode()) !== -1) {
            window.focus()
            urlElement.focus()
            if (urlElement.value === TABS.currentPage().src) {
                urlElement.value = ""
            }
            if (urlElement.value.startsWith("vieb://")) {
                urlElement.value = ""
            }
        }
        if (MODES.currentMode() === "nav") {
            window.focus()
            urlElement.focus()
            if (urlElement.value === TABS.currentPage().src) {
                urlElement.select()
            }
            if (urlElement.value.startsWith("vieb://")) {
                urlElement.select()
            }
        }
    }
    if (MODES.currentMode() === "nav") {
        if (urlElement.value.trim() === "") {
            urlElement.className = ""
        } else if (UTIL.isUrl(urlElement.value.trim())) {
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
    scrollPageUp,
    scrollPageDownHalf,
    scrollPageDown,
    scrollPageUpHalf,
    zoomReset,
    zoomIn,
    zoomOut,
    toNormalMode,
    useEnteredData,
    setFocusCorrectly
}
