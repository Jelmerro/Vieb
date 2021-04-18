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

const {currentPage, currentMode, getSetting} = require("./common")

let X = 0
let Y = 0
let listenForScroll = false

const start = () => {
    X = Number(currentPage().getAttribute("pointer-x")) || X
    Y = Number(currentPage().getAttribute("pointer-y")) || Y
    const {setMode} = require("./modes")
    setMode("pointer")
    currentPage().sendInputEvent({"type": "mouseEnter", "x": X, "y": Y})
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
    let top = Number(currentPage().style.top.split(/[.px]/g)[0])
    let left = Number(currentPage().style.left.split(/[.px]/g)[0])
    let bottom = top + Number(currentPage()
        .style.height.split(/[.px]/g)[0])
    let right = left + Number(currentPage().style.width.split(/[.px]/g)[0])
    if (document.getElementById("pages").classList.contains("multiple")) {
        top += getSetting("fontsize") * .15
        left += getSetting("fontsize") * .15
        bottom -= getSetting("fontsize") * .15
        right -= getSetting("fontsize") * .15
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
    X = Math.max(0, Math.min(X, right - left - getSetting("fontsize") * 1.4))
    Y = Math.max(0, Math.min(Y, bottom - top - getSetting("fontsize")))
    document.getElementById("pointer").style.left = `${X + left}px`
    document.getElementById("pointer").style.top = `${Y + top}px`
    currentPage().setAttribute("pointer-x", X)
    currentPage().setAttribute("pointer-y", Y)
    if (currentMode() === "pointer") {
        currentPage().sendInputEvent(
            {"type": "mouseEnter", "x": X, "y": Y})
        currentPage().sendInputEvent({"type": "mouseMove", "x": X, "y": Y})
    }
    if (currentMode() === "visual") {
        const factor = currentPage().getZoomFactor()
        currentPage().send("selection-request",
            Math.round(X / factor), Math.round(Y / factor))
    }
}

const releaseKeys = () => {
    try {
        for (const button of ["left", "right"]) {
            currentPage().sendInputEvent({
                "type": "mouseUp", "x": X, "y": Y, "button": button
            })
        }
        currentPage().sendInputEvent(
            {"type": "mouseLeave", "x": X, "y": Y})
        const factor = currentPage().getZoomFactor()
        currentPage().send("selection-remove",
            Math.round(X / factor), Math.round(Y / factor))
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
    const factor = currentPage().getZoomFactor()
    currentPage().send("download-image-request",
        Math.round(X / factor), Math.round(Y / factor))
}

const downloadLink = () => {
    const url = document.getElementById("url-hover")?.textContent
    if (url) {
        currentPage().downloadURL(url)
    }
}

const inspectElement = () => {
    const {top, left} = offset()
    currentPage().inspectElement(Math.round(X + left), Math.round(Y + top))
}

const copyAndStop = () => {
    if (currentMode() === "pointer") {
        const {clipboard} = require("electron")
        clipboard.writeText(document.getElementById("url-hover").textContent)
    } else {
        const factor = currentPage().getZoomFactor()
        currentPage().send("selection-copy",
            Math.round(X / factor), Math.round(Y / factor))
    }
    const {setMode} = require("./modes")
    setMode("normal")
}

const leftClick = () => {
    const factor = currentPage().getZoomFactor()
    currentPage().sendInputEvent({
        "type": "mouseEnter", "x": X * factor, "y": Y * factor
    })
    currentPage().sendInputEvent({
        "type": "mouseDown",
        "x": X * factor,
        "y": Y * factor,
        "button": "left",
        "clickCount": 1
    })
    currentPage().sendInputEvent({
        "type": "mouseUp", "x": X * factor, "y": Y * factor, "button": "left"
    })
    currentPage().sendInputEvent({
        "type": "mouseLeave", "x": X * factor, "y": Y * factor
    })
}

const startOfPage = () => {
    const {scrollTop} = require("./actions")
    scrollTop()
    Y = 0
    updateElement()
}

const moveLeft = () => {
    X -= 10
    updateElement()
}

const insertAtPosition = () => {
    const factor = currentPage().getZoomFactor()
    currentPage().send("focus-input", {"x": X * factor, "y": Y * factor})
}

const moveDown = () => {
    const {bottom, top} = offset()
    if (Y === bottom - top - getSetting("fontsize")) {
        const {"scrollDown": scroll} = require("./actions")
        scroll()
        listenForScroll = true
    } else {
        Y += 10
    }
    updateElement()
}

const moveUp = () => {
    if (Y === 0) {
        const {"scrollUp": scroll} = require("./actions")
        scroll()
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
    currentPage().sendInputEvent({
        "type": "mouseDown", "x": X, "y": Y, "button": "right", "clickCount": 1
    })
    currentPage().sendInputEvent({
        "type": "mouseUp", "x": X, "y": Y, "button": "right"
    })
}

const startVisualSelect = () => {
    const factor = currentPage().getZoomFactor()
    currentPage().send("selection-start-location",
        Math.round(X / factor), Math.round(Y / factor))
    const {setMode} = require("./modes")
    setMode("visual")
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
    currentPage().sendInputEvent({
        "type": "mouseWheel", "x": X, "y": Y, "deltaX": 0, "deltaY": -100
    })
    updateElement()
}

const scrollUp = () => {
    currentPage().sendInputEvent({
        "type": "mouseWheel", "x": X, "y": Y, "deltaX": 0, "deltaY": 100
    })
    updateElement()
}

const scrollLeft = () => {
    currentPage().sendInputEvent({
        "type": "mouseWheel", "x": X, "y": Y, "deltaX": 100, "deltaY": 0
    })
    updateElement()
}

const scrollRight = () => {
    currentPage().sendInputEvent({
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
    const {scrollBottom} = require("./actions")
    scrollBottom()
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
    if (Y === bottom - top - getSetting("fontsize")) {
        const {"scrollDown": scroll} = require("./actions")
        scroll()
        listenForScroll = true
    } else {
        Y += 100
    }
    updateElement()
}

const moveFastUp = () => {
    if (Y === 0) {
        const {"scrollUp": scroll} = require("./actions")
        scroll()
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
