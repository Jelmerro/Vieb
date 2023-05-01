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

const {ipcRenderer} = require("electron")
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
    title,
    listNotificationHistory,
    propPixels,
    userAgentTemplated,
    deleteFile
} = require("../util")
const {
    listTabs,
    listPages,
    currentTab,
    currentPage,
    currentMode,
    getSetting,
    guiRelatedUpdate,
    setTopOfPageWithMouse,
    getMouseConf,
    getUrl,
    tabForPage,
    pageForTab,
    listRealPages
} = require("./common")
const {setMode} = require("./modes")

/**
 * @typedef {(
 *   "open"|"newtab"|"copy"|"download"|"split"|"vsplit"|"external"|"search"
 * )} tabPosition

/** @type {{container: string, muted: boolean, url: string, index: number}[]} */
let recentlyClosed = []
let linkId = 0
/** @type {{[id: string]: Number}} */
const timeouts = {}
const tabFile = joinPath(appData(), "tabs")
const erwicMode = isFile(joinPath(appData(), "erwicmode"))
let justSearched = false
/** @type {{[id: number]: {[type: string]: string}}} */
const existingInjections = {}

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
            for (const tab of startup.split(",")) {
                const parts = tab.split("~")
                const url = parts.shift()
                const container = parts.shift()
                const muted = parts.includes("muted")
                const pinned = parts.includes("pinned")
                addTab({container, muted, pinned, "startup": true, url})
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
                            navigateTo(stringToUrl(page?.url || page))
                            continue
                        }
                    } catch {
                        // No tabs yet
                    }
                }
                if (typeof page === "string") {
                    addTab({"startup": true, "url": stringToUrl(page)})
                } else {
                    addTab({...page, "startup": true})
                }
            }
        })
        ipcRenderer.on("navigate-to", (_, url) => navigateTo(stringToUrl(url)))
        ipcRenderer.on("unresponsive", (_, id) => {
            listRealPages().forEach(webview => {
                if (webview.getWebContentsId() === id) {
                    tabForPage(webview)?.classList.add("unresponsive")
                }
            })
        })
        ipcRenderer.on("responsive", (_, id) => {
            listRealPages().forEach(webview => {
                if (webview.getWebContentsId() === id) {
                    tabForPage(webview)?.classList.remove("unresponsive")
                }
            })
        })
        ipcRenderer.on("new-tab", (_, url) => addTab({
            "switchTo": getSetting("mousenewtabswitch"), "url": stringToUrl(url)
        }))
        if (listTabs().length === 0 && !erwicMode) {
            if (parsed) {
                addTab()
            } else {
                // The very first startup with this datafolder, show help page
                addTab({"url": specialPagePath("help")})
            }
        }
        ipcRenderer.send("window-state-init",
            getSetting("restorewindowposition"),
            getSetting("restorewindowsize"),
            getSetting("restorewindowmaximize"))
    })
}

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
        const url = urlToString(pageForTab(tab)?.getAttribute("src") ?? "")
        if (!url || url.startsWith("devtools://")) {
            if (index <= data.id) {
                data.id -= 1
            }
            return
        }
        const container = urlToString(pageForTab(tab)
            ?.getAttribute("container") ?? "")
        const isPinned = tab.classList.contains("pinned")
        if (isPinned && ["all", "pinned"].includes(restoreTabs)) {
            data.pinned.push({
                container, "muted": !!tab.getAttribute("muted"), url
            })
        } else if (!isPinned && ["all", "regular"].includes(restoreTabs)) {
            data.tabs.push({
                container, "muted": !!tab.getAttribute("muted"), url
            })
        } else if (keepRecentlyClosed) {
            data.closed.push({
                container, "muted": !!tab.getAttribute("muted"), url
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
    writeJSON(tabFile, data, "Failed to write current tabs to disk")
}

/**
 * Add a new tab
 *
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
 * }} options
 */
const addTab = (options = {}) => {
    // Recognized options for opening a new tab are as follows:
    // url, customIndex, switchTo, pinned, session (override of container)
    // container (suggestion), devtools, lazy, script, muted, startup
    // Defaults for these options vary depending on app state and user settings
    if (options.url) {
        try {
            new URL(options.url)
        } catch {
            return
        }
    }
    if (options.switchTo === undefined) {
        options.switchTo = true
    }
    if (options.url?.startsWith("devtools://")) {
        return
    }
    if (options.url?.startsWith("about:blank") || options.url === "") {
        return
    }
    linkId += 1
    const devtoolsOpen = currentPage()?.isDevToolsOpened()
    const currentPageId = currentPage()?.getWebContentsId()
    const currentPageLinkId = currentPage()?.getAttribute("link-id")
    let isDevtoolsTab = false
    if (options.devtools && currentPageId && currentPageLinkId) {
        const oldTab = listTabs().find(
            t => t.getAttribute("link-id") === currentPageLinkId)
        if (oldTab?.getAttribute("devtools-id") || devtoolsOpen) {
            return
        }
        oldTab?.setAttribute("devtools-id", `${linkId}`)
        isDevtoolsTab = true
    }
    let sessionName = getSetting("containernewtab")
    if (options.container) {
        sessionName = options.container
    } else if (options.startup) {
        sessionName = getSetting("containerstartuppage")
    }
    if (sessionName === "s:external" && options.url) {
        const isSpecialPage = pathToSpecialPageName(options.url)?.name
        if (isSpecialPage) {
            sessionName = "main"
        } else {
            if ((/^https?:\/\//).test(options.url)) {
                if (getSetting("externalcommand").trim()) {
                    const {commonAction} = require("./contextmenu")
                    commonAction("link", "external", {"link": options.url})
                } else {
                    const {shell} = require("electron")
                    shell.openExternal(options.url)
                }
            }
            return
        }
    }
    if (sessionName === "s:replacematching" && options.url) {
        const match = listPages().find(p => sameDomain(
            p.getAttribute("src") ?? "", options.url ?? ""))
        if (match) {
            const tab = tabForPage(match)
            if (tab) {
                switchToTab(tab)
            }
        }
    }
    if (sessionName.startsWith("s:replace")) {
        if (options.url) {
            navigateTo(options.url)
        }
        return
    }
    if (sessionName === "s:usematching" && options.url) {
        const match = listPages().find(p => sameDomain(
            p.getAttribute("src") ?? "", options.url ?? ""))
        if (match) {
            sessionName = match.getAttribute("container") ?? sessionName
        }
    }
    if (sessionName.startsWith("s:use")) {
        sessionName = currentPage()?.getAttribute("container") || "main"
    }
    if (options.session) {
        sessionName = options.session
    } else if (options.url) {
        sessionName = getSetting("containernames").split(",").find(
            c => options.url?.match(c.split("~")[0]))?.split("~")[1]
            || sessionName
    }
    sessionName = sessionName.replace("%n", `${linkId}`)
    const tabs = document.getElementById("tabs")
    const pages = document.getElementById("pages")
    const tab = document.createElement("span")
    const favicon = document.createElement("img")
    const statusIcon = document.createElement("img")
    const name = document.createElement("span")
    if (options.pinned) {
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
    if (options.customIndex !== undefined && currentTab()) {
        if (options.customIndex >= listTabs().length) {
            tabs?.append(tab)
        } else {
            /** @type {Element|null} */
            let nextTab = listTabs()[options.customIndex]
            if (!options.pinned) {
                while (nextTab && nextTab.classList.contains("pinned")) {
                    nextTab = nextTab.nextElementSibling
                }
            }
            tabs?.insertBefore(tab, nextTab)
        }
    } else if (getSetting("tabnexttocurrent") && currentTab()) {
        let nextTab = currentTab()?.nextElementSibling
        if (!options.pinned) {
            while (nextTab && nextTab.classList.contains("pinned")) {
                nextTab = nextTab.nextElementSibling
            }
        }
        tabs?.insertBefore(tab, nextTab ?? null)
    } else {
        tabs?.append(tab)
    }
    tab.setAttribute("link-id", `${linkId}`)
    const color = getSetting("containercolors").split(",").find(
        c => sessionName.match(c.split("~")[0]))
    if (color) {
        [, tab.style.color] = color.split("~")
    }
    const page = document.createElement("div")
    if (options.script) {
        page.setAttribute("user-script-file", options.script)
    }
    page.classList.add("webview")
    page.setAttribute("link-id", `${linkId}`)
    const url = stringToUrl(options.url || "")
        .replace(/view-?source:\/?\/?/g, "sourceviewer://")
    if (options.url) {
        page.setAttribute("src", url)
    }
    page.setAttribute("container", sessionName)
    if (isDevtoolsTab) {
        page.setAttribute("devtools-for-id", `${currentPageId}`)
    }
    let {muted} = options
    if (options.startup) {
        muted = getSetting("tabreopenmuted") === "always"
            || getSetting("tabreopenmuted") === "remember" && muted
    } else if (muted === undefined || muted === null) {
        muted = getSetting("tabopenmuted") === "always"
            || getSetting("tabopenmuted") === "background" && !options.switchTo
    }
    if (muted) {
        tab.setAttribute("muted", "muted")
        page.setAttribute("muted", "muted")
    }
    pages?.append(page)
    const suspend = options.lazy
        || getSetting("suspendbackgroundtab") && !options.switchTo
    tab.setAttribute("suspended", "suspended")
    if (suspend) {
        const {titleForPage} = require("./history")
        name.textContent = titleForPage(url) || url
        const {forSite} = require("./favicons")
        favicon.src = forSite(url) || favicon.src
    } else if (!options.switchTo) {
        unsuspendPage(page)
    }
    if (options.switchTo) {
        switchToTab(tab)
    } else {
        const {applyLayout} = require("./pagelayout")
        applyLayout()
    }
}

const sharedAttributes = [
    "link-id", "container", "class", "id", "style", "muted", "user-script-file"
]

/**
 * Suspend a tab
 *
 * @param {HTMLSpanElement} tab
 * @param {boolean} force
 */
const suspendTab = (tab, force = false) => {
    const page = pageForTab(tab)
    if (!page || page instanceof HTMLDivElement) {
        return
    }
    if (tab.classList.contains("visible-tab") && !force) {
        return
    }
    page.closeDevTools()
    tab.setAttribute("suspended", "suspended")
    tab.removeAttribute("media-playing")
    const {show} = require("./favicons")
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
            closeTab(listTabs().indexOf(t))
        }
    })
}

/**
 * Unsuspend a tab
 *
 * @param {Electron.WebviewTag|HTMLDivElement} page
 */
const unsuspendPage = page => {
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
    // Info on nodeIntegrationInSubFrames and nodeIntegrationInWorker:
    // https://github.com/electron/electron/issues/22582
    // https://github.com/electron/electron/issues/28620
    prefs += "disableDialogs,nodeIntegrationInSubFrames,nodeIntegrationInWorker"
    webview.setAttribute("allowpopups", "true")
    webview.setAttribute("webpreferences", prefs)
    const sessionName = page.getAttribute("container")
    ipcRenderer.send("create-session", `persist:${sessionName}`,
        getSetting("adblocker"), getSetting("cache") !== "none")
    webview.setAttribute("partition", `persist:${sessionName}`)
    const currentPageId = Number(page.getAttribute("devtools-for-id") || 0) || 0
    const isDevtoolsTab = !!currentPageId
    if (isDevtoolsTab) {
        webview.src = "about:blank"
    } else {
        webview.src = specialPagePath("newtab")
    }
    const url = page.getAttribute("src") || ""
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
                webview.src = url || stringToUrl(newtabUrl)
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

const reopenTab = () => {
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
     * }|undefined} */
    const restore = recentlyClosed.pop()
    if (!restore) {
        return
    }
    restore.url = stringToUrl(restore.url)
    if (getSetting("containerkeeponreopen")) {
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
    addTab(restore)
}

/**
 * Close a tab by index, optionally force close pinned ones
 *
 * @param {number|null} index
 * @param {boolean} force
 */
const closeTab = (index = null, force = false) => {
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
    const regularTab = listTabs().find(t => t.getAttribute("devtools-id")
        === tab?.getAttribute("link-id"))
    if (regularTab) {
        regularTab.removeAttribute("devtools-id")
    }
    const closedDevtoolsId = tab.getAttribute("devtools-id")
    const {layoutDivById, hide} = require("./pagelayout")
    const isVisible = layoutDivById(tab.getAttribute("link-id"))
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
                addTab({"container": "main"})
            } else {
                addTab()
            }
        }
        if (isClosingCurrent) {
            if (getSetting("tabclosefocusright")) {
                if (oldTabIdx >= listTabs().length) {
                    switchToTab(listTabs().length - 1)
                } else {
                    switchToTab(oldTabIdx)
                }
            } else if (oldTabIdx === 0) {
                switchToTab(0)
            } else {
                switchToTab(oldTabIdx - 1)
            }
        }
    }
    listTabs().forEach(t => {
        if (closedDevtoolsId === t.getAttribute("link-id")) {
            closeTab(listTabs().indexOf(t))
        }
    })
}

