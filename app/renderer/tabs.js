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

import {ipcRenderer, shell} from "electron"
import {platform} from "node:os"
import {
    appConfig,
    appData,
    currentMode,
    currentPage,
    currentTab,
    getMouseConf,
    getSetting,
    getUrl,
    listNotificationHistory,
    listPages,
    listReadyPages,
    listTabs,
    notify,
    pageForTab,
    pathToSpecialPageName,
    sendToPageOrSubFrame,
    specialPagePath,
    stringToUrl,
    tabForPage,
    urlToString
} from "../preloadutil.js"
import {translate} from "../translate.js"
import {
    deleteFile,
    hasProtocol,
    isDir,
    isFile,
    joinPath,
    listDir,
    propPixels,
    readFile,
    readJSON,
    sameDomain,
    userAgentTemplated,
    writeJSON
} from "../util.js"
import {backInHistory, forwardInHistory, setFocusCorrectly} from "./actions.js"
import {execute, rangeCompatibleCommands} from "./command.js"
import {commonAction, contextMenuClear} from "./contextmenu.js"
import {loadUserscripts} from "./extensions.js"
import {forSite, loading, show, update} from "./favicons.js"
import {emptyHoverLink} from "./follow.js"
import {guiRelatedUpdate, setTopOfPageWithMouse} from "./guivisibility.js"
import {
    addToHist,
    handleRequest,
    suggestTopSites,
    titleForPage,
    updateTitle
} from "./history.js"
import {
    listMappingsAsCommandList,
    moveScreenshotFrame,
    resetScreenshotDrag,
    uncountableActions
} from "./input.js"
import {setMode} from "./modes.js"
import {
    applyLayout,
    getLastTabIds,
    hide,
    layoutDivById,
    resetScrollbarTimer,
    setLastUsedTab,
    switchView
} from "./pagelayout.js"
import {handleScrollDiffEvent, move} from "./pointer.js"
import {
    getCustomStyling,
    settingsWithDefaults,
    updateContainerSettings,
    updateWindowTitle
} from "./settings.js"

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
const sharedAttributes = [
    "link-id", "container", "class", "id", "style", "muted", "user-script-file"
]

/**
 * Update the url in the navbar to reflect the current status.
 * @param {Electron.WebviewTag} webview
 * @param {boolean} force
 */
