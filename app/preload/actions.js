/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2025 Jelmer van Arnhem
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
    activeElement,
    fetchJSON,
    findElementAtPosition,
    findFrameInfo,
    getAppRootDir,
    isElement,
    isHTMLAnchorElement,
    isHTMLAudioElement,
    isHTMLElement,
    isHTMLLinkElement,
    isHTMLVideoElement,
    isInputOrTextElement,
    joinPath,
    querySelectorAll,
    readFile,
    writeFile
} = require("../util")

/**
 * Send a notification to the renderer thread.
 * @param {import("../util").NotificationInfo} opts
 */
const notify = opts => ipcRenderer.sendToHost("notify", opts)

/**
 * Navigate to the next page if available.
 * @param {string} selector
 * @param {boolean} newtab
 */
const navigateToPage = (selector, newtab) => {
    const paginations = querySelectorAll(selector)
    for (const pagination of paginations) {
        if ((isHTMLAnchorElement(pagination) || isHTMLLinkElement(pagination))
            && pagination?.href) {
            if (newtab) {
                ipcRenderer.sendToHost("url", pagination.href)
            } else {
                window.location.href = pagination.href
            }
            return
        }
    }
}

/**
 * Go to the next page if available, optionally in a new tab.
 * @param {boolean} newtab
 */
const nextPage = newtab => navigateToPage("*[rel=next], .navi-next", newtab)

/**
 * Go to the previous page if available, optionally in a new tab.
 * @param {boolean} newtab
 */
const previousPage = newtab => navigateToPage("*[rel=prev], .navi-prev", newtab)

/** Unfocus the currently active element. */
const blur = () => {
    const el = activeElement()
    if (isHTMLElement(el)) {
        el.blur()
    }
}

/**
 * Scroll the page x and y pixels.
 * @param {number} x
 * @param {number} y
 */
const scrollBy = (x, y) => {
    if (window.innerHeight === document.documentElement.scrollHeight) {
        document.body.scrollBy(x, y)
    } else {
        window.scrollBy(x, y)
    }
}

/**
 * Scroll the page to a specific percentage.
 * @param {number} perc
 */
const scrollPerc = perc => {
    if (document.documentElement.scrollHeight === window.innerHeight) {
        const scrollHeightMinusScreen = document.body.scrollHeight
            - window.innerHeight
        document.body.scrollTo(0, scrollHeightMinusScreen * perc / 100)
    } else {
        const scrollHeightMinusScreen = document.documentElement.scrollHeight
            - window.innerHeight
        window.scrollTo(0, scrollHeightMinusScreen * perc / 100)
    }
}

/** Scroll to the top of the page. */
const scrollTop = () => scrollBy(0, -window.innerHeight - 1000000000)

/** Scroll 100px left. */
const scrollLeft = () => scrollBy(-100, 0)

/** Scroll 100px down. */
const scrollDown = () => scrollBy(0, 100)

/** Scroll 100px up. */
const scrollUp = () => scrollBy(0, -100)

/** Scroll 100px right. */
const scrollRight = () => scrollBy(100, 0)

/** Scroll to the bottom of the page. */
const scrollBottom = () => scrollBy(0, window.innerHeight + 1000000000)

/** Scroll to the left of the page. */
const scrollLeftMax = () => scrollBy(-window.innerWidth - 1000000000, 0)

/** Scroll to the right of the page. */
const scrollRightMax = () => scrollBy(window.innerWidth + 1000000000, 0)

/** Scroll one page to the right. */
const scrollPageRight = () => scrollBy(window.innerWidth - 50, 0)

/** Scroll one page to the left. */
const scrollPageLeft = () => scrollBy(-window.innerWidth + 50, 0)

/** Scroll one page up. */
const scrollPageUp = () => scrollBy(0, -window.innerHeight + 50)

/** Scroll half of a page down. */
const scrollPageDownHalf = () => scrollBy(0, window.innerHeight / 2 - 25)

/** Scroll one page down. */
const scrollPageDown = () => scrollBy(0, window.innerHeight - 50)

/** Scroll half of a page up. */
const scrollPageUpHalf = () => scrollBy(0, -window.innerHeight / 2 + 25)

/** Bring focus to the topleft, to focus the page but no specific element. */
const focusTopLeftCorner = () => {
    const el = document.elementFromPoint(0, 0)
    if (isHTMLElement(el)) {
        el.focus()
    }
}

/** Exit the page fullscreen state. */
const exitFullscreen = () => document.exitFullscreen()

/** @type {{[filename: string]: Element}} */
const writeableInputs = {}

