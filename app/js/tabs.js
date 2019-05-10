/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019 Jelmer van Arnhem
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
/* global COMMAND DOWNLOADS FOLLOW MODES SETTINGS UTIL */
"use strict"

const {ipcRenderer, remote} = require("electron")

const specialPages = ["help", "downloads", "version"]

const useragent = remote.session.defaultSession.getUserAgent()
    .replace(/Electron\/.* /, "")
let loggingIn = false

const init = () => {
    //TODO setting for startup process, each of these is an option
    // - restore previous tabs (maybe default)
    // - open a startup page
    // - open the docs/help (default on first startup?)
    //One of these should open before the urls parsed from the cli below
    ipcRenderer.on("urls", (event, urls) => {
        urls.forEach(url => {
            if (UTIL.hasProtocol(url)) {
                addTab(url)
            } else {
                addTab(`https://${url}`)
            }
        })
        if (listTabs().length === 0) {
            addTab()
            //TODO if help at startup instead of empty page or previous tabs
            COMMAND.help()
        }
    })
}

const listTabs = () => {
    return [...document.querySelectorAll("#tabs > span")]
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

const addTab = (url=null) => {
    const tabs = document.getElementById("tabs")
    const pages = document.getElementById("pages")
    const tab = document.createElement("span")
    const favicon = document.createElement("img")
    const title = document.createElement("span")
    favicon.src = "img/newtab.png"
    title.textContent = "New tab"
    tab.appendChild(favicon)
    tab.appendChild(title)
    tabs.appendChild(tab)
    const webview = document.createElement("webview")
    webview.setAttribute("preload", "./js/preload.js")
    addWebviewListeners(webview)
    pages.appendChild(webview)
    webview.getWebContents().setUserAgent(useragent)
    if (url !== null) {
        webview.src = url
        title.textContent = url
    }
    switchToTab(listTabs().length - 1)
}

const closeTab = () => {
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

const switchToTab = index => {
    if (index < 0) {
        return
    }
    const tabs = listTabs()
    if (tabs.length <= index) {
        return
    }
    tabs.forEach(tab => {
        tab.id = ""
    })
    const pages = listPages()
    pages.forEach(page => {
        page.style.display = "none"
    })
    tabs[index].id = "current-tab"
    pages[index].style.display = "flex"
    updateUrl(currentPage())
}

const updateUrl = webview => {
    const skip = ["command", "search", "nav"]
    if (webview !== currentPage() || skip.indexOf(MODES.currentMode()) !== -1) {
        return
    }
    if (currentPage() && currentPage().src !== undefined) {
        const pageUrl = currentPage().src
        let section = pageUrl.split("#").slice(1).join("#")
        if (section !== "") {
            section = `#${section}`
        }
        const decodedPageUrl = decodeURIComponent(pageUrl)
        for (const specialPage of specialPages) {
            if (pageUrl.startsWith(UTIL.specialPage(specialPage))) {
                document.getElementById("url").value
                    = `vieb://${specialPage}${section}`
                return
            }
            if (decodedPageUrl.startsWith(UTIL.specialPage(specialPage))) {
                document.getElementById("url").value
                    = `vieb://${specialPage}${section}`
                return
            }
        }
        document.getElementById("url").value = pageUrl
    } else {
        document.getElementById("url").value = ""
    }
}

const addWebviewListeners = webview => {
    webview.addEventListener("did-start-loading", () => {
        const tab = listTabs()[listPages().indexOf(webview)]
        tab.querySelector("img").src = "img/spinner.gif"
        updateUrl(webview)
        webview.getWebContents().removeAllListeners("login")
        webview.getWebContents().on("login", (e, request, auth, callback) => {
            e.preventDefault()
            if (loggingIn) {
                UTIL.notify("Credentials seem to be incorrect", "warn")
                webview.stop()
                return
            }
            FOLLOW.cancelFollow()
            loggingIn = true
            const windowData = {
                width: 300,
                height: 300,
                parent: remote.getCurrentWindow(),
                modal: true,
                frame: false,
                title: `${auth.host}: ${auth.realm}`,
                resizable: false,
                webPreferences: {
                    nodeIntegration: true
                }
            }
            const loginWindow = new remote.BrowserWindow(windowData)
            loginWindow.on("close", () => {
                try {
                    callback("", "")
                } catch (err) {
                    //Callback was already called
                }
            })
            loginWindow.loadURL(UTIL.specialPage("login"))
            remote.ipcMain.once("login-credentials", (_e, credentials) => {
                try {
                    callback(credentials[0], credentials[1])
                    loginWindow.close()
                } catch (err) {
                    //Window is already being closed
                }
            })
        })
    })
    webview.addEventListener("did-fail-load", e => {
        if (e.errorDescription === "") {
            return //Request was aborted before another error could occur
        }
        if (e.errorDescription === "ERR_INVALID_URL") {
            webview.src = webview.src || ""
            return
        }
        //It will go to the http version of a website when no https is detected
        const redirect = SETTINGS.get("redirectToHttp")
        const sslErrors = [
            "ERR_CERT_COMMON_NAME_INVALID",
            "ERR_SSL_PROTOCOL_ERROR"
        ]
        if (sslErrors.indexOf(e.errorDescription) !== -1 && redirect) {
            webview.src = webview.src.replace("https://", "http://")
            return
        }
        UTIL.notify(`The page encountered the following error while loading: ${
            e.errorDescription}. url: '${e.validatedURL}'`, "err")
    })
    webview.addEventListener("did-stop-loading", () => {
        const tab = listTabs()[listPages().indexOf(webview)]
        if (tab.querySelector("img").src.endsWith("img/spinner.gif")) {
            if (tab.querySelector("img").src.startsWith("file://")) {
                tab.querySelector("img").src = "img/nofavicon.png"
            }
        }
        loggingIn = false
        updateUrl(webview)
    })
    webview.addEventListener("page-title-updated", e => {
        const tab = listTabs()[listPages().indexOf(webview)]
        tab.querySelector("span").textContent = e.title
        updateUrl(webview)
    })
    webview.addEventListener("page-favicon-updated", e => {
        const tab = listTabs()[listPages().indexOf(webview)]
        if (e.favicons.length > 0) {
            tab.querySelector("img").src = e.favicons[0]
        } else {
            tab.querySelector("img").src = "img/nofavicon.png"
        }
        updateUrl(webview)
    })
    webview.addEventListener("will-navigate", e => {
        const tab = listTabs()[listPages().indexOf(webview)]
        tab.querySelector("span").textContent = e.url
    })
    webview.addEventListener("new-window", e => {
        navigateTo(e.url)
    })
    webview.addEventListener("enter-html-full-screen", () => {
        document.body.className = "fullscreen"
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
        if (e.channel === "download-list-request") {
            DOWNLOADS.sendDownloadList(e.args[0], e.args[1])
        }
    })
    webview.onblur = () => {
        if (MODES.currentMode() === "insert") {
            webview.focus()
        }
    }
}

const navigateTo = location => {
    currentPage().src = location
    currentTab().querySelector("span").textContent = location
}

const specialPagesList = () => {
    return specialPages
}

module.exports = {
    init,
    listTabs,
    listPages,
    currentTab,
    currentPage,
    addTab,
    closeTab,
    switchToTab,
    updateUrl,
    navigateTo,
    specialPagesList
}
