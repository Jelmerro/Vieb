/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2023 Jelmer van Arnhem
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
const {
    currentPage,
    currentMode,
    getSetting,
    getMouseConf,
    tabForPage,
    listRealPages
} = require("./common")
const {
    matchesQuery,
    sendToPageOrSubFrame,
    appData,
    joinPath,
    readJSON,
    writeJSON,
    urlToString,
    domainName,
    pageOffset
} = require("../util")

let X = 0
let Y = 0
let startX = 0
let startY = 0
let listenForScroll = false
let lastSelection = {"endX": 0, "endY": 0, "startX": 0, "startY": 0}
/** @type {typeof lastSelection|null} */
let mouseSelection = null
let skipNextClick = false

const init = () => {
    const {setMode} = require("./modes")
    ipcRenderer.on("mouse-down-location", (_, clickInfo) => {
        if ("ces".includes(currentMode()[0]) && getMouseConf("leaveinput")) {
            setMode("normal")
        }
        if (clickInfo.webviewId) {
            if (clickInfo.webviewId !== currentPage()?.getWebContentsId()) {
                const page = listRealPages().find(
                    p => p.getWebContentsId() === clickInfo.webviewId)
                if (page) {
                    const tab = tabForPage(page)
                    if (tab) {
                        const {switchToTab} = require("./tabs")
                        switchToTab(tab)
                    }
                }
            }
        }
        const {clear} = require("./contextmenu")
        clear()
        if (["pointer", "visual"].includes(currentMode())) {
            if (currentMode() === "pointer") {
                sendToPageOrSubFrame("action",
                    "selectionRemove", zoomX(), zoomY())
            }
            if (getMouseConf("movepointer")) {
                const factor = currentPage()?.getZoomFactor() ?? 1
                move(clickInfo.x * factor, clickInfo.y * factor)
            } else {
                updateElement()
            }
        }
        const {setFocusCorrectly} = require("./actions")
        setFocusCorrectly()
    })
    ipcRenderer.on("mouse-click-info", (_, clickInfo) => {
        if (skipNextClick) {
            skipNextClick = false
            return
        }
        if (["pointer", "visual"].includes(currentMode())) {
            updateElement()
            return
        }
        if (clickInfo.toinsert) {
            if (getMouseConf("toinsert")) {
                setMode("insert")
            }
        } else if ("ces".includes(currentMode()[0])) {
            if (getMouseConf("leaveinput")) {
                setMode("normal")
            }
        }
        const {setFocusCorrectly} = require("./actions")
        setFocusCorrectly()
        storeMouseSelection(null)
    })
    ipcRenderer.on("mouse-selection", (_, selectInfo) => {
        if (process.platform === "linux" || process.platform.includes("bsd")) {
            const {clipboard} = require("electron")
            clipboard.writeText(selectInfo.text, "selection")
        }
        if (selectInfo.toinsert) {
            if (getMouseConf("toinsert")) {
                setMode("insert")
            }
            return
        }
        const switchToVisual = getSetting("mousevisualmode")
        if (switchToVisual !== "never" || currentMode() === "visual") {
            skipNextClick = true
            const factor = currentPage()?.getZoomFactor() ?? 1
            storeMouseSelection({
                "endX": selectInfo.endX * factor,
                "endY": selectInfo.endY * factor,
                "startX": selectInfo.startX * factor,
                "startY": selectInfo.startY * factor
            })
            if (switchToVisual === "activate") {
                startVisualSelect()
            }
        }
    })
}
const zoomX = () => Math.round(X / (currentPage()?.getZoomFactor() ?? 1))

const zoomY = () => Math.round(Y / (currentPage()?.getZoomFactor() ?? 1))

/**
 * Move the pointer.
 * @param {number} x
 * @param {number} y
 */
const move = (x, y) => {
    X = x
    Y = y
    updateElement()
}

/**
 * Handle a difference in scroll height.
 * @param {number} diff
 */
const handleScrollDiffEvent = diff => {
    startY += diff
    if (listenForScroll) {
        Y += diff
        updateElement()
        listenForScroll = false
    }
}