/**
 * Set the text of an input to what was edited inside the vimcommand editor.
 * @param {string} filename
 * @param {string} text
 */
const setInputFieldText = (filename, text) => {
    const el = writeableInputs[filename]
    if (isInputOrTextElement(el)) {
        el.value = text
    } else if (el?.getAttribute("contenteditable") === "true") {
        el.textContent = text
    }
}

/**
 * Write the contents of a specific input to a file.
 * @param {string} filename
 */
const writeInputToFile = filename => {
    const el = activeElement()
    if (!el) {
        return
    }
    if (isInputOrTextElement(el)) {
        writeFile(filename, el.value)
    } else if (el?.getAttribute("contenteditable") === "true") {
        writeFile(filename, el.textContent ?? "")
    }
    writeableInputs[filename] = el
}

/** Print the page. */
const print = () => document.execCommand("print")

/**
 * Toggle video player controls at location x,y.
 * @param {number} x
 * @param {number} y
 */
const toggleControls = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (isHTMLVideoElement(el)) {
        if (el.hasAttribute("controls")
            && el.getAttribute("controls") !== "false") {
            el.removeAttribute("controls")
        } else {
            el.setAttribute("controls", "controls")
        }
    }
}

/**
 * Toggle the loop property at location x,y.
 * @param {number} x
 * @param {number} y
 */
const toggleLoop = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (isHTMLAudioElement(el) || isHTMLVideoElement(el)) {
        if (el.hasAttribute("loop") && el.getAttribute("loop") !== "false") {
            el.removeAttribute("loop")
        } else {
            el.setAttribute("loop", "loop")
        }
    }
}

/**
 * Toggle the mute status ate location x,y.
 * @param {number} x
 * @param {number} y
 */
const toggleMute = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (isHTMLAudioElement(el) || isHTMLVideoElement(el)) {
        if (el.volume === 0) {
            el.volume = 1
        } else {
            el.volume = 0
        }
    }
}

/**
 * Toggle pause at location x,y.
 * @param {number} x
 * @param {number} y
 */
const togglePause = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (isHTMLAudioElement(el) || isHTMLVideoElement(el)) {
        if (el.paused) {
            el.play()
        } else {
            el.pause()
        }
    }
}

/**
 * Lower the volume at location x,y.
 * @param {number} x
 * @param {number} y
 */
const volumeDown = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (isHTMLAudioElement(el) || isHTMLVideoElement(el)) {
        el.volume = Math.max(0, el.volume - 0.1) || 0
    }
}

/**
 * Raise the volume at location x,y.
 * @param {number} x
 * @param {number} y
 */
const volumeUp = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (isHTMLAudioElement(el) || isHTMLVideoElement(el)) {
        el.volume = Math.min(1, el.volume + 0.1) || 1
    }
}

const playbackLevels = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4]

/**
 * Decrease the playbackRate to the slower level.
 * @param {number} x
 * @param {number} y
 */
const playbackDown = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (isHTMLAudioElement(el) || isHTMLVideoElement(el)) {
        el.playbackRate = playbackLevels[Math.max(
            0, playbackLevels.indexOf(el.playbackRate) - 1)]
    }
}

/**
 * Increase the playbackRate to the faster level.
 * @param {number} x
 * @param {number} y
 */
const playbackUp = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (isHTMLAudioElement(el) || isHTMLVideoElement(el)) {
        el.playbackRate = playbackLevels[Math.max(0, Math.min(
            playbackLevels.length - 1,
            playbackLevels.indexOf(el.playbackRate) + 1))]
    }
}

/**
 * Find the base document at location x,y.
 * @param {number} x
 * @param {number} y
 */
const documentAtPos = (x, y) => findElementAtPosition(x, y)
    ?.ownerDocument || document

/**
 * Check if a node is a text node.
 * @param {any} node
 * @returns {node is Text|Comment|CDATASection}
 */
const isTextNode = node => [
    Node.CDATA_SECTION_NODE, Node.COMMENT_NODE, Node.TEXT_NODE
].includes(node.nodeType)

/**
 * Calculate the offset in characters for a given position in an element.
 * @param {Node} startNode
 * @param {number} startX
 * @param {number} startY
 * @param {number} x
 * @param {number} y
 */
