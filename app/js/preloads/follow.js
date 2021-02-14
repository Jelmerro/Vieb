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
const privacy = require("./privacy")

let inFollowMode = false

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
].join(",")
const textlikeInputs = [
    "input:not([type=\"radio\"]):not([type=\"checkbox\"])"
    + ":not([type=\"submit\"]):not([type=\"button\"])"
    + ":not([type=\"file\"]):not([type=\"image\"]):not([type=\"reset\"])",
    "[role=\"textbox\"]",
    "[contenteditable=\"true\"]",
    "[contenteditable=\"\"]",
    "textarea",
    "select"
].join(",")
const clickEvents = ["click", "mousedown"]
const otherEvents = [
    "mouseenter",
    "mouseleave",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "contextmenu"
]
const frameSelector = "embed, frame, iframe, object"

ipcRenderer.on("focus-first-text-input", async () => {
    const links = allElementsBySelector("inputs-insert", textlikeInputs)
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

const getLinkFollows = allLinks => {
    // A tags with href as the link, can be opened in new tab or current tab
    querySelectorAll("a").forEach(e => {
        const baseLink = parseElement(e, "url")
        if (baseLink) {
            allLinks.push(baseLink)
        } else {
            // Try subelements instead, for example if the link is not
            // visible or `display: none`, but a sub-element is absolutely
            // positioned somewhere else.
            allLinks.push(...[...e?.querySelectorAll("*") || []]
                .map(c => parseElement(c, "url")).filter(l => l))
        }
    })
}

const getInputFollows = allLinks => {
    // Input tags such as checkboxes, can be clicked but have no text input
    const inputs = [...querySelectorAll(clickableInputs)]
    inputs.push(...[...querySelectorAll("input")].map(
        e => e.closest("label")).filter(e => e && !inputs.includes(e)))
    inputs.forEach(element => {
        let type = "inputs-click"
        if (element.tagName.toLowerCase() === "label") {
            const labelFor = element.getAttribute("for")
            if (labelFor) {
                try {
                    const forEl = element.closest(`#${labelFor}`)
                    if (forEl && forEl.matches(textlikeInputs)) {
                        type = "inputs-insert"
                    }
                } catch (_) {
                    // Invalid label, not a valid selector, assuming click input
                }
            } else if (element.querySelector(textlikeInputs)) {
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
        ...allElementsBySelector("inputs-insert", textlikeInputs))
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
    allElements.filter(el => otherEvents.find(e => el[`on${e}`]
            || eventListeners[e].has(el)))
        .forEach(element => addMouseEventElement(element, "other"))
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
    // Ordered by the position on the page from the top
    // Uncategorised mouse events are less relevant and are moved to the end
    ipcRenderer.sendToHost("follow-response", allLinks.sort((el1, el2) => {
        if (el1.type === "other") {
            return 10000
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

// Send the page once every second in case of transitions or animations
// Could be done with an observer, but that drastically slows down on big pages
setInterval(sendFollowLinks, 1000)
window.addEventListener("resize", sendFollowLinks)

const framePaddingInfo = []
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

const querySelectorAll = (sel, base = document, paddedX = 0, paddedY = 0) => {
    if (!base) {
        return []
    }
    let elements = []
    if (base === document) {
        elements = [...base.querySelectorAll(sel) || []]
    }
    ;[...base.querySelectorAll("*") || []]
        .filter(el => el.shadowRoot || el.matches(frameSelector))
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

const findElementAtPosition = (x, y, path = [document], px = 0, py = 0) => {
    // Find out which element is located at a given position.
    // Will look inside subframes recursively at the corrected position.
    const elementAtPos = path?.[0]?.elementFromPoint(x - px, y - py)
    if (path.includes(elementAtPos?.shadowRoot || elementAtPos)) {
        return elementAtPos
    }
    if (elementAtPos?.matches(frameSelector)) {
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
            const elementAtPos = findElementAtPosition(rectX, rectY)
            if (element === elementAtPos || element?.contains(elementAtPos)) {
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
    for (const subImage of element?.querySelectorAll("img, svg") || []) {
        rects = rects.concat([
            subImage.getBoundingClientRect(), ...subImage.getClientRects()
        ])
    }
    rects = rects.concat(pseudoElementRects(element))
    const paddingInfo = findFrameInfo(element)
    if (paddingInfo) {
        rects = rects.map(r => {
            r.x += paddingInfo.x
            r.y += paddingInfo.y
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
    let href = String(element.href || "")
    if (type === "url") {
        // Set links to the current page as type 'other'
        if (!element.href) {
            type = "other"
        } else if (element.href === window.location.href) {
            type = "other"
        } else if (element.href === `${window.location.href}#`) {
            type = "other"
        }
        // Empty the href for links that require a specific data method to open
        // These will use clicks instead of direct navigation to work correctly
        const dataMethod = element.getAttribute("data-method")?.toLowerCase()
        if (dataMethod && dataMethod !== "get") {
            href = ""
        }
    }
    return {
        "url": href,
        "x": dimensions.x,
        "y": dimensions.y,
        "width": dimensions.width,
        "height": dimensions.height,
        "type": type
    }
}

const allElementsBySelector
= (type, selector) => [...querySelectorAll(selector)]
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
        const paddingInfo = findFrameInfo(frame)
        ipcRenderer.sendToHost("mouse-click-info", {
            "x": e.x + (paddingInfo?.x || 0),
            "y": e.y + (paddingInfo?.y || 0),
            "tovisual": !window.getSelection().isCollapsed,
            "toinsert": !!e.target.matches(textlikeInputs)
        })
    }
}
window.addEventListener("click", clickListener,
    {"capture": true, "passive": true})

const contextListener = (e, frame = null) => {
    if (e.isTrusted) {
        e.preventDefault()
        const paddingInfo = findFrameInfo(frame)
        ipcRenderer.sendToHost("context-click-info", {
            "x": e.x + (paddingInfo?.x || 0),
            "y": e.y + (paddingInfo?.y || 0),
            "img": e.path.find(el => ["svg", "img"].includes(
                el.tagName?.toLowerCase()) && el.src?.trim()
            )?.src?.trim(),
            "link": e.path.find(el => el.tagName?.toLowerCase() === "a"
                && el.href?.trim())?.href?.trim(),
            "text": window.getSelection().toString(),
            "canEdit": !!e.target.matches(textlikeInputs),
            "frame": frame?.src,
            "hasExistingListener": eventListeners.contextmenu.has(e.target)
        })
    }
}
window.addEventListener("contextmenu", contextListener)

setInterval(() => {
    // Regular listeners are wiped when the element is re-added to the dom,
    // so add them with an interval as an attribute listener.
    [...querySelectorAll(frameSelector)].forEach(f => {
        try {
            f.contentDocument.onclick = e => clickListener(e, f)
            f.contentDocument.oncontextmenu = e => contextListener(e, f)
            privacy.privacyFixes(f.contentWindow)
        } catch (_) {
            // Not an issue, will be retried shortly
        }
    })
}, 0)
