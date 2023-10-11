/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2023 Jelmer van Arnhem
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

/** @typedef {{
 *   key?: string,
 *   src: import("./common").RunSource,
 *   hadModifier?: boolean,
 *   customPage?: Electron.WebviewTag
 * }} ActionParam
 */

const {ipcRenderer, clipboard} = require("electron")
const {
    urlToString,
    joinPath,
    appData,
    makeDir,
    writeFile,
    writeJSON,
    notify,
    watchFile,
    readFile,
    readJSON,
    searchword,
    stringToUrl,
    domainName,
    isFile,
    isDir,
    execCommand,
    isUrl
} = require("../util")
const {
    listTabs,
    currentTab,
    currentPage,
    currentMode,
    getSetting,
    getStored,
    updateGuiVisibility,
    setStored,
    getUrl,
    tabForPage,
    listRealPages,
    sendToPageOrSubFrame
} = require("./common")

let lastSearchFull = false
let currentSearch = ""
let storedSearch = ""
let searchDirection = "forward"
let potentialNewSearchDirection = "forward"

/**
 * Empty the current search by scope.
 * @param {ActionParam & {scope?: "both"|"local"|"global"}} args
 */
const emptySearch = args => {
    const scope = args.scope || getSetting("searchemptyscope")
    /** @type {(Electron.WebviewTag|null)[]} */
    let pages = []
    if (["both", "local"].includes(scope)) {
        pages = [currentPage()]
        currentTab()?.removeAttribute("localsearch")
    }
    if (["both", "global"].includes(scope)) {
        pages = listRealPages()
        setStored("globalsearch", "")
    }
    pages.forEach(page => page?.stopFindInPage("clearSelection"))
}

/**
 * Check if the search should be case sensitive or not.
 * @param {string} search
 */
const matchCase = search => {
    if (getSetting("smartcase")) {
        return search !== search.toLowerCase()
    }
    return !getSetting("ignorecase")
}

/** Highlight the next search match based on the scope. */
const nextSearchMatch = () => {
    const scope = getSetting("searchscope")
    let search = getStored("globalsearch")
    let pages = []
    if (scope === "local") {
        search = currentTab()?.getAttribute("localsearch")
            || getStored("globalsearch")
        pages = [currentPage()]
    } else {
        pages = listRealPages()
    }
    if (search) {
        pages.forEach(page => {
            if (tabForPage(page)?.classList.contains("visible-tab")) {
                page?.findInPage(search, {
                    "findNext": true,
                    "forward": searchDirection === "forward",
                    "matchCase": matchCase(search)
                })
            }
        })
    }
}

/**
 * Switch to search mode.
 * @param {ActionParam} args
 */
const toSearchMode = args => {
    const {setMode} = require("./modes")
    setMode("search")
    let search = getStored("globalsearch")
    if (getSetting("searchscope") !== "global") {
        search = currentTab()?.getAttribute("localsearch")
            || getStored("globalsearch")
    }
    storedSearch = search
    if (args.hadModifier) {
        potentialNewSearchDirection = "backward"
    } else {
        potentialNewSearchDirection = "forward"
    }
    const url = getUrl()
    if (url) {
        url.value = search
        url.select()
        const {requestSuggestUpdate} = require("./input")
        requestSuggestUpdate()
    }
}

/** Highlight the previous search match based on the scope. */
const previousSearchMatch = () => {
    const scope = getSetting("searchscope")
    let search = getStored("globalsearch")
    let pages = []
    if (scope === "local") {
        search = currentTab()?.getAttribute("localsearch")
            || getStored("globalsearch")
        pages = [currentPage()]
    } else {
        pages = listRealPages()
    }
    if (search) {
        pages.forEach(page => {
            if (tabForPage(page)?.classList.contains("visible-tab")) {
                page?.findInPage(search, {
                    "findNext": true,
                    "forward": searchDirection === "backward",
                    "matchCase": matchCase(search)
                })
            }
        })
    }
}

/**
 * Reset the incremental search match.
 * @param {ActionParam} args
 */
const resetIncrementalSearch = args => {
    if (getSetting("searchscope") === "inclocal" && !lastSearchFull) {
        emptySearch({"scope": "local", "src": args?.src ?? "other"})
    }
}

/**
 * Search for the string incrementally while typing if enabled, by scope.
 * @param {ActionParam&{value?: string}|null} args
 */
const incrementalSearch = args => {
    let scope = getSetting("searchscope")
    if (scope === "inclocal") {
        lastSearchFull = Boolean(args?.value)
        if (args?.value === undefined) {
            scope = "local"
        } else {
            scope = "global"
        }
    }
    const url = getUrl()
    const search = args?.value || url?.value || ""
    let pages = [currentPage()]
    if (scope === "global") {
        pages = listRealPages()
        setStored("globalsearch", search)
    } else {
        currentTab()?.setAttribute("localsearch", search)
    }
    if (search === currentSearch) {
        if (args && search === storedSearch) {
            nextSearchMatch()
        }
        return
    }
    currentSearch = search
    if (search) {
        pages.forEach(page => {
            page?.stopFindInPage("clearSelection")
            if (tabForPage(page)?.classList.contains("visible-tab")) {
                page?.findInPage(search, {"matchCase": matchCase(search)})
            }
        })
    } else {
        emptySearch({scope, "src": args?.src ?? "other"})
    }
}

/** Click on the current search match using the electron API. */
const clickOnSearch = () => currentPage()?.stopFindInPage("activateSelection")

/** Navigate to the next page as defined by the in-page markers. */
const nextPage = () => sendToPageOrSubFrame("action", "nextPage")

/** Navigate to the previous page as defined by the in-page markers. */
const previousPage = () => sendToPageOrSubFrame("action", "previousPage")

/** Open a new tab with the next page as defined by the in-page markers. */
const nextPageNewTab = () => sendToPageOrSubFrame("action", "nextPage", true)

/** Open a new tab with the previous page as defined by the in-page markers. */
const previousPageNewTab = () => sendToPageOrSubFrame(
    "action", "previousPage", true)

/**
 * Modify a url based on a source pattern and a replacement function.
 * @param {import("./common").RunSource} src
 * @param {string} source
 * @param {(...args: string[]) => string} replacement
 */
