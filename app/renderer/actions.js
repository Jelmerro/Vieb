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
/** @typedef {{
 *   key?: string,
 *   src: import("./common.js").RunSource,
 *   hadModifier?: boolean,
 *   customPage?: Electron.WebviewTag
 * }} ActionParam
 */

import {
    appData,
    domainName,
    execCommand,
    getSetting,
    isDir,
    isFile,
    isUrl,
    joinPath,
    makeDir,
    notify,
    readFile,
    readJSON,
    searchword,
    stringToUrl,
    urlToString,
    watchFile,
    writeFile,
    writeJSON
} from "../util.js"
import {clipboard, ipcRenderer} from "electron"
import {
    currentMode,
    currentPage,
    currentTab,
    getStored,
    getUrl,
    listRealPages,
    listTabs,
    sendToPageOrSubFrame,
    setStored,
    tabForPage,
    updateGuiVisibility
} from "./common.js"

let lastSearchFull = false
let currentSearch = ""
let storedSearch = ""
let searchDirection = "forward"
let potentialNewSearchDirection = "forward"

/**
 * Empty the current search by scope.
 * @param {ActionParam & {scope?: "both"|"local"|"global"}} args
 */
export const emptySearch = async args => {
    const scope = args.scope || await getSetting("searchemptyscope")
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
const matchCase = async search => {
    if (await getSetting("smartcase")) {
        return search !== search.toLowerCase()
    }
    return !getSetting("ignorecase")
}

/** Highlight the next search match based on the scope. */
export const nextSearchMatch = async() => {
    const scope = await getSetting("searchscope")
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
        pages.forEach(async page => {
            if (tabForPage(page)?.classList.contains("visible-tab")) {
                page?.findInPage(search, {
                    "findNext": true,
                    "forward": searchDirection === "forward",
                    "matchCase": await matchCase(search)
                })
            }
        })
    }
}

/**
 * Switch to search mode.
 * @param {ActionParam} args
 */
export const toSearchMode = async args => {
    const {setMode} = await import("./modes.js")
    setMode("search")
    let search = getStored("globalsearch")
    if (await getSetting("searchscope") !== "global") {
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
        const {requestSuggestUpdate} = await import("./input.js")
        requestSuggestUpdate()
    }
}

/** Highlight the previous search match based on the scope. */
export const previousSearchMatch = async() => {
    const scope = await getSetting("searchscope")
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
        pages.forEach(async page => {
            if (tabForPage(page)?.classList.contains("visible-tab")) {
                page?.findInPage(search, {
                    "findNext": true,
                    "forward": searchDirection === "backward",
                    "matchCase": await matchCase(search)
                })
            }
        })
    }
}

/**
 * Reset the incremental search match.
 * @param {ActionParam} args
 */
export const resetIncrementalSearch = async args => {
    if (await getSetting("searchscope") === "inclocal" && !lastSearchFull) {
        await emptySearch({"scope": "local", "src": args?.src ?? "other"})
    }
}

/**
 * Search for the string incrementally while typing if enabled, by scope.
 * @param {ActionParam&{value?: string}|null} args
 */
export const incrementalSearch = async args => {
    let scope = await getSetting("searchscope")
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
        pages.forEach(async page => {
            page?.stopFindInPage("clearSelection")
            if (tabForPage(page)?.classList.contains("visible-tab")) {
                page?.findInPage(search, {"matchCase": await matchCase(search)})
            }
        })
    } else {
        emptySearch({scope, "src": args?.src ?? "other"})
    }
}

/** Click on the current search match using the electron API. */
export const clickOnSearch = () => currentPage()
    ?.stopFindInPage("activateSelection")

/** Navigate to the next page as defined by the in-page markers. */
export const nextPage = () => sendToPageOrSubFrame("action", "nextPage")

/** Navigate to the previous page as defined by the in-page markers. */
export const previousPage = () => sendToPageOrSubFrame("action", "previousPage")

/** Open a new tab with the next page as defined by the in-page markers. */
export const nextPageNewTab = () => sendToPageOrSubFrame(
    "action", "nextPage", true)

/** Open a new tab with the previous page as defined by the in-page markers. */
export const previousPageNewTab = () => sendToPageOrSubFrame(
    "action", "previousPage", true)

/**
 * Modify a url based on a source pattern and a replacement function.
 * @param {import("./common.js").RunSource} src
 * @param {string} source
 * @param {(...args: string[]) => string} replacement
 */
const modifyUrl = async(src, source, replacement) => {
    const url = currentPage()?.src || ""
    const next = url.replace(RegExp(source), replacement)
    if (next !== url) {
        const {navigateTo} = await import("./tabs.js")
        navigateTo(src, next)
    }
}

