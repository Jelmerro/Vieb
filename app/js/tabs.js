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
/* global ACTIONS CONTEXTMENU FAVICONS FOLLOW HISTORY INPUT MODES
 PAGELAYOUT POINTER SESSIONS SETTINGS UTIL */
"use strict"

const fs = require("fs")
const path = require("path")
const {ipcRenderer, shell} = require("electron")

let recentlyClosed = []
let linkId = 0
const timeouts = {}
const tabFile = path.join(UTIL.appData(), "tabs")
const erwicMode = UTIL.isFile(path.join(UTIL.appData(), "erwicmode"))
const configPreloads = {}

const init = () => {
    window.addEventListener("load", () => {
        if (UTIL.appIcon()) {
            document.getElementById("logo").src = UTIL.appIcon()
        }

        // Make vertical scrolling move the tabs horizontally and vice versa
        document.getElementById("tabs").addEventListener("wheel", e => {
            document.getElementById("tabs").scrollBy(
                e.deltaX + e.deltaY, e.deltaX + e.deltaY)
            e.preventDefault()
        })

        const parsed = UTIL.readJSON(tabFile)
        if (!erwicMode) {
            if (parsed) {
                const s = SETTINGS.get("suspendonrestore")
                if (Array.isArray(parsed.pinned)) {
                    parsed.pinned.forEach(t => addTab({
                        ...t,
                        "pinned": true,
                        "switchTo": false,
                        "lazy": s === "all"
                    }))
                }
                if (SETTINGS.get("restoretabs")) {
                    if (Array.isArray(parsed.tabs)) {
                        parsed.tabs.forEach(t => addTab({
                            ...t,
                            "switchTo": false,
                            "lazy": s === "all" || s === "regular"
                        }))
                    }
                    if (Array.isArray(parsed.closed)) {
                        if (SETTINGS.get("keeprecentlyclosed")) {
                            recentlyClosed = parsed.closed
                        }
                    }
                } else if (SETTINGS.get("keeprecentlyclosed")) {
                    if (Array.isArray(parsed.tabs)) {
                        recentlyClosed = parsed.tabs
                    }
                    if (Array.isArray(parsed.closed)) {
                        recentlyClosed = parsed.closed.concat(recentlyClosed)
                    }
                }
                if (listTabs().length !== 0) {
                    switchToTab(parsed.id || 0)
                }
            }
            const startup = SETTINGS.get("startuppages")
            for (const tab of startup.split(",")) {
                openStartupPage(tab)
            }
        }
        ipcRenderer.on("urls", (_, pages) => {
            pages.forEach(page => {
                if (typeof page === "string") {
                    openStartupPage(page)
                } else {
                    openStartupPage(page.url, page.container)
                }
                if (page.script) {
                    configPreloads[page.container] = page.script
                }
            })
        })
        if (listTabs().length === 0 && !erwicMode) {
            if (parsed) {
                addTab()
            } else {
                // The very first startup with this datafolder, show help page
                addTab({"url": UTIL.specialPagePath("help")})
            }
        }
        // This forces the webview to update on sites which wait for the mouse
        // It will also enable the pointer events when in insert or pointer mode
        setInterval(() => {
            try {
                if (SETTINGS.get("mouse")) {
                    currentPage().style.pointerEvents = null
                } else {
                    currentPage().style.pointerEvents = "auto"
                    if (MODES.currentMode() === "insert") {
                        return
                    }
                    if (MODES.currentMode() === "pointer") {
                        return
                    }
                    setTimeout(() => {
                        listPages().forEach(page => {
                            page.style.pointerEvents = "none"
                        })
                    }, 10)
                }
            } catch (e) {
                // Page not available, retry later
            }
        }, 100)
        ipcRenderer.send("window-state-init",
            SETTINGS.get("restorewindowposition"),
            SETTINGS.get("restorewindowsize"),
            SETTINGS.get("restorewindowmaximize"))
    })
}

