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
"use strict"

const {
    urlToString,
    joinPath,
    appData,
    makeDir,
    writeFile,
    notify,
    watchFile,
    readFile,
    searchword,
    stringToUrl
} = require("../util")
const {
    listTabs,
    currentTab,
    currentPage,
    tabOrPageMatching,
    currentMode,
    getSetting,
    getStored,
    updateGuiVisibility
} = require("./common")

let currentSearch = ""

const emptySearch = () => {
    currentPage()?.stopFindInPage("clearSelection")
    currentSearch = ""
}

const clickOnSearch = () => {
    if (currentSearch) {
        currentPage()?.send("search-element-click")
    }
}

const nextPage = () => currentPage()?.send("action", "nextPage")

const previousPage = () => currentPage()?.send("action", "previousPage")

const nextPageNewTab = () => currentPage()?.send("action", "nextPage", true)

const previousPageNewTab = () => currentPage()?.send(
    "action", "previousPage", true)

const increasePageNumber = () => movePageNumber(1)

const decreasePageNumber = () => movePageNumber(-1)

const movePageNumber = movement => modifyUrl("(\\?|&)p(age)?=(\\d+)",
    (_, p1, p2, p3) => {
        if (Number(p3) + movement < 1) {
            return `${p1}p${p2}=1`
        }
        return `${p1}p${p2}=${Number(p3) + movement}`
    })

const increasePortNumber = () => movePortNumber(1)

const decreasePortNumber = () => movePortNumber(-1)

const movePortNumber = movement => {
    const url = currentPage()?.src || ""
    const loc = document.createElement("a")
    loc.href = url
    let port = Number(loc.port)
    if (!port && loc.protocol === "http:") {
        port = 80
    }
    if (!port && loc.protocol === "https:") {
        port = 443
    }
    if (port) {
        modifyUrl("(^[a-zA-Z\\d]+:\\/\\/[.a-zA-Z\\d-]+)(:\\d+)?(.*$)",
            (_, domain, urlPort, rest) => {
                if (isNaN(port)) {
                    return `${domain}${rest}`
                }
                port += movement
                if (port <= 10) {
                    return `${domain}:11${rest}`
                }
                if (port > 65535) {
                    return `${domain}:65535${rest}`
                }
                return `${domain}:${port}${rest}`
            })
    }
}

const increaseFirstNumber = () => moveFirstNumber(1)

const decreaseFirstNumber = () => moveFirstNumber(-1)

const moveFirstNumber = movement => modifyUrl("\\d+", (_, match) => {
    if (Number(match) + movement < 1) {
        return "1"
    }
    return `${Number(match) + movement}`
})

const increaseLastNumber = () => moveLastNumber(1)

const decreaseLastNumber = () => moveLastNumber(-1)

const moveLastNumber = movement => modifyUrl("(\\d+)(\\D*$)", (_, p1, p2) => {
    if (Number(p1) + movement < 1) {
        return `1${p2}`
    }
    return `${Number(p1) + movement}${p2}`
})

const toParentUrl = () => modifyUrl("(^[a-z][a-zA-Z\\d]+:\\/\\/.*?\\/)"
    + "(.*\\/)?(.+?$)", (_, domain, path) => domain + (path || ""))

const toRootUrl = () => modifyUrl("(^[a-z][a-zA-Z\\d]+:\\/\\/.*?\\/)"
    + "(.*$)", (_, domain) => domain)

const toParentSubdomain = () => modifyUrl("(^[a-z][a-zA-Z\\d]+:\\/\\/)("
    + "www\\.)?([a-zA-Z\\d]*?\\.)((?:[a-zA-Z\\d]*?\\.)*)([a-zA-Z\\d]*?\\.[a-zA-"
    + "Z]+.*$)", (_, p, w, __, s, m) => p + (w || "") + (s || "") + (m || ""))

const toRootSubdomain = () => modifyUrl("(^[a-z][a-zA-Z\\d]+:\\/\\/)("
    + "www\\.)?([a-zA-Z\\d]*?\\.)((?:[a-zA-Z\\d]*?\\.)*)([a-zA-Z\\d]*?\\.[a-zA-"
    + "Z]+.*$)", (_, p, w, __, ___, m) => p + (w || "") + (m || ""))

