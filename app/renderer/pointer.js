/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2022 Jelmer van Arnhem
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
    currentPage,
    currentMode,
    getSetting,
    tabOrPageMatching,
    getMouseConf,
    listPages
} = require("./common")
const {matchesQuery, propPixels, sendToPageOrSubFrame} = require("../util")

let X = 0
let Y = 0
let startX = 0
let startY = 0
let listenForScroll = false
let lastSelection = {"endX": 0, "endY": 0, "startX": 0, "startY": 0}
let mouseSelection = null
let skipNextClick = false

const init = () => {
    const {ipcRenderer} = require("electron")
    const {setMode} = require("./modes")
    ipcRenderer.on("mouse-click-info", (_, clickInfo) => {
        if (clickInfo.webviewId) {
            if (clickInfo.webviewId !== currentPage().getWebContentsId()) {
                const page = listPages().find(
                    p => p.getWebContentsId?.() === clickInfo.webviewId)
                if (page) {
                    const {switchToTab} = require("./tabs")
                    switchToTab(tabOrPageMatching(page))
                }
            }
        }
        const {clear} = require("./contextmenu")
        clear()
        if (skipNextClick) {
            skipNextClick = false
            return
        }
        if (["pointer", "visual"].includes(currentMode())) {
            if (getMouseConf("movepointer")) {
                if (clickInfo.tovisual) {
                    startVisualSelect()
                }
                move(clickInfo.x * currentPage().getZoomFactor(),
                    clickInfo.y * currentPage().getZoomFactor())
            }
        } else if (clickInfo.toinsert) {
            if (getMouseConf("toinsert")) {
                setMode("insert")
            }
        } else if ("ces".includes(currentMode()[0])) {
            if (getMouseConf("leaveinput")) {
                setMode("normal")
            }
        } else {
            const {setFocusCorrectly} = require("./actions")
            setFocusCorrectly()
        }
        if (!clickInfo.tovisual) {
            if (!["pointer", "visual"].includes(currentMode())) {
                storeMouseSelection(null)
            }
        }
    })
    ipcRenderer.on("mouse-selection", (_, selectInfo) => {
        const switchToVisual = getSetting("mousevisualmode")
        if (getMouseConf("copyselect")) {
            const {clipboard} = require("electron")
            clipboard.writeText(selectInfo.text)
        }
        if (selectInfo.toinsert) {
            if (getMouseConf("toinsert")) {
                setMode("insert")
            }
            return
        }
        if (switchToVisual !== "never" || currentMode() === "visual") {
            skipNextClick = true
            storeMouseSelection({
                "endX": selectInfo.endX * currentPage().getZoomFactor(),
                "endY": selectInfo.endY * currentPage().getZoomFactor(),
                "startX": selectInfo.startX * currentPage().getZoomFactor(),
                "startY": selectInfo.startY * currentPage().getZoomFactor()
            })
            if (switchToVisual === "activate") {
                startVisualSelect()
            }
        }
    })
}
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
    const page = currentPage()
    const border = propPixels(page, "borderWidth")
    const top = Math.round(propPixels(page.style, "top") + border)
    const left = Math.round(propPixels(page.style, "left") + border)
    const bottom = Math.round(top + propPixels(page.style, "height") + border)
    const right = Math.round(left + propPixels(page.style, "width") + border)
    return {bottom, left, right, top}
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
        sendToPageOrSubFrame("send-input-event",
            {"type": "hover", "x": X, "y": Y})
    }
    if (currentMode() === "visual") {
        lastSelection = {"endX": X, "endY": Y, startX, startY}
        const factor = currentPage().getZoomFactor()
        sendToPageOrSubFrame("action", "selectionRequest",
            Math.round(startX / factor), Math.round(startY / factor),
            zoomX(), zoomY())
    }
}

const releaseKeys = () => {
    try {
        sendToPageOrSubFrame("send-input-event",
            {"type": "leave", "x": X, "y": Y})
        sendToPageOrSubFrame("action", "selectionRemove", zoomX(), zoomY())
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
    sendToPageOrSubFrame("send-input-event", {"type": "hover", "x": X, "y": Y})
    updateElement()
}

const moveToMouse = () => {
    const {ipcRenderer} = require("electron")
    const mousePos = ipcRenderer.sendSync("mouse-location")
    if (mousePos) {
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

const splitAudio = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "split", "type": "audio", "x": zoomX(), "y": zoomY()
})

const splitFrame = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "split", "type": "frame", "x": zoomX(), "y": zoomY()
})

const splitLink = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "split", "type": "link", "x": zoomX(), "y": zoomY()
})

const splitImage = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "split", "type": "img", "x": zoomX(), "y": zoomY()
})

const splitVideo = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "split", "type": "video", "x": zoomX(), "y": zoomY()
})

const vsplitAudio = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "vsplit", "type": "audio", "x": zoomX(), "y": zoomY()
})

const vsplitFrame = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "vsplit", "type": "frame", "x": zoomX(), "y": zoomY()
})

const vsplitLink = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "vsplit", "type": "link", "x": zoomX(), "y": zoomY()
})

const vsplitImage = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "vsplit", "type": "img", "x": zoomX(), "y": zoomY()
})

const vsplitVideo = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "vsplit", "type": "video", "x": zoomX(), "y": zoomY()
})

const downloadAudio = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "download", "type": "audio", "x": zoomX(), "y": zoomY()
})

