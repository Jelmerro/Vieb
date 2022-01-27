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
    listPages,
    currentPage,
    currentTab,
    currentMode,
    getSetting,
    setStored,
    getStored,
    getMouseConf
} = require("./common")

const {propPixels} = require("../util")

let followLinkDestination = "current"
let alreadyFollowing = false
let alreadyFilteringLinks = false
let links = []
const savedOrder = [
    "image", "media", "url", "onclick", "inputs-click", "inputs-insert"
]

const informPreload = () => {
    setTimeout(() => {
        if (currentPage().getAttribute("dom-ready")) {
            if (currentMode() === "follow" && !alreadyFollowing) {
                currentPage().send("follow-mode-start")
                informPreload()
            } else {
                currentPage().send("follow-mode-stop")
            }
        }
    }, 100)
}

const startFollow = (newtab = followLinkDestination) => {
    followLinkDestination = newtab || "current"
    document.getElementById("follow").textContent = ""
    let modeBeforeFollow = currentMode()
    if (modeBeforeFollow === "follow") {
        modeBeforeFollow = "normal"
    }
    if (!getStored("modebeforefollow") || modeBeforeFollow !== "insert") {
        setStored("modebeforefollow", modeBeforeFollow)
    }
    const {setMode} = require("./modes")
    setMode("follow")
    alreadyFollowing = false
    alreadyFilteringLinks = false
    informPreload()
    currentPage().send("follow-mode-start")
    document.getElementById("follow").style.display = "flex"
}

const cancelFollow = () => {
    alreadyFollowing = false
    alreadyFilteringLinks = false
    document.getElementById("follow").style.display = ""
    document.getElementById("follow").textContent = ""
    listPages().forEach(page => {
        try {
            page.send("follow-mode-stop")
        } catch {
            // Cancel follow mode in all tabs
        }
    })
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
    const allKeys = keys[setName] || setName.replace("custom:", "")
    return allKeys.split("")
}

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

const numberToKeys = (number, minLen = 0) => {
    const set = followChars()
    return digitListInCustomBase(number, set.length, minLen).map(
        d => set[d]).join("")
}

const linkInList = (list, link) => list.find(l => l && link && l.x === link.x
    && l.y === link.y && l.type === link.type && l.height === link.height
    && l.width === link.width && l.url === link.url)

const clickAtLink = async link => {
    const factor = currentPage().getZoomFactor()
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
        currentPage().send("focus-input",
            {"x": link.x + link.width / 2, "y": link.y + link.height / 2})
    } else {
        currentPage().sendInputEvent({
            "type": "mouseEnter", "x": link.x * factor, "y": link.y * factor
        })
        currentPage().sendInputEvent({
            "button": "left",
            "clickCount": 1,
            "type": "mouseDown",
            "x": (link.x + link.width / 2) * factor,
            "y": (link.y + link.height / 2) * factor
        })
        currentPage().sendInputEvent({
            "button": "left",
            "type": "mouseUp",
            "x": (link.x + link.width / 2) * factor,
            "y": (link.y + link.height / 2) * factor
        })
        currentPage().sendInputEvent({
            "type": "mouseLeave", "x": link.x * factor, "y": link.y * factor
        })
    }
    await new Promise(r => {
        setTimeout(r, 2)
    })
    document.getElementById("url-hover").style.display = "none"
}

const reorderDisplayedLinks = () => {
    savedOrder.push(savedOrder.shift())
    applyIndexedOrder()
}

const applyIndexedOrder = () => {
    savedOrder.forEach((type, index) => {
        const zIndex = index * 2
        ;[...document.querySelectorAll(`.follow-${type}`)]
            .forEach(e => { e.style.zIndex = zIndex + 9 })
        ;[...document.querySelectorAll(`.follow-${type}-border`)]
            .forEach(e => { e.style.zIndex = index + 10 })
    })
    ;[...document.querySelectorAll(`.follow-other`)]
        .forEach(e => { e.style.zIndex = 7 })
    ;[...document.querySelectorAll(`.follow-other-border`)]
        .forEach(e => { e.style.zIndex = 8 })
}

