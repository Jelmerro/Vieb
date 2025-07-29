/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2021-2025 Jelmer van Arnhem
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
const {translate} = require("../translate")
const {
    execCommand,
    getSetting,
    isElement,
    isUrl,
    matchesQuery,
    notify,
    pageContainerPos,
    propPixels,
    specialChars,
    stringToUrl,
    urlToString
} = require("../util")
const {
    currentMode,
    currentPage,
    currentTab,
    getMouseConf,
    getUrl,
    listReadyPages,
    listTabs,
    pageForTab,
    sendToPageOrSubFrame,
    tabForPage
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
 *     x?: number,
 *     y?: number,
 *     src?: import("./common").RunSource
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
 *   webviewId: number|null
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
 * @param {"audio"|"frame"|"general"|"image"
 *   |"link"|"suggestions"|"text"|"video"} name
 */
const createMenuGroup = name => {
    const item = document.createElement("div")
    item.className = "menu-group"
    item.textContent = translate(`contextmenu.groups.${name}`)
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
 * @param {import("./common").RunSource} src
 * @param {contextMenuType} type
 * @param {contextMenuAction} action
 * @param {Partial<webviewData>} options
 */
const commonAction = (src, type, action, options) => {
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
    const {add} = require("./pagelayout")
    const {addTab} = require("./tabs")
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
        navigateTo(src, stringToUrl(relevantData))
    } else if (action === "newtab") {
        addTab({src, "url": stringToUrl(relevantData)})
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
        if (src === "execute") {
            const {updateDownloadSettings} = require("./settings")
            updateDownloadSettings(true)
            setTimeout(() => {
                currentPage()?.downloadURL(stringToUrl(relevantData ?? ""))
            }, 100)
        } else {
            currentPage()?.downloadURL(stringToUrl(relevantData))
        }
    } else if (action === "split") {
        const currentTabId = currentTab()?.getAttribute("link-id")
        if (currentTab() && currentTabId) {
            addTab({
                "container": getSetting("containersplitpage"),
                src,
                "url": relevantData
            })
            add(currentTabId, "ver", getSetting("splitbelow"))
        }
    } else if (action === "vsplit") {
        const currentTabId = currentTab()?.getAttribute("link-id")
        if (currentTab() && currentTabId) {
            addTab({
                "container": getSetting("containersplitpage"),
                src,
                "url": relevantData
            })
            add(currentTabId, "hor", getSetting("splitright"))
        }
    } else if (action === "external") {
        const ext = getSetting("externalcommand")
        if (!ext.trim()) {
            notify({
                "id": "commands.externalcommand.missing", src, "type": "warning"
            })
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
                    notify({
                        "fields": [`${err}`],
                        "id": "actions.command.failed",
                        src,
                        "type": "error"
                    })
                } else if (reportExit === "all") {
                    const output = stdout.toString()
                    if (output) {
                        notify({
                            "fields": [output],
                            "id": "actions.command.successWithOutput",
                            src,
                            "type": "success"
                        })
                    } else {
                        notify({
                            "id": "actions.command.success",
                            src,
                            "type": "success"
                        })
                    }
                }
            })
        }
    } else if (action === "search") {
        const {incrementalSearch} = require("./actions")
        incrementalSearch({src, "value": relevantData})
    }
}

/**
 * Open Vieb's internal menu.
 * @param {import("./common").RunSource} src
 * @param {MouseEvent | {path: Element[], x: number, y: number}} options
 * @param {boolean} force
 */
