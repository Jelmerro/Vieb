/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2026 Jelmer van Arnhem
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

const {getSetting, propPixels} = require("../util")
const {
    currentPage,
    listFakePages,
    listPages,
    listReadyPages,
    listRealPages,
    listTabs,
    tabForPage
} = require("./common")

/**
 * Get a page layout element by id.
 * @param {string|null|undefined} id
 */
const layoutDivById = id => document.querySelector(
    `#pagelayout div[link-id='${id ?? "none"}']`)

/** @type {{[id: string]: NodeJS.Timeout}} */
const timers = {}
/** @type {string[]} */
const lastTabIds = []
let recentlySwitched = false
/** @type {NodeJS.Timeout|null} */
let scrollbarHideTimer = null
/** @type {NodeJS.Timeout|null} */
let scrollbarHideIgnoreTimer = null

/** Clean up any single div or webview elements into the parent recursively. */
const removeRedundantContainers = () => {
    const base = document.getElementById("pagelayout")
    if (!base) {
        return
    }
    for (const container of [
        ...document.querySelectorAll("#pagelayout .hor, #pagelayout .ver"), base
    ]) {
        if (container.children.length < 2 && container !== base) {
            const [lonelyView] = container.children
            if (lonelyView instanceof HTMLElement) {
                lonelyView.style.flexGrow = ""
                container.parentNode?.insertBefore(lonelyView, container)
            }
            container.remove()
        }
        for (const child of container.children) {
            if (!child.getAttribute("link-id")
                && child.className === container.className) {
                for (const subChild of child.children) {
                    child.before(subChild)
                }
                child.remove()
            }
        }
    }
}

/** Apply all layout changes from the div elements to the actual webviews. */
const applyLayout = () => {
    const pagelayout = document.getElementById("pagelayout")
    if (!pagelayout) {
        return
    }
    for (const element of pagelayout.querySelectorAll("*[link-id]")) {
        const id = element.getAttribute("link-id")
        const page = document.querySelector(`#pages .webview[link-id='${id}']`)
        if (!page) {
            element.remove()
        }
    }
    removeRedundantContainers()
    if (pagelayout.children.length === 0) {
        pagelayout.classList.add("hor")
        const cur = document.getElementById("current-page")
        if (cur) {
            const view = document.createElement("div")
            view.setAttribute("link-id", cur.getAttribute("link-id") ?? "")
            pagelayout.append(view)
        }
    }
    /** @type {(Electron.WebviewTag|HTMLDivElement)[]} */
    const visiblePages = []
    /** @type {HTMLSpanElement[]} */
    const visibleTabs = []
    const containerPos = pagelayout.getBoundingClientRect()
    for (const element of pagelayout.querySelectorAll("*[link-id]")) {
        const id = element.getAttribute("link-id")
        const page = listPages().find(p => p.getAttribute("link-id") === id)
        const tab = listTabs().find(t => t.getAttribute("link-id") === id)
        if (!page || !tab) {
            continue
        }
        visiblePages.push(page)
        visibleTabs.push(tab)
        const dimensions = element.getBoundingClientRect()
        page.style.left = `${Math.round(dimensions.x - containerPos.x)}px`
        page.style.top = `${Math.round(dimensions.y - containerPos.y)}px`
        page.style.width = `${Math.round(dimensions.width)}px`
        page.style.height = `${Math.round(dimensions.height)}px`
    }
    if (visiblePages.length > 1) {
        document.getElementById("pages")?.classList.add("multiple")
        document.getElementById("tabs")?.classList.add("multiple")
    } else {
        document.getElementById("pages")?.classList.remove("multiple")
        document.getElementById("tabs")?.classList.remove("multiple")
    }
    for (const page of listFakePages()) {
        page.classList.remove("visible-page")
    }
    for (const page of listRealPages()) {
        page.classList.toggle("visible-page", visiblePages.includes(page))
    }
    /**
     * Suspend a tab after a timeout, optionally repeating if playing media.
     * @param {HTMLSpanElement} tab
     * @param {string} linkId
     * @param {number} timeout
     */
    const susCall = (tab, linkId, timeout) => {
        const index = listTabs().indexOf(tab)
        let shouldSuspend = true
        for (const ignore of getSetting("suspendtimeoutignore")) {
            const {rangeToTabIdxs} = require("./command")
            if (rangeToTabIdxs("other", ignore).tabs.includes(index)) {
                shouldSuspend = false
            }
        }
        if (shouldSuspend) {
            delete timers[linkId]
            const {suspendTab} = require("./tabs")
            suspendTab("other", tab)
        } else {
            timers[linkId] = setTimeout(
                () => susCall(tab, linkId, timeout), timeout)
        }
    }
    const timeout = getSetting("suspendtimeout")
    for (const tab of listTabs()) {
        const linkId = tab.getAttribute("link-id") ?? ""
        if (visibleTabs.includes(tab)) {
            tab.classList.add("visible-tab")
            clearTimeout(timers[linkId])
            delete timers[linkId]
        } else {
            tab.classList.remove("visible-tab")
            if (timeout && !timers[linkId] && !tab.getAttribute("suspended")) {
                timers[linkId] = setTimeout(
                    () => susCall(tab, linkId, timeout), timeout)
            }
        }
    }
    const cur = currentPage()
    const follow = document.getElementById("follow")
    if (cur && follow) {
        if (document.getElementById("pages")?.classList.contains("multiple")) {
            const bor = propPixels(cur, "border-width")
            follow.style.top = `${Math.round(propPixels(
                cur.style, "top") + bor)}px`
            follow.style.left = `${Math.round(propPixels(
                cur.style, "left") + bor)}px`
            follow.style.width = `${Math.round(propPixels(
                cur.style, "width") - bor * 2)}px`
            follow.style.height = `${Math.round(propPixels(
                cur.style, "height") - bor * 2)}px`
        } else {
            follow.style.top = cur.style.top
            follow.style.left = cur.style.left
            follow.style.width = cur.style.width
            follow.style.height = cur.style.height
        }
    }
}

