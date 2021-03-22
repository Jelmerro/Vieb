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

const framePaddingInfo = []
const frameSelector = "embed, frame, iframe, object"

const storeFrameInfo = (element, options) => {
    if (!element) {
        return
    }
    const info = framePaddingInfo.find(i => i.element === element)
    if (info) {
        Object.assign(info, options)
    } else {
        framePaddingInfo.push({element, ...options})
    }
}

const findFrameInfo = el => framePaddingInfo.find(i => i.element === el)

const framePosition = frame => ({
    "x": frame.getBoundingClientRect().x
        + propPixels({"pl": getComputedStyle(frame).paddingLeft}, "pl")
        + propPixels({"bl": getComputedStyle(frame).borderLeftWidth}, "bl"),
    "y": frame.getBoundingClientRect().y
        + propPixels({"pt": getComputedStyle(frame).paddingTop}, "pt")
        + propPixels({"bt": getComputedStyle(frame).borderTopWidth}, "bt")
})

const propPixels = (element, prop) => {
    const value = element[prop]
    if (value?.endsWith("px")) {
        return Number(value.replace("px", "")) || 0
    }
    if (value?.endsWith("em")) {
        const elementFontSize = Number(getComputedStyle(document.body)
            .fontSize.replace("px", "")) || 0
        return Number(value.replace("em", "")) * elementFontSize || 0
    }
    return 0
}

const findElementAtPosition = (x, y, path = [document], px = 0, py = 0) => {
    // Find out which element is located at a given position.
    // Will look inside subframes recursively at the corrected position.
    const elementAtPos = path?.[0]?.elementFromPoint(x - px, y - py)
    if (path.includes(elementAtPos?.shadowRoot || elementAtPos)) {
        return elementAtPos
    }
    if (elementAtPos?.matches?.(frameSelector)) {
        const frameInfo = findFrameInfo(elementAtPos) || {}
        return findElementAtPosition(x, y,
            [elementAtPos.contentDocument, ...path], frameInfo.x, frameInfo.y)
    }
    if (elementAtPos?.shadowRoot) {
        const frameInfo = findFrameInfo(elementAtPos.shadowRoot) || {}
        return findElementAtPosition(x, y,
            [elementAtPos.shadowRoot, ...path], frameInfo.x, frameInfo.y)
    }
    return elementAtPos
}

const querySelectorAll = (sel, base = document, paddedX = 0, paddedY = 0) => {
    if (!base) {
        return []
    }
    let elements = []
    if (base === document) {
        elements = [...base.querySelectorAll(sel) || []]
    }
    ;[...base.querySelectorAll("*") || []]
        .filter(el => el.shadowRoot || el?.matches?.(frameSelector))
        .forEach(el => {
            let location = {"x": paddedX, "y": paddedY}
            if (!el.shadowRoot) {
                const {"x": frameX, "y": frameY} = framePosition(el)
                location = {"x": frameX + paddedX, "y": frameY + paddedY}
            }
            storeFrameInfo(el?.shadowRoot || el, location)
            const extra = [
                ...(el.contentDocument || el.shadowRoot)?.querySelectorAll(sel)
                || []
            ]
            extra.forEach(e => storeFrameInfo(e, location))
            elements = elements.concat([...extra, ...querySelectorAll(sel,
                el.contentDocument || el.shadowRoot,
                location.x, location.y) || []])
        })
    return elements
}

const findClickPosition = (element, rects) => {
    let dimensions = {}
    let clickable = false
    // Check if the center of the bounding rect is actually clickable,
    // For every possible rect of the element and it's sub images.
    for (const rect of rects) {
        const rectX = rect.x + rect.width / 2
        const rectY = rect.y + rect.height / 2
        // Update the region if it's larger or the first region found
        if (rect.width > dimensions.width
                || rect.height > dimensions.height || !clickable) {
            const elementAtPos = findElementAtPosition(rectX, rectY)
            if (element === elementAtPos || element?.contains(elementAtPos)) {
                clickable = true
                dimensions = rect
            }
        }
    }
    return {clickable, dimensions}
}

module.exports = {
    frameSelector,
    findFrameInfo,
    propPixels,
    findElementAtPosition,
    querySelectorAll,
    findClickPosition
}
