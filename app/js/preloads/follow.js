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

let focussedSearchElement = null

const urls = ["a"]
const clickableInputs = [
    "button",
    "input[type=\"button\"]",
    "input[type=\"radio\"]",
    "input[type=\"checkbox\"]",
    "label[for]:not([for=\"\"])",
    "input[type=\"submit\"]",
    "input[type=\"color\"]",
    "summary"
]
const textlikeInputs = ["input:not([type=\"radio\"]):not([type=\"checkbox\"])"
    + ":not([type=\"submit\"]):not([type=\"button\"]):not([type=\"color\"])",
"textarea",
"select"]
const onclickElements = "*:not(button):not(input)[onclick]:not([onclick=\"\"])"
    + ", *:not(button):not(input)[onmousedown]:not([onmousedown=\"\"])"

ipcRenderer.on("search-element-location", (e, pos) => {
    focussedSearchElement = document.elementFromPoint(
        pos.x + pos.width / 2, pos.y + pos.height / 2)
})

ipcRenderer.on("search-element-click", () => {
    if (focussedSearchElement) {
        focussedSearchElement.click()
    }
})

ipcRenderer.on("follow-mode-request", e => {
    const allLinks = []
    //a tags with href as the link, can be opened in new tab or current tab
    allLinks.push(...allElementsBySelectors("url", urls))
    //input tags such as checkboxes, can be clicked but have no text input
    const inputs = [...document.querySelectorAll(clickableInputs)]
    inputs.forEach(element => {
        const clickable = parseElement(element, "inputs-click")
        if (clickable) {
            //Only show input elements for which there is no existing url
            const similarExistingLinks = allLinks.filter(link => {
                return checkForDuplicateLink(clickable, link)
            })
            if (similarExistingLinks.length === 0) {
                allLinks.push(clickable)
            }
        }
    })
    //input tags such as email and text, can have text inserted
    allLinks.push(...allElementsBySelectors("inputs-insert", textlikeInputs))
    //All other elements with onclick listeners
    const clickableElements = [...document.querySelectorAll(onclickElements)]
    clickableElements.push(...elementsWithClickListener)
    clickableElements.push(...elementsWithMouseDownListener)
    clickableElements.forEach(element => {
        const clickable = parseElement(element, "onclick")
        if (clickable) {
            //Only show onclick elements for which there is no existing link
            const similarExistingLinks = allLinks.filter(link => {
                return checkForDuplicateLink(clickable, link)
            })
            if (similarExistingLinks.length === 0) {
                allLinks.push(clickable)
            }
        }
    })
    //Send response back to webview, which will forward it to follow.js
    //Ordered by the position on the page from the top
    e.sender.sendToHost("follow-response", allLinks.sort((el1, el2) => {
        return Math.floor(el1.y) - Math.floor(el2.y) || el1.x - el2.x
    }))
})

const checkForDuplicateLink = (element, existing) => {
    //Check for similar click positions and remove them as a duplicate
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
    //Check if an element can be found in a given position.
    //Also checks if any of the children are visible instead.
    const elementAtPosition = document.elementFromPoint(x, y)
    if (elementAtPosition === element) {
        return true
    }
    return [...element.querySelectorAll("*")].includes(elementAtPosition)
}

const parseElement = (element, type) => {
    //The body shouldn't be considered clickable on it's own,
    //even if listeners are added to it.
    if (element === document.querySelector("html")
            || element === document.body) {
        return null
    }
    //Make a list of all possible bouding rects for the element
    let rects = [...element.getClientRects()]
    if (type === "url") {
        for (const subImage of element.querySelectorAll("img, svg")) {
            rects = rects.concat([...subImage.getClientRects()])
        }
    }
    let dimensions = element.getBoundingClientRect()
    //Check if the center of the boundingrect is actually clickable,
    //for every possible rect of the element and it's sub images.
    const clickX = dimensions.x + dimensions.width / 2
    const clickY = dimensions.y + dimensions.height / 2
    let clickable = elementClickableAtPosition(element, clickX, clickY)
    for (const rect of rects) {
        const rectX = rect.x + rect.width / 2
        const rectY = rect.y + rect.height / 2
        if (elementClickableAtPosition(element, rectX, rectY)) {
            //Update the region if it's larger or the first region found
            if (rect.width > dimensions.width
                    || rect.height > dimensions.height
                    || !clickable) {
                clickable = true
                dimensions = rect
            }
        }
    }
    //Return if not a single clickable region could be found
    if (!clickable) {
        return null
    }
    //Too small to properly click on using a regular browser,
    //thus should not be expected to be clicked on using follow mode.
    if (dimensions.width <= 2 || dimensions.height <= 2) {
        return null
    }
    //The element isn't actually visible on the user's current window
    if (dimensions.bottom < 0 || dimensions.top > window.innerHeight) {
        return null
    }
    if (dimensions.right < 0 || dimensions.left > window.innerWidth) {
        return null
    }
    //The element is too big to actually make sense to click on by choice
    if (dimensions.width >= window.innerWidth) {
        return null
    }
    if (dimensions.height >= window.innerHeight) {
        return null
    }
    //The element should be clickable and is returned in a parsed format
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

Node.prototype.realAddEventListener = Node.prototype.addEventListener
Node.prototype.addEventListener = function(type, listener, options) {
    this.realAddEventListener(type, listener, options)
    if (type === "click" && this !== document) {
        elementsWithClickListener.push(this)
    }
    if (type === "mousedown" && this !== document) {
        elementsWithMouseDownListener.push(this)
    }
}
Node.prototype.realRemoveEventListener = Node.prototype.removeEventListener
Node.prototype.removeEventListener = function(type, listener, options) {
    try {
        this.realRemoveEventListener(type, listener, options)
    } catch (e) {
        //This is a bug in the underlying website
    }
    if (type === "click" && this !== document) {
        try {
            elementsWithClickListener.remove(this)
        } catch (e) {
            //The element was already removed from the list before
        }
    }
    if (type === "mousedown" && this !== document) {
        try {
            elementsWithMouseDownListener.remove(this)
        } catch (e) {
            //The element was already removed from the list before
        }
    }
}
