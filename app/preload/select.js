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
    findElementAtPosition, querySelectorAll, findFrameInfo
} = require("../util")

const documentAtPos = (x, y) => findElementAtPosition(x, y)
    ?.ownerDocument || document

ipcRenderer.on("selection-all", (_, x, y) => documentAtPos(x, y)
    .execCommand("selectAll"))
ipcRenderer.on("selection-cut", (_, x, y) => documentAtPos(x, y)
    .execCommand("cut"))
ipcRenderer.on("selection-paste", (_, x, y) => documentAtPos(x, y)
    .execCommand("paste"))
ipcRenderer.on("selection-remove", (_, x, y) => documentAtPos(x, y)
    .getSelection().removeAllRanges())
ipcRenderer.on("selection-request", (_, startX, startY, endX, endY) => {
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
})

const isTextNode = node => [
    Node.TEXT_NODE, Node.COMMENT_NODE, Node.CDATA_SECTION_NODE
].includes(node.nodeType)

const calculateOffset = (startNode, startX, startY, x, y) => {
    const range = (findElementAtPosition(startX, startY)
        ?.ownerDocument || document).createRange()
    range.setStart(startNode, 0)
    try {
        range.setEnd(startNode, 1)
    } catch (e) {
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

let searchPos = {}
let searchElement = null
let justSearched = false
let scrollHeight = 0

window.addEventListener("scroll", () => {
    const scrollDiff = scrollHeight - window.scrollY
    scrollHeight = window.scrollY
    ipcRenderer.sendToHost("scroll-height-diff", scrollDiff)
    if (justSearched) {
        justSearched = false
        searchElement = findElementAtPosition(
            (searchPos.x + searchPos.width / 2) / window.devicePixelRatio,
            (searchPos.y + searchPos.height / 2)
                / window.devicePixelRatio + scrollDiff)
    }
})

ipcRenderer.on("search-element-location", (_, pos) => {
    searchPos = pos
    justSearched = true
    setTimeout(() => {
        justSearched = false
    }, 50)
    searchElement = findElementAtPosition(
        (searchPos.x + searchPos.width / 2) / window.devicePixelRatio,
        (searchPos.y + searchPos.height / 2) / window.devicePixelRatio)
})

ipcRenderer.on("search-element-click", () => searchElement?.click())

window.addEventListener("mousemove", e => {
    ipcRenderer.sendToHost("top-of-page-with-mouse", !e.clientY)
})
