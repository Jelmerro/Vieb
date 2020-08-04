/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2020 Jelmer van Arnhem
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
/* global ACTIONS POINTER FAVICONS FOLLOW HISTORY INPUT MODES
 PAGELAYOUT SESSIONS SETTINGS UTIL */
"use strict"

const fs = require("fs")
const path = require("path")
const {ipcRenderer} = require("electron")

let recentlyClosed = []
let linkId = 0
const timeouts = {}
const tabFile = path.join(UTIL.appData(), "tabs")

const init = () => {
    window.addEventListener("load", () => {
        const parsed = UTIL.readJSON(tabFile)
        if (parsed) {
            if (Array.isArray(parsed.pinned)) {
                parsed.pinned.forEach(tab => openSavedPage(tab, true))
            }
            if (SETTINGS.get("restoretabs")) {
                if (Array.isArray(parsed.tabs)) {
                    parsed.tabs.forEach(tab => openSavedPage(tab))
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
            const specialPage = UTIL.pathToSpecialPageName(tab)
            if (specialPage.name) {
                openSavedPage(UTIL.specialPagePath(
                    specialPage.name, specialPage.section))
            } else if (UTIL.isUrl(tab)) {
                openSavedPage(tab)
            }
        }
        if (listTabs().length === 0) {
            if (parsed) {
                addTab()
            } else {
                // The very first startup with this data folder, show help page
                addTab({"url": UTIL.specialPagePath("help")})
            }
        }
        ipcRenderer.on("urls", (_, urls) => {
            urls.forEach(openSavedPage)
        })
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

const openSavedPage = (url, pinned = false) => {
    if (!url.trim()) {
        return
    }
    url = UTIL.stringToUrl(url.trim())
    try {
        if (UTIL.pathToSpecialPageName(currentPage().src).name === "newtab") {
            if (!currentPage().isLoading()) {
                navigateTo(url)
                if (pinned) {
                    currentTab().classList.add("pinned")
                }
                return
            }
        }
    } catch (e) {
        // Current page not ready yet, open in new tab instead
    }
    addTab({url, pinned})
}

const saveTabs = () => {
    const data = {"pinned": [], "tabs": [], "id": 0, "closed": []}
    // The list of tabs is ordered, the list of pages isn't
    // Pinned tabs are always saved to the file
    if (SETTINGS.get("keeprecentlyclosed")) {
        data.closed = recentlyClosed
    }
    if (SETTINGS.get("restoretabs")) {
        data.id = listTabs().indexOf(currentTab())
    }
    listTabs().forEach(tab => {
        const url = UTIL.urlToString(tabOrPageMatching(tab).src)
        if (tab.classList.contains("pinned")) {
            data.pinned.push(url)
        } else if (SETTINGS.get("restoretabs")) {
            data.tabs.push(url)
        } else if (SETTINGS.get("keeprecentlyclosed")) {
            data.closed.push(url)
        }
    })
    // Only keep the 100 most recently closed tabs,
    // more is probably never needed but would keep increasing the file size.
    data.closed = data.closed.slice(-100)
    UTIL.writeJSON(tabFile, data, "Failed to write current tabs to disk")
}

const listTabs = () => [...document.querySelectorAll("#tabs > span[link-id]")]

const listPages = () => [...document.querySelectorAll("#pages > webview")]

const currentTab = () => document.getElementById("current-tab")

const currentPage = () => document.getElementById("current-page")

const addTab = options => {
    // Valid options are: url, inverted, switchTo, pinned and callback
    if (!options) {
        options = {}
    }
    if (options.switchTo === undefined) {
        options.switchTo = true
    }
    let addNextToCurrent = SETTINGS.get("tabnexttocurrent")
    addNextToCurrent = addNextToCurrent && listTabs().length > 0
    if (options.inverted) {
        addNextToCurrent = !addNextToCurrent
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
    tab.addEventListener("mouseup", e => {
        if (e.button === 1) {
            const currentlyOpenendTab = currentTab()
            MODES.setMode("normal")
            if (tab === currentlyOpenendTab) {
                closeTab()
            } else {
                switchToTab(listTabs().indexOf(tab))
                closeTab()
                switchToTab(listTabs().indexOf(currentlyOpenendTab))
            }
        } else {
            switchToTab(listTabs().indexOf(tab))
        }
    })
    favicon.src = "img/empty.png"
    favicon.className = "favicon"
    statusIcon.src = "img/spinner.gif"
    statusIcon.className = "status"
    statusIcon.style.display = "none"
    title.textContent = "Newtab"
    tab.appendChild(favicon)
    tab.appendChild(statusIcon)
    tab.appendChild(title)
    if (addNextToCurrent) {
        let nextTab = currentTab().nextSibling
        while (nextTab && nextTab.classList.contains("pinned")) {
            nextTab = nextTab.nextSibling
        }
        tabs.insertBefore(tab, nextTab)
    } else {
        tabs.appendChild(tab)
    }
    const webview = document.createElement("webview")
    webview.setAttribute("link-id", linkId)
    tab.setAttribute("link-id", linkId)
    if (SETTINGS.get("spell")) {
        webview.setAttribute("webpreferences", "spellcheck=yes")
    }
    let sessionName = "persist:main"
    if (SETTINGS.get("containertabs")) {
        sessionName = `persist:container${linkId}`
        tab.classList.add("container")
    }
    SESSIONS.create(sessionName)
    webview.setAttribute("partition", sessionName)
    linkId += 1
    pages.appendChild(webview)
    if (options.switchTo) {
        switchToTab(listTabs().indexOf(tab))
    }
    webview.src = UTIL.specialPagePath("newtab")
    webview.addEventListener("dom-ready", () => {
        if (!webview.getAttribute("dom-ready")) {
            ipcRenderer.send("disable-localrtc", webview.getWebContentsId())
            ipcRenderer.send("insert-mode-listener", webview.getWebContentsId())
            addWebviewListeners(webview)
            webview.setUserAgent("")
            if (options.url) {
                webview.src = options.url
                resetTabInfo(webview)
                title.textContent = options.url
            }
            webview.setAttribute("dom-ready", true)
            if (options.callback) {
                options.callback(webview.getAttribute("link-id"))
            }
        }
    })
}

const reopenTab = () => {
    if (recentlyClosed.length === 0) {
        return
    }
    addTab({"url": UTIL.stringToUrl(recentlyClosed.pop())})
}

const closeTab = () => {
    if (currentPage().src && UTIL.urlToString(currentPage().src)) {
        recentlyClosed.push(UTIL.urlToString(currentPage().src))
    }
    const oldTabIndex = listTabs().indexOf(currentTab())
    if (document.getElementById("pages").classList.contains("multiple")) {
        PAGELAYOUT.hide(currentPage(), true)
        return
    }
    document.getElementById("tabs").removeChild(currentTab())
    document.getElementById("pages").removeChild(currentPage())
    if (listTabs().length === 0) {
        addTab()
    }
    if (oldTabIndex === 0) {
        switchToTab(0)
    } else {
        switchToTab(oldTabIndex - 1)
    }
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
    if (index < 0) {
        if (SETTINGS.get("tabcycle")) {
            index = tabs.length + index
        } else {
            index = 0
        }
    }
    if (tabs.length <= index) {
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
    tabOrPageMatching(tabs[index]).id = "current-page"
    tabs[index].scrollIntoView({"inline": "center"})
    PAGELAYOUT.switchView(oldPage, currentPage())
    updateUrl(currentPage())
    saveTabs()
    MODES.setMode("normal")
    document.getElementById("url-hover").textContent = ""
    document.getElementById("url-hover").style.display = "none"
    SETTINGS.guiRelatedUpdate("tabbar")
}

const updateWindowTitle = () => {
    if (SETTINGS.get("windowtitle") === "simple" || !currentPage()) {
        ipcRenderer.send("set-window-title", "Vieb")
        return
    }
    const title = tabOrPageMatching(currentPage())
        .querySelector("span").textContent
    if (SETTINGS.get("windowtitle") === "title" || !currentPage().src) {
        ipcRenderer.send("set-window-title", `Vieb - ${title}`)
        return
    }
    let url = currentPage().src
    const specialPage = UTIL.pathToSpecialPageName(url)
    if (specialPage.name) {
        url = `vieb://${specialPage.name}`
        if (specialPage.section) {
            url += `#${specialPage.section}`
        }
    }
    if (SETTINGS.get("windowtitle") === "url") {
        ipcRenderer.send("set-window-title", `Vieb - ${url}`)
        return
    }
    ipcRenderer.send("set-window-title", `Vieb - ${title} - ${url}`)
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
                if (e.url.match(/https:\/\/(.*\.)?google\.com.*/)) {
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
            if (webview.getAttribute("link-id") && timeout >= 1000) {
                clearTimeout(timeouts[webview.getAttribute("link-id")])
                timeouts[webview.getAttribute("link-id")] = setTimeout(() => {
                    try {
                        webview.stop()
                    } catch (_) {
                        // Webview might be destroyed or unavailable, no issue
                    }
                }, timeout)
            }
        }
    })
    const mouseClickInWebview = e => {
        if (MODES.currentMode() !== "insert") {
            if (SETTINGS.get("mouse")) {
                const modesWithTyping = ["command", "explore", "search"]
                if (["pointer", "visual"].includes(MODES.currentMode())) {
                    if (e.tovisual) {
                        POINTER.startVisualSelect()
                    }
                    if (e.x && e.y) {
                        POINTER.move(e.x * currentPage().getZoomFactor(),
                            e.y * currentPage().getZoomFactor())
                    }
                } else if (e.toinsert) {
                    MODES.setMode("insert")
                } else if (modesWithTyping.includes(MODES.currentMode())) {
                    MODES.setMode("normal")
                } else {
                    ACTIONS.setFocusCorrectly()
                }
            } else {
                webview.blur()
            }
        }
        if (webview !== currentPage()) {
            switchToTab(listTabs().indexOf(tabOrPageMatching(webview)))
        }
    }
    webview.addEventListener("focus", mouseClickInWebview)
    webview.addEventListener("crashed", () => {
        tabOrPageMatching(webview).classList.add("crashed")
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
                const local = decodeURIComponent(webview.src)
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
        webview.send("fontsize", SETTINGS.get("fontsize"))
    })
    webview.addEventListener("did-stop-loading", () => {
        FAVICONS.show(webview)
        updateUrl(webview)
        clearTimeout(timeouts[webview.getAttribute("link-id")])
        const specialPageName = UTIL.pathToSpecialPageName(webview.src).name
        const isLocal = webview.src.startsWith("file:/")
        const isErrorPage = webview.getAttribute("failed-to-load")
        if (specialPageName || isLocal || isErrorPage) {
            webview.send("fontsize", SETTINGS.get("fontsize"))
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
        if (e.channel === "mouse-click-info") {
            mouseClickInWebview(e.args[0])
        }
        if (e.channel === "follow-response") {
            FOLLOW.parseAndDisplayLinks(e.args[0])
        }
        if (e.channel === "download-image") {
            const checkForValidUrl = e.args[1]
            if (checkForValidUrl) {
                if (UTIL.isUrl(e.args[0])) {
                    currentPage().downloadURL(e.args[0])
                }
            } else {
                currentPage().downloadURL(e.args[0])
            }
        }
        if (e.channel === "scroll-height-diff") {
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
                document.getElementById("url-hover")
                    .textContent = `vieb://${special.name}#${special.section}`
            } else {
                document.getElementById("url-hover")
                    .textContent = `vieb://${special.name}`
            }
            document.getElementById("url-hover").style.display = "flex"
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
    currentPage().src = location
    resetTabInfo(currentPage())
    currentTab().querySelector("span").textContent = location
}

const moveTabForward = () => {
    const tabs = document.getElementById("tabs")
    if (!currentTab().nextSibling) {
        return
    }
    if (currentTab().classList.contains("pinned")) {
        if (!currentTab().nextSibling.classList.contains("pinned")) {
            return
        }
    }
    tabs.insertBefore(currentTab(), currentTab().nextSibling.nextSibling)
    currentTab().scrollIntoView({"inline": "center"})
}

const moveTabBackward = () => {
    const tabs = document.getElementById("tabs")
    if (listTabs().indexOf(currentTab()) === 0) {
        return
    }
    if (!currentTab().classList.contains("pinned")) {
        if (currentTab().previousSibling.classList.contains("pinned")) {
            return
        }
    }
    tabs.insertBefore(currentTab(), currentTab().previousSibling)
    currentTab().scrollIntoView({"inline": "center"})
}

module.exports = {
    init,
    saveTabs,
    listTabs,
    listPages,
    currentTab,
    currentPage,
    addTab,
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
