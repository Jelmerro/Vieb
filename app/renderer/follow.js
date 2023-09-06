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

const {ipcRenderer, clipboard} = require("electron")
const {
    currentPage,
    currentTab,
    currentMode,
    getSetting,
    setStored,
    getStored,
    getMouseConf,
    getUrl
} = require("./common")
const {sendToPageOrSubFrame} = require("../util")

/**
 * @typedef {object} FollowLink
 * @property {number} x The x location of the element.
 * @property {number} y The y location of the element.
 * @property {number} width The width of the element.
 * @property {number} height The height of the element.
 * @property {string} text The textContent of the element, possibly empty.
 * @property {string} type The type of element.
 * @property {string} url The href url attribute of the element, possibly empty.
 */

/** @type {FollowLink|null} */
let hoverLink = null
/** @type {"current"|"newtab"|"copylink"|"hor"|"ver"} */
let followLinkDestination = "current"
let alreadyFollowing = false
let alreadyFilteringLinks = false
/** @type {(FollowLink|null)[]} */
let links = []
const savedOrder = [
    "image", "media", "url", "onclick", "inputs-click", "inputs-insert"
]

const init = () => {
    ipcRenderer.on("follow-response", (_, l) => parseAndDisplayLinks(l))
    document.addEventListener("mouseleave", () => emptyHoverLink())
}

const informPreload = (first = false) => {
    let elemTypesToFollow = getSetting("followelement")
    if (["pointer", "visual"].includes(getStored("modebeforefollow"))) {
        elemTypesToFollow = getSetting("followelementpointer")
    }
    if (followLinkDestination !== "current") {
        elemTypesToFollow = "url"
    }
    if (first) {
        ipcRenderer.send("follow-mode-start", currentPage()?.getWebContentsId(),
            elemTypesToFollow, true)
    }
    setTimeout(() => {
        if (currentPage()?.getAttribute("dom-ready")) {
            if (currentMode() === "follow" && !alreadyFollowing) {
                ipcRenderer.send("follow-mode-start",
                    currentPage()?.getWebContentsId(), elemTypesToFollow)
                informPreload()
            } else {
                ipcRenderer.send("follow-mode-stop")
            }
        }
    }, 100)
}

/**
 * Start follow mode and open links at the provided location once done.
 * @param {"current"|"newtab"|"copylink"|"hor"|"ver"} dest
 */
const startFollow = (dest = followLinkDestination) => {
    followLinkDestination = dest || "current"
    const followEl = document.getElementById("follow")
    if (!followEl) {
        return
    }
    followEl.textContent = ""
    const modeBeforeFollow = currentMode()
    if (!["follow", "insert"].includes(modeBeforeFollow)) {
        setStored("modebeforefollow", modeBeforeFollow)
    }
    const {setMode} = require("./modes")
    setMode("follow")
    alreadyFollowing = false
    alreadyFilteringLinks = false
    hoverLink = null
    informPreload(true)
    followEl.style.display = "flex"
}

const cancelFollow = () => {
    alreadyFollowing = false
    alreadyFilteringLinks = false
    hoverLink = null
    const followEl = document.getElementById("follow")
    if (followEl) {
        followEl.style.display = ""
        followEl.textContent = ""
    }
    ipcRenderer.send("follow-mode-stop")
}

