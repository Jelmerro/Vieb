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

ipcRenderer.on("follow-mode-request", e => {
    const allLinks = []
    //a tags with href as the link, can be opened in new tab or current tab
    allLinks.push(...gatherAnchorTags())
    //input tags such as checkboxes, can be clicked but have no text input
    allLinks.push(...gatherClickableInputs())
    //input tags such as email and text, can have text inserted
    allLinks.push(...gatherTextLikeInputs())
    //All other elements with onclick listeners
    allLinks.push(...gatherOnclickElements())
    //Send response back to webview, which will forward it to follow.js
    e.sender.sendToHost("follow-response", allLinks)
})

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
    const viewHeight = Math.max(
        document.documentElement.clientHeight, window.innerHeight)
    const viewWidth = Math.max(
        document.documentElement.clientWidth, window.innerWidth)
    if (dimensions.bottom < 0 || dimensions.top > viewHeight) {
        return false
    }
    if (dimensions.right < 0 || dimensions.left > viewWidth) {
        return false
    }
    return true
}

const gatherAnchorTags = () => {
    const elements = [...document.getElementsByTagName("a")]
    const tags = []
    elements.forEach(element => {
        const clickableElement = parseElement(element, "url")
        if (clickableElement !== null) {
            tags.push(clickableElement)
        }
    })
    return tags
}

const gatherClickableInputs = () => {
    //Only easily clickable inputs will be matched with this function:
    //buttons, checkboxes, submit and radiobuttons
    const elements = []
    elements.push(...document.getElementsByTagName("button"))
    elements.push(...document.querySelectorAll("input[type=\"button\"]"))
    elements.push(...document.querySelectorAll("input[type=\"radio\"]"))
    elements.push(...document.querySelectorAll("input[type=\"checkbox\"]"))
    elements.push(...document.querySelectorAll("input[type=\"submit\"]"))
    const tags = []
    elements.forEach(element => {
        const clickableElement = parseElement(element, "inputs-click")
        if (clickableElement !== null) {
            tags.push(clickableElement)
        }
    })
    return tags
}

const gatherTextLikeInputs = () => {
    //Input fields with text input or similar
    const elements = [...document.querySelectorAll(
        "input:not([type=\"radio\"]):not([type=\"checkbox\"])"
        + ":not([type=\"submit\"]):not([type=\"button\"])")]
    elements.push(...document.getElementsByTagName("textarea"))
    const tags = []
    elements.forEach(element => {
        const clickableElement = parseElement(element, "inputs-insert")
        if (clickableElement !== null) {
            tags.push(clickableElement)
        }
    })
    return tags
}

const gatherOnclickElements = () => {
    const elements = [...document.querySelectorAll("*[onclick]")]
    //This won't access onclick added by javascript,
    //but there is a separate issue for that (#9)
    const tags = []
    elements.forEach(element => {
        const clickableElement = parseElement(element, "onclick")
        if (clickableElement !== null) {
            tags.push(clickableElement)
        }
    })
    return tags
}

