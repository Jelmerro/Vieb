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

const {stringToUrl, urlToString, isUrl, specialChars} = require("../util")
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
    const {addTab, reopenTab, closeTab} = require("./tabs")
    if (options.path.find(el => el.matches?.("#url"))) {
        createMenuItem({
            "title": "Select all",
            "action": () => {
                if (!"sec".includes(currentMode()[0])) {
                    const {setMode} = require("./modes")
                    setMode("explore")
                }
                document.getElementById("url").select()
            }
        })
        if (document.getElementById("url").value.trim().length) {
            if ("sec".includes(currentMode()[0])) {
                createMenuItem({
                    "title": "Go", "action": () => useEnteredData()
                })
            }
        }
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
                "title": "Paste & go",
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
        let pinTitle = "Pin"
        if (pinned) {
            pinTitle = "Unpin"
        }
        createMenuItem({
            "title": pinTitle,
            "action": () => {
                const {execute} = require("./command")
                execute(`pin ${listTabs().indexOf(tab)}`)
            }
        })
        createMenuItem({
            "title": "Refresh", "action": () => reload(tabOrPageMatching(tab))
        })
        createMenuItem({
            "title": "Previous",
            "action": () => backInHistory(tabOrPageMatching(tab))
        })
        createMenuItem({
            "title": "Next",
            "action": () => forwardInHistory(tabOrPageMatching(tab))
        })
        createMenuItem({"title": "Open new", "action": addTab})
        createMenuItem({"title": "Undo closed", "action": reopenTab})
        createMenuItem({
            "title": "Copy url",
            "action": () => clipboard.writeText(urlToString(
                tabOrPageMatching(tab).src))
        })
        if (!pinned || getSetting("closablepinnedtabs")) {
            createMenuItem({
                "title": "Close this",
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
    const {addTab, navigateTo} = require("./tabs")
    const webviewY = Number(currentPage().style.top.replace("px", ""))
    const webviewX = Number(currentPage().style.left.replace("px", ""))
    const zoom = currentPage().getZoomFactor()
    contextMenu.style.top = `${Math.round(options.y * zoom + webviewY)}px`
    contextMenu.style.left = `${Math.round(options.x * zoom + webviewX)}px`
    clear()
    createMenuItem({"title": "Refresh", "action": () => reload()})
    createMenuItem({"title": "Previous", "action": () => backInHistory()})
    createMenuItem({"title": "Next", "action": () => forwardInHistory()})
    createMenuItem({"title": "Save page",
        "action": () => {
            const {execute} = require("./command")
            execute("write")
        }})
    createMenuItem({
        "title": "Inspect",
        "action": () => currentPage().inspectElement(
            Math.round(options.x + webviewX), Math.round(options.y + webviewY))
    })
    const {updateKeysOnScreen} = require("./input")
    updateKeysOnScreen()
    if (options.canEdit && options.inputVal && options.inputSel >= 0) {
        const wordRegex = specialChars.source.replace("[", "[^")
        const words = options.inputVal.split(new RegExp(`(${
            wordRegex}+|${specialChars.source}+)`, "g")).filter(s => s)
        let letterCount = 0
        let wordIndex = 0
        let word = words[wordIndex]
        while (wordIndex < words.length) {
            word = words[wordIndex].trim()
            letterCount += words[wordIndex].length
            if (letterCount >= options.inputSel) {
                if (word.match(new RegExp(`${wordRegex}+`, "g"))) {
                    break
                }
            }
            wordIndex += 1
        }
        const {webFrame} = require("electron")
        const suggestions = webFrame.getWordSuggestions(word)
        if (suggestions.length) {
            createMenuGroup("Suggestions")
        }
        for (const suggestion of suggestions) {
            createMenuItem({
                "title": suggestion,
                "action": () => {
                    words[wordIndex] = suggestion
                    currentPage().send("replace-input-field",
                        words.join(""), options.inputSel)
                }
            })
        }
    }
    if (options.frame) {
        createMenuGroup("Iframe")
        createMenuItem({
            "title": "Navigate",
            "action": () => navigateTo(stringToUrl(options.frame))
        })
        createMenuItem({
            "title": "In new tab",
            "action": () => addTab({"url": stringToUrl(options.frame)})
        })
        createMenuItem({
            "title": "Copy location",
            "action": () => clipboard.writeText(options.frame)
        })
        createMenuItem({
            "title": "Download",
            "action": () => currentPage().downloadURL(options.frame)
        })
    }
    createMenuGroup("Text")
    createMenuItem({
        "title": "Select all",
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
        createMenuGroup("Selection")
        if (isUrl(options.text)) {
            createMenuItem({
                "title": "Navigate",
                "action": () => navigateTo(stringToUrl(options.text))
            })
            createMenuItem({
                "title": "In new tab",
                "action": () => addTab({"url": stringToUrl(options.text)})
            })
        } else {
            createMenuItem({
                "title": "Search",
                "action": () => navigateTo(stringToUrl(options.text))
            })
            createMenuItem({
                "title": "Search in new tab",
                "action": () => addTab({"url": stringToUrl(options.text)})
            })
        }
    }
    if (options.img || options.backgroundImg || options.svgData) {
        createMenuGroup("Image")
    }
    if (options.img || options.backgroundImg) {
        createMenuItem({
            "title": "Navigate",
            "action": () => navigateTo(options.img || options.backgroundImg)
        })
        createMenuItem({
            "title": "In new tab",
            "action": () => addTab(
                {"url": options.img || options.backgroundImg})
        })
        createMenuItem({
            "title": "Copy link",
            "action": () => clipboard.writeText(
                options.img || options.backgroundImg)
        })
    }
    if (options.img || options.backgroundImg || options.svgData) {
        createMenuItem({
            "title": "Copy image",
            "action": () => {
                clipboard.clear()
                const el = document.createElement("img")
                const canvas = document.createElement("canvas")
                el.onload = () => {
                    canvas.width = el.naturalWidth
                    canvas.height = el.naturalHeight
                    canvas.getContext("2d").drawImage(el, 0, 0)
                    const {nativeImage} = require("electron")
                    clipboard.writeImage(nativeImage.createFromDataURL(
                        canvas.toDataURL("image/png")))
                }
                el.src = options.img || options.backgroundImg || options.svgData
            }
        })
        createMenuItem({
            "title": "Download",
            "action": () => currentPage().downloadURL(
                options.img || options.backgroundImg || options.svgData)
        })
    }
    if (options.video) {
        createMenuGroup("Video")
        createMenuItem({
            "title": "Navigate", "action": () => navigateTo(options.video)
        })
        createMenuItem({
            "title": "In new tab",
            "action": () => addTab({"url": options.video})
        })
        createMenuItem({
            "title": "Copy link",
            "action": () => clipboard.writeText(options.video)
        })
        createMenuItem({
            "title": "Download",
            "action": () => currentPage().downloadURL(options.video)
        })
    }
    if (options.audio) {
        createMenuGroup("Audio")
        createMenuItem({
            "title": "Navigate", "action": () => navigateTo(options.audio)
        })
        createMenuItem({
            "title": "In new tab",
            "action": () => addTab({"url": options.audio})
        })
        createMenuItem({
            "title": "Copy link",
            "action": () => clipboard.writeText(options.audio)
        })
        createMenuItem({
            "title": "Download",
            "action": () => currentPage().downloadURL(options.audio)
        })
    }
    if (options.link) {
        createMenuGroup("Link")
        createMenuItem({
            "title": "Navigate", "action": () => navigateTo(options.link)
        })
        createMenuItem({
            "title": "In new tab", "action": () => addTab({"url": options.link})
        })
        createMenuItem({
            "title": "Copy", "action": () => clipboard.writeText(options.link)
        })
        createMenuItem({
            "title": "Download",
            "action": () => currentPage().downloadURL(options.link)
        })
        createMenuItem({
            "title": "With external",
            "action": () => openLinkExternal(options.link)
        })
    }
    fixAlignmentNearBorders()
}

const linkMenu = options => {
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    clear()
    const {addTab, navigateTo} = require("./tabs")
    createMenuItem({
        "title": "Navigate", "action": () => navigateTo(options.link)
    })
    createMenuItem({
        "title": "In new tab", "action": () => addTab({"url": options.link})
    })
    createMenuItem({
        "title": "Copy",
        "action": () => {
            const {clipboard} = require("electron")
            clipboard.writeText(options.link)
        }
    })
    createMenuItem({
        "title": "Download",
        "action": () => currentPage().downloadURL(options.link)
    })
    fixAlignmentNearBorders()
}

const commandMenu = options => {
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    clear()
    createMenuItem({
        "title": "Execute",
        "action": () => {
            const {setMode} = require("./modes")
            setMode("normal")
            const {execute} = require("./command")
            execute(options.command)
        }
    })
    createMenuItem({
        "title": "Copy",
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

const createMenuGroup = title => {
    const item = document.createElement("div")
    item.className = "menu-group"
    item.textContent = title
    contextMenu.appendChild(item)
}

const createMenuItem = options => {
    const item = document.createElement("div")
    item.className = "menu-item"
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
    const nodes = [...contextMenu.querySelectorAll(".menu-item")]
    if (nodes.indexOf(selected) < 1) {
        nodes.forEach(el => el.classList.remove("selected"))
        contextMenu.lastChild.classList.add("selected")
    } else if (active()) {
        const newSelected = nodes[nodes.indexOf(selected) - 1]
        nodes.forEach(el => el.classList.remove("selected"))
        newSelected.classList.add("selected")
    }
}

const down = () => {
    const selected = contextMenu.querySelector(".selected")
    const nodes = [...contextMenu.querySelectorAll(".menu-item")]
    if ([-1, nodes.length - 1].includes(nodes.indexOf(selected))) {
        nodes.forEach(el => el.classList.remove("selected"))
        contextMenu.firstChild.classList.add("selected")
    } else if (active()) {
        const newSelected = nodes[nodes.indexOf(selected) + 1]
        nodes.forEach(el => el.classList.remove("selected"))
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
