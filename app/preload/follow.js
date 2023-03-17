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
    matchesQuery,
    findElementAtPosition,
    querySelectorAll,
    propPixels,
    findFrameInfo,
    findClickPosition,
    framePosition,
    activeElement,
    readJSON,
    joinPath,
    appData
} = require("../util")
const settingsFile = joinPath(appData(), "webviewsettings")

let currentFollowStatus = null
const clickInputs = [
    "button",
    "input[type=\"button\"]",
    "input[type=\"radio\"]",
    "input[type=\"checkbox\"]",
    "label[for]:not([for=\"\"])",
    "input[type=\"submit\"]",
    "input[type=\"file\"]",
    "input[type=\"image\"]",
    "input[type=\"reset\"]",
    "*[role=\"button\"]",
    "*[role=\"radio\"]",
    "*[role=\"checkbox\"]",
    "summary"
].join(",")
const textlikeInputs = [
    "input:not([type=\"radio\"]):not([type=\"checkbox\"])"
    + ":not([type=\"submit\"]):not([type=\"button\"])"
    + ":not([type=\"file\"]):not([type=\"image\"]):not([type=\"reset\"])",
    "[role=\"textbox\"]",
    "[contenteditable=\"true\"]",
    "[contenteditable=\"\"]",
    "textarea",
    "select"
].join(",")
const clickEvents = ["click", "mousedown", "mouseup"]
const otherEvents = [
    "mouseenter",
    "mouseleave",
    "mousemove",
    "mouseout",
    "mouseover",
    "contextmenu"
]
const previouslyFocussedElements = []

ipcRenderer.on("focus-input", async(_, follow = null) => {
    let el = null
    if (follow) {
        el = findElementAtPosition(follow.x, follow.y)
    } else {
        const allLinks = await getAllFollowLinks(["input"])
        const input = allLinks.find(l => l.type === "inputs-insert")
        if (input) {
            el = findElementAtPosition(
                input.x + input.width / 2, input.y + input.height / 2)
        }
    }
    const focusEl = [el, el?.parentNode, el?.parentNode?.parentNode]
        .find(e => e?.click && e?.focus)
    if (!focusEl) {
        return
    }
    ipcRenderer.sendToHost("switch-to-insert")
    await new Promise(r => {
        setTimeout(r, 3)
    })
    const inputfocusalignment = readJSON(settingsFile)?.inputfocusalignment
        || "rememberend"
    focusEl.click()
    focusEl.focus()
    const focusLength = focusEl.value?.length || focusEl.textContent.length
    if (focusLength > 0 && focusEl.setSelectionRange) {
        if (!previouslyFocussedElements.includes(focusEl)
            || inputfocusalignment.includes("always")) {
            if (inputfocusalignment.includes("end")) {
                focusEl.setSelectionRange(focusLength, focusLength)
            } else {
                focusEl.setSelectionRange(0, 0)
            }
            previouslyFocussedElements.push(focusEl)
        }
    }
})

