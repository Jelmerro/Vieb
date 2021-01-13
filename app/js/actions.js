/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2021 Jelmer van Arnhem
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
/* global COMMAND COMMANDHISTORY EXPLOREHISTORY FOLLOW MODES PAGELAYOUT SETTINGS
 SUGGEST TABS UTIL */
"use strict"

const {exec} = require("child_process")
const {clipboard, ipcRenderer} = require("electron")
const path = require("path")
const fs = require("fs")

let currentSearch = ""

const emptySearch = () => {
    TABS.currentPage()?.stopFindInPage("clearSelection")
    currentSearch = ""
}

const clickOnSearch = () => {
    if (currentSearch) {
        TABS.currentPage()?.send("search-element-click")
    }
}

const increasePageNumber = () => new Promise(res => {
    TABS.currentPage()?.send("action",
        "increasePageNumber", TABS.currentPage().src)
    setTimeout(res, 100)
})

const previousTab = () => {
    TABS.switchToTab(TABS.listTabs().indexOf(TABS.currentTab()) - 1)
}

const closeTab = () => TABS.closeTab()

const toExploreMode = () => MODES.setMode("explore")

const startFollowCurrentTab = () => FOLLOW.startFollow(false)

const scrollTop = () => TABS.currentPage()?.send("action", "scrollTop")

const insertAtFirstInput = () => {
    TABS.currentPage()?.send("focus-first-text-input")
}

const scrollLeft = () => TABS.currentPage()?.send("action", "scrollLeft")

const toInsertMode = () => MODES.setMode("insert")

const scrollDown = () => TABS.currentPage()?.send("action", "scrollDown")

const scrollUp = () => TABS.currentPage()?.send("action", "scrollUp")

const scrollRight = () => TABS.currentPage()?.send("action", "scrollRight")

const nextSearchMatch = () => {
    if (currentSearch) {
        TABS.currentPage()?.findInPage(currentSearch, {
            "findNext": true, "matchCase": !SETTINGS.get("ignorecase")
        })
    }
}

const reload = () => {
    if (TABS.currentPage() && !TABS.currentPage().isCrashed()) {
        if (!TABS.currentPage().src.startsWith("devtools://")) {
            TABS.currentPage().reload()
            TABS.resetTabInfo(TABS.currentPage())
        }
    }
}

const openNewTab = () => TABS.addTab()

const reopenTab = () => TABS.reopenTab()

const nextTab = () => {
    TABS.switchToTab(TABS.listTabs().indexOf(TABS.currentTab()) + 1)
}

const decreasePageNumber = () => new Promise(res => {
    TABS.currentPage()?.send("action",
        "decreasePageNumber", TABS.currentPage().src)
    setTimeout(res, 100)
})

const toSearchMode = () => MODES.setMode("search")

const startFollowNewTab = () => FOLLOW.startFollow(true)

const scrollBottom = () => TABS.currentPage()?.send("action", "scrollBottom")

const backInHistory = () => {
    if (TABS.currentPage()?.canGoBack()) {
        if (!TABS.currentPage().src.startsWith("devtools://")) {
            TABS.currentTab().querySelector("span").textContent = ""
            TABS.currentPage().goBack()
            TABS.resetTabInfo(TABS.currentPage())
        }
    }
}

const openNewTabAtAlternativePosition = () => TABS.addTab({"inverted": true})

const forwardInHistory = () => {
    if (TABS.currentPage()?.canGoForward()) {
        if (!TABS.currentPage().src.startsWith("devtools://")) {
            TABS.currentTab().querySelector("span").textContent = ""
            TABS.currentPage().goForward()
            TABS.resetTabInfo(TABS.currentPage())
        }
    }
}

const previousSearchMatch = () => {
    if (currentSearch) {
        TABS.currentPage()?.findInPage(currentSearch, {
            "forward": false,
            "findNext": true,
            "matchCase": !SETTINGS.get("ignorecase")
        })
    }
}

const reloadWithoutCache = () => {
    if (TABS.currentPage() && !TABS.currentPage().isCrashed()) {
        if (!TABS.currentPage().src.startsWith("devtools://")) {
            TABS.currentPage().reloadIgnoringCache()
            TABS.resetTabInfo(TABS.currentPage())
        }
    }
}