const followChars = () => {
    const keys = {
        "all": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`-=[]\\;',./",
        "alpha": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "alphanum": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        "dvorakhome": "AOEUIDHTNS",
        "numbers": "0123456789",
        "qwertyhome": "ASDFGHJKL;"
    }
    const setName = getSetting("followchars")
    let allKeys = setName.replace("custom:", "")

    /**
     * Check if a provided set name is a built-in one or a custom one.
     * @param {string} set
     * @returns {set is keyof typeof keys}
     */
    const validFollowSet = set => set in keys

    if (validFollowSet(setName)) {
        allKeys = keys[setName]
    }
    return allKeys.split("")
}

/**
 * Generate a unique list of digits for a number based on a custom set of chars.
 * @param {number} number
 * @param {number} base
 * @param {number} minLen
 */
const digitListInCustomBase = (number, base, minLen = 0) => {
    const digits = []
    let num = Number(number)
    while (num >= 1) {
        digits.unshift(Math.floor(num % base))
        num /= base
    }
    while (digits.length < minLen) {
        digits.unshift(0)
    }
    return digits
}

/**
 * Translate a number to a unique string using the chars from followchars.
 * @param {number} number
 * @param {number} minLen
 */
const numberToKeys = (number, minLen = 0) => {
    const set = followChars()
    return digitListInCustomBase(number, set.length, minLen).map(
        d => set[d]).join("")
}

/**
 * Check if a really similar follow link is in a given list.
 * @param {(FollowLink|null)[]} list
 * @param {FollowLink|null} link
 */
const linkInList = (list, link) => list.some(l => l && link && l.x === link.x
    && l.y === link.y && l.type === link.type && l.height === link.height
    && l.width === link.width && l.url === link.url)

/**
 * Click on a follow link.
 * @param {FollowLink} link
 */
const clickAtLink = async link => {
    const factor = currentPage()?.getZoomFactor() ?? 1
    const {setMode} = require("./modes")
    if (["pointer", "visual"].includes(getStored("modebeforefollow"))) {
        const {start, move} = require("./pointer")
        start()
        if (getStored("modebeforefollow") === "visual") {
            setMode("visual")
        }
        move((link.x + link.width / 2) * factor,
            (link.y + link.height / 2) * factor)
        return
    }
    const {isUrl} = require("../util")
    if (link.url && link.type === "url" && isUrl(link.url)) {
        const {navigateTo} = require("./tabs")
        navigateTo(link.url)
        return
    }
    setMode("insert")
    await new Promise(r => {
        setTimeout(r, 2)
    })
    if (link.type === "inputs-insert") {
        sendToPageOrSubFrame("focus-input",
            {"x": link.x + link.width / 2, "y": link.y + link.height / 2})
    } else {
        sendToPageOrSubFrame("send-input-event", {
            "type": "click",
            "x": (link.x + link.width / 2) * factor,
            "y": (link.y + link.height / 2) * factor
        })
    }
    await new Promise(r => {
        setTimeout(r, 2)
    })
    const hoverEl = document.getElementById("url-hover")
    if (hoverEl) {
        hoverEl.style.display = "none"
    }
}

const reorderDisplayedLinks = () => {
    savedOrder.push(savedOrder.shift() ?? "")
    applyIndexedOrder()
}

const applyIndexedOrder = () => {
    savedOrder.forEach((type, index) => {
        [...document.querySelectorAll(`.follow-${type}`)].forEach(e => {
            if (e instanceof HTMLElement) {
                e.style.zIndex = `${index + 10 + savedOrder.length}`
            }
        })
        ;[...document.querySelectorAll(`.follow-${type}-border`)].forEach(e => {
            if (e instanceof HTMLElement) {
                e.style.zIndex = `${index + 9}`
            }
        })
    })
    ;[...document.querySelectorAll(`.follow-other`)].forEach(e => {
        if (e instanceof HTMLElement) {
            e.style.zIndex = "8"
        }
    })
    ;[...document.querySelectorAll(`.follow-other-border`)].forEach(e => {
        if (e instanceof HTMLElement) {
            e.style.zIndex = "7"
        }
    })
}

const emptyHoverLink = () => {
    hoverLink = null
    if (alreadyFollowing) {
        [...document.querySelectorAll(`#follow .hover`)]
            .forEach(el => el.classList.remove("hover"))
    }
}

/**
 * Get a writable DOMRect for any Element.
 * @param {Element} el
 */
const getWritableDOMRect = el => {
    const {
        top, right, bottom, left, width, height, x, y
    } = el?.getBoundingClientRect() ?? {}
    return {bottom, height, left, right, top, width, x, y}
}

/**
 * Parse the received links and add them to the follow element to be picked.
 * @param {(FollowLink|null)[]} receivedLinks
 */