const getAllFollowLinks = (filter = null) => {
    const allEls = [...querySelectorAll("*")]
    const relevantLinks = []
    if (!filter || filter.includes("url")) {
        // A tags with href as the link, can be opened in new tab or current tab
        allEls.filter(el => matchesQuery(el, "a")).forEach(
            el => relevantLinks.push({el, "type": "url"}))
    }
    if (!filter || filter.find(f => f.startsWith("input"))) {
        // Input tags such as checkboxes, can be clicked but have no text input
        const inputs = allEls.filter(el => matchesQuery(el, clickInputs))
        inputs.push(...allEls.filter(el => matchesQuery(el, "input")).map(
            e => e.closest("label")).filter(e => e && !inputs.includes(e)))
        inputs.forEach(el => {
            let type = "inputs-click"
            if (el.tagName.toLowerCase() === "label") {
                const labelFor = el.getAttribute("for")
                if (labelFor) {
                    try {
                        const forEl = el.closest(`#${labelFor}`)
                        if (matchesQuery(forEl, textlikeInputs)) {
                            type = "inputs-insert"
                        }
                    } catch {
                        // Invalid label, not a valid selector, assuming click
                    }
                } else if (el.querySelector(textlikeInputs)) {
                    type = "inputs-insert"
                }
            }
            relevantLinks.push({el, type})
        })
        // Input tags such as email and text, can have text inserted
        allEls.filter(el => matchesQuery(el, textlikeInputs)).forEach(
            el => relevantLinks.push({el, "type": "inputs-insert"}))
    }
    if (!filter || filter.includes("onclick")) {
        // Elements with some kind of mouse interaction, grouped by click/other
        allEls.filter(el => clickEvents.find(
            e => el[`on${e}`] || eventListeners[e].has(el))
            || el.getAttribute("jsaction")).forEach(
            el => relevantLinks.push({el, "type": "onclick"}))
        allEls.filter(el => otherEvents.find(e => el[`on${e}`]
            || eventListeners[e].has(el)))
            .forEach(el => relevantLinks.push({el, "type": "other"}))
    }
    if (!filter || filter.includes("media")) {
        // Get media elements, such as videos or music players
        allEls.filter(el => matchesQuery(el, "video,audio"))
            .forEach(el => relevantLinks.push({el, "type": "media"}))
    }
    if (!filter || filter.includes("image")) {
        // Get any images or background images
        allEls.filter(el => matchesQuery(el, "img.svg"))
            .forEach(el => relevantLinks.push({el, "type": "image"}))
        allEls.filter(el => getComputedStyle(el).backgroundImage !== "none")
            .forEach(el => relevantLinks.push({el, "type": "image"}))
    }
    return new Promise(res => {
        const observer = new IntersectionObserver(entries => {
            const parsedEls = relevantLinks.map(link => {
                const entry = entries.find(e => e.target === link.el)
                if (entry) {
                    link.bounds = entry.boundingClientRect
                    link.visible = entry.intersectionRatio > 0.01
                }
                return link
            }).filter(link => link.visible)
                .map(link => parseElement(link.el, link.type, link.bounds))
                .filter(el => el)
            res(parsedEls.sort((el1, el2) => {
                if (el1.type === "other") {
                    return 10000
                }
                return Math.floor(el1.y) - Math.floor(el2.y) || el1.x - el2.x
            }))
            observer.disconnect()
        })
        let observingSomething = false
        relevantLinks.forEach(link => {
            try {
                observer.observe(link.el)
                observingSomething = true
            } catch (e) {
                console.warn(e)
            }
        })
        if (!observingSomething) {
            res([])
        }
    })
}

const mainInfoLoop = () => {
    // Listeners for iframes that run on the same host and same process
    const frames = [...querySelectorAll("iframe")]
    frames.forEach(f => {
        try {
            f.contentDocument.onclick = e => clickListener(e, f)
            f.contentDocument.oncontextmenu = e => contextListener(e, f)
            f.contentDocument.onmousedown = e => mouseDownListener(e, f)
            f.contentDocument.onmouseup = e => mouseUpListener(e, f)
        } catch {
            // Not an issue, will be retried shortly, we also can't do much else
        }
    })
    // Send details to main for iframes that run in a separate process
    if (!document.body) {
        return
    }
    ipcRenderer.send("frame-details", {
        "height": window.innerHeight,
        "pagex": window.scrollX,
        "pagey": window.scrollY,
        "scrollHeight": document.body.scrollHeight,
        "scrollWidth": document.body.scrollWidth,
        "subframes": frames.map(f => {
            const bounds = f.getBoundingClientRect()
            const framePos = framePosition(f)
            return {
                "bounds": JSON.stringify(bounds),
                "height": bounds.height || f.clientHeight,
                "url": f.src,
                "width": bounds.width || f.clientWidth,
                "x": framePos.x,
                "y": framePos.y
            }
        }),
        "url": window.location.href,
        "width": window.innerWidth
    })
}