const viebMenu = (src, options, force = false) => {
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
        backInHistory,
        forwardInHistory,
        openNewTabWithCurrentUrl,
        refreshTab,
        useEnteredData
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
            "title": translate("contextmenu.text.selectAll")
        })
        if (url?.value.trim().length) {
            if ("sec".includes(currentMode()[0])) {
                createMenuItem({
                    /** Menu item: Go to url. */
                    "action": () => useEnteredData({src}),
                    "title": translate("contextmenu.general.go")
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
                "title": translate("contextmenu.text.cut")
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
                "title": translate("contextmenu.text.copy")
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
                "title": translate("contextmenu.text.paste")
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
                    useEnteredData({src})
                },
                "title": translate("contextmenu.text.pasteGo")
            })
        }
        fixAlignmentNearBorders()
    }
    const tabMenu = menuSetting === "both" || menuSetting === "tabbar" || force
    if (pathEls.some(el => matchesQuery(el, "#tabs")) && tabMenu) {
        const {execute} = require("./command")
        const {addTab, closeTab, reopenTab} = require("./tabs")
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
        let pinTitle = translate("contextmenu.tab.pin")
        if (pinned) {
            pinTitle = translate("contextmenu.tab.unpin")
        }
        createMenuItem({
            /** Menu item: Pin. */
            "action": () => execute(`pin ${listTabs().indexOf(tab)}`, {src}),
            "title": pinTitle
        })
        const isSuspended = page?.tagName?.toLowerCase() !== "webview"
        if (!tab.classList.contains("visible-tab") || isSuspended) {
            let suspendTitle = translate("contextmenu.tab.suspend")
            if (isSuspended) {
                suspendTitle = translate("contextmenu.tab.unsuspend")
            }
            createMenuItem({
                /** Menu item: toggle suspend. */
                "action": () => {
                    const {suspendTab, unsuspendPage} = require("./tabs")
                    if (isSuspended) {
                        unsuspendPage(page)
                    } else {
                        suspendTab(src, tab)
                    }
                },
                "title": suspendTitle
            })
        }
        if (!(page instanceof HTMLDivElement)) {
            createMenuItem({
                /** Menu item: Refresh tab. */
                "action": () => refreshTab({"customPage": page, src}),
                "title": translate("contextmenu.tab.refresh")
            })
            if (!page.src.startsWith("devtools://") && page?.canGoBack()) {
                createMenuItem({
                    /** Menu item: Previous. */
                    "action": () => {
                        backInHistory({"customPage": page, src})
                    },
                    "title": translate("contextmenu.tab.previous")
                })
            }
            if (!page.src.startsWith("devtools://") && page?.canGoForward()) {
                createMenuItem({
                    /** Menu item: Next. */
                    "action": () => {
                        forwardInHistory({"customPage": page, src})
                    },
                    "title": translate("contextmenu.tab.next")
                })
            }
        }
        createMenuItem({
            /** Add a tab next to the selected tab. */
            "action": () => {
                const tabnewposition = getSetting("tabnewposition")
                let index = listTabs().indexOf(tab)
                if (tabnewposition === "right") {
                    index += 1
                }
                addTab({"customIndex": index, pinned, src})
            },
            "title": translate("contextmenu.tab.addHere")
        })
        createMenuItem({
            /** Menu item: Copy url. */
            "action": () => clipboard.writeText(urlToString(
                page.getAttribute("src") ?? "").replace(/ /g, "%20")),
            "title": translate("contextmenu.tab.copy")
        })
        createMenuItem({
            /** Menu item: Open an empty new tab to edit the current url. */
            "action": () => openNewTabWithCurrentUrl({"customPage": page, src}),
            "title": translate("contextmenu.tab.cloneEdit")
        })
        createMenuItem({
            /** Menu item: Open a new tab with the current url and navigate. */
            "action": () => {
                const tabnewposition = getSetting("tabnewposition")
                let index = listTabs().indexOf(tab)
                if (tabnewposition === "right") {
                    index += 1
                }
                addTab({
                    "customIndex": index,
                    src,
                    "url": page.getAttribute("src") ?? ""
                })
            },
            "title": translate("contextmenu.tab.cloneGo")
        })
        createMenuItem({
            /** Menu item: Close tab. */
            "action": () => closeTab(src, listTabs().indexOf(tab), true),
            "title": translate("contextmenu.tab.close")
        })
        createMenuGroup("general")
        createMenuItem({
            /** Menu item: Add tab. */
            "action": () => addTab({src}),
            "title": translate("contextmenu.tab.add")
        })
        createMenuItem({
            /** Menu item: Split horizontal. */
            "action": () => execute("split", {src}),
            "title": translate("contextmenu.general.split")
        })
        createMenuItem({
            /** Menu item: Split vertical. */
            "action": () => execute("vsplit", {src}),
            "title": translate("contextmenu.general.vsplit")
        })
        createMenuItem({
            /** Menu item: Reopen tab. */
            "action": () => reopenTab(src),
            "title": translate("contextmenu.tab.reopen")
        })
        fixAlignmentNearBorders()
    }
}

