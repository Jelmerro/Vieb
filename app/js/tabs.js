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
/* global ACTIONS CURSOR DOWNLOADS FOLLOW HISTORY MODES SETTINGS UTIL */
"use strict"

const fs = require("fs")
const path = require("path")
const {ipcRenderer, remote} = require("electron")

let recentlyClosed = []
let linkId = 0

const useragent = remote.session.defaultSession.getUserAgent()
    .replace(/Electron\/\S* /, "").replace(/Vieb\/\S* /, "")

remote.session.defaultSession.setPermissionRequestHandler(
    (_, permission, callback, details) => {
        if (permission === "media") {
            if (details.mediaTypes && details.mediaTypes.includes("video")) {
                permission = "camera"
            } else {
                permission = "microphone"
            }
        }
        const setting = SETTINGS.get(`permissions.${permission}`)
        if (setting === "ask") {
            remote.dialog.showMessageBox(remote.getCurrentWindow(), {
                "type": "question",
                "buttons": ["Allow", "Deny"],
                "defaultId": 0,
                "cancelId": 1,
                "checkboxLabel": "Remember for this session",
                "title": `Allow this page to access '${permission}'?`,
                "message": "The page has requested access to the permission "
                    + `'${permission}'. You can allow or deny this below, `
                    + "and choose if you want to make this the default for "
                    + "the current session when sites ask for this permission."
                    + " You can always change this using the settings file,"
                    + " or at runtime with the set command like so: "
                    + "'set permissions.<name>=<value>'"
            }).then(e => {
                callback(e.response === 0)
                if (e.checkboxChecked) {
                    if (e.response === 0) {
                        SETTINGS.set(`permissions.${permission}`, "allow")
                    } else {
                        SETTINGS.set(`permissions.${permission}`, "block")
                    }
                }
            })
        } else {
            callback(setting === "allow")
        }
    })

const init = () => {
    window.addEventListener("load", () => {
        const startup = SETTINGS.get("tabs.startup")
        const tabFile = path.join(remote.app.getPath("appData"), "tabs")
        let parsed = null
        if (fs.existsSync(tabFile) && fs.statSync(tabFile).isFile()) {
            try {
                const contents = fs.readFileSync(tabFile).toString()
                parsed = JSON.parse(contents)
            } catch (e) {
                //No tab history yet
            }
        }
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
                    if (!listTabs().length === 0) {
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
                try {
                    fs.unlinkSync(tabFile)
                } catch (e) {
                    //Failed to delete, might not exist
                }
            }
        }
        if (listTabs().length === 0) {
            if (parsed) {
                addTab()
            } else {
                //Probably first startup ever (no configured or stored pages)
                addTab(UTIL.specialPagePath("help"))
            }
        }
        ipcRenderer.on("urls", (event, urls) => {
            urls.forEach(url => {
                if (!UTIL.hasProtocol(url)) {
                    url = `https://${url}`
                }
                if (currentPage().src) {
                    addTab(url)
                } else {
                    navigateTo(url)
                }
            })
        })
        //This forces the webview to update on sites which wait for the mouse
        //It will also enable the pointer events when in insert or cursor mode
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
        tabs: [],
        id: 0,
        closed: []
    }
    const tabFile = path.join(remote.app.getPath("appData"), "tabs")
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
        try {
            fs.unlinkSync(tabFile)
        } catch (e) {
            //Failed to delete, might not exist
        }
        return
    }
    // Only keep the 100 most recently closed tabs,
    // more is probably never needed but would keep increasing the file size.
    data.closed = data.closed.slice(-100)
    try {
        fs.writeFileSync(tabFile, JSON.stringify(data))
    } catch (e) {
        UTIL.notify("Failed to write current tabs to disk", "err")
    }
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

const addTab = (url=null, inverted=false) => {
    let addNextToCurrent = SETTINGS.get("addTabsNextToCurrentOne")
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
    linkId += 1
    webview.setAttribute("preload", "./js/preload.js")
    addWebviewListeners(webview)
    pages.appendChild(webview)
    webview.getWebContents().setUserAgent(useragent)
    webview.getWebContents().setWebRTCIPHandlingPolicy(
        "default_public_interface_only")
    webview.addEventListener("focus", () => {
        if (MODES.currentMode() !== "insert") {
            webview.blur()
        }
    })
    if (url) {
        webview.src = url
        title.textContent = url
    }
    if (addNextToCurrent) {
        switchToTab(listTabs().indexOf(currentTab()) + 1)
    } else {
        switchToTab(listTabs().length - 1)
    }
    MODES.setMode("normal")
}