const calculateOffset = (startNode, startX, startY, x, y) => {
    const range = (findElementAtPosition(startX, startY)
        ?.ownerDocument || document).createRange()
    range.setStart(startNode, 0)
    try {
        range.setEnd(startNode, 1)
    } catch {
        return {"node": startNode, "offset": 0}
    }
    let properNode = startNode
    let offset = 0

    /**
     * Descend down into a node of the tree.
     * @param {Node} baseNode
     */
    const descendNodeTree = baseNode => {
        /**
         * Find a point inside the range.
         * @param {number} start
         * @param {number} end
         */
        const pointInsideRegion = (start, end) => {
            range.setStart(baseNode, start)
            range.setEnd(baseNode, end)
            return [...range.getClientRects()].find(rect => x >= rect.left
                && y >= rect.top && x <= rect.right && y <= rect.bottom)
        }

        let left = 0
        let right = 0
        if (isTextNode(baseNode)) {
            right = baseNode.length
        } else {
            right = baseNode.childNodes.length
        }
        if (right === 0) {
            return
        }
        while (right - left > 1) {
            const center = left + Math.floor((right - left) / 2)
            if (pointInsideRegion(left, center)) {
                right = center
            } else if (pointInsideRegion(center, right)) {
                left = center
            } else {
                break
            }
        }
        if (isTextNode(baseNode)) {
            properNode = baseNode
            offset = left
            return
        }
        descendNodeTree(baseNode.childNodes[left])
    }

    descendNodeTree(startNode)
    range.detach()
    return {"node": properNode, offset}
}

/**
 * Select all at location x,y.
 * @param {number} x
 * @param {number} y
 */
const selectionAll = (x, y) => documentAtPos(x, y).execCommand("selectAll")

/**
 * Cut a selection at location x,y.
 * @param {number} x
 * @param {number} y
 */
const selectionCut = (x, y) => documentAtPos(x, y).execCommand("cut")

/**
 * Paste a selection at location x,y.
 * @param {number} x
 * @param {number} y
 */
const selectionPaste = (x, y) => documentAtPos(x, y).execCommand("paste")

/**
 * Remove the selection from the document at location x,y.
 * @param {number} x
 * @param {number} y
 */
const selectionRemove = (x, y) => documentAtPos(x, y).getSelection()
    ?.removeAllRanges()

/**
 * Make a new selection from start position to end position.
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 */
const selectionRequest = (startX, startY, endX, endY) => {
    querySelectorAll("*")
    let startNode = findElementAtPosition(startX, startY)
    if (!startNode || startY < 0 || startY > window.innerHeight) {
        startNode = document.body
    }
    const selectDocument = startNode?.ownerDocument || document
    const padding = findFrameInfo(startNode)
    const startResult = calculateOffset(startNode, startX, startY,
        startX - (padding?.x || 0), startY - (padding?.y || 0))
    const endNode = findElementAtPosition(endX, endY)
    const endResult = calculateOffset(endNode ?? document.body, startX, startY,
        endX - (padding?.x || 0), endY - (padding?.y || 0))
    const newSelectRange = selectDocument.createRange()
    newSelectRange.setStart(startResult.node, startResult.offset)
    if (isTextNode(endResult.node) && endResult.node.length > 1) {
        newSelectRange.setEnd(endResult.node, endResult.offset + 1)
    } else {
        newSelectRange.setEnd(endResult.node, endResult.offset)
    }
    selectDocument.getSelection()?.removeAllRanges()
    selectDocument.getSelection()?.addRange(newSelectRange)
    if (!selectDocument.getSelection()?.toString()) {
        newSelectRange.setStart(endResult.node, endResult.offset)
        if (isTextNode(endResult.node) && endResult.node.length > 1) {
            newSelectRange.setEnd(startResult.node, startResult.offset + 1)
        } else {
            newSelectRange.setEnd(startResult.node, startResult.offset)
        }
        selectDocument.getSelection()?.removeAllRanges()
        selectDocument.getSelection()?.addRange(newSelectRange)
    }
}

/**
 * Translate a page based on api name, url, language and api key.
 * @param {string} api
 * @param {string} url
 * @param {string} lang
 * @param {string} apiKey
 */