export const updateUrl = (webview, force = false) => {
    const url = currentPage()?.src
    if (webview !== currentPage() || typeof url === "undefined") {
        return
    }
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
 * @param {Electron.WebviewTag} webview
 */
export const resetTabInfo = webview => {
    webview.removeAttribute("failed-to-load")
    loading(webview, true)
}

/**
 * Pick a new useragent for the page if multiple are configured.
 * @param {Electron.WebviewTag} webview
 */
export const rerollUserAgent = webview => {
    const agents = getSetting("useragent")
    if (agents.length) {
        const agent = userAgentTemplated(
            agents.at(Math.random() * agents.length) ?? "")
        webview.setUserAgent(agent)
    } else {
        webview.setUserAgent("")
    }
}

/**
 * Suspend a tab.
 * @param {import("../preloadutil.js").RunSource} src
 * @param {HTMLSpanElement} tab
 * @param {boolean} force
 */
export const suspendTab = (src, tab, force = false) => {
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
    show(page)
    const placeholder = document.createElement("div")
    placeholder.classList.add("webview")
    sharedAttributes.forEach(attr => {
        const attrValue = page.getAttribute(attr)
        if (attrValue) {
            placeholder.setAttribute(attr, attrValue)
        }
    })
    placeholder.setAttribute("src", page.src)
    page.replaceWith(placeholder)
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
 * @param {import("../preloadutil.js").RunSource} src
 * @param {Electron.WebviewTag} webview
 * @param {string|null} customSrc
 */
export const recreateWebview = (src, webview, customSrc = null) => {
    const tab = tabForPage(webview)
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
 * @param {import("../preloadutil.js").RunSource} src
 * @param {Electron.WebviewTag} webview
 * @param {string} location
 */
const checkContainerNames = (src, webview, location) => {
    const loc = location.replace(/view-?source:\/?\/?/g, "sourceviewer://")
    const sessionName = getSetting("containernames").find(
        c => loc.match(c.split("~")[0]) && c.split("~")[2] !== "newtab")
        ?.split("~")[1]
    if (sessionName && sessionName !== webview.getAttribute("container")) {
        webview.setAttribute("container", sessionName)
        recreateWebview(src, webview, loc)
        return true
    }
    return false
}

/**
 * Navigate the page to a new location, optionally a custom page.
 * @param {import("../preloadutil.js").RunSource} src
 * @param {string} location
 * @param {Electron.WebviewTag|null} customPage
 */
export const navigateTo = (src, location, customPage = null) => {
    try {
        new URL(location)
    } catch {
        return
    }
    const webview = customPage || currentPage()
    if (!webview || !location || webview.src.startsWith("devtools://")) {
        return
    }
    if (!webview.getAttribute("dom-ready") && webview.isLoading()) {
        setTimeout(() => navigateTo(src, location, webview), 1)
        return
    }
    const loc = location.replace(/view-?source:\/?\/?/g, "sourceviewer://")
    if (webview.isCrashed()) {
        recreateWebview(src, webview, loc)
        return
    }
    webview.stop()
    const wasRecreated = checkContainerNames(src, webview, loc)
    if (wasRecreated) {
        return
    }
    rerollUserAgent(webview)
    webview.loadURL(loc).catch(() => null)
    resetTabInfo(webview)
    const tabTitleEl = currentTab()?.querySelector("span")
    if (tabTitleEl) {
        tabTitleEl.textContent = urlToString(loc)
    }
}

/** Save the current and closed tabs to disk if configured to do so. */
export const saveTabs = () => {
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
export const switchToTab = tabOrIndex => {
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
    /** @type {Electron.WebviewTag|HTMLDivElement|null|undefined} */
    let newCurrentPage = pageForTab(tab)
    if (newCurrentPage) {
        newCurrentPage.id = "current-page"
    }
    tab.scrollIntoView({"block": "center", "inline": "center"})
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
    updateContainerSettings(false)
    setLastUsedTab(oldPage?.getAttribute("link-id") ?? null)
    const loadingProgress = document.getElementById("loading-progress")
    if (loadingProgress) {
        if (["all", "line"].includes(getSetting("loadingindicator"))) {
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
 * @param {import("../preloadutil.js").RunSource} src
 * @param {number|null} index
 * @param {boolean} force
 */
export const closeTab = (src, index = null, force = false) => {
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
 * @param {Electron.WebviewTag} webview
 * @param {string} type
 * @param {string|null} css
 */
const injectCustomStyleRequest = async(webview, type, css = null) => {
    const id = webview.getWebContentsId()
    if (!existingInjections[id]) {
        existingInjections[id] = {}
    }
    if (existingInjections[id][type]) {
        webview.removeInsertedCSS(existingInjections[id][type])
        delete existingInjections[id][type]
    }
    if (css) {
        existingInjections[id][type] = await webview.insertCSS(css)
    }
}

/**
 * Add all css styles (including the default if needed) to the provided webview.
 * @param {Electron.WebviewTag} webview
 * @param {boolean} force
 */
export const addColorschemeStylingToWebview = (webview, force = false) => {
    const isSpecialPage = pathToSpecialPageName(webview.src)?.name
    const isLocal = webview.src.startsWith("file:/")
    const isErrorPage = webview.getAttribute("failed-to-load")
    const isCustomView = webview.src.startsWith("sourceviewer:")
        || webview.src.startsWith("readerview:")
        || webview.src.startsWith("markdownviewer:")
    const customStyling = getCustomStyling()
    const fontsize = getSetting("guifontsize")
    webview.send("action", "rerenderTOC", customStyling, fontsize)
    if (!isSpecialPage && !isLocal && !isErrorPage && !isCustomView) {
        // This check is also present in preload/styling.js,
        // but on pages where JS is disabled (chrome built-in) that won't load.
        webview.executeJavaScript("document?.head?.innerText").then(() => {
            webview.send("reload-basic-theme-styling")
        }).catch(() => {
            ipcRenderer.invoke("run-isolated-js-head-check",
                webview.getWebContentsId()).then(result => {
                if (result === "") {
                    const bg = document.body.computedStyleMap()
                        .get("--bg")?.toString()
                    const fg = document.body.computedStyleMap()
                        .get("--fg")?.toString()
                    const linkcolor = document.body.computedStyleMap()
                        .get("--link-color")?.toString()
                    const style = `html {
                        color: ${fg || "#eee"};
                        background: ${bg || "#333"};
                        font-size: ${fontsize}px;
                    } a {color: ${linkcolor || "#0cf"};}`
                    injectCustomStyleRequest(webview, "theme", style)
                }
            }).catch(() => null)
        })
        if (!force) {
            return
        }
    }
    webview.send("add-colorscheme-styling", getSetting("guifontsize"),
        customStyling)
}

/**
 * Add all permanent listeners to the new webview.
 * @param {Electron.WebviewTag} webview
 */
const addWebviewListeners = webview => {
    webview.addEventListener("load-commit", e => {
        if (e.isMainFrame) {
            rerollUserAgent(webview)
            resetTabInfo(webview)
            const name = tabForPage(webview)?.querySelector("span")
            if (name && !name?.textContent) {
                name.textContent = urlToString(e.url)
            }
            const timeout = getSetting("requesttimeout")
            const id = webview.getAttribute("link-id")
            if (!id) {
                return
            }
            window.clearTimeout(timeouts[id])
            if (timeout) {
                timeouts[id] = window.setTimeout(() => {
                    try {
                        webview.stop()
                    } catch {
                        // Webview might be destroyed or unavailable, no issue
                    }
                }, timeout)
            }
        }
    })
    webview.addEventListener("render-process-gone", e => {
        if (e.details.reason === "clean-exit") {
            return
        }
        if (getSetting("reloadtaboncrash")) {
            recreateWebview("other", webview)
        } else {
            tabForPage(webview)?.classList.add("crashed")
            if (currentPage()?.isCrashed() && webview === currentPage()) {
                if ("fipv".includes(currentMode()[0])) {
                    setMode("normal")
                }
            }
        }
    })
    webview.addEventListener("close", () => {
        if (getSetting("permissionclosepage") === "allow") {
            const tab = tabForPage(webview)
            if (tab) {
                closeTab("other", listTabs().indexOf(tab))
            }
        }
    })
    webview.addEventListener("media-started-playing", () => {
        const tab = tabForPage(webview)
        const counter = Number(tab?.getAttribute("media-playing")) || 0
        tab?.setAttribute("media-playing", `${counter + 1}`)
    })
    webview.addEventListener("media-paused", () => {
        const tab = tabForPage(webview)
        let counter = Number(tab?.getAttribute("media-playing")) || 0
        counter -= 1
        if (counter < 1) {
            tab?.removeAttribute("media-playing")
        } else {
            tab?.setAttribute("media-playing", `${counter}`)
        }
    })
    webview.addEventListener("did-start-navigation", e => {
        checkContainerNames("other", webview, e.url)
    })
    webview.addEventListener("did-start-loading", () => {
        loading(webview)
        updateUrl(webview)
    })
    webview.addEventListener("did-fail-load", e => {
        if (e.errorDescription === "" || !e.isMainFrame) {
            // Request was aborted before another error could occur,
            // or some request made by the page failed (which can be ignored).
            return
        }
        // It will go to the http website, when no https is present,
        // but only when the redirecttohttp setting is active.
        const isSSLError = (e.errorDescription.includes("_SSL_")
            || e.errorDescription.includes("_CERT_"))
            && webview.src.startsWith("https://")
        if (isSSLError && getSetting("redirecttohttp")) {
            webview.loadURL(webview.src.replace(/^https?:\/\//g, "http://"))
                .catch(() => null)
            return
        }
        if (webview.src !== e.validatedURL) {
            webview.setAttribute("src", e.validatedURL)
            const tabTitleEl = tabForPage(webview)?.querySelector("span")
            if (tabTitleEl) {
                tabTitleEl.textContent = urlToString(e.validatedURL)
            }
            return
        }
        if (e.validatedURL.startsWith("chrome://")) {
            const page = e.validatedURL.replace(
                "chrome://", "").replace(/\/$/, "")
            webview.loadURL(specialPagePath(page)).catch(() => null)
            return
        }
        addColorschemeStylingToWebview(webview, true)
        // If the path is a directory, show a list of files instead of an error
        if (e.errorDescription === "ERR_FILE_NOT_FOUND") {
            // Any number of slashes after file is fine
            if (webview.src.startsWith("file:/")) {
                let local = urlToString(webview.src).replace(/file:\/+/, "/")
                if (platform() === "win32") {
                    local = urlToString(webview.src).replace(/file:\/+/, "")
                    if (local === "" || local === "C:") {
                        webview.src = "file:///C:/"
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
                    webview.send("insert-current-directory-files",
                        dirs, files, directoryAllowed, local)
                    return
                }
            }
        }
        webview.send("insert-failed-page-info", JSON.stringify(e), isSSLError)
        webview.setAttribute("failed-to-load", "true")
    })
    webview.addEventListener("did-stop-loading", () => {
        show(webview)
        updateUrl(webview)
        window.clearTimeout(timeouts[webview.getAttribute("link-id") ?? ""])
        const specialPageName = pathToSpecialPageName(webview.src)?.name
        const isLocal = webview.src.startsWith("file:/")
        const isCustomView = webview.src.startsWith("sourceviewer:")
            || webview.src.startsWith("readerview:")
            || webview.src.startsWith("markdownviewer:")
        addColorschemeStylingToWebview(webview)
        if (specialPageName === "help") {
            webview.send("settings", settingsWithDefaults(),
                listMappingsAsCommandList("other", null, true),
                uncountableActions,
                rangeCompatibleCommands)
        }
        if (specialPageName === "notifications") {
            webview.send("notification-history", listNotificationHistory())
        }
        const tocPages = getSetting("tocpages")
        const readableUrl = urlToString(webview.src)
        if (tocPages.some(t => readableUrl.match(t) || webview.src.match(t))) {
            const fontsize = getSetting("guifontsize")
            setTimeout(() => {
                sendToPageOrSubFrame("action", "showTOC",
                    getCustomStyling(), fontsize)
            }, 50)
        }
        saveTabs()
        const name = tabForPage(webview)?.querySelector("span")
        if (specialPageName && name) {
            name.textContent = translate(`pages.${specialPageName}.title`)
        }
        addToHist(webview.src)
        const existing = titleForPage(webview.src)
        if (name) {
            if (isLocal && !existing) {
                name.textContent = readableUrl
            } else if (hasProtocol(name.textContent ?? "") && !isCustomView) {
                name.textContent = existing
            } else if (name.textContent) {
                updateTitle(webview.src, name.textContent)
            }
        }
        if (erwicMode) {
            const preload = webview.getAttribute("user-script-file")
            if (preload) {
                const javascript = readFile(preload)
                if (javascript) {
                    webview.executeJavaScript(javascript, true)
                }
            }
        }
        if (getSetting("userscript")) {
            loadUserscripts(webview)
        }
    })
    webview.addEventListener("page-title-updated", e => {
        const isCustomView = webview.src.startsWith("sourceviewer:")
            || webview.src.startsWith("readerview:")
            || webview.src.startsWith("markdownviewer:")
        if (hasProtocol(e.title) && !isCustomView) {
            return
        }
        const tabTitleEl = tabForPage(webview)?.querySelector("span")
        if (tabTitleEl) {
            tabTitleEl.textContent = e.title
            updateUrl(webview)
            updateTitle(webview.src, tabTitleEl.textContent)
        }
    })
    webview.addEventListener("page-favicon-updated", e => {
        const urls = e.favicons.filter(u => u && u !== webview.src)
        const url = urls.find(u => u.startsWith("data:"))
            ?? urls.find(u => u.endsWith(".svg"))
            ?? urls[0]
        if (url) {
            update(webview, url)
        }
        updateUrl(webview)
    })
    webview.addEventListener("will-navigate", e => {
        const wasRecreated = checkContainerNames("other", webview, e.url)
        if (wasRecreated) {
            return
        }
        resetTabInfo(webview)
        const tabTitleEl = tabForPage(webview)?.querySelector("span")
        if (tabTitleEl) {
            tabTitleEl.textContent = urlToString(e.url)
        }
    })
    webview.addEventListener("enter-html-full-screen", () => {
        if (currentPage() !== webview) {
            const tab = tabForPage(webview)
            if (tab) {
                switchToTab(tab)
            }
        }
        document.body.classList.add("fullscreen")
        webview.blur()
        webview.focus()
        webview.send("action", "focusTopLeftCorner")
        setMode("insert")
    })
    webview.addEventListener("leave-html-full-screen", () => {
        document.body.classList.remove("fullscreen")
        setMode("normal")
        applyLayout()
    })
    webview.addEventListener("ipc-message", e => {
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
            commonAction("other", "link", "external", {"link": e.args[0]})
        }
        if (e.channel === "back-button") {
            backInHistory({"src": "user"})
        }
        if (e.channel === "forward-button") {
            forwardInHistory({"src": "user"})
        }
        if (e.channel === "mouse-up") {
            resetScreenshotDrag()
            setFocusCorrectly()
        }
        if (e.channel === "scroll-height-diff") {
            contextMenuClear()
            if (justSearched) {
                justSearched = false
            } else if (e.args[0]) {
                handleScrollDiffEvent(e.args[0])
            }
            if (e.args[0]) {
                resetScrollbarTimer("scroll")
            }
        }
        if (e.channel === "history-list-request") {
            handleRequest(webview, ...e.args)
        }
        if (e.channel === "switch-to-insert") {
            setMode("insert")
        }
        if (e.channel === "navigate-to") {
            navigateTo("user", e.args[0], webview)
        }
        if (e.channel === "new-tab-info-request") {
            const special = pathToSpecialPageName(webview.src)
            if (special?.name !== "newtab") {
                return
            }
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
                webview.send("insert-new-tab-info", topPages, favoritePages)
            } else if (favoritePages.length > 0) {
                webview.send("insert-new-tab-info", false, favoritePages)
            }
        }
        if (e.channel === "mousemove") {
            setTopOfPageWithMouse(getMouseConf("guiontop") && !e.args[1])
            if (getSetting("mousefocus")) {
                const tab = tabForPage(webview)
                if (tab && currentTab() !== tab) {
                    switchToTab(tab)
                }
            }
            const pageTop = propPixels(webview.style, "top")
            const pageLeft = propPixels(webview.style, "left")
            if (currentMode() === "follow") {
                emptyHoverLink()
            } else if (currentMode() === "command") {
                moveScreenshotFrame(e.args[0] + pageLeft, e.args[1] + pageTop)
            }
            resetScrollbarTimer("move")
        }
        if (e.channel === "search-element-location") {
            if (currentMode() === "pointer") {
                move(e.args[0], e.args[1])
            }
        }
        if (e.channel === "custom-style-inject") {
            injectCustomStyleRequest(webview, e.args[0], e.args[1])
        }
    })
    webview.addEventListener("found-in-page", e => {
        webview.send("search-element-location", e.result.selectionArea)
        justSearched = true
        setTimeout(() => {
            justSearched = false
        }, 500)
    })
    webview.addEventListener("update-target-url", e => {
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
    webview.onblur = () => {
        if (currentMode() === "insert") {
            webview.focus()
        }
    }
}

/**
 * Unsuspend a tab.
 * @param {Electron.WebviewTag|HTMLDivElement} page
 */
export const unsuspendPage = page => {
    if (page.tagName?.toLowerCase() === "webview") {
        return
    }
    const tab = tabForPage(page)
    if (!tab?.getAttribute("suspended")) {
        return
    }
    tab.removeAttribute("suspended")
    const webview = document.createElement("webview")
    sharedAttributes.forEach(attr => {
        const attrValue = page.getAttribute(attr)
        if (attrValue) {
            webview.setAttribute(attr, attrValue)
        }
    })
    let prefs = "spellcheck=true,transparent=true,backgroundColor=#33333300,"
    if (appConfig()?.autoplay === "user") {
        prefs += "autoplayPolicy=document-user-activation-required,"
    }
    prefs += "disableDialogs"
    webview.setAttribute("allowpopups", "true")
    webview.setAttribute("webpreferences", prefs)
    const url = page.getAttribute("src") || ""
    const loc = url.replace(/view-?source:\/?\/?/g, "sourceviewer://")
    const sessionName = getSetting("containernames").find(
        c => loc.match(c.split("~")[0]) && c.split("~")[2] !== "newtab")
        ?.split("~")[1] ?? page.getAttribute("container")
    ipcRenderer.send("create-session", `persist:${sessionName}`,
        getSetting("adblocker"), getSetting("adblockernotifications"),
        getSetting("cache") !== "none")
    webview.setAttribute("partition", `persist:${sessionName}`)
    guiRelatedUpdate("tabbar")
    updateContainerSettings(false)
    setLastUsedTab(page?.getAttribute("link-id") ?? null)
    const currentPageId = Number(page.getAttribute("devtools-for-id") || 0) || 0
    const isDevtoolsTab = !!currentPageId
    if (isDevtoolsTab) {
        webview.src = "about:blank"
    } else {
        webview.src = specialPagePath("newtab")
    }
    webview.addEventListener("dom-ready", () => {
        if (!webview.getAttribute("dom-ready")) {
            if (webview.getAttribute("custom-first-load")) {
                webview.clearHistory()
                webview.removeAttribute("custom-first-load")
                webview.setAttribute("dom-ready", "true")
                return
            }
            const name = tab.querySelector("span")
            if (tab.getAttribute("muted")) {
                webview.setAudioMuted(true)
            }
            addWebviewListeners(webview)
            const newtabUrl = getSetting("newtaburl")
            if (isDevtoolsTab) {
                ipcRenderer.send("add-devtools",
                    currentPageId, webview.getWebContentsId())
                if (name) {
                    name.textContent = "Devtools"
                }
            } else if (url || newtabUrl) {
                webview.setAttribute("custom-first-load", "true")
                webview.loadURL(url || stringToUrl(newtabUrl)).catch(() => null)
                resetTabInfo(webview)
                if (name) {
                    name.textContent = urlToString(url)
                }
                return
            }
            webview.clearHistory()
            webview.setAttribute("dom-ready", "true")
        }
    })
    page.replaceWith(webview)
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
 *   src: import("../preloadutil.js").RunSource
 * }} opts
 */
export const addTab = opts => {
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
                    commonAction(
                        opts.src ?? "user",
                        "link", "external", {"link": opts.url})
                } else {
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
    page.classList.add("webview")
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
        name.textContent = titleForPage(url) || url
        favicon.src = forSite(url) || favicon.src
    } else if (!opts.switchTo) {
        unsuspendPage(page)
    }
    if (opts.switchTo) {
        switchToTab(tab)
    } else {
        applyLayout()
    }
}

/**
 * Reopen the last closed tab and switch to it.
 * @param {import("../preloadutil.js").RunSource} src
 */
export const reopenTab = src => {
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
     *   src?: import("../preloadutil.js").RunSource
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

/** Move the tab forward in the tab bar. */
export const moveTabForward = () => {
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
export const moveTabBackward = () => {
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

/** Load the tabs from disk and from startup args. */
const pageLoadedInit = () => {
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
                    const url = currentPage()?.src ?? ""
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
}

/** Call the init if the page is loaded. */
export const init = () => {
    if (document.readyState === "loading") {
        window.addEventListener("load", pageLoadedInit)
    } else {
        pageLoadedInit()
    }
}
