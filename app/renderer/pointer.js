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

const {
    currentPage, currentMode, getSetting, tabOrPageMatching
} = require("./common")
const {matchesQuery} = require("../util")

let X = 0
let Y = 0
let startX = 0
let startY = 0
let listenForScroll = false
let lastSelection = {"endX": 0, "endY": 0, "startX": 0, "startY": 0}
let mouseSelection = null

const zoomX = () => Math.round(X / currentPage().getZoomFactor())

const zoomY = () => Math.round(Y / currentPage().getZoomFactor())

const move = (x, y) => {
    X = x
    Y = y
    updateElement()
}

const handleScrollDiffEvent = diff => {
    startY += diff
    if (listenForScroll) {
        Y += diff
        updateElement()
        listenForScroll = false
    }
}

const offset = () => {
    let top = Number(currentPage().style.top.split(/[.px]/g)[0])
    let left = Number(currentPage().style.left.split(/[.px]/g)[0])
    let bottom = top + Number(currentPage().style.height.split(/[.px]/g)[0])
    let right = left + Number(currentPage().style.width.split(/[.px]/g)[0])
    if (document.getElementById("pages").classList.contains("multiple")) {
        top += getSetting("fontsize") * 0.15
        left += getSetting("fontsize") * 0.15
        bottom -= getSetting("fontsize") * 0.15
        right -= getSetting("fontsize") * 0.15
    }
    return {
        "bottom": Math.round(bottom),
        "left": Math.round(left),
        "right": Math.round(right),
        "top": Math.round(top)
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
        currentPage().sendInputEvent({"type": "mouseEnter", "x": X, "y": Y})
        currentPage().sendInputEvent({"type": "mouseMove", "x": X, "y": Y})
    }
    if (currentMode() === "visual") {
        lastSelection = {"endX": X, "endY": Y, startX, startY}
        const factor = currentPage().getZoomFactor()
        currentPage().send("action", "selectionRequest",
            Math.round(startX / factor), Math.round(startY / factor),
            zoomX(), zoomY())
    }
}

const releaseKeys = () => {
    try {
        currentPage().sendInputEvent({"type": "mouseLeave", "x": X, "y": Y})
        currentPage().send("action", "selectionRemove", zoomX(), zoomY())
    } catch {
        // Can't release keys, probably because of opening a new tab
    }
    mouseSelection = null
}

const storeMouseSelection = selection => {
    mouseSelection = selection
}

// ACTIONS

const start = (customX = null, customY = null) => {
    X = customX || Number(currentPage().getAttribute("pointer-x")) || X
    Y = customY || Number(currentPage().getAttribute("pointer-y")) || Y
    const {setMode} = require("./modes")
    setMode("pointer")
    currentPage().sendInputEvent({"type": "mouseEnter", "x": X, "y": Y})
    updateElement()
}

const moveToMouse = () => {
    const {ipcRenderer} = require("electron")
    const mousePos = ipcRenderer.sendSync("mouse-location")
    if (mousePos && getSetting("mouse")) {
        [...document.elementsFromPoint(mousePos.x, mousePos.y)].forEach(el => {
            if (matchesQuery(el, "webview[link-id]")) {
                if (el !== currentPage() || currentMode() !== "visual") {
                    const {switchToTab} = require("./tabs")
                    switchToTab(tabOrPageMatching(el))
                }
                const pagePos = offset()
                if (currentMode() === "visual") {
                    X = mousePos.x - pagePos.left
                    Y = mousePos.y - pagePos.top
                    updateElement()
                } else {
                    start(mousePos.x - pagePos.left, mousePos.y - pagePos.top)
                }
            }
        })
    }
}

const restoreSelection = () => {
    ({"endX": X, "endY": Y, startX, startY} = mouseSelection || lastSelection)
    mouseSelection = null
    const {setMode} = require("./modes")
    setMode("visual")
    updateElement()
}

const downloadAudio = () => currentPage().send("contextmenu-data", {
    "action": "download", "type": "audio", "x": zoomX(), "y": zoomY()
})

const downloadFrame = () => currentPage().send("contextmenu-data", {
    "action": "download", "type": "frame", "x": zoomX(), "y": zoomY()
})