/**
 * Switch to a new view.
 * @param {Electron.WebviewTag|HTMLDivElement|null} oldViewOrId
 * @param {Electron.WebviewTag|HTMLDivElement} newView
 */
const switchView = (oldViewOrId, newView) => {
    const pagelayoutEl = document.getElementById("pagelayout")
    const oldId = oldViewOrId?.getAttribute("link-id")
    const newId = newView.getAttribute("link-id") ?? "none"
    if (oldId) {
        if (!layoutDivById(newId)) {
            layoutDivById(oldId)?.setAttribute("link-id", newId)
        }
    } else if (pagelayoutEl && pagelayoutEl.children.length === 0) {
        pagelayoutEl.classList.add("hor")
        const singleView = document.createElement("div")
        singleView.setAttribute("link-id", newId)
        pagelayoutEl.append(singleView)
    }
    applyLayout()
}

/**
 * Hide a page from view.
 * @param {Electron.WebviewTag|HTMLDivElement} view
 * @param {boolean} close
 */
const hide = (view, close = false) => {
    removeRedundantContainers()
    if (!document.getElementById("pages")?.classList.contains("multiple")) {
        return
    }
    const inLayout = layoutDivById(view.getAttribute("link-id"))
    const parent = inLayout?.parentElement
    const sibling = inLayout?.nextElementSibling
    inLayout?.remove()
    for (const element of [...parent?.children ?? [], parent]) {
        if (element instanceof HTMLElement) {
            element.style.flexGrow = ""
        }
    }
    if (view.id === "current-page") {
        const visibleTabs = listTabs().filter(
            t => t.classList.contains("visible-tab"))
        let newTab = null
        if (sibling) {
            newTab = visibleTabs.find(t => t.getAttribute("link-id")
                === sibling.getAttribute("link-id"))
        }
        if (!newTab && parent?.children[0]) {
            newTab = visibleTabs.find(t => t.getAttribute("link-id")
                === parent.children[0].getAttribute("link-id"))
        }
        if (!newTab) {
            newTab = visibleTabs.find(t => t.getAttribute("link-id")
                !== view.getAttribute("link-id"))
        }
        if (close) {
            tabForPage(view)?.remove()
            try {
                if (!(view instanceof HTMLDivElement)) {
                    view.closeDevTools()
                }
            } catch {
                // Webview already destroyed by the page,
                // most often happens when a page closes itself.
            }
            view.remove()
        }
        const {switchToTab} = require("./tabs")
        if (newTab) {
            switchToTab(newTab)
        }
    } else if (close) {
        tabForPage(view)?.remove()
        try {
            if (!(view instanceof HTMLDivElement)) {
                view.closeDevTools()
            }
        } catch {
            // Webview already destroyed by the page,
            // most often happens when a page closes itself.
        }
        view.remove()
    }
    applyLayout()
}

/**
 * Add a page to the layout.
 * @param {Electron.WebviewTag|HTMLDivElement|string} viewOrId
 * @param {"ver"|"hor"} method
 * @param {boolean} leftOrAbove
 */
