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

const {ipcRenderer} = require("electron")
const {
    joinPath,
    appData,
    appIcon,
    readFile,
    readJSON,
    writeJSON,
    appName,
    isFile,
    isDir,
    listDir,
    specialPagePath,
    pathToSpecialPageName,
    urlToString,
    stringToUrl,
    firefoxUseragent,
    isUrl,
    hasProtocol,
    sameDomain,
    notify,
    title,
    listNotificationHistory
} = require("../util")
const {
    listTabs,
    listPages,
    currentTab,
    currentPage,
    tabOrPageMatching,
    currentMode,
    getSetting,
    guiRelatedUpdate,
    setTopOfPageWithMouse
} = require("./common")
const {setMode} = require("./modes")

let recentlyClosed = []
let linkId = 0
const timeouts = {}
const tabFile = joinPath(appData(), "tabs")
const erwicMode = isFile(joinPath(appData(), "erwicmode"))
const configPreloads = {}

const init = () => {
    window.addEventListener("load", () => {
        if (appIcon()) {
            document.getElementById("logo").src = appIcon()
        }

        // Make vertical scrolling move the tabs horizontally and vice versa
        document.getElementById("tabs").addEventListener("wheel", e => {
            document.getElementById("tabs").scrollBy(
                e.deltaX + e.deltaY, e.deltaX + e.deltaY)
            e.preventDefault()
        })

        const parsed = readJSON(tabFile)
        if (!erwicMode) {
            if (parsed) {
                const s = getSetting("suspendonrestore")
                if (Array.isArray(parsed.pinned)) {
                    parsed.pinned.forEach(t => addTab({
                        ...t,
                        "pinned": true,
                        "switchTo": false,
                        "lazy": s === "all"
                    }))
                }
                if (getSetting("restoretabs")) {
                    if (Array.isArray(parsed.tabs)) {
                        parsed.tabs.forEach(t => addTab({
                            ...t,
                            "switchTo": false,
                            "lazy": s === "all" || s === "regular"
                        }))
                    }
                    if (Array.isArray(parsed.closed)) {
                        if (getSetting("keeprecentlyclosed")) {
                            recentlyClosed = parsed.closed
                        }
                    }
                } else if (getSetting("keeprecentlyclosed")) {
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
            const startup = getSetting("startuppages")
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
                addTab({"url": specialPagePath("help")})
            }
        }
        // This forces the webview to update on sites which wait for the mouse
        // It will also enable the pointer events when in insert or pointer mode
        setInterval(() => {
            try {
                if (getSetting("mouse")) {
                    currentPage().style.pointerEvents = null
                } else {
                    currentPage().style.pointerEvents = "auto"
                    if (currentMode() === "insert") {
                        return
                    }
                    if (currentMode() === "pointer") {
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
            getSetting("restorewindowposition"),
            getSetting("restorewindowsize"),
            getSetting("restorewindowmaximize"))
    })
}

const openStartupPage = (url, container = false) => {
    if (!url.trim()) {
        return
    }
    if (!container) {
        container = getSetting("containerstartuppage")
    }
    return addTab({url, container})
}

const saveTabs = () => {
    const data = {"pinned": [], "tabs": [], "id": 0, "closed": []}
    // The list of tabs is ordered, the list of pages isn't
    // Pinned tabs are always saved to the file
    if (getSetting("keeprecentlyclosed")) {
        data.closed = JSON.parse(JSON.stringify(recentlyClosed))
    }
    if (getSetting("restoretabs")) {
        data.id = listTabs().indexOf(currentTab())
    }
    listTabs().forEach((tab, index) => {
        const url = urlToString(tabOrPageMatching(tab).src)
        if (!url || url.startsWith("devtools://")) {
            if (index <= data.id) {
                data.id -= 1
            }
            return
        }
        const container = urlToString(tabOrPageMatching(tab)
            .getAttribute("container"))
        if (tab.classList.contains("pinned")) {
            data.pinned.push({
                url, container, "muted": !!tab.getAttribute("muted")
            })
        } else if (getSetting("restoretabs")) {
            data.tabs.push({
                url, container, "muted": !!tab.getAttribute("muted")
            })
        } else if (getSetting("keeprecentlyclosed")) {
            data.closed.push({url, container})
        }
    })
    // Only keep the 100 most recently closed tabs,
    // more is probably never needed but would keep increasing the file size.
    data.closed = data.closed.slice(-100)
    writeJSON(tabFile, data, "Failed to write current tabs to disk")
}

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
    let sessionName = getSetting("containernewtab")
    if (options.container) {
        sessionName = options.container
    }
    sessionName = sessionName.replace("%n", linkId)
    if (sessionName === "s:external") {
        const isSpecialPage = pathToSpecialPageName(options.url || "").name
        if (isSpecialPage) {
            sessionName = "main"
        } else {
            if (/^https?:\/\//.test(options.url)) {
                const {shell} = require("electron")
                shell.openExternal(options.url)
            }
            return
        }
    }
    if (sessionName === "s:replacematching" && options.url) {
        const match = listPages().find(p => sameDomain(p.src, options.url))
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
        const match = listPages().find(p => sameDomain(p.src, options.url))
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
    tab.appendChild(favicon)
    tab.appendChild(statusIcon)
    tab.appendChild(name)
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
    } else if (getSetting("tabnexttocurrent") && currentTab()) {
        let nextTab = currentTab().nextSibling
        while (nextTab && nextTab.classList.contains("pinned")) {
            nextTab = nextTab.nextSibling
        }
        tabs.insertBefore(tab, nextTab)
    } else {
        tabs.appendChild(tab)
    }
    tab.setAttribute("link-id", linkId)
    const color = getSetting("containercolors").split(",").find(
        c => sessionName.match(c.split("~")[0]))
    if (color) {
        tab.style.color = color.split("~")[1]
    }
    const page = document.createElement("div")
    page.classList.add("webview")
    page.setAttribute("link-id", linkId)
    if (options.url) {
        page.src = stringToUrl(options.url)
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
        const url = stringToUrl(options.url)
        tab.setAttribute("suspended", "suspended")
        const {titleForPage} = require("./history")
        name.textContent = titleForPage(url) || url
        const {forSite} = require("./favicons")
        favicon.src = forSite(url) || favicon.src
    } else {
        unsuspendPage(page)
    }
    if (options.switchTo) {
        switchToTab(listTabs().indexOf(tab))
    } else {
        const {applyLayout} = require("./pagelayout")
        applyLayout()
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
    webview.setAttribute("webpreferences", "spellcheck=yes")
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
    const url = page.src
    const callback = page.callback
    webview.addEventListener("dom-ready", () => {
        if (!webview.getAttribute("dom-ready")) {
            const tab = tabOrPageMatching(webview)
            const name = tab.querySelector("span")
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
                name.textContent = "Devtools"
            } else if (url) {
                webview.src = url
                resetTabInfo(webview)
                name.textContent = url
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
    restore.url = stringToUrl(restore.url)
    if (!getSetting("containerkeeponreopen")) {
        restore.container = null
    }
    restore.customIndex = restore.index
    if (getSetting("tabreopenposition") === "left") {
        restore.customIndex = listTabs().indexOf(currentTab())
    }
    if (getSetting("tabreopenposition") === "right") {
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
    if (!getSetting("closablepinnedtabs")) {
        if (tab.classList.contains("pinned")) {
            return
        }
    }
    const url = urlToString(page.src || "")
    const oldTabIdx = listTabs().indexOf(tab)
    if (getSetting("keeprecentlyclosed") && url) {
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
    const {layoutDivById, hide} = require("./pagelayout")
    const isVisible = layoutDivById(tab.getAttribute("link-id"))
    const multiLayout = document.getElementById("pages")
        .classList.contains("multiple")
    if (isVisible && multiLayout) {
        hide(page, true)
    } else {
        tab.remove()
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

const switchToTab = index => {
    if (document.body.classList.contains("fullscreen")) {
        currentPage().send("action", "exitFullscreen")
    }
    const tabs = listTabs()
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
    const {switchView, setLastUsedTab} = require("./pagelayout")
    switchView(oldPage, currentPage())
    updateUrl(currentPage())
    saveTabs()
    unsuspendPage(page)
    setMode("normal")
    document.getElementById("url-hover").textContent = ""
    document.getElementById("url-hover").style.display = "none"
    guiRelatedUpdate("tabbar")
    const {updateContainerSettings} = require("./settings")
    updateContainerSettings(false)
    setLastUsedTab(oldPage?.getAttribute("link-id"))
}

const updateUrl = (webview, force = false) => {
    if (webview !== currentPage() || !currentPage()) {
        return
    }
    const {updateWindowTitle} = require("./settings")
    updateWindowTitle()
    if (!force && "sec".includes(currentMode()[0])) {
        return
    }
    document.getElementById("url").value = urlToString(currentPage().src)
}

const addWebviewListeners = webview => {
    webview.addEventListener("load-commit", e => {
        if (e.isMainFrame) {
            resetTabInfo(webview)
            if (getSetting("firefoxmode") === "google") {
                if (e.url.match(/^https:\/\/(.*\.)?google\.com.*$/)) {
                    webview.setUserAgent(firefoxUseragent())
                } else {
                    webview.setUserAgent("")
                }
            }
            const name = tabOrPageMatching(webview).querySelector("span")
            if (!name.textContent) {
                name.textContent = e.url
            }
            const timeout = getSetting("requesttimeout")
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
        if (getSetting("permissionclosepage") === "allow") {
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
        const redirect = getSetting("redirecttohttp")
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
                let local = urlToString(webview.src).replace(/file:\/*/, "/")
                if (process.platform === "win32") {
                    local = urlToString(webview.src).replace(/file:\/*/, "")
                }
                if (isDir(local)) {
                    let directoryAllowed = true
                    let paths = listDir(local)
                    if (paths) {
                        paths = paths.map(p => joinPath(local, p))
                    } else {
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
        webview.send("insert-failed-page-info", JSON.stringify(e))
        webview.setAttribute("failed-to-load", "true")
        const {getCustomStyling} = require("./settings")
        webview.send("set-custom-styling", getSetting("fontsize"),
            getCustomStyling())
    })
    webview.addEventListener("did-stop-loading", () => {
        const {show} = require("./favicons")
        show(webview)
        updateUrl(webview)
        clearTimeout(timeouts[webview.getAttribute("link-id")])
        const specialPageName = pathToSpecialPageName(webview.src).name
        const isLocal = webview.src.startsWith("file:/")
        const isErrorPage = webview.getAttribute("failed-to-load")
        if (specialPageName || isLocal || isErrorPage) {
            const {getCustomStyling} = require("./settings")
            webview.send("set-custom-styling", getSetting("fontsize"),
                getCustomStyling())
        }
        if (specialPageName === "help") {
            const {listMappingsAsCommandList} = require("./input")
            const {settingsWithDefaults} = require("./settings")
            webview.send("settings", settingsWithDefaults(),
                listMappingsAsCommandList(false, true))
        }
        if (specialPageName === "notifications") {
            webview.send("notification-history", listNotificationHistory())
        }
        saveTabs()
        const name = tabOrPageMatching(webview).querySelector("span")
        if (specialPageName) {
            name.textContent = title(specialPageName)
            return
        }
        const {addToHist, titleForPage, updateTitle} = require("./history")
        addToHist(webview.src)
        const existingTitle = titleForPage(webview.src)
        const titleHasFlaws = hasProtocol(name.textContent)
            || name.textContent.startsWith("magnet:")
            || name.textContent.startsWith("mailto:")
        if (titleHasFlaws && existingTitle) {
            name.textContent = existingTitle
        } else {
            updateTitle(webview.src, name.textContent)
        }
        if (erwicMode) {
            const preload = configPreloads[webview.getAttribute("container")]
            if (preload) {
                const javascript = readFile(preload)
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
        const {updateTitle} = require("./history")
        updateTitle(webview.src, tab.querySelector("span").textContent)
    })
    webview.addEventListener("page-favicon-updated", e => {
        const {update} = require("./favicons")
        update(webview, e.favicons)
        updateUrl(webview)
    })
    webview.addEventListener("will-navigate", e => {
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
                "url": e.url, "switchTo": getSetting("mousenewtabswitch")
            })
        }
    })
    webview.addEventListener("enter-html-full-screen", () => {
        if (currentPage() !== webview) {
            switchToTab(listTabs().indexOf(tabOrPageMatching(webview)))
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
        const {webviewMenu, "clear": clearMenu} = require("./contextmenu")
        const {
            startVisualSelect, "move": movePointer, handleScrollDiffEvent
        } = require("./pointer")
        if (e.channel === "notify") {
            notify(e.args[0], e.args[1])
        }
        if (e.channel.endsWith("-click-info") && webview !== currentPage()) {
            switchToTab(listTabs().indexOf(tabOrPageMatching(webview)))
        }
        if (e.channel === "context-click-info") {
            webviewMenu(e.args[0])
        }
        if (e.channel === "mouse-click-info") {
            clearMenu()
            if (getSetting("mouse") && currentMode() !== "insert") {
                if (["pointer", "visual"].includes(currentMode())) {
                    if (e.args[0].tovisual) {
                        startVisualSelect()
                    }
                    movePointer(e.args[0].x * currentPage().getZoomFactor(),
                        e.args[0].y * currentPage().getZoomFactor())
                } else if (e.args[0].toinsert) {
                    setMode("insert")
                } else if ("ces".includes(currentMode()[0])) {
                    setMode("normal")
                } else {
                    const {setFocusCorrectly} = require("./actions")
                    setFocusCorrectly()
                }
            }
        }
        if (e.channel === "follow-response") {
            const {parseAndDisplayLinks} = require("./follow")
            parseAndDisplayLinks(e.args[0])
        }
        if (e.channel === "download-image") {
            const checkForValidUrl = e.args[1]
            if (!checkForValidUrl || isUrl(e.args[0])) {
                currentPage().downloadURL(e.args[0])
            }
        }
        if (e.channel === "scroll-height-diff") {
            clearMenu()
            handleScrollDiffEvent(e.args[0])
        }
        if (e.channel === "history-list-request") {
            const {handleRequest} = require("./history")
            handleRequest(webview, ...e.args)
        }
        if (e.channel === "switch-to-insert") {
            setMode("insert")
        }
        if (e.channel === "navigate-to") {
            const url = e.args[0]
            webview.src = url
            tabOrPageMatching(webview).querySelector("span").textContent = url
        }
        if (e.channel === "new-tab-info-request") {
            const special = pathToSpecialPageName(webview.src)
            if (special.name !== "newtab") {
                return
            }
            const {forSite} = require("./favicons")
            const {suggestTopSites, titleForPage} = require("./history")
            const favoritePages = getSetting("favoritepages").split(",")
                .filter(page => page).map(page => {
                    if (!hasProtocol(page)) {
                        page = `https://${page}`
                    }
                    return {
                        "name": titleForPage(page) || titleForPage(`${page}/`),
                        "url": urlToString(page),
                        "icon": forSite(page) || forSite(`${page}/`)
                    }
                })
            const topPages = suggestTopSites()
            if (getSetting("suggesttopsites") && topPages.length) {
                webview.send("insert-new-tab-info", topPages, favoritePages)
            } else if (favoritePages.length > 0) {
                webview.send("insert-new-tab-info", false, favoritePages)
            }
        }
        if (e.channel === "top-of-page-with-mouse") {
            setTopOfPageWithMouse(e.args[0])
        }
    })
    webview.addEventListener("found-in-page", e => {
        webview.send("search-element-location", e.result.selectionArea)
    })
    webview.addEventListener("update-target-url", e => {
        const correctMode = ["insert", "pointer"].includes(currentMode())
        if (e.url && (correctMode || getSetting("mouse"))) {
            const special = pathToSpecialPageName(e.url)
            if (!special.name) {
                document.getElementById("url-hover")
                    .textContent = urlToString(e.url)
            } else if (special.section) {
                document.getElementById("url-hover").textContent
                    = `${appName()}://${special.name}#${special.section}`
            } else {
                document.getElementById("url-hover")
                    .textContent = `${appName()}://${special.name}`
            }
            document.getElementById("url-hover").style.display = "block"
        } else {
            document.getElementById("url-hover").textContent = ""
            document.getElementById("url-hover").style.display = "none"
        }
    })
    webview.onblur = () => {
        if (currentMode() === "insert") {
            webview.focus()
        }
    }
}

const resetTabInfo = webview => {
    webview.removeAttribute("failed-to-load")
    const {empty} = require("./favicons")
    empty(webview)
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
    addTab,
    suspendTab,
    reopenTab,
    closeTab,
    tabOrPageMatching,
    switchToTab,
    updateUrl,
    resetTabInfo,
    navigateTo,
    moveTabForward,
    moveTabBackward
}
