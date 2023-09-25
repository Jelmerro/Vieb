/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2021-2023 Jelmer van Arnhem
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
    matchesQuery,
    stringToUrl,
    urlToString,
    specialChars,
    notify,
    title,
    isUrl,
    propPixels,
    execCommand,
    isElement
} = require("../util")
const {
    listTabs,
    currentPage,
    currentTab,
    currentMode,
    getSetting,
    getMouseConf,
    tabForPage,
    getUrl,
    pageForTab,
    listReadyPages,
    sendToPageOrSubFrame
} = require("./common")

/**
 * @typedef {(
 *   "text"|"img"|"frame"|"video"|"audio"|"link"|"titleAttr"|"linkPageTitle"
 * )} contextMenuType
 * @typedef {(import("./tabs").tabPosition | "copyimage")} contextMenuAction
 * @typedef {{
 *   audio?: string,
 *   audioData: {
 *     controllable: boolean,
 *     loop: boolean,
 *     muted: boolean,
 *     paused: boolean
 *   },
 *   backgroundImg?: string,
 *   canEdit: boolean,
 *   extraData?: {
 *     type?: contextMenuType,
 *     action?: contextMenuAction,
 *     force?: boolean,
 *     x?: number
 *     y?: number
 *   },
 *   frame?: string,
 *   frameData?: {controllable?: false},
 *   hasElementListener: boolean,
 *   hasGlobalListener: boolean,
 *   img?: string,
 *   inputSel?: number,
 *   inputVal?: string,
 *   link?: string,
 *   titleAttr?: string,
 *   linkPageTitle?: string,
 *   linkData?: {controllable?:  false},
 *   svgData?: string,
 *   text?: string,
 *   video?: string,
 *   videoData: {
 *     controllable: boolean,
 *     controls: boolean,
 *     loop: boolean,
 *     muted: boolean,
 *     paused: boolean
 *   },
 *   x: number,
 *   y: number,
 *   frameId: string|null,
 *   webviewId: number|null,
 * }} webviewData
 */

const contextMenu = document.getElementById("context-menu")
let pointerRightClick = false

/** Store that the right click action was done via pointer mode. */
const storePointerRightClick = () => {
    pointerRightClick = true
    setTimeout(() => {
        pointerRightClick = false
    }, 100)
}

/** Clear/hide the context menu. */
const clear = () => {
    if (!contextMenu) {
        return
    }
    contextMenu.textContent = ""
}

/** Show the menu within the window by flipping it in either dimension. */
const fixAlignmentNearBorders = () => {
    if (!contextMenu) {
        return
    }
    const bottomMenu = contextMenu.getBoundingClientRect().bottom
    const bottomWindow = document.body.getBoundingClientRect().bottom
    if (bottomMenu > bottomWindow) {
        let top = propPixels(contextMenu.style, "top")
            - contextMenu.getBoundingClientRect().height
        if (top < 0) {
            top = 0
        }
        contextMenu.style.top = `${top}px`
    }
    const rightMenu = contextMenu.getBoundingClientRect().right
    const rightWindow = document.body.getBoundingClientRect().right
    if (rightMenu > rightWindow) {
        let left = propPixels(contextMenu.style, "left")
            - contextMenu.getBoundingClientRect().width
        if (left < 0) {
            left = 0
        }
        contextMenu.style.left = `${left}px`
    }
}

/**
 * Create a new menu group with name.
 * @param {string} name
 */
const createMenuGroup = name => {
    const item = document.createElement("div")
    item.className = "menu-group"
    item.textContent = name
    contextMenu?.append(item)
}

/**
 * Create a new menu item.
 * @param {{title: string, action: () => void}} options
 */
const createMenuItem = options => {
    if (!contextMenu) {
        return
    }
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
    contextMenu.append(item)
}

/** Returns true if the context menu is open/active. */
const active = () => !!contextMenu?.textContent?.trim()

/** Go to the top entry in the menu. */
const top = () => {
    if (!contextMenu) {
        return
    }
    [...contextMenu.querySelectorAll(".menu-item")]
        .forEach(el => el.classList.remove("selected"))
    contextMenu.firstElementChild?.classList.add("selected")
}