const openStartupPage = (url, container = false) => {
    if (!url.trim()) {
        return
    }
    if (!container) {
        container = SETTINGS.get("containerstartuppage")
    }
    return addTab({url, container})
}

const saveTabs = () => {
    const data = {"pinned": [], "tabs": [], "id": 0, "closed": []}
    // The list of tabs is ordered, the list of pages isn't
    // Pinned tabs are always saved to the file
    if (SETTINGS.get("keeprecentlyclosed")) {
        data.closed = JSON.parse(JSON.stringify(recentlyClosed))
    }
    if (SETTINGS.get("restoretabs")) {
        data.id = listTabs().indexOf(currentTab())
    }
    listTabs().forEach((tab, index) => {
        const url = UTIL.urlToString(tabOrPageMatching(tab).src)
        if (!url || url.startsWith("devtools://")) {
            if (index <= data.id) {
                data.id -= 1
            }
            return
        }
        const container = UTIL.urlToString(tabOrPageMatching(tab)
            .getAttribute("container"))
        if (tab.classList.contains("pinned")) {
            data.pinned.push({
                url, container, "muted": !!tab.getAttribute("muted")
            })
        } else if (SETTINGS.get("restoretabs")) {
            data.tabs.push({
                url, container, "muted": !!tab.getAttribute("muted")
            })
        } else if (SETTINGS.get("keeprecentlyclosed")) {
            data.closed.push({url, container})
        }
    })
    // Only keep the 100 most recently closed tabs,
    // more is probably never needed but would keep increasing the file size.
    data.closed = data.closed.slice(-100)
    UTIL.writeJSON(tabFile, data, "Failed to write current tabs to disk")
}

const listTabs = () => [...document.querySelectorAll("#tabs > span[link-id]")]

const listPages = () => [...document.querySelectorAll("#pages > .webview")]

const currentTab = () => document.getElementById("current-tab")

const currentPage = () => document.getElementById("current-page")

