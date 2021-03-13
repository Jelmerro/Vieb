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
/* global ACTIONS MODES SETTINGS TABS */
"use strict"

const {clipboard} = require("electron")

let X = 0
let Y = 0
let listenForScroll = false

const start = () => {
    X = Number(TABS.currentPage().getAttribute("pointer-x")) || X
    Y = Number(TABS.currentPage().getAttribute("pointer-y")) || Y
    MODES.setMode("pointer")
    TABS.currentPage().sendInputEvent({"type": "mouseEnter", "x": X, "y": Y})
    updateElement()
}

const move = (x, y) => {
    X = x
    Y = y
    updateElement()
}

const handleScrollDiffEvent = diff => {
    if (listenForScroll) {
        Y += diff
        updateElement()
        listenForScroll = false
    }
}

const offset = () => {
    let top = Number(TABS.currentPage().style.top.split(/[.px]/g)[0])
    let left = Number(TABS.currentPage().style.left.split(/[.px]/g)[0])
    let bottom = top + Number(TABS.currentPage()
        .style.height.split(/[.px]/g)[0])
    let right = left + Number(TABS.currentPage().style.width.split(/[.px]/g)[0])
    if (document.getElementById("pages").classList.contains("multiple")) {
        top += SETTINGS.get("fontsize") * .15
        left += SETTINGS.get("fontsize") * .15
        bottom -= SETTINGS.get("fontsize") * .15
        right -= SETTINGS.get("fontsize") * .15
    }
    return {
        "top": Math.round(top),
        "left": Math.round(left),
        "bottom": Math.round(bottom),
        "right": Math.round(right)
    }
}

const updateElement = () => {
    const {top, left, bottom, right} = offset()
    if (X < 0) {
        X = 0
    }
    if (Y < 0) {
        Y = 0
    }
    if (X > right - left - SETTINGS.get("fontsize") * 1.4) {
        X = right - left - SETTINGS.get("fontsize") * 1.4
    }
    if (Y > bottom - top - SETTINGS.get("fontsize")) {
        Y = bottom - top - SETTINGS.get("fontsize")
    }
    document.getElementById("pointer").style.left = `${X + left}px`
    document.getElementById("pointer").style.top = `${Y + top}px`
    TABS.currentPage().setAttribute("pointer-x", X)
    TABS.currentPage().setAttribute("pointer-y", Y)
    if (MODES.currentMode() === "pointer") {
        TABS.currentPage().sendInputEvent(
            {"type": "mouseEnter", "x": X, "y": Y})
        TABS.currentPage().sendInputEvent({"type": "mouseMove", "x": X, "y": Y})
    }
    if (MODES.currentMode() === "visual") {
        const factor = TABS.currentPage().getZoomFactor()
        TABS.currentPage().send("selection-request",
            Math.round(X / factor), Math.round(Y / factor))
    }
}

const releaseKeys = () => {
    try {
        for (const button of ["left", "right"]) {
            TABS.currentPage().sendInputEvent({
                "type": "mouseUp", "x": X, "y": Y, "button": button
            })
        }
        TABS.currentPage().sendInputEvent(
            {"type": "mouseLeave", "x": X, "y": Y})
        TABS.currentPage().send("selection-remove")
    } catch (e) {
        // Can't release keys, probably because of opening a new tab
    }
}

// ACTIONS

const moveFastLeft = () => {
    X -= 100
    updateElement()
}

const downloadImage = () => {
    const factor = TABS.currentPage().getZoomFactor()
    TABS.currentPage().send("download-image-request",
        Math.round(X / factor), Math.round(Y / factor))
}

const downloadLink = () => {
    const url = document.getElementById("url-hover")?.textContent
    if (url) {
        TABS.currentPage().downloadURL(url)
    }
}

const inspectElement = () => {
    const {top, left} = offset()
    TABS.currentPage().inspectElement(Math.round(X + left), Math.round(Y + top))
}

const copyAndStop = () => {
    if (MODES.currentMode() === "pointer") {
        clipboard.writeText(document.getElementById("url-hover").textContent)
    } else {
        TABS.currentPage().send("selection-copy")
    }
    MODES.setMode("normal")
}

const leftClick = () => {
    const factor = TABS.currentPage().getZoomFactor()
    TABS.currentPage().send("follow-element",
        {"x": Math.round(X / factor), "y": Math.round(Y / factor)})
}