/**
 * Move the first number based on a movement number.
 * @param {import("./common.js").RunSource} src
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
 * @param {import("./common.js").RunSource} src
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
 * @param {import("./common.js").RunSource} src
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
export const increasePageNumber = args => movePageNumber(args.src, 1)

/**
 * Navigate to the previous page as found in the url with `page=` or `p=`.
 * @param {ActionParam} args
 */
export const decreasePageNumber = args => movePageNumber(args.src, -1)

/**
 * Move the port number based on a movement number.
 * @param {import("./common.js").RunSource} src
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
export const increasePortNumber = args => movePortNumber(args.src, 1)

/**
 * Decrease the port number by one based on port standards.
 * @param {ActionParam} args
 */
export const decreasePortNumber = args => movePortNumber(args.src, -1)

/**
 * Increase to the very first number in the url.
 * @param {ActionParam} args
 */
export const increaseFirstNumber = args => moveFirstNumber(args.src, 1)

/**
 * Decrease to the very first number in the url.
 * @param {ActionParam} args
 */
export const decreaseFirstNumber = args => moveFirstNumber(args.src, -1)

/**
 * Increase to the very last number in the url.
 * @param {ActionParam} args
 */
export const increaseLastNumber = args => moveLastNumber(args.src, 1)

/**
 * Decrease to the very last number in the url.
 * @param {ActionParam} args
 */
export const decreaseLastNumber = args => moveLastNumber(args.src, -1)

/**
 * Go to root domain, by removing most subdomains, repeats to remove www.
 * @param {ActionParam} args
 */
export const toRootSubdomain = async args => {
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
        const {navigateTo} = await import("./tabs.js")
        navigateTo(args.src, urlObj.href)
    }
}

/**
 * Go to the parent domain, by removing 1 subdomain until there are none.
 * @param {ActionParam} args
 */
export const toParentSubdomain = async args => {
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
        const {navigateTo} = await import("./tabs.js")
        navigateTo(args.src, urlObj.href)
    }
}

/**
 * Go to the root url by removing the entire path, the search and the hash.
 * @param {ActionParam} args
 */
export const toRootUrl = async args => {
    const url = currentPage()?.src
    if (!url) {
        return
    }
    const urlObj = new URL(url)
    const originalUrl = urlObj.href
    urlObj.pathname = ""
    urlObj.search = ""
    urlObj.hash = ""
    const {navigateTo} = await import("./tabs.js")
    if (process.platform === "win32") {
        const isRoot = [
            "file://", "file:///", "file:///C:", "file:///C:/"
        ].find(u => u === urlObj.href || u === originalUrl)
        if (isRoot) {
            navigateTo(args.src, "file:///C:/")
            return
        }
    }
    if (originalUrl !== urlObj.href) {
        navigateTo(args.src, urlObj.href)
    }
}

/**
 * Go to the parent url by removing the path part, the search and the hash.
 * @param {ActionParam} args
 */
export const toParentUrl = async args => {
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
    const {navigateTo} = await import("./tabs.js")
    if (process.platform === "win32") {
        const isRoot = [
            "file://", "file:///", "file:///C:", "file:///C:/"
        ].find(u => u === urlObj.href || u === originalUrl)
        if (isRoot) {
            navigateTo(args.src, "file:///C:/")
            return
        }
    }
    if (originalUrl !== urlObj.href) {
        navigateTo(args.src, urlObj.href)
    }
}

/** Go to the previous tab in the bar, optionally wrapping back to the last. */
export const previousTab = async() => {
    const {switchToTab} = await import("./tabs.js")
    const current = currentTab()
    if (current) {
        switchToTab(listTabs().indexOf(current) - 1)
    }
}

/** Go to the next tab in the bar, optionally wrapping to the first. */
export const nextTab = async() => {
    const {switchToTab} = await import("./tabs.js")
    const current = currentTab()
    if (current) {
        switchToTab(listTabs().indexOf(current) + 1)
    }
}

/**
 * Toggle the sourceviewer in the current tab.
 * @param {ActionParam} args
 */