/**
 * Switch to a different tab by element or index
 *
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
    /** @type {Electron.WebviewTag|HTMLDivElement|null|undefined} */
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
    if (newCurrentPage) {
        unsuspendPage(newCurrentPage)
    }
    newCurrentPage = currentPage()
    if (newCurrentPage && !(newCurrentPage instanceof HTMLDivElement)) {
        updateUrl(newCurrentPage)
    }
    setMode("normal")
    const hoverEl = document.getElementById("url-hover")
    if (hoverEl) {
        hoverEl.textContent = ""
        hoverEl.style.display = "none"
    }
    guiRelatedUpdate("tabbar")
    const {updateContainerSettings} = require("./settings")
    updateContainerSettings(false)
    setLastUsedTab(oldPage?.getAttribute("link-id") ?? null)
}

/**
 * Update the url in the navbar to reflect the current status
 *
 * @param {Electron.WebviewTag} webview
 * @param {boolean} force
 */
const updateUrl = (webview, force = false) => {
    const url = currentPage()?.src
    if (webview !== currentPage() || typeof url === "undefined") {
        return
    }
    const {updateWindowTitle} = require("./settings")
    updateWindowTitle()
    if (!force && "secf".includes(currentMode()[0])) {
        return
    }
    let niceUrl = urlToString(url)
    if (niceUrl === `${appConfig()?.name.toLowerCase()}://newtab`) {
        niceUrl = ""
    }
    const urlInput = getUrl()
    if (urlInput) {
        urlInput.value = niceUrl
    }
}

