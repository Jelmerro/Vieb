/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2026 Jelmer van Arnhem
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

const {contextBridge, ipcRenderer} = require("electron")
const {
    activeElement,
    findClickPosition,
    findElementAtPosition,
    findFrameInfo,
    framePosition,
    getSetting,
    isElement,
    isHTMLAnchorElement,
    isHTMLAudioElement,
    isHTMLElement,
    isHTMLIFrameElement,
    isHTMLImageElement,
    isHTMLVideoElement,
    isInputOrTextElement,
    isSVGElement,
    matchesQuery,
    propPixels,
    querySelectorAll
} = require("../util")

/** @type {string[]|null} */
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
/** @type {Element[]} */
const previouslyFocussedElements = []
/** @type {((ev: EventTarget) => {[key: string]: number})|null} */
let getListenCounts = null

/**
 * Check if an element has a contextmenu listener on it.
 * @param {EventTarget} el
 */
const hasContextMenuListener = el => {
    if (!isElement(el)) {
        return false
    }
    const hasAttribute = contextBridge.executeInMainWorld({
        "args": [el],
        /**
         * Check in the page if an Element has listeners of a specific type.
         * @param {Element} elInScope
         */
        "func": elInScope => elInScope.hasAttribute(`oncontextmenu`)
            // @ts-expect-error Only HTMLElements can have them as property.
            || !!elInScope.oncontextmenu
    })
    if (hasAttribute) {
        return true
    }
    return (getListenCounts?.(el)?.contextmenu ?? 0) > 0
}

/**
 * Find elements that have mouse listeners of any kind, either click or others.
 * @param {Element[]} els
 * @returns {{el: Element, "type": "onclick"|"other"}[]}
 */
const elementsWithMouseListeners = els => contextBridge.executeInMainWorld({
    "args": [els, getListenCounts],
    /**
     * Check in the page if an Element has listeners of a specific type.
     * @param {Element[]} allElements
     * @param {(
     *   (ev: EventTarget) => {[key: string]: number}
     * )|null} mainGetListenCounts
     */
    "func": (allElements, mainGetListenCounts) => {
        const clickEvents = ["click", "mousedown", "mouseup"]
        const otherEvents = [
            "mouseenter",
            "mouseleave",
            "mousemove",
            "mouseout",
            "mouseover",
            "contextmenu"
        ]
        return allElements?.reduce((elementsWithListeners, el) => {
            if (clickEvents.some(t => el.hasAttribute(`on${t}`)
            // @ts-expect-error Only HTMLElements can have them as property.
                || !!el[`on${t}`] || el.hasAttribute("jsaction"))) {
                // @ts-expect-error Reduce types are broken in TS.
                elementsWithListeners.push({el, "type": "onclick"})
            }
            if (otherEvents.some(t => el.hasAttribute(`on${t}`)
            // @ts-expect-error Only HTMLElements can have them as property.
                || !!el[`on${t}`])) {
                // @ts-expect-error Reduce types are broken in TS.
                elementsWithListeners.push({el, "type": "other"})
            }
            const listeners = mainGetListenCounts?.(el) ?? {}
            if (clickEvents.some(t => (listeners[t] ?? 0) > 0)) {
                // @ts-expect-error Reduce types are broken in TS.
                elementsWithListeners.push({el, "type": "onclick"})
            }
            if (otherEvents.some(t => (listeners[t] ?? 0) > 0)) {
                // @ts-expect-error Reduce types are broken in TS.
                elementsWithListeners.push({el, "type": "other"})
            }
            return elementsWithListeners
        },
        /** @type {{el: Element, "type": "onclick"|"other"}[]} */
        [])
    }
})

/**
 * @typedef {{
 *   height: number,
 *   text: string,
 *   type: string,
 *   url: string,
 *   width: number,
 *   x: number,
 *   y: number
 * }} ParsedElement
 */

/**
 * Parse an element to a clickable rect if possible.
 * @param {Element} element
 * @param {string|null} type
 * @param {DOMRectReadOnly|null} bounds
 */
