/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2025 Jelmer van Arnhem
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

const {ipcRenderer} = require("electron")
const {translate} = require("../translate")
const {
    joinPath,
    appData,
    appConfig,
    readFile,
    readJSON,
    writeJSON,
    isFile,
    isDir,
    listDir,
    specialPagePath,
    pathToSpecialPageName,
    urlToString,
    stringToUrl,
    hasProtocol,
    sameDomain,
    notify,
    listNotificationHistory,
    propPixels,
    userAgentTemplated,
    getSetting,
    deleteFile
} = require("../util")
const {
    listTabs,
    listPages,
    currentTab,
    currentPage,
    currentMode,
    guiRelatedUpdate,
    setTopOfPageWithMouse,
    getMouseConf,
    getUrl,
    tabForPage,
    pageForTab,
    listReadyPages,
    sendToPageOrSubFrame
} = require("./common")
const {setMode} = require("./modes")

/**
 * @typedef {(
 *   "open"|"newtab"|"copy"|"download"|"split"|"vsplit"|"external"|"search"
 * )} tabPosition
 *
/** @type {{container: string, muted: boolean, url: string, index: number}[]} */
let recentlyClosed = []
let linkId = 0
/** @type {{[id: string]: number}} */
const timeouts = {}
const tabFile = joinPath(appData(), "tabs")
const erwicMode = isFile(joinPath(appData(), "erwicmode"))
let justSearched = false
/** @type {{[id: number]: {[type: string]: string}}} */
const existingInjections = {}

/**
 * Update the url in the navbar to reflect the current status.
 * @param {HTMLDivElement} page
 * @param {boolean} force
 */
const updateUrl = (page, force = false) => {
    const url = currentPage()?.getAttribute("src") ?? null
    if (page !== currentPage() || url === null) {
        return
    }
    const {updateWindowTitle} = require("./settings")
    updateWindowTitle()
    if (!force && "secf".includes(currentMode()[0])) {
        return
    }
    let niceUrl = urlToString(url)
    if (niceUrl === "vieb://newtab") {
        niceUrl = ""
    }
    const urlInput = getUrl()
    if (urlInput) {
        urlInput.value = niceUrl
    }
}

/**
 * Reset the tab information for a given page.
 * @param {HTMLDivElement} page
 */
const resetTabInfo = page => {
    page.removeAttribute("failed-to-load")
    const {loading} = require("./favicons")
    loading(page, true)
}

/**
 * Pick a new useragent for the page if multiple are configured.
 * @param {HTMLDivElement} page
 */
const rerollUserAgent = page => {
    const agents = getSetting("useragent")
    if (agents.length) {
        const agent = userAgentTemplated(
            agents.at(Math.random() * agents.length) ?? "")
        page.setUserAgent(agent)
    } else {
        page.setUserAgent("")
    }
}

/**
 * Suspend a tab.
 * @param {import("./common").RunSource} src
 * @param {HTMLSpanElement} tab
 * @param {boolean} force
 */
const suspendTab = (src, tab, force = false) => {
    const page = pageForTab(tab)
    if (!page || page instanceof HTMLDivElement) {
        return
    }
    if (tab.classList.contains("visible-tab") && !force) {
        return
    }
    page.closeDevTools()
    tab.setAttribute("suspended", "suspended")
    tab.classList.remove("crashed")
    tab.removeAttribute("media-playing")
    const {show} = require("./favicons")
    show(page)
    // TODO
    const closedDevtoolsId = tab.getAttribute("devtools-id")
    listTabs().forEach(t => {
        if (closedDevtoolsId === t.getAttribute("link-id")) {
            /* eslint-disable-next-line no-use-before-define */
            closeTab(src, listTabs().indexOf(t))
        }
    })
}

/**
 * Recreate a webview to in case of new container name or crash reload.
 * @param {import("./common").RunSource} src
 * @param {HTMLDivElement} page
 * @param {string|null} customSrc
 */
const recreateWebview = (src, page, customSrc = null) => {
    const tab = tabForPage(page)
    if (tab) {
        suspendTab(src, tab, true)
        const suspendedPage = pageForTab(tab)
        if (suspendedPage) {
            if (customSrc) {
                suspendedPage.setAttribute("src", customSrc)
            }
            /* eslint-disable-next-line no-use-before-define */
            unsuspendPage(suspendedPage)
        }
    }
}

/**
 * Check if the contanernames setting is still respected, if not recreate.
 * @param {import("./common").RunSource} src
 * @param {HTMLDivElement} page
 * @param {string} location
 */
const checkContainerNames = (src, page, location) => {
    const loc = location.replace(/view-?source:\/?\/?/g, "sourceviewer://")
    const sessionName = getSetting("containernames").find(
        c => loc.match(c.split("~")[0]) && c.split("~")[2] !== "newtab")
        ?.split("~")[1]
    if (sessionName && sessionName !== page.getAttribute("container")) {
        page.setAttribute("container", sessionName)
        recreateWebview(src, page, loc)
        return true
    }
    return false
}

/**
 * Navigate the page to a new location, optionally a custom page.
 * @param {import("./common").RunSource} src
 * @param {string} location
 * @param {HTMLDivElement|null} customPage
 */
const navigateTo = (src, location, customPage = null) => {
    try {
        new URL(location)
    } catch {
        return
    }
    const page = customPage || currentPage()
    if (!page || !location || page.getAttribute("src")?.startsWith("devtools://")) {
        return
    }
    if (!page.getAttribute("webcontents-id")) {
        setTimeout(() => navigateTo(src, location, page), 1)
        return
    }
    const loc = location.replace(/view-?source:\/?\/?/g, "sourceviewer://")
    if (page.getAttribute("crashed")) {
        recreateWebview(src, page, loc)
        return
    }
    ipcRenderer.send("page-action", page.getAttribute("webcontents-id"), "stop")
    const wasRecreated = checkContainerNames(src, page, loc)
    if (wasRecreated) {
        return
    }
    // TODO
    // rerollUserAgent(page)
    ipcRenderer.send("page-action",
        page.getAttribute("webcontents-id"), "load", loc)
    resetTabInfo(page)
    const tabTitleEl = currentTab()?.querySelector("span")
    if (tabTitleEl) {
        tabTitleEl.textContent = urlToString(loc)
    }
}

