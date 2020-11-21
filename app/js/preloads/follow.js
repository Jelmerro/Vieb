/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2020 Jelmer van Arnhem
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
let allElements = []

ipcRenderer.on("focus-first-text-input", async () => {
    allElements = [...document.querySelectorAll("*")]
    const links = [...allElementsBySelectors("inputs-insert", textlikeInputs)]
    if (links.length > 0) {
        const pos = links.sort((el1, el2) => Math.floor(el1.y)
            - Math.floor(el2.y) || el1.x - el2.x)[0]
        const element = document.elementFromPoint(
            pos.x + pos.width / 2, pos.y + pos.height / 2)
        if (element?.click && element?.focus) {
            ipcRenderer.sendToHost("switch-to-insert")
            await new Promise(r => setTimeout(r, 5))
            element.click()
            element.focus()
        }
    }
})

const sendFollowLinks = () => {
    if (!inFollowMode) {
        return
    }
    allElements = [...document.querySelectorAll("*")]
    const allLinks = []
    // A tags with href as the link, can be opened in new tab or current tab
    allLinks.push(...allElementsBySelectors("url", urls))
    // Input tags such as checkboxes, can be clicked but have no text input
    const inputs = allElements.filter(
        el => clickableInputs.find(selector => el.matches(selector)
        || el.nodeName === "LABEL" && el.querySelector("input")))
    inputs.forEach(element => {
        const clickable = parseElement(element, "inputs-click")
        if (clickable) {
            // Only show input elements for which there is no existing url
            const similarExistingLinks = allLinks.filter(
                link => checkForDuplicateLink(clickable, link))
            if (similarExistingLinks.length === 0) {
                allLinks.push(clickable)
            }
        }
    })
    // Input tags such as email and text, can have text inserted
    allLinks.push(...allElementsBySelectors("inputs-insert", textlikeInputs))
    // Elements with some kind of mouse interaction, grouped by click and other
    const addMouseEventElement = (element, type) => {
        let clickable = null
        try {
            clickable = parseElement(element, type)
        } catch (e) {
            // Element might get deleted while parsing
        }
        if (clickable) {
            // Only show onclick elements for which there is no existing link
            const similarExistingLinks = allLinks.filter(
                link => checkForDuplicateLink(clickable, link))
            if (similarExistingLinks.length === 0) {
                allLinks.push(clickable)
            }
        }
    }
    allElements.filter(
        el => clickEvents.find(e => el[`on${e}`])
        || clickEvents.map(e => eventListeners[e].includes(el)).find(e => e)
        || el.getAttribute("jsaction")).forEach(
        element => addMouseEventElement(element, "onclick"))
    if (window.location.protocol.includes("devtools")) {
        allElements.forEach(element => addMouseEventElement(element, "other"))
    } else {
        allElements.filter(
            el => otherEvents.find(e => el[`on${e}`]) || otherEvents.map(
                e => eventListeners[e].includes(el)).find(e => e))
            .forEach(element => addMouseEventElement(element, "other"))
    }
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

const checkForDuplicateLink = (element, existing) => {
    // Check for similar click positions and remove them as a duplicate
    const elementX = element.x + element.width / 2
    const elementY = element.y + element.height / 2
    const existingX = existing.x + existing.width / 2
    const existingY = existing.y + existing.height / 2
    if (elementX >= existingX - 2 && elementX <= existingX + 2) {
        if (elementY >= existingY - 2 && elementY <= existingY + 2) {
            return true
        }
    }
    return false
}

const elementClickableAtPosition = (element, x, y) => {
    // Check if an element can be found in a given position.
    // Also checks if any of the children are visible instead.
    const elementAtPosition = document.elementFromPoint(x, y)
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
        if (elementClickableAtPosition(element, rectX, rectY)) {
            // Update the region if it's larger or the first region found
            if (rect.width > dimensions.width
                    || rect.height > dimensions.height
                    || !clickable) {
                clickable = true
                dimensions = rect
            }
        }
    }
    return {clickable, dimensions}
}

const parseElement = (element, type) => {
    // The body shouldn't be considered clickable on it's own,
    // Even if listeners are added to it.
    // Also checks if the element actually has rects.
    const excluded = [document.body, document.documentElement]
    if (!element.getClientRects || excluded.includes(element)) {
        return null
    }
    // Make a list of all possible bounding rects for the element
    let rects = [element.getBoundingClientRect(), ...element.getClientRects()]
    for (const subImage of element.querySelectorAll("img, svg")) {
        rects = rects.concat([...subImage.getClientRects()])
    }
    // Find a clickable area and position for the given element
    const {dimensions, clickable} = findClickPosition(element, rects)
    // Return null if any of the checks below fail
    // - Not detected as clickable in the above loop
    // - Too small to properly click on using a regular browser
    const tooSmall = dimensions.width <= 2 || dimensions.height <= 2
    // - The element isn't actually visible on the user's current window
    const outsideWindow = dimensions.bottom < 0
        || dimensions.top > window.innerHeight
        || dimensions.right < 0 || dimensions.left > window.innerWidth
    // - The element is too big to actually make sense to click on by choice
    const tooBig = dimensions.width >= window.innerWidth
        || dimensions.height >= window.innerHeight
    if (!clickable || tooSmall || outsideWindow || tooBig) {
        return null
    }
    // The element should be clickable and is returned in a parsed format
    return {
        "url": String(element.href || ""),
        "x": dimensions.x,
        "y": dimensions.y,
        "width": dimensions.width,
        "height": dimensions.height,
        "type": type
    }
}

const allElementsBySelectors = (type, selectors) => allElements.filter(
    element => selectors.find(selector => element.matches(selector))).map(
    element => parseElement(element, type)).filter(e => e)

const eventListeners = {}
;[...clickEvents, ...otherEvents].forEach(e => {
    eventListeners[e] = []
})

EventTarget.prototype._realAdd = EventTarget.prototype.addEventListener
EventTarget.prototype.addEventListener = function(type, listener, options) {
    try {
        this._realAdd(type, listener, options)
    } catch (e) {
        // This is a bug in the underlying website
        return
    }
    if (eventListeners[type]) {
        eventListeners[type].push(this)
    }
}
EventTarget.prototype._realRemove = EventTarget.prototype.removeEventListener
EventTarget.prototype.removeEventListener = function(type, listener, options) {
    try {
        this._realRemove(type, listener, options)
    } catch (e) {
        // This is a bug in the underlying website
    }
    if (eventListeners[type]) {
        try {
            eventListeners[type].remove(this)
        } catch (e) {
            // The element was already removed from the list before
        }
    }
}

window.addEventListener("click", e => {
    ipcRenderer.sendToHost("mouse-click-info", {
        "x": e.x,
        "y": e.y,
        "tovisual": !window.getSelection().isCollapsed,
        "toinsert": !!textlikeInputs.find(s => e.target.matches(s))
    })
})

window.addEventListener("resize", sendFollowLinks)

// Send the page once every few seconds in case of transitions or animations
// Could be done with a listener, but that drastically slows down on big pages
setInterval(sendFollowLinks, 2000)