const followLoop = async() => {
    if (currentFollowStatus) {
        const links = await getAllFollowLinks(currentFollowStatus.split(","))
        ipcRenderer.send("follow-response", links)
        setTimeout(() => followLoop(), 100)
    }
}

ipcRenderer.on("follow-mode-start", (_, newFollowFilter) => {
    if (currentFollowStatus !== newFollowFilter) {
        currentFollowStatus = newFollowFilter
        followLoop()
    }
})

ipcRenderer.on("follow-mode-stop", () => {
    currentFollowStatus = null
})

setInterval(mainInfoLoop, 1000)
window.addEventListener("DOMContentLoaded", mainInfoLoop)
window.addEventListener("resize", mainInfoLoop)

const parseElement = (element, type, customBounds = false) => {
    const excluded = [document.body, document.documentElement]
    if (excluded.includes(element)) {
        return null
    }
    const boundingBox = JSON.parse(JSON.stringify(
        customBounds || element.getBoundingClientRect()))
    const paddingInfo = findFrameInfo(element)
    if (paddingInfo) {
        boundingBox.left += paddingInfo.x
        boundingBox.top += paddingInfo.y
    }
    // Find a clickable area and position for the given element and bounds
    const subImages = [...element.querySelectorAll("img,svg")]
    const rects = [
        boundingBox, ...subImages.map(img => img.getBoundingClientRect())
    ]
    const {dims, clickable} = findClickPosition(element, rects)
    if (!clickable) {
        return null
    }
    // The element should be clickable and is returned in a parsed format
    let href = String(element.href || "")
    let typeOverride = false
    if (type === "url") {
        // Set links to the current page as type 'other'
        if (!element.href) {
            typeOverride = "other"
        } else if (element.href === window.location.href) {
            typeOverride = "other"
        } else if (element.href === `${window.location.href}#`) {
            typeOverride = "other"
        } else if (element.href?.startsWith?.("javascript:")) {
            typeOverride = "other"
        }
        // Empty the href for links that require a specific data method to open
        // These will use clicks instead of direct navigation to work correctly
        const dataMethod = element.getAttribute("data-method")?.toLowerCase()
        if (dataMethod && dataMethod !== "get") {
            href = ""
        }
    }
    return {
        "height": dims.height,
        "text": element.textContent?.slice(0, 10000) || "",
        "type": typeOverride || type,
        "url": href,
        "width": dims.width,
        "x": dims.x,
        "y": dims.y
    }
}

const eventListeners = {}
;[...clickEvents, ...otherEvents].forEach(e => {
    eventListeners[e] = new WeakSet()
})

const realAdd = EventTarget.prototype.addEventListener
EventTarget.prototype.addEventListener = function(type, listener, options) {
    try {
        realAdd.apply(this, [type, listener, options])
        eventListeners[type]?.add(this)
    } catch {
        // This is a bug in the underlying website
    }
}
const realRemove = EventTarget.prototype.removeEventListener
EventTarget.prototype.removeEventListener = function(type, listener, options) {
    try {
        realRemove.apply(this, [type, listener, options])
        eventListeners[type]?.delete(this)
    } catch {
        // This is a bug in the underlying website
    }
}

const clickListener = (e, frame = null) => {
    if (e.isTrusted) {
        const paddingInfo = findFrameInfo(frame)
        const inputEl = e.composedPath().find(
            el => matchesQuery(el, textlikeInputs))
        const focusEl = [
            inputEl, inputEl?.parentNode, inputEl?.parentNode?.parentNode
        ].find(el => el?.click && el?.focus)
        if (focusEl) {
            previouslyFocussedElements.push(focusEl)
        }
        ipcRenderer.send("mouse-click-info", {
            "toinsert": !!inputEl,
            "x": e.x + (paddingInfo?.x || 0),
            "y": e.y + (paddingInfo?.y || 0)
        })
    }
}
window.addEventListener("click", clickListener,
    {"capture": true, "passive": true})

