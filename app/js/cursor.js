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
/* global MODES SETTINGS TABS */
"use strict"

let selectStartX = 0
let selectStartY = 0
let X = 0
let Y = 0
let cursor = null

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

const updateCursorElement = () => {
    if (X < 0) {
        X = 0
    }
    if (Y < 0) {
        Y = 0
    }
    if (X > window.innerWidth - SETTINGS.get("fontSize") * 0.7) {
        X = window.innerWidth - SETTINGS.get("fontSize") * 0.7
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
            "selection-request", selectStartX / factor, selectStartY / factor,
            X / factor, Y / factor)
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
    for (const button of ["left", "right", "middle"]) {
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

const copyAndStop = () => {
    TABS.currentPage().executeJavaScript("document.execCommand('copy')")
    MODES.setMode("normal")
}

const leftClick = () => {
    click("left")
}

const startOfPage = () => {
    X = 0
    Y = 0
    updateCursorElement()
}

const moveLeft = () => {
    X -= 10
    updateCursorElement()
}

const moveDown = () => {
    Y += 10
    updateCursorElement()
}

const moveUp = () => {
    Y -= 10
    updateCursorElement()
}

const moveRight = () => {
    X += 10
    updateCursorElement()
}

const middleClick = () => {
    click("middle")
}

const rightClick = () => {
    click("right")
}

const startVisualSelect = () => {
    selectStartX = X
    selectStartY = Y
    MODES.setMode("visual")
}

const moveFastRight = () => {
    X += 100
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

const endOfPage = () => {
    X = window.innerWidth
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
    Y += 100
    updateCursorElement()
}

const moveFastUp = () => {
    Y -= 100
    updateCursorElement()
}

module.exports = {
    start,
    updateCursorElement,
    moveFastLeft,
    releaseKeys,
    leftClick,
    startOfPage,
    moveLeft,
    moveDown,
    moveUp,
    moveRight,
    middleClick,
    rightClick,
    startVisualSelect,
    moveFastRight,
    copyAndStop,
    moveSlowLeft,
    moveSlowDown,
    moveSlowUp,
    moveSlowRight,
    moveRightMax,
    moveLeftMax,
    moveFastDown,
    moveFastUp,
    endOfPage
}
