/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2021 Jelmer van Arnhem
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
/* global ACTIONS COMMAND MODES SETTINGS TABS UTIL */
"use strict"

const {clipboard} = require("electron")

const contextMenu = document.getElementById("context-menu")

const viebMenu = options => {
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    clear()
    if (options.path.find(el => el.matches?.("#url"))) {
        createMenuItem({
            "title": "Select All",
            "action": () => {
                if (!"sec".includes(MODES.currentMode()[0])) {
                    MODES.setMode("explore")
                }
                document.getElementById("url").select()
            }
        })
        if (getSelection().toString().trim()) {
            createMenuItem({
                "title": "Cut",
                "action": () => {
                    if (!"sec".includes(MODES.currentMode()[0])) {
                        MODES.setMode("explore")
                    }
                    document.execCommand("cut")
                }
            })
            createMenuItem({
                "title": "Copy",
                "action": () => {
                    if (!"sec".includes(MODES.currentMode()[0])) {
                        MODES.setMode("explore")
                    }
                    document.execCommand("copy")
                }
            })
        }
        if (clipboard.readText().trim()) {
            createMenuItem({
                "title": "Paste",
                "action": () => {
                    if (!"sec".includes(MODES.currentMode()[0])) {
                        MODES.setMode("explore")
                    }
                    document.execCommand("paste")
                }
            })
            createMenuItem({
                "title": "Paste and go",
                "action": () => {
                    if (!"sec".includes(MODES.currentMode()[0])) {
                        MODES.setMode("explore")
                    }
                    document.execCommand("paste")
                    ACTIONS.useEnteredData()
                }
            })
        }
    }
    if (options.path.find(el => el.matches?.("#tabs"))) {
        const tab = options.path.find(el => el.matches?.("#tabs > span"))
        if (!tab) {
            fixAlignmentNearBorders()
            return
        }
        const pinned = tab.classList.contains("pinned")
        let pinTitle = "Pin tab"
        if (pinned) {
            pinTitle = "Unpin tab"
        }
        createMenuItem({
            "title": pinTitle,
            "action": () => COMMAND.execute(
                `pin ${TABS.listTabs().indexOf(tab)}`)
        })
        createMenuItem({
            "title": "Refresh",
            "action": () => ACTIONS.reload(TABS.tabOrPageMatching(tab))
        })
        createMenuItem({
            "title": "Previous",
            "action": () => ACTIONS.backInHistory(TABS.tabOrPageMatching(tab))
        })
        createMenuItem({
            "title": "Next",
            "action": () => ACTIONS.forwardInHistory(
                TABS.tabOrPageMatching(tab))
        })
        createMenuItem({"title": "Open new tab", "action": TABS.addTab})
        createMenuItem({"title": "Undo closed tab", "action": TABS.reopenTab})
        createMenuItem({
            "title": "Copy page url",
            "action": () => {
                clipboard.writeText(UTIL.urlToString(
                    TABS.tabOrPageMatching(tab).src))
            }
        })
        if (!pinned || SETTINGS.get("closablepinnedtabs")) {
            createMenuItem({
                "title": "Close this tab",
                "action": () => {
                    TABS.closeTab(TABS.listTabs().indexOf(tab))
                }
            })
        }
    }
    fixAlignmentNearBorders()
}