/** Returns true if at the top of any section. */
const topOfSection = () => {
    if (!contextMenu) {
        return
    }
    const selected = contextMenu.querySelector(".selected")
    if (selected?.previousSibling) {
        return matchesQuery(selected.previousElementSibling, ".menu-group")
    }
    return true
}

/** Go one entry up, or go to the last entry via wrapping. */
const up = () => {
    if (!contextMenu) {
        return
    }
    const selected = contextMenu.querySelector(".selected")
    /** @type {(Element|null)[]} */
    const nodes = [...contextMenu.querySelectorAll(".menu-item")]
    if (nodes.indexOf(selected) < 1) {
        nodes.forEach(el => el?.classList.remove("selected"))
        contextMenu.lastElementChild?.classList.add("selected")
    } else if (active()) {
        const newSelected = nodes[nodes.indexOf(selected) - 1]
        nodes.forEach(el => el?.classList.remove("selected"))
        newSelected?.classList.add("selected")
    }
}

/** Go up until reaching the top of the section above it. */
const sectionUp = () => {
    up()
    while (!topOfSection()) {
        up()
    }
}

/** Go one entry down, or go to the first entry via wrapping. */
const down = () => {
    if (!contextMenu) {
        return
    }
    const selected = contextMenu.querySelector(".selected")
    /** @type {(Element|null)[]} */
    const nodes = [...contextMenu.querySelectorAll(".menu-item")]
    if ([-1, nodes.length - 1].includes(nodes.indexOf(selected))) {
        nodes.forEach(el => el?.classList.remove("selected"))
        contextMenu.firstElementChild?.classList.add("selected")
    } else if (active()) {
        const newSelected = nodes[nodes.indexOf(selected) + 1]
        nodes.forEach(el => el?.classList.remove("selected"))
        newSelected?.classList.add("selected")
    }
}

/** Go down until reaching the top of the section below it. */
const sectionDown = () => {
    down()
    while (!topOfSection()) {
        down()
    }
}

/** Go to the bottom entry in the menu. */
const bottom = () => {
    if (!contextMenu) {
        return
    }
    [...contextMenu.querySelectorAll(".menu-item")]
        .forEach(el => el.classList.remove("selected"))
    contextMenu.lastElementChild?.classList.add("selected")
}

/** Select the current entry in the menu. */
const select = () => {
    const selected = contextMenu?.querySelector(".selected")
    if (selected instanceof HTMLElement) {
        selected.click()
    }
}

/**
 * Execute a common link action by name, position and custom options.
 * @param {contextMenuType} type
 * @param {contextMenuAction} action
 * @param {Partial<webviewData>} options
 */
