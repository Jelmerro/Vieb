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

const {
    matchesQuery, stringToUrl, urlToString, specialChars, notify, title
} = require("../util")
const {
    listTabs, currentPage, tabOrPageMatching, currentMode, getSetting
} = require("./common")

const contextMenu = document.getElementById("context-menu")

const viebMenu = options => {
    clear()
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    const {clipboard} = require("electron")
    const {
        useEnteredData, backInHistory, forwardInHistory, reload
    } = require("./actions")
    const {addTab, reopenTab, closeTab} = require("./tabs")
    const menuSetting = getSetting("menuvieb")
    const navMenu = menuSetting === "both" || menuSetting === "navbar"
    if (options.path.find(el => matchesQuery(el, "#url")) && navMenu) {
        createMenuItem({
            "action": () => {
                if (!"sec".includes(currentMode()[0])) {
                    const {setMode} = require("./modes")
                    setMode("explore")
                }
                document.getElementById("url").select()
            },
            "title": "Select all"
        })
        if (document.getElementById("url").value.trim().length) {
            if ("sec".includes(currentMode()[0])) {
                createMenuItem({
                    "action": () => useEnteredData(), "title": "Go"
                })
            }
        }
        if (getSelection().toString().trim()) {
            createMenuItem({
                "action": () => {
                    if (!"sec".includes(currentMode()[0])) {
                        const {setMode} = require("./modes")
                        setMode("explore")
                    }
                    document.execCommand("cut")
                },
                "title": "Cut"
            })
            createMenuItem({
                "action": () => {
                    if (!"sec".includes(currentMode()[0])) {
                        const {setMode} = require("./modes")
                        setMode("explore")
                    }
                    document.execCommand("copy")
                },
                "title": "Copy"
            })
        }
        if (clipboard.readText().trim()) {
            createMenuItem({
                "action": () => {
                    if (!"sec".includes(currentMode()[0])) {
                        const {setMode} = require("./modes")
                        setMode("explore")
                    }
                    document.execCommand("paste")
                },
                "title": "Paste"
            })
            createMenuItem({
                "action": () => {
                    if (!"sec".includes(currentMode()[0])) {
                        const {setMode} = require("./modes")
                        setMode("explore")
                    }
                    document.execCommand("paste")
                    useEnteredData()
                },
                "title": "Paste & go"
            })
        }
        fixAlignmentNearBorders()
    }
    const tabMenu = menuSetting === "both" || menuSetting === "tabbar"
    if (options.path.find(el => matchesQuery(el, "#tabs")) && tabMenu) {
        const tab = options.path.find(el => matchesQuery(el, "#tabs > span"))
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
            "action": () => {
                const {execute} = require("./command")
                execute(`pin ${listTabs().indexOf(tab)}`)
            },
            "title": pinTitle
        })
        const page = tabOrPageMatching(tab)
        if (page && !page.isCrashed()) {
            createMenuItem({
                "action": () => reload(tabOrPageMatching(tab)),
                "title": "Refresh"
            })
            if (!page.src.startsWith("devtools://") && page?.canGoBack()) {
                createMenuItem({
                    "action": () => backInHistory(tabOrPageMatching(tab)),
                    "title": "Previous"
                })
            }
            if (!page.src.startsWith("devtools://") && page?.canGoForward()) {
                createMenuItem({
                    "action": () => forwardInHistory(tabOrPageMatching(tab)),
                    "title": "Next"
                })
            }
        }
        createMenuItem({"action": addTab, "title": "Open new"})
        createMenuItem({"action": reopenTab, "title": "Undo closed"})
        createMenuItem({
            "action": () => clipboard.writeText(urlToString(
                tabOrPageMatching(tab).src)),
            "title": "Copy url"
        })
        if (!pinned || getSetting("closablepinnedtabs")) {
            createMenuItem({
                "action": () => closeTab(listTabs().indexOf(tab)),
                "title": "Close this"
            })
        }
        fixAlignmentNearBorders()
    }
}