/** Save the current and closed tabs to disk if configured to do so. */
const saveTabs = () => {
    /** @type {{
     *   closed: {
     *     container: string, muted: boolean, url: string, index?: number
     *   }[]
     *   pinned: {container: string, muted: boolean, url: string}[]
     *   tabs: {container: string, muted: boolean, url: string}[]
     *   id: number
     * }} */
    const data = {"closed": [], "id": 0, "pinned": [], "tabs": []}
    const restoreTabs = getSetting("restoretabs")
    const keepRecentlyClosed = getSetting("keeprecentlyclosed")
    if (keepRecentlyClosed) {
        data.closed = JSON.parse(JSON.stringify(recentlyClosed))
    }
    const activeTab = currentTab()
    if (restoreTabs !== "none" && activeTab) {
        data.id = listTabs().indexOf(activeTab)
    }
    listTabs().forEach((tab, index) => {
        const url = pageForTab(tab)?.getAttribute("src")
        if (!url || url.startsWith("devtools://")) {
            if (index <= data.id) {
                data.id -= 1
            }
            return
        }
        const container = pageForTab(tab)?.getAttribute("container") ?? ""
        const isPinned = tab.classList.contains("pinned")
        if (isPinned && ["all", "pinned"].includes(restoreTabs)) {
            data.pinned.push({
                container,
                "muted": !!tab.getAttribute("muted"),
                "url": urlToString(url)
            })
        } else if (!isPinned && ["all", "regular"].includes(restoreTabs)) {
            data.tabs.push({
                container,
                "muted": !!tab.getAttribute("muted"),
                "url": urlToString(url)
            })
        } else if (keepRecentlyClosed) {
            data.closed.push({
                container,
                "muted": !!tab.getAttribute("muted"),
                "url": urlToString(url)
            })
            if (index <= data.id) {
                data.id -= 1
            }
        }
    })
    if (!data.closed.length && !data.pinned.length && !data.tabs.length) {
        deleteFile(tabFile)
    }
    // Only keep the 100 most recently closed tabs,
    // more is probably never needed but would keep increasing the file size.
    data.closed = data.closed.slice(-100)
    const success = writeJSON(tabFile, data)
    if (!success) {
        notify({
            "fields": [tabFile],
            "id": "settings.files.failed",
            "src": "other"
        })
    }
}

/**
 * Switch to a different tab by element or index.
 * @param {HTMLSpanElement|number} tabOrIndex
 */
const switchToTab = tabOrIndex => {
    if (document.body.classList.contains("fullscreen")) {
        currentPage()?.send("action", "exitFullscreen")
    }
    const tabs = listTabs()
    let tab = tabOrIndex
    if (typeof tabOrIndex === "number") {
        let index = tabOrIndex
        while (index < 0) {
            if (getSetting("tabcycle")) {
                index = tabs.length + index
            } else {
                index = 0
            }
        }
        while (tabs.length <= index) {
            if (getSetting("tabcycle")) {
                index -= tabs.length
            } else {
                index = tabs.length - 1
            }
        }
        tab = tabs[index]
    }
    if (!(tab instanceof HTMLSpanElement)) {
        return
    }
    const oldPage = currentPage()
    tabs.forEach(t => {
        t.id = ""
    })
    listPages().forEach(p => {
        p.id = ""
    })
    tab.id = "current-tab"
    /** @type {HTMLDivElement|null|undefined} */
    let newCurrentPage = pageForTab(tab)
    if (newCurrentPage) {
        newCurrentPage.id = "current-page"
    }
    tab.scrollIntoView({"block": "center", "inline": "center"})
    const {switchView, setLastUsedTab} = require("./pagelayout")
    if (newCurrentPage) {
        switchView(oldPage, newCurrentPage)
    }
    saveTabs()
    setMode("normal")
    if (newCurrentPage) {
        /* eslint-disable-next-line no-use-before-define */
        unsuspendPage(newCurrentPage)
    }
    newCurrentPage = currentPage()
    if (newCurrentPage && !(newCurrentPage instanceof HTMLDivElement)) {
        updateUrl(newCurrentPage)
    }
    const hoverEl = document.getElementById("url-hover")
    if (hoverEl) {
        hoverEl.textContent = ""
        hoverEl.style.display = "none"
    }
    guiRelatedUpdate("tabbar")
    const {updateContainerSettings} = require("./settings")
    updateContainerSettings(false)
    setLastUsedTab(oldPage?.getAttribute("link-id") ?? null)
    const loadingProgress = document.getElementById("loading-progress")
    if (loadingProgress) {
        if (["line", "all"].includes(getSetting("loadingindicator"))) {
            try {
                if (newCurrentPage?.isLoading()) {
                    loadingProgress.style.display = "flex"
                } else {
                    loadingProgress.style.display = "none"
                }
            } catch {
                loadingProgress.style.display = "none"
            }
        } else {
            loadingProgress.style.display = "none"
        }
    }
}

/**
 * Close a tab by index, optionally force close pinned ones.
 * @param {import("./common").RunSource} src
 * @param {number|null} index
 * @param {boolean} force
 */
