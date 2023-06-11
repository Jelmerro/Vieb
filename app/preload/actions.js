/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2023 Jelmer van Arnhem
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
    activeElement,
    writeFile,
    querySelectorAll,
    findFrameInfo,
    findElementAtPosition,
    fetchJSON,
    isHTMLAnchorElement,
    isHTMLElement,
    isInputOrTextElement,
    isHTMLVideoElement,
    isHTMLAudioElement,
    isElement
} = require("../util")

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

/**
 * Navigate to the next page if available.
 * @param {string} selector
 * @param {boolean} newtab
 */
const navigateToPage = (selector, newtab) => {
    const paginations = querySelectorAll(selector)
    for (const pagination of paginations) {
        if (isHTMLAnchorElement(pagination) && pagination?.href) {
            if (newtab) {
                ipcRenderer.sendToHost("url", pagination.href)
            } else {
                window.location.href = pagination.href
            }
            return
        }
    }
}

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

const scrollTop = () => scrollBy(0, -window.innerHeight - 1000000000)

const scrollLeft = () => scrollBy(-100, 0)

const scrollDown = () => scrollBy(0, 100)

const scrollUp = () => scrollBy(0, -100)

const scrollRight = () => scrollBy(100, 0)

const scrollBottom = () => scrollBy(0, window.innerHeight + 1000000000)

const scrollLeftMax = () => scrollBy(-window.innerWidth - 1000000000, 0)

const scrollRightMax = () => scrollBy(window.innerWidth + 1000000000, 0)

const scrollPageRight = () => scrollBy(window.innerWidth - 50, 0)

const scrollPageLeft = () => scrollBy(-window.innerWidth + 50, 0)

const scrollPageUp = () => scrollBy(0, -window.innerHeight + 50)

const scrollPageDownHalf = () => scrollBy(0, window.innerHeight / 2 - 25)

const scrollPageDown = () => scrollBy(0, window.innerHeight - 50)

const scrollPageUpHalf = () => scrollBy(0, -window.innerHeight / 2 + 25)

const focusTopLeftCorner = () => {
    const el = document.elementFromPoint(0, 0)
    if (isHTMLElement(el)) {
        el.focus()
    }
}

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
    Node.TEXT_NODE, Node.COMMENT_NODE, Node.CDATA_SECTION_NODE
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
        if (["kbd", "style", "script"].includes(base.nodeName.toLowerCase())) {
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
            if (["kbd", "code"].includes(textNode.nodeName.toLowerCase())) {
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
                return ipcRenderer.sendToHost("notify",
                    `Error from LibreTranslate: ${srcResponse.error}`, "err")
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
                return ipcRenderer.sendToHost("notify",
                    `Error from LibreTranslate: ${response.error}`, "err")
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
        } catch (e) {
            ipcRenderer.sendToHost("notify",
                "Failed to connect to LibreTranslate, see console", "err")
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
            return ipcRenderer.sendToHost("notify",
                `Error from Deepl: ${response.message}`, "err")
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
    } catch (e) {
        ipcRenderer.sendToHost("notify",
            "Failed to connect to Deepl for translation, see console", "err")
        console.warn(e)
    }
}

const functions = {
    blur,
    exitFullscreen,
    focusTopLeftCorner,
    nextPage,
    previousPage,
    print,
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
    toggleControls,
    toggleLoop,
    toggleMute,
    togglePause,
    translatepage,
    volumeDown,
    volumeUp,
    writeInputToFile
}

// @ts-expect-error too many signatures to realistically type, maybe someday
ipcRenderer.on("action", (_, name, ...args) => functions[name]?.(...args))

window.addEventListener("DOMContentLoaded", () => {
    ipcRenderer.on("set-custom-styling", (_, fontsize, customCSS) => {
        document.body.style.fontSize = `${fontsize}px`
        if (!document.getElementById("custom-styling")) {
            const styleElement = document.createElement("style")
            styleElement.id = "custom-styling"
            document.head.append(styleElement)
        }
        const customStyle = document.getElementById("custom-styling")
        if (customStyle) {
            customStyle.textContent = customCSS
        }
        document.body.style.opacity = "1"
    })
})
