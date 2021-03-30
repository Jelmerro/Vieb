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
const util = require("../util")

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
const clickEvents = ["click", "mousedown", "mouseup"]
const otherEvents = [
    "mouseenter",
    "mouseleave",
    "mousemove",
    "mouseout",
    "mouseover",
    "contextmenu",
    "auxclick"
]

ipcRenderer.on("focus-first-text-input", async () => {
    const input = getAllFollowLinks().find(l => l.type === "inputs-insert")
    if (input) {
        const element = util.findElementAtPosition(
            input.x + input.width / 2, input.y + input.height / 2)
        if (element?.click && element?.focus) {
            ipcRenderer.sendToHost("switch-to-insert")
            await new Promise(r => setTimeout(r, 5))
            element.click()
            element.focus()
        }
    }
})

ipcRenderer.on("follow-element", (_, follow) => {
    const element = util.findElementAtPosition(follow.x, follow.y)
    if (element?.click && element?.focus) {
        element.click()
        element.focus()
    }
})

const getLinkFollows = allLinks => {
    // A tags with href as the link, can be opened in new tab or current tab
    util.querySelectorAll("a").forEach(e => {
        const baseLink = parseElement(e, "url")
        if (baseLink) {
            allLinks.push(baseLink)
        } else {
            // Try sub-elements instead, for example if the link is not
            // visible or `display: none`, but a sub-element is absolutely
            // positioned somewhere else.
            allLinks.push(...Array.from(e?.querySelectorAll("*") || [])
                .map(c => parseElement(c, "url")).filter(l => l))
        }
    })
}

const getInputFollows = allLinks => {
    // Input tags such as checkboxes, can be clicked but have no text input
    const inputs = [...util.querySelectorAll(clickableInputs)]
    inputs.push(...[...util.querySelectorAll("input")].map(
        e => e.closest("label")).filter(e => e && !inputs.includes(e)))
    inputs.forEach(element => {
        let type = "inputs-click"
        if (element.tagName.toLowerCase() === "label") {
            const labelFor = element.getAttribute("for")
            if (labelFor) {
                try {
                    const forEl = element.closest(`#${labelFor}`)
                    if (forEl?.matches?.(textlikeInputs)) {
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
    const allElements = [...util.querySelectorAll("*")]
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
    // Ordered by the position on the page from the top
    // Uncategorised mouse events are less relevant and are moved to the end
    return allLinks.sort((el1, el2) => {
        if (el1.type === "other") {
            return 10000
        }
        return Math.floor(el1.y) - Math.floor(el2.y) || el1.x - el2.x
    })
}

const sendFollowLinks = () => {
    if (inFollowMode) {
        ipcRenderer.sendToHost("follow-response", getAllFollowLinks())
    }
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

const pseudoElementRects = element => {
    const base = element.getBoundingClientRect()
    const rects = []
    for (const pseudoType of ["before", "after"]) {
        const pseudo = getComputedStyle(element, `::${pseudoType}`)
        const width = util.propPixels(pseudo, "width")
        const height = util.propPixels(pseudo, "height")
        if (height && width) {
            const pseudoDims = JSON.parse(JSON.stringify(base))
            const top = util.propPixels(pseudo, "top")
            const left = util.propPixels(pseudo, "left")
            const marginTop = util.propPixels(pseudo, "marginTop")
            const marginLeft = util.propPixels(pseudo, "marginLeft")
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
    if (getComputedStyle(element).visibility === "hidden") {
        return null
    }
    // Make a list of all possible bounding rects for the element
    let rects = [boundingRect, ...element.getClientRects()]
    for (const sub of Array.from(element?.querySelectorAll("img, svg") || [])) {
        rects = rects.concat([
            sub.getBoundingClientRect(), ...sub.getClientRects()
        ])
    }
    rects = rects.concat(pseudoElementRects(element))
    const paddingInfo = util.findFrameInfo(element)
    if (paddingInfo) {
        rects = rects.map(r => {
            r.x += paddingInfo.x
            r.y += paddingInfo.y
            return r
        })
    }
    // Find a clickable area and position for the given element
    const {dimensions, clickable} = util.findClickPosition(element, rects)
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
= (type, selector) => [...util.querySelectorAll(selector)]
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
        const paddingInfo = util.findFrameInfo(frame)
        ipcRenderer.sendToHost("mouse-click-info", {
            "x": e.x + (paddingInfo?.x || 0),
            "y": e.y + (paddingInfo?.y || 0),
            "tovisual": (frame?.contentWindow || window)
                .getSelection().toString(),
            "toinsert": !!e.path.find(el => el?.matches?.(textlikeInputs))
        })
    }
}
window.addEventListener("click", clickListener,
    {"capture": true, "passive": true})
window.addEventListener("mousedown", e => {
    if (e.path.find(el => el?.matches?.("select, option"))) {
        clickListener(e)
    }
}, {"capture": true, "passive": true})

const contextListener = (e, frame = null) => {
    if (e.isTrusted && !inFollowMode && e.button === 2) {
        e.preventDefault()
        const paddingInfo = util.findFrameInfo(frame)
        ipcRenderer.sendToHost("context-click-info", {
            "x": e.x + (paddingInfo?.x || 0),
            "y": e.y + (paddingInfo?.y || 0),
            "img": e.path.find(el => ["svg", "img"].includes(
                el.tagName?.toLowerCase()) && el.src?.trim()
            )?.src?.trim(),
            "link": e.path.find(el => el.tagName?.toLowerCase() === "a"
                && el.href?.trim())?.href?.trim(),
            "text": (frame?.contentWindow || window).getSelection().toString(),
            "canEdit": !!e.path.find(el => el?.matches?.(textlikeInputs)),
            "frame": frame?.src,
            "hasExistingListener": eventListeners.contextmenu.has(e.target)
                || eventListeners.auxclick.has(e.target)
        })
    }
}
window.addEventListener("auxclick", contextListener)

setInterval(() => {
    // Regular listeners are wiped when the element is re-added to the dom,
    // so add them with an interval as an attribute listener.
    [...util.querySelectorAll(util.frameSelector)].forEach(f => {
        try {
            f.contentDocument.onclick = e => clickListener(e, f)
            f.contentDocument.oncontextmenu = e => contextListener(e, f)
            f.contentDocument.onmousedown = e => {
                if (e.path.find(el => el?.matches?.("select, option"))) {
                    clickListener(e, f)
                }
            }
            privacy.privacyFixes(f.contentWindow)
        } catch (_) {
            // Not an issue, will be retried shortly
        }
    })
}, 0)