const parseAndDisplayLinks = receivedLinks => {
    if (currentMode() !== "follow" || alreadyFollowing) {
        return
    }
    const {updateUrl} = require("./tabs")
    updateUrl(currentPage(), true)
    let newLinks = receivedLinks
    if (followLinkDestination !== "current") {
        const {hasProtocol} = require("../util")
        newLinks = receivedLinks.filter(link => hasProtocol(link.url))
            .map(link => ({...link, "type": "url"}))
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
    const factor = currentPage().getZoomFactor()
    const followChildren = []
    const {scrollWidth} = currentPage()
    const fontsize = getSetting("fontsize")
    const styling = document.createElement("span")
    styling.className = "follow-url-border"
    document.getElementById("follow").appendChild(styling)
    const borderWidthOutline = propPixels(styling, "borderWidth")
    styling.className = "follow-url"
    let borderWidthKeys = propPixels(styling, "borderWidth") * 2
    borderWidthKeys += propPixels(styling, "paddingLeft")
    borderWidthKeys += propPixels(styling, "paddingRight")
    document.getElementById("follow").removeChild(styling)
    let elemTypesToFollow = getSetting("followelement")
    if (["pointer", "visual"].includes(getStored("modebeforefollow"))) {
        elemTypesToFollow = getSetting("followelementpointer")
    }
    const neededLength = numberToKeys(links.length).length
    links.forEach((link, index) => {
        if (!link) {
            return
        }
        if (elemTypesToFollow.includes(link.type)) {
            // Mouse listener
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
            borderElement.style.left = `${x}px`
            const y = link.y * factor
            borderElement.style.top = `${y}px`
            const width = link.width * factor
            borderElement.style.width = `${width}px`
            const height = link.height * factor
            borderElement.style.height = `${height}px`
            borderElement.addEventListener("mouseup", onclickListener)
            followChildren.push(borderElement)
            // Show the link key in the top right
            const linkElement = document.createElement("span")
            linkElement.textContent = numberToKeys(index, neededLength)
            linkElement.className = `follow-${link.type}`
            const charWidth = fontsize * 0.60191
            const linkElementWidth = charWidth * linkElement.textContent.length
                + borderWidthKeys + borderWidthOutline
            let left = width - borderWidthOutline
            if (x + width > scrollWidth - linkElementWidth) {
                left = scrollWidth - x - linkElementWidth
            }
            linkElement.style.left = `${left.toFixed(2)}px`
            linkElement.style.top = `-${borderWidthOutline}px`
            linkElement.setAttribute("link-id", index)
            linkElement.addEventListener("mouseup", onclickListener)
            borderElement.appendChild(linkElement)
        }
    })
    followChildren.forEach(el => {
        const link = el.querySelector("[link-id]")
        const sameStart = followChildren.find(f => f.textContent.trim()
            .startsWith(link.textContent.slice(1)) && f !== el)
        if (!sameStart && link.textContent.length > 1) {
            link.textContent = link.textContent.slice(1)
        }
    })
    document.getElementById("follow").replaceChildren(...followChildren)
    applyIndexedOrder()
}

const followFiltering = () => alreadyFilteringLinks

const enterKey = async(code, id, stayInFollowMode) => {
    alreadyFollowing = true
    const allLinkKeys = [...document.querySelectorAll("#follow span[link-id]")]
    const charsInLinks = followChars().map(c => c.toLowerCase())
    const {setMode} = require("./modes")
    const fallbackAction = getSetting("followfallbackaction")
    if (!code || !charsInLinks.includes(code.toLowerCase())) {
        if (fallbackAction === "exit") {
            return setMode(getStored("modebeforefollow"))
        }
        if (fallbackAction === "nothing") {
            return
        }
        if (!alreadyFilteringLinks) {
            alreadyFilteringLinks = true
            document.getElementById("url").value = ""
        }
        const {typeCharacterIntoNavbar} = require("./input")
        typeCharacterIntoNavbar(id, true)
        const filterText = document.getElementById("url").value.toLowerCase()
        const visibleLinks = []
        allLinkKeys.forEach(linkKey => {
            const link = links[linkKey.getAttribute("link-id")]
            if (link.text.toLowerCase().includes(filterText)
                || link.url?.toLowerCase().includes(filterText)) {
                linkKey.style.display = null
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
    const matches = []
    allLinkKeys.forEach(linkKey => {
        if (linkKey.textContent.toLowerCase().startsWith(code.toLowerCase())) {
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
        const link = links[matches[0].getAttribute("link-id")]
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
            } else {
                const currentTabId = currentTab().getAttribute("link-id")
                addTab({
                    "container": getSetting("containersplitpage"),
                    "url": link.url
                })
                const {add} = require("./pagelayout")
                const opposite = followLinkDestination === "ver"
                    && !getSetting("splitbelow")
                    || followLinkDestination === "hor"
                    && !getSetting("splitright")
                add(currentTabId, followLinkDestination, !opposite)
            }
            return
        }
        await clickAtLink(link)
        if (link.type !== "inputs-insert") {
            setMode(getStored("modebeforefollow"))
            if (stayInFollowMode) {
                startFollow()
            }
        }
    }
}

module.exports = {
    cancelFollow,
    enterKey,
    followFiltering,
    parseAndDisplayLinks,
    reorderDisplayedLinks,
    startFollow
}
