/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019 Jelmer van Arnhem
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

let startX = 0
let startY = 0
let scrollHeight = 0

ipcRenderer.on("selection-start-location", (e, sX, sY) => {
    startX = sX
    startY = sY
    scrollHeight = window.scrollY
})

window.addEventListener("scroll", () => {
    const scrollDiff = scrollHeight - window.scrollY
    startY += scrollDiff
    scrollHeight = window.scrollY
    ipcRenderer.sendToHost("scroll-height-diff", scrollDiff)
})

ipcRenderer.on("download-image-request", (e, x, y) => {
    const elements = [...document.elementsFromPoint(x, y)]
    for (const el of elements) {
        if (el.tagName.toLowerCase() === "img" && el.src) {
            ipcRenderer.sendToHost("download-image", el.src.split("?")[0])
            break
        }
        if (el.tagName.toLowerCase() === "svg") {
            ipcRenderer.sendToHost("download-image", window.URL.createObjectURL(
                new Blob(el.outerHTML.split(), {"type": "img/svg"})))
            break
        }
    }
})

ipcRenderer.on("selection-request", (e, endX, endY) => {
    let startNode = document.elementFromPoint(startX, startY)
    if (startY < 0 || startY > window.innerHeight) {
        startNode = document.body
    }
    const startResult = calculateOffset(
        startNode, startX, startY)
    const endResult = calculateOffset(
        document.elementFromPoint(endX, endY), endX, endY)
    const newSelectRange = document.createRange()
    newSelectRange.setStart(startResult.node, startResult.offset)
    if (isTextNode(endResult.node) && endResult.node.length > 1) {
        newSelectRange.setEnd(endResult.node, endResult.offset + 1)
    } else {
        newSelectRange.setEnd(endResult.node, endResult.offset)
    }
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(newSelectRange)
    if (window.getSelection().isCollapsed) {
        newSelectRange.setStart(endResult.node, endResult.offset)
        if (isTextNode(endResult.node) && endResult.node.length > 1) {
            newSelectRange.setEnd(startResult.node, startResult.offset + 1)
        } else {
            newSelectRange.setEnd(startResult.node, startResult.offset)
        }
        window.getSelection().removeAllRanges()
        window.getSelection().addRange(newSelectRange)
    }
})

const isTextNode = node => {
    if (node.nodeType === Node.TEXT_NODE) {
        return true
    }
    if (node.nodeType === Node.COMMENT_NODE) {
        return true
    }
    if (node.nodeType === Node.CDATA_SECTION_NODE) {
        return true
    }
    return false
}

const calculateOffset = (startNode, x, y) => {
    const range = document.createRange()
    range.setStart(startNode, 0)
    try {
        range.setEnd(startNode, 1)
    } catch (e) {
        return {
            "node": startNode,
            "offset": 0
        }
    }
    let properNode = startNode
    let offset = 0
    const descendNodeTree = baseNode => {
        const pointInsideRegion = (start, end) => {
            range.setStart(baseNode, start)
            range.setEnd(baseNode, end)
            for (const rect of range.getClientRects()) {
                if (x >= rect.left && y >= rect.top) {
                    if (x <= rect.right && y <= rect.bottom) {
                        return true
                    }
                }
            }
            return false
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
    return {
        "node": properNode,
        "offset": offset
    }
}