const add = (viewOrId, method, leftOrAbove) => {
    const pagelayoutEl = document.getElementById("pagelayout")
    if (!pagelayoutEl) {
        return
    }
    let id = String(viewOrId)
    if (typeof viewOrId !== "string") {
        id = viewOrId.getAttribute("link-id") ?? "none"
    }
    const inLayout = layoutDivById(currentPage()?.getAttribute("link-id"))
    if ([...pagelayoutEl.querySelectorAll("*[link-id]")].length === 1) {
        pagelayoutEl.className = method
    }
    if (inLayout?.parentElement?.classList.contains(method)) {
        const singleView = document.createElement("div")
        singleView.setAttribute("link-id", id)
        if (leftOrAbove) {
            inLayout.parentElement.insertBefore(singleView, inLayout)
        } else {
            inLayout.parentElement.insertBefore(
                singleView, inLayout.nextElementSibling)
        }
    } else {
        const verContainer = document.createElement("div")
        verContainer.className = method
        if (leftOrAbove) {
            const singleView = document.createElement("div")
            singleView.setAttribute("link-id", id)
            verContainer.append(singleView)
        }
        const existingView = document.createElement("div")
        const linkId = inLayout?.getAttribute("link-id")
        if (linkId) {
            existingView.setAttribute("link-id", linkId)
        }
        verContainer.append(existingView)
        if (!leftOrAbove) {
            const singleView = document.createElement("div")
            singleView.setAttribute("link-id", id)
            verContainer.append(singleView)
        }
        inLayout?.parentElement?.insertBefore(verContainer, inLayout)
        inLayout?.remove()
    }
    for (const element of [
        ...layoutDivById(id)?.parentElement?.children ?? [],
        layoutDivById(id)?.parentElement
    ]) {
        if (element instanceof HTMLElement) {
            element.style.flexGrow = ""
        }
    }
    applyLayout()
}

/** Rotate the current subelement forward in the current split. */
const rotateForward = () => {
    removeRedundantContainers()
    if (!document.getElementById("pages")?.classList.contains("multiple")) {
        return
    }
    const current = layoutDivById(currentPage()?.getAttribute("link-id"))
    const parent = current?.parentNode
    if (parent?.lastChild) {
        parent?.insertBefore(parent?.lastChild, parent.firstChild)
    }
    applyLayout()
}

/** Rotate the current subelement backward in the current split. */
const rotateReverse = () => {
    removeRedundantContainers()
    if (!document.getElementById("pages")?.classList.contains("multiple")) {
        return
    }
    const current = layoutDivById(currentPage()?.getAttribute("link-id"))
    const parent = current?.parentNode
    if (parent?.firstChild) {
        parent?.append(parent.firstChild)
    }
    applyLayout()
}

/** Exchange the current split position for the next on in the split list. */
const exchange = () => {
    removeRedundantContainers()
    if (!document.getElementById("pages")?.classList.contains("multiple")) {
        return
    }
    const current = layoutDivById(currentPage()?.getAttribute("link-id"))
    const parent = current?.parentNode
    if ([...parent?.children ?? []].some(c => c.className)) {
        return
    }
    /** @type {string|null|undefined} */
    let newId = null
    if (parent?.lastChild === current) {
        newId = current?.previousElementSibling?.getAttribute("link-id")
        if (current?.previousElementSibling) {
            parent.append(current?.previousElementSibling)
        }
    } else {
        newId = current?.nextElementSibling?.getAttribute("link-id")
        if (current && current.nextElementSibling?.nextElementSibling) {
            parent?.insertBefore(current,
                current.nextElementSibling.nextElementSibling)
        }
    }
    const tab = listTabs().find(t => t.getAttribute("link-id") === newId)
    if (tab) {
        const {switchToTab} = require("./tabs")
        switchToTab(tab)
    }
    applyLayout()
}

/** Remove any custom grow CSS rules to reset all custom split sizes. */
const resetResizing = () => {
    for (const element of document.querySelectorAll("#pagelayout *")) {
        if (element instanceof HTMLElement) {
            element.style.flexGrow = ""
        }
    }
    applyLayout()
}

/**
 * Move a split to the top of the layout grid.
 * @param {"top"|"left"|"right"|"bottom"} direction
 */