const webviewMenu = options => {
    clear()
    if (!"ipv".includes(currentMode()[0])) {
        const {setMode} = require("./modes")
        setMode("normal")
    }
    const menuSetting = getSetting("menupage")
    if (menuSetting === "never") {
        return
    }
    if (options.hasGlobalListener && menuSetting === "globalasneeded") {
        return
    }
    if (options.hasElementListener && menuSetting !== "always") {
        return
    }
    const page = currentPage()
    if (!page || page.isCrashed()) {
        return
    }
    const {clipboard} = require("electron")
    const {backInHistory, forwardInHistory, reload} = require("./actions")
    const webviewY = Number(page.style.top.replace("px", ""))
    const webviewX = Number(page.style.left.replace("px", ""))
    const zoom = page.getZoomFactor()
    contextMenu.style.top = `${Math.round(options.y * zoom + webviewY)}px`
    contextMenu.style.left = `${Math.round(options.x * zoom + webviewX)}px`
    createMenuItem({"action": () => reload(), "title": "Refresh"})
    if (!page.src.startsWith("devtools://") && page?.canGoBack()) {
        createMenuItem({"action": () => backInHistory(), "title": "Previous"})
    }
    if (!page.src.startsWith("devtools://") && page?.canGoForward()) {
        createMenuItem({"action": () => forwardInHistory(), "title": "Next"})
    }
    createMenuItem({
        "action": () => {
            const {execute} = require("./command")
            execute("write")
        },
        "title": "Save page"
    })
    createMenuItem({
        "action": () => page.inspectElement(
            Math.round(options.x + webviewX), Math.round(options.y + webviewY)),
        "title": "Inspect"
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
                "action": () => {
                    words[wordIndex] = suggestion
                    currentPage().send("replace-input-field",
                        words.join(""), options.inputSel)
                },
                "title": suggestion
            })
        }
    }
    createMenuGroup("Text")
    createMenuItem({
        "action": () => currentPage().send("selection-all",
            options.x, options.y),
        "title": "Select all"
    })
    if (options.text) {
        createMenuItem({
            "action": () => commonAction("text", "open", options),
            "title": "Navigate"
        })
        createMenuItem({
            "action": () => commonAction("text", "newtab", options),
            "title": "In new tab"
        })
        createMenuItem({
            "action": () => commonAction("text", "search", options),
            "title": "Search page"
        })
        if (options.canEdit) {
            createMenuItem({
                "action": () => currentPage().send("selection-cut",
                    options.x, options.y),
                "title": "Cut"
            })
        }
        createMenuItem({
            "action": () => commonAction("img", "copy", options),
            "title": "Copy"
        })
    }
    if (options.canEdit && clipboard.readText().trim()) {
        createMenuItem({
            "action": () => currentPage().send("selection-paste",
                options.x, options.y),
            "title": "Paste"
        })
    }
    if (options.text) {
        createMenuItem({
            "action": () => commonAction("img", "download", options),
            "title": "Download"
        })
        createMenuItem({
            "action": () => commonAction("img", "external", options),
            "title": "With external"
        })
    }
    if (options.img || options.backgroundImg || options.svgData) {
        createMenuGroup("Image")
        createMenuItem({
            "action": () => commonAction("img", "open", options),
            "title": "Navigate"
        })
        createMenuItem({
            "action": () => commonAction("img", "newtab", options),
            "title": "In new tab"
        })
        createMenuItem({
            "action": () => commonAction("img", "copy", options),
            "title": "Copy link"
        })
        createMenuItem({
            "action": () => commonAction("img", "copyimage", options),
            "title": "Copy image"
        })
        createMenuItem({
            "action": () => commonAction("img", "download", options),
            "title": "Download"
        })
        createMenuItem({
            "action": () => commonAction("img", "external", options),
            "title": "With external"
        })
    }
    for (const type of ["frame", "video", "audio", "link"]) {
        if (options[type]) {
            createMenuGroup(title(type))
            createMenuItem({
                "action": () => commonAction(type, "open", options),
                "title": "Navigate"
            })
            createMenuItem({
                "action": () => commonAction(type, "newtab", options),
                "title": "In new tab"
            })
            createMenuItem({
                "action": () => commonAction(type, "copy", options),
                "title": "Copy link"
            })
            createMenuItem({
                "action": () => commonAction(type, "download", options),
                "title": "Download"
            })
            createMenuItem({
                "action": () => commonAction(type, "external", options),
                "title": "With external"
            })
            if (type === "audio" || type === "video") {
                let playTitle = "Pause"
                if (options[`${type}Data`].paused) {
                    playTitle = "Play"
                }
                createMenuItem({
                    "action": () => currentPage()?.send("action",
                        "togglePause", options.x, options.y),
                    "title": playTitle
                })
                let muteTitle = "Mute"
                if (options[`${type}Data`].muted) {
                    muteTitle = "Unmute"
                }
                createMenuItem({
                    "action": () => currentPage()?.send("action",
                        "toggleMute", options.x, options.y),
                    "title": muteTitle
                })
                let loopTitle = "Loop"
                if (options[`${type}Data`].loop) {
                    loopTitle = "Unloop"
                }
                createMenuItem({
                    "action": () => currentPage()?.send("action",
                        "toggleLoop", options.x, options.y),
                    "title": loopTitle
                })
                if (type === "audio") {
                    continue
                }
                let controlsTitle = "Show controls"
                if (options[`${type}Data`].controls) {
                    controlsTitle = "Hide controls"
                }
                createMenuItem({
                    "action": () => currentPage()?.send("action",
                        "toggleControls", options.x, options.y),
                    "title": controlsTitle
                })
            }
        }
    }
    fixAlignmentNearBorders()
}