/**
 * Inject custom styling into the page in a CSP compatible way
 *
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
 * Add all permanent listeners to the new webview
 *
 * @param {Electron.WebviewTag} webview
 */
const addWebviewListeners = webview => {
    webview.addEventListener("load-commit", e => {
        if (e.isMainFrame) {
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
    webview.addEventListener("crashed", () => {
        if (getSetting("reloadtaboncrash")) {
            recreateWebview(webview)
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
                closeTab(listTabs().indexOf(tab))
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
    webview.addEventListener("did-start-loading", () => {
        const {loading} = require("./favicons")
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
            webview.src = webview.src.replace("https://", "http://")
            return
        }
        if (webview.src !== e.validatedURL) {
            webview.src = e.validatedURL
            const tabTitleEl = tabForPage(webview)?.querySelector("span")
            if (tabTitleEl) {
                tabTitleEl.textContent = urlToString(e.validatedURL)
            }
            return
        }
        if (e.validatedURL.startsWith("chrome://")) {
            const page = e.validatedURL.replace(
                "chrome://", "").replace(/\/$/, "")
            webview.src = specialPagePath(page)
            return
        }
        // If the path is a directory, show a list of files instead of an error
        if (e.errorDescription === "ERR_FILE_NOT_FOUND") {
            // Any number of slashes after file is fine
            if (webview.src.startsWith("file:/")) {
                let local = urlToString(webview.src).replace(/file:\/+/, "/")
                if (process.platform === "win32") {
                    local = urlToString(webview.src).replace(/file:\/+/, "")
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
        const {getCustomStyling} = require("./settings")
        webview.send("set-custom-styling", getSetting("guifontsize"),
            getCustomStyling())
    })
    webview.addEventListener("did-stop-loading", () => {
        const {show} = require("./favicons")
        show(webview)
        updateUrl(webview)
        window.clearTimeout(timeouts[webview.getAttribute("link-id") ?? ""])
        const specialPageName = pathToSpecialPageName(webview.src)?.name
        const isLocal = webview.src.startsWith("file:/")
        const isErrorPage = webview.getAttribute("failed-to-load")
        const isCustomView = webview.src.startsWith("sourceviewer:")
            || webview.src.startsWith("readerview")
            || webview.src.startsWith("markdownviewer")
        if (specialPageName || isLocal || isErrorPage || isCustomView) {
            const {getCustomStyling} = require("./settings")
            webview.send("set-custom-styling", getSetting("guifontsize"),
                getCustomStyling())
        }
        if (specialPageName === "help") {
            const {
                listMappingsAsCommandList, uncountableActions
            } = require("./input")
            const {settingsWithDefaults} = require("./settings")
            const {rangeCompatibleCommands} = require("./command")
            webview.send("settings", settingsWithDefaults(),
                listMappingsAsCommandList(null, true), uncountableActions,
                rangeCompatibleCommands)
        }
        if (specialPageName === "notifications") {
            webview.send("notification-history", listNotificationHistory())
        }
        saveTabs()
        const name = tabForPage(webview)?.querySelector("span")
        if (specialPageName && name) {
            name.textContent = title(specialPageName)
        }
        const {addToHist, titleForPage, updateTitle} = require("./history")
        addToHist(webview.src)
        const existing = titleForPage(webview.src)
        if (isLocal && !specialPageName && name) {
            name.textContent = urlToString(webview.src)
        } else if (name && hasProtocol(name.textContent ?? "")
            && existing && !isCustomView) {
            name.textContent = existing
        } else if (name?.textContent) {
            updateTitle(webview.src, name.textContent)
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
            const {loadUserscripts} = require("./extensions")
            loadUserscripts(webview)
        }
    })
    webview.addEventListener("page-title-updated", e => {
        const isCustomView = webview.src.startsWith("sourceviewer:")
            || webview.src.startsWith("readerview")
            || webview.src.startsWith("markdownviewer")
        if (hasProtocol(e.title) && !isCustomView) {
            return
        }
        const tabTitleEl = tabForPage(webview)?.querySelector("span")
        if (tabTitleEl) {
            tabTitleEl.textContent = e.title
            updateUrl(webview)
            const {updateTitle} = require("./history")
            updateTitle(webview.src, tabTitleEl.textContent)
        }
    })
    webview.addEventListener("page-favicon-updated", e => {
        const {update} = require("./favicons")
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
        const {applyLayout} = require("./pagelayout")
        applyLayout()
    })
    webview.addEventListener("ipc-message", e => {
        const {resetScrollbarTimer} = require("./pagelayout")
        if (e.channel === "notify") {
            notify(e.args[0], e.args[1], e.args[2])
        }
        if (e.channel === "url") {
            addTab({"url": e.args[0]})
        }
        if (e.channel === "back-button") {
            const {backInHistory} = require("./actions")
            backInHistory()
        }
        if (e.channel === "forward-button") {
            const {forwardInHistory} = require("./actions")
            forwardInHistory()
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
            handleRequest(webview, ...e.args)
        }
        if (e.channel === "switch-to-insert") {
            setMode("insert")
        }
        if (e.channel === "navigate-to") {
            navigateTo(e.args[0], webview)
        }
        if (e.channel === "new-tab-info-request") {
            const special = pathToSpecialPageName(webview.src)
            if (special?.name !== "newtab") {
                return
            }
            const {forSite} = require("./favicons")
            const {suggestTopSites, titleForPage} = require("./history")
            const favoritePages = getSetting("favoritepages").split(",")
                .filter(u => u).map(u => {
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
            const special = pathToSpecialPageName(e.url)
            const appName = appConfig()?.name.toLowerCase() ?? ""
            if (!special?.name) {
                hoverEl.textContent = urlToString(e.url)
            } else if (special.section) {
                hoverEl.textContent = `${
                    appName}://${special.name}#${special.section}`
            } else {
                hoverEl.textContent = `${appName}://${special.name}`
            }
            hoverEl.style.display = "block"
        } else {
            hoverEl.textContent = ""
            hoverEl.style.display = "none"
        }
    })
    webview.onblur = () => {
        if (currentMode() === "insert") {
            webview.focus()
        }
    }
}

/**
 * Recreate a webview to in case of new container name or crash reload
 *
 * @param {Electron.WebviewTag} webview
 */
const recreateWebview = webview => {
    const tab = tabForPage(webview)
    if (tab) {
        suspendTab(tab, true)
        const suspendedPage = pageForTab(tab)
        if (suspendedPage) {
            unsuspendPage(suspendedPage)
        }
    }
}

/**
 * Reset the tab information for a given page
 *
 * @param {Electron.WebviewTag} webview
 */
const resetTabInfo = webview => {
    webview.removeAttribute("failed-to-load")
    const {empty} = require("./favicons")
    empty(webview)
}

/**
 * Pick a new useragent for the page if multiple are configured
 *
 * @param {Electron.WebviewTag} webview
 */
const rerollUserAgent = webview => {
    const customUA = getSetting("useragent")
    if (customUA) {
        const agents = customUA.split("~")
        const agent = userAgentTemplated(
            agents.at(Math.random() * agents.length) ?? "")
        webview.setUserAgent(agent)
    } else {
        webview.setUserAgent("")
    }
}

/**
 * Navigate the page to a new location, optionally a custom page
 *
 * @param {string} location
 * @param {Electron.WebviewTag|null} customPage
 */
const navigateTo = (location, customPage = null) => {
    try {
        new URL(location)
    } catch {
        return
    }
    const webview = customPage || currentPage()
    if (!webview || webview.isCrashed() || !location) {
        return
    }
    if (webview.src.startsWith("devtools://")) {
        return
    }
    if (!webview.getAttribute("dom-ready") && webview.isLoading()) {
        setTimeout(() => navigateTo(location, webview), 1)
        return
    }
    webview.stop()
    const loc = location.replace(/view-?source:\/?\/?/g, "sourceviewer://")
    const sessionName = getSetting("containernames").split(",").find(
        c => loc.match(c.split("~")[0]) && c.split("~")[2] !== "newtab")
        ?.split("~")[1]
    if (sessionName && sessionName !== webview.getAttribute("container")) {
        webview.setAttribute("container", sessionName)
        recreateWebview(webview)
        return
    }
    rerollUserAgent(webview)
    webview.src = loc
    resetTabInfo(webview)
    const tabTitleEl = currentTab()?.querySelector("span")
    if (tabTitleEl) {
        tabTitleEl.textContent = urlToString(loc)
    }
}

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
    addTab,
    closeTab,
    init,
    moveTabBackward,
    moveTabForward,
    navigateTo,
    reopenTab,
    rerollUserAgent,
    resetTabInfo,
    saveTabs,
    suspendTab,
    switchToTab,
    unsuspendPage,
    updateUrl
}