let startX = 0
let startY = 0
const mouseDownListener = (e, frame = null) => {
    if (e.button === 3) {
        ipcRenderer.sendToHost("back-button")
        e.preventDefault()
        return
    }
    if (e.button === 4) {
        ipcRenderer.sendToHost("forward-button")
        e.preventDefault()
        return
    }
    if (e.composedPath().find(el => matchesQuery(el, "select, option"))) {
        clickListener(e, frame)
    }
    const paddingInfo = findFrameInfo(frame)
    startX = e.clientX + (paddingInfo?.x || 0)
    startY = e.clientY + (paddingInfo?.y || 0)
    ipcRenderer.send("mouse-down-location", {
        "x": e.x + (paddingInfo?.x || 0), "y": e.y + (paddingInfo?.y || 0)
    })
}
window.addEventListener("mousedown", mouseDownListener,
    {"capture": true, "passive": true})
const mouseUpListener = (e, frame = null) => {
    const paddingInfo = findFrameInfo(frame)
    const endX = e.clientX + (paddingInfo?.x || 0)
    const endY = e.clientY + (paddingInfo?.y || 0)
    const diffX = Math.abs(endX - startX)
    const diffY = Math.abs(endY - startY)
    ipcRenderer.sendToHost("mouse-up")
    if (endX > 0 && endY > 0 && (diffX > 3 || diffY > 3)) {
        const text = (frame?.contentWindow || window).getSelection().toString()
        if (text) {
            ipcRenderer.send("mouse-selection", {
                endX,
                endY,
                startX,
                startY,
                text,
                "toinsert": !!e.composedPath().find(
                    el => matchesQuery(el, textlikeInputs))
            })
        }
    }
}
window.addEventListener("mouseup", mouseUpListener,
    {"capture": true, "passive": true})

ipcRenderer.on("replace-input-field", (_, value, position) => {
    const input = activeElement()
    if (matchesQuery(input, textlikeInputs)) {
        if (typeof input.value === "string" && input.setSelectionRange) {
            input.value = value
            if (position < input.value.length) {
                input.setSelectionRange(position, position)
            }
        } else {
            const select = input.getRootNode().getSelection()
            select.baseNode.textContent = value
            const range = document.createRange()
            range.setStart(select.baseNode, position)
            range.setEnd(select.baseNode, position)
            select.removeAllRanges()
            select.addRange(range)
        }
    }
})

const getSvgData = el => `data:image/svg+xml,${encodeURIComponent(el.outerHTML)
    .replace(/'/g, "%27").replace(/"/g, "%22")}`

