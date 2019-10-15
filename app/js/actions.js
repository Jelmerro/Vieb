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
/* global COMMAND COMMANDHISTORY FOLLOW MODES SETTINGS SUGGEST TABS UTIL */
"use strict"

const path = require("path")

let currentSearch = ""

const emptySearch = () => {
    TABS.currentPage().stopFindInPage("clearSelection")
    currentSearch = ""
}

const clickOnSearch = () => {
    if (currentSearch) {
        TABS.currentPage().getWebContents().send("search-element-click", "hi")
        emptySearch()
    }
}

const previousTab = () => {
    TABS.switchToTab(TABS.listTabs().indexOf(TABS.currentTab()) - 1)
}

const closeTab = () => {
    TABS.closeTab()
}

const toNavMode = () => {
    MODES.setMode("nav")
}

const startFollowCurrentTab = () => {
    FOLLOW.startFollow(false)
}

const scrollTop = () => {
    try {
        TABS.currentPage().executeJavaScript(
            "window.scrollBy(0, -1000000000)", true)
    } catch (e) {
        // No page is available, not an issue
    }
}

const insertAtFirstInput = () => {
    try {
        TABS.currentPage().getWebContents().send("focus-first-text-input", "")
    } catch (e) {
        // No page is available, not an issue
    }
}

const scrollLeft = () => {
    try {
        TABS.currentPage().executeJavaScript("window.scrollBy(-100, 0)", true)
    } catch (e) {
        // No page is available, not an issue
    }
}

const toInsertMode = () => {
    MODES.setMode("insert")
}

const scrollDown = () => {
    try {
        TABS.currentPage().executeJavaScript("window.scrollBy(0, 100)", true)
    } catch (e) {
        // No page is available, not an issue
    }
}

const scrollUp = () => {
    try {
        TABS.currentPage().executeJavaScript("window.scrollBy(0, -100)", true)
    } catch (e) {
        // No page is available, not an issue
    }
}

const scrollRight = () => {
    try {
        TABS.currentPage().executeJavaScript("window.scrollBy(100, 0)", true)
    } catch (e) {
        // No page is available, not an issue
    }
}

const nextSearchMatch = () => {
    if (currentSearch) {
        try {
            TABS.currentPage().findInPage(currentSearch, {
                "findNext": true,
                "matchCase": SETTINGS.get("caseSensitiveSearch")
            })
        } catch (e) {
            // No page is available, not an issue
        }
    }
}

const reload = () => {
    try {
        if (!TABS.currentPage().isCrashed()) {
            TABS.currentPage().reload()
        }
    } catch (e) {
        // No page is available, not an issue
    }
}

const openNewTab = () => {
    TABS.addTab()
    if (SETTINGS.get("newtab.enterNavMode")) {
        MODES.setMode("nav")
    }
}

const reopenTab = () => {
    TABS.reopenTab()
}

const nextTab = () => {
    TABS.switchToTab(TABS.listTabs().indexOf(TABS.currentTab()) + 1)
}

const toSearchMode = () => {
    MODES.setMode("search")
}

const startFollowNewTab = () => {
    FOLLOW.startFollow(true)
}

const scrollBottom = () => {
    try {
        TABS.currentPage().executeJavaScript(
            "window.scrollBy(0, 1000000000)", true)
    } catch (e) {
        // No page is available, not an issue
    }
}

const backInHistory = () => {
    try {
        TABS.currentPage().goBack()
    } catch (e) {
        // No page is available, not an issue
    }
}

const openNewTabAtAlternativePosition = () => {
    TABS.addTab(null, true)
    if (SETTINGS.get("newtab.enterNavMode")) {
        MODES.setMode("nav")
    }
}

const forwardInHistory = () => {
    try {
        TABS.currentPage().goForward()
    } catch (e) {
        // No page is available, not an issue
    }
}

const previousSearchMatch = () => {
    if (currentSearch) {
        try {
            TABS.currentPage().findInPage(currentSearch, {
                "forward": false,
                "findNext": true,
                "matchCase": SETTINGS.get("caseSensitiveSearch")
            })
        } catch (e) {
            // No page is available, not an issue
        }
    }
}

const reloadWithoutCache = () => {
    try {
        if (!TABS.currentPage().isCrashed()) {
            TABS.currentPage().reloadIgnoringCache()
        }
    } catch (e) {
        // No page is available, not an issue
    }
}

const openNewTabWithCurrentUrl = () => {
    let url = ""
    try {
        url = TABS.currentPage().src
    } catch (e) {
        // No page is available, not an issue
    }
    const specialPage = UTIL.pathToSpecialPageName(url)
    if (specialPage.name === "newtab") {
        url = ""
    } else if (specialPage.name) {
        url = `vieb://${specialPage.name}`
        if (specialPage.section) {
            url += `#${specialPage.section}`
        }
    }
    TABS.addTab()
    MODES.setMode("nav")
    document.getElementById("url").value = url
}

const scrollPageRight = () => {
    try {
        TABS.currentPage().executeJavaScript(
            "window.scrollBy(window.innerWidth - 50, 0)", true)
    } catch (e) {
        // No page is available, not an issue
    }
}

