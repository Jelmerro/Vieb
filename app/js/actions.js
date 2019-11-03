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

const {exec} = require("child_process")
const {remote} = require("electron")
const path = require("path")
const fs = require("fs")

let currentSearch = ""

const emptySearch = () => {
    TABS.currentPage().stopFindInPage("clearSelection")
    currentSearch = ""
}

const clickOnSearch = () => {
    if (currentSearch) {
        TABS.currentPage().getWebContents().send("search-element-click")
    }
}

const increasePageNumber = (count = 1) => {
    TABS.currentPage().getWebContents().send(
        "action", "increasePageNumber", count)
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
    TABS.currentPage().getWebContents().send("action", "scrollTop")
}

const insertAtFirstInput = () => {
    TABS.currentPage().getWebContents().send("focus-first-text-input")
}

const scrollLeft = () => {
    TABS.currentPage().getWebContents().send("action", "scrollLeft")
}

const toInsertMode = () => {
    MODES.setMode("insert")
}

const scrollDown = () => {
    TABS.currentPage().getWebContents().send("action", "scrollDown")
}

const scrollUp = () => {
    TABS.currentPage().getWebContents().send("action", "scrollUp")
}

const scrollRight = () => {
    TABS.currentPage().getWebContents().send("action", "scrollRight")
}

const nextSearchMatch = () => {
    if (currentSearch) {
        TABS.currentPage().findInPage(currentSearch, {
            "findNext": true,
            "matchCase": SETTINGS.get("caseSensitiveSearch")
        })
    }
}

const reload = () => {
    if (!TABS.currentPage().isCrashed()) {
        TABS.currentPage().reload()
        TABS.resetTabInfo(TABS.currentPage())
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

const decreasePageNumber = (count = 1) => {
    TABS.currentPage().getWebContents().send(
        "action", "decreasePageNumber", count)
}

const toSearchMode = () => {
    MODES.setMode("search")
}

const startFollowNewTab = () => {
    FOLLOW.startFollow(true)
}

const scrollBottom = () => {
    TABS.currentPage().getWebContents().send("action", "scrollBottom")
}

const backInHistory = () => {
    if (TABS.currentPage().canGoBack()) {
        TABS.currentTab().querySelector("span").textContent = ""
        TABS.currentPage().goBack()
        TABS.resetTabInfo(TABS.currentPage())
    }
}

const openNewTabAtAlternativePosition = () => {
    TABS.addTab(null, true)
    if (SETTINGS.get("newtab.enterNavMode")) {
        MODES.setMode("nav")
    }
}

const forwardInHistory = () => {
    if (TABS.currentPage().canGoForward()) {
        TABS.currentTab().querySelector("span").textContent = ""
        TABS.currentPage().goForward()
        TABS.resetTabInfo(TABS.currentPage())
    }
}

const previousSearchMatch = () => {
    if (currentSearch) {
        TABS.currentPage().findInPage(currentSearch, {
            "forward": false,
            "findNext": true,
            "matchCase": SETTINGS.get("caseSensitiveSearch")
        })
    }
}

const reloadWithoutCache = () => {
    if (!TABS.currentPage().isCrashed()) {
        TABS.currentPage().reloadIgnoringCache()
        TABS.resetTabInfo(TABS.currentPage())
    }
}

const openNewTabWithCurrentUrl = () => {
    let url = TABS.currentPage().src
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
    TABS.currentPage().getWebContents().send("action", "scrollPageRight")
}

const scrollPageLeft = () => {
    TABS.currentPage().getWebContents().send("action", "scrollPageLeft")
}

const toCommandMode = () => {
    MODES.setMode("command")
}

const scrollPageUp = () => {
    TABS.currentPage().getWebContents().send("action", "scrollPageUp")
}

const stopLoadingPage = () => {
    TABS.currentPage().stop()
}

const scrollPageDownHalf = () => {
    TABS.currentPage().getWebContents().send("action", "scrollPageDownHalf")
}

const scrollPageDown = () => {
    TABS.currentPage().getWebContents().send("action", "scrollPageDown")
}

const moveTabForward = () => {
    TABS.moveTabForward()
}

const moveTabBackward = () => {
    TABS.moveTabBackward()
}

const scrollPageUpHalf = () => {
    TABS.currentPage().getWebContents().send("action", "scrollPageUpHalf")
}

const zoomReset = () => {
    TABS.currentPage().setZoomLevel(0)
}

const zoomOut = () => {
    const level = TABS.currentPage().getZoomLevel()
    if (level <= -7) {
        return
    }
    TABS.currentPage().setZoomLevel(level - 1)
}

const zoomIn = () => {
    const level = TABS.currentPage().getZoomLevel()
    if (level >= 7) {
        return
    }
    TABS.currentPage().setZoomLevel(level + 1)
}

const toNormalMode = () => {
    MODES.setMode("normal")
}

const stopFollowMode = () => {
    if (MODES.currentMode() === "follow") {
        MODES.setMode(FOLLOW.getModeBeforeFollow())
    } else {
        MODES.setMode("normal")
    }
}

const useEnteredData = () => {
    if (MODES.currentMode() === "command") {
        COMMAND.execute(document.getElementById("url").value.trim())
        MODES.setMode("normal")
    }
    if (MODES.currentMode() === "search") {
        currentSearch = document.getElementById("url").value
        if (currentSearch.trim()) {
            TABS.currentPage().stopFindInPage("clearSelection")
            TABS.currentPage().findInPage(currentSearch, {
                "matchCase": SETTINGS.get("caseSensitiveSearch")
            })
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

const editWithVim = () => {
    const fileFolder = path.join(
        remote.app.getPath("appData"), "vimformedits")
    const tempFile = path.join(fileFolder, String(Number(new Date())))
    try {
        fs.mkdirSync(fileFolder)
    } catch (e) {
        // Probably already exists
    }
    try {
        fs.writeFileSync(tempFile, "")
    } catch (e) {
        UTIL.notify("Could not start vim edit mode", "err")
        return
    }
    let command = null
    fs.watchFile(tempFile, {"interval": 500}, () => {
        if (command) {
            try {
                TABS.currentPage().getWebContents().send("action",
                    "setInputFieldText", fs.readFileSync(tempFile).toString())
            } catch (e) {
                UTIL.notify("Failed to read temp file to fill form", "err")
            }
        } else {
            command = exec(`${SETTINGS.get("vimcommand")} ${tempFile}`, err => {
                if (err) {
                    UTIL.notify("Command to edit files with vim failed, "
                        + "please update the 'vimcommand' setting", "err")
                }
            })
        }
    })
    TABS.currentPage().getWebContents().send(
        "action", "writeInputToFile", tempFile)
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
    increasePageNumber,
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
    decreasePageNumber,
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
    stopLoadingPage,
    scrollPageDownHalf,
    scrollPageDown,
    moveTabForward,
    moveTabBackward,
    scrollPageUpHalf,
    zoomReset,
    zoomIn,
    zoomOut,
    toNormalMode,
    stopFollowMode,
    editWithVim,
    nextSuggestion,
    prevSuggestion,
    commandHistoryPrevious,
    commandHistoryNext,
    useEnteredData,
    setFocusCorrectly
}