const closeTab = (src, index = null, force = false) => {
    let tab = currentTab()
    if (index !== null) {
        tab = listTabs()[index]
    }
    const isClosingCurrent = tab === currentTab()
    const page = pageForTab(tab)
    if (!tab || !page) {
        return
    }
    if (!getSetting("closablepinnedtabs") && !force) {
        if (tab.classList.contains("pinned")) {
            return
        }
    }
    const tabLinkId = tab.getAttribute("link-id")
    const url = urlToString(page.getAttribute("src") || "")
    const oldTabIdx = listTabs().indexOf(tab)
    if (getSetting("keeprecentlyclosed") && url) {
        recentlyClosed.push({
            "container": page.getAttribute("container") ?? "",
            "index": oldTabIdx,
            "muted": tab.getAttribute("muted") === "muted",
            url
        })
    }
    const regularTab = listTabs().find(
        t => t.getAttribute("devtools-id") === tabLinkId)
    if (regularTab) {
        regularTab.removeAttribute("devtools-id")
    }
    const closedDevtoolsId = tab.getAttribute("devtools-id")
    const {layoutDivById, hide} = require("./pagelayout")
    const isVisible = layoutDivById(tabLinkId)
    const multiLayout = document.getElementById("pages")
        ?.classList.contains("multiple")
    if (isVisible && multiLayout) {
        hide(page, true)
    } else {
        tab.remove()
        try {
            if (!(page instanceof HTMLDivElement)) {
                page.closeDevTools()
            }
        } catch {
            // Webview already destroyed by the page,
            // most often happens when a page closes itself.
        }
        page.remove()
        if (listTabs().length === 0) {
            if (getSetting("quitonlasttabclose")) {
                const {execute} = require("./command")
                execute("quitall")
                return
            }
            if (getSetting("containernewtab").startsWith("s:")) {
                /* eslint-disable-next-line no-use-before-define */
                addTab({"container": "main", src})
            } else {
                /* eslint-disable-next-line no-use-before-define */
                addTab({src})
            }
        }
        if (isClosingCurrent) {
            if (getSetting("tabclosefocus") === "right") {
                if (oldTabIdx >= listTabs().length) {
                    switchToTab(listTabs().length - 1)
                } else {
                    switchToTab(oldTabIdx)
                }
            } else if (getSetting("tabclosefocus") === "previous") {
                const {getLastTabIds} = require("./pagelayout")
                const tabs = listTabs()
                const lastTab = getLastTabIds().map(id => {
                    const tb = tabs.find(t => t.getAttribute("link-id") === id)
                    if (tb?.getAttribute("link-id") === tabLinkId) {
                        return null
                    }
                    return tb
                }).find(t => t) ?? tabs[0]
                switchToTab(Math.max(tabs.indexOf(lastTab), 0))
            } else if (oldTabIdx === 0) {
                switchToTab(0)
            } else {
                switchToTab(oldTabIdx - 1)
            }
        }
    }
    listTabs().forEach(t => {
        if (closedDevtoolsId === t.getAttribute("link-id")) {
            closeTab(src, listTabs().indexOf(t))
        }
    })
}

/**
 * Inject custom styling into the page in a CSP compatible way.
 * @param {HTMLDivElement} page
 * @param {string} type
 * @param {string|null} css
 */
const injectCustomStyleRequest = async(page, type, css = null) => {
    const id = page.getWebContentsId()
    if (!existingInjections[id]) {
        existingInjections[id] = {}
    }
    if (existingInjections[id][type]) {
        page.removeInsertedCSS(existingInjections[id][type])
        delete existingInjections[id][type]
    }
    if (css) {
        existingInjections[id][type] = await page.insertCSS(css)
    }
}

/**
 * Add all css styles (including the default if needed) to the provided webview.
 * @param {HTMLDivElement} page
 * @param {boolean} force
 */
const addColorschemeStylingToWebview = (page, force = false) => {
    const src = page.getAttribute("src") ?? ""
    const isSpecialPage = pathToSpecialPageName(src)?.name
    const isLocal = src.startsWith("file:/")
    const isErrorPage = page.getAttribute("failed-to-load")
    const isCustomView = src.startsWith("sourceviewer:")
        || src.startsWith("readerview:") || src.startsWith("markdownviewer:")
    const {getCustomStyling} = require("./settings")
    const customStyling = getCustomStyling()
    const fontsize = getSetting("guifontsize")
    page.send("action", "rerenderTOC", customStyling, fontsize)
    if (!isSpecialPage && !isLocal && !isErrorPage && !isCustomView) {
        // This check is also present in preload/styling.js,
        // but on pages where JS is disabled (chrome built-in) that won't load.
        page.executeJavaScript("document?.head?.innerText").then(() => {
            page.send("reload-basic-theme-styling")
        }).catch(() => {
            ipcRenderer.invoke("run-isolated-js-head-check",
                page.getWebContentsId()).then(result => {
                if (result === "") {
                    const bg = getComputedStyle(document.body)
                        .getPropertyValue("--bg")
                    const fg = getComputedStyle(document.body)
                        .getPropertyValue("--fg")
                    const linkcolor = getComputedStyle(document.body)
                        .getPropertyValue("--link-color")
                    const style = `html {
                        color: ${fg || "#eee"};
                        background: ${bg || "#333"};
                        font-size: ${fontsize}px;
                    } a {color: ${linkcolor || "#0cf"};}`
                    injectCustomStyleRequest(page, "theme", style)
                }
            }).catch(() => null)
        })
        if (!force) {
            return
        }
    }
    page.send("add-colorscheme-styling", getSetting("guifontsize"),
        customStyling)
}

/**
 * Add all permanent listeners to the new webview.
 * @param {HTMLDivElement} page
 */