const modifyUrl = (src, source, replacement) => {
    const url = currentPage()?.src || ""
    const next = url.replace(RegExp(source), replacement)
    if (next !== url) {
        const {navigateTo} = require("./tabs")
        navigateTo(src, next)
    }
}

/**
 * Move the first number based on a movement number.
 * @param {import("./common").RunSource} src
 * @param {number} movement
 */
const moveFirstNumber = (src, movement) => modifyUrl(
    src, "\\d+", (_, match) => {
        if (Number(match) + movement < 1) {
            return "1"
        }
        return `${Number(match) + movement}`
    })

/**
 * Move the last number based on a movement number.
 * @param {import("./common").RunSource} src
 * @param {number} movement
 */
const moveLastNumber = (src, movement) => modifyUrl(
    src, "(\\d+)(\\D*$)", (_, p1, p2) => {
        if (Number(p1) + movement < 1) {
            return `1${p2}`
        }
        return `${Number(p1) + movement}${p2}`
    })

/**
 * Move the page number based on a movement number.
 * @param {import("./common").RunSource} src
 * @param {number} movement
 */
const movePageNumber = (src, movement) => modifyUrl(
    src, "(\\?|&)p(age)?=(\\d+)", (_, p1, p2, p3) => {
        if (Number(p3) + movement < 1) {
            return `${p1}p${p2}=1`
        }
        return `${p1}p${p2}=${Number(p3) + movement}`
    })

/**
 * Navigate to the next page as found in the url with `page=` or `p=`.
 * @param {ActionParam} args
 */
const increasePageNumber = args => movePageNumber(args.src, 1)

/**
 * Navigate to the previous page as found in the url with `page=` or `p=`.
 * @param {ActionParam} args
 */
const decreasePageNumber = args => movePageNumber(args.src, -1)

/**
 * Move the port number based on a movement number.
 * @param {import("./common").RunSource} src
 * @param {number} movement
 */