const openNewTabWithCurrentUrl = () => {
    const url = TABS.currentPage()?.src || ""
    TABS.addTab()
    MODES.setMode("explore")
    document.getElementById("url").value = UTIL.urlToString(url)
}

const scrollPageRight = () => {
    TABS.currentPage()?.send("action", "scrollPageRight")
}

const scrollPageLeft = () => {
    TABS.currentPage()?.send("action", "scrollPageLeft")
}

const toCommandMode = () => MODES.setMode("command")

const scrollPageUp = () => TABS.currentPage()?.send("action", "scrollPageUp")

const stopLoadingPage = () => TABS.currentPage()?.stop()

const scrollPageDownHalf = () => {
    TABS.currentPage()?.send("action", "scrollPageDownHalf")
}

const scrollPageDown = () => {
    TABS.currentPage()?.send("action", "scrollPageDown")
}

const moveTabForward = () => TABS.moveTabForward()

const moveTabBackward = () => TABS.moveTabBackward()

const scrollPageUpHalf = () => {
    TABS.currentPage()?.send("action", "scrollPageUpHalf")
}

const zoomReset = () => TABS.currentPage()?.setZoomLevel(0)

const zoomOut = () => {
    let level = TABS.currentPage().getZoomLevel() - 1
    if (level < -7) {
        level = -7
    }
    TABS.currentPage().setZoomLevel(level)
}

const zoomIn = () => {
    let level = TABS.currentPage().getZoomLevel() + 1
    if (level > 7) {
        level = 7
    }
    TABS.currentPage().setZoomLevel(level)
}

const toNormalMode = () => MODES.setMode("normal")

const stopFollowMode = () => {
    if (MODES.currentMode() === "follow") {
        MODES.setMode(FOLLOW.getModeBeforeFollow())
    } else {
        MODES.setMode("normal")
    }
}

const editWithVim = () => {
    const page = TABS.currentPage()
    if (!page) {
        return
    }
    const fileFolder = path.join(UTIL.appData(), "vimformedits")
    try {
        fs.mkdirSync(fileFolder)
    } catch (e) {
        // Probably already exists
    }
    const tempFile = path.join(fileFolder, String(Number(new Date())))
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
                page.send("action", "setInputFieldText",
                    tempFile, fs.readFileSync(tempFile).toString())
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
    page.send("action", "writeInputToFile", tempFile)
}

const nextSuggestion = () => {
    SUGGEST.nextSuggestion()
    setFocusCorrectly()
}

const prevSuggestion = () => {
    SUGGEST.prevSuggestion()
    setFocusCorrectly()
}

const commandHistoryPrevious = () => COMMANDHISTORY.previous()

const commandHistoryNext = () => COMMANDHISTORY.next()

const exploreHistoryPrevious = () => EXPLOREHISTORY.previous()

const exploreHistoryNext = () => EXPLOREHISTORY.next()

const rotateSplitWindow = () => PAGELAYOUT.rotate()

const leftHalfSplitWindow = () => PAGELAYOUT.toTop("left")

const bottomHalfSplitWindow = () => PAGELAYOUT.toTop("bottom")

const topHalfSplitWindow = () => PAGELAYOUT.toTop("top")

const rightHalfSplitWindow = () => PAGELAYOUT.toTop("right")

const toLeftSplitWindow = () => PAGELAYOUT.moveFocus("left")

const toBottomSplitWindow = () => PAGELAYOUT.moveFocus("bottom")

const toTopSplitWindow = () => PAGELAYOUT.moveFocus("top")

const toRightSplitWindow = () => PAGELAYOUT.moveFocus("right")

const increaseHeightSplitWindow = () => PAGELAYOUT.resize("ver", "grow")

const decreaseHeightSplitWindow = () => PAGELAYOUT.resize("ver", "shrink")

const increaseWidthSplitWindow = () => PAGELAYOUT.resize("hor", "grow")

const decreaseWidthSplitWindow = () => PAGELAYOUT.resize("hor", "shrink")

const distrubuteSpaceSplitWindow = () => PAGELAYOUT.resetResizing()

const toggleFullscreen = () => {
    ipcRenderer.invoke("toggle-fullscreen").then(SETTINGS.updateGuiVisibility)
}