const addWebviewListeners = page => {
    page.addEventListener("load-commit", e => {
        if (e.isMainFrame) {
            rerollUserAgent(page)
            resetTabInfo(page)
            const name = tabForPage(page)?.querySelector("span")
            if (name && !name?.textContent) {
                name.textContent = urlToString(e.url)
            }
            const timeout = getSetting("requesttimeout")
            const id = page.getAttribute("link-id")
            if (!id) {
                return
            }
            window.clearTimeout(timeouts[id])
            if (timeout) {
                timeouts[id] = window.setTimeout(() => {
                    try {
                        page.stop()
                    } catch {
                        // Webview might be destroyed or unavailable, no issue
                    }
                }, timeout)
            }
        }
    })
    page.addEventListener("render-process-gone", e => {
        if (e.details.reason === "clean-exit") {
            return
        }
        if (getSetting("reloadtaboncrash")) {
            recreateWebview("other", page)
        } else {
            tabForPage(page)?.classList.add("crashed")
            if (currentPage()?.isCrashed() && page === currentPage()) {
                if ("fipv".includes(currentMode()[0])) {
                    setMode("normal")
                }
            }
        }
    })
    page.addEventListener("close", () => {
        if (getSetting("permissionclosepage") === "allow") {
            const tab = tabForPage(page)
            if (tab) {
                closeTab("other", listTabs().indexOf(tab))
            }
        }
    })
    page.addEventListener("media-started-playing", () => {
        const tab = tabForPage(page)
        const counter = Number(tab?.getAttribute("media-playing")) || 0
        tab?.setAttribute("media-playing", `${counter + 1}`)
    })
    page.addEventListener("media-paused", () => {
        const tab = tabForPage(page)
        let counter = Number(tab?.getAttribute("media-playing")) || 0
        counter -= 1
        if (counter < 1) {
            tab?.removeAttribute("media-playing")
        } else {
            tab?.setAttribute("media-playing", `${counter}`)
        }
    })
    page.addEventListener("did-start-navigation", e => {
        checkContainerNames("other", page, e.url)
    })
    page.addEventListener("did-start-loading", () => {
        const {loading} = require("./favicons")
        loading(page)
        updateUrl(page)
    })
    page.addEventListener("did-fail-load", e => {
        if (e.errorDescription === "" || !e.isMainFrame) {
            // Request was aborted before another error could occur,
            // or some request made by the page failed (which can be ignored).
            return
        }
        // It will go to the http website, when no https is present,
        // but only when the redirecttohttp setting is active.
        const isSSLError = (e.errorDescription.includes("_SSL_")
            || e.errorDescription.includes("_CERT_"))
            && page.src.startsWith("https://")
        if (isSSLError && getSetting("redirecttohttp")) {
            page.loadURL(page.src.replace(/^https?:\/\//g, "http://"))
                .catch(() => null)
            return
        }
        if (page.src !== e.validatedURL) {
            page.setAttribute("src", e.validatedURL)
            const tabTitleEl = tabForPage(page)?.querySelector("span")
            if (tabTitleEl) {
                tabTitleEl.textContent = urlToString(e.validatedURL)
            }
            return
        }
        if (e.validatedURL.startsWith("chrome://")) {
            const page = e.validatedURL.replace(
                "chrome://", "").replace(/\/$/, "")
            page.loadURL(specialPagePath(page)).catch(() => null)
            return
        }
        addColorschemeStylingToWebview(page, true)
        // If the path is a directory, show a list of files instead of an error
        if (e.errorDescription === "ERR_FILE_NOT_FOUND") {
            // Any number of slashes after file is fine
            if (page.src.startsWith("file:/")) {
                let local = urlToString(page.src).replace(/file:\/+/, "/")
                if (process.platform === "win32") {
                    local = urlToString(page.src).replace(/file:\/+/, "")
                    if (local === "" || local === "C:") {
                        page.src = "file:///C:/"
                        return
                    }
                }
                if (isDir(local)) {
                    let directoryAllowed = true
                    let paths = listDir(local, true)
                    if (!paths) {
                        directoryAllowed = false
                        paths = []
                    }
                    const dirs = paths.filter(p => isDir(p))
                    const files = paths.filter(p => isFile(p))
                    page.send("insert-current-directory-files",
                        dirs, files, directoryAllowed, local)
                    return
                }
            }
        }
        page.send("insert-failed-page-info", JSON.stringify(e), isSSLError)
        page.setAttribute("failed-to-load", "true")
    })
    page.addEventListener("did-stop-loading", () => {
        const {show} = require("./favicons")
        show(page)
        updateUrl(page)
        window.clearTimeout(timeouts[page.getAttribute("link-id") ?? ""])
        const specialPageName = pathToSpecialPageName(page.src)?.name
        const isLocal = page.src.startsWith("file:/")
        const isCustomView = page.src.startsWith("sourceviewer:")
            || page.src.startsWith("readerview:")
            || page.src.startsWith("markdownviewer:")
        addColorschemeStylingToWebview(page)
        if (specialPageName === "help") {
            const {
                listMappingsAsCommandList, uncountableActions
            } = require("./input")
            const {settingsWithDefaults} = require("./settings")
            const {rangeCompatibleCommands} = require("./command")
            page.send("settings", settingsWithDefaults(),
                listMappingsAsCommandList("other", null, true),
                uncountableActions,
                rangeCompatibleCommands)
        }
        if (specialPageName === "notifications") {
            page.send("notification-history", listNotificationHistory())
        }
        const tocPages = getSetting("tocpages")
        const readableUrl = urlToString(page.src)
        if (tocPages.some(t => readableUrl.match(t) || page.src.match(t))) {
            const {getCustomStyling} = require("./settings")
            const fontsize = getSetting("guifontsize")
            setTimeout(() => {
                sendToPageOrSubFrame("action", "showTOC",
                    getCustomStyling(), fontsize)
            }, 50)
        }
        saveTabs()
        const name = tabForPage(page)?.querySelector("span")
        if (specialPageName && name) {
            name.textContent = translate(`pages.${specialPageName}.title`)
        }
        const {addToHist, titleForPage, updateTitle} = require("./history")
        addToHist(page.src)
        const existing = titleForPage(page.src)
        if (name) {
            if (isLocal && !existing) {
                name.textContent = readableUrl
            } else if (hasProtocol(name.textContent ?? "") && !isCustomView) {
                name.textContent = existing
            } else if (name.textContent) {
                updateTitle(page.src, name.textContent)
            }
        }
        if (erwicMode) {
            const preload = page.getAttribute("user-script-file")
            if (preload) {
                const javascript = readFile(preload)
                if (javascript) {
                    page.executeJavaScript(javascript, true)
                }
            }
        }
        if (getSetting("userscript")) {
            const {loadUserscripts} = require("./extensions")
            loadUserscripts(page)
        }
    })
    page.addEventListener("page-title-updated", e => {
        const isCustomView = page.src.startsWith("sourceviewer:")
            || page.src.startsWith("readerview:")
            || page.src.startsWith("markdownviewer:")
        if (hasProtocol(e.title) && !isCustomView) {
            return
        }
        const tabTitleEl = tabForPage(page)?.querySelector("span")
        if (tabTitleEl) {
            tabTitleEl.textContent = e.title
            updateUrl(page)
            const {updateTitle} = require("./history")
            updateTitle(page.src, tabTitleEl.textContent)
        }
    })
    page.addEventListener("page-favicon-updated", e => {
        const {update} = require("./favicons")
        const urls = e.favicons.filter(u => u && u !== page.src)
        const url = urls.find(u => u.startsWith("data:"))
            ?? urls.find(u => u.endsWith(".svg"))
            ?? urls[0]
        if (url) {
            update(page, url)
        }
        updateUrl(page)
    })
    page.addEventListener("will-navigate", e => {
        const wasRecreated = checkContainerNames("other", page, e.url)
        if (wasRecreated) {
            return
        }
        resetTabInfo(page)
        const tabTitleEl = tabForPage(page)?.querySelector("span")
        if (tabTitleEl) {
            tabTitleEl.textContent = urlToString(e.url)
        }
    })
    page.addEventListener("enter-html-full-screen", () => {
        if (currentPage() !== page) {
            const tab = tabForPage(page)
            if (tab) {
                switchToTab(tab)
            }
        }
        document.body.classList.add("fullscreen")
        page.blur()
        page.focus()
        page.send("action", "focusTopLeftCorner")
        setMode("insert")
    })
    page.addEventListener("leave-html-full-screen", () => {
        document.body.classList.remove("fullscreen")
        setMode("normal")
        const {applyLayout} = require("./pagelayout")
        applyLayout()
    })
    page.addEventListener("ipc-message", e => {
        const {resetScrollbarTimer} = require("./pagelayout")
        if (e.channel === "notify") {
            notify(e.args[0])
        }
        if (e.channel === "url") {
            /* eslint-disable-next-line no-use-before-define */
            addTab({"src": "other", "url": e.args[0]})
        }
        if (e.channel === "download") {
            currentPage()?.downloadURL(e.args[0])
        }
        if (e.channel === "external") {
            const {commonAction} = require("./contextmenu")
            commonAction("other", "link", "external", {"link": e.args[0]})
        }
        if (e.channel === "back-button") {
            const {backInHistory} = require("./actions")
            backInHistory({"src": "user"})
        }
        if (e.channel === "forward-button") {
            const {forwardInHistory} = require("./actions")
            forwardInHistory({"src": "user"})
        }
        if (e.channel === "mouse-up") {
            const {resetScreenshotDrag} = require("./input")
            resetScreenshotDrag()
            const {setFocusCorrectly} = require("./actions")
            setFocusCorrectly()
        }
        if (e.channel === "scroll-height-diff") {
            const {clear} = require("./contextmenu")
            clear()
            if (justSearched) {
                justSearched = false
            } else if (e.args[0]) {
                const {handleScrollDiffEvent} = require("./pointer")
                handleScrollDiffEvent(e.args[0])
            }
            if (e.args[0]) {
                resetScrollbarTimer("scroll")
            }
        }
        if (e.channel === "history-list-request") {
            const {handleRequest} = require("./history")
            handleRequest(page, ...e.args)
        }
        if (e.channel === "switch-to-insert") {
            setMode("insert")
        }
        if (e.channel === "navigate-to") {
            navigateTo("user", e.args[0], page)
        }
        if (e.channel === "new-tab-info-request") {
            const special = pathToSpecialPageName(page.src)
            if (special?.name !== "newtab") {
                return
            }
            const {forSite} = require("./favicons")
            const {suggestTopSites, titleForPage} = require("./history")
            const favoritePages = getSetting("favoritepages").map(u => {
                let url = u
                if (!hasProtocol(url)) {
                    url = `https://${url}`
                }
                return {
                    "icon": forSite(url) || forSite(`${url}/`),
                    "name": titleForPage(url) || titleForPage(`${url}/`),
                    "url": urlToString(url)
                }
            })
            const topPages = suggestTopSites()
            if (getSetting("suggesttopsites") && topPages.length) {
                page.send("insert-new-tab-info", topPages, favoritePages)
            } else if (favoritePages.length > 0) {
                page.send("insert-new-tab-info", false, favoritePages)
            }
        }
        if (e.channel === "mousemove") {
            setTopOfPageWithMouse(getMouseConf("guiontop") && !e.args[1])
            if (getSetting("mousefocus")) {
                const tab = tabForPage(page)
                if (tab && currentTab() !== tab) {
                    switchToTab(tab)
                }
            }
            const pageTop = propPixels(page.style, "top")
            const pageLeft = propPixels(page.style, "left")
            if (currentMode() === "follow") {
                const {emptyHoverLink} = require("./follow")
                emptyHoverLink()
            } else if (currentMode() === "command") {
                const {moveScreenshotFrame} = require("./input")
                moveScreenshotFrame(e.args[0] + pageLeft, e.args[1] + pageTop)
            }
            resetScrollbarTimer("move")
        }
        if (e.channel === "search-element-location") {
            if (currentMode() === "pointer") {
                const {move} = require("./pointer")
                move(e.args[0], e.args[1])
            }
        }
        if (e.channel === "custom-style-inject") {
            injectCustomStyleRequest(page, e.args[0], e.args[1])
        }
    })
    page.addEventListener("found-in-page", e => {
        page.send("search-element-location", e.result.selectionArea)
        justSearched = true
        setTimeout(() => {
            justSearched = false
        }, 500)
    })
    page.addEventListener("update-target-url", e => {
        const correctMode = ["insert", "pointer"].includes(currentMode())
        const hoverEl = document.getElementById("url-hover")
        if (!hoverEl) {
            return
        }
        if (e.url && (correctMode || getMouseConf("pageoutsideinsert"))) {
            hoverEl.textContent = urlToString(e.url)
            hoverEl.style.display = "block"
        } else {
            hoverEl.textContent = ""
            hoverEl.style.display = "none"
        }
    })
    /** Focus the webview on blur when inside insert mode. */
    page.onblur = () => {
        if (currentMode() === "insert") {
            page.focus()
        }
    }
}

/**
 * Unsuspend a tab.
 * @param {HTMLDivElement} page
 */
const unsuspendPage = page => {
    const tab = tabForPage(page)
    if (!tab?.getAttribute("suspended")) {
        return
    }
    tab.removeAttribute("suspended")
    const url = page.getAttribute("src") || ""
    const loc = url.replace(/view-?source:\/?\/?/g, "sourceviewer://")
    const sessionName = getSetting("containernames").find(
        c => loc.match(c.split("~")[0]) && c.split("~")[2] !== "newtab")
        ?.split("~")[1] ?? page.getAttribute("container")
    ipcRenderer.send("create-session", `persist:${sessionName}`,
        getSetting("adblocker"), getSetting("cache") !== "none")
    guiRelatedUpdate("tabbar")
    const {updateContainerSettings} = require("./settings")
    updateContainerSettings(false)
    const {setLastUsedTab} = require("./pagelayout")
    setLastUsedTab(page?.getAttribute("link-id") ?? null)
    const currentPageId = Number(page.getAttribute("devtools-for-id") || 0) || 0
    const isDevtoolsTab = !!currentPageId
    // TODO
    // if (!page.getAttribute("src")) {
    //     page.setAttribute("src", specialPagePath("newtab"))
    // }
    ipcRenderer.invoke("create-page", {sessionName, url})
        .then(id => page.setAttribute("webcontents-id", `${id}`))
    // Webview.addEventListener("dom-ready", () => {
    //     if (!webview.getAttribute("dom-ready")) {
    //         if (webview.getAttribute("custom-first-load")) {
    //             webview.clearHistory()
    //             webview.removeAttribute("custom-first-load")
    //             webview.setAttribute("dom-ready", "true")
    //             return
    //         }
    //         const name = tab.querySelector("span")
    //         if (tab.getAttribute("muted")) {
    //             webview.setAudioMuted(true)
    //         }
    //         addWebviewListeners(webview)
    //         const newtabUrl = getSetting("newtaburl")
    //         if (isDevtoolsTab) {
    //             ipcRenderer.send("add-devtools",
    //                 currentPageId, webview.getWebContentsId())
    //             if (name) {
    //                 name.textContent = "Devtools"
    //             }
    //         } else if (url || newtabUrl) {
    //             webview.setAttribute("custom-first-load", "true")
    //             webview.loadURL(url || stringToUrl(newtabUrl)).catch(() => null)
    //             resetTabInfo(webview)
    //             if (name) {
    //                 name.textContent = urlToString(url)
    //             }
    //             return
    //         }
    //         webview.clearHistory()
    //         webview.setAttribute("dom-ready", "true")
    //     }
    // })
}

/**
 * Add a new tab.
 * @param {{
 *   url?: string,
 *   customIndex?: number,
 *   switchTo?: boolean,
 *   pinned?: boolean,
 *   container?: string,
 *   session?: string,
 *   devtools?: boolean,
 *   lazy?: boolean,
 *   script?: string,
 *   muted?: boolean,
 *   startup?: boolean,
 *   src: import("./common").RunSource
 * }} opts
 */
const addTab = opts => {
    // Recognized options for opening a new tab are as follows:
    // url, customIndex, switchTo, pinned, session (override of container)
    // container (suggestion), devtools, lazy, script, muted, startup
    // Defaults for these options vary depending on app state and user settings
    if (opts.url) {
        try {
            new URL(opts.url)
        } catch {
            return
        }
    }
    if (opts.switchTo === undefined) {
        opts.switchTo = true
    }
    if (opts.url?.startsWith("devtools://")) {
        return
    }
    if (opts.url?.startsWith("about:blank") || opts.url === "") {
        return
    }
    linkId += 1
    /** @type {number|null} */
    let currentPageId = null
    /** @type {string|null} */
    let currentPageLinkId = null
    let devtoolsOpen = false
    try {
        devtoolsOpen = currentPage()?.isDevToolsOpened() ?? false
        currentPageId = currentPage()?.getWebContentsId() ?? null
        currentPageLinkId = currentPage()?.getAttribute("link-id") ?? null
    } catch {
        // Current page not ready, devtools won't be opened
    }
    let isDevtoolsTab = false
    if (opts.devtools && currentPageId && currentPageLinkId) {
        const oldTab = listTabs().find(
            t => t.getAttribute("link-id") === currentPageLinkId)
        if (oldTab?.getAttribute("devtools-id") || devtoolsOpen) {
            return
        }
        oldTab?.setAttribute("devtools-id", `${linkId}`)
        isDevtoolsTab = true
    }
    let sessionName = getSetting("containernewtab")
    if (opts.container) {
        sessionName = opts.container
    } else if (opts.startup) {
        sessionName = getSetting("containerstartuppage")
    }
    if (sessionName === "s:external" && opts.url && !opts.session) {
        const isSpecialPage = pathToSpecialPageName(opts.url)?.name
        if (isSpecialPage) {
            sessionName = "main"
        } else {
            if ((/^https?:\/\//).test(opts.url)) {
                if (getSetting("externalcommand").trim()) {
                    const {commonAction} = require("./contextmenu")
                    commonAction(
                        opts.src ?? "user",
                        "link", "external", {"link": opts.url})
                } else {
                    const {shell} = require("electron")
                    shell.openExternal(opts.url)
                }
            }
            return
        }
    }
    if (sessionName === "s:replacematching" && opts.url) {
        const match = listPages().find(p => sameDomain(
            p.getAttribute("src") ?? "", opts.url ?? ""))
        if (match) {
            const tab = tabForPage(match)
            if (tab) {
                switchToTab(tab)
            }
        }
    }
    if (sessionName.startsWith("s:replace") && !opts.session) {
        if (opts.url) {
            navigateTo(opts.src, opts.url)
        }
        return
    }
    if (sessionName === "s:usematching" && opts.url) {
        const match = listPages().find(p => sameDomain(
            p.getAttribute("src") ?? "", opts.url ?? ""))
        if (match) {
            sessionName = match.getAttribute("container") ?? sessionName
        }
    }
    if (sessionName.startsWith("s:")) {
        sessionName = currentPage()?.getAttribute("container") || "main"
    }
    if (opts.session) {
        sessionName = opts.session
    } else if (opts.url) {
        sessionName = getSetting("containernames").find(
            c => opts.url?.match(c.split("~")[0]))?.split("~")[1]
            || sessionName
    }
    sessionName = sessionName.replace("%n", `${linkId}`)
    const tabs = document.getElementById("tabs")
    const pages = document.getElementById("pages")
    const tab = document.createElement("span")
    const favicon = document.createElement("img")
    const statusIcon = document.createElement("img")
    const name = document.createElement("span")
    if (opts.pinned) {
        tab.classList.add("pinned")
    }
    tab.style.minWidth = `${getSetting("mintabwidth")}px`
    favicon.src = "img/empty.png"
    favicon.className = "favicon"
    statusIcon.src = "img/spinner.gif"
    statusIcon.className = "status"
    statusIcon.style.display = "none"
    name.textContent = "Newtab"
    tab.append(favicon)
    tab.append(statusIcon)
    tab.append(name)
    const activeTab = currentTab()
    const tabnewposition = getSetting("tabnewposition")
    if (opts.customIndex !== undefined && activeTab) {
        if (opts.customIndex >= listTabs().length) {
            tabs?.append(tab)
        } else {
            /** @type {Element|null} */
            let nextTab = listTabs()[opts.customIndex]
            if (!opts.pinned) {
                while (nextTab && nextTab.classList.contains("pinned")) {
                    nextTab = nextTab.nextElementSibling
                }
            }
            tabs?.insertBefore(tab, nextTab)
        }
    } else if (tabnewposition === "right" && activeTab) {
        let nextTab = activeTab.nextElementSibling
        if (!opts.pinned) {
            while (nextTab && nextTab.classList.contains("pinned")) {
                nextTab = nextTab.nextElementSibling
            }
        }
        tabs?.insertBefore(tab, nextTab ?? null)
    } else if (tabnewposition === "left" && activeTab) {
        /** @type {Element|null} */
        let nextTab = activeTab
        if (!opts.pinned) {
            while (nextTab && nextTab.classList.contains("pinned")) {
                nextTab = nextTab.nextElementSibling
            }
        }
        tabs?.insertBefore(tab, nextTab ?? null)
    } else if (tabnewposition === "start" && activeTab) {
        /** @type {Element|null} */
        let nextTab = tabs?.firstElementChild ?? null
        if (!opts.pinned) {
            while (nextTab && nextTab.classList.contains("pinned")) {
                nextTab = nextTab.nextElementSibling
            }
        }
        tabs?.insertBefore(tab, nextTab ?? null)
    } else {
        tabs?.append(tab)
    }
    tab.setAttribute("link-id", `${linkId}`)
    const color = getSetting("containercolors").find(
        c => sessionName.match(c.split("~")[0]))
    if (color) {
        [, tab.style.color] = color.split("~")
    }
    const page = document.createElement("div")
    if (opts.script) {
        page.setAttribute("user-script-file", opts.script)
    }
    page.classList.add("page")
    page.setAttribute("link-id", `${linkId}`)
    const url = stringToUrl(opts.url || "")
        .replace(/view-?source:\/?\/?/g, "sourceviewer://")
    if (opts.url) {
        page.setAttribute("src", url)
    }
    page.setAttribute("container", sessionName)
    if (isDevtoolsTab) {
        page.setAttribute("devtools-for-id", `${currentPageId}`)
    }
    let {muted} = opts
    if (opts.startup) {
        muted = getSetting("tabreopenmuted") === "always"
            || getSetting("tabreopenmuted") === "remember" && muted
    } else if (muted === undefined || muted === null) {
        muted = getSetting("tabopenmuted") === "always"
            || getSetting("tabopenmuted") === "background" && !opts.switchTo
    }
    if (muted) {
        tab.setAttribute("muted", "muted")
        page.setAttribute("muted", "muted")
    }
    pages?.append(page)
    const suspend = (opts.lazy ?? getSetting("suspendbackgroundtab"))
        && !opts.switchTo
    tab.setAttribute("suspended", "suspended")
    if (suspend) {
        const {titleForPage} = require("./history")
        name.textContent = titleForPage(url) || url
        const {forSite} = require("./favicons")
        favicon.src = forSite(url) || favicon.src
    } else if (!opts.switchTo) {
        unsuspendPage(page)
    }
    if (opts.switchTo) {
        switchToTab(tab)
    } else {
        const {applyLayout} = require("./pagelayout")
        applyLayout()
    }
}

/**
 * Reopen the last closed tab and switch to it.
 * @param {import("./common").RunSource} src
 */
const reopenTab = src => {
    if (recentlyClosed.length === 0 || listTabs().length === 0) {
        return
    }
    /** @type {{
     *   muted: boolean,
     *   url: string,
     *   index: number
     *   session?: string
     *   container?: string
     *   customIndex?: number
     *   src?: import("./common").RunSource
     * }|undefined} */
    const restore = recentlyClosed.pop()
    if (!restore) {
        return
    }
    restore.url = stringToUrl(restore.url)
    if (getSetting("containerkeeponreopen") && restore.container) {
        restore.session = restore.container
    } else {
        delete restore.container
    }
    restore.customIndex = restore.index
    const tab = currentTab()
    if (!tab) {
        return
    }
    if (getSetting("tabreopenposition") === "left") {
        restore.customIndex = listTabs().indexOf(tab)
    }
    if (getSetting("tabreopenposition") === "right") {
        restore.customIndex = listTabs().indexOf(tab) + 1
    }
    const rememberMuted = getSetting("tabreopenmuted")
    restore.muted = rememberMuted === "always"
        || rememberMuted === "remember" && restore.muted
    addTab({...restore, src})
}

/** Load the tabs from disk and from startup args. */
const init = () => {
    window.addEventListener("load", () => {
        if (appConfig()?.icon) {
            document.getElementById("logo")
                ?.setAttribute("src", appConfig()?.icon ?? "")
        }
        /** @type {{
         *   closed?: typeof recentlyClosed,
         *   pinned?: typeof recentlyClosed,
         *   tabs?: typeof recentlyClosed,
         *   id?: number
         * }} */
        const parsed = readJSON(tabFile)
        if (!erwicMode) {
            if (parsed) {
                const s = getSetting("suspendonrestore")
                const restoreTabs = getSetting("restoretabs")
                const keepRecentlyClosed = getSetting("keeprecentlyclosed")
                if (Array.isArray(parsed.closed) && keepRecentlyClosed) {
                    recentlyClosed = parsed.closed
                }
                if (Array.isArray(parsed.pinned)) {
                    if (restoreTabs === "all" || restoreTabs === "pinned") {
                        parsed.pinned.forEach(t => addTab({
                            "src": "source",
                            ...t,
                            "lazy": s === "all",
                            "pinned": true,
                            "switchTo": false
                        }))
                    } else if (keepRecentlyClosed) {
                        recentlyClosed.push(...parsed.pinned)
                    }
                }
                if (Array.isArray(parsed.tabs)) {
                    if (restoreTabs === "all" || restoreTabs === "regular") {
                        parsed.tabs.forEach(t => addTab({
                            "src": "source",
                            ...t,
                            "lazy": s === "all" || s === "regular",
                            "switchTo": false
                        }))
                    } else if (keepRecentlyClosed) {
                        recentlyClosed.push(...parsed.tabs)
                    }
                }
                if (listTabs().length !== 0) {
                    switchToTab(parsed.id || 0)
                }
            }
            const startup = getSetting("startuppages")
            for (const tab of startup) {
                const parts = tab.split("~")
                const url = parts.shift() ?? ""
                const container = parts.shift() ?? ""
                const muted = parts.includes("muted")
                const pinned = parts.includes("pinned")
                addTab({
                    container,
                    muted,
                    pinned,
                    "src": "source",
                    "startup": true,
                    url
                })
            }
        }
        ipcRenderer.on("urls", (_, pages) => {
            for (const page of pages) {
                const replaceStartup = getSetting("replacestartup")
                if (replaceStartup !== "never") {
                    try {
                        const url = currentPage()?.getAttribute("src") ?? ""
                        const specialName = pathToSpecialPageName(url)?.name
                        const isNewtab = specialName === "newtab"
                            || url.replace(/\/+$/g, "") === stringToUrl(
                                getSetting("newtaburl")).replace(/\/+$/g, "")
                        if (isNewtab || replaceStartup === "always") {
                            navigateTo("source", stringToUrl(page?.url || page))
                            continue
                        }
                    } catch {
                        // No tabs yet
                    }
                }
                if (typeof page === "string") {
                    addTab({
                        "src": "source",
                        "startup": true,
                        "url": stringToUrl(page)
                    })
                } else if (typeof page === "object" && page.url) {
                    addTab({
                        "src": "source",
                        ...page,
                        "startup": true,
                        "url": stringToUrl(page.url)
                    })
                }
            }
        })
        ipcRenderer.on("navigate-to", (_, url) => navigateTo(
            "user", stringToUrl(url)))
        ipcRenderer.on("unresponsive", (_, id) => {
            listReadyPages().forEach(webview => {
                if (webview.getWebContentsId() === id) {
                    tabForPage(webview)?.classList.add("unresponsive")
                }
            })
        })
        ipcRenderer.on("responsive", (_, id) => {
            listReadyPages().forEach(webview => {
                if (webview.getWebContentsId() === id) {
                    tabForPage(webview)?.classList.remove("unresponsive")
                }
            })
        })
        ipcRenderer.on("new-tab", (_, url) => addTab({
            "src": "user",
            "switchTo": getSetting("mousenewtabswitch"),
            "url": stringToUrl(url)
        }))
        if (listTabs().length === 0 && !erwicMode) {
            if (parsed) {
                addTab({"src": "source"})
            } else {
                // The very first startup with this datafolder, show help page
                addTab({"src": "source", "url": specialPagePath("help")})
            }
        }
        ipcRenderer.send("window-state-init", {
            "full": getSetting("windowfullscreen"),
            "max": getSetting("windowmaximize"),
            "pos": getSetting("windowposition"),
            "size": getSetting("windowsize")
        })
    })
}

/** Move the tab forward in the tab bar. */
const moveTabForward = () => {
    const tabs = document.getElementById("tabs")
    const tab = currentTab()
    if (!tab || !tab.nextElementSibling || !tabs) {
        return false
    }
    if (tab.classList.contains("pinned")) {
        if (!tab.nextElementSibling?.classList.contains("pinned")) {
            return false
        }
    }
    tabs.insertBefore(tab, tab.nextElementSibling?.nextElementSibling ?? null)
    tab.scrollIntoView({"block": "center", "inline": "center"})
    return true
}

/** Move the tab backward in the tab bar. */
const moveTabBackward = () => {
    const tabs = document.getElementById("tabs")
    const tab = currentTab()
    if (!tab || !tabs || listTabs().indexOf(tab) <= 0) {
        return false
    }
    if (!tab.classList.contains("pinned")) {
        if (tab.previousElementSibling?.classList.contains("pinned")) {
            return false
        }
    }
    tabs.insertBefore(tab, tab.previousElementSibling)
    tab.scrollIntoView({"block": "center", "inline": "center"})
    return true
}

module.exports = {
    addColorschemeStylingToWebview,
    addTab,
    closeTab,
    init,
    moveTabBackward,
    moveTabForward,
    navigateTo,
    recreateWebview,
    reopenTab,
    rerollUserAgent,
    resetTabInfo,
    saveTabs,
    suspendTab,
    switchToTab,
    unsuspendPage,
    updateUrl
}