const translatepage = async(api, url, lang, apiKey) => {
    [...document.querySelectorAll("rt")].forEach(r => r.remove())
    ;[...document.querySelectorAll("ruby")].forEach(r => r?.parentNode
        ?.replaceChild(document.createTextNode(r?.textContent ?? ""), r))
    const tree = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let textNodes = []
    /** @type {TreeWalker|{currentNode: null}} */
    let {currentNode} = tree
    while (currentNode) {
        textNodes.push(currentNode)
        currentNode = tree.nextNode()
    }
    textNodes = textNodes.filter(n => (n.nodeValue?.length ?? 0) > 5)
    /** @type {Node[]} */
    let baseNodes = []
    textNodes.forEach(n => {
        let base = n.parentNode ?? n
        if (n.childNodes.length === 1
            && n.childNodes[0].nodeName === "#text" && n.parentNode) {
            base = n.parentNode
        }
        if (["kbd", "script", "style"].includes(base.nodeName.toLowerCase())) {
            return
        }
        if (baseNodes.includes(base) || base === document.body) {
            return
        }
        baseNodes.push(base)
    })
    const parsedNodes = baseNodes.map(base => {
        const txtEl = document.createElement("p")
        for (const textNode of base.childNodes) {
            const subText = document.createElement("p")
            if (["code", "kbd"].includes(textNode.nodeName.toLowerCase())) {
                // Skip element text
            } else if (isElement(textNode)
                && textNode.textContent === textNode.innerHTML) {
                subText.textContent = textNode.textContent
            } else if (textNode.nodeName === "#text") {
                subText.textContent = textNode.textContent
            }
            txtEl.append(subText)
        }
        if (txtEl.textContent?.trim()) {
            return txtEl
        }
        baseNodes = baseNodes.filter(b => b !== base)
        return null
    }).filter(el => el)
    const strings = parsedNodes.map(n => n?.innerHTML ?? "")
    if (api === "libretranslate") {
        try {
            const srcResponse = await fetchJSON(`${url}/detect`, {
                "headers": {"Content-Type": "application/json"},
                "method": "POST"
            }, JSON.stringify({
                "api_key": apiKey,
                "q": strings
            }))
            if (srcResponse.error) {
                return notify({
                    "fields": [srcResponse.error],
                    "id": "actions.translations.errors.libretranslate",
                    "src": "user",
                    "type": "error"
                })
            }
            const response = await fetchJSON(`${url}/translate`, {
                "headers": {"Content-Type": "application/json"},
                "method": "POST"
            }, JSON.stringify({
                "api_key": apiKey,
                "format": "html",
                "q": strings,
                "source": srcResponse[0]?.language,
                "target": lang
            }))
            if (response.error) {
                return notify({
                    "fields": [response.error],
                    "id": "actions.translations.errors.libretranslate",
                    "src": "user",
                    "type": "error"
                })
            }
            if (response.translatedText) {
                baseNodes.forEach((node, index) => {
                    const text = response.translatedText[index]
                    if (!text) {
                        return
                    }
                    const resEl = document.createElement("div")
                    resEl.innerHTML = text
                    ;[...node.childNodes].forEach((txtEl, txtIndex) => {
                        const txt = resEl.childNodes[txtIndex]?.textContent
                        if (txt) {
                            txtEl.textContent = txt
                        }
                    })
                })
            }
        } catch(e) {
            notify({
                "id": "actions.translations.errors.general",
                "src": "user",
                "type": "error"
            })
            console.warn(e)
        }
        return
    }
    try {
        const response = await fetchJSON(`${url}/translate`, {
            "headers": {
                "Authorization": `DeepL-Auth-Key ${apiKey}`,
                "Content-Type": "application/json"
            },
            "method": "POST"
        }, JSON.stringify({
            "split_sentences": "nonewlines",
            "tag_handling": "html",
            "target_lang": lang,
            "text": strings
        }))
        if (response.message) {
            return notify({
                "fields": [response.message],
                "id": "actions.translations.errors.deepl",
                "src": "user",
                "type": "error"
            })
        }
        if (response.translations) {
            baseNodes.forEach((node, index) => {
                const text = response.translations[index]?.text
                if (!text) {
                    return
                }
                const resEl = document.createElement("div")
                resEl.innerHTML = text
                ;[...node.childNodes].forEach((txtEl, txtIndex) => {
                    const txt = resEl.childNodes[txtIndex]?.textContent
                    if (txt) {
                        txtEl.textContent = txt
                    }
                })
            })
        }
    } catch(e) {
        notify({
            "id": "actions.translations.errors.general",
            "src": "user",
            "type": "error"
        })
        console.warn(e)
    }
}

const randomTOCId = `vieb-toc-${Math.random()}`
let scrollPositionTOC = 0

/**
 * Show the table of contents in a shadowroot with custom styling applied.
 * @param {string} customStyling
 * @param {number} fontsize
 */
