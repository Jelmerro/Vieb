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

const { ipcRenderer } = require("electron")

const urls = ["a"]
const clickableInputs = ["button", "input[type=\"button\"]",
    "input[type=\"radio\"]", "input[type=\"checkbox\"]",
    "input[type=\"submit\"]", "summary"]
const textlikeInputs = ["input:not([type=\"radio\"]):not([type=\"checkbox\"])"
    + ":not([type=\"submit\"]):not([type=\"button\"])", "textarea", "select"]
const onclickElements = "*:not(button):not(input)[onclick]"

ipcRenderer.on("follow-mode-request", e => {
    const allLinks = []
    //a tags with href as the link, can be opened in new tab or current tab
    allLinks.push(...allElementsBySelectors("url", urls))
    //input tags such as checkboxes, can be clicked but have no text input
    allLinks.push(...allElementsBySelectors("inputs-click", clickableInputs))
    //input tags such as email and text, can have text inserted
    allLinks.push(...allElementsBySelectors("inputs-insert", textlikeInputs))
    //All other elements with onclick listeners
    const clickableElements = [...document.querySelectorAll(onclickElements)]
    clickableElements.push(...elementsWithClickListener)
    clickableElements.forEach(element => {
        const clickable = parseElement(element, "onclick")
        if (clickable !== null) {
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
    e.sender.sendToHost("follow-response", allLinks)
})

const checkForDuplicateLink = (element, existing) => {
    //check for exactly the same dimensions
    if (element.height === existing.height) {
        if (element.x === existing.x && element.y === existing.y) {
            if (element.width === existing.width) {
                return true
            }
        }
    }
    //check if the new element is overlapping an existing link
    if (element.height + element.y >= existing.height + existing.y) {
        if (element.width + element.x >= existing.width + existing.x) {
            if (element.x <= existing.x && element.y <= existing.y) {
                return true
            }
        }
    }
    return false
}

const parseElement = (element, type) => {
    const rects = [...element.getClientRects()]
    let dimensions = element.getBoundingClientRect()
    let embeddedImageLink = false
    if (type === "url") {
        if (!isVisible(element, false)) {
            return null
        }
        const anchorImage = element.querySelector("img, svg")
        if (anchorImage !== null) {
            const imageDimensions = anchorImage.getBoundingClientRect()
            if (imageDimensions.width > dimensions.width) {
                dimensions = imageDimensions
                embeddedImageLink = true
            }
            if (imageDimensions.height > dimensions.height) {
                dimensions = imageDimensions
                embeddedImageLink = true
            }
        }
    } else if (!isVisible(element)) {
        return null
    }
    if (!embeddedImageLink) {
        if (rects.length === 0) {
            return null
        }
        //Check if the center of the boundingrect is actually clickable
        const clickX = dimensions.x + (dimensions.width / 2)
        const clickY = dimensions.y + (dimensions.height / 2)
        let clickable = false
        rects.forEach(rect => {
            if (rect.x < clickX && rect.x + rect.width > clickX) {
                if (rect.y < clickY && rect.y + rect.height > clickY) {
                    clickable = true
                }
            }
        })
        if (!clickable) {
            dimensions = rects[0]
        }
    }
    if (dimensions.width <= 1 || dimensions.height <= 1) {
        return null
    }
    return {
        "url": element.href || "",
        "x": dimensions.x,
        "y": dimensions.y,
        "width": dimensions.width,
        "height": dimensions.height,
        "type": type
    }
}

const isVisible = (element, doSizeCheck=true) => {
    if (element.offsetWidth <= 1 || element.offsetHeight <= 1) {
        if (doSizeCheck) {
            return false
        }
    }
    if (getComputedStyle(element).display === "none") {
        return false
    }
    if (getComputedStyle(element).visibility === "hidden") {
        return false
    }
    if (getComputedStyle(element).opacity === 0) {
        return false
    }
    const dimensions = element.getBoundingClientRect()
    // TODO maybe window.innerHeight is not the right way to go,
    // but it's by far the best working option I have found for now
    if (dimensions.bottom < 0 || dimensions.top > window.innerHeight) {
        return false
    }
    if (dimensions.right < 0 || dimensions.left > window.innerWidth) {
        return false
    }
    return true
}

const allElementsBySelectors = (type, selectors) => {
    const elements = []
    // Iframe lookups are disabled for 2 reasons:
    // - It doesn't work cross-site
    // - On some pages the element locations are relative to the body,
    //   even though they should be relative to the iframe
    //const iframes = [...document.getElementsByTagName("iframe")]
    selectors.forEach(selector => {
        elements.push(...document.querySelectorAll(selector))
        /*iframes.forEach(frame => {
            if (frame.contentDocument) {
                elements.push(
                    ...frame.contentDocument.querySelectorAll(selector))
            }
        })*/
    })
    const tags = []
    elements.forEach(element => {
        const clickableElement = parseElement(element, type)
        if (clickableElement !== null) {
            tags.push(clickableElement)
        }
    })
    return tags
}

const elementsWithClickListener = []

Node.prototype.realAddEventListener = Node.prototype.addEventListener
Node.prototype.addEventListener = function(type, listener, options) {
    this.realAddEventListener(type, listener, options)
    if (type === "click" && this !== document) {
        elementsWithClickListener.push(this)
    }
}
Node.prototype.realRemoveEventListener = Node.prototype.removeEventListener
Node.prototype.removeEventListener = function(type, listener, options) {
    try {
        this.realRemoveEventListener(type, listener, options)
    } catch (e)  {
        //This is a bug in the underlying website
    }
    if (type === "click" && this !== document) {
        try {
            elementsWithClickListener.remove(this)
        } catch (e) {
            //The element was already removed from the list before
        }
    }
}