const parseAndDisplayLinks = receivedLinks => {
    if (currentMode() !== "follow" || alreadyFollowing) {
        return
    }
    const followEl = document.getElementById("follow")
    const page = currentPage()
    if (!followEl || !page) {
        return
    }
    const {updateUrl} = require("./tabs")
    updateUrl(page, true)
    let newLinks = receivedLinks
    if (followLinkDestination !== "current") {
        const {hasProtocol} = require("../util")
        newLinks = receivedLinks.flatMap(link => {
            if (!link || !hasProtocol(link.url)) {
                return []
            }
            return {...link, "type": "url"}
        })
    }
    if (links.length) {
        for (let i = 0; i < links.length; i++) {
            if (!linkInList(newLinks, links[i])) {
                links[i] = null
            }
        }
        newLinks.filter(l => !linkInList(links, l)).forEach(newLink => {
            for (let i = 0; i < links.length; i++) {
                if (!links[i]) {
                    links[i] = newLink
                    return
                }
            }
            if (!linkInList(links, newLink)) {
                links.push(newLink)
            }
        })
    } else {
        links = newLinks
    }
    while (!links[links.length - 1] && links.length) {
        links.pop()
    }
    const baseDims = getWritableDOMRect(followEl)
    baseDims.right = window.innerWidth - baseDims.left - baseDims.width
    baseDims.bottom = window.innerHeight - baseDims.top - baseDims.height
    const elWidth = document.querySelector("#follow [link-id]")
        ?.getBoundingClientRect()?.width ?? 0
    const factor = currentPage()?.getZoomFactor() ?? 1
    /** @type {HTMLSpanElement[]} */
    const followChildren = []
    const neededLength = numberToKeys(links.length).length
    const followlabelposition = getSetting("followlabelposition")
    links.forEach((link, index) => {
        if (!link) {
            return
        }

        /**
         * Add an onclick listener to mouseup events to click on the links.
         * @param {MouseEvent} e
         */
        const onclickListener = async e => {
            if (!getMouseConf("follow")) {
                return
            }
            const {isUrl} = require("../util")
            const {setMode} = require("./modes")
            if (e.button === 1 && link.type === "url" && isUrl(link.url)) {
                setMode(getStored("modebeforefollow"))
                const {addTab} = require("./tabs")
                addTab({
                    "switchTo": getSetting("mousenewtabswitch"),
                    "url": link.url
                })
            } else {
                await clickAtLink(link)
                if (link.type !== "inputs-insert") {
                    if (e.button === 0) {
                        setMode(getStored("modebeforefollow"))
                    } else {
                        startFollow()
                    }
                }
            }
        }

        // Show a border around the link
        const borderElement = document.createElement("span")
        borderElement.className = `follow-${link.type}-border`
        const x = link.x * factor
        const y = link.y * factor
        const width = link.width * factor
        const height = link.height * factor
        if (linkInList([link], hoverLink)) {
            borderElement.classList.add("hover")
        }
        borderElement.style.left = `${x}px`
        borderElement.style.top = `${y}px`
        borderElement.style.width = `${width}px`
        borderElement.style.height = `${height}px`
        borderElement.addEventListener("mouseup", onclickListener)
        borderElement.addEventListener("mousemove", () => {
            if (!getMouseConf("follow")) {
                hoverLink = null
                borderElement.classList.remove("hover")
                return
            }
            hoverLink = link
            borderElement.classList.add("hover")
            if (alreadyFollowing) {
                [...document.querySelectorAll(`#follow .hover`)]
                    .filter(el => el !== borderElement)
                    .forEach(el => el.classList.remove("hover"))
            }
        })
        followChildren.push(borderElement)
        // Show the link key in the preferred position
        const linkElement = document.createElement("span")
        linkElement.textContent = numberToKeys(index, neededLength)
        linkElement.className = `follow-${link.type}`
        /** @type {{[alignment: string]: {
         *   left?: number,
         *   right?: number,
         *   top?: number,
         *   bottom?: number,
         *   transform?: string
         * }}} */
        const alignmentDict = {
            "center": {
                "left": x + width / 2,
                "top": y + height / 2,
                "transform": "translateX(-50%) translateY(-50%)"
            },
            "cornerbottomleft": {"right": x, "top": y + height},
            "cornerbottomright": {"left": x + width, "top": y + height},
            "cornertopleft": {"bottom": y, "right": x},
            "cornertopright": {"bottom": y, "left": x + width},
            "insidebottomcenter": {
                "bottom": y + height,
                "left": x + width / 2,
                "transform": "translateX(-50%)"
            },
            "insidebottomleft": {"bottom": y + height, "left": x},
            "insidebottomright": {"bottom": y + height, "right": x + width},
            "insideleftcenter": {
                "left": x,
                "top": y + height / 2,
                "transform": "translateY(-50%)"
            },
            "insiderightcenter": {
                "right": x + width,
                "top": y + height / 2,
                "transform": "translateY(-50%)"
            },
            "insidetopcenter": {
                "left": x + width / 2,
                "top": y,
                "transform": "translateX(-50%)"
            },
            "insidetopleft": {"left": x, "top": y},
            "insidetopright": {"right": x + width, "top": y},
            "outsidebottomcenter": {
                "left": x + width / 2,
                "top": y + height,
                "transform": "translateX(-50%)"
            },
            "outsidebottomleft": {"left": x, "top": y + height},
            "outsidebottomright": {"right": x + width, "top": y + height},
            "outsideleftbottom": {"bottom": y + height, "right": x},
            "outsideleftcenter": {
                "right": x,
                "top": y + height / 2,
                "transform": "translateY(-50%)"
            },
            "outsidelefttop": {"right": x, "top": y},
            "outsiderightbottom": {"bottom": y + height, "left": x + width},
            "outsiderightcenter": {
                "left": x + width,
                "top": y + height / 2,
                "transform": "translateY(-50%)"
            },
            "outsiderighttop": {"left": x + width, "top": y},
            "outsidetopcenter": {
                "bottom": y,
                "left": x + width / 2,
                "transform": "translateX(-50%)"
            },
            "outsidetopleft": {"bottom": y, "left": x},
            "outsidetopright": {"bottom": y, "right": x + width}
        }
        const alignment = alignmentDict[followlabelposition]
        /** @type {("left"|"top"|"right"|"bottom"|"transform")[]} */
        const alignmentProps = ["left", "top", "right", "bottom", "transform"]
        for (const align of alignmentProps) {
            if (alignment[align] !== undefined) {
                let value = alignment[align]
                if (align === "left" && elWidth && typeof value === "number") {
                    if (value > baseDims.width + baseDims.right - elWidth) {
                        value = baseDims.width + baseDims.right
                        linkElement.style.transform += "translateX(-100%) "
                    }
                }
                if (align === "top" && elWidth && typeof value === "number") {
                    if (value > baseDims.height + baseDims.bottom - elWidth) {
                        value = baseDims.height + baseDims.bottom
                        linkElement.style.transform += "translateY(-100%) "
                    }
                }
                if (align === "right" && typeof value === "number") {
                    if (elWidth && value + baseDims.left < elWidth) {
                        value = 0
                        linkElement.style.transform += "translateX(100%) "
                    }
                    value = baseDims.width - value
                }
                if (align === "bottom" && typeof value === "number") {
                    if (elWidth && value + baseDims.top < elWidth) {
                        value = 0
                        linkElement.style.transform += "translateY(100%) "
                    }
                    value = baseDims.height - value
                }
                if (align === "transform" && value) {
                    linkElement.style.transform += value
                } else if (typeof value === "number") {
                    linkElement.style[align] = `${value.toFixed(2)}px`
                }
            }
        }
        if (linkInList([link], hoverLink)) {
            borderElement.classList.add("hover")
        }
        linkElement.setAttribute("link-id", `${index}`)
        linkElement.addEventListener("mouseup", onclickListener)
        linkElement.addEventListener("mousemove", () => {
            if (!getMouseConf("follow")) {
                hoverLink = null
                borderElement.classList.remove("hover")
                return
            }
            hoverLink = link
            borderElement.classList.add("hover")
            if (alreadyFollowing) {
                [...document.querySelectorAll(`#follow .hover`)]
                    .filter(el => el !== borderElement)
                    .forEach(el => el.classList.remove("hover"))
            }
        })
        followChildren.push(linkElement)
    })
    followEl.replaceChildren(...followChildren)
    applyIndexedOrder()
}