const parseElement = (element, type = null, bounds = null) => {
    /** @type {Element[]} */
    const excluded = [document.body, document.documentElement]
    if (excluded.includes(element) || !bounds) {
        return null
    }
    const boundingBox = bounds.toJSON()
    const paddingInfo = findFrameInfo(element)
    if (paddingInfo) {
        boundingBox.x += paddingInfo.x
        boundingBox.left += paddingInfo.x
        boundingBox.y += paddingInfo.y
        boundingBox.top += paddingInfo.y
    }
    // Find a clickable area and position for the given element and bounds
    const subImages = [...element.querySelectorAll("img,svg")]
    const rects = [
        boundingBox, ...subImages.map(img => img.getBoundingClientRect())
    ]
    const {clickable, dims} = findClickPosition(element, rects)
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

/**
 * Get all follow links parsed, optionally for a specific type.
 * @param {string[]|null} filter
 * @returns {Promise<ParsedElement[]>}
 */
const getAllFollowLinks = (filter = null) => {
    const allEls = querySelectorAll("*").filter(el => el.checkVisibility({
        "opacityProperty": true, "visibilityProperty": true
    }))
    /**
     * @type {Set<{
     *   el: Element, type: string, bounds?: DOMRectReadOnly, visible?: boolean
     * }>}
     */
    const relevantLinks = new Set()
    if (!filter || filter.includes("url")) {
        // A tags with href as the link, can be opened in new tab or current tab
        allEls.filter(el => matchesQuery(el, "a")).forEach(
            el => relevantLinks.add({el, "type": "url"}))
    }
    if (!filter || filter.some(f => f.startsWith("input"))) {
        // Input tags such as checkboxes, can be clicked but have no text input
        const inputs = allEls.filter(el => matchesQuery(el, clickInputs))
        inputs.push(...allEls.filter(el => matchesQuery(el, "input,label"))
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
            relevantLinks.add({el, type})
        })
        // Input tags such as email and text, can have text inserted
        allEls.filter(el => matchesQuery(el, textlikeInputs)).forEach(
            el => relevantLinks.add({el, "type": "inputs-insert"}))
    }
    if (!filter || filter.includes("onclick")) {
        // Elements with some kind of mouse interaction, grouped by click/other
        elementsWithMouseListeners(allEls).forEach(e => relevantLinks.add(e))
    }
    if (!filter || filter.includes("media")) {
        // Get media elements, such as videos or music players
        allEls.filter(el => matchesQuery(el, "video,audio"))
            .forEach(el => relevantLinks.add({el, "type": "media"}))
    }
    if (!filter || filter.includes("image")) {
        // Get any images or background images
        allEls.filter(el => matchesQuery(el, "img,svg"))
            .forEach(el => relevantLinks.add({el, "type": "image"}))
        allEls.filter(el => el.computedStyleMap().get(
            "background-image")?.toString() !== "none").forEach(
            el => relevantLinks.add({el, "type": "image"}))
    }
    return new Promise(res => {
        const observer = new IntersectionObserver(allEntries => {
            const entries = new Map(allEntries.filter(
                e => e.intersectionRatio > 0
                && e.boundingClientRect.width > 0
                && e.boundingClientRect.height > 0).map(e => [e.target, e]))
            /** @type {ParsedElement[]} */
            const parsedEls = []
            relevantLinks.forEach(link => {
                const entry = entries.get(link.el)
                if (!entry) {
                    return
                }
                link.bounds = entry.boundingClientRect
                const parsed = parseElement(link.el, link.type, link.bounds)
                if (parsed) {
                    parsedEls.push(parsed)
                }
            })
            res(parsedEls.sort((el1, el2) => {
                if (!el1 || !el2) {
                    return 0
                }
                if (el1.type === "other") {
                    return 10000
                }
                return Math.floor(el1.y) - Math.floor(el2.y)
                    || el1.x - el2.x
            }))
            observer.disconnect()
        })
        let observingSomething = false
        relevantLinks.forEach(link => {
            try {
                observer.observe(link.el)
                observingSomething = true
            } catch(e) {
                console.warn(e)
            }
        })
        if (!observingSomething) {
            res([])
        }
    })
}

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
        .find(e => isElement(e) && matchesQuery(e, textlikeInputs)) ?? el
    if (!isHTMLElement(focusEl)) {
        return
    }
    ipcRenderer.sendToHost("switch-to-insert")
    await new Promise(r => {
        setTimeout(r, 3)
    })
    const inputfocusalignment = getSetting("inputfocusalignment")
        ?? "rememberend"
    focusEl.click()
    focusEl.focus()
    if (previouslyFocussedElements.includes(focusEl)
        && !inputfocusalignment.includes("always")) {
        return
    }
    if (isInputOrTextElement(focusEl)) {
        try {
            if (inputfocusalignment.includes("end")) {
                const focusLength = focusEl.value.length
                focusEl.setSelectionRange(focusLength, focusLength)
            } else {
                focusEl.setSelectionRange(0, 0)
            }
            return
        } catch {
            // Not the right input type, falling back to collapsing selection
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

/** Track updates to event listeners and write them down as a data attribute. */
const trackEventListeners = () => {
    const mainWorldListenCounts = new Map()

    /**
     * Check if a node is an element, taking subframes into account.
     * @param {Node|EventTarget|null|undefined} el
     * @returns {el is Element}
     */
    const isElementInMainWorld = el => {
        if (el instanceof EventTarget && !(el instanceof Element)) {
            return false
        }
        if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) {
            return false
        }
        return el instanceof el.ownerDocument.defaultView.Element
    }

    /* eslint-disable no-restricted-syntax */
    const realAdd = EventTarget.prototype.addEventListener
    /**
     * Add the event listener while also recording its existence in a set.
     * @param {string} type
     * @param {() => void} listener
     * @param {object} opts
     */
    EventTarget.prototype.addEventListener = function(type, listener, opts) {
        try {
            realAdd.apply(this, [type, listener, opts])
        } catch {
            // This is a bug in the underlying website
        }
        if (isElementInMainWorld(this)) {
            let counts = mainWorldListenCounts.get(this)
            if (!counts) {
                counts = {}
                mainWorldListenCounts.set(this, counts)
            }
            counts[type] = (counts[type] || 0) + 1
        }
    }
    const realRemove = EventTarget.prototype.removeEventListener
    /**
     * Remove the event listener while also removing its storage from a set.
     * @param {string} type
     * @param {() => void} listener
     * @param {object} opts
     */
    EventTarget.prototype.removeEventListener = function(type, listener, opts) {
        try {
            realRemove.apply(this, [type, listener, opts])
        } catch {
            // This is a bug in the underlying website
        }
        if (isElementInMainWorld(this)) {
            const counts = mainWorldListenCounts.get(this)
            if (counts?.[type]) {
                counts[type] -= 1
                if (counts[type] <= 0) {
                    delete counts[type]
                }
            }
        }
    }
    /* eslint-enable no-restricted-syntax */
    /**
     * Get listen counts from the map inside the main page.
     * @param {EventTarget} el
     */
    return el => mainWorldListenCounts.get(el)
}

getListenCounts = contextBridge.executeInMainWorld({
    "args": [], "func": trackEventListeners
})

/**
 * Send mouse click info to renderer via main on click.
 * @param {MouseEvent} e
 * @param {HTMLIFrameElement|null} frame
 */
const clickListener = (e, frame = null) => {
    if (e.isTrusted) {
        const paddingInfo = findFrameInfo(frame)
        const inputEl = e.composedPath().find(
            el => isElement(el) && matchesQuery(el, textlikeInputs))
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
    if (e.composedPath().some(el => isElement(el)
        && matchesQuery(el, "select, option"))) {
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
 * Send the mouse selection to the renderer based on the client rect dimensions.
 * @param {Selection} selection
 * @param {boolean} toinsert
 */
const sendMouseSelection = (selection, toinsert) => {
    const dims = selection.getRangeAt(0).getBoundingClientRect()
    ipcRenderer.send("mouse-selection", {
        "endX": dims.x + dims.width - 1,
        "endY": dims.y + dims.height - 1,
        "startX": dims.x + 1,
        "startY": dims.y + 1,
        "text": selection.toString(),
        toinsert
    })
}

/** @type {number|null} */
let doubleToTripleTimeout = null

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
    const selection = (frame?.contentWindow || window).getSelection()
    const toinsert = e.composedPath().some(
        el => isElement(el) && matchesQuery(el, textlikeInputs))
    if (endX > 0 && endY > 0 && (diffX > 3 || diffY > 3)) {
        const text = selection?.toString()
        if (text) {
            ipcRenderer.send("mouse-selection", {
                endX, endY, startX, startY, text, toinsert
            })
        }
    } else if (selection?.toString().trim() && e.detail === 2) {
        doubleToTripleTimeout = window.setTimeout(() => {
            sendMouseSelection(selection, toinsert)
        }, 500)
    } else if (selection?.toString().trim() && e.detail > 2) {
        window.clearTimeout(doubleToTripleTimeout ?? undefined)
        sendMouseSelection(selection, toinsert)
    }
}

window.addEventListener("mouseup", mouseUpListener,
    {"capture": true, "passive": true})
ipcRenderer.on("replace-input-field", (_, value, position) => {
    const input = activeElement()
    if (isElement(input) && matchesQuery(input, textlikeInputs)) {
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
 *   isTrusted: boolean,
 *   preventDefault?: () => void,
 *   button?: number,
 *   composedPath: () => EventTarget[],
 *   x: number,
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
                const styling = el.computedStyleMap()
                    .get("background-image")?.toString()
                const url = styling?.match(/url\(.*?\)/g)?.[0]
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
            el => isElement(el) && matchesQuery(el, textlikeInputs))
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
            "hasElementListener": hasContextMenuListener(e.composedPath()[0]),
            "hasGlobalListener": !!e.composedPath().find(
                el => hasContextMenuListener(el)),
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
        "button": 2,
        /** Return all elements at that location for the composedPath method. */
        "composedPath": () => els,
        "isTrusted": true,
        x,
        y
    }, els[0], request)
})
ipcRenderer.on("contextmenu", () => {
    const el = activeElement()
    if (!isHTMLElement(el)) {
        return
    }
    const parsed = parseElement(el, null, el?.getBoundingClientRect())
    if (!parsed || ["body", "iframe"].includes(el.tagName.toLowerCase())) {
        return
    }
    let {x} = parsed
    if (el.computedStyleMap().get("font")?.toString().includes("monospace")) {
        if (isInputOrTextElement(el)) {
            x = parsed.x + propPixels(el, "font-size")
                * (el.selectionStart ?? 0) * 0.60191 - el.scrollLeft
        }
    }
    let y = parsed.y + parsed.height
    if (x > window.innerWidth || isNaN(x) || x === 0) {
        ({x} = parsed)
    }
    if (y > window.innerHeight) {
        ({y} = parsed)
    }
    const els = [el]
    while (els[0].parentNode && els[0].parentNode !== els[1]?.parentNode) {
        if (isElement(els[0].parentElement)) {
            els.unshift(els[0].parentElement)
        } else {
            break
        }
    }
    els.reverse()
    contextListener({
        "button": 2,
        /** Return all elements at that location for the composedPath method. */
        "composedPath": () => els,
        "isTrusted": true,
        x,
        y
    }, els[0], {"force": true})
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
    return el.scrollHeight > el.clientHeight && ["auto", "scroll"].includes(
        el.computedStyleMap().get("overflow-y")?.toString() ?? "")
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
    return el.scrollWidth > el.clientWidth && ["auto", "scroll"].includes(
        el.computedStyleMap().get("overflow-x")?.toString() ?? "")
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
            "button": 2,
            /** Return all elements at that location for composedPath. */
            "composedPath": () => els,
            "isTrusted": true,
            x,
            y
        }, els[0])
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
    const scrollDiff = window.scrollY - scrollHeight
    startY += scrollDiff
    scrollHeight = window.scrollY
    justScrolled = Number(scrollDiff)
    setTimeout(() => {
        justScrolled = 0
    }, 100)
    if (justSearched && searchPos) {
        const {x} = searchPos
        let {y} = searchPos
        if (y < 0 && scrollDiff > 0
            || y > window.innerHeight && scrollDiff < 0) {
            y += scrollDiff * window.devicePixelRatio
        }
        if (y > window.innerHeight && scrollDiff > 0
            || y < 0 && scrollDiff < 0) {
            y -= scrollDiff * window.devicePixelRatio
        }
        ipcRenderer.sendToHost("search-element-location", x, y)
    }
    ipcRenderer.sendToHost("scroll-height-diff", scrollDiff)
})
ipcRenderer.on("search-element-location", (_, pos) => {
    let {x} = pos
    const alignment = getSetting("searchpointeralignment")
    if (alignment === "center") {
        x += pos.width / 2
    } else if (alignment === "right") {
        x += pos.width - 1
    } else {
        x += 1
    }
    let y = pos.y + pos.height / 2
    if (y < 0 && justScrolled > 0
        || y > window.innerHeight && justScrolled < 0) {
        y += justScrolled * window.devicePixelRatio
    }
    if (y > window.innerHeight && justScrolled > 0
        || y < 0 && justScrolled < 0) {
        y -= justScrolled * window.devicePixelRatio
    }
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
const wheelInfo = {
    "lastevent": Date.now(),
    /** @type {NodeJS.Timeout|null} */
    "timeout": null,
    "x": 0,
    "y": 0
}

/**
 * Wheel listener to detect swipe actions and send to main if detected.
 * @param {{deltaX: number, deltaY: number}} event
 */
const wheelListener = event => {
    if (wheelInfo.x === 0 && wheelInfo.y === 0) {
        wheelInfo.lastevent = Date.now()
    }
    wheelInfo.x += event.deltaX
    wheelInfo.y += Math.abs(event.deltaY)
    clearTimeout(wheelInfo.timeout ?? undefined)
    wheelInfo.timeout = setTimeout(() => {
        if (wheelInfo.y === 0) {
            const duration = Date.now() - wheelInfo.lastevent
            const isFast = duration < 500
            const isFar = Math.abs(wheelInfo.x) > 1000 * window.devicePixelRatio
            const isAboveThresholdRatio = Math.abs(wheelInfo.x) / duration > 10
            if (isFast && isFar && isAboveThresholdRatio) {
                ipcRenderer.sendToHost("swipe", wheelInfo.x > 0)
            }
        }
        wheelInfo.x = 0
        wheelInfo.y = 0
    }, 100)
}

window.addEventListener("wheel", wheelListener)

/** The main info loop that populates the subframe data in the main thread. */
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
                /**
                 * Handle click listener inside the frame, if allowed.
                 * @param {MouseEvent} e
                 */
                f.contentDocument.onclick = e => clickListener(e, f)
                /**
                 * Handle contextmenu listener inside the frame, if allowed.
                 * @param {MouseEvent} e
                 */
                f.contentDocument.oncontextmenu = e => contextListener(e, f)
                /**
                 * Handle mousedown listener inside the frame, if allowed.
                 * @param {MouseEvent} e
                 */
                f.contentDocument.onmousedown = e => mouseDownListener(e, f)
                /**
                 * Handle mouseup listener inside the frame, if allowed.
                 * @param {MouseEvent} e
                 */
                f.contentDocument.onmouseup = e => mouseUpListener(e, f)
                /**
                 * Handle mousemove listener inside the frame, if allowed.
                 * @param {MouseEvent} e
                 */
                f.contentDocument.onmousemove = e => {
                    ipcRenderer.sendToHost("mousemove", e.clientX, e.clientY)
                }
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

/** If following, send the follow elements with a 100ms pause between them. */
const followLoop = async() => {
    if (currentFollowStatus) {
        const links = await getAllFollowLinks(currentFollowStatus)
        ipcRenderer.send("follow-response", links)
        setTimeout(() => followLoop(), 100)
    }
}

ipcRenderer.on("follow-mode-start", (_, newFollowFilter) => {
    if (!currentFollowStatus
        || currentFollowStatus.length !== newFollowFilter.length
        || currentFollowStatus[0] !== newFollowFilter[0]) {
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
    const pdfbehavior = getSetting("pdfbehavior") ?? "block"
    if (pdfbehavior !== "view") {
        querySelectorAll("embed").forEach(embed => {
            if (embed.getAttribute("type") === "application/pdf") {
                if (pdfbehavior === "download") {
                    const src = embed.getAttribute("src")?.replace(
                        /^about:blank/g, "") || window.location.href
                    ipcRenderer.sendToHost("download", src)
                } else if (pdfbehavior === "external") {
                    const src = embed.getAttribute("src")?.replace(
                        /^about:blank/g, "") || window.location.href
                    ipcRenderer.sendToHost("external", src)
                }
                embed.remove()
            }
        })
    }
})
window.addEventListener("resize", mainInfoLoop)