const addTab = options => {
    // Options: url, customIndex, switchTo, pinned, container,
    // lazy, muted and callback
    if (!options) {
        options = {}
    }
    if (options.switchTo === undefined) {
        options.switchTo = true
    }
    if (options.url?.startsWith("devtools://")) {
        return
    }
    if (options.url === "about:blank") {
        return
    }
    linkId += 1
    let currentPageId = null
    let currentPageLinkId = null
    let devtoolsOpen = false
    try {
        devtoolsOpen = currentPage().isDevToolsOpened()
        currentPageId = currentPage().getWebContentsId()
        currentPageLinkId = currentPage().getAttribute("link-id")
    } catch (e) {
        // Current page not ready, devtools won't be opened
    }
    let isDevtoolsTab = false
    if (options.devtools && currentPageId && currentPageLinkId) {
        const oldTab = listTabs().find(
            t => t.getAttribute("link-id") === currentPageLinkId)
        if (oldTab.getAttribute("devtools-id") || devtoolsOpen) {
            return
        }
        oldTab.setAttribute("devtools-id", linkId)
        isDevtoolsTab = true
    }
    let sessionName = SETTINGS.get("containernewtab")
    if (options.container) {
        sessionName = options.container
    }
    sessionName = sessionName.replace("%n", linkId)
    if (sessionName === "s:external") {
        const isSpecialPage = UTIL.pathToSpecialPageName(options.url || "").name
        if (isSpecialPage) {
            sessionName = "main"
        } else {
            if (/^https?:\/\//.test(options.url)) {
                shell.openExternal(options.url)
            }
            return
        }
    }
    if (sessionName === "s:replacematching" && options.url) {
        const match = listPages().find(p => UTIL.sameDomain(p.src, options.url))
        if (match) {
            switchToTab(listTabs().indexOf(tabOrPageMatching(match)))
        }
    }
    if (sessionName.startsWith("s:replace")) {
        if (options.url) {
            navigateTo(options.url)
        }
        return
    }
    if (sessionName === "s:usematching" && options.url) {
        const match = listPages().find(p => UTIL.sameDomain(p.src, options.url))
        if (match) {
            sessionName = match.getAttribute("container")
        }
    }
    if (sessionName.startsWith("s:use")) {
        sessionName = currentPage()?.getAttribute("container") || "main"
    }
    const tabs = document.getElementById("tabs")
    const pages = document.getElementById("pages")
    const tab = document.createElement("span")
    const favicon = document.createElement("img")
    const statusIcon = document.createElement("img")
    const title = document.createElement("span")
    if (options.pinned) {
        tab.classList.add("pinned")
    }
    tab.style.minWidth = `${SETTINGS.get("mintabwidth")}px`
    favicon.src = "img/empty.png"
    favicon.className = "favicon"
    statusIcon.src = "img/spinner.gif"
    statusIcon.className = "status"
    statusIcon.style.display = "none"
    title.textContent = "Newtab"
    tab.appendChild(favicon)
    tab.appendChild(statusIcon)
    tab.appendChild(title)
    if (options.customIndex !== undefined && currentTab()) {
        if (options.customIndex >= listTabs().length) {
            tabs.appendChild(tab)
        } else {
            let nextTab = listTabs()[options.customIndex]
            while (nextTab && nextTab.classList.contains("pinned")) {
                nextTab = nextTab.nextSibling
            }
            tabs.insertBefore(tab, nextTab)
        }
    } else if (SETTINGS.get("tabnexttocurrent") && currentTab()) {
        let nextTab = currentTab().nextSibling
        while (nextTab && nextTab.classList.contains("pinned")) {
            nextTab = nextTab.nextSibling
        }
        tabs.insertBefore(tab, nextTab)
    } else {
        tabs.appendChild(tab)
    }
    tab.setAttribute("link-id", linkId)
    const color = SETTINGS.get("containercolors").split(",").find(
        c => sessionName.match(c.split("~")[0]))
    if (color) {
        tab.style.color = color.split("~")[1]
    }
    const page = document.createElement("div")
    page.classList.add("webview")
    page.setAttribute("link-id", linkId)
    if (options.url) {
        page.src = UTIL.stringToUrl(options.url)
    }
    page.callback = options.callback
    page.setAttribute("container", sessionName)
    if (isDevtoolsTab) {
        page.setAttribute("devtools-for-id", currentPageId)
    }
    if (options.muted) {
        tab.setAttribute("muted", "muted")
        page.setAttribute("muted", "muted")
    }
    pages.appendChild(page)
    if (options.lazy) {
        const url = UTIL.stringToUrl(options.url)
        tab.setAttribute("suspended", "suspended")
        title.textContent = HISTORY.titleForPage(url) || url
        favicon.src = FAVICONS.forSite(url) || favicon.src
    } else {
        unsuspendPage(page)
    }
    if (options.switchTo) {
        switchToTab(listTabs().indexOf(tab))
    } else {
        PAGELAYOUT.applyLayout()
    }
}

const suspendTab = tab => {
    const page = tabOrPageMatching(tab)
    if (page.tagName?.toLowerCase() !== "webview") {
        return
    }
    if (tab.classList.contains("visible-tab")) {
        return
    }
    tab.setAttribute("suspended", "suspended")
    const placeholder = document.createElement("div")
    placeholder.classList.add("webview")
    ;["link-id", "container", "class", "id", "style", "muted"].forEach(attr => {
        if (page.getAttribute(attr)) {
            placeholder.setAttribute(attr, page.getAttribute(attr))
        }
    })
    placeholder.src = page.src
    page.replaceWith(placeholder)
    const closedDevtoolsId = tab.getAttribute("devtools-id")
    listTabs().forEach(t => {
        if (closedDevtoolsId === t.getAttribute("link-id")) {
            closeTab(listTabs().indexOf(t))
        }
    })
}

