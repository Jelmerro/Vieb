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
/* global ACTIONS MODES SETTINGS TABS */
"use strict"

const {remote} = require("electron")

let X = 0
let Y = 0
let cursor = null
let listenForScroll = false

const init = () => {
    setInterval(() => {
        ACTIONS.setFocusCorrectly()
        if (["cursor", "visual"].includes(MODES.currentMode())) {
            document.getElementById("cursor").style.backgroundColor = "#fff"
        }
        setTimeout(() => {
            ACTIONS.setFocusCorrectly()
        }, 500)
        setTimeout(() => {
            ACTIONS.setFocusCorrectly()
            if (["cursor", "visual"].includes(MODES.currentMode())) {
                document.getElementById("cursor").style.backgroundColor = "#3af"
            }
        }, 1000)
    }, 1500)
}

const start = () => {
    MODES.setMode("cursor")
    cursor = document.getElementById("cursor")
    cursor.style.display = "block"
    TABS.currentPage().sendInputEvent({
        "type": "mouseEnter",
        "x": X,
        "y": Y
    })
    updateCursorElement()
}

const handleScrollDiffEvent = diff => {
    if (listenForScroll) {
        Y += diff
        updateCursorElement()
        listenForScroll = false
    }
}

const updateCursorElement = () => {
    if (X < 0) {
        X = 0
    }
    if (Y < 0) {
        Y = 0
    }
    if (X > window.innerWidth - SETTINGS.get("fontSize") * 1.4) {
        X = window.innerWidth - SETTINGS.get("fontSize") * 1.4
    }
    if (Y > window.innerHeight - SETTINGS.get("fontSize") * 5) {
        Y = window.innerHeight - SETTINGS.get("fontSize") * 5
    }
    cursor.style.left = `${X}px`
    cursor.style.top = `${Y + SETTINGS.get("fontSize") * 4}px`
    if (MODES.currentMode() === "cursor") {
        TABS.currentPage().sendInputEvent({
            "type": "mouseEnter",
            "x": X,
            "y": Y
        })
        TABS.currentPage().sendInputEvent({
            "type": "mouseMove",
            "x": X,
            "y": Y
        })
    }
    if (MODES.currentMode() === "visual") {
        const factor = TABS.currentPage().getZoomFactor()
        TABS.currentPage().getWebContents().send(
            "selection-request", X / factor, Y / factor)
    }
}

const click = button => {
    TABS.currentPage().sendInputEvent({
        "type": "mouseDown",
        "x": X,
        "y": Y,
        "button": button,
        "clickCount": 1
    })
    TABS.currentPage().sendInputEvent({
        "type": "mouseUp",
        "x": X,
        "y": Y,
        "button": button,
        "clickCount": 1
    })
}

const releaseKeys = stayVisble => {
    if (cursor && !stayVisble) {
        cursor.style.display = ""
    }
    for (const button of ["left", "right"]) {
        TABS.currentPage().sendInputEvent({
            "type": "mouseUp",
            "x": X,
            "y": Y,
            "button": button,
            "clickCount": 1
        })
    }
    TABS.currentPage().sendInputEvent({
        "type": "mouseLeave",
        "x": X,
        "y": Y
    })
    TABS.currentPage().executeJavaScript(
        "window.getSelection().removeAllRanges();")
}

//ACTIONS

const moveFastLeft = () => {
    X -= 100
    updateCursorElement()
}

const downloadImage = () => {
    const factor = TABS.currentPage().getZoomFactor()
    TABS.currentPage().getWebContents().send(
        "download-image-request", X / factor, Y / factor)
}

const copyAndStop = () => {
    if (MODES.currentMode() === "cursor") {
        remote.clipboard.write({
            text: document.getElementById("url-hover").textContent
        })
    } else {
        TABS.currentPage().executeJavaScript("document.execCommand('copy')")
    }
    MODES.setMode("normal")
}

const leftClick = () => {
    click("left")
}

const startOfPage = () => {
    ACTIONS.scrollTop()
    Y = 0
    updateCursorElement()
}

const moveLeft = () => {
    X -= 10
    updateCursorElement()
}

const moveDown = () => {
    if (Y === window.innerHeight - SETTINGS.get("fontSize") * 5) {
        ACTIONS.scrollDown()
        listenForScroll = true
    } else {
        Y += 10
    }
    updateCursorElement()
}

const moveUp = () => {
    if (Y === 0) {
        ACTIONS.scrollUp()
        listenForScroll = true
    } else {
        Y -= 10
    }
    updateCursorElement()
}

const moveRight = () => {
    X += 10
    updateCursorElement()
}

const rightClick = () => {
    click("right")
}

const startVisualSelect = () => {
    const factor = TABS.currentPage().getZoomFactor()
    TABS.currentPage().getWebContents().send(
        "selection-start-location", X / factor, Y / factor)
    MODES.setMode("visual")
}

const moveFastRight = () => {
    X += 100
    updateCursorElement()
}

const centerOfView = () => {
    Y = window.innerHeight / 2
    updateCursorElement()
}

const scrollDown = () => {
    TABS.currentPage().getWebContents().sendInputEvent({
        "type": "mouseWheel",
        "x": X,
        "y": Y,
        "deltaX": 0,
        "deltaY": -100
    })
    updateCursorElement()
}

const scrollUp = () => {
    TABS.currentPage().getWebContents().sendInputEvent({
        "type": "mouseWheel",
        "x": X,
        "y": Y,
        "deltaX": 0,
        "deltaY": 100
    })
    updateCursorElement()
}

const startOfView = () => {
    Y = 0
    updateCursorElement()
}

const moveSlowLeft = () => {
    X -= 1
    updateCursorElement()
}

const moveSlowDown = () => {
    Y += 1
    updateCursorElement()
}

const moveSlowUp = () => {
    Y -= 1
    updateCursorElement()
}

const moveSlowRight = () => {
    X += 1
    updateCursorElement()
}

const endOfView = () => {
    Y = window.innerHeight
    updateCursorElement()
}

const endOfPage = () => {
    ACTIONS.scrollBottom()
    Y = window.innerHeight
    updateCursorElement()
}

const moveRightMax = () => {
    X = window.innerWidth
    updateCursorElement()
}

const moveLeftMax = () => {
    X = 0
    updateCursorElement()
}

const moveFastDown = () => {
    if (Y === window.innerHeight - SETTINGS.get("fontSize") * 5) {
        ACTIONS.scrollDown()
        listenForScroll = true
    } else {
        Y += 100
    }
    updateCursorElement()
}

const moveFastUp = () => {
    if (Y === 0) {
        ACTIONS.scrollUp()
        listenForScroll = true
    } else {
        Y -= 100
    }
    updateCursorElement()
}

module.exports = {
    init,
    start,
    handleScrollDiffEvent,
    updateCursorElement,
    releaseKeys,
    moveFastLeft,
    downloadImage,
    leftClick,
    startOfPage,
    moveLeft,
    moveDown,
    moveUp,
    moveRight,
    rightClick,
    startVisualSelect,
    moveFastRight,
    centerOfView,
    scrollDown,
    scrollUp,
    copyAndStop,
    startOfView,
    endOfView,
    endOfPage,
    moveSlowLeft,
    moveSlowDown,
    moveSlowUp,
    moveSlowRight,
    moveRightMax,
    moveLeftMax,
    moveFastDown,
    moveFastUp
}
