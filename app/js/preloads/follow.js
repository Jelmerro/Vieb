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

let inFollowMode = false

const urls = ["a"]
const clickableInputs = [
    "button",
    "input[type=\"button\"]",
    "input[type=\"radio\"]",
    "input[type=\"checkbox\"]",
    "label[for]:not([for=\"\"])",
    "input[type=\"submit\"]",
    "input[type=\"file\"]",
    "input[type=\"image\"]",
    "input[type=\"reset\"]",
    "*[role=\"button\"]",
    "*[role=\"radio\"]",
    "*[role=\"checkbox\"]",
    "summary"
]
const textlikeInputs = [
    "input:not([type=\"radio\"]):not([type=\"checkbox\"])"
    + ":not([type=\"submit\"]):not([type=\"button\"])"
    + ":not([type=\"file\"]):not([type=\"image\"]):not([type=\"reset\"])",
    "*[role=\"textbox\"]",
    "*[contenteditable=\"true\"]",
    "textarea",
    "select"
]
const clickEvents = ["click", "mousedown"]
const otherEvents = [
    "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup"
]

ipcRenderer.on("focus-first-text-input", async () => {
    const links = allElementsBySelectors("inputs-insert", textlikeInputs)
    if (links.length > 0) {
        const pos = links.sort((el1, el2) => Math.floor(el1.y)
            - Math.floor(el2.y) || el1.x - el2.x)[0]
        const element = findElementAtPosition(
            pos.x + pos.width / 2, pos.y + pos.height / 2)
        if (element?.click && element?.focus) {
            ipcRenderer.sendToHost("switch-to-insert")
            await new Promise(r => setTimeout(r, 5))
            element.click()
            element.focus()
        }
    }
})

const framePosition = frame => ({
    "x": frame.getBoundingClientRect().x
        + propPixels({"pl": getComputedStyle(frame).paddingLeft}, "pl")
        + propPixels({"bl": getComputedStyle(frame).borderLeftWidth}, "bl"),
    "y": frame.getBoundingClientRect().y
        + propPixels({"pt": getComputedStyle(frame).paddingTop}, "pt")
        + propPixels({"bt": getComputedStyle(frame).borderTopWidth}, "bt")
})

const querySelectorAll = (query, base = document, paddedX = 0, paddedY = 0) => {
    let elements = []
    if (base === document) {
        elements = [...base.querySelectorAll(query)]
    }
    ;[...base?.querySelectorAll("iframe") || []].forEach(frame => {
        const {"x": frameX, "y": frameY} = framePosition(frame)
        elements = elements.concat(
            [...frame.contentDocument?.querySelectorAll(query) || []].map(f => {
                f.vvvPaddedX = paddedX + frameX
                f.vvvPaddedY = paddedY + frameY
                return f
            }))
        elements = elements.concat([...querySelectorAll(
            query, frame.contentDocument, frameX, frameY)])
    })
    return elements
}

const getLinkFollows = allLinks => {
    // A tags with href as the link, can be opened in new tab or current tab
    querySelectorAll(urls.join(",")).forEach(e => {
        const baseLink = parseElement(e, "url")
        if (baseLink) {
            allLinks.push(baseLink)
        } else {
            // Try subelements instead, for example if the link is not
            // visible or `display: none`, but a sub-element is absolutely
            // positioned somewhere else.
            allLinks.push(...[...e.querySelectorAll("*")]
                .map(c => parseElement(c, "url")).filter(l => l))
        }
    })
}

const getInputFollows = allLinks => {
    // Input tags such as checkboxes, can be clicked but have no text input
    const inputs = [...querySelectorAll(clickableInputs.join(","))]
    inputs.push(...[...querySelectorAll("input")].map(
        e => e.closest("label")).filter(e => e && !inputs.includes(e)))
    inputs.forEach(element => {
        let type = "inputs-click"
        if (element.tagName.toLowerCase() === "label") {
            const labelFor = element.getAttribute("for")
            if (labelFor) {
                try {
                    const forEl = element.closest(`#${labelFor}`)
                    if (forEl && forEl.matches(textlikeInputs.join(","))) {
                        type = "inputs-insert"
                    }
                } catch (_) {
                    // Invalid label, not a valid selector, assuming click input
                }
            } else if (element.querySelector(textlikeInputs.join(","))) {
                type = "inputs-insert"
            }
        }
        const clickable = parseElement(element, type)
        if (clickable) {
            allLinks.push(clickable)
        }
    })
    // Input tags such as email and text, can have text inserted
    allLinks.push(
        ...allElementsBySelectors("inputs-insert", textlikeInputs))
}

