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
"use strict"

const {stringToUrl, urlToString, isUrl} = require("../util")
const {
    listTabs, currentPage, tabOrPageMatching, currentMode, getSetting
} = require("./common")

const contextMenu = document.getElementById("context-menu")

const viebMenu = options => {
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    clear()
    const {clipboard} = require("electron")
    const {
        useEnteredData, backInHistory, forwardInHistory, reload
    } = require("./actions")
    const {execute} = require("./command")
    const {addTab, reopenTab, closeTab} = require("./tabs")
    if (options.path.find(el => el.matches?.("#url"))) {
        createMenuItem({
            "title": "Select All",
            "action": () => {
                if (!"sec".includes(currentMode()[0])) {
                    const {setMode} = require("./modes")
                    setMode("explore")
                }
                document.getElementById("url").select()
            }
        })
        if (getSelection().toString().trim()) {
            createMenuItem({
                "title": "Cut",
                "action": () => {
                    if (!"sec".includes(currentMode()[0])) {
                        const {setMode} = require("./modes")
                        setMode("explore")
                    }
                    document.execCommand("cut")
                }
            })
            createMenuItem({
                "title": "Copy",
                "action": () => {
                    if (!"sec".includes(currentMode()[0])) {
                        const {setMode} = require("./modes")
                        setMode("explore")
                    }
                    document.execCommand("copy")
                }
            })
        }
        if (clipboard.readText().trim()) {
            createMenuItem({
                "title": "Paste",
                "action": () => {
                    if (!"sec".includes(currentMode()[0])) {
                        const {setMode} = require("./modes")
                        setMode("explore")
                    }
                    document.execCommand("paste")
                }
            })
            createMenuItem({
                "title": "Paste and go",
                "action": () => {
                    if (!"sec".includes(currentMode()[0])) {
                        const {setMode} = require("./modes")
                        setMode("explore")
                    }
                    document.execCommand("paste")
                    useEnteredData()
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
            "action": () => execute(
                `pin ${listTabs().indexOf(tab)}`)
        })
        createMenuItem({
            "title": "Refresh",
            "action": () => reload(tabOrPageMatching(tab))
        })
        createMenuItem({
            "title": "Previous",
            "action": () => backInHistory(tabOrPageMatching(tab))
        })
        createMenuItem({
            "title": "Next",
            "action": () => forwardInHistory(
                tabOrPageMatching(tab))
        })
        createMenuItem({"title": "Open new tab", "action": addTab})
        createMenuItem({"title": "Undo closed tab", "action": reopenTab})
        createMenuItem({
            "title": "Copy page url",
            "action": () => clipboard.writeText(urlToString(
                tabOrPageMatching(tab).src))
        })
        if (!pinned || getSetting("closablepinnedtabs")) {
            createMenuItem({
                "title": "Close this tab",
                "action": () => {
                    closeTab(listTabs().indexOf(tab))
                }
            })
        }
    }
    fixAlignmentNearBorders()
}

const webviewMenu = options => {
    if (!getSetting("mouse") && currentMode() !== "insert") {
        clear()
        return
    }
    if (options.hasExistingListener && getSetting("respectsitecontextmenu")) {
        clear()
        return
    }
    const {clipboard} = require("electron")
    const {
        openLinkExternal, backInHistory, forwardInHistory, reload
    } = require("./actions")
    const {execute} = require("./command")
    const {addTab, navigateTo} = require("./tabs")
    const webviewY = Number(currentPage().style.top.replace("px", ""))
    const webviewX = Number(currentPage().style.left.replace("px", ""))
    const zoom = currentPage().getZoomFactor()
    contextMenu.style.top = `${Math.round(options.y * zoom + webviewY)}px`
    contextMenu.style.left = `${Math.round(options.x * zoom + webviewX)}px`
    clear()
    createMenuItem({"title": "Refresh", "action": () => reload()})
    createMenuItem({
        "title": "Previous", "action": () => backInHistory()
    })
    createMenuItem({
        "title": "Next", "action": () => forwardInHistory()
    })
    createMenuItem({
        "title": "Save page", "action": () => execute("write")
    })
    if (options.frame) {
        createMenuItem({
            "title": "Navigate to this frame",
            "action": () => navigateTo(stringToUrl(options.frame))
        })
        createMenuItem({
            "title": "Open this frame as new tab",
            "action": () => addTab({
                "url": stringToUrl(options.frame)
            })
        })
        createMenuItem({
            "title": "Copy this frame's location",
            "action": () => clipboard.writeText(options.frame)
        })
        createMenuItem({
            "title": "Download this frame",
            "action": () => currentPage().downloadURL(options.frame)
        })
    }
    createMenuItem({
        "title": "Select All",
        "action": () => currentPage().send("selection-all",
            options.x, options.y)
    })
    if (options.text) {
        if (options.canEdit) {
            createMenuItem({
                "title": "Cut",
                "action": () => currentPage().send("selection-cut",
                    options.x, options.y)
            })
        }
        createMenuItem({
            "title": "Copy", "action": () => clipboard.writeText(options.text)
        })
    }
    if (options.canEdit && clipboard.readText().trim()) {
        createMenuItem({
            "title": "Paste",
            "action": () => currentPage().send("selection-paste",
                options.x, options.y)
        })
    }
    if (options.text) {
        if (isUrl(options.text)) {
            createMenuItem({
                "title": "Navigate to selection",
                "action": () => navigateTo(stringToUrl(options.text))
            })
            createMenuItem({
                "title": "Open selection as new tab",
                "action": () => addTab({
                    "url": stringToUrl(options.text)
                })
            })
        } else {
            createMenuItem({
                "title": "Search selection",
                "action": () => navigateTo(stringToUrl(options.text))
            })
            createMenuItem({
                "title": "Search selection as new tab",
                "action": () => addTab({
                    "url": stringToUrl(options.text)
                })
            })
        }
    }
    if (options.img) {
        createMenuItem({
            "title": "Navigate to image",
            "action": () => navigateTo(options.img)
        })
        createMenuItem({
            "title": "Open image in new tab",
            "action": () => addTab({"url": options.img})
        })
        createMenuItem({
            "title": "Download image",
            "action": () => currentPage().downloadURL(options.img)
        })
    }
    if (options.link) {
        createMenuItem({
            "title": "Navigate to link",
            "action": () => navigateTo(options.link)
        })
        createMenuItem({
            "title": "Open link in new tab",
            "action": () => addTab({"url": options.link})
        })
        createMenuItem({
            "title": "Copy link",
            "action": () => {
                clipboard.writeText(options.link)
            }
        })
        createMenuItem({
            "title": "Download link",
            "action": () => currentPage().downloadURL(options.link)
        })
        createMenuItem({
            "title": "Open link with external command",
            "action": () => openLinkExternal(options.link)
        })
    }
    createMenuItem({
        "title": "Inspect element",
        "action": () => currentPage().inspectElement(
            Math.round(options.x + webviewX), Math.round(options.y + webviewY))
    })
    fixAlignmentNearBorders()
}

const linkMenu = options => {
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    clear()
    const {addTab, navigateTo} = require("./tabs")
    createMenuItem({
        "title": "Navigate to link",
        "action": () => navigateTo(options.link)
    })
    createMenuItem({
        "title": "Open link in new tab",
        "action": () => addTab({"url": options.link})
    })
    createMenuItem({
        "title": "Copy link",
        "action": () => {
            const {clipboard} = require("electron")
            clipboard.writeText(options.link)
        }
    })
    createMenuItem({
        "title": "Download link",
        "action": () => currentPage().downloadURL(options.link)
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
            const {setMode} = require("./modes")
            setMode("normal")
            const {execute} = require("./commmand")
            execute(options.command)
        }
    })
    createMenuItem({
        "title": "Copy command",
        "action": () => {
            const {clipboard} = require("electron")
            clipboard.writeText(options.command)
        }
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
    item.addEventListener("mouseover", () => {
        [...contextMenu.querySelectorAll("div")].forEach(el => {
            el.classList.remove("selected")
        })
        item.classList.add("selected")
    })
    item.addEventListener("click", () => {
        options.action()
        clear()
    })
    contextMenu.appendChild(item)
}

const active = () => !!contextMenu.textContent.trim()

const up = () => {
    const selected = contextMenu.querySelector(".selected")
    const nodes = [...contextMenu.childNodes]
    if (nodes.indexOf(selected) < 1) {
        nodes.forEach(el => {
            el.classList.remove("selected")
        })
        contextMenu.lastChild.classList.add("selected")
    } else if (active()) {
        const newSelected = nodes[nodes.indexOf(selected) - 1]
        nodes.forEach(el => {
            el.classList.remove("selected")
        })
        newSelected.classList.add("selected")
    }
}

const down = () => {
    const selected = contextMenu.querySelector(".selected")
    const nodes = [...contextMenu.childNodes]
    if ([-1, nodes.length - 1].includes(nodes.indexOf(selected))) {
        nodes.forEach(el => {
            el.classList.remove("selected")
        })
        contextMenu.firstChild.classList.add("selected")
    } else if (active()) {
        const newSelected = nodes[nodes.indexOf(selected) + 1]
        nodes.forEach(el => {
            el.classList.remove("selected")
        })
        newSelected.classList.add("selected")
    }
}

const select = () => contextMenu.querySelector(".selected")?.click()

module.exports = {
    viebMenu,
    webviewMenu,
    linkMenu,
    commandMenu,
    clear,
    active,
    up,
    down,
    select
}
