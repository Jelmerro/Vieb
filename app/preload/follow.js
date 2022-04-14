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

let inFollowMode = false
const clickableInputs = [
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
    "contextmenu",
    "auxclick"
]
const previouslyFocussedElements = []

ipcRenderer.on("focus-input", async(_, follow = null) => {
    let el = null
    if (follow) {
        el = findElementAtPosition(follow.x, follow.y)
    } else {
        const input = getAllFollowLinks().find(l => l.type === "inputs-insert")
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

const getLinkFollows = allLinks => {
    // A tags with href as the link, can be opened in new tab or current tab
    querySelectorAll("a").forEach(e => {
        const baseLink = parseElement(e, "url")
        if (baseLink) {
            allLinks.push(baseLink)
        } else {
            // Try sub-elements instead, for example if the link is not
            // visible or `display: none`, but a sub-element is absolutely
            // positioned somewhere else.
            allLinks.push(...Array.from(e?.querySelectorAll("*") || [])
                .map(c => parseElement(c, "url")).filter(l => l))
        }
    })
}

const getInputFollows = allLinks => {
    // Input tags such as checkboxes, can be clicked but have no text input
    const inputs = [...querySelectorAll(clickableInputs)]
    inputs.push(...[...querySelectorAll("input")].map(
        e => e.closest("label")).filter(e => e && !inputs.includes(e)))
    inputs.forEach(element => {
        let type = "inputs-click"
        if (element.tagName.toLowerCase() === "label") {
            const labelFor = element.getAttribute("for")
            if (labelFor) {
                try {
                    const forEl = element.closest(`#${labelFor}`)
                    if (matchesQuery(forEl, textlikeInputs)) {
                        type = "inputs-insert"
                    }
                } catch {
                    // Invalid label, not a valid selector, assuming click input
                }
            } else if (element.querySelector(textlikeInputs)) {
                type = "inputs-insert"
            }
        }
        const clickable = parseElement(element, type)
        if (clickable) {
            allLinks.push(clickable)
        }
    })
    // Input tags such as email and text, can have text inserted
    allLinks.push(
        ...allElementsBySelector("inputs-insert", textlikeInputs))
}

const getOtherFollows = allLinks => {
    // Elements with some kind of mouse interaction, grouped by click and other
    const addElementToList = (element, type) => {
        const clickable = parseElement(element, type)
        if (clickable) {
            allLinks.push(clickable)
        }
    }
    const allElements = [...querySelectorAll("*")]
    allElements.filter(
        el => clickEvents.find(e => el[`on${e}`] || eventListeners[e].has(el))
        || el.getAttribute("jsaction")).forEach(
        element => addElementToList(element, "onclick"))
    allElements.filter(el => otherEvents.find(e => el[`on${e}`]
            || eventListeners[e].has(el)))
        .forEach(element => addElementToList(element, "other"))
    // Get media elements, including images
    allLinks.push(...allElementsBySelector("media", "video,audio"))
    allLinks.push(...allElementsBySelector("image", "img,svg"))
    allElements.filter(el => getComputedStyle(el).backgroundImage !== "none")
        .forEach(element => addElementToList(element, "image"))
}

const getAllFollowLinks = () => {
    const allLinks = []
    getLinkFollows(allLinks)
    getInputFollows(allLinks)
    getOtherFollows(allLinks)
    // Ordered by the position on the page from the top
    // Uncategorised mouse events are less relevant and are moved to the end
    return allLinks.sort((el1, el2) => {
        if (el1.type === "other") {
            return 10000
        }
        return Math.floor(el1.y) - Math.floor(el2.y) || el1.x - el2.x
    })
}

const mainInfoLoop = () => {
    if (inFollowMode) {
        ipcRenderer.send("follow-response", getAllFollowLinks())
    }
    // Listeners for iframes that run on the same host and same process
    [...querySelectorAll("iframe")].forEach(f => {
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
    ipcRenderer.send("frame-details", {
        "height": window.innerHeight,
        "pagex": window.scrollX,
        "pagey": window.scrollY,
        "scrollHeight": document.body.scrollHeight,
        "scrollWidth": document.body.scrollWidth,
        "subframes": [...querySelectorAll("iframe") || []].map(f => ({
            "bounds": JSON.stringify(f.getBoundingClientRect()),
            "height": f.getBoundingClientRect().height || f.clientHeight,
            "url": f.src,
            "width": f.getBoundingClientRect().width || f.clientWidth,
            "x": framePosition(f).x,
            "y": framePosition(f).y
        })),
        "url": window.location.href,
        "width": window.innerWidth
    })
}

ipcRenderer.on("follow-mode-start", () => {
    if (!inFollowMode) {
        inFollowMode = true
        mainInfoLoop()
    }
})

ipcRenderer.on("follow-mode-stop", () => {
    inFollowMode = false
})

// Send the page once every second in case of transitions or animations
// Could be done with an observer, but that drastically slows down on big pages
setInterval(mainInfoLoop, 1000)
window.addEventListener("DOMContentLoaded", mainInfoLoop)
window.addEventListener("resize", mainInfoLoop)

const pseudoElementRects = element => {
    const base = element.getBoundingClientRect()
    const rects = []
    for (const pseudoType of ["before", "after"]) {
        const pseudo = getComputedStyle(element, `::${pseudoType}`)
        const width = propPixels(pseudo, "width")
        const height = propPixels(pseudo, "height")
        if (height && width) {
            const pseudoDims = JSON.parse(JSON.stringify(base))
            const top = propPixels(pseudo, "top")
            const left = propPixels(pseudo, "left")
            const marginTop = propPixels(pseudo, "marginTop")
            const marginLeft = propPixels(pseudo, "marginLeft")
            pseudoDims.width = width
            pseudoDims.height = height
            pseudoDims.x += left + marginLeft
            pseudoDims.y += top + marginTop
            rects.push(pseudoDims)
        }
    }
    return rects
}

const rectOutsideWindow = r => r.bottom < 0 || r.top > window.innerHeight
    || r.right < 0 || r.left > window.innerWidth

const parseElement = (element, type) => {
    // The body shouldn't be considered clickable on it's own,
    // Even if listeners are added to it.
    // Also checks if the element actually has rects.
    const excluded = [document.body, document.documentElement]
    if (!element.getClientRects || excluded.includes(element)) {
        return null
    }
    // First (quickly) check that element is visible at all
    const boundingRect = element.getBoundingClientRect()
    if (rectOutsideWindow(boundingRect)) {
        return null
    }
    if (getComputedStyle(element).visibility === "hidden") {
        return null
    }
    // Make a list of all possible bounding rects for the element
    let rects = [boundingRect, ...element.getClientRects()]
    for (const sub of Array.from(element?.querySelectorAll("img, svg") || [])) {
        rects = rects.concat([
            sub.getBoundingClientRect(), ...sub.getClientRects()
        ])
    }
    rects = rects.concat(pseudoElementRects(element))
    const paddingInfo = findFrameInfo(element)
    if (paddingInfo) {
        rects = rects.map(r => {
            r.x += paddingInfo.x
            r.y += paddingInfo.y
            return r
        })
    }
    // Find a clickable area and position for the given element
    const {dimensions, clickable} = findClickPosition(element, rects)
    // Return null if any of the checks below fail
    // - Not detected as clickable in the above loop
    // - Too small to properly click on using a regular browser
    const tooSmall = dimensions.width <= 2 || dimensions.height <= 2
    // - The element isn't actually visible on the user's current window
    const outsideWindow = rectOutsideWindow(dimensions)
    // - The element is too big to actually make sense to click on by choice
    const tooBig = dimensions.width >= window.innerWidth
        || dimensions.height >= window.innerHeight
    if (!clickable || tooSmall || outsideWindow || tooBig) {
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
        "height": dimensions.height,
        "text": element.textContent?.slice(0, 10000) || "",
        "type": typeOverride || type,
        "url": href,
        "width": dimensions.width,
        "x": dimensions.x,
        "y": dimensions.y
    }
}

const allElementsBySelector = (type, select) => [...querySelectorAll(select)]
    .map(element => parseElement(element, type)).filter(e => e)

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
            "tovisual": (frame?.contentWindow || window)
                .getSelection().toString(),
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
    if (e.isTrusted && !inFollowMode && e.button === 2) {
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
                e.composedPath()[0])
                || eventListeners.auxclick.has(e.composedPath()[0]),
            "hasGlobalListener": !!e.composedPath().find(
                el => eventListeners.contextmenu.has(el)
                || eventListeners.auxclick.has(el)),
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
window.addEventListener("auxclick", contextListener)

let searchElement = null
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
        searchElement = findElementAtPosition(x / window.devicePixelRatio,
            y / window.devicePixelRatio)
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
    searchElement = findElementAtPosition(x / window.devicePixelRatio,
        y / window.devicePixelRatio)
    ipcRenderer.sendToHost("search-element-location", x, y)
    justSearched = true
    setTimeout(() => {
        justSearched = false
    }, 100)
})

ipcRenderer.on("search-element-click", () => searchElement?.click())

window.addEventListener("mousemove", e => {
    ipcRenderer.sendToHost("mousemove", e.clientX, e.clientY)
})