const downloadLink = () => currentPage().send("contextmenu-data", {
    "action": "download", "type": "link", "x": zoomX(), "y": zoomY()
})

const downloadImage = () => currentPage().send("contextmenu-data", {
    "action": "download", "type": "img", "x": zoomX(), "y": zoomY()
})

const downloadVideo = () => currentPage().send("contextmenu-data", {
    "action": "download", "type": "video", "x": zoomX(), "y": zoomY()
})

const newtabAudio = () => currentPage().send("contextmenu-data", {
    "action": "newtab", "type": "audio", "x": zoomX(), "y": zoomY()
})

const newtabFrame = () => currentPage().send("contextmenu-data", {
    "action": "newtab", "type": "frame", "x": zoomX(), "y": zoomY()
})

const newtabLink = () => currentPage().send("contextmenu-data", {
    "action": "newtab", "type": "link", "x": zoomX(), "y": zoomY()
})

const newtabImage = () => currentPage().send("contextmenu-data", {
    "action": "newtab", "type": "img", "x": zoomX(), "y": zoomY()
})

const newtabVideo = () => currentPage().send("contextmenu-data", {
    "action": "newtab", "type": "video", "x": zoomX(), "y": zoomY()
})

const openAudio = () => currentPage().send("contextmenu-data", {
    "action": "open", "type": "audio", "x": zoomX(), "y": zoomY()
})

const openFrame = () => currentPage().send("contextmenu-data", {
    "action": "open", "type": "frame", "x": zoomX(), "y": zoomY()
})

const openLink = () => currentPage().send("contextmenu-data", {
    "action": "open", "type": "link", "x": zoomX(), "y": zoomY()
})

const openImage = () => currentPage().send("contextmenu-data", {
    "action": "open", "type": "img", "x": zoomX(), "y": zoomY()
})

const openVideo = () => currentPage().send("contextmenu-data", {
    "action": "open", "type": "video", "x": zoomX(), "y": zoomY()
})

const externalAudio = () => currentPage().send("contextmenu-data", {
    "action": "external", "type": "audio", "x": zoomX(), "y": zoomY()
})

const externalFrame = () => currentPage().send("contextmenu-data", {
    "action": "external", "type": "frame", "x": zoomX(), "y": zoomY()
})

const externalLink = () => currentPage().send("contextmenu-data", {
    "action": "external", "type": "link", "x": zoomX(), "y": zoomY()
})

const externalImage = () => currentPage().send("contextmenu-data", {
    "action": "external", "type": "img", "x": zoomX(), "y": zoomY()
})

const externalVideo = () => currentPage().send("contextmenu-data", {
    "action": "external", "type": "video", "x": zoomX(), "y": zoomY()
})

const copyAudio = () => currentPage().send("contextmenu-data", {
    "action": "copy", "type": "audio", "x": zoomX(), "y": zoomY()
})

const copyFrame = () => currentPage().send("contextmenu-data", {
    "action": "copy", "type": "frame", "x": zoomX(), "y": zoomY()
})

const copyLink = () => currentPage().send("contextmenu-data", {
    "action": "copy", "type": "link", "x": zoomX(), "y": zoomY()
})

const copyImageBuffer = () => currentPage().send("contextmenu-data", {
    "action": "copyimage", "type": "img", "x": zoomX(), "y": zoomY()
})

const copyImage = () => currentPage().send("contextmenu-data", {
    "action": "copy", "type": "img", "x": zoomX(), "y": zoomY()
})

const copyVideo = () => currentPage().send("contextmenu-data", {
    "action": "copy", "type": "video", "x": zoomX(), "y": zoomY()
})

const downloadText = () => currentPage().send("contextmenu-data", {
    "action": "download", "type": "text", "x": zoomX(), "y": zoomY()
})

const newtabText = () => currentPage().send("contextmenu-data", {
    "action": "newtab", "type": "text", "x": zoomX(), "y": zoomY()
})

const openText = () => currentPage().send("contextmenu-data", {
    "action": "open", "type": "text", "x": zoomX(), "y": zoomY()
})

const externalText = () => currentPage().send("contextmenu-data", {
    "action": "external", "type": "text", "x": zoomX(), "y": zoomY()
})

const copyText = () => currentPage().send("contextmenu-data", {
    "action": "copy", "type": "text", "x": zoomX(), "y": zoomY()
})

