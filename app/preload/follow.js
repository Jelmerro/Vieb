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
    getWebviewSetting,
    isHTMLElement,
    isHTMLIFrameElement,
    isHTMLAnchorElement,
    isInputOrTextElement,
    isHTMLImageElement,
    isElement,
    isSVGElement,
    isHTMLVideoElement,
    isHTMLAudioElement
} = require("../util")

/** @type {string|null} */
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
/** @type {("click"|"mousedown"|"mouseup")[]} */
const clickEvents = ["click", "mousedown", "mouseup"]
/** @type {(
 *   "mouseenter"|"mouseleave"|"mousemove"|"mouseout"|"mouseover"|"contextmenu"
 * )[]} */
const otherEvents = [
    "mouseenter",
    "mouseleave",
    "mousemove",
    "mouseout",
    "mouseover",
    "contextmenu"
]
/** @type {Element[]} */
const previouslyFocussedElements = []

ipcRenderer.on("focus-input", async(_, follow = null) => {
    let el = null
    if (follow) {
        el = findElementAtPosition(follow.x, follow.y)
    } else {
        const allLinks = await getAllFollowLinks(["input"])
        const input = allLinks.find(l => l?.type === "inputs-insert")
        if (input) {
            el = findElementAtPosition(
                input.x + input.width / 2, input.y + input.height / 2)
        }
    }
    const focusEl = [el, el?.parentNode, el?.parentNode?.parentNode]
        .find(e => matchesQuery(e, textlikeInputs)) ?? el
    if (!isHTMLElement(focusEl)) {
        return
    }
    ipcRenderer.sendToHost("switch-to-insert")
    await new Promise(r => {
        setTimeout(r, 3)
    })
    const inputfocusalignment = getWebviewSetting("inputfocusalignment")
        ?? "rememberend"
    focusEl.click()
    focusEl.focus()
    if (previouslyFocussedElements.includes(focusEl)
        && !inputfocusalignment.includes("always")) {
        return
    }
    if (isInputOrTextElement(focusEl)) {
        if (inputfocusalignment.includes("end")) {
            const focusLength = focusEl.value.length
            focusEl.setSelectionRange(focusLength, focusLength)
        } else {
            focusEl.setSelectionRange(0, 0)
        }
    } else {
        const selection = window.getSelection()
        selection?.selectAllChildren(focusEl)
        if (inputfocusalignment.includes("end")) {
            selection?.collapseToEnd()
        } else {
            selection?.collapseToStart()
        }
    }
    previouslyFocussedElements.push(focusEl)
})

/**
 * Get all follow links parsed, optionally for a specific type.
 * @param {string[]|null} filter
 * @returns {Promise<({
 *    height: number,
 *    text: string,
 *    type: string,
 *    url: string,
 *    width: number,
 *    x: number,
 *    y: number
 *  }|null)[]>}
 */
