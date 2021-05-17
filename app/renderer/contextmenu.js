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
    if (options.path.find(el => el.matches?.("#url")) && navMenu) {
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
    if (options.path.find(el => el.matches?.("#tabs")) && tabMenu) {
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
            "action": () => {
                const {execute} = require("./command")
                execute(`pin ${listTabs().indexOf(tab)}`)
            },
            "title": pinTitle
        })
        createMenuItem({
            "action": () => reload(tabOrPageMatching(tab)), "title": "Refresh"
        })
        createMenuItem({
            "action": () => backInHistory(tabOrPageMatching(tab)),
            "title": "Previous"
        })
        createMenuItem({
            "action": () => forwardInHistory(tabOrPageMatching(tab)),
            "title": "Next"
        })
        createMenuItem({"action": addTab, "title": "Open new"})
        createMenuItem({"action": reopenTab, "title": "Undo closed"})
        createMenuItem({
            "action": () => clipboard.writeText(urlToString(
                tabOrPageMatching(tab).src)),
            "title": "Copy url"
        })
        if (!pinned || getSetting("closablepinnedtabs")) {
            createMenuItem({
                "action": () => {
                    closeTab(listTabs().indexOf(tab))
                },
                "title": "Close this"
            })
        }
        fixAlignmentNearBorders()
    }
}

const webviewMenu = options => {
    clear()
    if (currentMode() !== "insert") {
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
    createMenuItem({"action": () => reload(), "title": "Refresh"})
    createMenuItem({"action": () => backInHistory(), "title": "Previous"})
    createMenuItem({"action": () => forwardInHistory(), "title": "Next"})
    createMenuItem({
        "action": () => {
            const {execute} = require("./command")
            execute("write")
        },
        "title": "Save page"
    })
    createMenuItem({
        "action": () => currentPage().inspectElement(
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
    if (options.frame) {
        createMenuGroup("Iframe")
        createMenuItem({
            "action": () => navigateTo(stringToUrl(options.frame)),
            "title": "Navigate"
        })
        createMenuItem({
            "action": () => addTab({"url": stringToUrl(options.frame)}),
            "title": "In new tab"
        })
        createMenuItem({
            "action": () => clipboard.writeText(options.frame),
            "title": "Copy location"
        })
        createMenuItem({
            "action": () => currentPage().downloadURL(options.frame),
            "title": "Download"
        })
    }
    createMenuGroup("Text")
    createMenuItem({
        "action": () => currentPage().send("selection-all",
            options.x, options.y),
        "title": "Select all"
    })
    if (options.text) {
        if (options.canEdit) {
            createMenuItem({
                "action": () => currentPage().send("selection-cut",
                    options.x, options.y),
                "title": "Cut"
            })
        }
        createMenuItem({
            "action": () => clipboard.writeText(options.text), "title": "Copy"
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
        createMenuGroup("Selection")
        if (isUrl(options.text)) {
            createMenuItem({
                "action": () => navigateTo(stringToUrl(options.text)),
                "title": "Navigate"
            })
            createMenuItem({
                "action": () => addTab({"url": stringToUrl(options.text)}),
                "title": "In new tab"
            })
        } else {
            createMenuItem({
                "action": () => navigateTo(stringToUrl(options.text)),
                "title": "Search"
            })
            createMenuItem({
                "action": () => addTab({"url": stringToUrl(options.text)}),
                "title": "Search in new tab"
            })
        }
    }
    if (options.img || options.backgroundImg || options.svgData) {
        createMenuGroup("Image")
    }
    if (options.img || options.backgroundImg) {
        createMenuItem({
            "action": () => navigateTo(options.img || options.backgroundImg),
            "title": "Navigate"
        })
        createMenuItem({
            "action": () => addTab(
                {"url": options.img || options.backgroundImg}),
            "title": "In new tab"
        })
        createMenuItem({
            "action": () => clipboard.writeText(
                options.img || options.backgroundImg),
            "title": "Copy link"
        })
    }
    if (options.img || options.backgroundImg || options.svgData) {
        createMenuItem({
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
            },
            "title": "Copy image"
        })
        createMenuItem({
            "action": () => currentPage().downloadURL(
                options.img || options.backgroundImg || options.svgData),
            "title": "Download"
        })
    }
    if (options.video) {
        createMenuGroup("Video")
        createMenuItem({
            "action": () => navigateTo(options.video), "title": "Navigate"
        })
        createMenuItem({
            "action": () => addTab({"url": options.video}),
            "title": "In new tab"
        })
        createMenuItem({
            "action": () => clipboard.writeText(options.video),
            "title": "Copy link"
        })
        createMenuItem({
            "action": () => currentPage().downloadURL(options.video),
            "title": "Download"
        })
    }
    if (options.audio) {
        createMenuGroup("Audio")
        createMenuItem({
            "action": () => navigateTo(options.audio), "title": "Navigate"
        })
        createMenuItem({
            "action": () => addTab({"url": options.audio}),
            "title": "In new tab"
        })
        createMenuItem({
            "action": () => clipboard.writeText(options.audio),
            "title": "Copy link"
        })
        createMenuItem({
            "action": () => currentPage().downloadURL(options.audio),
            "title": "Download"
        })
    }
    if (options.link) {
        createMenuGroup("Link")
        createMenuItem({
            "action": () => navigateTo(options.link), "title": "Navigate"
        })
        createMenuItem({
            "action": () => addTab({"url": options.link}), "title": "In new tab"
        })
        createMenuItem({
            "action": () => clipboard.writeText(options.link), "title": "Copy"
        })
        createMenuItem({
            "action": () => currentPage().downloadURL(options.link),
            "title": "Download"
        })
        createMenuItem({
            "action": () => openLinkExternal(options.link),
            "title": "With external"
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
    active,
    clear,
    commandMenu,
    down,
    linkMenu,
    select,
    up,
    viebMenu,
    webviewMenu
}