const webviewMenu = options => {
    if (!SETTINGS.get("mouse") && !MODES.currentMode("insert")) {
        clear()
        return
    }
    const webviewY = Number(TABS.currentPage().style.top.replace("px", ""))
    const webviewX = Number(TABS.currentPage().style.left.replace("px", ""))
    contextMenu.style.top = `${options.y + webviewY}px`
    contextMenu.style.left = `${options.x + webviewX}px`
    clear()
    createMenuItem({"title": "Refresh", "action": () => ACTIONS.reload()})
    createMenuItem({
        "title": "Previous", "action": () => ACTIONS.backInHistory()
    })
    createMenuItem({
        "title": "Next", "action": () => ACTIONS.forwardInHistory()
    })
    createMenuItem({
        "title": "Save page", "action": () => COMMAND.execute("write")
    })
    if (options.frame) {
        createMenuItem({
            "title": "Navigate to this frame",
            "action": () => TABS.navigateTo(UTIL.stringToUrl(options.frame))
        })
        createMenuItem({
            "title": "Open this frame as new tab",
            "action": () => TABS.addTab({
                "url": UTIL.stringToUrl(options.frame)
            })
        })
        createMenuItem({
            "title": "Copy this frame's location",
            "action": () => clipboard.writeText(options.frame)
        })
        createMenuItem({
            "title": "Download this frame",
            "action": () => TABS.currentPage().downloadURL(options.frame)
        })
    } else {
        createMenuItem({
            "title": "Select All",
            "action": () => TABS.currentPage().send("selection-all")
        })
    }
    if (options.text) {
        if (options.canedit) {
            createMenuItem({
                "title": "Cut",
                "action": () => TABS.currentPage().send("selection-cut")
            })
        }
        createMenuItem({
            "title": "Copy", "action": () => clipboard.writeText(options.text)
        })
    }
    if (options.canedit && clipboard.readText().trim()) {
        createMenuItem({
            "title": "Paste",
            "action": () => TABS.currentPage().send("selection-paste")
        })
    }
    if (options.text) {
        if (UTIL.isUrl(options.text)) {
            createMenuItem({
                "title": "Navigate to selection",
                "action": () => TABS.navigateTo(UTIL.stringToUrl(options.text))
            })
            createMenuItem({
                "title": "Open selection as new tab",
                "action": () => TABS.addTab({
                    "url": UTIL.stringToUrl(options.text)
                })
            })
        } else {
            createMenuItem({
                "title": "Search selection",
                "action": () => TABS.navigateTo(UTIL.stringToUrl(options.text))
            })
            createMenuItem({
                "title": "Search selection as new tab",
                "action": () => TABS.addTab({
                    "url": UTIL.stringToUrl(options.text)
                })
            })
        }
    }
    if (options.img) {
        createMenuItem({
            "title": "Navigate to image",
            "action": () => TABS.navigateTo(options.img)
        })
        createMenuItem({
            "title": "Open image in new tab",
            "action": () => TABS.addTab({"url": options.img})
        })
        createMenuItem({
            "title": "Download image",
            "action": () => TABS.currentPage().downloadURL(options.img)
        })
    }
    if (options.link) {
        createMenuItem({
            "title": "Navigate to link",
            "action": () => TABS.navigateTo(options.link)
        })
        createMenuItem({
            "title": "Open link in new tab",
            "action": () => TABS.addTab({"url": options.link})
        })
        createMenuItem({
            "title": "Copy link",
            "action": () => clipboard.writeText(options.link)
        })
        createMenuItem({
            "title": "Download link",
            "action": () => TABS.currentPage().downloadURL(options.link)
        })
    }
    createMenuItem({
        "title": "Inspect element",
        "action": () => TABS.currentPage().inspectElement(
            Math.round(options.x + webviewX), Math.round(options.y + webviewY))
    })
    fixAlignmentNearBorders()
}

const linkMenu = options => {
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    clear()
    createMenuItem({
        "title": "Navigate to link",
        "action": () => TABS.navigateTo(options.link)
    })
    createMenuItem({
        "title": "Open link in new tab",
        "action": () => TABS.addTab({"url": options.link})
    })
    createMenuItem({
        "title": "Copy link",
        "action": () => clipboard.writeText(options.link)
    })
    createMenuItem({
        "title": "Download link",
        "action": () => TABS.currentPage().downloadURL(options.link)
    })
    fixAlignmentNearBorders()
}

const commandMenu = options => {
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    clear()
    createMenuItem({
        "title": "Execute command",
        "action": () => {
            MODES.setMode("normal")
            COMMAND.execute(options.command)
        }
    })
    createMenuItem({
        "title": "Copy command",
        "action": () => clipboard.writeText(options.command)
    })
    fixAlignmentNearBorders()
}

const clear = () => {
    contextMenu.innerHTML = ""
}

const fixAlignmentNearBorders = () => {
    const bottomMenu = contextMenu.getBoundingClientRect().bottom
    const bottomWindow = document.body.getBoundingClientRect().bottom
    if (bottomMenu > bottomWindow) {
        let top = Number(contextMenu.style.top.replace("px", ""))
            - contextMenu.getBoundingClientRect().height
        if (top < 0) {
            top = 0
        }
        contextMenu.style.top = `${top}px`
    }
    const rightMenu = contextMenu.getBoundingClientRect().right
    const rightWindow = document.body.getBoundingClientRect().right
    if (rightMenu > rightWindow) {
        let left = Number(
            contextMenu.style.left.replace("px", ""))
            - contextMenu.getBoundingClientRect().width
        if (left < 0) {
            left = 0
        }
        contextMenu.style.left = `${left}px`
    }
}

const createMenuItem = options => {
    const item = document.createElement("div")
    item.textContent = options.title
    item.addEventListener("click", () => {
        options.action()
        clear()
    })
    contextMenu.appendChild(item)
}

module.exports = {viebMenu, webviewMenu, linkMenu, commandMenu, clear}