const showTOC = (customStyling, fontsize) => {
    if (document.getElementById(randomTOCId)) {
        return
    }
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
    const toc = document.createElement("div")
    toc.id = "toc"
    const title = document.createElement("h1")
    title.textContent = translate("actions.toc.title")
    const baseUl = document.createElement("ul")
    baseUl.setAttribute("depth", "1")
    const lists = [baseUl]
    const topLink = document.createElement("a")
    const topUrl = new URL(window.location.href)
    topUrl.hash = ""
    topLink.href = topUrl.href
    topLink.textContent = translate("actions.toc.top")
    toc.append(title, topLink, baseUl)

    /** Returns the current taversing depth of the toc. */
    const currentDepth = () => Number(lists.at(-1)?.getAttribute("depth"))

    /** @type {string[]} */
    const headingNames = []
    for (const heading of headings) {
        const depth = Number(heading.tagName[1])
        while (currentDepth() > depth && lists.length > 1) {
            lists.pop()
        }
        while (currentDepth() < depth) {
            const list = document.createElement("ul")
            list.setAttribute("depth", String(currentDepth() + 1))
            lists.at(-1)?.append(list)
            lists.push(list)
        }
        const listItem = document.createElement("li")
        const baseHeadingId = heading.id || `toc_${heading.textContent
            ?.replace(/\s+/g, "_").replace(/[\u{0080}-\u{FFFF}]/gu, "")
            || Math.round(Math.random() * 1000000000000000)}`
        let headingId = baseHeadingId
        let duplicateHeadingCounter = 2
        while (headingNames.includes(headingId)) {
            headingId = `${baseHeadingId}${duplicateHeadingCounter}`
            duplicateHeadingCounter += 1
        }
        const listLink = document.createElement("a")
        listLink.href = `#${headingId}`
        listLink.textContent = heading.textContent
        heading.id = headingId
        listItem.append(listLink)
        lists.at(-1)?.append(listItem)
    }
    const tocContainer = document.createElement("div")
    tocContainer.style.position = "fixed"
    tocContainer.style.top = "0"
    tocContainer.style.left = "0"
    tocContainer.style.right = "0"
    tocContainer.style.bottom = "0"
    tocContainer.style.width = "100vw"
    tocContainer.style.height = "100vh"
    tocContainer.style.pointerEvents = "none"
    tocContainer.style.zIndex = "999999999"
    tocContainer.id = randomTOCId
    const tocShadow = tocContainer.attachShadow({"mode": "open"})
    const defaultStylesheet = document.createElement("style")
    defaultStylesheet.textContent = (readFile(joinPath(
        getAppRootDir(), "colors/default.css")) ?? "").replace(":root", ":host")
    const customStylesheet = document.createElement("style")
    customStylesheet.textContent = customStyling.replace(":root", ":host")
    customStylesheet.textContent += `\n#toc {font-size: ${fontsize}px;}`
    tocShadow.append(defaultStylesheet, customStylesheet, toc)
    document.body.append(tocContainer)
    toc.scrollTop = scrollPositionTOC
    toc.addEventListener("scroll", () => {
        scrollPositionTOC = toc.scrollTop
    })
}

/** Hide the table of contents from view by removing it entirely. */
const hideTOC = () => document.getElementById(randomTOCId)?.remove()

/**
 * Toggle the table of contents in a shadowroot with custom styling applied.
 * @param {string} customStyling
 * @param {number} fontsize
 */
const toggleTOC = (customStyling, fontsize) => {
    if (document.getElementById(randomTOCId)) {
        hideTOC()
    } else {
        showTOC(customStyling, fontsize)
    }
}

/**
 * Rerender the table of contents in a shadowroot with the new custom styling.
 * @param {string} customStyling
 * @param {number} fontsize
 */
const rerenderTOC = (customStyling, fontsize) => {
    const existingTOC = document.getElementById(randomTOCId)
    if (existingTOC) {
        hideTOC()
        showTOC(customStyling, fontsize)
    }
}

const functions = {
    blur,
    exitFullscreen,
    focusTopLeftCorner,
    hideTOC,
    nextPage,
    playbackDown,
    playbackUp,
    previousPage,
    print,
    rerenderTOC,
    scrollBottom,
    scrollDown,
    scrollLeft,
    scrollLeftMax,
    scrollPageDown,
    scrollPageDownHalf,
    scrollPageLeft,
    scrollPageRight,
    scrollPageUp,
    scrollPageUpHalf,
    scrollPerc,
    scrollRight,
    scrollRightMax,
    scrollTop,
    scrollUp,
    selectionAll,
    selectionCut,
    selectionPaste,
    selectionRemove,
    selectionRequest,
    setInputFieldText,
    showTOC,
    toggleControls,
    toggleLoop,
    toggleMute,
    togglePause,
    toggleTOC,
    translatepage,
    volumeDown,
    volumeUp,
    writeInputToFile
}
// @ts-expect-error too many signatures to realistically type, maybe someday
ipcRenderer.on("action", (_, name, ...args) => functions[name]?.(...args))