const downloadFrame = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "download", "type": "frame", "x": zoomX(), "y": zoomY()
})

const downloadLink = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "download", "type": "link", "x": zoomX(), "y": zoomY()
})

const downloadImage = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "download", "type": "img", "x": zoomX(), "y": zoomY()
})

const downloadVideo = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "download", "type": "video", "x": zoomX(), "y": zoomY()
})

const newtabAudio = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "newtab", "type": "audio", "x": zoomX(), "y": zoomY()
})

const newtabFrame = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "newtab", "type": "frame", "x": zoomX(), "y": zoomY()
})

const newtabLink = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "newtab", "type": "link", "x": zoomX(), "y": zoomY()
})

const newtabImage = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "newtab", "type": "img", "x": zoomX(), "y": zoomY()
})

const newtabVideo = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "newtab", "type": "video", "x": zoomX(), "y": zoomY()
})

const openAudio = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "open", "type": "audio", "x": zoomX(), "y": zoomY()
})

const openFrame = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "open", "type": "frame", "x": zoomX(), "y": zoomY()
})

const openLink = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "open", "type": "link", "x": zoomX(), "y": zoomY()
})

const openImage = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "open", "type": "img", "x": zoomX(), "y": zoomY()
})

const openVideo = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "open", "type": "video", "x": zoomX(), "y": zoomY()
})

const externalAudio = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "external", "type": "audio", "x": zoomX(), "y": zoomY()
})

const externalFrame = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "external", "type": "frame", "x": zoomX(), "y": zoomY()
})

const externalLink = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "external", "type": "link", "x": zoomX(), "y": zoomY()
})

const externalImage = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "external", "type": "img", "x": zoomX(), "y": zoomY()
})

const externalVideo = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "external", "type": "video", "x": zoomX(), "y": zoomY()
})

const copyAudio = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "copy", "type": "audio", "x": zoomX(), "y": zoomY()
})

const copyFrame = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "copy", "type": "frame", "x": zoomX(), "y": zoomY()
})

const copyLink = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "copy", "type": "link", "x": zoomX(), "y": zoomY()
})

const copyImageBuffer = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "copyimage", "type": "img", "x": zoomX(), "y": zoomY()
})

const copyImage = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "copy", "type": "img", "x": zoomX(), "y": zoomY()
})

const copyVideo = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "copy", "type": "video", "x": zoomX(), "y": zoomY()
})

const splitText = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "split", "type": "text", "x": zoomX(), "y": zoomY()
})

const vsplitText = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "vsplit", "type": "text", "x": zoomX(), "y": zoomY()
})

const downloadText = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "download", "type": "text", "x": zoomX(), "y": zoomY()
})

const newtabText = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "newtab", "type": "text", "x": zoomX(), "y": zoomY()
})

const openText = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "open", "type": "text", "x": zoomX(), "y": zoomY()
})

const externalText = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "external", "type": "text", "x": zoomX(), "y": zoomY()
})

const copyText = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "copy", "type": "text", "x": zoomX(), "y": zoomY()
})

const searchText = () => sendToPageOrSubFrame("contextmenu-data", {
    "action": "search", "type": "text", "x": zoomX(), "y": zoomY()
})

const toggleMediaPlay = () => sendToPageOrSubFrame(
    "action", "togglePause", X, Y)

const mediaDown = () => sendToPageOrSubFrame("action", "volumeDown", X, Y)

const mediaUp = () => sendToPageOrSubFrame("action", "volumeUp", X, Y)

const toggleMediaMute = () => sendToPageOrSubFrame("action", "toggleMute", X, Y)

const toggleMediaLoop = () => sendToPageOrSubFrame("action", "toggleLoop", X, Y)

const toggleMediaControls = () => sendToPageOrSubFrame(
    "action", "toggleControls", X, Y)

const inspectElement = () => {
    const {top, left} = offset()
    currentPage().inspectElement(Math.round(X + left), Math.round(Y + top))
}

const leftClick = () => {
    sendToPageOrSubFrame("send-input-event", {"type": "click", "x": X, "y": Y})
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
    sendToPageOrSubFrame("focus-input", {"x": X * factor, "y": Y * factor})
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
    sendToPageOrSubFrame("send-input-event",
        {"button": "right", "type": "click", "x": X, "y": Y})
    const {storePointerRightClick} = require("./contextmenu")
    storePointerRightClick()
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
    sendToPageOrSubFrame("send-input-event",
        {"deltaY": -100, "type": "scroll", "x": X, "y": Y})
    updateElement()
}

const scrollUp = () => {
    sendToPageOrSubFrame("send-input-event",
        {"deltaY": 100, "type": "scroll", "x": X, "y": Y})
    updateElement()
}

const scrollLeft = () => {
    sendToPageOrSubFrame("send-input-event",
        {"deltaX": 100, "type": "scroll", "x": X, "y": Y})
    updateElement()
}

const scrollRight = () => {
    sendToPageOrSubFrame("send-input-event",
        {"deltaX": -100, "type": "scroll", "x": X, "y": Y})
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
    init,
    insertAtPosition,
    inspectElement,
    leftClick,
    mediaDown,
    mediaUp,
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
    splitAudio,
    splitFrame,
    splitImage,
    splitLink,
    splitText,
    splitVideo,
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
    updateElement,
    vsplitAudio,
    vsplitFrame,
    vsplitImage,
    vsplitLink,
    vsplitText,
    vsplitVideo
}