const modifyUrl = (source, replacement) => {
    const url = currentPage()?.src || ""
    const next = url.replace(RegExp(source), replacement)
    if (next !== url) {
        const {navigateTo} = require("./tabs")
        navigateTo(next)
    }
}

const previousTab = () => {
    const {switchToTab} = require("./tabs")
    switchToTab(listTabs().indexOf(currentTab()) - 1)
}

const toExploreMode = () => {
    const {setMode} = require("./modes")
    setMode("explore")
}

const startFollowCurrentTab = () => {
    const {startFollow} = require("./follow")
    startFollow(false)
}

const scrollTop = () => currentPage()?.send("action", "scrollTop")

const insertAtFirstInput = () => currentPage()?.send("focus-input")

const scrollLeft = () => currentPage()?.send("action", "scrollLeft")

const toInsertMode = () => {
    const {setMode} = require("./modes")
    setMode("insert")
}

const scrollDown = () => currentPage()?.send("action", "scrollDown")

const scrollUp = () => currentPage()?.send("action", "scrollUp")

const scrollRight = () => currentPage()?.send("action", "scrollRight")

const nextSearchMatch = () => {
    if (currentSearch) {
        currentPage()?.findInPage(currentSearch, {
            "findNext": true, "matchCase": matchCase()
        })
    }
}

const reload = (customPage = null) => {
    const page = customPage || currentPage()
    if (page && !page.isCrashed() && !page.src.startsWith("devtools://")) {
        page.reload()
        const {resetTabInfo} = require("./tabs")
        resetTabInfo(page)
    }
}

const openNewTab = () => {
    const {addTab} = require("./tabs")
    addTab()
}

const reopenTab = () => {
    const {"reopenTab": reopen} = require("./tabs")
    reopen()
}

const nextTab = () => {
    const {switchToTab} = require("./tabs")
    switchToTab(listTabs().indexOf(currentTab()) + 1)
}

const toSearchMode = () => {
    const {setMode} = require("./modes")
    setMode("search")
    document.getElementById("url").value = currentSearch
    document.getElementById("url").select()
}

const startFollowNewTab = () => {
    const {startFollow} = require("./follow")
    startFollow(true)
}

const scrollBottom = () => currentPage()?.send("action", "scrollBottom")

const backInHistory = (customPage = null) => {
    const page = customPage || currentPage()
    if (page && !page.isCrashed() && !page.src.startsWith("devtools://")) {
        if (page?.canGoBack()) {
            tabOrPageMatching(page).querySelector("span").textContent = ""
            page.goBack()
            const {resetTabInfo} = require("./tabs")
            resetTabInfo(page)
        }
    }
}

const forwardInHistory = (customPage = null) => {
    const page = customPage || currentPage()
    if (page && !page.isCrashed() && !page.src.startsWith("devtools://")) {
        if (page?.canGoForward()) {
            tabOrPageMatching(page).querySelector("span").textContent = ""
            page.goForward()
            const {resetTabInfo} = require("./tabs")
            resetTabInfo(page)
        }
    }
}

const previousSearchMatch = () => {
    if (currentSearch) {
        currentPage()?.findInPage(currentSearch, {
            "findNext": true, "forward": false, "matchCase": matchCase()
        })
    }
}

const reloadWithoutCache = () => {
    if (currentPage() && !currentPage().isCrashed()) {
        if (!currentPage().src.startsWith("devtools://")) {
            currentPage().reloadIgnoringCache()
            const {resetTabInfo} = require("./tabs")
            resetTabInfo(currentPage())
        }
    }
}

const openNewTabWithCurrentUrl = () => {
    const url = currentPage()?.src || ""
    const {addTab} = require("./tabs")
    addTab()
    const {setMode} = require("./modes")
    setMode("explore")
    document.getElementById("url").value = urlToString(url)
}

const scrollPageRight = () => currentPage()?.send("action", "scrollPageRight")

const scrollPageLeft = () => currentPage()?.send("action", "scrollPageLeft")

const toCommandMode = () => {
    const {setMode} = require("./modes")
    setMode("command")
}

const scrollPageUp = () => currentPage()?.send("action", "scrollPageUp")

const stopLoadingPage = () => currentPage()?.stop()