export const toggleSourceViewer = async args => {
    const {navigateTo} = await import("./tabs.js")
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
export const toggleSourceViewerNewTab = async args => {
    const {navigateTo, addTab} = await import("./tabs.js")
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
export const toggleReaderView = async args => {
    const {navigateTo} = await import("./tabs.js")
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
export const toggleReaderViewNewTab = async args => {
    const {navigateTo, addTab} = await import("./tabs.js")
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
export const toggleMarkdownViewer = async args => {
    const {navigateTo} = await import("./tabs.js")
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
export const toggleMarkdownViewerNewTab = async args => {
    const {navigateTo, addTab} = await import("./tabs.js")
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
export const toExploreMode = async() => {
    const {setMode} = await import("./modes.js")
    setMode("explore")
}

/** Go to insert mode at the very first visible input element on the page. */
export const insertAtFirstInput = () => sendToPageOrSubFrame("focus-input")

/** Go to insert mode using regular mode switching. */
export const toInsertMode = async() => {
    const {setMode} = await import("./modes.js")
    setMode("insert")
}

/** Scroll to the very top of the page. */
export const scrollTop = () => currentPage()?.send("action", "scrollTop")

/** Scroll to the very bottom of the page. */
export const scrollBottom = () => currentPage()?.send("action", "scrollBottom")

/** Scroll to the very right of the page. */
export const scrollRightMax = () => currentPage()
    ?.send("action", "scrollRightMax")

/** Scroll to the very left of the page. */
export const scrollLeftMax = () => currentPage()
    ?.send("action", "scrollLeftMax")

/** Scroll up 100px. */
export const scrollUp = () => currentPage()?.send("action", "scrollUp")

/** Scroll down 100px. */
export const scrollDown = () => currentPage()?.send("action", "scrollDown")

/** Scroll right 100px. */
export const scrollRight = () => currentPage()?.send("action", "scrollRight")

/** Scroll left 100px. */
export const scrollLeft = () => currentPage()?.send("action", "scrollLeft")

/** Scroll one page width to the right. */
export const scrollPageRight = () => currentPage()
    ?.send("action", "scrollPageRight")

/** Scroll one page width to the left. */
export const scrollPageLeft = () => currentPage()
    ?.send("action", "scrollPageLeft")

/** Scroll one page height up. */
export const scrollPageUp = () => currentPage()?.send("action", "scrollPageUp")

/** Scroll half a page height down. */
export const scrollPageDownHalf = () => currentPage()?.send(
    "action", "scrollPageDownHalf")

/** Scroll one page height down. */
export const scrollPageDown = () => currentPage()
    ?.send("action", "scrollPageDown")

/** Scroll half a page height up. */
export const scrollPageUpHalf = () => currentPage()?.send(
    "action", "scrollPageUpHalf")

/**
 * Refresh the current page or optionally a custom page.
 * @param {ActionParam} args
 */
export const refreshTab = async args => {
    const page = args?.customPage || currentPage()
    if (page && !page.src.startsWith("devtools://")) {
        if (page.isCrashed()) {
            const {recreateWebview} = await import("./tabs.js")
            recreateWebview(args.src, page)
            return
        }
        const {rerollUserAgent, resetTabInfo} = await import("./tabs.js")
        rerollUserAgent(page)
        resetTabInfo(page)
        page.reload()
    }
}

/** Reopen the last closed tab. */
export const reopenTab = async() => {
    const {"reopenTab": reopen} = await import("./tabs.js")
    reopen()
}

/** Switch to follow mode to copy a link. */
export const startFollowCopyLink = async() => {
    const {startFollow} = await import("./follow.js")
    startFollow("copylink")
}

/** Switch to follow mode to open a horizontal split. */
export const startFollowNewSplit = async() => {
    const {startFollow} = await import("./follow.js")
    startFollow("ver")
}

/** Switch to follow mode to open a vertical split. */
export const startFollowNewVerSplit = async() => {
    const {startFollow} = await import("./follow.js")
    startFollow("hor")
}

/** Switch to follow mode to open a new tab. */
export const startFollowNewTab = async() => {
    const {startFollow} = await import("./follow.js")
    startFollow("newtab")
}

/** Switch to follow mode to click on links in the current tab. */
export const startFollowCurrentTab = async() => {
    const {startFollow} = await import("./follow.js")
    startFollow("current")
}

/**
 * Go back in history for the current page or a custom one.
 * @param {ActionParam} args
 */
export const backInHistory = async args => {
    const page = args?.customPage || currentPage()
    if (page && !page.src.startsWith("devtools://")) {
        if (page.isCrashed()) {
            const {recreateWebview} = await import("./tabs.js")
            recreateWebview(args.src, page)
            return
        }
        if (page?.canGoBack()) {
            const tabTitleEl = tabForPage(page)?.querySelector("span")
            if (tabTitleEl) {
                tabTitleEl.textContent = ""
            }
            const {rerollUserAgent, resetTabInfo} = await import("./tabs.js")
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
export const forwardInHistory = async args => {
    const page = args.customPage || currentPage()
    if (page && !page.src.startsWith("devtools://")) {
        if (page.isCrashed()) {
            const {recreateWebview} = await import("./tabs.js")
            recreateWebview(args.src, page)
            return
        }
        if (page?.canGoForward()) {
            const tabTitleEl = tabForPage(page)?.querySelector("span")
            if (tabTitleEl) {
                tabTitleEl.textContent = ""
            }
            const {rerollUserAgent, resetTabInfo} = await import("./tabs.js")
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
export const refreshTabWithoutCache = async args => {
    const page = currentPage()
    if (page && !page.src.startsWith("devtools://")) {
        if (page.isCrashed()) {
            const {recreateWebview} = await import("./tabs.js")
            recreateWebview(args.src, page)
            return
        }
        const {rerollUserAgent, resetTabInfo} = await import("./tabs.js")
        rerollUserAgent(page)
        resetTabInfo(page)
        page.reloadIgnoringCache()
    }
}


/**
 * Open a new tab, switch to explore mode and have the current url ready.
 * @param {{
 *   key?: string,
 *   src: import("./common.js").RunSource,
 *   hadModifier?: boolean,
 *   customPage?: Electron.WebviewTag | HTMLDivElement
 * }} args
 */
export const openNewTabWithCurrentUrl = async args => {
    const url = args.customPage?.getAttribute("src") || currentPage()?.src || ""
    const {addTab} = await import("./tabs.js")
    if (args.customPage) {
        const tab = tabForPage(args.customPage)
        if (!tab) {
            return
        }
        const tabnewposition = await getSetting("tabnewposition")
        let index = listTabs().indexOf(tab)
        if (tabnewposition === "right") {
            index += 1
        }
        const pinned = tab.classList.contains("pinned") ?? false
        addTab({"customIndex": index, pinned, "src": args.src})
    } else {
        const pinned = currentTab()?.classList.contains("pinned") ?? false
        addTab({pinned, "src": args.src})
    }
    const {setMode} = await import("./modes.js")
    setMode("explore")
    const urlEl = getUrl()
    if (urlEl) {
        urlEl.value = urlToString(url)
    }
}

/** Go to command mode using regular mode switching. */
export const toCommandMode = async() => {
    const {setMode} = await import("./modes.js")
    setMode("command")
}

/** Stop loading the page for now, might still start new fetch requests. */
export const stopLoadingPage = () => currentPage()?.stop()

/** Move the current tab one spot to the right/end in the bar. */
export const moveTabForward = async() => {
    const {"moveTabForward": move} = await import("./tabs.js")
    move()
}

/** Move the current tab one spot to the left/beginning in the bar. */
export const moveTabBackward = async() => {
    const {"moveTabBackward": move} = await import("./tabs.js")
    move()
}

/** Move the current tab all the way to the right/end in the bar. */
export const moveTabEnd = async() => {
    const {"moveTabForward": move} = await import("./tabs.js")
    let didMove = move()
    while (didMove) {
        didMove = move()
    }
}

/** Move the current tab all the way to the left/beginning in the bar. */
export const moveTabStart = async() => {
    const {"moveTabBackward": move} = await import("./tabs.js")
    let didMove = move()
    while (didMove) {
        didMove = move()
    }
}

/** Reset the zoom level to the 100% default. */
export const zoomReset = () => currentPage()?.setZoomLevel(0)

/**
 * Zoom the current page out or do it for a custom page.
 * @param {ActionParam} args
 */
export const zoomOut = args => {
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
export const zoomIn = args => {
    const page = args.customPage || currentPage()
    let level = (page?.getZoomLevel() ?? 0) + 1
    if (level > 7) {
        level = 7
    }
    page?.setZoomLevel(level)
}

/** Go to normal mode using regular mode switching. */
export const toNormalMode = async() => {
    const {setMode} = await import("./modes.js")
    setMode("normal")
}

/** Go to the previous mode used before follow, or back to normal. */
export const stopFollowMode = async() => {
    const {setMode} = await import("./modes.js")
    if (currentMode() === "follow") {
        setMode(getStored("modebeforefollow") || "normal")
    } else {
        setMode("normal")
    }
}

/** Repeat the last used action. */
export const repeatLastAction = async() => {
    const {"repeatLastAction": repeat} = await import("./input.js")
    repeat()
}

/**
 * Edit the current insert mode input or navbar mode text.
 * @param {ActionParam} args
 */
export const editWithVim = async args => {
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
    const fileFolder = joinPath(await appData(), "vimformedits")
    makeDir(fileFolder)
    const tempFile = joinPath(fileFolder, String(Number(new Date())))
    /** @type {import("child_process").ChildProcess|null} */
    let command = null
    watchFile(tempFile, async() => {
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
                const {requestSuggestUpdate} = await import("./input.js")
                requestSuggestUpdate()
            }
        } else {
            const commandStr = `${await getSetting("vimcommand")} "${tempFile}"`
            command = await execCommand(commandStr, async(err, stdout) => {
                const reportExit = await getSetting(
                    "notificationforsystemcommands")
                if (err && reportExit !== "none") {
                    notify({
                        "fields": [`${err}`],
                        "id": "actions.command.failed",
                        "src": args.src,
                        "type": "error"
                    })
                } else if (reportExit === "all") {
                    const output = stdout.toString()
                    if (output) {
                        notify({
                            "fields": [output],
                            "id": "actions.command.successWithOutput",
                            "src": args.src,
                            "type": "success"
                        })
                    } else {
                        notify({
                            "id": "actions.command.success",
                            "src": args.src,
                            "type": "success"
                        })
                    }
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
export const downloadLink = async args => {
    const {commonAction} = await import("./contextmenu.js")
    commonAction(args.src, "link", "download",
        {"link": currentPage()?.src ?? ""})
}

/**
 * Open the current page link in an external application as per setting.
 * @param {ActionParam} args
 */
export const openLinkExternal = async args => {
    const {commonAction} = await import("./contextmenu.js")
    commonAction(args.src, "link", "external",
        {"link": currentPage()?.src ?? ""})
}

/** Completely reset any focus issues there could be in the app. */
export const setFocusCorrectly = async() => {
    const urlElement = document.getElementById("url")
    const {updateUrl} = await import("./tabs.js")
    const {followFiltering} = await import("./follow.js")
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
export const nextSuggestion = async() => {
    const {next} = await import("./suggest.js")
    next()
    setFocusCorrectly()
}

/** Go to the previous suggestion in the list. */
export const prevSuggestion = async() => {
    const {previous} = await import("./suggest.js")
    previous()
    setFocusCorrectly()
}

/** Go to the next section in the suggestion list. */
export const nextSuggestionSection = async() => {
    const {nextSection} = await import("./suggest.js")
    nextSection()
    setFocusCorrectly()
}

/** Go to the previous section in the suggestion list. */
export const prevSuggestionSection = async() => {
    const {previousSection} = await import("./suggest.js")
    previousSection()
    setFocusCorrectly()
}

/** Go back in history to previously run commands. */
export const commandHistoryPrevious = async() => {
    const {previous} = await import("./commandhistory.js")
    previous()
}

/** Go forward in history to previously run commands, or back to current. */
export const commandHistoryNext = async() => {
    const {next} = await import("./commandhistory.js")
    next()
}

/** Go back in history to previously navigated sites. */
export const exploreHistoryPrevious = async() => {
    const {previous} = await import("./explorehistory.js")
    previous()
}

/** Go forward in history to previously navigated sites, or back to current. */
export const exploreHistoryNext = async() => {
    const {next} = await import("./explorehistory.js")
    next()
}

/** Rotate the current window split forward. */
export const rotateSplitWindowForward = async() => {
    const {rotateForward} = await import("./pagelayout.js")
    rotateForward()
}

/** Rotate the current window split backward. */
export const rotateSplitWindowBackward = async() => {
    const {rotateReverse} = await import("./pagelayout.js")
    rotateReverse()
}

/** Make the current window split the entire left side. */
export const leftHalfSplitWindow = async() => {
    const {toTop} = await import("./pagelayout.js")
    toTop("left")
}

/** Make the current window split the entire bottom half. */
export const bottomHalfSplitWindow = async() => {
    const {toTop} = await import("./pagelayout.js")
    toTop("bottom")
}

/** Make the current window split the entire top half. */
export const topHalfSplitWindow = async() => {
    const {toTop} = await import("./pagelayout.js")
    toTop("top")
}

/** Make the current window split the entire right side. */
export const rightHalfSplitWindow = async() => {
    const {toTop} = await import("./pagelayout.js")
    toTop("right")
}

/** Move the focus to the split to the left of the current one. */
export const toLeftSplitWindow = async() => {
    const {moveFocus} = await import("./pagelayout.js")
    moveFocus("left")
}

/** Move the focus to the split to the bottom of the current one. */
export const toBottomSplitWindow = async() => {
    const {moveFocus} = await import("./pagelayout.js")
    moveFocus("bottom")
}

/** Move the focus to the split to the top of the current one. */
export const toTopSplitWindow = async() => {
    const {moveFocus} = await import("./pagelayout.js")
    moveFocus("top")
}

/** Move the focus to the split to the right of the current one. */
export const toRightSplitWindow = async() => {
    const {moveFocus} = await import("./pagelayout.js")
    moveFocus("right")
}

/** Move the focus back to the previously focused window split. */
export const toLastSplitWindow = async() => {
    const {lastSplit} = await import("./pagelayout.js")
    lastSplit()
}

/** Move the focus to the very first split by appearance. */
export const toFirstSplitWindow = async() => {
    const {firstSplit} = await import("./pagelayout.js")
    firstSplit()
}

/** Move the focus to the next split by appearance. */
export const toNextSplitWindow = async() => {
    const {nextSplit} = await import("./pagelayout.js")
    nextSplit()
}

/** Move the focus to the previous split by appearance. */
export const toPreviousSplitWindow = async() => {
    const {previousSplit} = await import("./pagelayout.js")
    previousSplit()
}

/** Swap the location of the current split and others in the same level. */
export const exchangeSplitWindow = async() => {
    const {exchange} = await import("./pagelayout.js")
    exchange()
}

/** Increase the height of the current window split within the same level. */
export const increaseHeightSplitWindow = async() => {
    const {resize} = await import("./pagelayout.js")
    resize("ver", "grow")
}

/** Decrease the height of the current window split within the same level. */
export const decreaseHeightSplitWindow = async() => {
    const {resize} = await import("./pagelayout.js")
    resize("ver", "shrink")
}

/** Increase the width of the current window split within the same level. */
export const increaseWidthSplitWindow = async() => {
    const {resize} = await import("./pagelayout.js")
    resize("hor", "grow")
}

/** Decrease the width of the current window split within the same level. */
export const decreaseWidthSplitWindow = async() => {
    const {resize} = await import("./pagelayout.js")
    resize("hor", "shrink")
}

/** Distribute the space each window split take equally within each level. */
export const distrubuteSpaceSplitWindow = async() => {
    const {resetResizing} = await import("./pagelayout.js")
    resetResizing()
}

/** Toggle the always on top functionality of the app. */
export const toggleAlwaysOnTop = () => ipcRenderer
    .invoke("toggle-always-on-top")

/** Toggle the fullscreen functionality of the app, then update the GUI. */
export const toggleFullscreen = () => {
    ipcRenderer.invoke("toggle-fullscreen").then(updateGuiVisibility)
}

/**
 * Get a url with the right chars escaped, either a custom or current url.
 * @param {string} customUrl
 */
export const getPageUrl = async(customUrl = "") => {
    let url = customUrl || currentPage()?.src || ""
    if (await getSetting("encodeurlcopy") === "spacesonly") {
        url = url.replace(/ /g, "%20")
    } else if (await getSetting("encodeurlcopy") === "nospaces") {
        url = urlToString(url).replace(/ /g, "%20")
    } else if (await getSetting("encodeurlcopy") === "decode") {
        url = urlToString(url)
    } else if (await getSetting("encodeurlcopy") === "encode") {
        url = await stringToUrl(url)
    }
    return url
}

/** Get the list of RSS links on the page.
 * @param {ActionParam} args
 * @returns {Promise<string[]|null>}
 */
const getPageRSSLinks = async args => {
    /** @type {string[]} */
    const rawFeedUrls = await currentPage()?.executeJavaScript(
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
    if (rawFeedUrls.length === 0) {
        notify({
            "id": "actions.rss.notFound", "src": args.src, "type": "warning"
        })
        return null
    }
    const feedUrls = []
    for (const url of rawFeedUrls.filter(u => u).slice(0, 10)) {
        if (!isUrl(url)) {
            feedUrls.push(await getPageUrl(`${new URL(
                await getPageUrl()).origin}${url}`))
        }
        feedUrls.push(await getPageUrl(url))
    }
    return feedUrls
}

/**
 * Notify with the list of RSS links on the current page.
 * @param {ActionParam} args
 */
export const pageRSSLinksList = async args => {
    const feedUrls = await getPageRSSLinks(args)
    if (!feedUrls) {
        return
    }
    const feedsString = feedUrls.map((url, i) => `${i} - ${url}`).join("\n")
    notify({
        "fields": [feedsString],
        "id": "actions.rss.header",
        "src": args.src,
        "type": "warning"
    })
}

/** Copy an RSS link to the clipboard by index.
 * @param {ActionParam} args
 */
export const pageRSSLinkToClipboard = async args => {
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
    notify({
        "fields": [feedUrl],
        "id": "actions.rss.clipboard",
        "src": args.src,
        "type": "success"
    })
}

/** Copy the current page url to the system clipboard. */
export const pageToClipboard = async() => clipboard
    .writeText(await getPageUrl())

/** Copy the current page title to the system clipboard. */
export const pageTitleToClipboard = async() => {
    const {getPageTitle} = await import("./command.js")
    clipboard.writeText(getPageTitle())
}

/** Copy the current page to the system clipboard formatted as HTML. */
export const pageToClipboardHTML = () => {
    const url = getPageUrl()
    const title = currentTab()?.querySelector("span")?.textContent
    clipboard.writeText(`<a href="${url}">${title}</a>`)
}

/** Copy the current page to the system clipboard formatted as Markdown. */
export const pageToClipboardMarkdown = () => {
    const url = getPageUrl()
    const title = currentTab()?.querySelector("span")?.textContent
    clipboard.writeText(`[${title}](${url})`)
}

/** Copy the current page to the system clipboard formatted as RST. */
export const pageToClipboardRST = () => {
    const url = getPageUrl()
    const title = currentTab()?.querySelector("span")?.textContent
    clipboard.writeText(`\`${title} <${url}>\`_`)
}

/** Copy the current page to the system clipboard formatted as Emacs. */
export const pageToClipboardEmacs = () => {
    const url = getPageUrl()
    const title = currentTab()?.querySelector("span")?.textContent
    clipboard.writeText(`[[${url}][${title}]]`)
}

/**
 * Open the link currently in the system clipboard in the current tab.
 * @param {ActionParam} args
 */
export const openFromClipboard = async args => {
    if (clipboard.readText().trim()) {
        const {navigateTo} = await import("./tabs.js")
        navigateTo(args.src, await stringToUrl(clipboard.readText()))
    }
}

/**
 * Store a scroll position based on key.
 * @param {ActionParam&{path?: string, pixels?: number}} args
 */
export const storeScrollPos = async args => {
    const {key} = args
    if (!key) {
        return
    }
    let scrollType = await getSetting("scrollpostype")
    if (scrollType !== "local" && scrollType !== "global") {
        scrollType = "global"
        if (key !== key.toUpperCase()) {
            scrollType = "local"
        }
    }
    const qm = readJSON(joinPath(await appData(), "quickmarks")) ?? {}
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
        const scrollPosId = await getSetting("scrollposlocalid")
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
    writeJSON(joinPath(await appData(), "quickmarks"), qm)
}

/**
 * Restore a stored scroll position based on key.
 * @param {ActionParam&{path?: string}} args
 */
export const restoreScrollPos = async args => {
    const {key} = args
    if (!key) {
        return
    }
    const scrollPosId = await getSetting("scrollposlocalid")
    let path = ""
    if (scrollPosId === "domain") {
        path = domainName(urlToString(currentPage()?.src ?? ""))
            || domainName(currentPage()?.src ?? "") || ""
    }
    if (scrollPosId === "url" || !path) {
        path = urlToString(currentPage()?.src ?? "") || currentPage()?.src || ""
    }
    path = args.path ?? path
    const qm = readJSON(joinPath(await appData(), "quickmarks"))
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
export const makeMark = async args => {
    const {key} = args
    if (!key) {
        return
    }
    const qm = readJSON(joinPath(await appData(), "quickmarks")) ?? {}
    if (!qm.marks) {
        qm.marks = {}
    }
    qm.marks[key] = urlToString(args.url ?? currentPage()?.src ?? "")
    writeJSON(joinPath(await appData(), "quickmarks"), qm)
}

/**
 * Restore a stored mark by key to a position.
 * @param {ActionParam&{position?: import("./tabs.js").tabPosition}} args
 */
export const restoreMark = async args => {
    const {key} = args
    if (!key) {
        return
    }
    const qm = readJSON(joinPath(await appData(), "quickmarks"))
    const {commonAction} = await import("./contextmenu.js")
    let position = await getSetting("markposition")
    const shiftedPosition = await getSetting("markpositionshifted")
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
export const runRecording = async args => {
    const {key} = args
    if (!key) {
        return
    }
    const recording = readJSON(joinPath(await appData(), "recordings"))?.[key]
    if (recording) {
        setTimeout(async() => {
            const {
                executeMapString, sanitiseMapString
            } = await import("./input.js")
            executeMapString(sanitiseMapString(args.src, recording, true),
                true, {"initial": true, "src": args.src})
        }, 5)
    }
}

/** Start a macro recording by key.
 * @param {ActionParam} args
 */
export const startRecording = async args => {
    const {key} = args
    if (!key) {
        return
    }
    const {"startRecording": start} = await import("./input.js")
    start(key, args.src)
}

/** Stop the current macro recording if active. */
export const stopRecording = async() => {
    const {"stopRecording": stop} = await import("./input.js")
    const record = stop()
    if (!record) {
        return
    }
    const recordings = readJSON(joinPath(await appData(), "recordings")) ?? {}
    recordings[record.name] = record.string
    writeJSON(joinPath(await appData(), "recordings"), recordings)
}

/** Change the z-index order of the follow mode elements by type. */
export const reorderFollowLinks = async() => {
    const {reorderDisplayedLinks} = await import("./follow.js")
    reorderDisplayedLinks()
}

/**
 * Open the menu, either for system elements or the current insert element.
 * @param {ActionParam} args
 */
export const menuOpen = async args => {
    const {viebMenu} = await import("./contextmenu.js")
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
            const {commandMenu} = await import("./contextmenu.js")
            commandMenu(args.src, {
                "command": selected.querySelector("span")?.textContent ?? "",
                "x": bounds.x,
                "y": bounds.y + bounds.height
            })
        } else if (currentMode() === "explore" && selected && bounds) {
            const {linkMenu} = await import("./contextmenu.js")
            linkMenu(args.src, {
                "link": selected.querySelector(".url")?.textContent ?? "",
                "x": bounds.x,
                "y": bounds.y + bounds.height
            })
        } else {
            const url = getUrl()
            bounds = url?.getBoundingClientRect()
            if (url && bounds) {
                const charWidth = await getSetting("guifontsize") * 0.60191
                viebMenu(args.src, {
                    "path": [url],
                    "x": bounds.x + charWidth
                        * (url.selectionStart ?? 0) - url.scrollLeft,
                    "y": bounds.y + bounds.height
                }, true)
            }
        }
    } else {
        const {openMenu} = await import("./pointer.js")
        openMenu(args)
    }
}

/** Go to the top entry in the context menu. */
export const menuTop = async() => {
    const {top} = await import("./contextmenu.js")
    top()
}

/** Go one section up in the context menu. */
export const menuSectionUp = async() => {
    const {sectionUp} = await import("./contextmenu.js")
    sectionUp()
}

/** Go one entry up in the context menu. */
export const menuUp = async() => {
    const {up} = await import("./contextmenu.js")
    up()
}

/** Go one entry down in the context menu. */
export const menuDown = async() => {
    const {down} = await import("./contextmenu.js")
    down()
}

/** Go one section down in the context menu. */
export const menuSectionDown = async() => {
    const {sectionDown} = await import("./contextmenu.js")
    sectionDown()
}

/** Go to the bottom entry in the context menu. */
export const menuBottom = async() => {
    const {bottom} = await import("./contextmenu.js")
    bottom()
}

/** Execute the currently selected entry of the context menu. */
export const menuSelect = async() => {
    const {select} = await import("./contextmenu.js")
    select()
}

/** Close the context menu without side effects. */
export const menuClose = async() => {
    const {clear} = await import("./contextmenu.js")
    clear()
}

/** Show the table of contents on the current page. */
export const showTOC = async() => {
    const {getCustomStyling} = await import("./settings.js")
    const fontsize = getSetting("guifontsize")
    sendToPageOrSubFrame("action", "showTOC", getCustomStyling(), fontsize)
}

/** Hide the table of contents. */
export const hideTOC = () => sendToPageOrSubFrame("action", "hideTOC")

/** Toggle the table of contents on the current page. */
export const toggleTOC = async() => {
    const {getCustomStyling} = await import("./settings.js")
    const fontsize = getSetting("guifontsize")
    sendToPageOrSubFrame("action", "toggleTOC", getCustomStyling(), fontsize)
}

/**
 * Use the navbar entered data to either navigate, search or run commands.
 * @param {ActionParam} args
 */
export const useEnteredData = async args => {
    const {setMode} = await import("./modes.js")
    const url = getUrl()
    if (!url) {
        return
    }
    if (currentMode() === "command") {
        const command = url.value.trim()
        setMode("normal")
        const {execute} = await import("./command.js")
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
            const modifiedLoc = (await searchword(location)).url
            const {push} = await import("./explorehistory.js")
            push(urlToString(modifiedLoc))
            const {navigateTo} = await import("./tabs.js")
            await navigateTo(args.src, await stringToUrl(modifiedLoc))
        }
    }
}

/** This action does nothing, but can be used as the action of a mapping. */
export const nop = () => {
    // Explicit No-op action: does nothing
}