const getAllFollowLinks = (filter = null) => {
    const allEls = querySelectorAll("*")
    /** @type {{
     *   el: Element, type: string, bounds?: DOMRectReadOnly, visible?: boolean
     * }[]} */
    const relevantLinks = []
    if (!filter || filter.includes("url")) {
        // A tags with href as the link, can be opened in new tab or current tab
        allEls.filter(el => matchesQuery(el, "a")).forEach(
            el => relevantLinks.push({el, "type": "url"}))
    }
    if (!filter || filter.some(f => f.startsWith("input"))) {
        // Input tags such as checkboxes, can be clicked but have no text input
        const inputs = allEls.filter(el => matchesQuery(el, clickInputs))
        inputs.push(...allEls.filter(el => matchesQuery(el, "input"))
            .map(e => e.closest("label")).flatMap(e => {
                if (e && !inputs.includes(e)) {
                    return e
                }
                return []
            }))
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
        allEls.filter(el => clickEvents.some(
            e => isHTMLElement(el) && el[`on${e}`]
            || eventListeners[e].has(el))
            || el.getAttribute("jsaction")).forEach(
            el => relevantLinks.push({el, "type": "onclick"}))
        allEls.filter(el => otherEvents.some(
            e => isHTMLElement(el) && el[`on${e}`]
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
        allEls.filter(el => matchesQuery(el, "img,svg"))
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
            }).filter(link => link.visible).map(link => {
                if (isHTMLElement(link.el)) {
                    return parseElement(link.el, link.type, link.bounds)
                }
                return null
            }).filter(el => el).sort((el1, el2) => {
                if (!el1 || !el2) {
                    return 0
                }
                if (el1.type === "other") {
                    return 10000
                }
                return Math.floor(el1.y) - Math.floor(el2.y) || el1.x - el2.x
            })
            res(parsedEls)
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
    const frames = querySelectorAll("iframe").flatMap(f => {
        if (isHTMLIFrameElement(f)) {
            return f
        }
        return []
    })
    frames.forEach(f => {
        try {
            if (f.contentDocument) {
                f.contentDocument.onclick = e => clickListener(e, f)
                f.contentDocument.oncontextmenu = e => contextListener(e, f)
                f.contentDocument.onmousedown = e => mouseDownListener(e, f)
                f.contentDocument.onmouseup = e => mouseUpListener(e, f)
            }
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
        "subframes": frames.map(f => {
            const bounds = f.getBoundingClientRect()
            const framePos = framePosition(f)
            for (const frame of frames) {
                try {
                    if (frame.contentDocument?.contains(f)) {
                        const parentPos = framePosition(frame)
                        framePos.x += parentPos.x
                        framePos.y += parentPos.y
                    }
                } catch {
                    // Not allowed to access inside document, probably no parent
                }
            }
            return {
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
window.addEventListener("DOMContentLoaded", () => {
    mainInfoLoop()
    const pdfbehavior = getWebviewSetting("pdfbehavior") ?? "block"
    if (pdfbehavior !== "view") {
        querySelectorAll("embed").forEach(embed => {
            if (embed.getAttribute("type") === "application/pdf") {
                if (pdfbehavior === "download") {
                    const src = embed.getAttribute("src")?.replace(
                        /^about:blank/g, "") || window.location.href
                    ipcRenderer.sendToHost("download", src)
                }
                embed.remove()
            }
        })
    }
})
window.addEventListener("resize", mainInfoLoop)

/**
 * Parse an element to a clickable rect if possible.
 * @param {HTMLElement} element
 * @param {string|null} type
 * @param {DOMRectReadOnly|null} customBounds
 */
const parseElement = (element, type = null, customBounds = null) => {
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
    let href = ""
    let typeOverride = null
    if (isHTMLAnchorElement(element)) {
        ({href} = element)
        // Set links to the current page as type 'other'
        if (!href) {
            typeOverride = "other"
        } else if (href === window.location.href) {
            typeOverride = "other"
        } else if (href === `${window.location.href}#`) {
            typeOverride = "other"
        } else if (href?.startsWith?.("javascript:")) {
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
        "type": typeOverride ?? type ?? "none",
        "url": href,
        "width": dims.width,
        "x": dims.x,
        "y": dims.y
    }
}

/** @type {{[type: string]: WeakSet<EventTarget>}} */
const eventListeners = {}
;[...clickEvents, ...otherEvents].forEach(e => {
    eventListeners[e] = new WeakSet()
})

const realAdd = EventTarget.prototype.addEventListener
/**
 * Add the regular event listener while also recording its existence in a set.
 * @param {string} type
 * @param {() => void} listener
 * @param {object} options
 */
EventTarget.prototype.addEventListener = function(type, listener, options) {
    try {
        realAdd.apply(this, [type, listener, options])
        eventListeners[type]?.add(this)
    } catch {
        // This is a bug in the underlying website
    }
}
const realRemove = EventTarget.prototype.removeEventListener
/**
 * Remove the regular event listener while also removing its storage from a set.
 * @param {string} type
 * @param {() => void} listener
 * @param {object} options
 */
EventTarget.prototype.removeEventListener = function(type, listener, options) {
    try {
        realRemove.apply(this, [type, listener, options])
        eventListeners[type]?.delete(this)
    } catch {
        // This is a bug in the underlying website
    }
}

/**
 * Send mouse click info to renderer via main on click.
 * @param {MouseEvent} e
 * @param {HTMLIFrameElement|null} frame
 */
const clickListener = (e, frame = null) => {
    if (e.isTrusted) {
        const paddingInfo = findFrameInfo(frame)
        const inputEl = e.composedPath().find(
            el => matchesQuery(el, textlikeInputs))
        let focusEl = null
        if (isHTMLElement(inputEl)) {
            focusEl = [
                inputEl,
                inputEl?.parentElement,
                inputEl?.parentElement?.parentElement
            ].find(el => el?.click && el?.focus)
        }
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

/**
 * Send mouse down info to renderer via main on down.
 * @param {MouseEvent} e
 * @param {HTMLIFrameElement|null} frame
 */
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
    if (e.composedPath().some(el => matchesQuery(el, "select, option"))) {
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

/**
 * Send mouse up info to the renderer via main on up.
 * @param {MouseEvent} e
 * @param {HTMLIFrameElement|null} frame
 */
const mouseUpListener = (e, frame = null) => {
    const paddingInfo = findFrameInfo(frame)
    const endX = e.clientX + (paddingInfo?.x || 0)
    const endY = e.clientY + (paddingInfo?.y || 0)
    const diffX = Math.abs(endX - startX)
    const diffY = Math.abs(endY - startY)
    ipcRenderer.sendToHost("mouse-up")
    if (endX > 0 && endY > 0 && (diffX > 3 || diffY > 3)) {
        const text = (frame?.contentWindow || window).getSelection()?.toString()
        if (text) {
            ipcRenderer.send("mouse-selection", {
                endX,
                endY,
                startX,
                startY,
                text,
                "toinsert": e.composedPath().some(
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
        if (isInputOrTextElement(input)) {
            input.value = value
            if (position < input.value.length) {
                input.setSelectionRange(position, position)
            }
        } else if (input) {
            input.textContent = value
            const range = document.createRange()
            range.setStart(input.firstChild ?? input, position)
            range.setEnd(input.lastChild ?? input, position)
            const select = window.getSelection()
            select?.removeAllRanges()
            select?.addRange(range)
        }
    }
})

/**
 * Generate a data image for a given svg image.
 * @param {SVGElement} el
 */
const getSvgData = el => `data:image/svg+xml,${encodeURIComponent(el.outerHTML)
    .replace(/'/g, "%27").replace(/"/g, "%22")}`

/**
 * Context menu listener that sends info to renderer via main.
 * @param {{
 *   isTrusted: boolean
 *   preventDefault?: () => void
 *   button?: number
 *   composedPath: () => EventTarget[]
 *   x: number
 *   y: number
 * }} e
 * @param {Element|ShadowRoot|null} frame
 * @param {object|null} extraData
 */
const contextListener = (e, frame = null, extraData = null) => {
    if (e.isTrusted && !currentFollowStatus && e.button === 2) {
        e.preventDefault?.()
        const paddingInfo = findFrameInfo(frame)
        const img = e.composedPath().find(isHTMLImageElement)
        const svg = e.composedPath().find(isSVGElement)
        const backgroundImg = e.composedPath().map(el => {
            if (isElement(el)) {
                const styling = getComputedStyle(el).backgroundImage
                const url = styling.match(/url\(.*?\)/g)?.[0]
                if (url) {
                    return url?.slice(5, -2)
                }
            }
            return null
        }).find(url => url)
        const videoEl = e.composedPath().find(isHTMLVideoElement)
        const video = [
            videoEl,
            [...videoEl?.querySelectorAll("source") ?? []].find(
                el => el.getAttribute("type")?.startsWith("audio"))
        ].find(el => el?.src.trim())
        const audioEl = e.composedPath().find(isHTMLAudioElement)
        const audio = [
            audioEl,
            [...audioEl?.querySelectorAll("source") ?? []].find(
                el => el.getAttribute("type")?.startsWith("audio")),
            [...videoEl?.querySelectorAll("source") ?? []].find(
                el => el.getAttribute("type")?.startsWith("audio"))
        ].find(el => el?.src.trim())
        const link = e.composedPath().filter(isHTMLAnchorElement)
            .find(el => el.href?.trim())
        const text = e.composedPath().find(
            el => matchesQuery(el, textlikeInputs))
        const iframe = [...e.composedPath(), frame].find(isHTMLIFrameElement)
        const selection = (iframe?.contentWindow ?? window).getSelection()
        let inputVal = ""
        let inputSel = 0
        if (isInputOrTextElement(text)) {
            inputVal = text.value
            inputSel = text.selectionStart ?? 0
        } else if (isHTMLElement(text)) {
            inputVal = text.textContent ?? ""
            inputSel = selection?.getRangeAt(0)?.startOffset ?? 0
        }
        const titleAttr = e.composedPath().filter(el => isHTMLElement(el)
            && el.title).find(isHTMLElement)?.title ?? ""
        ipcRenderer.send("context-click-info", {
            "audio": audio?.src?.trim(),
            "audioData": {
                "controllable": !!audioEl,
                "loop": ["", "loop", "true"].includes(
                    audioEl?.getAttribute("loop") ?? "false"),
                "muted": audioEl?.volume === 0,
                "paused": audioEl?.paused
            },
            backgroundImg,
            "canEdit": !!text,
            extraData,
            "frame": iframe?.src,
            "hasElementListener": eventListeners.contextmenu.has(
                e.composedPath()[0]),
            "hasGlobalListener": !!e.composedPath().find(
                el => eventListeners.contextmenu.has(el)),
            "img": img?.src?.trim(),
            inputSel,
            inputVal,
            "link": link?.href?.trim(),
            "svgData": svg && getSvgData(svg),
            "text": selection?.toString(),
            titleAttr,
            "video": video?.src?.trim(),
            "videoData": {
                "controllable": !!videoEl,
                "controls": ["", "controls", "true"].includes(
                    videoEl?.getAttribute("controls") ?? "false"),
                "loop": ["", "loop", "true"].includes(
                    videoEl?.getAttribute("loop") ?? "false"),
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
    const el = findElementAtPosition(x, y)
    if (!isElement(el)) {
        return
    }
    const els = [el]
    while (els[0].parentNode && els[0].parentNode !== els[1]?.parentNode) {
        if (isElement(els[0].parentNode)) {
            els.unshift(els[0].parentNode)
        } else {
            break
        }
    }
    els.reverse()
    contextListener({
        "button": 2, "composedPath": () => els, "isTrusted": true, x, y
    }, findFrameInfo(els[0])?.element, request)
})
ipcRenderer.on("contextmenu", () => {
    const el = activeElement()
    if (!isHTMLElement(el)) {
        return
    }
    const els = [el]
    const parsed = parseElement(els[0])
    if (!parsed || ["iframe", "body"].includes(els[0].tagName.toLowerCase())) {
        return
    }
    let {x} = parsed
    if (getComputedStyle(els[0]).font.includes("monospace")) {
        if (isInputOrTextElement(els[0])) {
            x = parsed.x + propPixels(els[0], "font-size")
                * (els[0].selectionStart ?? 0) * 0.60191 - els[0].scrollLeft
        }
    }
    let y = parsed.y + parsed.height
    if (x > window.innerWidth || isNaN(x) || x === 0) {
        ({x} = parsed)
    }
    if (y > window.innerHeight) {
        ({y} = parsed)
    }
    while (els[0].parentNode && els[0].parentNode !== els[1]?.parentNode) {
        if (isElement(els[0].parentElement)) {
            els.unshift(els[0].parentElement)
        } else {
            break
        }
    }
    els.reverse()
    contextListener({
        "button": 2, "composedPath": () => els, "isTrusted": true, x, y
    }, findFrameInfo(els[0])?.element, {"force": true})
})
window.addEventListener("contextmenu", contextListener)
ipcRenderer.on("keyboard-type-event", (_, keyOptions) => {
    // This is a last resort attempt to press a key in an iframe,
    // but ideally this code shouldn't exist and only use sendInputEvent.
    // See https://github.com/electron/electron/issues/20333
    const input = activeElement()
    if (matchesQuery(input, textlikeInputs) && keyOptions.key.length === 1) {
        if (isInputOrTextElement(input)) {
            const cur = Number(input.selectionStart)
            input.value = `${input.value.substring(0, cur)}${keyOptions.key}${
                input.value.substring(input.selectionEnd ?? cur)}`
            input.setSelectionRange(cur + 1, cur + 1)
        }
    }
})

/**
 * Check if an element can be scrolled vertically.
 * @param {Element} el
 */
const isVertScrollable = el => {
    const scrollEl = document.scrollingElement
    if ([scrollEl, scrollEl?.parentElement].includes(el)) {
        return el.scrollHeight > el.clientHeight
    }
    return el.scrollHeight > el.clientHeight
        && ["scroll", "auto"].includes(getComputedStyle(el).overflowY)
}
/**
 * Check if an element can be scrolled horizontally.
 * @param {Element} el
 */
const isHorScrollable = el => {
    const scrollEl = document.scrollingElement
    if ([scrollEl, scrollEl?.parentElement].includes(el)) {
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
    if (!el) {
        return
    }
    if (eventType === "click") {
        if (mouseOptions.button === "left") {
            if (isHTMLElement(el)) {
                el.click()
            }
            return
        }
        const {x, y} = mouseOptions
        const els = [el]
        while (els[0].parentNode && els[0].parentNode !== els[1]?.parentNode) {
            if (isElement(els[0].parentNode)) {
                els.unshift(els[0].parentNode)
            } else {
                break
            }
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
            if (isElement(sc.parentNode)) {
                sc = sc.parentNode
            } else {
                break
            }
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
/** @type {{x: number, y: number}|null} */
let searchPos = null

window.addEventListener("scroll", () => {
    const scrollDiff = scrollHeight - window.scrollY
    startY += scrollDiff
    scrollHeight = window.scrollY
    justScrolled = Number(scrollDiff)
    setTimeout(() => {
        justScrolled = 0
    }, 100)
    if (justSearched && searchPos) {
        const {x} = searchPos
        const y = searchPos.y + scrollDiff * window.devicePixelRatio
        ipcRenderer.sendToHost("search-element-location", x, y)
    }
    ipcRenderer.sendToHost("scroll-height-diff", scrollDiff)
})

ipcRenderer.on("search-element-location", (_, pos) => {
    let {x} = pos
    const alignment = getWebviewSetting("searchpointeralignment")
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