const startOfPage = () => {
    ACTIONS.scrollTop()
    Y = 0
    updateElement()
}

const moveLeft = () => {
    X -= 10
    updateElement()
}

const insertAtPosition = () => {
    MODES.setMode("insert")
    leftClick()
}

const moveDown = () => {
    const {bottom, top} = offset()
    if (Y === bottom - top - SETTINGS.get("fontsize")) {
        ACTIONS.scrollDown()
        listenForScroll = true
    } else {
        Y += 10
    }
    updateElement()
}

const moveUp = () => {
    if (Y === 0) {
        ACTIONS.scrollUp()
        listenForScroll = true
    } else {
        Y -= 10
    }
    updateElement()
}

const moveRight = () => {
    X += 10
    updateElement()
}

const rightClick = () => {
    TABS.currentPage().sendInputEvent({
        "type": "mouseDown", "x": X, "y": Y, "button": "right", "clickCount": 1
    })
    TABS.currentPage().sendInputEvent({
        "type": "mouseUp", "x": X, "y": Y, "button": "right"
    })
}

const startVisualSelect = () => {
    const factor = TABS.currentPage().getZoomFactor()
    TABS.currentPage().send("selection-start-location",
        Math.round(X / factor), Math.round(Y / factor))
    MODES.setMode("visual")
}

const moveFastRight = () => {
    X += 100
    updateElement()
}

const centerOfView = () => {
    const {top, bottom} = offset()
    Y = (bottom - top) / 2
    updateElement()
}

const scrollDown = () => {
    TABS.currentPage().sendInputEvent({
        "type": "mouseWheel", "x": X, "y": Y, "deltaX": 0, "deltaY": -100
    })
    updateElement()
}

const scrollUp = () => {
    TABS.currentPage().sendInputEvent({
        "type": "mouseWheel", "x": X, "y": Y, "deltaX": 0, "deltaY": 100
    })
    updateElement()
}

const scrollLeft = () => {
    TABS.currentPage().sendInputEvent({
        "type": "mouseWheel", "x": X, "y": Y, "deltaX": 100, "deltaY": 0
    })
    updateElement()
}

const scrollRight = () => {
    TABS.currentPage().sendInputEvent({
        "type": "mouseWheel", "x": X, "y": Y, "deltaX": -100, "deltaY": 0
    })
    updateElement()
}

const startOfView = () => {
    Y = 0
    updateElement()
}

const moveSlowLeft = () => {
    X -= 1
    updateElement()
}

const moveSlowDown = () => {
    Y += 1
    updateElement()
}

const moveSlowUp = () => {
    Y -= 1
    updateElement()
}

const moveSlowRight = () => {
    X += 1
    updateElement()
}

const endOfView = () => {
    Y = window.innerHeight
    updateElement()
}

const endOfPage = () => {
    ACTIONS.scrollBottom()
    Y = window.innerHeight
    updateElement()
}

const moveRightMax = () => {
    X = window.innerWidth
    updateElement()
}

const moveLeftMax = () => {
    X = 0
    updateElement()
}

const moveFastDown = () => {
    const {bottom, top} = offset()
    if (Y === bottom - top - SETTINGS.get("fontsize")) {
        ACTIONS.scrollDown()
        listenForScroll = true
    } else {
        Y += 100
    }
    updateElement()
}

const moveFastUp = () => {
    if (Y === 0) {
        ACTIONS.scrollUp()
        listenForScroll = true
    } else {
        Y -= 100
    }
    updateElement()
}

module.exports = {
    start,
    move,
    handleScrollDiffEvent,
    updateElement,
    releaseKeys,
    leftClick,
    rightClick,
    downloadLink,
    downloadImage,
    inspectElement,
    insertAtPosition,
    startVisualSelect,
    copyAndStop,
    moveUp,
    moveDown,
    moveLeft,
    moveRight,
    moveSlowUp,
    moveSlowDown,
    moveSlowLeft,
    moveSlowRight,
    moveFastUp,
    moveFastDown,
    moveFastLeft,
    moveFastRight,
    moveLeftMax,
    moveRightMax,
    scrollUp,
    scrollDown,
    scrollLeft,
    scrollRight,
    startOfView,
    centerOfView,
    endOfView,
    startOfPage,
    endOfPage
}