const scrollPageLeft = () => {
    try {
        TABS.currentPage().executeJavaScript(
            "window.scrollBy(-window.innerWidth + 50, 0)", true)
    } catch (e) {
        // No page is available, not an issue
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
        // No page is available, not an issue
    }
}

const scrollPageDownHalf = () => {
    try {
        TABS.currentPage().executeJavaScript(
            "window.scrollBy(0, window.innerHeight / 2 - 25)", true)
    } catch (e) {
        // No page is available, not an issue
    }
}

const scrollPageDown = () => {
    try {
        TABS.currentPage().executeJavaScript(
            "window.scrollBy(0, window.innerHeight - 50)", true)
    } catch (e) {
        // No page is available, not an issue
    }
}

const moveTabForward = () => {
    TABS.moveTabForward()
}

const moveTabBackward = () => {
    TABS.moveTabBackward()
}

const scrollPageUpHalf = () => {
    try {
        TABS.currentPage().executeJavaScript(
            "window.scrollBy(0, -window.innerHeight / 2 + 25)", true)
    } catch (e) {
        // No page is available, not an issue
    }
}

const zoomReset = () => {
    try {
        TABS.currentPage().setZoomLevel(0)
    } catch (e) {
        // No page is available, not an issue
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
        // No page is available, not an issue
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
        // No page is available, not an issue
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
        if (currentSearch.trim()) {
            try {
                TABS.currentPage().stopFindInPage("clearSelection")
                TABS.currentPage().findInPage(currentSearch, {
                    "matchCase": SETTINGS.get("caseSensitiveSearch")
                })
            } catch (e) {
                // No page is available, not an issue
            }
        } else {
            currentSearch = ""
            TABS.currentPage().stopFindInPage("clearSelection")
        }
        MODES.setMode("normal")
    }
    if (MODES.currentMode() === "nav") {
        const urlElement = document.getElementById("url")
        const location = urlElement.value.trim()
        urlElement.className = ""
        MODES.setMode("normal")
        if (location !== "") {
            const specialPage = UTIL.pathToSpecialPageName(location)
            const local = UTIL.expandPath(location)
            if (specialPage.name) {
                COMMAND.openSpecialPage(specialPage.name, specialPage.section)
            } else if (UTIL.hasProtocol(location)) {
                TABS.navigateTo(location)
            } else if (UTIL.isDir(local) || UTIL.isFile(local)) {
                TABS.navigateTo(
                    `file:${local}`.replace(/^file:\/*/, "file:///"))
            } else if (UTIL.isUrl(location)) {
                TABS.navigateTo(`https://${location}`)
            } else {
                TABS.navigateTo(SETTINGS.get("search") + location)
            }
        }
    }
}

const setFocusCorrectly = () => {
    const urlElement = document.getElementById("url")
    if (["normal", "follow", "visual"].includes(MODES.currentMode())) {
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
    if (MODES.currentMode() === "cursor") {
        TABS.currentPage().blur()
        urlElement.blur()
        window.focus()
        document.getElementById("invisible-overlay").focus()
    }
    if (document.activeElement !== urlElement) {
        if (["search", "command"].includes(MODES.currentMode())) {
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
        const local = UTIL.expandPath(urlElement.value)
        if (urlElement.value.trim() === "") {
            urlElement.className = ""
        } else if (document.querySelector("#suggest-dropdown div.selected")) {
            urlElement.className = "suggest"
        } else if (urlElement.value.startsWith("file://")) {
            urlElement.className = "file"
        } else if (UTIL.isUrl(urlElement.value.trim())) {
            urlElement.className = "url"
        } else if (path.isAbsolute(local) && UTIL.pathExists(local)) {
            urlElement.className = "file"
        } else {
            urlElement.className = "search"
        }
    }
}

const nextSuggestion = () => {
    SUGGEST.nextSuggestion()
    setFocusCorrectly()
}

const prevSuggestion = () => {
    SUGGEST.prevSuggestion()
    setFocusCorrectly()
}

const commandHistoryPrevious = () => {
    COMMANDHISTORY.previous()
}

const commandHistoryNext = () => {
    COMMANDHISTORY.next()
}

module.exports = {
    emptySearch,
    clickOnSearch,
    previousTab,
    closeTab,
    toNavMode,
    startFollowCurrentTab,
    scrollTop,
    insertAtFirstInput,
    scrollLeft,
    toInsertMode,
    scrollDown,
    scrollUp,
    scrollRight,
    nextSearchMatch,
    reload,
    openNewTab,
    reopenTab,
    nextTab,
    toSearchMode,
    startFollowNewTab,
    scrollBottom,
    backInHistory,
    openNewTabAtAlternativePosition,
    forwardInHistory,
    previousSearchMatch,
    reloadWithoutCache,
    openNewTabWithCurrentUrl,
    scrollPageRight,
    scrollPageLeft,
    toCommandMode,
    scrollPageUp,
    scrollPageDownHalf,
    scrollPageDown,
    moveTabForward,
    moveTabBackward,
    scrollPageUpHalf,
    zoomReset,
    zoomIn,
    zoomOut,
    toNormalMode,
    nextSuggestion,
    prevSuggestion,
    commandHistoryPrevious,
    commandHistoryNext,
    useEnteredData,
    setFocusCorrectly
}