const scrollPageDownHalf = () => {
    currentPage()?.send("action", "scrollPageDownHalf")
}

const scrollPageDown = () => currentPage()?.send("action", "scrollPageDown")

const moveTabForward = () => {
    const {"moveTabForward": move} = require("./tabs")
    move()
}

const moveTabBackward = () => {
    const {"moveTabBackward": move} = require("./tabs")
    move()
}

const scrollPageUpHalf = () => currentPage()?.send("action", "scrollPageUpHalf")

const zoomReset = () => currentPage()?.setZoomLevel(0)

const zoomOut = () => {
    let level = currentPage()?.getZoomLevel() - 1
    if (level < -7) {
        level = -7
    }
    currentPage()?.setZoomLevel(level)
}

const zoomIn = () => {
    let level = currentPage()?.getZoomLevel() + 1
    if (level > 7) {
        level = 7
    }
    currentPage()?.setZoomLevel(level)
}

const toNormalMode = () => {
    const {setMode} = require("./modes")
    setMode("normal")
}

const stopFollowMode = () => {
    const {setMode} = require("./modes")
    if (currentMode() === "follow") {
        setMode(getStored("modebeforefollow") || "normal")
    } else {
        setMode("normal")
    }
}

const repeatLastAction = () => {
    const {"repeatLastAction": repeat} = require("./input")
    repeat()
}

const editWithVim = () => {
    const page = currentPage()
    if (!page) {
        return
    }
    let typeOfEdit = null
    if (currentMode() === "insert") {
        typeOfEdit = "input"
    }
    if ("ces".includes(currentMode()[0])) {
        typeOfEdit = "navbar"
    }
    if (!typeOfEdit) {
        return
    }
    const fileFolder = joinPath(appData(), "vimformedits")
    makeDir(fileFolder)
    const tempFile = joinPath(fileFolder, String(Number(new Date())))
    const success = writeFile(tempFile, "")
    if (!success) {
        notify("Could not start vim edit mode", "err")
        return
    }
    let command = null
    watchFile(tempFile, {"interval": 500}, () => {
        if (command) {
            const contents = readFile(tempFile)
            if (contents === null) {
                return
            }
            if (typeOfEdit === "input") {
                page.send("action", "setInputFieldText", tempFile, contents)
            } else if ("ces".includes(currentMode()[0])) {
                document.getElementById("url").value = contents
                const {updateSuggestions} = require("./input")
                updateSuggestions()
            }
        } else {
            const {exec} = require("child_process")
            command = exec(`${getSetting("vimcommand")} "${tempFile}"`, err => {
                if (err) {
                    notify("Command to edit files with vim failed, "
                        + "please update the 'vimcommand' setting", "err")
                }
            })
        }
    })
    if (typeOfEdit === "input") {
        page.send("action", "writeInputToFile", tempFile)
    }
    if (typeOfEdit === "navbar") {
        writeFile(tempFile, document.getElementById("url").value)
    }
}

const downloadLink = () => {
    const {commonAction} = require("./contextmenu")
    commonAction("link", "download", {"link": currentPage()?.src})
}

const openLinkExternal = () => {
    const {commonAction} = require("./contextmenu")
    commonAction("link", "external", {"link": currentPage()?.src})
}

const nextSuggestion = () => {
    const {next} = require("./suggest")
    next()
    setFocusCorrectly()
}

const prevSuggestion = () => {
    const {previous} = require("./suggest")
    previous()
    setFocusCorrectly()
}

const commandHistoryPrevious = () => {
    const {previous} = require("./commandhistory")
    previous()
}

const commandHistoryNext = () => {
    const {next} = require("./commandhistory")
    next()
}

const exploreHistoryPrevious = () => {
    const {previous} = require("./explorehistory")
    previous()
}

const exploreHistoryNext = () => {
    const {next} = require("./explorehistory")
    next()
}

const rotateSplitWindowForward = () => {
    const {rotateForward} = require("./pagelayout")
    rotateForward()
}

const rotateSplitWindowBackward = () => {
    const {rotateReverse} = require("./pagelayout")
    rotateReverse()
}

const leftHalfSplitWindow = () => {
    const {toTop} = require("./pagelayout")
    toTop("left")
}

const bottomHalfSplitWindow = () => {
    const {toTop} = require("./pagelayout")
    toTop("bottom")
}