/**
 * Open the link menu for while in explore mode.
 * @param {import("./common").RunSource} src
 * @param {{link: string, x: number, y: number}} options
 */
const linkMenu = (src, options) => {
    if (!contextMenu) {
        return
    }
    contextMenu.style.top = `${options.y}px`
    contextMenu.style.left = `${options.x}px`
    clear()
    const {addTab, navigateTo} = require("./tabs")
    createMenuItem({
        /** Menu item: Navigate to link. */
        "action": () => navigateTo(src, options.link),
        "title": translate("contextmenu.general.navigate")
    })
    createMenuItem({
        /** Menu item: Link in new tab. */
        "action": () => addTab({src, "url": options.link}),
        "title": translate("contextmenu.general.newtab")
    })
    createMenuItem({
        /** Menu item: Link to clipboard. */
        "action": () => {
            const {clipboard} = require("electron")
            clipboard.writeText(urlToString(options.link).replace(/ /g, "%20"))
        },
        "title": translate("contextmenu.general.copy")
    })
    createMenuItem({
        /** Menu item: Link download. */
        "action": () => {
            if (src === "execute") {
                const {updateDownloadSettings} = require("./settings")
                updateDownloadSettings(true)
                setTimeout(() => {
                    currentPage()?.downloadURL(options.link)
                }, 100)
            } else {
                currentPage()?.downloadURL(options.link)
            }
        },
        "title": translate("contextmenu.general.download")
    })
    createMenuItem({
        /** Menu item: Open link externally. */
        "action": () => commonAction(src, "link", "external",
            {"link": options.link}),
        "title": translate("contextmenu.general.external")
    })
    createMenuItem({
        /** Menu item: Open link in split. */
        "action": () => commonAction(
            src, "link", "split", {"link": options.link}),
        "title": translate("contextmenu.general.split")
    })
    createMenuItem({
        /** Menu item: Open link in vertical split. */
        "action": () => commonAction(
            src, "link", "vsplit", {"link": options.link}),
        "title": translate("contextmenu.general.vsplit")
    })
    fixAlignmentNearBorders()
}

/**
 * Open the command menu for while in command mode.
 * @param {import("./common").RunSource} src
 * @param {{command: string, x: number, y: number}} options
 */
const commandMenu = (src, options) => {
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
            execute(options.command, {src})
        },
        "title": translate("contextmenu.general.execute")
    })
    createMenuItem({
        /** Menu item: Copy the command. */
        "action": () => {
            const {clipboard} = require("electron")
            clipboard.writeText(options.command)
        },
        "title": translate("contextmenu.general.copy")
    })
    fixAlignmentNearBorders()
}

/**
 * Show the webview menu using custom options.
 * @param {import("./common").RunSource} src
 * @param {webviewData} options
 * @param {boolean} force
 */