const getMouseFollows = allLinks => {
    // Elements with some kind of mouse interaction, grouped by click and other
    const addMouseEventElement = (element, type) => {
        const clickable = parseElement(element, type)
        if (clickable) {
            allLinks.push(clickable)
        }
    }
    const allElements = [...querySelectorAll("*")]
    allElements.filter(
        el => clickEvents.find(e => el[`on${e}`] || eventListeners[e].has(el))
        || el.getAttribute("jsaction")).forEach(
        element => addMouseEventElement(element, "onclick"))
    if (window.location.protocol.includes("devtools")) {
        allElements.forEach(element => addMouseEventElement(element, "other"))
    } else {
        allElements.filter(el => otherEvents.find(e => el[`on${e}`]
                || eventListeners[e].has(el)))
            .forEach(element => addMouseEventElement(element, "other"))
    }
}

const getAllFollowLinks = () => {
    const allLinks = []
    getLinkFollows(allLinks)
    getInputFollows(allLinks)
    getMouseFollows(allLinks)
    return allLinks
}

const sendFollowLinks = () => {
    if (!inFollowMode) {
        return
    }
    const allLinks = getAllFollowLinks()
    // Send response back to webview, which will forward it to follow.js
    // Ordered by the position on the page from the top
    // Uncategorised mouse events are less relevant and are moved to the end
    ipcRenderer.sendToHost("follow-response", allLinks.sort((el1, el2) => {
        if (el1.type === "other") {
            return 1000
        }
        return Math.floor(el1.y) - Math.floor(el2.y) || el1.x - el2.x
    }))
}

ipcRenderer.on("follow-mode-start", () => {
    if (!inFollowMode) {
        inFollowMode = true
        sendFollowLinks()
    }
})

ipcRenderer.on("follow-mode-stop", () => {
    inFollowMode = false
})

const findElementAtPosition = (x, y, base = document, px = 0, py = 0) => {
    // Find out which element is located at a given position.
    // Will look inside subframes recursively at the corrected position.
    const elementAtPosition = base?.elementFromPoint(x - px, y - py)
    if (elementAtPosition?.matches("iframe")) {
        return findElementAtPosition(
            x, y, elementAtPosition.contentDocument,
            elementAtPosition.vvvPaddedX, elementAtPosition.vvvPaddedY)
    }
    return elementAtPosition
}

const elementClickableAtPosition = (
    element, x, y, base = document, px = 0, py = 0
) => {
    // Check if an element can be found in a given position.
    // Also checks if any of the children are visible instead.
    // Will look inside subframes recursively at the corrected position.
    const elementAtPosition = base?.elementFromPoint(x - px, y - py)
    if (elementAtPosition?.matches("iframe")) {
        return elementClickableAtPosition(element,
            x, y, elementAtPosition.contentDocument,
            elementAtPosition.vvvPaddedX, elementAtPosition.vvvPaddedY)
    }
    return elementAtPosition === element || element.contains(elementAtPosition)
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
                || rect.height > dimensions.height
                || !clickable) {
            if (elementClickableAtPosition(element, rectX, rectY)) {
                clickable = true
                dimensions = rect
            }
        }
    }
    return {clickable, dimensions}
}

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

const pseudoElementRects = element => {
    const base = element.getBoundingClientRect()
    const rects = []
    for (const pseudoType of ["before", "after"]) {
        const pseudo = window.getComputedStyle(element, `::${pseudoType}`)
        const width = propPixels(pseudo, "width")
        const height = propPixels(pseudo, "height")
        if (height && width) {
            const pseudoDims = JSON.parse(JSON.stringify(base))
            const top = propPixels(pseudo, "top")
            const left = propPixels(pseudo, "left")
            const marginTop = propPixels(pseudo, "marginTop")
            const marginLeft = propPixels(pseudo, "marginLeft")
            pseudoDims.width = width
            pseudoDims.height = height
            pseudoDims.x += left + marginLeft
            pseudoDims.y += top + marginTop
            rects.push(pseudoDims)
        }
    }
    return rects
}

const rectOutsideWindow = r => r.bottom < 0 || r.top > window.innerHeight
    || r.right < 0 || r.left > window.innerWidth

