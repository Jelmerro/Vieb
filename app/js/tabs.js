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
/* global ACTIONS CURSOR DOWNLOADS FAVICONS FOLLOW HISTORY INPUT MODES SESSIONS
 SETTINGS UTIL */
"use strict"

const fs = require("fs")
const path = require("path")
const {ipcRenderer, remote} = require("electron")

let recentlyClosed = []
let linkId = 0

const useragent = remote.session.defaultSession.getUserAgent()
    .replace(/Electron\/\S* /, "").replace(/Vieb\/\S* /, "")
const tabFile = path.join(remote.app.getPath("appData"), "tabs")

const init = () => {
    window.addEventListener("load", () => {
        const startup = SETTINGS.get("tabs.startup")
        const parsed = UTIL.readJSON(tabFile)
        for (const tab of startup) {
            const specialPage = UTIL.pathToSpecialPageName(tab)
            if (specialPage.name) {
                addTab(UTIL.specialPagePath(
                    specialPage.name, specialPage.section))
                parsed.id += 1
            } else if (UTIL.isUrl(tab)) {
                addTab(tab)
                parsed.id += 1
            }
        }
        if (parsed) {
            if (SETTINGS.get("tabs.restore")) {
                if (Array.isArray(parsed.tabs)) {
                    parsed.tabs.forEach(tab => {
                        addTab(tab)
                    })
                    if (listTabs().length !== 0) {
                        switchToTab(parsed.id || 0)
                    }
                }
                if (Array.isArray(parsed.closed)) {
                    recentlyClosed = parsed.closed
                }
            } else if (SETTINGS.get("tabs.keepRecentlyClosed")) {
                if (Array.isArray(parsed.tabs)) {
                    recentlyClosed = parsed.tabs
                }
                if (Array.isArray(parsed.closed)) {
                    recentlyClosed = parsed.closed.concat(recentlyClosed)
                }
            } else {
                UTIL.deleteFile(tabFile)
            }
        }
        if (listTabs().length === 0) {
            if (parsed) {
                addTab()
            } else {
                // Probably first startup ever (no configured or stored pages)
                addTab(UTIL.specialPagePath("help"))
            }
        }
        ipcRenderer.on("urls", (_, urls) => {
            urls.forEach(url => {
                if (!UTIL.hasProtocol(url)) {
                    const local = UTIL.expandPath(url)
                    if (path.isAbsolute(local) && UTIL.pathExists(local)) {
                        // File protocol locations should always have 3 slashes
                        url = `file:${local}`.replace(/^file:\/*/, "file:///")
                    } else {
                        url = `https://${url}`
                    }
                }
                const special = UTIL.pathToSpecialPageName(currentPage().src)
                if (special.name === "newtab" || !currentPage().src) {
                    navigateTo(url)
                } else {
                    addTab(url)
                }
            })
        })
        // This forces the webview to update on sites which wait for the mouse
        // It will also enable the pointer events when in insert or cursor mode
        setInterval(() => {
            currentPage().style.pointerEvents = "auto"
            if (MODES.currentMode() === "insert") {
                return
            }
            if (MODES.currentMode() === "cursor") {
                return
            }
            setTimeout(() => {
                listPages().forEach(page => {
                    page.style.pointerEvents = "none"
                })
            }, 10)
        }, 100)
    })
}

const saveTabs = () => {
    const data = {
        "tabs": [],
        "id": 0,
        "closed": []
    }
    if (SETTINGS.get("tabs.restore")) {
        listTabs().forEach(tab => {
            // The list of tabs is ordered, the list of pages isn't
            const webview = tabOrPageMatching(tab)
            if (!UTIL.pathToSpecialPageName(webview.src).name && webview.src) {
                data.tabs.push(webview.src)
                if (webview.style.display === "flex") {
                    data.id = data.tabs.length - 1
                }
            }
        })
        if (SETTINGS.get("tabs.keepRecentlyClosed")) {
            data.closed = recentlyClosed
        }
    } else if (SETTINGS.get("tabs.keepRecentlyClosed")) {
        data.closed = [...recentlyClosed]
        listTabs().forEach(tab => {
            // The list of tabs is ordered, the list of pages isn't
            const webview = tabOrPageMatching(tab)
            if (!UTIL.pathToSpecialPageName(webview.src).name && webview.src) {
                data.closed.push(webview.src)
            }
        })
    } else {
        UTIL.deleteFile(tabFile)
        return
    }
    // Only keep the 100 most recently closed tabs,
    // More is probably never needed but would keep increasing the file size.
    data.closed = data.closed.slice(-100)
    UTIL.writeJSON(tabFile, data, "Failed to write current tabs to disk")
}

const listTabs = () => {
    return [...document.querySelectorAll("#tabs > span[link-id]")]
}

const listPages = () => {
    return [...document.querySelectorAll("#pages > webview")]
}

const currentTab = () => {
    return document.getElementById("current-tab")
}

const currentPage = () => {
    let currentPageElement = null
    listPages().forEach(page => {
        if (page.style.display === "flex") {
            currentPageElement = page
        }
    })
    return currentPageElement
}

const addTab = (url = null, inverted = false, switchTo = true) => {
    let addNextToCurrent = SETTINGS.get("newtab.nextToCurrentOne")
    addNextToCurrent = addNextToCurrent && listTabs().length > 0
    if (inverted) {
        addNextToCurrent = !addNextToCurrent
    }
    const tabs = document.getElementById("tabs")
    const pages = document.getElementById("pages")
    const tab = document.createElement("span")
    const favicon = document.createElement("img")
    const statusIcon = document.createElement("img")
    const title = document.createElement("span")
    tab.style.minWidth = `${SETTINGS.get("tabs.minwidth")}px`
    favicon.src = "img/empty.png"
    favicon.className = "favicon"
    statusIcon.src = "img/spinner.gif"
    statusIcon.className = "status"
    statusIcon.style.display = "none"
    title.textContent = "New tab"
    tab.appendChild(favicon)
    tab.appendChild(statusIcon)
    tab.appendChild(title)
    if (addNextToCurrent) {
        tabs.insertBefore(tab, currentTab().nextSibling)
    } else {
        tabs.appendChild(tab)
    }
    const webview = document.createElement("webview")
    webview.setAttribute("link-id", linkId)
    tab.setAttribute("link-id", linkId)
    webview.setAttribute("preload", "./js/preload.js")
    let sessionName = "persist:main"
    if (SETTINGS.get("newtab.container")) {
        sessionName = `container-${linkId}`
        tab.className = "container"
    }
    SESSIONS.create(sessionName)
    webview.setAttribute("partition", sessionName)
    linkId += 1
    addWebviewListeners(webview)
    pages.appendChild(webview)
    webview.getWebContents().setUserAgent(useragent)
    webview.getWebContents().setWebRTCIPHandlingPolicy(
        "default_public_interface_only")
    if (url) {
        url = UTIL.redirect(url)
        webview.src = url
        title.textContent = url
    } else {
        webview.src = UTIL.specialPagePath("newtab")
    }
    if (switchTo) {
        if (addNextToCurrent) {
            switchToTab(listTabs().indexOf(currentTab()) + 1)
        } else {
            switchToTab(listTabs().length - 1)
        }
    }
}

const reopenTab = () => {
    if (recentlyClosed.length === 0) {
        return
    }
    if (UTIL.pathToSpecialPageName(currentPage().src).name === "newtab") {
        navigateTo(recentlyClosed.pop())
    } else if (currentPage().src) {
        addTab(recentlyClosed.pop())
    } else {
        navigateTo(recentlyClosed.pop())
    }
}

const closeTab = () => {
    if (currentPage().src) {
        if (!UTIL.pathToSpecialPageName(currentPage().src).name) {
            recentlyClosed.push(currentPage().src)
        }
    }
    const oldTabIndex = listTabs().indexOf(currentTab())
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
        return listPages().find(e => {
            return e.getAttribute("link-id") === el.getAttribute("link-id")
        })
    }
    if (listPages().indexOf(el) !== -1) {
        return listTabs().find(e => {
            return e.getAttribute("link-id") === el.getAttribute("link-id")
        })
    }
    return null
}

const switchToTab = index => {
    if (index < 0) {
        index = 0
    }
    const tabs = listTabs()
    if (tabs.length <= index) {
        index = tabs.length - 1
    }
    tabs.forEach(tab => {
        tab.id = ""
    })
    listPages().forEach(page => {
        page.style.display = "none"
    })
    tabs[index].id = "current-tab"
    tabs[index].scrollIntoView({"inline": "center"})
    tabOrPageMatching(tabs[index]).style.display = "flex"
    updateUrl(currentPage())
    saveTabs()
    MODES.setMode("normal")
}

const updateUrl = webview => {
    const skip = ["command", "search", "nav"]
    if (webview !== currentPage() || skip.includes(MODES.currentMode())) {
        return
    }
    if (currentPage() && currentPage().src) {
        const specialPage = UTIL.pathToSpecialPageName(currentPage().src)
        if (!specialPage.name) {
            document.getElementById("url").value = currentPage().src
        } else if (specialPage.name === "newtab") {
            document.getElementById("url").value = ""
        } else if (specialPage.section) {
            document.getElementById("url").value
                = `vieb://${specialPage.name}#${specialPage.section}`
        } else {
            document.getElementById("url").value = `vieb://${specialPage.name}`
        }
    } else {
        document.getElementById("url").value = ""
    }
}

const addWebviewListeners = webview => {
    webview.addEventListener("load-commit", e => {
        if (e.isMainFrame) {
            resetTabInfo(webview)
            const title = tabOrPageMatching(webview).querySelector("span")
            if (!title.textContent) {
                title.textContent = e.url
            }
        }
    })
    webview.addEventListener("focus", () => {
        if (MODES.currentMode() !== "insert") {
            webview.blur()
        }
    })
    webview.addEventListener("crashed", () => {
        tabOrPageMatching(webview).className = "crashed"
    })
    webview.addEventListener("did-start-loading", () => {
        FAVICONS.loading(webview)
        updateUrl(webview)
        webview.getWebContents().once("login", () => {
            for (const browserWindow of remote.BrowserWindow.getAllWindows()) {
                if (browserWindow.getURL().endsWith("login.html")) {
                    MODES.setMode("normal")
                    const bounds = remote.getCurrentWindow().getBounds()
                    const size = Math.round(SETTINGS.get("fontSize") * 21)
                    browserWindow.setMinimumSize(size, size)
                    browserWindow.setSize(size, size)
                    browserWindow.setPosition(
                        Math.round(bounds.x + bounds.width / 2 - size / 2),
                        Math.round(bounds.y + bounds.height / 2 - size / 2))
                    browserWindow.resizable = false
                    browserWindow.webContents.executeJavaScript(
                        "document.body.style.fontSize = "
                        + `'${SETTINGS.get("fontSize")}px'`)
                    browserWindow.show()
                }
            }
        })
    })
    webview.addEventListener("did-fail-load", e => {
        if (e.errorDescription === "" || !e.isMainFrame) {
            // Request was aborted before another error could occur
            // Or some request made by the page failed (which can be ignored)
            return
        }
        // It will go to the http version of a website, when no https is present
        // But only when the redirectToHttp setting is active
        const redirect = SETTINGS.get("redirectToHttp")
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
        webview.send("insert-failed-page-info", e)
        webview.setAttribute("failed-to-load", "true")
        webview.getWebContents().send("fontsize", SETTINGS.get("fontSize"))
    })
    webview.addEventListener("did-stop-loading", () => {
        const tab = tabOrPageMatching(webview)
        FAVICONS.show(webview)
        updateUrl(webview)
        if (!webview.getAttribute("added-to-hist")) {
            webview.setAttribute("added-to-hist", "true")
            HISTORY.addToHist(
                tab.querySelector("span").textContent, webview.src)
        }
        const specialPageName = UTIL.pathToSpecialPageName(webview.src).name
        const isLocal = webview.src.startsWith("file:/")
        const isErrorPage = webview.getAttribute("failed-to-load")
        if (specialPageName || isLocal || isErrorPage) {
            webview.getWebContents().send("fontsize", SETTINGS.get("fontSize"))
        }
        if (specialPageName === "help") {
            webview.getWebContents().send(
                "settings", SETTINGS.listCurrentSettings(true),
                INPUT.listSupportedActions())
        }
        saveTabs()
    })
    webview.addEventListener("page-title-updated", e => {
        const tab = tabOrPageMatching(webview)
        tab.querySelector("span").textContent = e.title
        updateUrl(webview)
        if (!webview.getAttribute("added-to-hist")) {
            webview.setAttribute("added-to-hist", "true")
            HISTORY.addToHist(
                tab.querySelector("span").textContent, webview.src)
        }
    })
    webview.addEventListener("page-favicon-updated", e => {
        FAVICONS.update(webview, e.favicons)
        updateUrl(webview)
    })
    webview.addEventListener("will-navigate", e => {
        ACTIONS.emptySearch()
        const redirect = UTIL.redirect(e.url)
        if (e.url !== redirect) {
            webview.src = redirect
            return
        }
        resetTabInfo(webview)
        tabOrPageMatching(webview).querySelector("span").textContent = e.url
    })
    webview.addEventListener("did-navigate-in-page", e => {
        if (e.isMainFrame) {
            const redirect = UTIL.redirect(e.url)
            if (e.url !== redirect) {
                webview.src = redirect
            }
        }
    })
    webview.addEventListener("new-window", e => {
        if (e.disposition === "save-to-disk") {
            currentPage().downloadURL(e.url)
        } else if (e.disposition === "foreground-tab") {
            navigateTo(e.url)
        } else {
            addTab(e.url)
        }
    })
    webview.addEventListener("enter-html-full-screen", () => {
        document.body.className = "fullscreen"
        webview.blur()
        webview.focus()
        webview.getWebContents().send("action", "focusTopLeftCorner")
        MODES.setMode("insert")
    })
    webview.addEventListener("leave-html-full-screen", () => {
        document.body.className = ""
        MODES.setMode("normal")
    })
    webview.addEventListener("ipc-message", e => {
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
            CURSOR.handleScrollDiffEvent(e.args[0])
        }
        if (e.channel === "history-list-request") {
            HISTORY.handleRequest(...e.args)
        }
        if (e.channel === "switch-to-insert") {
            MODES.setMode("insert")
        }
        if (e.channel === "navigate-to") {
            const url = UTIL.redirect(e.args[0])
            webview.src = url
            tabOrPageMatching(webview).querySelector("span").textContent = url
        }
        if (e.channel === "download-list-request") {
            DOWNLOADS.sendDownloadList(e.args[0], e.args[1])
        }
        if (e.channel === "new-tab-info-request") {
            if (SETTINGS.get("newtab.showTopSites")) {
                webview.send("insert-new-tab-info", HISTORY.topSites())
            }
        }
    })
    webview.addEventListener("found-in-page", e => {
        webview.send("search-element-location", e.result.selectionArea)
    })
    webview.addEventListener("update-target-url", e => {
        if (e.url && ["insert", "cursor"].includes(MODES.currentMode())) {
            const special = UTIL.pathToSpecialPageName(e.url)
            if (!special.name) {
                document.getElementById("url-hover").textContent = e.url
            } else if (special.section) {
                document.getElementById("url-hover").textContent
                    = `vieb://${special.name}#${special.section}`
            } else {
                document.getElementById("url-hover").textContent
                    = `vieb://${special.name}`
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
    webview.removeAttribute("added-to-hist")
    FAVICONS.empty(webview)
}

const navigateTo = location => {
    if (currentPage().isCrashed()) {
        return
    }
    location = UTIL.redirect(location)
    currentPage().src = location
    resetTabInfo(currentPage())
    currentTab().querySelector("span").textContent = location
}

const moveTabForward = () => {
    const tabs = document.getElementById("tabs")
    const index = listTabs().indexOf(currentTab())
    if (index >= listTabs().length - 1) {
        return
    }
    tabs.insertBefore(currentTab(), currentTab().nextSibling.nextSibling)
    currentTab().scrollIntoView({
        "inline": "center"
    })
}

const moveTabBackward = () => {
    const tabs = document.getElementById("tabs")
    const index = listTabs().indexOf(currentTab())
    if (index === 0) {
        return
    }
    tabs.insertBefore(currentTab(), currentTab().previousSibling)
    currentTab().scrollIntoView({
        "inline": "center"
    })
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
    updateUrl,
    resetTabInfo,
    navigateTo,
    moveTabForward,
    moveTabBackward
}
