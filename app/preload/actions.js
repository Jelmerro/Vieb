/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2021 Jelmer van Arnhem
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
    matchesQuery
} = require("../util")

const nextPage = newtab => navigateToPage("*[rel=next], .navi-next", newtab)

const previousPage = newtab => navigateToPage("*[rel=prev], .navi-prev", newtab)

const navigateToPage = (selector, newtab) => {
    const paginations = querySelectorAll(selector)
    for (const pagination of paginations) {
        if (pagination?.href) {
            if (newtab) {
                ipcRenderer.sendToHost("url", pagination.href)
            } else {
                window.location = pagination.href
            }
            return
        }
    }
}

const blur = () => activeElement()?.blur?.()

const scrollTop = () => window.scrollBy(0, -window.innerHeight - 1000000000)

const scrollLeft = () => window.scrollBy(-100, 0)

const scrollDown = () => window.scrollBy(0, 100)

const scrollUp = () => window.scrollBy(0, -100)

const scrollRight = () => window.scrollBy(100, 0)

const scrollBottom = () => window.scrollBy(0, window.innerHeight + 1000000000)

const scrollLeftMax = () => window.scrollBy(-window.innerWidth - 1000000000, 0)

const scrollRightMax = () => window.scrollBy(window.innerWidth + 1000000000, 0)

const scrollPageRight = () => window.scrollBy(window.innerWidth - 50, 0)

const scrollPageLeft = () => window.scrollBy(-window.innerWidth + 50, 0)

const scrollPageUp = () => window.scrollBy(0, -window.innerHeight + 50)

const scrollPageDownHalf = () => window.scrollBy(0, window.innerHeight / 2 - 25)

const scrollPageDown = () => window.scrollBy(0, window.innerHeight - 50)

const scrollPageUpHalf = () => window.scrollBy(0, -window.innerHeight / 2 + 25)

const focusTopLeftCorner = () => document.elementFromPoint(0, 0).focus()

const exitFullscreen = () => document.exitFullscreen()

const writeableInputs = {}

const setInputFieldText = (filename, text) => {
    const el = writeableInputs[filename]
    if (["input", "textarea"].includes(el.tagName.toLowerCase())) {
        el.value = text
    } else if (el.getAttribute("contenteditable") === "true") {
        el.textContent = text
    }
}

const writeInputToFile = filename => {
    const el = activeElement()
    if (el) {
        if (["input", "textarea"].includes(el.tagName.toLowerCase())) {
            writeFile(filename, el.value)
        } else if (el.getAttribute("contenteditable") === "true") {
            writeFile(filename, el.textContent)
        }
        writeableInputs[filename] = el
    }
}

const print = () => document.execCommand("print")

const installFirefoxExtension = () => {
    const link = Array.from(document.querySelectorAll("a") || []).find(
        a => a.href?.endsWith(".xpi"))?.href
    const extension = link?.replace(/.*\/(\d{7,10}).*/g, "$1")
    if (link && extension) {
        ipcRenderer.send("install-extension", link, extension, "xpi")
    } else {
        ipcRenderer.sendToHost("notify",
            "No extensions found on this page", "warn")
    }
}

const toggleControls = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (matchesQuery(el, "video")) {
        if (["", "controls", "true"].includes(el.getAttribute("controls"))) {
            el.removeAttribute("controls")
        } else {
            el.setAttribute("controls", "controls")
        }
    }
}

const toggleLoop = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (matchesQuery(el, "audio, video")) {
        if (["", "loop", "true"].includes(el.getAttribute("loop"))) {
            el.removeAttribute("loop")
        } else {
            el.setAttribute("loop", "loop")
        }
    }
}

const toggleMute = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (matchesQuery(el, "audio, video")) {
        if (el.volume === 0) {
            el.volume = 1
        } else {
            el.volume = 0
        }
    }
}

const togglePause = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (matchesQuery(el, "audio, video")) {
        if (el.paused) {
            el.play()
        } else {
            el.pause()
        }
    }
}

const documentAtPos = (x, y) => findElementAtPosition(x, y)
    ?.ownerDocument || document

const isTextNode = node => [
    Node.TEXT_NODE, Node.COMMENT_NODE, Node.CDATA_SECTION_NODE
].includes(node.nodeType)

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
    const descendNodeTree = baseNode => {
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

const selectionAll = (x, y) => documentAtPos(x, y).execCommand("selectAll")
const selectionCut = (x, y) => documentAtPos(x, y).execCommand("cut")
const selectionPaste = (x, y) => documentAtPos(x, y).execCommand("paste")
const selectionRemove = (x, y) => documentAtPos(x, y).getSelection()
    .removeAllRanges()
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
    const endResult = calculateOffset(endNode, startX, startY,
        endX - (padding?.x || 0), endY - (padding?.y || 0))
    const newSelectRange = selectDocument.createRange()
    newSelectRange.setStart(startResult.node, startResult.offset)
    if (isTextNode(endResult.node) && endResult.node.length > 1) {
        newSelectRange.setEnd(endResult.node, endResult.offset + 1)
    } else {
        newSelectRange.setEnd(endResult.node, endResult.offset)
    }
    selectDocument.getSelection().removeAllRanges()
    selectDocument.getSelection().addRange(newSelectRange)
    if (!selectDocument.getSelection().toString()) {
        newSelectRange.setStart(endResult.node, endResult.offset)
        if (isTextNode(endResult.node) && endResult.node.length > 1) {
            newSelectRange.setEnd(startResult.node, startResult.offset + 1)
        } else {
            newSelectRange.setEnd(startResult.node, startResult.offset)
        }
        selectDocument.getSelection().removeAllRanges()
        selectDocument.getSelection().addRange(newSelectRange)
    }
}

const functions = {
    blur,
    exitFullscreen,
    focusTopLeftCorner,
    installFirefoxExtension,
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
    writeInputToFile
}

ipcRenderer.on("action", (_, name, ...args) => {
    if (functions[name]) {
        functions[name](...args)
    }
})

window.addEventListener("DOMContentLoaded", () => {
    ipcRenderer.on("set-custom-styling", (_, fontsize, customCSS) => {
        document.body.style.fontSize = `${fontsize}px`
        if (!document.getElementById("custom-styling")) {
            const styleElement = document.createElement("style")
            styleElement.id = "custom-styling"
            document.head.appendChild(styleElement)
        }
        document.getElementById("custom-styling").textContent = customCSS
        document.body.style.opacity = 1
    })
})