const linkMenu = options => {
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    clear()
    const {addTab, navigateTo} = require("./tabs")
    createMenuItem({
        "action": () => navigateTo(options.link), "title": "Navigate"
    })
    createMenuItem({
        "action": () => addTab({"url": options.link}), "title": "In new tab"
    })
    createMenuItem({
        "action": () => {
            const {clipboard} = require("electron")
            clipboard.writeText(options.link)
        },
        "title": "Copy"
    })
    createMenuItem({
        "action": () => currentPage().downloadURL(options.link),
        "title": "Download"
    })
    fixAlignmentNearBorders()
}

const commandMenu = options => {
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    clear()
    createMenuItem({
        "action": () => {
            const {setMode} = require("./modes")
            setMode("normal")
            const {execute} = require("./command")
            execute(options.command)
        },
        "title": "Execute"
    })
    createMenuItem({
        "action": () => {
            const {clipboard} = require("electron")
            clipboard.writeText(options.command)
        },
        "title": "Copy"
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

const createMenuGroup = name => {
    const item = document.createElement("div")
    item.className = "menu-group"
    item.textContent = name
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

const commonAction = (type, action, options) => {
    let relevantData = options[type]
    if (type === "img") {
        relevantData = options.img || options.backgroundImg || options.svgData
    }
    if (!relevantData) {
        return
    }
    if (action === "copyimage") {
        const {clipboard} = require("electron")
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
        el.src = relevantData
        return
    }
    if (action === "open") {
        const {navigateTo} = require("./tabs")
        navigateTo(stringToUrl(relevantData))
    } else if (action === "newtab") {
        const {addTab} = require("./tabs")
        addTab({"url": stringToUrl(relevantData)})
    } else if (action === "copy") {
        const {clipboard} = require("electron")
        clipboard.writeText(relevantData)
    } else if (action === "download") {
        currentPage().downloadURL(stringToUrl(relevantData))
    } else if (action === "external") {
        const ext = getSetting("externalcommand")
        if (!ext.trim()) {
            notify("No command set to open links externally, "
                + "please update the 'externalcommand' setting", "warn")
            return
        }
        const {exec} = require("child_process")
        if (relevantData) {
            exec(`${ext} "${relevantData}"`, err => {
                if (err) {
                    notify("Command to open links externally failed, "
                        + "please update the 'externalcommand' setting", "err")
                }
            })
        }
    } else if (action === "search") {
        const {incrementalSearch} = require("./actions")
        incrementalSearch(relevantData)
    }
}

module.exports = {
    active,
    clear,
    commandMenu,
    commonAction,
    down,
    linkMenu,
    select,
    up,
    viebMenu,
    webviewMenu
}