const toTop = direction => {
    removeRedundantContainers()
    if (!document.getElementById("pages")?.classList.contains("multiple")) {
        return
    }
    const current = layoutDivById(currentPage()?.getAttribute("link-id"))
    const layout = document.getElementById("pagelayout")
    if (!current || !layout) {
        return
    }
    const hor = layout?.classList.contains("hor")
    const ver = layout?.classList.contains("ver")
    if (direction === "left" && hor || direction === "top" && ver) {
        layout.insertBefore(current, layout.firstChild)
    } else if (direction === "right" && hor || direction === "bottom" && ver) {
        layout.append(current)
    } else {
        let pageLayoutClass = "hor"
        let subLayoutClass = "ver"
        if (["bottom", "top"].includes(direction)) {
            pageLayoutClass = "ver"
            subLayoutClass = "hor"
        }
        const subLayout = document.createElement("div")
        subLayout.className = subLayoutClass
        layout.className = pageLayoutClass
        for (const child of layout.children) {
            subLayout.append(child)
        }
        layout.append(subLayout)
        if (["left", "top"].includes(direction)) {
            layout.insertBefore(current, layout.firstChild)
        } else {
            layout.append(current)
        }
    }
    resetResizing()
}

/**
 * Move the focus to a specific direction.
 * @param {"top"|"left"|"right"|"bottom"} direction
 */
const moveFocus = direction => {
    removeRedundantContainers()
    if (!document.getElementById("pages")?.classList.contains("multiple")) {
        return
    }
    const current = layoutDivById(currentPage()?.getAttribute("link-id"))
    const id = current?.getAttribute("link-id")
    const dims = current?.getBoundingClientRect()
    if (!dims) {
        return
    }
    let x = dims.x + dims.width / 2
    let y = dims.y + dims.height / 2
    let newView = document.elementsFromPoint(x, y).find(
        el => el.matches("#pagelayout *[link-id]"))
    while (newView?.getAttribute("link-id") === id) {
        if (direction === "left") {
            x -= 10
        } else if (direction === "top") {
            y -= 10
        } else if (direction === "bottom") {
            y += 10
        } else if (direction === "right") {
            x += 10
        } else {
            break
        }
        newView = document.elementsFromPoint(x, y).find(
            el => el.matches("#pagelayout *[link-id]"))
    }
    if (newView) {
        const newId = newView.getAttribute("link-id")
        if (newId && newId !== id) {
            const tab = listTabs().find(
                t => t.getAttribute("link-id") === newId)
            if (tab) {
                const {switchToTab} = require("./tabs")
                switchToTab(tab)
            }
        }
    }
}

/**
 * Resize a specific split: vertical or horizontal, then bigger or smaller.
 * @param {"ver"|"hor"} orientation
 * @param {"grow"|"shrink"} change
 */
const resize = (orientation, change) => {
    removeRedundantContainers()
    if (!document.getElementById("pages")?.classList.contains("multiple")) {
        return
    }
    let element = layoutDivById(currentPage()?.getAttribute("link-id"))
    const base = document.getElementById("pagelayout")
    while (element && !element.parentElement?.classList.contains(orientation)) {
        element = element?.parentElement ?? null
        if (element === base) {
            return
        }
    }
    if (!element) {
        return
    }
    let flexGrow = propPixels(element, "flex-grow") || 1
    if (change === "grow") {
        flexGrow *= 1.5
    } else if (change === "shrink") {
        flexGrow /= 1.5
    }
    if (flexGrow < 1) {
        for (const child of element.parentNode?.children ?? []) {
            if (child instanceof HTMLElement) {
                const current = propPixels(child, "flex-grow") || 1
                child.style.flexGrow = `${current / flexGrow}`
            }
        }
        flexGrow = 1
    }
    if (flexGrow > 10) {
        for (const child of element.parentNode?.children ?? []) {
            if (child instanceof HTMLElement) {
                const current = propPixels(child, "flex-grow") || 1
                child.style.flexGrow = `${current / (flexGrow / 10)}`
            }
        }
        flexGrow = 10
    }
    for (const child of element.parentNode?.children ?? []) {
        if (child instanceof HTMLElement) {
            const current = propPixels(child, "flex-grow") || 1
            child.style.flexGrow = `${Math.min(10, Math.max(1, current))}`
        }
    }
    if (element instanceof HTMLElement) {
        element.style.flexGrow = `${flexGrow}`
    }
    applyLayout()
}

/** Go to the first split based on position in the list. */
const firstSplit = () => {
    const first = document.querySelector("#pagelayout *[link-id]")
    const {switchToTab} = require("./tabs")
    const tab = listTabs().find(
        t => t.getAttribute("link-id") === first?.getAttribute("link-id"))
    if (tab) {
        switchToTab(tab)
    }
}