const unsuspendPage = page => {
    if (page.tagName?.toLowerCase() === "webview") {
        return
    }
    tabOrPageMatching(page).removeAttribute("suspended")
    const webview = document.createElement("webview")
    ;["link-id", "container", "class", "id", "style", "muted"].forEach(attr => {
        if (page.getAttribute(attr)) {
            webview.setAttribute(attr, page.getAttribute(attr))
        }
    })
    if (SETTINGS.get("spell")) {
        webview.setAttribute("webpreferences", "spellcheck=yes")
    }
    const sessionName = page.getAttribute("container")
    SESSIONS.create(sessionName)
    webview.setAttribute("partition", `persist:${sessionName}`)
    const currentPageId = Number(page.getAttribute("devtools-for-id") || 0) || 0
    const isDevtoolsTab = !!currentPageId
    if (isDevtoolsTab) {
        webview.src = "about:blank"
    } else {
        webview.src = UTIL.specialPagePath("newtab")
    }
    const url = page.src
    const callback = page.callback
    webview.addEventListener("dom-ready", () => {
        if (!webview.getAttribute("dom-ready")) {
            const tab = tabOrPageMatching(webview)
            const title = tab.querySelector("span")
            if (tab.getAttribute("muted")) {
                webview.setAudioMuted(true)
            }
            ipcRenderer.send("disable-localrtc", webview.getWebContentsId())
            ipcRenderer.send("insert-mode-listener", webview.getWebContentsId())
            addWebviewListeners(webview)
            webview.setUserAgent("")
            if (isDevtoolsTab) {
                ipcRenderer.send("add-devtools",
                    currentPageId, webview.getWebContentsId())
                title.textContent = "Devtools"
            } else if (url) {
                webview.src = url
                resetTabInfo(webview)
                title.textContent = url
                webview.clearHistory()
            }
            webview.setAttribute("dom-ready", true)
            if (callback) {
                callback(webview.getAttribute("link-id"))
            }
        }
    })
    page.replaceWith(webview)
}

const reopenTab = () => {
    if (recentlyClosed.length === 0 || listTabs().length === 0) {
        return
    }
    const restore = recentlyClosed.pop()
    restore.url = UTIL.stringToUrl(restore.url)
    if (!SETTINGS.get("containerkeeponreopen")) {
        restore.container = null
    }
    restore.customIndex = restore.index
    if (SETTINGS.get("tabreopenposition") === "left") {
        restore.customIndex = listTabs().indexOf(currentTab())
    }
    if (SETTINGS.get("tabreopenposition") === "right") {
        restore.customIndex = listTabs().indexOf(currentTab()) + 1
    }
    addTab(restore)
}