const webviewMenu = (src, options, force = false) => {
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
    const containerPos = pageContainerPos()
    const webviewY = propPixels(page.style, "top") + containerPos.top
    const webviewX = propPixels(page.style, "left") + containerPos.left
    const zoom = page.getZoomFactor()
    contextMenu.style.top = `${Math.round(options.y * zoom + webviewY)}px`
    contextMenu.style.left = `${Math.round(options.x * zoom + webviewX)}px`
    createMenuItem({
        /** Menu item: Refresh tab. */
        "action": () => refreshTab({src}),
        "title": translate("contextmenu.tab.refresh")
    })
    if (!page.src.startsWith("devtools://") && page?.canGoBack()) {
        createMenuItem({
            /** Menu item: Back in history. */
            "action": () => backInHistory({src}),
            "title": translate("contextmenu.tab.previous")
        })
    }
    if (!page.src.startsWith("devtools://") && page?.canGoForward()) {
        createMenuItem({
            /** Menu item: Forward in history. */
            "action": () => forwardInHistory({src}),
            "title": translate("contextmenu.tab.next")
        })
    }
    createMenuItem({
        /** Menu item: Save the page to disk. */
        "action": () => {
            const {execute} = require("./command")
            execute("write", {src})
        },
        "title": translate("contextmenu.tab.save")
    })
    createMenuItem({
        /** Menu item: Open the devtools and inspect the pointed element. */
        "action": () => page.inspectElement(
            Math.round(options.x * zoom + webviewX),
            Math.round(options.y * zoom + webviewY)),
        "title": translate("contextmenu.tab.inspect")
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
            createMenuGroup("suggestions")
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
    createMenuGroup("text")
    createMenuItem({
        /** Menu item: Select all text. */
        "action": () => sendToPageOrSubFrame("action", "selectionAll",
            options.x, options.y),
        "title": translate("contextmenu.text.selectAll")
    })
    if (options.text) {
        createMenuItem({
            /** Menu item: Navigate to the link or search the text. */
            "action": () => commonAction(src, "text", "open", options),
            "title": translate("contextmenu.general.navigate")
        })
        createMenuItem({
            /** Menu item: Open the link or search the text in newtab. */
            "action": () => commonAction(src, "text", "newtab", options),
            "title": translate("contextmenu.general.newtab")
        })
        createMenuItem({
            /** Menu item: Search the page for the selection. */
            "action": () => commonAction(src, "text", "search", options),
            "title": translate("contextmenu.general.search")
        })
        createMenuItem({
            /** Menu item: Split the selection as a link or a search. */
            "action": () => commonAction(src, "text", "split", options),
            "title": translate("contextmenu.general.split")
        })
        createMenuItem({
            /** Menu item: Vsplit the selection as a link or a search. */
            "action": () => commonAction(src, "text", "vsplit", options),
            "title": translate("contextmenu.general.vsplit")
        })
        if (options.canEdit) {
            createMenuItem({
                /** Menu item: Cut the selection. */
                "action": () => sendToPageOrSubFrame("action", "selectionCut",
                    options.x, options.y),
                "title": translate("contextmenu.text.cut")
            })
        }
        createMenuItem({
            /** Menu item: Copy the selection. */
            "action": () => commonAction(src, "text", "copy", options),
            "title": translate("contextmenu.text.copy")
        })
    }
    if (options.canEdit && clipboard.readText().trim()) {
        createMenuItem({
            /** Menu item: Paste text from clipboard at the pointed location. */
            "action": () => sendToPageOrSubFrame("action", "selectionPaste",
                options.x, options.y),
            "title": translate("contextmenu.text.paste")
        })
    }
    if (options.text) {
        createMenuItem({
            /** Menu item: Download the selected text as if a link. */
            "action": () => commonAction(src, "text", "download", options),
            "title": translate("contextmenu.general.download")
        })
        createMenuItem({
            /** Menu item: Open the selected text externally. */
            "action": () => commonAction(src, "text", "external", options),
            "title": translate("contextmenu.general.external")
        })
    }
    if (options.img || options.backgroundImg || options.svgData) {
        createMenuGroup("image")
        createMenuItem({
            /** Menu item: Navigate to an image. */
            "action": () => commonAction(src, "img", "open", options),
            "title": translate("contextmenu.general.navigate")
        })
        createMenuItem({
            /** Menu item: Open the image in a new tab. */
            "action": () => commonAction(src, "img", "newtab", options),
            "title": translate("contextmenu.general.newtab")
        })
        createMenuItem({
            /** Menu item: Copy the image link to clipboard. */
            "action": () => commonAction(src, "img", "copy", options),
            "title": translate("contextmenu.general.copyLink")
        })
        createMenuItem({
            /** Menu item: Copy the image data to clipboard as a buffer. */
            "action": () => commonAction(src, "img", "copyimage", options),
            "title": translate("contextmenu.general.copyImage")
        })
        createMenuItem({
            /** Menu item: Download the image to disk. */
            "action": () => commonAction(src, "img", "download", options),
            "title": translate("contextmenu.general.download")
        })
        createMenuItem({
            /** Menu item: Open the image link externally. */
            "action": () => commonAction(src, "img", "external", options),
            "title": translate("contextmenu.general.external")
        })
        createMenuItem({
            /** Menu item: Open the image link in a horizontal split. */
            "action": () => commonAction(src, "img", "split", options),
            "title": translate("contextmenu.general.split")
        })
        createMenuItem({
            /** Menu item: Open the image link in a vertical split. */
            "action": () => commonAction(src, "img", "vsplit", options),
            "title": translate("contextmenu.general.vsplit")
        })
    }
    /** @type {("frame"|"video"|"audio"|"link")[]} */
    const types = ["frame", "video", "audio", "link"]
    for (const type of types) {
        if (options[type] || options[`${type}Data`]?.controllable) {
            createMenuGroup(type)
        }
        if (options[type]) {
            createMenuItem({
                /** Menu item: Navigate to some media. */
                "action": () => commonAction(src, type, "open", options),
                "title": translate("contextmenu.general.navigate")
            })
            createMenuItem({
                /** Menu item: Open the media in a new tab. */
                "action": () => commonAction(src, type, "newtab", options),
                "title": translate("contextmenu.general.newtab")
            })
            createMenuItem({
                /** Menu item: Copy the media link to clipboard. */
                "action": () => commonAction(src, type, "copy", options),
                "title": translate("contextmenu.general.copyLink")
            })
            createMenuItem({
                /** Menu item: Download the media(/link) to disk. */
                "action": () => commonAction(src, type, "download", options),
                "title": translate("contextmenu.general.download")
            })
            createMenuItem({
                /** Menu item: Open the media link externally. */
                "action": () => commonAction(src, type, "external", options),
                "title": translate("contextmenu.general.external")
            })
            createMenuItem({
                /** Menu item: Open the media link in a horizontal split. */
                "action": () => commonAction(src, type, "split", options),
                "title": translate("contextmenu.general.split")
            })
            createMenuItem({
                /** Menu item: Open the media link in a vertical split. */
                "action": () => commonAction(src, type, "vsplit", options),
                "title": translate("contextmenu.general.vsplit")
            })
        }
        if (options[`${type}Data`]?.controllable) {
            let playTitle = translate("contextmenu.tab.pause")
            if ((type === "audio" || type === "video")
                && options[`${type}Data`].paused) {
                playTitle = translate("contextmenu.tab.play")
            }
            createMenuItem({
                /** Toggle media pause if controllable. */
                "action": () => sendToPageOrSubFrame("action",
                    "togglePause", options.x, options.y),
                "title": playTitle
            })
            let muteTitle = translate("contextmenu.tab.mute")
            if ((type === "audio" || type === "video")
                && options[`${type}Data`].muted) {
                muteTitle = translate("contextmenu.tab.unmute")
            }
            createMenuItem({
                /** Toggle media mute if controllable. */
                "action": () => sendToPageOrSubFrame("action",
                    "toggleMute", options.x, options.y),
                "title": muteTitle
            })
            let loopTitle = translate("contextmenu.tab.loop")
            if ((type === "audio" || type === "video")
                && options[`${type}Data`].loop) {
                loopTitle = translate("contextmenu.tab.unloop")
            }
            createMenuItem({
                /** Toggle media loop if controllable. */
                "action": () => sendToPageOrSubFrame("action",
                    "toggleLoop", options.x, options.y),
                "title": loopTitle
            })
            if (type === "video") {
                let controlsTitle = translate("contextmenu.tab.showControls")
                if (options[`${type}Data`].controls) {
                    controlsTitle = translate("contextmenu.tab.hideControls")
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
                "title": translate("contextmenu.tab.volumeUp")
            })
            createMenuItem({
                /** Decrease the media volume. */
                "action": () => sendToPageOrSubFrame("action",
                    "volumeDown", options.x, options.y),
                "title": translate("contextmenu.tab.volumeDown")
            })
            createMenuItem({
                /** Increase the media speed. */
                "action": () => sendToPageOrSubFrame("action",
                    "playbackUp", options.x, options.y),
                "title": translate("contextmenu.tab.playbackUp")
            })
            createMenuItem({
                /** Decrease the media speed. */
                "action": () => sendToPageOrSubFrame("action",
                    "playbackDown", options.x, options.y),
                "title": translate("contextmenu.tab.playbackDown")
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
            commonAction(info.extraData.src ?? "user", info.extraData.type,
                info.extraData.action, info)
        } else {
            webviewMenu(info.extraData?.src ?? "user",
                info, info?.extraData?.force)
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
