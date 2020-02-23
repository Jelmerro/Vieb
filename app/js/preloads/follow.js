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
    "input[type=\"color\"]",
    "input[type=\"file\"]",
    "input[type=\"image\"]",
    "input[type=\"reset\"]",
    "*[role=\"button\"]",
    "*[role=\"radio\"]",
    "*[role=\"checkbox\"]",
    "summary"
]
const textlikeInputs = ["input:not([type=\"radio\"]):not([type=\"checkbox\"])"
    + ":not([type=\"submit\"]):not([type=\"button\"]):not([type=\"color\"])"
    + ":not([type=\"file\"]):not([type=\"image\"]):not([type=\"reset\"])",
"*[role=\"textbox\"]",
"*[contenteditable=\"true\"]",
"textarea",
"select"]

ipcRenderer.on("focus-first-text-input", () => {
    const links = [...allElementsBySelectors("inputs-insert", textlikeInputs)]
    if (links.length > 0) {
        const pos = links.sort((el1, el2) => {
            return Math.floor(el1.y) - Math.floor(el2.y) || el1.x - el2.x
        })[0]
        const element = document.elementFromPoint(
            pos.x + pos.width / 2, pos.y + pos.height / 2)
        if (element && element.click && element.focus) {
            ipcRenderer.sendToHost("switch-to-insert")
            element.click()
            element.focus()
        }
    }
})

const sendFollowLinks = () => {
    if (!inFollowMode) {
        return
    }
    const allLinks = []
    // A tags with href as the link, can be opened in new tab or current tab
    allLinks.push(...allElementsBySelectors("url", urls))
    // Input tags such as checkboxes, can be clicked but have no text input
    const inputs = [...document.querySelectorAll(clickableInputs)]
    inputs.forEach(element => {
        const clickable = parseElement(element, "inputs-click")
        if (clickable) {
            // Only show input elements for which there is no existing url
            const similarExistingLinks = allLinks.filter(link => {
                return checkForDuplicateLink(clickable, link)
            })
            if (similarExistingLinks.length === 0) {
                allLinks.push(clickable)
            }
        }
    })
    // Input tags such as email and text, can have text inserted
    allLinks.push(...allElementsBySelectors("inputs-insert", textlikeInputs))
    // All other elements with onclick listeners
    const clickableElements = [...document.querySelectorAll("*")].filter(
        el => el.onclick || el.onmousedown || el.getAttribute("jsaction"))
    clickableElements.push(...elementsWithClickListener)
    clickableElements.push(...elementsWithMouseDownListener)
    clickableElements.forEach(element => {
        let clickable = null
        try {
            clickable = parseElement(element, "onclick")
        } catch (e) {
            // Element might get deleted while parsing
        }
        if (clickable) {
            // Only show onclick elements for which there is no existing link
            const similarExistingLinks = allLinks.filter(link => {
                return checkForDuplicateLink(clickable, link)
            })
            if (similarExistingLinks.length === 0) {
                allLinks.push(clickable)
            }
        }
    })
    // Send response back to webview, which will forward it to follow.js
    // Ordered by the position on the page from the top
    ipcRenderer.sendToHost("follow-response", allLinks.sort((el1, el2) => {
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
    if (elementAtPosition === element) {
        return true
    }
    return [...element.querySelectorAll("*")].includes(elementAtPosition)
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
    if (element === document.querySelector("html")
            || element === document.body || !element.getClientRects) {
        return null
    }
    // Make a list of all possible bouding rects for the element
    let rects = [element.getBoundingClientRect(), ...element.getClientRects()]
    if (type === "url") {
        for (const subImage of element.querySelectorAll("img, svg")) {
            rects = rects.concat([...subImage.getClientRects()])
        }
    }
    // Find a clickable area and position for the given element
    const {dimensions, clickable} = findClickPosition(element, rects)
    // Return null if any of the check below fail
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
        "url": element.href || "",
        "x": dimensions.x,
        "y": dimensions.y,
        "width": dimensions.width,
        "height": dimensions.height,
        "type": type
    }
}

const allElementsBySelectors = (type, selectors) => {
    const elements = []
    selectors.forEach(selector => {
        elements.push(...document.querySelectorAll(selector))
    })
    const tags = []
    elements.forEach(element => {
        const clickableElement = parseElement(element, type)
        if (clickableElement) {
            tags.push(clickableElement)
        }
    })
    return tags
}

const elementsWithClickListener = []
const elementsWithMouseDownListener = []

EventTarget.prototype.realAddListener = EventTarget.prototype.addEventListener
EventTarget.prototype.addEventListener = function(type, listener, options) {
    try {
        this.realAddListener(type, listener, options)
    } catch (e) {
        // This is a bug in the underlying website
    }
    if (type === "click" && this !== document) {
        elementsWithClickListener.push(this)
    }
    if (type === "mousedown" && this !== document) {
        elementsWithMouseDownListener.push(this)
    }
}
EventTarget.prototype.realRemoveListener
    = EventTarget.prototype.removeEventListener
EventTarget.prototype.removeEventListener = function(type, listener, options) {
    try {
        this.realRemoveListener(type, listener, options)
    } catch (e) {
        // This is a bug in the underlying website
    }
    if (type === "click" && this !== document) {
        try {
            elementsWithClickListener.remove(this)
        } catch (e) {
            // The element was already removed from the list before
        }
    }
    if (type === "mousedown" && this !== document) {
        try {
            elementsWithMouseDownListener.remove(this)
        } catch (e) {
            // The element was already removed from the list before
        }
    }
}

const isTextElement = el => {
    for (const selector of textlikeInputs) {
        if (el.matches(selector)) {
            return true
        }
    }
    return false
}

window.addEventListener("click", e => {
    ipcRenderer.sendToHost("mouse-click-info", {
        "x": e.x,
        "y": e.y,
        "tovisual": !window.getSelection().isCollapsed,
        "toinsert": isTextElement(e.target)
    })
})

window.addEventListener("resize", sendFollowLinks)

// Send the follow links to the renderer if DOM is changed in any way
const observer = new window.MutationObserver(sendFollowLinks)
observer.observe(document, {
    "childList": true,
    "attributes": true,
    "characterData": true,
    "subtree": true,
    "attributeFilter": ["class", "id", "style"]
})
// And also once every few seconds in case of transitions or animations
setInterval(sendFollowLinks, 2000)