const incrementalSearch = () => {
    currentSearch = document.getElementById("url").value
    if (TABS.currentPage() && currentSearch.trim()) {
        TABS.currentPage().stopFindInPage("clearSelection")
        TABS.currentPage().findInPage(currentSearch, {
            "matchCase": !SETTINGS.get("ignorecase")
        })
    } else {
        currentSearch = ""
        TABS.currentPage()?.stopFindInPage("clearSelection")
    }
}

const pageToClipboard = () => clipboard.writeText(
    UTIL.urlToString(TABS.currentPage()?.src))

const openFromClipboard = () => {
    if (clipboard.readText().trim()) {
        TABS.navigateTo(UTIL.stringToUrl(clipboard.readText()))
    }
}

const useEnteredData = () => {
    if (MODES.currentMode() === "command") {
        const command = document.getElementById("url").value.trim()
        MODES.setMode("normal")
        COMMAND.execute(command)
    }
    if (MODES.currentMode() === "search") {
        incrementalSearch()
        MODES.setMode("normal")
    }
    if (MODES.currentMode() === "explore") {
        const urlElement = document.getElementById("url")
        let location = urlElement.value.trim()
        MODES.setMode("normal")
        // Override location with a custom search if searchword matches
        for (const mapping of SETTINGS.get("searchwords").split(",")) {
            const [searchword, url] = mapping.split("~")
            if (searchword && url) {
                const query = location.replace(`${searchword} `, "")
                if (query && location.startsWith(`${searchword} `)) {
                    location = UTIL.stringToUrl(url.replace(/%s/g, query))
                    break
                }
            }
        }
        if (location) {
            TABS.navigateTo(UTIL.stringToUrl(location))
            EXPLOREHISTORY.push(UTIL.stringToUrl(location))
        }
    }
}

const setFocusCorrectly = () => {
    const urlElement = document.getElementById("url")
    TABS.updateUrl(TABS.currentPage())
    if (MODES.currentMode() === "insert") {
        urlElement.blur()
        TABS.currentPage()?.focus()
        TABS.currentPage()?.click()
    } else if (["search", "explore", "command"].includes(MODES.currentMode())) {
        if (document.activeElement !== urlElement) {
            window.focus()
            urlElement.focus()
        }
    } else {
        urlElement.blur()
        window.focus()
        if (!SETTINGS.get("mouse")) {
            document.getElementById("invisible-overlay").focus()
        }
    }
}

module.exports = {
    toCommandMode,
    toExploreMode,
    toInsertMode,
    toSearchMode,
    toNormalMode,
    startFollowCurrentTab,
    startFollowNewTab,
    stopFollowMode,
    scrollTop,
    scrollBottom,
    scrollUp,
    scrollDown,
    scrollLeft,
    scrollRight,
    scrollPageUp,
    scrollPageDown,
    scrollPageLeft,
    scrollPageRight,
    scrollPageUpHalf,
    scrollPageDownHalf,
    reload,
    reloadWithoutCache,
    stopLoadingPage,
    openNewTab,
    openNewTabAtAlternativePosition,
    openNewTabWithCurrentUrl,
    closeTab,
    reopenTab,
    nextTab,
    previousTab,
    moveTabForward,
    moveTabBackward,
    backInHistory,
    forwardInHistory,
    zoomReset,
    zoomIn,
    zoomOut,
    rotateSplitWindow,
    leftHalfSplitWindow,
    bottomHalfSplitWindow,
    topHalfSplitWindow,
    rightHalfSplitWindow,
    toLeftSplitWindow,
    toBottomSplitWindow,
    toTopSplitWindow,
    toRightSplitWindow,
    increaseHeightSplitWindow,
    decreaseHeightSplitWindow,
    increaseWidthSplitWindow,
    decreaseWidthSplitWindow,
    distrubuteSpaceSplitWindow,
    emptySearch,
    incrementalSearch,
    clickOnSearch,
    nextSearchMatch,
    previousSearchMatch,
    increasePageNumber,
    decreasePageNumber,
    insertAtFirstInput,
    editWithVim,
    nextSuggestion,
    prevSuggestion,
    commandHistoryPrevious,
    commandHistoryNext,
    exploreHistoryPrevious,
    exploreHistoryNext,
    toggleFullscreen,
    pageToClipboard,
    openFromClipboard,
    useEnteredData,
    setFocusCorrectly
}
