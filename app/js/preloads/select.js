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

ipcRenderer.on("selection-request", (e, startX, startY, endX, endY) => {
    let startElement = document.elementFromPoint(startX, startY)
    let endElement = document.elementFromPoint(endX, endY)
    const startResult = calculateOffset(startElement, startX, startY)
    startElement = startResult.node
    const startOffset = startResult.offset
    const endResult = calculateOffset(endElement, endX, endY)
    endElement = endResult.node
    const endOffset = endResult.offset
    const newSelectRange = document.createRange()
    newSelectRange.setStart(startElement, startOffset)
    newSelectRange.setEnd(endElement, endOffset)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(newSelectRange)
    if (window.getSelection().isCollapsed) {
        newSelectRange.setStart(endElement, endOffset)
        newSelectRange.setEnd(startElement, startOffset)
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
    range.setEnd(startNode, 1)
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
        node: properNode,
        offset: offset
    }
}