const contextListener = (e, frame = null, extraData = null) => {
    if (e.isTrusted && !currentFollowStatus && e.button === 2) {
        e.preventDefault?.()
        const paddingInfo = findFrameInfo(frame)
        const img = e.composedPath().find(el => ["svg", "img"]
            .includes(el.tagName?.toLowerCase()))
        const backgroundImg = e.composedPath().map(el => {
            try {
                const styling = getComputedStyle(el).backgroundImage
                const url = styling.match(/url\(.*?\)/g)?.[0]
                if (url) {
                    return url?.slice(5, -2)
                }
            } catch {
                // Window and top-level nodes don't support getComputedStyle
            }
            return null
        }).find(url => url)
        const videoEl = e.composedPath().find(
            el => el.tagName?.toLowerCase() === "video")
        const video = [
            videoEl,
            videoEl?.querySelector("source[type^=video]")
        ].find(el => el?.src.trim())
        const audioEl = e.composedPath().find(
            el => el.tagName?.toLowerCase() === "audio")
        const audio = [
            audioEl,
            audioEl?.querySelector("source[type^=audio]"),
            videoEl?.querySelector("source[type^=audio]")
        ].find(el => el?.src.trim())
        const link = e.composedPath().find(
            el => el.tagName?.toLowerCase() === "a" && el.href?.trim())
        const text = e.composedPath().find(
            el => matchesQuery(el, textlikeInputs))
        ipcRenderer.send("context-click-info", {
            "audio": audio?.src?.trim(),
            "audioData": {
                "controllable": !!audioEl,
                "loop": ["", "loop", "true"].includes(
                    audioEl?.getAttribute("loop")),
                "muted": audioEl?.volume === 0,
                "paused": audioEl?.paused
            },
            backgroundImg,
            "canEdit": !!text,
            extraData,
            "frame": e.composedPath().find(
                el => matchesQuery(el, "iframe"))?.src || frame?.src,
            "hasElementListener": eventListeners.contextmenu.has(
                e.composedPath()[0]),
            "hasGlobalListener": !!e.composedPath().find(
                el => eventListeners.contextmenu.has(el)),
            "img": img?.src?.trim(),
            "inputSel": text?.selectionStart
                || text?.getRootNode().getSelection()?.baseOffset,
            "inputVal": text?.selectionStart && text?.value
                || text?.getRootNode().getSelection()?.baseNode?.textContent,
            "link": link?.href?.trim(),
            "svgData": img && getSvgData(img),
            "text": (frame?.contentWindow || window).getSelection().toString(),
            "video": video?.src?.trim(),
            "videoData": {
                "controllable": !!videoEl,
                "controls": ["", "controls", "true"].includes(
                    videoEl?.getAttribute("controls")),
                "loop": ["", "loop", "true"].includes(
                    videoEl?.getAttribute("loop")),
                "muted": videoEl?.volume === 0,
                "paused": videoEl?.paused
            },
            "x": e.x + (paddingInfo?.x || 0),
            "y": e.y + (paddingInfo?.y || 0)
        })
    }
}
ipcRenderer.on("contextmenu-data", (_, request) => {
    const {x, y} = request
    const els = [findElementAtPosition(x, y)]
    while (els[0].parentNode && els[0].parentNode !== els[1]?.parentNode) {
        els.unshift(els[0].parentNode)
    }
    els.reverse()
    contextListener({
        "button": 2, "composedPath": () => els, "isTrusted": true, x, y
    }, findFrameInfo(els[0])?.element, request)
})
ipcRenderer.on("contextmenu", (_, extraData = null) => {
    const els = [activeElement()]
    const parsed = parseElement(els[0])
    if (!parsed || ["iframe", "body"].includes(els[0].tagName.toLowerCase())) {
        return
    }
    let {x} = parsed
    if (getComputedStyle(els[0]).font.includes("monospace")) {
        x = parsed.x + propPixels(els[0], "fontSize")
            * els[0].selectionStart * 0.60191 - els[0].scrollLeft
    }
    let y = parsed.y + parsed.height
    if (x > window.innerWidth || isNaN(x) || x === 0) {
        ({x} = parsed)
    }
    if (y > window.innerHeight) {
        ({y} = parsed)
    }
    while (els[0].parentNode && els[0].parentNode !== els[1]?.parentNode) {
        els.unshift(els[0].parentNode)
    }
    els.reverse()
    contextListener({
        "button": 2, "composedPath": () => els, "isTrusted": true, x, y
    }, findFrameInfo(els[0])?.element, extraData)
})
window.addEventListener("contextmenu", contextListener)
ipcRenderer.on("keyboard-type-event", (_, keyOptions) => {
    // This is a last resort attempt to press a key in an iframe,
    // but ideally this code shouldn't exist and only use sendInputEvent.
    // See https://github.com/electron/electron/issues/20333
    const input = activeElement()
    if (matchesQuery(input, textlikeInputs) && keyOptions.key.length === 1) {
        if (typeof input.value === "string" && input.setSelectionRange) {
            const cur = Number(input.selectionStart)
            input.value = `${input.value.substr(0, cur)}${keyOptions.key}${
                input.value.substr(input.selectionEnd)}`
            input.setSelectionRange(cur + 1, cur + 1)
        }
    }
})
const isVertScrollable = el => {
    const scrollEl = document.scrollingElement
    if ([scrollEl, scrollEl.parentElement].includes(el)) {
        return el.scrollHeight > el.clientHeight
    }
    return el.scrollHeight > el.clientHeight
        && ["scroll", "auto"].includes(getComputedStyle(el).overflowY)
}
const isHorScrollable = el => {
    const scrollEl = document.scrollingElement
    if ([scrollEl, scrollEl.parentElement].includes(el)) {
        return el.scrollWidth > el.clientWidth
    }
    return el.scrollWidth > el.clientWidth
        && ["scroll", "auto"].includes(getComputedStyle(el).overflowX)
}
ipcRenderer.on("custom-mouse-event", (_, eventType, mouseOptions) => {
    // This is a last resort attempt to press a mouse event in an iframe,
    // but ideally this code shouldn't exist and only use sendInputEvent.
    // See https://github.com/electron/electron/issues/20333
    // The code below is also fairly useless when it comes to hovering elements.
    const el = findElementAtPosition(mouseOptions.x, mouseOptions.y)
    if (eventType === "click") {
        if (mouseOptions.button === "left") {
            el.click()
            return
        }
        const {x, y} = mouseOptions
        const els = [findElementAtPosition(x, y)]
        while (els[0].parentNode && els[0].parentNode !== els[1]?.parentNode) {
            els.unshift(els[0].parentNode)
        }
        els.reverse()
        contextListener({
            "button": 2, "composedPath": () => els, "isTrusted": true, x, y
        }, findFrameInfo(els[0])?.element)
        return
    }
    if (eventType === "mousewheel") {
        let sc = el
        while (sc) {
            if (mouseOptions.deltaY && isVertScrollable(sc)) {
                sc.scrollTop -= mouseOptions.deltaY
                break
            }
            if (mouseOptions.deltaX && isHorScrollable(sc)) {
                sc.scrollLeft -= mouseOptions.deltaX
                break
            }
            sc = sc.parentNode
        }
    }
    const event = new MouseEvent(eventType, {
        ...mouseOptions,
        "bubbles": true,
        "cancelable": true,
        "isTrusted": true,
        "type": eventType,
        "view": window
    })
    el.dispatchEvent(event)
})