const closeTab = (index = null) => {
    const tab = listTabs()[index] || currentTab()
    const isClosingCurrent = tab === currentTab()
    const page = tabOrPageMatching(tab)
    if (!tab) {
        return
    }
    if (!SETTINGS.get("closablepinnedtabs")) {
        if (tab.classList.contains("pinned")) {
            return
        }
    }
    const url = UTIL.urlToString(page.src || "")
    const oldTabIdx = listTabs().indexOf(tab)
    if (SETTINGS.get("keeprecentlyclosed") && url) {
        recentlyClosed.push({
            url, "container": page.getAttribute("container"), "index": oldTabIdx
        })
    }
    const regularTab = listTabs().find(t => t.getAttribute("devtools-id")
        === tab.getAttribute("link-id"))
    if (regularTab) {
        regularTab.removeAttribute("devtools-id")
    }
    const closedDevtoolsId = tab.getAttribute("devtools-id")
    const isVisible = PAGELAYOUT.layoutDivById(tab.getAttribute("link-id"))
    const multiLayout = document.getElementById("pages")
        .classList.contains("multiple")
    if (isVisible && multiLayout) {
        PAGELAYOUT.hide(page, true)
    } else {
        tab.remove()
        page.remove()
        if (listTabs().length === 0) {
            if (SETTINGS.get("containernewtab").startsWith("s:")) {
                addTab({"container": "main"})
            } else {
                addTab()
            }
        }
        if (isClosingCurrent) {
            if (SETTINGS.get("tabclosefocusright")) {
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

const tabOrPageMatching = el => {
    if (listTabs().indexOf(el) !== -1) {
        return listPages().find(
            e => e.getAttribute("link-id") === el.getAttribute("link-id"))
    }
    if (listPages().indexOf(el) !== -1) {
        return listTabs().find(
            e => e.getAttribute("link-id") === el.getAttribute("link-id"))
    }
    return null
}

const switchToTab = index => {
    const tabs = listTabs()
    while (index < 0) {
        if (SETTINGS.get("tabcycle")) {
            index = tabs.length + index
        } else {
            index = 0
        }
    }
    while (tabs.length <= index) {
        if (SETTINGS.get("tabcycle")) {
            index -= tabs.length
        } else {
            index = tabs.length - 1
        }
    }
    const oldPage = currentPage()
    tabs.forEach(tab => {
        tab.id = ""
    })
    listPages().forEach(page => {
        page.id = ""
    })
    tabs[index].id = "current-tab"
    const page = tabOrPageMatching(tabs[index])
    page.id = "current-page"
    tabs[index].scrollIntoView({"inline": "center", "block": "center"})
    PAGELAYOUT.switchView(oldPage, currentPage())
    updateUrl(currentPage())
    saveTabs()
    unsuspendPage(page)
    MODES.setMode("normal")
    document.getElementById("url-hover").textContent = ""
    document.getElementById("url-hover").style.display = "none"
    SETTINGS.guiRelatedUpdate("tabbar")
    SETTINGS.updateContainerSettings(false)
}

const updateWindowTitle = () => {
    const appName = UTIL.title(UTIL.appName())
    if (SETTINGS.get("windowtitle") === "simple" || !currentPage()) {
        ipcRenderer.send("set-window-title", appName)
        return
    }
    const title = tabOrPageMatching(currentPage())
        .querySelector("span").textContent
    if (SETTINGS.get("windowtitle") === "title" || !currentPage().src) {
        ipcRenderer.send("set-window-title", `${appName} - ${title}`)
        return
    }
    let url = currentPage().src
    const specialPage = UTIL.pathToSpecialPageName(url)
    if (specialPage.name) {
        url = `${UTIL.appName()}://${specialPage.name}`
        if (specialPage.section) {
            url += `#${specialPage.section}`
        }
    }
    if (SETTINGS.get("windowtitle") === "url") {
        ipcRenderer.send("set-window-title", `${appName} - ${url}`)
        return
    }
    ipcRenderer.send("set-window-title", `${appName} - ${title} - ${url}`)
}

const updateUrl = (webview, force = false) => {
    const skip = ["command", "search", "explore"]
    if (webview !== currentPage() || !currentPage()) {
        return
    }
    updateWindowTitle()
    if (!force && skip.includes(MODES.currentMode())) {
        return
    }
    document.getElementById("url").value = UTIL.urlToString(currentPage().src)
}

const addWebviewListeners = webview => {
    webview.addEventListener("load-commit", e => {
        if (e.isMainFrame) {
            resetTabInfo(webview)
            if (SETTINGS.get("firefoxmode") === "google") {
                if (e.url.match(/^https:\/\/(.*\.)?google\.com.*$/)) {
                    webview.setUserAgent(UTIL.firefoxUseragent())
                } else {
                    webview.setUserAgent("")
                }
            }
            const title = tabOrPageMatching(webview).querySelector("span")
            if (!title.textContent) {
                title.textContent = e.url
            }
            const timeout = SETTINGS.get("requesttimeout")
            const id = webview.getAttribute("link-id")
            if (id) {
                clearTimeout(timeouts[id])
            }
            if (timeout) {
                timeouts[id] = setTimeout(() => {
                    try {
                        webview.stop()
                    } catch (_) {
                        // Webview might be destroyed or unavailable, no issue
                    }
                }, timeout)
            }
        }
    })
    webview.addEventListener("crashed", () => {
        tabOrPageMatching(webview).classList.add("crashed")
    })
    webview.addEventListener("close", () => {
        if (SETTINGS.get("permissionclosepage") === "allow") {
            closeTab(listTabs().indexOf(tabOrPageMatching(webview)))
        }
    })
    webview.addEventListener("media-started-playing", () => {
        const tab = tabOrPageMatching(webview)
        const counter = Number(tab.getAttribute("media-playing")) || 0
        tab.setAttribute("media-playing", counter + 1)
    })
    webview.addEventListener("media-paused", () => {
        const tab = tabOrPageMatching(webview)
        let counter = Number(tab.getAttribute("media-playing")) || 0
        counter -= 1
        if (counter < 1) {
            tab.removeAttribute("media-playing")
        } else {
            tab.setAttribute("media-playing", counter)
        }
    })
    webview.addEventListener("did-start-loading", () => {
        FAVICONS.loading(webview)
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
        const redirect = SETTINGS.get("redirecttohttp")
        const sslErrors = [
            "ERR_CERT_COMMON_NAME_INVALID",
            "ERR_SSL_PROTOCOL_ERROR",
            "ERR_CERT_AUTHORITY_INVALID"
        ]
        if (sslErrors.includes(e.errorDescription) && redirect) {
            webview.src = webview.src.replace("https://", "http://")
            return
        }
        if (webview.src !== e.validatedURL) {
            webview.src = e.validatedURL
            tabOrPageMatching(webview).querySelector("span")
                .textContent = e.validatedURL
            return
        }
        // If the path is a directory, show a list of files instead of an error
        if (e.errorDescription === "ERR_FILE_NOT_FOUND") {
            // Any number of slashes after file is fine for now
            if (webview.src.startsWith("file:/")) {
                const local = UTIL.stringToUrl(webview.src)
                    .replace(/file:\/*/, "/")
                if (UTIL.isDir(local)) {
                    let paths = []
                    let directoryAllowed = true
                    try {
                        paths = fs.readdirSync(local)
                            .map(p => path.join(local, p))
                    } catch (_) {
                        directoryAllowed = false
                    }
                    const dirs = paths.filter(p => UTIL.isDir(p))
                    const files = paths.filter(p => UTIL.isFile(p))
                    webview.send("insert-current-directory-files",
                        dirs, files, directoryAllowed, local)
                    return
                }
            }
        }
        webview.send("insert-failed-page-info", JSON.stringify(e))
        webview.setAttribute("failed-to-load", "true")
        webview.send("set-custom-styling", SETTINGS.get("fontsize"),
            SETTINGS.getCustomStyling())
    })
    webview.addEventListener("did-stop-loading", () => {
        FAVICONS.show(webview)
        updateUrl(webview)
        clearTimeout(timeouts[webview.getAttribute("link-id")])
        const specialPageName = UTIL.pathToSpecialPageName(webview.src).name
        const isLocal = webview.src.startsWith("file:/")
        const isErrorPage = webview.getAttribute("failed-to-load")
        if (specialPageName || isLocal || isErrorPage) {
            webview.send("set-custom-styling", SETTINGS.get("fontsize"),
                SETTINGS.getCustomStyling())
        }
        if (specialPageName === "help") {
            webview.send("settings", SETTINGS.settingsWithDefaults(),
                INPUT.listMappingsAsCommandList(false, true))
        }
        if (specialPageName === "notifications") {
            webview.send("notification-history", UTIL.listNotificationHistory())
        }
        saveTabs()
        const title = tabOrPageMatching(webview).querySelector("span")
        if (specialPageName) {
            title.textContent = UTIL.title(specialPageName)
            return
        }
        HISTORY.addToHist(webview.src)
        const existingTitle = HISTORY.titleForPage(webview.src)
        const titleHasFlaws = UTIL.hasProtocol(title.textContent)
            || title.textContent.startsWith("magnet:")
            || title.textContent.startsWith("mailto:")
        if (titleHasFlaws && existingTitle) {
            title.textContent = existingTitle
        } else {
            HISTORY.updateTitle(webview.src, title.textContent)
        }
        if (erwicMode) {
            const preload = configPreloads[webview.getAttribute("container")]
            if (preload) {
                const javascript = UTIL.readFile(preload)
                if (javascript) {
                    webview.executeJavaScript(javascript)
                }
            }
        }
    })
    webview.addEventListener("page-title-updated", e => {
        if (e.title.startsWith("magnet:") || e.title.startsWith("mailto:")) {
            return
        }
        const tab = tabOrPageMatching(webview)
        tab.querySelector("span").textContent = e.title
        updateUrl(webview)
        HISTORY.updateTitle(webview.src, tab.querySelector("span").textContent)
    })
    webview.addEventListener("page-favicon-updated", e => {
        FAVICONS.update(webview, e.favicons)
        updateUrl(webview)
    })
    webview.addEventListener("will-navigate", e => {
        ACTIONS.emptySearch()
        resetTabInfo(webview)
        tabOrPageMatching(webview).querySelector("span").textContent = e.url
    })
    webview.addEventListener("new-window", e => {
        if (e.disposition === "save-to-disk") {
            currentPage().downloadURL(e.url)
        } else if (e.disposition === "foreground-tab") {
            navigateTo(e.url)
        } else {
            addTab({
                "url": e.url, "switchTo": SETTINGS.get("mousenewtabswitch")
            })
        }
    })
    webview.addEventListener("enter-html-full-screen", () => {
        document.body.classList.add("fullscreen")
        webview.blur()
        webview.focus()
        webview.send("action", "focusTopLeftCorner")
        MODES.setMode("insert")
    })
    webview.addEventListener("leave-html-full-screen", () => {
        document.body.classList.remove("fullscreen")
        MODES.setMode("normal")
        PAGELAYOUT.applyLayout()
    })
    webview.addEventListener("ipc-message", e => {
        if (e.channel === "notify") {
            UTIL.notify(e.args[0], e.args[1])
        }
        if (e.channel.endsWith("-click-info") && webview !== currentPage()) {
            switchToTab(listTabs().indexOf(tabOrPageMatching(webview)))
        }
        if (e.channel === "context-click-info") {
            CONTEXTMENU.webviewMenu(e.args[0])
        }
        if (e.channel === "mouse-click-info") {
            CONTEXTMENU.clear()
            if (SETTINGS.get("mouse") && MODES.currentMode() !== "insert") {
                if (["pointer", "visual"].includes(MODES.currentMode())) {
                    if (e.args[0].tovisual) {
                        POINTER.startVisualSelect()
                    }
                    POINTER.move(e.args[0].x * currentPage().getZoomFactor(),
                        e.args[0].y * currentPage().getZoomFactor())
                } else if (e.args[0].toinsert) {
                    MODES.setMode("insert")
                } else if ("ces".includes(MODES.currentMode()[0])) {
                    MODES.setMode("normal")
                } else {
                    ACTIONS.setFocusCorrectly()
                }
            }
        }
        if (e.channel === "follow-response") {
            FOLLOW.parseAndDisplayLinks(e.args[0])
        }
        if (e.channel === "download-image") {
            const checkForValidUrl = e.args[1]
            if (!checkForValidUrl || UTIL.isUrl(e.args[0])) {
                currentPage().downloadURL(e.args[0])
            }
        }
        if (e.channel === "scroll-height-diff") {
            CONTEXTMENU.clear()
            POINTER.handleScrollDiffEvent(e.args[0])
        }
        if (e.channel === "history-list-request") {
            HISTORY.handleRequest(...e.args)
        }
        if (e.channel === "switch-to-insert") {
            MODES.setMode("insert")
        }
        if (e.channel === "navigate-to") {
            const url = e.args[0]
            webview.src = url
            tabOrPageMatching(webview).querySelector("span").textContent = url
        }
        if (e.channel === "new-tab-info-request") {
            const special = UTIL.pathToSpecialPageName(webview.src)
            if (special.name !== "newtab") {
                return
            }
            const favoritePages = SETTINGS.get("favoritepages").split(",")
                .filter(page => page).map(page => {
                    if (!UTIL.hasProtocol(page)) {
                        page = `https://${page}`
                    }
                    return {
                        "name": HISTORY.titleForPage(page)
                            || HISTORY.titleForPage(`${page}/`),
                        "url": UTIL.urlToString(page),
                        "icon": FAVICONS.forSite(page)
                            || FAVICONS.forSite(`${page}/`)
                    }
                })
            const topPages = HISTORY.suggestTopSites()
            if (SETTINGS.get("suggesttopsites") && topPages.length) {
                webview.send("insert-new-tab-info", topPages, favoritePages)
            } else if (favoritePages.length > 0) {
                webview.send("insert-new-tab-info", false, favoritePages)
            }
        }
        if (e.channel === "top-of-page-with-mouse") {
            SETTINGS.setTopOfPageWithMouse(e.args[0])
        }
    })
    webview.addEventListener("found-in-page", e => {
        webview.send("search-element-location", e.result.selectionArea)
    })
    webview.addEventListener("update-target-url", e => {
        const correctMode = ["insert", "pointer"].includes(MODES.currentMode())
        if (e.url && (correctMode || SETTINGS.get("mouse"))) {
            const special = UTIL.pathToSpecialPageName(e.url)
            if (!special.name) {
                document.getElementById("url-hover")
                    .textContent = UTIL.urlToString(e.url)
            } else if (special.section) {
                document.getElementById("url-hover").textContent
                    = `${UTIL.appName()}://${special.name}#${special.section}`
            } else {
                document.getElementById("url-hover")
                    .textContent = `${UTIL.appName()}://${special.name}`
            }
            document.getElementById("url-hover").style.display = "block"
        } else {
            document.getElementById("url-hover").textContent = ""
            document.getElementById("url-hover").style.display = "none"
        }
    })
    webview.onblur = () => {
        if (MODES.currentMode() === "insert") {
            webview.focus()
        }
    }
}

const resetTabInfo = webview => {
    webview.removeAttribute("failed-to-load")
    FAVICONS.empty(webview)
}

const navigateTo = location => {
    if (currentPage().isCrashed()) {
        return
    }
    if (currentPage().src.startsWith("devtools://")) {
        return
    }
    try {
        currentPage().stop()
    } catch (_) {
        // Webview might be destroyed or unavailable, no issue
    }
    currentPage().src = location
    resetTabInfo(currentPage())
    currentTab().querySelector("span").textContent = location
}

const moveTabForward = () => {
    const tabs = document.getElementById("tabs")
    if (!currentTab()?.nextSibling) {
        return
    }
    if (currentTab().classList.contains("pinned")) {
        if (!currentTab().nextSibling.classList.contains("pinned")) {
            return
        }
    }
    tabs.insertBefore(currentTab(), currentTab().nextSibling.nextSibling)
    currentTab().scrollIntoView({"inline": "center", "block": "center"})
}

const moveTabBackward = () => {
    const tabs = document.getElementById("tabs")
    if (listTabs().indexOf(currentTab()) <= 0) {
        return
    }
    if (!currentTab().classList.contains("pinned")) {
        if (currentTab().previousSibling.classList.contains("pinned")) {
            return
        }
    }
    tabs.insertBefore(currentTab(), currentTab().previousSibling)
    currentTab().scrollIntoView({"inline": "center", "block": "center"})
}

module.exports = {
    init,
    saveTabs,
    listTabs,
    listPages,
    currentTab,
    currentPage,
    addTab,
    suspendTab,
    reopenTab,
    closeTab,
    tabOrPageMatching,
    switchToTab,
    updateWindowTitle,
    updateUrl,
    resetTabInfo,
    navigateTo,
    moveTabForward,
    moveTabBackward
}