const commonAction = (type, action, options) => {
    let relevantData = options[type]
    if (type === "img") {
        relevantData = options.img || options.backgroundImg || options.svgData
    }
    if (type === "linkPageTitle") {
        const {titleForPage} = require("./history")
        relevantData = titleForPage(options.link ?? "")
    }
    if (!relevantData) {
        return
    }
    const {clipboard} = require("electron")
    const {addTab} = require("./tabs")
    const {add} = require("./pagelayout")
    if (action === "copyimage") {
        clipboard.clear()
        const el = document.createElement("img")
        const canvas = document.createElement("canvas")
        /** Once the image is loaded, draw it to a canvas, then copy. */
        el.onload = () => {
            canvas.width = el.naturalWidth
            canvas.height = el.naturalHeight
            canvas.getContext("2d")?.drawImage(el, 0, 0)
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
        addTab({"url": stringToUrl(relevantData)})
    } else if (action === "copy") {
        let urlData = relevantData
        if (isUrl(relevantData)) {
            if (getSetting("encodeurlcopy") === "spacesonly") {
                urlData = relevantData.replace(/ /g, "%20")
            } else if (getSetting("encodeurlcopy") === "nospaces") {
                urlData = urlToString(relevantData).replace(/ /g, "%20")
            } else if (getSetting("encodeurlcopy") === "decode") {
                urlData = urlToString(relevantData)
            } else if (getSetting("encodeurlcopy") === "encode") {
                urlData = stringToUrl(relevantData)
            }
        }
        clipboard.writeText(urlData)
    } else if (action === "download") {
        currentPage()?.downloadURL(stringToUrl(relevantData))
    } else if (action === "split") {
        const currentTabId = currentTab()?.getAttribute("link-id")
        if (currentTab() && currentTabId) {
            addTab({
                "container": getSetting("containersplitpage"),
                "url": relevantData
            })
            add(currentTabId, "ver", getSetting("splitbelow"))
        }
    } else if (action === "vsplit") {
        const currentTabId = currentTab()?.getAttribute("link-id")
        if (currentTab() && currentTabId) {
            addTab({
                "container": getSetting("containersplitpage"),
                "url": relevantData
            })
            add(currentTabId, "hor", getSetting("splitright"))
        }
    } else if (action === "external") {
        const ext = getSetting("externalcommand")
        if (!ext.trim()) {
            notify("No command set to open links externally, "
                + "please update the 'externalcommand' setting",
            {"type": "warn"})
            return
        }
        if (relevantData) {
            let extData = relevantData
            if (getSetting("encodeurlext") === "spacesonly") {
                extData = relevantData.replace(/ /g, "%20")
            } else if (getSetting("encodeurlext") === "nospaces") {
                extData = urlToString(relevantData).replace(/ /g, "%20")
            } else if (getSetting("encodeurlext") === "decode") {
                extData = urlToString(relevantData)
            } else if (getSetting("encodeurlext") === "encode") {
                extData = stringToUrl(relevantData)
            }
            execCommand(`${ext} "${extData}"`, (err, stdout) => {
                const reportExit = getSetting("notificationforsystemcommands")
                if (err && reportExit !== "none") {
                    notify(`${err}`, {"type": "err"})
                } else if (reportExit === "all") {
                    notify(stdout.toString()
                        || "Command exitted successfully!", {"type": "suc"})
                }
            })
        }
    } else if (action === "search") {
        const {incrementalSearch} = require("./actions")
        incrementalSearch({"value": relevantData})
    }
}

/**
 * Open Vieb's internal menu.
 * @param {MouseEvent | {path: Element[], x: number, y: number}} options
 * @param {boolean} force
 */
const viebMenu = (options, force = false) => {
    if (!contextMenu) {
        return
    }
    /** @type {Element[]} */
    let pathEls = []
    if (options instanceof MouseEvent) {
        pathEls = options.composedPath().filter(isElement)
    } else {
        pathEls = options.path
    }
    clear()
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    const {clipboard} = require("electron")
    const {
        useEnteredData, backInHistory, forwardInHistory, refreshTab
    } = require("./actions")
    const menuSetting = getSetting("menuvieb")
    const navMenu = menuSetting === "both" || menuSetting === "navbar" || force
    if (pathEls.some(el => matchesQuery(el, "#url")) && navMenu) {
        const url = getUrl()
        createMenuItem({
            /** Menu item: Select all. */
            "action": () => {
                if (!"sec".includes(currentMode()[0])) {
                    const {setMode} = require("./modes")
                    setMode("explore")
                }
                url?.select()
            },
            "title": "Select all"
        })
        if (url?.value.trim().length) {
            if ("sec".includes(currentMode()[0])) {
                createMenuItem({
                    /** Menu item: Go to url. */
                    "action": () => useEnteredData(), "title": "Go"
                })
            }
        }
        if (window.getSelection()?.toString().trim()) {
            createMenuItem({
                /** Menu item: Cut selection. */
                "action": () => {
                    if (!"sec".includes(currentMode()[0])) {
                        const {setMode} = require("./modes")
                        setMode("explore")
                    }
                    const {cutInput} = require("./input")
                    cutInput()
                },
                "title": "Cut"
            })
            createMenuItem({
                /** Menu item: Copy selection. */
                "action": () => {
                    if (!"sec".includes(currentMode()[0])) {
                        const {setMode} = require("./modes")
                        setMode("explore")
                    }
                    const {copyInput} = require("./input")
                    copyInput()
                },
                "title": "Copy"
            })
        }
        if (clipboard.readText().trim()) {
            createMenuItem({
                /** Menu item: Paste. */
                "action": () => {
                    if (!"sec".includes(currentMode()[0])) {
                        const {setMode} = require("./modes")
                        setMode("explore")
                    }
                    const {pasteInput} = require("./input")
                    pasteInput()
                },
                "title": "Paste"
            })
            createMenuItem({
                /** Menu item: Paste and go to url. */
                "action": () => {
                    if (!"sec".includes(currentMode()[0])) {
                        const {setMode} = require("./modes")
                        setMode("explore")
                    }
                    const {pasteInput} = require("./input")
                    pasteInput()
                    useEnteredData({})
                },
                "title": "Paste & go"
            })
        }
        fixAlignmentNearBorders()
    }
    const tabMenu = menuSetting === "both" || menuSetting === "tabbar" || force
    if (pathEls.some(el => matchesQuery(el, "#tabs")) && tabMenu) {
        const {addTab, reopenTab, closeTab} = require("./tabs")
        const {execute} = require("./command")
        const tab = listTabs().find(t => pathEls.includes(t))
        if (!tab) {
            fixAlignmentNearBorders()
            return
        }
        const page = pageForTab(tab)
        if (!page) {
            fixAlignmentNearBorders()
            return
        }
        const pinned = tab.classList.contains("pinned")
        let pinTitle = "Pin"
        if (pinned) {
            pinTitle = "Unpin"
        }
        createMenuItem({
            /** Menu item: Pin. */
            "action": () => execute(`pin ${listTabs().indexOf(tab)}`),
            "title": pinTitle
        })
        const isSuspended = page?.tagName?.toLowerCase() !== "webview"
        if (!tab.classList.contains("visible-tab") || isSuspended) {
            let suspendTitle = "Suspend"
            if (isSuspended) {
                suspendTitle = "Unsuspend"
            }
            createMenuItem({
                /** Menu item: toggle suspend. */
                "action": () => {
                    const {suspendTab, unsuspendPage} = require("./tabs")
                    if (isSuspended) {
                        unsuspendPage(page)
                    } else {
                        suspendTab(tab)
                    }
                },
                "title": suspendTitle
            })
        }
        if (!(page instanceof HTMLDivElement)) {
            createMenuItem({
                /** Menu item: Refresh tab. */
                "action": () => refreshTab({"customPage": page}),
                "title": "Refresh"
            })
            if (!page.src.startsWith("devtools://") && page?.canGoBack()) {
                createMenuItem({
                    /** Menu item: Previous. */
                    "action": () => {
                        backInHistory({"customPage": page})
                    },
                    "title": "Previous"
                })
            }
            if (!page.src.startsWith("devtools://") && page?.canGoForward()) {
                createMenuItem({
                    /** Menu item: Next. */
                    "action": () => {
                        forwardInHistory({"customPage": page})
                    },
                    "title": "Next"
                })
            }
        }
        createMenuItem({
            /** Menu item: Copy url. */
            "action": () => clipboard.writeText(urlToString(
                page.getAttribute("src") ?? "").replace(/ /g, "%20")),
            "title": "Copy url"
        })
        createMenuItem({
            /** Menu item: Close tab. */
            "action": () => closeTab(listTabs().indexOf(tab), true),
            "title": "Close"
        })
        createMenuGroup("General")
        createMenuItem({"action": addTab, "title": "Newtab"})
        createMenuItem({
            /** Menu item: split horizontal. */
            "action": () => execute("split"), "title": "Split"
        })
        createMenuItem({
            /** Menu item: split vertical. */
            "action": () => execute("vsplit"), "title": "Vsplit"
        })
        createMenuItem({"action": reopenTab, "title": "Reopen"})
        fixAlignmentNearBorders()
    }
}

/**
 * Open the link menu for while in explore mode.
 * @param {{link: string, x: number, y: number}} options
 */
const linkMenu = options => {
    if (!contextMenu) {
        return
    }
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    clear()
    const {addTab, navigateTo} = require("./tabs")
    createMenuItem({
        /** Menu item: Navigate to link. */
        "action": () => navigateTo(options.link), "title": "Navigate"
    })
    createMenuItem({
        /** Menu item: Link in new tab. */
        "action": () => addTab({"url": options.link}), "title": "Newtab"
    })
    createMenuItem({
        /** Menu item: Link to clipboard. */
        "action": () => {
            const {clipboard} = require("electron")
            clipboard.writeText(urlToString(options.link).replace(/ /g, "%20"))
        },
        "title": "Copy"
    })
    createMenuItem({
        /** Menu item: Link download. */
        "action": () => currentPage()?.downloadURL(options.link),
        "title": "Download"
    })
    createMenuItem({
        /** Menu item: Open link externally. */
        "action": () => commonAction("link", "external",
            {"link": options.link}),
        "title": "External"
    })
    createMenuItem({
        /** Menu item: Open link in split. */
        "action": () => commonAction("link", "split", {"link": options.link}),
        "title": "Split"
    })
    createMenuItem({
        /** Menu item: Open link in vertical split. */
        "action": () => commonAction("link", "vsplit", {"link": options.link}),
        "title": "Vsplit"
    })
    fixAlignmentNearBorders()
}

/**
 * Open the command menu for while in command mode.
 * @param {{command: string, x: number, y: number}} options
 */
const commandMenu = options => {
    if (!contextMenu) {
        return
    }
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    clear()
    createMenuItem({
        /** Menu item: Execute the command. */
        "action": () => {
            const {setMode} = require("./modes")
            setMode("normal")
            const {execute} = require("./command")
            execute(options.command)
        },
        "title": "Execute"
    })
    createMenuItem({
        /** Menu item: Copy the command. */
        "action": () => {
            const {clipboard} = require("electron")
            clipboard.writeText(options.command)
        },
        "title": "Copy"
    })
    fixAlignmentNearBorders()
}

/**
 * Show the webview menu using custom options.
 * @param {webviewData} options
 * @param {boolean} force
 */
const webviewMenu = (options, force = false) => {
    clear()
    if (!contextMenu) {
        return
    }
    if (!"ipv".includes(currentMode()[0])) {
        const {setMode} = require("./modes")
        setMode("normal")
    }
    if (!force) {
        if (!pointerRightClick && !getMouseConf("menupage")) {
            return
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
    }
    const page = currentPage()
    if (!page || page.isCrashed()) {
        return
    }
    const {clipboard} = require("electron")
    const {backInHistory, forwardInHistory, refreshTab} = require("./actions")
    const webviewY = propPixels(page.style, "top")
    const webviewX = propPixels(page.style, "left")
    const zoom = page.getZoomFactor()
    contextMenu.style.top = `${Math.round(options.y * zoom + webviewY)}px`
    contextMenu.style.left = `${Math.round(options.x * zoom + webviewX)}px`
    createMenuItem({
        /** Menu item: Refresh tab. */
        "action": () => refreshTab({}), "title": "Refresh"
    })
    if (!page.src.startsWith("devtools://") && page?.canGoBack()) {
        createMenuItem({
            /** Menu item: Back in history. */
            "action": () => backInHistory({}), "title": "Previous"
        })
    }
    if (!page.src.startsWith("devtools://") && page?.canGoForward()) {
        createMenuItem({
            /** Menu item: Forward in history. */
            "action": () => forwardInHistory({}), "title": "Next"
        })
    }
    createMenuItem({
        /** Menu item: Save the page to disk. */
        "action": () => {
            const {execute} = require("./command")
            execute("write")
        },
        "title": "Save page"
    })
    createMenuItem({
        /** Menu item: Open the devtools and inspect the pointed element. */
        "action": () => page.inspectElement(
            Math.round(options.x + webviewX), Math.round(options.y + webviewY)),
        "title": "Inspect"
    })
    const {updateKeysOnScreen} = require("./input")
    updateKeysOnScreen()
    if (options.canEdit && options.inputVal && (options.inputSel ?? 0) >= 0) {
        const wordRegex = specialChars.source.replace("[", "[^")
        const words = options.inputVal.split(new RegExp(`(${
            wordRegex}+|${specialChars.source}+)`, "g")).filter(s => s)
        let letterCount = 0
        let wordIndex = 0
        let word = words[wordIndex]
        while (wordIndex < words.length) {
            word = words[wordIndex].trim()
            letterCount += words[wordIndex].length
            if (letterCount >= (options.inputSel ?? 0)) {
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
                /** Menu item: Change the pointed word to this suggested fix. */
                "action": () => {
                    words[wordIndex] = suggestion
                    sendToPageOrSubFrame("replace-input-field", options.frameId,
                        words.join(""), options.inputSel)
                },
                "title": suggestion
            })
        }
    }
    createMenuGroup("Text")
    createMenuItem({
        /** Menu item: Select all text. */
        "action": () => sendToPageOrSubFrame("action", "selectionAll",
            options.x, options.y),
        "title": "Select all"
    })
    if (options.text) {
        createMenuItem({
            /** Menu item: Navigate to the link or search the text. */
            "action": () => commonAction("text", "open", options),
            "title": "Navigate"
        })
        createMenuItem({
            /** Menu item: Open the link or search the text in newtab. */
            "action": () => commonAction("text", "newtab", options),
            "title": "Newtab"
        })
        createMenuItem({
            /** Menu item: Search the page for the selection. */
            "action": () => commonAction("text", "search", options),
            "title": "Search/find"
        })
        createMenuItem({
            /** Menu item: Split the selection as a link or a search. */
            "action": () => commonAction("text", "split", options),
            "title": "Split"
        })
        createMenuItem({
            /** Menu item: Vsplit the selection as a link or a search. */
            "action": () => commonAction("text", "vsplit", options),
            "title": "Vsplit"
        })
        if (options.canEdit) {
            createMenuItem({
                /** Menu item: Cut the selection. */
                "action": () => sendToPageOrSubFrame("action", "selectionCut",
                    options.x, options.y),
                "title": "Cut"
            })
        }
        createMenuItem({
            /** Menu item: Copy the selection. */
            "action": () => commonAction("text", "copy", options),
            "title": "Copy"
        })
    }
    if (options.canEdit && clipboard.readText().trim()) {
        createMenuItem({
            /** Menu item: Paste text from clipboard at the pointed location. */
            "action": () => sendToPageOrSubFrame("action", "selectionPaste",
                options.x, options.y),
            "title": "Paste"
        })
    }
    if (options.text) {
        createMenuItem({
            /** Menu item: Download the selected text as if a link. */
            "action": () => commonAction("text", "download", options),
            "title": "Download"
        })
        createMenuItem({
            /** Menu item: Open the selected text externally. */
            "action": () => commonAction("text", "external", options),
            "title": "With external"
        })
    }
    if (options.img || options.backgroundImg || options.svgData) {
        createMenuGroup("Image")
        createMenuItem({
            /** Menu item: Navigate to an image. */
            "action": () => commonAction("img", "open", options),
            "title": "Navigate"
        })
        createMenuItem({
            /** Menu item: Open the image in a new tab. */
            "action": () => commonAction("img", "newtab", options),
            "title": "Newtab"
        })
        createMenuItem({
            /** Menu item: Copy the image link to clipboard. */
            "action": () => commonAction("img", "copy", options),
            "title": "Copy link"
        })
        createMenuItem({
            /** Menu item: Copy the image data to clipboard as a buffer. */
            "action": () => commonAction("img", "copyimage", options),
            "title": "Copy image"
        })
        createMenuItem({
            /** Menu item: Download the image to disk. */
            "action": () => commonAction("img", "download", options),
            "title": "Download"
        })
        createMenuItem({
            /** Menu item: Open the image link externally. */
            "action": () => commonAction("img", "external", options),
            "title": "External"
        })
        createMenuItem({
            /** Menu item: Open the image link in a horizontal split. */
            "action": () => commonAction("img", "split", options),
            "title": "Split"
        })
        createMenuItem({
            /** Menu item: Open the image link in a vertical split. */
            "action": () => commonAction("img", "vsplit", options),
            "title": "Vsplit"
        })
    }
    /** @type {("frame"|"video"|"audio"|"link")[]} */
    const types = ["frame", "video", "audio", "link"]
    for (const type of types) {
        if (options[type] || options[`${type}Data`]?.controllable) {
            createMenuGroup(title(type))
        }
        if (options[type]) {
            createMenuItem({
                /** Menu item: Navigate to some media. */
                "action": () => commonAction(type, "open", options),
                "title": "Navigate"
            })
            createMenuItem({
                /** Menu item: Open the media in a new tab. */
                "action": () => commonAction(type, "newtab", options),
                "title": "Newtab"
            })
            createMenuItem({
                /** Menu item: Copy the media link to clipboard. */
                "action": () => commonAction(type, "copy", options),
                "title": "Copy link"
            })
            createMenuItem({
                /** Menu item: Download the media(/link) to disk. */
                "action": () => commonAction(type, "download", options),
                "title": "Download"
            })
            createMenuItem({
                /** Menu item: Open the media link externally. */
                "action": () => commonAction(type, "external", options),
                "title": "External"
            })
            createMenuItem({
                /** Menu item: Open the media link in a horizontal split. */
                "action": () => commonAction(type, "split", options),
                "title": "Split"
            })
            createMenuItem({
                /** Menu item: Open the media link in a vertical split. */
                "action": () => commonAction(type, "vsplit", options),
                "title": "Vsplit"
            })
        }
        if (options[`${type}Data`]?.controllable) {
            let playTitle = "Pause"
            if ((type === "audio" || type === "video")
                && options[`${type}Data`].paused) {
                playTitle = "Play"
            }
            createMenuItem({
                /** Toggle media pause if controllable. */
                "action": () => sendToPageOrSubFrame("action",
                    "togglePause", options.x, options.y),
                "title": playTitle
            })
            let muteTitle = "Mute"
            if ((type === "audio" || type === "video")
                && options[`${type}Data`].muted) {
                muteTitle = "Unmute"
            }
            createMenuItem({
                /** Toggle media mute if controllable. */
                "action": () => sendToPageOrSubFrame("action",
                    "toggleMute", options.x, options.y),
                "title": muteTitle
            })
            let loopTitle = "Loop"
            if ((type === "audio" || type === "video")
                && options[`${type}Data`].loop) {
                loopTitle = "Unloop"
            }
            createMenuItem({
                /** Toggle media loop if controllable. */
                "action": () => sendToPageOrSubFrame("action",
                    "toggleLoop", options.x, options.y),
                "title": loopTitle
            })
            if (type === "video") {
                let controlsTitle = "Show controls"
                if (options[`${type}Data`].controls) {
                    controlsTitle = "Hide controls"
                }
                createMenuItem({
                    /** Toggle video controls. */
                    "action": () => sendToPageOrSubFrame("action",
                        "toggleControls", options.x, options.y),
                    "title": controlsTitle
                })
            }
            createMenuItem({
                /** Increase the media volume. */
                "action": () => sendToPageOrSubFrame("action",
                    "volumeUp", options.x, options.y),
                "title": "Volume up"
            })
            createMenuItem({
                /** Decrease the media volume. */
                "action": () => sendToPageOrSubFrame("action",
                    "volumeDown", options.x, options.y),
                "title": "Volume down"
            })
        }
    }
    fixAlignmentNearBorders()
}

/** Register the context menu handler. */
const init = () => {
    /**
     * Handle context menu info to open the menu with the right details.
     * @param {Electron.IpcRendererEvent} _
     * @param {webviewData} info
     */
    const handleContextMenu = (_, info) => {
        if (info.webviewId) {
            if (info.webviewId !== currentPage()?.getWebContentsId()) {
                const page = listReadyPages().find(
                    p => p.getWebContentsId() === info.webviewId)
                if (page) {
                    const {switchToTab} = require("./tabs")
                    const tab = tabForPage(page)
                    if (tab) {
                        switchToTab(tab)
                    }
                }
            }
        }
        if (info.extraData?.type && info.extraData?.action) {
            commonAction(info.extraData.type, info.extraData.action, info)
        } else {
            webviewMenu(info, info?.extraData?.force)
        }
    }

    ipcRenderer.on("context-click-info", handleContextMenu)
}

module.exports = {
    active,
    bottom,
    clear,
    commandMenu,
    commonAction,
    down,
    init,
    linkMenu,
    sectionDown,
    sectionUp,
    select,
    storePointerRightClick,
    top,
    up,
    viebMenu
}