const topHalfSplitWindow = () => {
    const {toTop} = require("./pagelayout")
    toTop("top")
}

const rightHalfSplitWindow = () => {
    const {toTop} = require("./pagelayout")
    toTop("right")
}

const toLeftSplitWindow = () => {
    const {moveFocus} = require("./pagelayout")
    moveFocus("left")
}

const toBottomSplitWindow = () => {
    const {moveFocus} = require("./pagelayout")
    moveFocus("bottom")
}

const toTopSplitWindow = () => {
    const {moveFocus} = require("./pagelayout")
    moveFocus("top")
}

const toRightSplitWindow = () => {
    const {moveFocus} = require("./pagelayout")
    moveFocus("right")
}

const toLastSplitWindow = () => {
    const {lastSplit} = require("./pagelayout")
    lastSplit()
}

const toFirstSplitWindow = () => {
    const {firstSplit} = require("./pagelayout")
    firstSplit()
}

const toNextSplitWindow = () => {
    const {nextSplit} = require("./pagelayout")
    nextSplit()
}

const toPreviousSplitWindow = () => {
    const {previousSplit} = require("./pagelayout")
    previousSplit()
}

const exchangeSplitWindow = () => {
    const {exchange} = require("./pagelayout")
    exchange()
}

const toLastUsedTab = () => {
    const {"toLastUsedTab": lastUsed} = require("./pagelayout")
    lastUsed()
}

const increaseHeightSplitWindow = () => {
    const {resize} = require("./pagelayout")
    resize("ver", "grow")
}

const decreaseHeightSplitWindow = () => {
    const {resize} = require("./pagelayout")
    resize("ver", "shrink")
}

const increaseWidthSplitWindow = () => {
    const {resize} = require("./pagelayout")
    resize("hor", "grow")
}

const decreaseWidthSplitWindow = () => {
    const {resize} = require("./pagelayout")
    resize("hor", "shrink")
}

const distrubuteSpaceSplitWindow = () => {
    const {resetResizing} = require("./pagelayout")
    resetResizing()
}

const toggleFullscreen = () => {
    const {ipcRenderer} = require("electron")
    ipcRenderer.invoke("toggle-fullscreen").then(updateGuiVisibility)
}

const matchCase = () => {
    if (getSetting("smartcase")) {
        return currentSearch !== currentSearch.toLowerCase()
    }
    return !getSetting("ignorecase")
}

const incrementalSearch = (value = null) => {
    currentSearch = value || document.getElementById("url").value
    if (currentPage() && currentSearch) {
        currentPage().stopFindInPage("clearSelection")
        currentPage().findInPage(currentSearch, {"matchCase": matchCase()})
    } else {
        currentSearch = ""
        currentPage()?.stopFindInPage("clearSelection")
    }
}

const pageToClipboard = () => {
    const {clipboard} = require("electron")
    clipboard.writeText(urlToString(currentPage()?.src))
}

const openFromClipboard = () => {
    const {clipboard} = require("electron")
    if (clipboard.readText().trim()) {
        const {navigateTo} = require("./tabs")
        navigateTo(stringToUrl(clipboard.readText()))
    }
}

const reorderFollowLinks = () => {
    const {reorderDisplayedLinks} = require("./follow")
    reorderDisplayedLinks()
}

const menuOpen = () => {
    if (currentMode() === "insert") {
        currentPage()?.send("contextmenu")
    } else if ("sec".includes(currentMode()[0])) {
        const url = document.getElementById("url")
        const bounds = url.getBoundingClientRect()
        const charWidth = getSetting("fontsize") * 0.60191
        const {viebMenu} = require("./contextmenu")
        viebMenu({
            "path": [url],
            "x": bounds.x + charWidth * url.selectionStart - url.scrollLeft,
            "y": bounds.y + bounds.height
        })
    } else {
        const {rightClick} = require("./pointer")
        rightClick()
    }
}

const menuUp = () => {
    const {up} = require("./contextmenu")
    up()
}

const menuDown = () => {
    const {down} = require("./contextmenu")
    down()
}

const menuSelect = () => {
    const {select} = require("./contextmenu")
    select()
}

const menuClose = () => {
    const {clear} = require("./contextmenu")
    clear()
}