const searchText = () => currentPage().send("contextmenu-data", {
    "action": "search", "type": "text", "x": zoomX(), "y": zoomY()
})

const toggleMediaPlay = () => currentPage().send("action", "togglePause", X, Y)

const toggleMediaMute = () => currentPage().send("action", "toggleMute", X, Y)

const toggleMediaLoop = () => currentPage().send("action", "toggleLoop", X, Y)

const toggleMediaControls = () => currentPage().send(
    "action", "toggleControls", X, Y)

const inspectElement = () => {
    const {top, left} = offset()
    currentPage().inspectElement(Math.round(X + left), Math.round(Y + top))
}

const leftClick = () => {
    currentPage().sendInputEvent({"type": "mouseEnter", "x": X, "y": Y})
    currentPage().sendInputEvent({
        "button": "left",
        "clickCount": 1,
        "type": "mouseDown",
        "x": X,
        "y": Y
    })
    currentPage().sendInputEvent({
        "button": "left", "type": "mouseUp", "x": X, "y": Y
    })
    currentPage().sendInputEvent({"type": "mouseLeave", "x": X, "y": Y})
}

const startOfPage = () => {
    const {scrollTop} = require("./actions")
    scrollTop()
    Y = 0
    updateElement()
}

const moveFastLeft = () => {
    X -= 100
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
        "button": "right", "clickCount": 1, "type": "mouseDown", "x": X, "y": Y
    })
    currentPage().sendInputEvent({
        "button": "right", "type": "mouseUp", "x": X, "y": Y
    })
}

const startVisualSelect = () => {
    if (mouseSelection && getSetting("mousevisualmode") !== "never") {
        restoreSelection()
    } else {
        const {setMode} = require("./modes")
        setMode("visual")
        startX = Number(X)
        startY = Number(Y)
    }
}

const swapPosition = () => {
    if (currentMode() === "visual") {
        [startX, X] = [X, startX]
        ;[startY, Y] = [Y, startY]
        updateElement()
    }
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
        "deltaX": 0, "deltaY": -100, "type": "mouseWheel", "x": X, "y": Y
    })
    updateElement()
}

const scrollUp = () => {
    currentPage().sendInputEvent({
        "deltaX": 0, "deltaY": 100, "type": "mouseWheel", "x": X, "y": Y
    })
    updateElement()
}

const scrollLeft = () => {
    currentPage().sendInputEvent({
        "deltaX": 100, "deltaY": 0, "type": "mouseWheel", "x": X, "y": Y
    })
    updateElement()
}

const scrollRight = () => {
    currentPage().sendInputEvent({
        "deltaX": -100, "deltaY": 0, "type": "mouseWheel", "x": X, "y": Y
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
    centerOfView,
    copyAudio,
    copyFrame,
    copyImage,
    copyImageBuffer,
    copyLink,
    copyText,
    copyVideo,
    downloadAudio,
    downloadFrame,
    downloadImage,
    downloadLink,
    downloadText,
    downloadVideo,
    endOfPage,
    endOfView,
    externalAudio,
    externalFrame,
    externalImage,
    externalLink,
    externalText,
    externalVideo,
    handleScrollDiffEvent,
    insertAtPosition,
    inspectElement,
    leftClick,
    move,
    moveDown,
    moveFastDown,
    moveFastLeft,
    moveFastRight,
    moveFastUp,
    moveLeft,
    moveLeftMax,
    moveRight,
    moveRightMax,
    moveSlowDown,
    moveSlowLeft,
    moveSlowRight,
    moveSlowUp,
    moveToMouse,
    moveUp,
    newtabAudio,
    newtabFrame,
    newtabImage,
    newtabLink,
    newtabText,
    newtabVideo,
    openAudio,
    openFrame,
    openImage,
    openLink,
    openText,
    openVideo,
    releaseKeys,
    restoreSelection,
    rightClick,
    scrollDown,
    scrollLeft,
    scrollRight,
    scrollUp,
    searchText,
    start,
    startOfPage,
    startOfView,
    startVisualSelect,
    storeMouseSelection,
    swapPosition,
    toggleMediaControls,
    toggleMediaLoop,
    toggleMediaMute,
    toggleMediaPlay,
    updateElement
}