const updateElement = () => {
    const pointerEl = document.getElementById("pointer")
    const page = currentPage()
    if (!pointerEl || !page) {
        return
    }
    const {top, left, bottom, right} = pageOffset(page)
    X = Math.max(0, Math.min(X, right - left - getSetting("guifontsize") * 1.4))
    Y = Math.max(0, Math.min(Y, bottom - top - getSetting("guifontsize")))
    pointerEl.style.left = `${X + left}px`
    pointerEl.style.top = `${Y + top}px`
    currentPage()?.setAttribute("pointer-x", `${X}`)
    currentPage()?.setAttribute("pointer-y", `${Y}`)
    if (currentMode() === "pointer") {
        sendToPageOrSubFrame("send-input-event",
            {"type": "hover", "x": X, "y": Y})
    }
    if (currentMode() === "visual") {
        lastSelection = {"endX": X, "endY": Y, startX, startY}
        const factor = currentPage()?.getZoomFactor() ?? 1
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

/**
 * Store the latest mouse selection.
 * @param {typeof lastSelection|null} selection
 */
const storeMouseSelection = selection => {
    mouseSelection = selection
}

// ACTIONS

/**
 * Start pointer mode.
 * @param {{x?: number, y?: number} | null} args
 */
const start = (args = null) => {
    X = args?.x || Number(currentPage()?.getAttribute("pointer-x")) || X
    Y = args?.y || Number(currentPage()?.getAttribute("pointer-y")) || Y
    const {setMode} = require("./modes")
    setMode("pointer")
    sendToPageOrSubFrame("send-input-event", {"type": "hover", "x": X, "y": Y})
    updateElement()
}

const moveToMouse = () => {
    const mousePos = ipcRenderer.sendSync("mouse-location")
    if (mousePos) {
        [...document.elementsFromPoint(mousePos.x, mousePos.y)].forEach(el => {
            if (el instanceof HTMLElement
                && matchesQuery(el, "webview[link-id]")) {
                if (el !== currentPage() || currentMode() !== "visual") {
                    const {switchToTab} = require("./tabs")
                    // @ts-expect-error el is checked to be a webview above
                    switchToTab(tabForPage(el))
                }
                const pagePos = pageOffset(el)
                if (currentMode() === "visual") {
                    X = mousePos.x - pagePos.left
                    Y = mousePos.y - pagePos.top
                    updateElement()
                } else {
                    start({
                        "x": mousePos.x - pagePos.left,
                        "y": mousePos.y - pagePos.top
                    })
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
    const page = currentPage()
    if (page) {
        const {top, left} = pageOffset(page)
        page.inspectElement(Math.round(X + left), Math.round(Y + top))
    }
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
    const factor = currentPage()?.getZoomFactor() ?? 1
    sendToPageOrSubFrame("focus-input", {"x": X * factor, "y": Y * factor})
}

const moveDown = () => {
    const page = currentPage()
    if (!page) {
        return
    }
    const {bottom, top} = pageOffset(page)
    if (Y === bottom - top - getSetting("guifontsize")) {
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

const openMenu = () => {
    sendToPageOrSubFrame("contextmenu-data",
        {"force": true, "x": zoomX(), "y": zoomY()})
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
    const page = currentPage()
    if (!page) {
        return
    }
    const {top, bottom} = pageOffset(page)
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
    const page = currentPage()
    if (!page) {
        return
    }
    const {bottom, top} = pageOffset(page)
    if (Y === bottom - top - getSetting("guifontsize")) {
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

/**
 * Store a pointer position.
 * @param {{key?: string, location?: {x: number, y: number}, path: string}} args
 */
const storePos = args => {
    const key = args?.key
    if (!key) {
        return
    }
    let posType = getSetting("pointerpostype")
    if (posType !== "local" && posType !== "global") {
        posType = "global"
        if (key !== key.toUpperCase()) {
            posType = "local"
        }
    }
    const qm = readJSON(joinPath(appData(), "quickmarks")) ?? {}
    if (!qm.pointer) {
        qm.pointer = {"global": {}, "local": {}}
    }
    if (args?.path === "global") {
        posType = "global"
    }
    if (posType === "local") {
        let path = ""
        const pointerPosId = getSetting("pointerposlocalid")
        if (pointerPosId === "domain") {
            path = domainName(urlToString(currentPage()?.src ?? ""))
                || domainName(currentPage()?.src ?? "") || ""
        }
        if (pointerPosId === "url" || !path) {
            path = urlToString(currentPage()?.src ?? "")
                || currentPage()?.src || ""
        }
        path = args?.path ?? path
        if (!qm.pointer.local[path]) {
            qm.pointer.local[path] = {}
        }
        qm.pointer.local[path][key] = args?.location
            ?? {"x": Math.round(X), "y": Math.round(Y)}
    } else {
        qm.pointer.global[key] = args?.location
            ?? {"x": Math.round(X), "y": Math.round(Y)}
    }
    writeJSON(joinPath(appData(), "quickmarks"), qm)
}

/**
 * Restore a pointer position.
 * @param {{key?: string, path?: string}} args
 */
const restorePos = args => {
    const key = args?.key
    if (!key) {
        return
    }

    const pointerPosId = getSetting("pointerposlocalid")
    let path = ""
    if (pointerPosId === "domain") {
        path = domainName(urlToString(currentPage()?.src ?? ""))
            || domainName(currentPage()?.src ?? "") || ""
    }
    if (pointerPosId === "url" || !path) {
        path = urlToString(currentPage()?.src ?? "") || currentPage()?.src || ""
    }
    path = args?.path ?? path
    const qm = readJSON(joinPath(appData(), "quickmarks"))
    const pos = qm?.pointer?.local?.[path]?.[key] ?? qm?.pointer?.global?.[key]
    if (pos) {
        move(pos.x, pos.y)
    }
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
    openMenu,
    openText,
    openVideo,
    releaseKeys,
    restorePos,
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
    storePos,
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