const reopenTab = () => {
    if (recentlyClosed.length === 0) {
        return
    }
    if (currentPage().src) {
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
        return
    }
    const tabs = listTabs()
    if (tabs.length <= index) {
        return
    }
    tabs.forEach(tab => {
        tab.id = ""
    })
    listPages().forEach(page => {
        page.style.display = "none"
    })
    tabs[index].id = "current-tab"
    tabOrPageMatching(tabs[index]).style.display = "flex"
    updateUrl(currentPage())
    saveTabs()
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
    webview.addEventListener("did-start-loading", () => {
        const tab = tabOrPageMatching(webview)
        tab.querySelector(".status").style.display = null
        tab.querySelector(".favicon").style.display = "none"
        tab.querySelector(".favicon").src = "img/empty.png"
        updateUrl(webview)
        webview.getWebContents().removeAllListeners("login")
        webview.getWebContents().on("login", (e, request, auth, callback) => {
            e.preventDefault()
            if (webview.getAttribute("logging-in") === "yes") {
                UTIL.notify("Credentials seem to be incorrect", "warn")
                webview.stop()
                return
            }
            FOLLOW.cancelFollow()
            webview.setAttribute("logging-in", "yes")
            const windowData = {
                backgroundColor: "#333333",
                width: SETTINGS.get("fontSize") * 21,
                height: SETTINGS.get("fontSize") * 21,
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
            loginWindow.webContents.on("dom-ready", () => {
                loginWindow.webContents.executeJavaScript(
                    `document.body.style.fontSize =
                    "${SETTINGS.get("fontSize")}px"`)
            })
            loginWindow.on("close", () => {
                try {
                    callback("", "")
                } catch (err) {
                    //Callback was already called
                }
            })
            loginWindow.loadURL(UTIL.specialPagePath("login", null, true))
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
            "ERR_SSL_PROTOCOL_ERROR",
            "ERR_CERT_AUTHORITY_INVALID"
        ]
        if (sslErrors.includes(e.errorDescription) && redirect) {
            webview.src = webview.src.replace("https://", "http://")
            return
        }
        UTIL.notify(`The page encountered the following error while loading: ${
            e.errorDescription}. url: '${e.validatedURL}'`, "err")
    })
    webview.addEventListener("did-stop-loading", () => {
        const tab = tabOrPageMatching(webview)
        tab.querySelector(".status").style.display = "none"
        tab.querySelector(".favicon").style.display = null
        webview.removeAttribute("logging-in")
        updateUrl(webview)
        HISTORY.addToHist(tab.querySelector("span").textContent, webview.src)
        saveTabs()
    })
    webview.addEventListener("page-title-updated", e => {
        const tab = tabOrPageMatching(webview)
        tab.querySelector("span").textContent = e.title
        updateUrl(webview)
    })
    webview.addEventListener("page-favicon-updated", e => {
        const tab = tabOrPageMatching(webview)
        if (e.favicons.length > 0) {
            tab.querySelector(".favicon").src = e.favicons[0]
        } else {
            tab.querySelector(".favicon").src = "img/empty.png"
        }
        updateUrl(webview)
    })
    webview.addEventListener("will-navigate", e => {
        ACTIONS.emptySearch()
        const tab = tabOrPageMatching(webview)
        tab.querySelector("span").textContent = e.url
        if (MODES.currentMode() === "cursor") {
            MODES.setMode("normal")
        }
    })
    webview.addEventListener("new-window", e => {
        if (e.disposition === "foreground-tab") {
            navigateTo(e.url)
        } else {
            addTab(e.url)
        }
    })
    webview.addEventListener("enter-html-full-screen", () => {
        document.body.className = "fullscreen"
        webview.blur()
        webview.focus()
        webview.executeJavaScript(
            "document.elementFromPoint(0,0).focus()")
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
            DOWNLOADS.downloadFile(e.args[0], e.args[1])
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
    })
    webview.addEventListener("found-in-page", e => {
        webview.getWebContents().send("search-element-location",
            e.result.selectionArea)
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

const navigateTo = location => {
    currentTab().querySelector("span").textContent = location
    currentPage().src = location
}

const moveTabForward = () => {
    const tabs = document.getElementById("tabs")
    const index = listTabs().indexOf(currentTab())
    if (index >= listTabs().length - 1) {
        return
    }
    tabs.insertBefore(currentTab(), currentTab().nextSibling.nextSibling)
}

const moveTabBackward = () => {
    const tabs = document.getElementById("tabs")
    const index = listTabs().indexOf(currentTab())
    if (index === 0) {
        return
    }
    tabs.insertBefore(currentTab(), currentTab().previousSibling)
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
    navigateTo,
    moveTabForward,
    moveTabBackward
}