/** Go to the previous split based on position in the list. */
const previousSplit = () => {
    const views = [...document.querySelectorAll("#pagelayout *[link-id]")]
    const current = layoutDivById(currentPage()?.getAttribute("link-id"))
    if (!current) {
        return
    }
    const next = views[views.indexOf(current) - 1] || views.at(-1)
    const {switchToTab} = require("./tabs")
    const tab = listTabs().find(
        t => t.getAttribute("link-id") === next.getAttribute("link-id"))
    if (tab) {
        switchToTab(tab)
    }
}

/** Go to the next split based on position in the list. */
const nextSplit = () => {
    const views = [...document.querySelectorAll("#pagelayout *[link-id]")]
    const current = layoutDivById(currentPage()?.getAttribute("link-id"))
    if (!current) {
        return
    }
    const next = views[views.indexOf(current) + 1] || views[0]
    const {switchToTab} = require("./tabs")
    const tab = listTabs().find(
        t => t.getAttribute("link-id") === next.getAttribute("link-id"))
    if (tab) {
        switchToTab(tab)
    }
}

/** Go to the last split based on position in the list. */
const lastSplit = () => {
    const views = [...document.querySelectorAll("#pagelayout *[link-id]")]
    const last = views.at(-1) ?? views[0]
    const {switchToTab} = require("./tabs")
    const tab = listTabs().find(
        t => t.getAttribute("link-id") === last.getAttribute("link-id"))
    if (tab) {
        switchToTab(tab)
    }
}

/** Make the current split/page the only visible one by hiding all others. */
const only = () => {
    const linkId = currentPage()?.getAttribute("link-id") ?? ""
    const singleView = document.createElement("div")
    singleView.setAttribute("link-id", linkId)
    const pagelayoutEl = document.getElementById("pagelayout")
    if (pagelayoutEl) {
        pagelayoutEl.textContent = ""
        pagelayoutEl.append(singleView)
    }
    applyLayout()
}

/**
 * Add an id to the last used tab id list.
 * @param {string|null} id
 */
const setLastUsedTab = id => {
    if (recentlySwitched || !id) {
        return
    }
    if (currentPage()?.getAttribute("link-id") !== id) {
        lastTabIds.unshift(id)
        recentlySwitched = true
        setTimeout(() => {
            recentlySwitched = false
        }, getSetting("timeoutlen"))
    }
}

/** Restart all suspend timeouts when the setting is changed. */
const restartSuspendTimeouts = () => {
    for (const linkId of Object.keys(timers)) {
        clearTimeout(timers[linkId])
        delete timers[linkId]
    }
    applyLayout()
}

/** Show the scrollbar for all pages. */
const showScrollbar = () => {
    if (scrollbarHideIgnoreTimer) {
        return
    }
    for (const p of listReadyPages()) {
        p.send("show-scrollbar")
    }
}

/** Hide the scrollbar for all pages. */
const hideScrollbar = () => {
    if (scrollbarHideIgnoreTimer) {
        return
    }
    scrollbarHideIgnoreTimer = setTimeout(() => {
        scrollbarHideIgnoreTimer = null
    }, 500)
    for (const p of listReadyPages()) {
        p.send("hide-scrollbar")
    }
}

/**
 * Reset the scrollbar time based on an event.
 * @param {"none"|"scroll"|"move"} event
 */
const resetScrollbarTimer = (event = "none") => {
    const setting = getSetting("guiscrollbar")
    const timeout = getSetting("guihidetimeout")
    if (setting === "onmove" || setting === "onscroll") {
        if (event === "scroll" || setting === "onmove" && event !== "none") {
            clearTimeout(scrollbarHideTimer ?? undefined)
            showScrollbar()
            scrollbarHideTimer = setTimeout(
                () => hideScrollbar(), timeout)
        }
        return
    }
    if (setting === "always") {
        showScrollbar()
    } else {
        hideScrollbar()
    }
}

/** Return the list of last used tabs based on focus. */
const getLastTabIds = () => lastTabIds

module.exports = {
    add,
    applyLayout,
    exchange,
    firstSplit,
    getLastTabIds,
    hide,
    hideScrollbar,
    lastSplit,
    layoutDivById,
    moveFocus,
    nextSplit,
    only,
    previousSplit,
    resetResizing,
    resetScrollbarTimer,
    resize,
    restartSuspendTimeouts,
    rotateForward,
    rotateReverse,
    setLastUsedTab,
    showScrollbar,
    switchView,
    toTop
}