const parseElement = (element, type) => {
    // The body shouldn't be considered clickable on it's own,
    // Even if listeners are added to it.
    // Also checks if the element actually has rects.
    const excluded = [document.body, document.documentElement]
    if (!element.getClientRects || excluded.includes(element)) {
        return null
    }
    // First (quickly) check that element is visible at all
    const boundingRect = element.getBoundingClientRect()
    if (rectOutsideWindow(boundingRect)) {
        return null
    }
    if (window.getComputedStyle(element).visibility === "hidden") {
        return null
    }
    // Make a list of all possible bounding rects for the element
    let rects = [boundingRect, ...element.getClientRects()]
    for (const subImage of element.querySelectorAll("img, svg")) {
        rects = rects.concat([
            subImage.getBoundingClientRect(), ...subImage.getClientRects()
        ])
    }
    rects = rects.concat(pseudoElementRects(element))
    if (element.vvvPaddedX) {
        rects = rects.map(r => {
            r.x += element.vvvPaddedX
            r.y += element.vvvPaddedY
            return r
        })
    }
    // Find a clickable area and position for the given element
    const {dimensions, clickable} = findClickPosition(element, rects)
    // Return null if any of the checks below fail
    // - Not detected as clickable in the above loop
    // - Too small to properly click on using a regular browser
    const tooSmall = dimensions.width <= 2 || dimensions.height <= 2
    // - The element isn't actually visible on the user's current window
    const outsideWindow = rectOutsideWindow(dimensions)
    // - The element is too big to actually make sense to click on by choice
    const tooBig = dimensions.width >= window.innerWidth
        || dimensions.height >= window.innerHeight
    if (!clickable || tooSmall || outsideWindow || tooBig) {
        return null
    }
    // The element should be clickable and is returned in a parsed format
    if (type === "url") {
        if (!element.href) {
            type = "other"
        } else if (element.href === window.location.href) {
            type = "other"
        } else if (element.href === `${window.location.href}#`) {
            type = "other"
        }
    }
    return {
        "url": String(element.href || ""),
        "x": dimensions.x,
        "y": dimensions.y,
        "width": dimensions.width,
        "height": dimensions.height,
        "type": type
    }
}

const allElementsBySelectors
= (type, selectors) => [...querySelectorAll(selectors.join(","))]
    .map(element => parseElement(element, type)).filter(e => e)

const eventListeners = {}
;[...clickEvents, ...otherEvents].forEach(e => {
    eventListeners[e] = new WeakSet()
})

const realAdd = EventTarget.prototype.addEventListener
EventTarget.prototype.addEventListener = function(type, listener, options) {
    try {
        realAdd.apply(this, [type, listener, options])
        eventListeners[type]?.add(this)
    } catch (e) {
        // This is a bug in the underlying website
    }
}
const realRemove = EventTarget.prototype.removeEventListener
EventTarget.prototype.removeEventListener = function(type, listener, options) {
    try {
        realRemove.apply(this, [type, listener, options])
        eventListeners[type]?.delete(this)
    } catch (e) {
        // This is a bug in the underlying website
    }
}

const clickListener = (e, frame = null) => {
    if (e.isTrusted) {
        ipcRenderer.sendToHost("mouse-click-info", {
            "x": e.x + (frame?.vvvPaddedX || 0),
            "y": e.y + (frame?.vvvPaddedY || 0),
            "tovisual": !window.getSelection().isCollapsed,
            "toinsert": !!textlikeInputs.find(s => e.target.matches(s))
        })
    }
}
window.addEventListener("click", clickListener)

const contextListener = (e, frame = null) => {
    if (e.isTrusted) {
        e.preventDefault()
        ipcRenderer.sendToHost("context-click-info", {
            "x": e.x + (frame?.vvvPaddedX || 0),
            "y": e.y + (frame?.vvvPaddedY || 0),
            "img": e.path.find(el => ["svg", "img"].includes(
                el.tagName?.toLowerCase()) && el.src?.trim()
            )?.src?.trim(),
            "link": e.path.find(el => el.tagName?.toLowerCase() === "a"
                && el.href?.trim())?.href?.trim(),
            "text": window.getSelection().toString(),
            "canedit": !!textlikeInputs.find(s => e.target.matches(s)),
            "frame": frame?.src
        })
    }
}
window.addEventListener("contextmenu", contextListener)

setInterval(() => {
    [...querySelectorAll("iframe")].forEach(f => {
        const {x, y} = framePosition(f)
        if ([...document.querySelectorAll("iframe")].includes(f)) {
            f.vvvPaddedX = 0
            f.vvvPaddedY = 0
        }
        f.vvvPaddedX = (f.vvvPaddedX || 0) + x
        f.vvvPaddedY = (f.vvvPaddedY || 0) + y
        if (!f.vvvHasListeners) {
            try {
                f.contentDocument.addEventListener("click", e => {
                    clickListener(e, f)
                })
                f.contentDocument.addEventListener("contextmenu", e => {
                    contextListener(e, f)
                })
                f.vvvHasListeners = true
            } catch (_) {
                // If setting the listeners fails, the frame might not be loaded
                // In this case, don't set the property and try again later
            }
        }
    })
}, 500)

window.addEventListener("resize", sendFollowLinks)

// Send the page once every second in case of transitions or animations
// Could be done with a listener, but that drastically slows down on big pages
setInterval(sendFollowLinks, 1000)