const useEnteredData = () => {
    const {setMode} = require("./modes")
    if (currentMode() === "command") {
        const command = document.getElementById("url").value.trim()
        setMode("normal")
        if (getSetting("commandhist") === "useronly") {
            const {push} = require("./commandhistory")
            push(command)
        }
        const {execute} = require("./command")
        execute(command)
    }
    if (currentMode() === "search") {
        incrementalSearch()
        setMode("normal")
    }
    if (currentMode() === "explore") {
        const urlElement = document.getElementById("url")
        let location = urlElement.value.trim()
        setMode("normal")
        if (location) {
            location = searchword(location).url
            if (getSetting("explorehist")) {
                const {push} = require("./explorehistory")
                push(urlToString(location))
            }
            const {navigateTo} = require("./tabs")
            navigateTo(stringToUrl(location))
        }
    }
}

const nop = () => {
    // Explicit No-op action: does nothing
}

const setFocusCorrectly = () => {
    const urlElement = document.getElementById("url")
    const {updateUrl} = require("./tabs")
    updateUrl(currentPage())
    if (currentMode() === "insert") {
        urlElement.blur()
        currentPage()?.focus()
        if (!document.getElementById("context-menu").innerText) {
            currentPage()?.click()
        }
    } else if ("sec".includes(currentMode()[0])) {
        if (document.activeElement !== urlElement) {
            window.focus()
            urlElement.focus()
        }
    } else {
        urlElement.blur()
        window.focus()
        if (!getSetting("mouse")) {
            document.getElementById("invisible-overlay").focus()
        }
    }
}

module.exports = {
    backInHistory,
    bottomHalfSplitWindow,
    clickOnSearch,
    commandHistoryNext,
    commandHistoryPrevious,
    decreaseFirstNumber,
    decreaseHeightSplitWindow,
    decreaseLastNumber,
    decreasePageNumber,
    decreasePortNumber,
    decreaseWidthSplitWindow,
    distrubuteSpaceSplitWindow,
    downloadLink,
    editWithVim,
    emptySearch,
    exchangeSplitWindow,
    exploreHistoryNext,
    exploreHistoryPrevious,
    forwardInHistory,
    increaseFirstNumber,
    increaseHeightSplitWindow,
    increaseLastNumber,
    increasePageNumber,
    increasePortNumber,
    increaseWidthSplitWindow,
    incrementalSearch,
    insertAtFirstInput,
    leftHalfSplitWindow,
    menuClose,
    menuDown,
    menuOpen,
    menuSelect,
    menuUp,
    moveTabBackward,
    moveTabForward,
    nextPage,
    nextPageNewTab,
    nextSearchMatch,
    nextSuggestion,
    nextTab,
    nop,
    openFromClipboard,
    openLinkExternal,
    openNewTab,
    openNewTabWithCurrentUrl,
    pageToClipboard,
    prevSuggestion,
    previousPage,
    previousPageNewTab,
    previousSearchMatch,
    previousTab,
    reload,
    reloadWithoutCache,
    reopenTab,
    reorderFollowLinks,
    repeatLastAction,
    rightHalfSplitWindow,
    rotateSplitWindowBackward,
    rotateSplitWindowForward,
    scrollBottom,
    scrollDown,
    scrollLeft,
    scrollPageDown,
    scrollPageDownHalf,
    scrollPageLeft,
    scrollPageRight,
    scrollPageUp,
    scrollPageUpHalf,
    scrollRight,
    scrollTop,
    scrollUp,
    setFocusCorrectly,
    startFollowCurrentTab,
    startFollowNewTab,
    stopFollowMode,
    stopLoadingPage,
    toBottomSplitWindow,
    toCommandMode,
    toExploreMode,
    toFirstSplitWindow,
    toInsertMode,
    toLastSplitWindow,
    toLastUsedTab,
    toLeftSplitWindow,
    toNextSplitWindow,
    toNormalMode,
    toParentSubdomain,
    toParentUrl,
    toPreviousSplitWindow,
    toRightSplitWindow,
    toRootSubdomain,
    toRootUrl,
    toSearchMode,
    toTopSplitWindow,
    toggleFullscreen,
    topHalfSplitWindow,
    useEnteredData,
    zoomIn,
    zoomOut,
    zoomReset
}