const followFiltering = () => alreadyFilteringLinks

/**
 * Enter a follow mode key and narrow down results.
 * @param {string} code
 * @param {string} id
 * @param {boolean} stayInFollowMode
 */
const enterKey = async(code, id, stayInFollowMode) => {
    alreadyFollowing = true
    /** @type {HTMLSpanElement[]} */
    // @ts-expect-error query selector only selects span elements
    const allLinkKeys = [...document.querySelectorAll("#follow span[link-id]")]
    const charsInLinks = followChars().map(c => c.toLowerCase())
    const {setMode} = require("./modes")
    const fallbackAction = getSetting("followfallbackaction")
    const url = getUrl()
    if (!code || !charsInLinks.includes(code.toLowerCase())) {
        if (fallbackAction === "exit") {
            return setMode(getStored("modebeforefollow"))
        }
        if (fallbackAction === "nothing") {
            return
        }
        if (!alreadyFilteringLinks && url) {
            alreadyFilteringLinks = true
            url.value = ""
        }
        const {typeCharacterIntoNavbar} = require("./input")
        typeCharacterIntoNavbar(id, true)
        const filterText = url?.value.toLowerCase()
        /** @type {HTMLSpanElement[]} */
        const visibleLinks = []
        allLinkKeys.forEach(linkKey => {
            const link = links[Number(linkKey.getAttribute("link-id") ?? -1)]
            if (filterText !== undefined
                && (link?.text.toLowerCase().includes(filterText)
                || link?.url.toLowerCase().includes(filterText))) {
                linkKey.style.display = ""
                visibleLinks.push(linkKey)
            } else {
                linkKey.style.display = "none"
            }
        })
        const neededLength = numberToKeys(visibleLinks.length).length
        visibleLinks.forEach((linkKey, index) => {
            linkKey.textContent = numberToKeys(index, neededLength)
        })
        return
    }
    /** @type {HTMLSpanElement[]} */
    const matches = []
    allLinkKeys.forEach(linkKey => {
        if (linkKey.textContent?.toLowerCase().startsWith(code.toLowerCase())) {
            if (getComputedStyle(linkKey).display !== "none") {
                matches.push(linkKey)
            }
            linkKey.textContent = linkKey.textContent.slice(1)
        } else {
            linkKey.remove()
        }
    })
    if (matches.length === 0) {
        if (fallbackAction === "exit") {
            setMode(getStored("modebeforefollow"))
            if (stayInFollowMode) {
                startFollow()
            }
        } else {
            startFollow()
        }
    } else if (matches.length === 1) {
        const link = links[Number(matches[0].getAttribute("link-id") ?? -1)]
        if (!link) {
            setMode("normal")
            return
        }
        if (followLinkDestination !== "current") {
            setMode("normal")
            if (stayInFollowMode) {
                startFollow()
            }
            const {addTab} = require("./tabs")
            if (followLinkDestination === "newtab") {
                addTab({
                    "switchTo": !stayInFollowMode
                        && getSetting("follownewtabswitch"),
                    "url": link.url
                })
            } else if (followLinkDestination === "copylink") {
                clipboard.writeText(link.url)
            } else {
                const currentTabId = currentTab()?.getAttribute("link-id")
                addTab({
                    "container": getSetting("containersplitpage"),
                    "url": link.url
                })
                const {add} = require("./pagelayout")
                const opposite = followLinkDestination === "ver"
                    && !getSetting("splitbelow")
                    || followLinkDestination === "hor"
                    && !getSetting("splitright")
                if (currentTabId) {
                    add(currentTabId, followLinkDestination, !opposite)
                }
            }
            return
        }
        await clickAtLink(link)
        if (link.type !== "inputs-insert" || stayInFollowMode) {
            setMode(getStored("modebeforefollow"))
            if (stayInFollowMode) {
                startFollow()
            }
        }
    }
}

module.exports = {
    cancelFollow,
    emptyHoverLink,
    enterKey,
    followFiltering,
    init,
    reorderDisplayedLinks,
    startFollow
}