const movePortNumber = (src, movement) => {
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
        modifyUrl(src, "(^[a-zA-Z\\d]+:\\/\\/[.a-zA-Z\\d-]+)(:\\d+)?(.*$)",
            (_, domain, _port, rest) => {
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

/**
 * Increase the port number by one based on port standards.
 * @param {ActionParam} args
 */
const increasePortNumber = args => movePortNumber(args.src, 1)

/**
 * Decrease the port number by one based on port standards.
 * @param {ActionParam} args
 */
const decreasePortNumber = args => movePortNumber(args.src, -1)

/**
 * Increase to the very first number in the url.
 * @param {ActionParam} args
 */
const increaseFirstNumber = args => moveFirstNumber(args.src, 1)

/**
 * Decrease to the very first number in the url.
 * @param {ActionParam} args
 */
const decreaseFirstNumber = args => moveFirstNumber(args.src, -1)

/**
 * Increase to the very last number in the url.
 * @param {ActionParam} args
 */
const increaseLastNumber = args => moveLastNumber(args.src, 1)

/**
 * Decrease to the very last number in the url.
 * @param {ActionParam} args
 */
const decreaseLastNumber = args => moveLastNumber(args.src, -1)

/**
 * Go to root domain, by removing most subdomains, repeats to remove www.
 * @param {ActionParam} args
 */
const toRootSubdomain = args => {
    const url = currentPage()?.src
    if (!url) {
        return
    }
    const urlObj = new URL(url)
    const originalUrl = urlObj.href
    const domainNames = urlObj.hostname.split(".")
    let wwwIfNeeded = ""
    if (domainNames.length < 3) {
        return
    }
    if (domainNames.every(n => (/^\d{1,3}$/).test(n))) {
        return
    }
    const wwwSubdomain = domainNames.find(d => d.match(/www\d?/g))
    if (wwwSubdomain) {
        wwwIfNeeded = `${wwwSubdomain}.`
    }
    urlObj.hostname = `${wwwIfNeeded}${domainNames.slice(-2).join(".")}`
    if (originalUrl === urlObj.href && wwwIfNeeded) {
        urlObj.hostname = domainNames.slice(-2).join(".")
    }
    if (originalUrl !== urlObj.href) {
        const {navigateTo} = require("./tabs")
        navigateTo(args.src, urlObj.href)
    }
}

/**
 * Go to the parent domain, by removing 1 subdomain until there are none.
 * @param {ActionParam} args
 */
const toParentSubdomain = args => {
    const url = currentPage()?.src
    if (!url) {
        return
    }
    const urlObj = new URL(url)
    const originalUrl = urlObj.href
    const domainNames = urlObj.hostname.split(".")
    if (domainNames.length < 3) {
        return
    }
    if (domainNames.every(n => (/^\d{1,3}$/).test(n))) {
        return
    }
    urlObj.hostname = domainNames.slice(1).join(".")
    if (originalUrl !== urlObj.href) {
        const {navigateTo} = require("./tabs")
        navigateTo(args.src, urlObj.href)
    }
}

/**
 * Go to the root url by removing the entire path, the search and the hash.
 * @param {ActionParam} args
 */
const toRootUrl = args => {
    const url = currentPage()?.src
    if (!url) {
        return
    }
    const urlObj = new URL(url)
    const originalUrl = urlObj.href
    urlObj.pathname = ""
    urlObj.search = ""
    urlObj.hash = ""
    if (originalUrl !== urlObj.href) {
        const {navigateTo} = require("./tabs")
        navigateTo(args.src, urlObj.href)
    }
}

/**
 * Go to the parent url by removing the path part, the search and the hash.
 * @param {ActionParam} args
 */
const toParentUrl = args => {
    const url = currentPage()?.src
    if (!url) {
        return
    }
    const urlObj = new URL(url)
    const originalUrl = urlObj.href
    urlObj.pathname = urlObj.pathname.split("/")
        .filter(p => p).slice(0, -1).join("/")
    urlObj.search = ""
    urlObj.hash = ""
    if (originalUrl !== urlObj.href) {
        const {navigateTo} = require("./tabs")
        navigateTo(args.src, urlObj.href)
    }
}

/** Go to the previous tab in the bar, optionally wrapping back to the last. */
const previousTab = () => {
    const {switchToTab} = require("./tabs")
    const current = currentTab()
    if (current) {
        switchToTab(listTabs().indexOf(current) - 1)
    }
}

/** Go to the next tab in the bar, optionally wrapping to the first. */
const nextTab = () => {
    const {switchToTab} = require("./tabs")
    const current = currentTab()
    if (current) {
        switchToTab(listTabs().indexOf(current) + 1)
    }
}

/**
 * Toggle the sourceviewer in the current tab.
 * @param {ActionParam} args
 */
const toggleSourceViewer = args => {
    const {navigateTo} = require("./tabs")
    const page = currentPage()
    if (page && page.src.startsWith("sourceviewer:")) {
        const src = page.src.replace(/^sourceviewer:\/?\/?/g, "")
        let loc = String(src)
        if (process.platform !== "win32" && !loc.startsWith("/")) {
            loc = `/${loc}`
        }
        if (isFile(loc) || isDir(loc)) {
            navigateTo(args.src, `file://${loc}`)
            return
        }
        navigateTo(args.src, `https://${src}`)
    } else if (page) {
        navigateTo(args.src, page.src.replace(/^.+?:\/?\/?/g, "sourceviewer:"))
    }
}

/**
 * Open the sourceviewer in a new tab or go back to the page in the current.
 * @param {ActionParam} args
 */
const toggleSourceViewerNewTab = args => {
    const {navigateTo, addTab} = require("./tabs")
    const page = currentPage()
    if (page && page.src.startsWith("sourceviewer:")) {
        const src = page.src.replace(/^sourceviewer:\/?\/?/g, "")
        let loc = String(src)
        if (process.platform !== "win32" && !loc.startsWith("/")) {
            loc = `/${loc}`
        }
        if (isFile(loc) || isDir(loc)) {
            navigateTo(args.src, `file://${loc}`)
            return
        }
        navigateTo(args.src, `https://${src}`)
    } else if (page) {
        addTab({
            "src": args.src,
            "url": page.src.replace(/^.+?:\/?\/?/g, "sourceviewer:")
        })
    }
}

/**
 * Toggle the readerviewer in the current tab.
 * @param {ActionParam} args
 */
const toggleReaderView = args => {
    const {navigateTo} = require("./tabs")
    const page = currentPage()
    if (page && page.src.startsWith("readerview:")) {
        const src = page.src.replace(/^readerview:\/?\/?/g, "")
        let loc = String(src)
        if (process.platform !== "win32" && !loc.startsWith("/")) {
            loc = `/${loc}`
        }
        if (isFile(loc) || isDir(loc)) {
            navigateTo(args.src, `file://${loc}`)
            return
        }
        navigateTo(args.src, `https://${src}`)
    } else if (page) {
        navigateTo(args.src, page.src.replace(/^.+?:\/?\/?/g, "readerview:"))
    }
}

/**
 * Open the readerview in a new tab or go back to the page in the current.
 * @param {ActionParam} args
 */
const toggleReaderViewNewTab = args => {
    const {navigateTo, addTab} = require("./tabs")
    const page = currentPage()
    if (page && page.src.startsWith("readerview:")) {
        const src = page.src.replace(/^readerview:\/?\/?/g, "")
        let loc = String(src)
        if (process.platform !== "win32" && !loc.startsWith("/")) {
            loc = `/${loc}`
        }
        if (isFile(loc) || isDir(loc)) {
            navigateTo(args.src, `file://${loc}`)
            return
        }
        navigateTo(args.src, `https://${src}`)
    } else if (page) {
        addTab({
            "src": args.src,
            "url": page.src.replace(/^.+?:\/?\/?/g, "readerview:")
        })
    }
}

/**
 * Toggle the markdownviewer in the current tab.
 * @param {ActionParam} args
 */
const toggleMarkdownViewer = args => {
    const {navigateTo} = require("./tabs")
    const page = currentPage()
    if (page && page.src.startsWith("markdownviewer:")) {
        const src = page.src.replace(/^markdownviewer:\/?\/?/g, "")
        let loc = String(src)
        if (process.platform !== "win32" && !loc.startsWith("/")) {
            loc = `/${loc}`
        }
        if (isFile(loc) || isDir(loc)) {
            navigateTo(args.src, `file://${loc}`)
            return
        }
        navigateTo(args.src, `https://${src}`)
    } else if (page) {
        navigateTo(args.src,
            page.src.replace(/^.+?:\/?\/?/g, "markdownviewer:"))
    }
}

/**
 * Open the markdownviewer in a new tab or go back to the page in the current.
 * @param {ActionParam} args
 */
const toggleMarkdownViewerNewTab = args => {
    const {navigateTo, addTab} = require("./tabs")
    const page = currentPage()
    if (page && page.src.startsWith("markdownviewer:")) {
        const src = page.src.replace(/^markdownviewer:\/?\/?/g, "")
        let loc = String(src)
        if (process.platform !== "win32" && !loc.startsWith("/")) {
            loc = `/${loc}`
        }
        if (isFile(loc) || isDir(loc)) {
            navigateTo(args.src, `file://${loc}`)
            return
        }
        navigateTo(args.src, `https://${src}`)
    } else if (page) {
        addTab({
            "src": args.src,
            "url": page.src.replace(/^.+?:\/?\/?/g, "markdownviewer:")
        })
    }
}

/** Go to explore mode using regular mode switching. */
const toExploreMode = () => {
    const {setMode} = require("./modes")
    setMode("explore")
}

/** Go to insert mode at the very first visible input element on the page. */
const insertAtFirstInput = () => sendToPageOrSubFrame("focus-input")

/** Go to insert mode using regular mode switching. */
const toInsertMode = () => {
    const {setMode} = require("./modes")
    setMode("insert")
}

/** Scroll to the very top of the page. */
const scrollTop = () => currentPage()?.send("action", "scrollTop")

/** Scroll to the very bottom of the page. */
const scrollBottom = () => currentPage()?.send("action", "scrollBottom")

/** Scroll to the very right of the page. */
const scrollRightMax = () => currentPage()?.send("action", "scrollRightMax")

/** Scroll to the very left of the page. */
const scrollLeftMax = () => currentPage()?.send("action", "scrollLeftMax")

/** Scroll up 100px. */
const scrollUp = () => currentPage()?.send("action", "scrollUp")

/** Scroll down 100px. */
const scrollDown = () => currentPage()?.send("action", "scrollDown")

/** Scroll right 100px. */
const scrollRight = () => currentPage()?.send("action", "scrollRight")

/** Scroll left 100px. */
const scrollLeft = () => currentPage()?.send("action", "scrollLeft")

/** Scroll one page width to the right. */
const scrollPageRight = () => currentPage()?.send("action", "scrollPageRight")

/** Scroll one page width to the left. */
const scrollPageLeft = () => currentPage()?.send("action", "scrollPageLeft")

/** Scroll one page height up. */
const scrollPageUp = () => currentPage()?.send("action", "scrollPageUp")

/** Scroll half a page height down. */
const scrollPageDownHalf = () => currentPage()?.send(
    "action", "scrollPageDownHalf")

/** Scroll one page height down. */
const scrollPageDown = () => currentPage()?.send("action", "scrollPageDown")

/** Scroll half a page height up. */
const scrollPageUpHalf = () => currentPage()?.send(
    "action", "scrollPageUpHalf")

/**
 * Refresh the current page or optionally a custom page.
 * @param {ActionParam} args
 */
const refreshTab = args => {
    const page = args?.customPage || currentPage()
    if (page && !page.src.startsWith("devtools://")) {
        if (page.isCrashed()) {
            const {recreateWebview} = require("./tabs")
            recreateWebview(args.src, page)
            return
        }
        const {rerollUserAgent, resetTabInfo} = require("./tabs")
        rerollUserAgent(page)
        resetTabInfo(page)
        page.reload()
    }
}

/** Reopen the last closed tab. */
const reopenTab = () => {
    const {"reopenTab": reopen} = require("./tabs")
    reopen()
}

/** Switch to follow mode to copy a link. */
const startFollowCopyLink = () => {
    const {startFollow} = require("./follow")
    startFollow("copylink")
}

/** Switch to follow mode to open a horizontal split. */
const startFollowNewSplit = () => {
    const {startFollow} = require("./follow")
    startFollow("ver")
}

/** Switch to follow mode to open a vertical split. */
const startFollowNewVerSplit = () => {
    const {startFollow} = require("./follow")
    startFollow("hor")
}

/** Switch to follow mode to open a new tab. */
const startFollowNewTab = () => {
    const {startFollow} = require("./follow")
    startFollow("newtab")
}

/** Switch to follow mode to click on links in the current tab. */
const startFollowCurrentTab = () => {
    const {startFollow} = require("./follow")
    startFollow("current")
}

/**
 * Go back in history for the current page or a custom one.
 * @param {ActionParam} args
 */
const backInHistory = args => {
    const page = args?.customPage || currentPage()
    if (page && !page.src.startsWith("devtools://")) {
        if (page.isCrashed()) {
            const {recreateWebview} = require("./tabs")
            recreateWebview(args.src, page)
            return
        }
        if (page?.canGoBack()) {
            const tabTitleEl = tabForPage(page)?.querySelector("span")
            if (tabTitleEl) {
                tabTitleEl.textContent = ""
            }
            const {rerollUserAgent, resetTabInfo} = require("./tabs")
            rerollUserAgent(page)
            resetTabInfo(page)
            page.goBack()
        }
    }
}

/**
 * Go forward in history for the current page or a custom one.
 * @param {ActionParam} args
 */
const forwardInHistory = args => {
    const page = args.customPage || currentPage()
    if (page && !page.src.startsWith("devtools://")) {
        if (page.isCrashed()) {
            const {recreateWebview} = require("./tabs")
            recreateWebview(args.src, page)
            return
        }
        if (page?.canGoForward()) {
            const tabTitleEl = tabForPage(page)?.querySelector("span")
            if (tabTitleEl) {
                tabTitleEl.textContent = ""
            }
            const {rerollUserAgent, resetTabInfo} = require("./tabs")
            rerollUserAgent(page)
            resetTabInfo(page)
            page.goForward()
        }
    }
}

/**
 * Refresh the curren tab without using cache.
 * @param {ActionParam} args
 */
const refreshTabWithoutCache = args => {
    const page = currentPage()
    if (page && !page.src.startsWith("devtools://")) {
        if (page.isCrashed()) {
            const {recreateWebview} = require("./tabs")
            recreateWebview(args.src, page)
            return
        }
        const {rerollUserAgent, resetTabInfo} = require("./tabs")
        rerollUserAgent(page)
        resetTabInfo(page)
        page.reloadIgnoringCache()
    }
}

/**
 * Open a new tab, switch to explore mode and have the current url ready.
 * @param {ActionParam} args
 */
const openNewTabWithCurrentUrl = args => {
    const url = currentPage()?.src || ""
    const {addTab} = require("./tabs")
    addTab({"src": args.src})
    const {setMode} = require("./modes")
    setMode("explore")
    const urlEl = getUrl()
    if (urlEl) {
        urlEl.value = urlToString(url)
    }
}

/** Go to command mode using regular mode switching. */
const toCommandMode = () => {
    const {setMode} = require("./modes")
    setMode("command")
}

/** Stop loading the page for now, might still start new fetch requests. */
const stopLoadingPage = () => currentPage()?.stop()

/** Move the current tab one spot to the right/end in the bar. */
const moveTabForward = () => {
    const {"moveTabForward": move} = require("./tabs")
    move()
}

/** Move the current tab one spot to the left/beginning in the bar. */
const moveTabBackward = () => {
    const {"moveTabBackward": move} = require("./tabs")
    move()
}

/** Move the current tab all the way to the right/end in the bar. */
const moveTabEnd = () => {
    const {"moveTabForward": move} = require("./tabs")
    let didMove = move()
    while (didMove) {
        didMove = move()
    }
}

/** Move the current tab all the way to the left/beginning in the bar. */
const moveTabStart = () => {
    const {"moveTabBackward": move} = require("./tabs")
    let didMove = move()
    while (didMove) {
        didMove = move()
    }
}

/** Reset the zoom level to the 100% default. */
const zoomReset = () => currentPage()?.setZoomLevel(0)

/**
 * Zoom the current page out or do it for a custom page.
 * @param {ActionParam} args
 */
const zoomOut = args => {
    const page = args.customPage || currentPage()
    let level = (page?.getZoomLevel() ?? 0) - 1
    if (level < -7) {
        level = -7
    }
    page?.setZoomLevel(level)
}

/**
 * Zoom the current page in or do it for a custom page.
 * @param {ActionParam} args
 */
const zoomIn = args => {
    const page = args.customPage || currentPage()
    let level = (page?.getZoomLevel() ?? 0) + 1
    if (level > 7) {
        level = 7
    }
    page?.setZoomLevel(level)
}

/** Go to normal mode using regular mode switching. */
const toNormalMode = () => {
    const {setMode} = require("./modes")
    setMode("normal")
}

/** Go to the previous mode used before follow, or back to normal. */
const stopFollowMode = () => {
    const {setMode} = require("./modes")
    if (currentMode() === "follow") {
        setMode(getStored("modebeforefollow") || "normal")
    } else {
        setMode("normal")
    }
}

/** Repeat the last used action. */
const repeatLastAction = () => {
    const {"repeatLastAction": repeat} = require("./input")
    repeat()
}

/**
 * Edit the current insert mode input or navbar mode text.
 * @param {ActionParam} args
 */
const editWithVim = args => {
    const page = currentPage()
    if (!page) {
        return
    }
    /** @type {"input"|"navbar"|null} */
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
    /** @type {import("child_process").ChildProcess|null} */
    let command = null
    watchFile(tempFile, () => {
        if (command) {
            const contents = readFile(tempFile)
            if (contents === null) {
                return
            }
            if (typeOfEdit === "input") {
                sendToPageOrSubFrame("action",
                    "setInputFieldText", tempFile, contents)
            } else if ("ces".includes(currentMode()[0])) {
                const url = getUrl()
                if (url) {
                    url.value = contents
                }
                const {requestSuggestUpdate} = require("./input")
                requestSuggestUpdate()
            }
        } else {
            const commandStr = `${getSetting("vimcommand")} "${tempFile}"`
            command = execCommand(commandStr, (err, stdout) => {
                const reportExit = getSetting("notificationforsystemcommands")
                if (err && reportExit !== "none") {
                    notify(`${err}`,
                        {"src": args.src, "type": "err"})
                } else if (reportExit === "all") {
                    notify(stdout.toString() || "Command exitted successfully!",
                        {"src": args.src, "type": "suc"})
                }
            })
        }
    })
    if (typeOfEdit === "input") {
        sendToPageOrSubFrame("action", "writeInputToFile", tempFile)
    }
    if (typeOfEdit === "navbar") {
        setTimeout(() => writeFile(tempFile, getUrl()?.value ?? ""), 3)
    }
}

/**
 * Download the current page link to disk.
 * @param {ActionParam} args
 */
const downloadLink = args => {
    const {commonAction} = require("./contextmenu")
    commonAction(args.src, "link", "download",
        {"link": currentPage()?.src ?? ""})
}

/**
 * Open the current page link in an external application as per setting.
 * @param {ActionParam} args
 */
const openLinkExternal = args => {
    const {commonAction} = require("./contextmenu")
    commonAction(args.src, "link", "external",
        {"link": currentPage()?.src ?? ""})
}

/** Completely reset any focus issues there could be in the app. */
const setFocusCorrectly = () => {
    const urlElement = document.getElementById("url")
    const {updateUrl} = require("./tabs")
    const {followFiltering} = require("./follow")
    const page = currentPage()
    if (page) {
        updateUrl(page)
    }
    if (currentMode() === "insert") {
        urlElement?.blur()
        page?.focus()
        if (!document.getElementById("context-menu")?.innerText) {
            page?.click()
        }
    } else if ("sec".includes(currentMode()[0]) || followFiltering()) {
        if (document.activeElement !== urlElement) {
            window.focus()
            urlElement?.focus()
        }
    } else {
        urlElement?.blur()
        window.focus()
        document.body.focus()
    }
}

/** Go to the next suggestion in the list. */
const nextSuggestion = () => {
    const {next} = require("./suggest")
    next()
    setFocusCorrectly()
}

/** Go to the previous suggestion in the list. */
const prevSuggestion = () => {
    const {previous} = require("./suggest")
    previous()
    setFocusCorrectly()
}

/** Go to the next section in the suggestion list. */
const nextSuggestionSection = () => {
    const {nextSection} = require("./suggest")
    nextSection()
    setFocusCorrectly()
}

/** Go to the previous section in the suggestion list. */
const prevSuggestionSection = () => {
    const {previousSection} = require("./suggest")
    previousSection()
    setFocusCorrectly()
}

/** Go back in history to previously run commands. */
const commandHistoryPrevious = () => {
    const {previous} = require("./commandhistory")
    previous()
}

/** Go forward in history to previously run commands, or back to current. */
const commandHistoryNext = () => {
    const {next} = require("./commandhistory")
    next()
}

/** Go back in history to previously navigated sites. */
const exploreHistoryPrevious = () => {
    const {previous} = require("./explorehistory")
    previous()
}

/** Go forward in history to previously navigated sites, or back to current. */
const exploreHistoryNext = () => {
    const {next} = require("./explorehistory")
    next()
}

/** Rotate the current window split forward. */
const rotateSplitWindowForward = () => {
    const {rotateForward} = require("./pagelayout")
    rotateForward()
}

/** Rotate the current window split backward. */
const rotateSplitWindowBackward = () => {
    const {rotateReverse} = require("./pagelayout")
    rotateReverse()
}

/** Make the current window split the entire left side. */
const leftHalfSplitWindow = () => {
    const {toTop} = require("./pagelayout")
    toTop("left")
}

/** Make the current window split the entire bottom half. */
const bottomHalfSplitWindow = () => {
    const {toTop} = require("./pagelayout")
    toTop("bottom")
}

/** Make the current window split the entire top half. */
const topHalfSplitWindow = () => {
    const {toTop} = require("./pagelayout")
    toTop("top")
}

/** Make the current window split the entire right side. */
const rightHalfSplitWindow = () => {
    const {toTop} = require("./pagelayout")
    toTop("right")
}

/** Move the focus to the split to the left of the current one. */
const toLeftSplitWindow = () => {
    const {moveFocus} = require("./pagelayout")
    moveFocus("left")
}

/** Move the focus to the split to the bottom of the current one. */
const toBottomSplitWindow = () => {
    const {moveFocus} = require("./pagelayout")
    moveFocus("bottom")
}

/** Move the focus to the split to the top of the current one. */
const toTopSplitWindow = () => {
    const {moveFocus} = require("./pagelayout")
    moveFocus("top")
}

/** Move the focus to the split to the right of the current one. */
const toRightSplitWindow = () => {
    const {moveFocus} = require("./pagelayout")
    moveFocus("right")
}

/** Move the focus back to the previously focused window split. */
const toLastSplitWindow = () => {
    const {lastSplit} = require("./pagelayout")
    lastSplit()
}

/** Move the focus to the very first split by appearance. */
const toFirstSplitWindow = () => {
    const {firstSplit} = require("./pagelayout")
    firstSplit()
}

/** Move the focus to the next split by appearance. */
const toNextSplitWindow = () => {
    const {nextSplit} = require("./pagelayout")
    nextSplit()
}

/** Move the focus to the previous split by appearance. */
const toPreviousSplitWindow = () => {
    const {previousSplit} = require("./pagelayout")
    previousSplit()
}

/** Swap the location of the current split and others in the same level. */
const exchangeSplitWindow = () => {
    const {exchange} = require("./pagelayout")
    exchange()
}

/** Increase the height of the current window split within the same level. */
const increaseHeightSplitWindow = () => {
    const {resize} = require("./pagelayout")
    resize("ver", "grow")
}

/** Decrease the height of the current window split within the same level. */
const decreaseHeightSplitWindow = () => {
    const {resize} = require("./pagelayout")
    resize("ver", "shrink")
}

/** Increase the width of the current window split within the same level. */
const increaseWidthSplitWindow = () => {
    const {resize} = require("./pagelayout")
    resize("hor", "grow")
}

/** Decrease the width of the current window split within the same level. */
const decreaseWidthSplitWindow = () => {
    const {resize} = require("./pagelayout")
    resize("hor", "shrink")
}

/** Distribute the space each window split take equally within each level. */
const distrubuteSpaceSplitWindow = () => {
    const {resetResizing} = require("./pagelayout")
    resetResizing()
}

/** Toggle the always on top functionality of the app. */
const toggleAlwaysOnTop = () => ipcRenderer.invoke("toggle-always-on-top")

/** Toggle the fullscreen functionality of the app, then update the GUI. */
const toggleFullscreen = () => {
    ipcRenderer.invoke("toggle-fullscreen").then(updateGuiVisibility)
}

/**
 * Get a url with the right chars escaped, either a custom or current url.
 * @param {string} customUrl
 */
const getPageUrl = (customUrl = "") => {
    let url = customUrl || currentPage()?.src || ""
    if (getSetting("encodeurlcopy") === "spacesonly") {
        url = url.replace(/ /g, "%20")
    } else if (getSetting("encodeurlcopy") === "nospaces") {
        url = urlToString(url).replace(/ /g, "%20")
    } else if (getSetting("encodeurlcopy") === "decode") {
        url = urlToString(url)
    } else if (getSetting("encodeurlcopy") === "encode") {
        url = stringToUrl(url)
    }
    return url
}

/** Get the list of RSS links on the page.
 * @param {ActionParam} args
 * @returns {Promise<string[]|null>}
 */
const getPageRSSLinks = async args => {
    const feedUrls = await currentPage()?.executeJavaScript(
        `Array.from(document.querySelectorAll("link[type]")).map(link => [
            "application/rss+xml",
            "application/atom+xml",
            "application/rdf+xml",
            "application/rss",
            "application/atom",
            "application/rdf",
            "text/rss+xml",
            "text/atom+xml",
            "text/rdf+xml",
            "text/rss",
            "text/atom",
            "text/rdf"
        ].includes(link.getAttribute("type"))
            && link.getAttribute("href")).filter(Boolean)`)
    if (feedUrls.length === 0) {
        notify("No RSS feeds found on this page",
            {"src": args.src, "type": "warn"})
        return null
    }
    return feedUrls.slice(0, 10).map((feed = "") => {
        if (!isUrl(feed)) {
            return getPageUrl(`${new URL(getPageUrl()).origin}${feed}`)
        }
        return getPageUrl(feed)
    })
}

/**
 * Notify with the list of RSS links on the current page.
 * @param {ActionParam} args
 */
const pageRSSLinksList = async args => {
    const feedUrls = await getPageRSSLinks(args)
    if (!feedUrls) {
        return
    }
    const feedsString = feedUrls.map((url, i) => `${i} - ${url}`).join("\n")
    notify(`--- RSS links on the page ---\n${feedsString}`,
        {"src": args.src, "type": "warn"})
}

/** Copy an RSS link to the clipboard by index.
 * @param {ActionParam} args
 */
const pageRSSLinkToClipboard = async args => {
    const {key} = args
    if (!key) {
        return
    }
    const feedUrls = await getPageRSSLinks(args)
    if (!feedUrls) {
        return
    }
    const feedUrl = feedUrls[!isNaN(Number(key)) && Number(key) || 0] ?? ""
    clipboard.writeText(feedUrl)
    notify(`RSS feed '${feedUrl}' copied to clipboard`,
        {"src": args.src, "type": "suc"})
}

/** Copy the current page url to the system clipboard. */
const pageToClipboard = () => clipboard.writeText(getPageUrl())

/** Copy the current page title to the system clipboard. */
const pageTitleToClipboard = () => {
    const {getPageTitle} = require("./command")
    clipboard.writeText(getPageTitle())
}

/** Copy the current page to the system clipboard formatted as HTML. */
const pageToClipboardHTML = () => {
    const url = getPageUrl()
    const title = currentTab()?.querySelector("span")?.textContent
    clipboard.writeText(`<a href="${url}">${title}</a>`)
}

/** Copy the current page to the system clipboard formatted as Markdown. */
const pageToClipboardMarkdown = () => {
    const url = getPageUrl()
    const title = currentTab()?.querySelector("span")?.textContent
    clipboard.writeText(`[${title}](${url})`)
}

/** Copy the current page to the system clipboard formatted as RST. */
const pageToClipboardRST = () => {
    const url = getPageUrl()
    const title = currentTab()?.querySelector("span")?.textContent
    clipboard.writeText(`\`${title} <${url}>\`_`)
}

/** Copy the current page to the system clipboard formatted as Emacs. */
const pageToClipboardEmacs = () => {
    const url = getPageUrl()
    const title = currentTab()?.querySelector("span")?.textContent
    clipboard.writeText(`[[${url}][${title}]]`)
}

/**
 * Open the link currently in the system clipboard in the current tab.
 * @param {ActionParam} args
 */
const openFromClipboard = args => {
    if (clipboard.readText().trim()) {
        const {navigateTo} = require("./tabs")
        navigateTo(args.src, stringToUrl(clipboard.readText()))
    }
}

/**
 * Store a scroll position based on key.
 * @param {ActionParam&{path?: string, pixels?: number}} args
 */
const storeScrollPos = async args => {
    const {key} = args
    if (!key) {
        return
    }
    let scrollType = getSetting("scrollpostype")
    if (scrollType !== "local" && scrollType !== "global") {
        scrollType = "global"
        if (key !== key.toUpperCase()) {
            scrollType = "local"
        }
    }
    const qm = readJSON(joinPath(appData(), "quickmarks")) ?? {}
    if (!qm.scroll) {
        qm.scroll = {"global": {}, "local": {}}
    }
    let pixels = await currentPage()?.executeJavaScript("window.scrollY")
    if (pixels === 0) {
        pixels = await currentPage()?.executeJavaScript(
            "document.body.scrollTop")
    }
    if (args.path === "global") {
        scrollType = "global"
    }
    if (scrollType === "local") {
        let path = ""
        const scrollPosId = getSetting("scrollposlocalid")
        if (scrollPosId === "domain") {
            path = domainName(urlToString(currentPage()?.src ?? ""))
                || domainName(currentPage()?.src ?? "") || ""
        }
        if (scrollPosId === "url" || !path) {
            path = urlToString(currentPage()?.src ?? "")
                || currentPage()?.src || ""
        }
        path = args.path ?? path
        if (!qm.scroll.local[path]) {
            qm.scroll.local[path] = {}
        }
        qm.scroll.local[path][key] = args.pixels ?? pixels
    } else {
        qm.scroll.global[key] = args.pixels ?? pixels
    }
    writeJSON(joinPath(appData(), "quickmarks"), qm)
}

/**
 * Restore a stored scroll position based on key.
 * @param {ActionParam&{path?: string}} args
 */
const restoreScrollPos = args => {
    const {key} = args
    if (!key) {
        return
    }
    const scrollPosId = getSetting("scrollposlocalid")
    let path = ""
    if (scrollPosId === "domain") {
        path = domainName(urlToString(currentPage()?.src ?? ""))
            || domainName(currentPage()?.src ?? "") || ""
    }
    if (scrollPosId === "url" || !path) {
        path = urlToString(currentPage()?.src ?? "") || currentPage()?.src || ""
    }
    path = args.path ?? path
    const qm = readJSON(joinPath(appData(), "quickmarks"))
    const pixels = qm?.scroll?.local?.[path]?.[key] ?? qm?.scroll?.global?.[key]
    if (pixels !== undefined) {
        currentPage()?.executeJavaScript(`
        if (document.documentElement.scrollHeight === window.innerHeight) {
            document.body.scrollTo(0, ${pixels})
        } else {
            window.scrollTo(0, ${pixels})
        }`)
    }
}

/**
 * Make a new mark based on a key.
 * @param {ActionParam&{url?: string}} args
 */
const makeMark = args => {
    const {key} = args
    if (!key) {
        return
    }
    const qm = readJSON(joinPath(appData(), "quickmarks")) ?? {}
    if (!qm.marks) {
        qm.marks = {}
    }
    qm.marks[key] = urlToString(args.url ?? currentPage()?.src ?? "")
    writeJSON(joinPath(appData(), "quickmarks"), qm)
}

/**
 * Restore a stored mark by key to a position.
 * @param {ActionParam&{position?: import("./tabs").tabPosition}} args
 */
const restoreMark = args => {
    const {key} = args
    if (!key) {
        return
    }
    const qm = readJSON(joinPath(appData(), "quickmarks"))
    const {commonAction} = require("./contextmenu")
    let position = getSetting("markposition")
    const shiftedPosition = getSetting("markpositionshifted")
    if (key === key.toUpperCase() && shiftedPosition !== "default") {
        position = shiftedPosition
    }
    position = args.position ?? position
    commonAction(args.src, "link", position, {"link": qm?.marks?.[key]})
}

/**
 * Run a stored macro recording by key.
 * @param {ActionParam} args
 */
const runRecording = args => {
    const {key} = args
    if (!key) {
        return
    }
    const recording = readJSON(joinPath(appData(), "recordings"))?.[key]
    if (recording) {
        setTimeout(() => {
            const {executeMapString, sanitiseMapString} = require("./input")
            executeMapString(sanitiseMapString(args.src, recording, true),
                true, {"initial": true, "src": args.src})
        }, 5)
    }
}

/** Start a macro recording by key.
 * @param {ActionParam} args
 */
const startRecording = args => {
    const {key} = args
    if (!key) {
        return
    }
    const {"startRecording": start} = require("./input")
    start(key, args.src)
}

/** Stop the current macro recording if active. */
const stopRecording = () => {
    const {"stopRecording": stop} = require("./input")
    const record = stop()
    if (!record) {
        return
    }
    const recordings = readJSON(joinPath(appData(), "recordings")) ?? {}
    recordings[record.name] = record.string
    writeJSON(joinPath(appData(), "recordings"), recordings)
}

/** Change the z-index order of the follow mode elements by type. */
const reorderFollowLinks = () => {
    const {reorderDisplayedLinks} = require("./follow")
    reorderDisplayedLinks()
}

/**
 * Open the menu, either for system elements or the current insert element.
 * @param {ActionParam} args
 */
const menuOpen = args => {
    const {viebMenu} = require("./contextmenu")
    if (currentMode() === "normal") {
        const tab = currentTab()
        const bounds = tab?.getBoundingClientRect()
        const tabs = document.getElementById("tabs")
        if (tab && bounds && tabs) {
            viebMenu(args.src, {
                "path": [tab, tabs],
                "x": bounds.x,
                "y": bounds.y + bounds.height
            }, true)
        }
    } else if (currentMode() === "insert") {
        sendToPageOrSubFrame("contextmenu")
    } else if ("sec".includes(currentMode()[0])) {
        const selected = document.querySelector("#suggest-dropdown .selected")
        let bounds = selected?.getBoundingClientRect()
        if (currentMode() === "command" && selected && bounds) {
            const {commandMenu} = require("./contextmenu")
            commandMenu(args.src, {
                "command": selected.querySelector("span")?.textContent ?? "",
                "x": bounds.x,
                "y": bounds.y + bounds.height
            })
        } else if (currentMode() === "explore" && selected && bounds) {
            const {linkMenu} = require("./contextmenu")
            linkMenu(args.src, {
                "link": selected.querySelector(".url")?.textContent ?? "",
                "x": bounds.x,
                "y": bounds.y + bounds.height
            })
        } else {
            const url = getUrl()
            bounds = url?.getBoundingClientRect()
            if (url && bounds) {
                const charWidth = getSetting("guifontsize") * 0.60191
                viebMenu(args.src, {
                    "path": [url],
                    "x": bounds.x + charWidth
                        * (url.selectionStart ?? 0) - url.scrollLeft,
                    "y": bounds.y + bounds.height
                }, true)
            }
        }
    } else {
        const {openMenu} = require("./pointer")
        openMenu(args)
    }
}

/** Go to the top entry in the context menu. */
const menuTop = () => {
    const {top} = require("./contextmenu")
    top()
}

/** Go one section up in the context menu. */
const menuSectionUp = () => {
    const {sectionUp} = require("./contextmenu")
    sectionUp()
}

/** Go one entry up in the context menu. */
const menuUp = () => {
    const {up} = require("./contextmenu")
    up()
}

/** Go one entry down in the context menu. */
const menuDown = () => {
    const {down} = require("./contextmenu")
    down()
}

/** Go one section down in the context menu. */
const menuSectionDown = () => {
    const {sectionDown} = require("./contextmenu")
    sectionDown()
}

/** Go to the bottom entry in the context menu. */
const menuBottom = () => {
    const {bottom} = require("./contextmenu")
    bottom()
}

/** Execute the currently selected entry of the context menu. */
const menuSelect = () => {
    const {select} = require("./contextmenu")
    select()
}

/** Close the context menu without side effects. */
const menuClose = () => {
    const {clear} = require("./contextmenu")
    clear()
}

/** Show the table of contents on the current page. */
const showTOC = () => {
    const {getCustomStyling} = require("./settings")
    const fontsize = getSetting("guifontsize")
    sendToPageOrSubFrame("action", "showTOC", getCustomStyling(), fontsize)
}

/** Hide the table of contents. */
const hideTOC = () => sendToPageOrSubFrame("action", "hideTOC")

/** Toggle the table of contents on the current page. */
const toggleTOC = () => {
    const {getCustomStyling} = require("./settings")
    const fontsize = getSetting("guifontsize")
    sendToPageOrSubFrame("action", "toggleTOC", getCustomStyling(), fontsize)
}

/**
 * Use the navbar entered data to either navigate, search or run commands.
 * @param {ActionParam} args
 */
const useEnteredData = args => {
    const {setMode} = require("./modes")
    const url = getUrl()
    if (!url) {
        return
    }
    if (currentMode() === "command") {
        const command = url.value.trim()
        setMode("normal")
        const {execute} = require("./command")
        execute(command, {"src": "user"})
    }
    if (currentMode() === "search") {
        searchDirection = potentialNewSearchDirection
        incrementalSearch({"src": args.src, "value": url.value})
        setMode("normal")
    }
    if (currentMode() === "explore") {
        const location = url.value.trim()
        setMode("normal")
        if (location) {
            const modifiedLoc = searchword(location).url
            const {push} = require("./explorehistory")
            push(urlToString(modifiedLoc))
            const {navigateTo} = require("./tabs")
            navigateTo(args.src, stringToUrl(modifiedLoc))
        }
    }
}

/** This action does nothing, but can be used as the action of a mapping. */
const nop = () => {
    // Explicit No-op action: does nothing
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
    getPageUrl,
    hideTOC,
    increaseFirstNumber,
    increaseHeightSplitWindow,
    increaseLastNumber,
    increasePageNumber,
    increasePortNumber,
    increaseWidthSplitWindow,
    incrementalSearch,
    insertAtFirstInput,
    leftHalfSplitWindow,
    makeMark,
    menuBottom,
    menuClose,
    menuDown,
    menuOpen,
    menuSectionDown,
    menuSectionUp,
    menuSelect,
    menuTop,
    menuUp,
    moveTabBackward,
    moveTabEnd,
    moveTabForward,
    moveTabStart,
    nextPage,
    nextPageNewTab,
    nextSearchMatch,
    nextSuggestion,
    nextSuggestionSection,
    nextTab,
    nop,
    openFromClipboard,
    openLinkExternal,
    openNewTabWithCurrentUrl,
    pageRSSLinkToClipboard,
    pageRSSLinksList,
    pageTitleToClipboard,
    pageToClipboard,
    pageToClipboardEmacs,
    pageToClipboardHTML,
    pageToClipboardMarkdown,
    pageToClipboardRST,
    prevSuggestion,
    prevSuggestionSection,
    previousPage,
    previousPageNewTab,
    previousSearchMatch,
    previousTab,
    refreshTab,
    refreshTabWithoutCache,
    reopenTab,
    reorderFollowLinks,
    repeatLastAction,
    resetIncrementalSearch,
    restoreMark,
    restoreScrollPos,
    rightHalfSplitWindow,
    rotateSplitWindowBackward,
    rotateSplitWindowForward,
    runRecording,
    scrollBottom,
    scrollDown,
    scrollLeft,
    scrollLeftMax,
    scrollPageDown,
    scrollPageDownHalf,
    scrollPageLeft,
    scrollPageRight,
    scrollPageUp,
    scrollPageUpHalf,
    scrollRight,
    scrollRightMax,
    scrollTop,
    scrollUp,
    setFocusCorrectly,
    showTOC,
    startFollowCopyLink,
    startFollowCurrentTab,
    startFollowNewSplit,
    startFollowNewTab,
    startFollowNewVerSplit,
    startRecording,
    stopFollowMode,
    stopLoadingPage,
    stopRecording,
    storeScrollPos,
    toBottomSplitWindow,
    toCommandMode,
    toExploreMode,
    toFirstSplitWindow,
    toInsertMode,
    toLastSplitWindow,
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
    toggleAlwaysOnTop,
    toggleFullscreen,
    toggleMarkdownViewer,
    toggleMarkdownViewerNewTab,
    toggleReaderView,
    toggleReaderViewNewTab,
    toggleSourceViewer,
    toggleSourceViewerNewTab,
    toggleTOC,
    topHalfSplitWindow,
    useEnteredData,
    zoomIn,
    zoomOut,
    zoomReset
}