let scrollHeight = 0
let justScrolled = 0
let justSearched = false
let searchPos = {}

window.addEventListener("scroll", () => {
    const scrollDiff = scrollHeight - window.scrollY
    startY += scrollDiff
    scrollHeight = window.scrollY
    justScrolled = Number(scrollDiff)
    setTimeout(() => {
        justScrolled = 0
    }, 100)
    if (justSearched) {
        const {x} = searchPos
        const y = searchPos.y + scrollDiff * window.devicePixelRatio
        ipcRenderer.sendToHost("search-element-location", x, y)
    }
    ipcRenderer.sendToHost("scroll-height-diff", scrollDiff)
})

ipcRenderer.on("search-element-location", (_, pos) => {
    let {x} = pos
    const alignment = readJSON(settingsFile)?.searchpointeralignment
    if (alignment === "center") {
        x += pos.width / 2
    } else if (alignment === "right") {
        x += pos.width - 1
    } else {
        x += 1
    }
    const y = pos.y + pos.height / 2 + justScrolled * window.devicePixelRatio
    searchPos = {x, y}
    ipcRenderer.sendToHost("search-element-location", x, y)
    justSearched = true
    setTimeout(() => {
        justSearched = false
    }, 100)
})

window.addEventListener("mousemove", e => {
    ipcRenderer.sendToHost("mousemove", e.clientX, e.clientY)
})
