/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2020 Jelmer van Arnhem
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
/* global POINTER MODES TABS SETTINGS UTIL */
"use strict"

let followNewtab = true
let alreadyFollowing = false
let links = []
let modeBeforeFollow = "normal"

const informPreload = () => {
    setTimeout(() => {
        if (TABS.currentPage().getAttribute("dom-ready")) {
            if (MODES.currentMode() === "follow" && !alreadyFollowing) {
                TABS.currentPage().send("follow-mode-start")
                informPreload()
            } else {
                TABS.currentPage().send("follow-mode-stop")
            }
        }
    }, 100)
}

const startFollow = (newtab = followNewtab) => {
    followNewtab = newtab
    document.getElementById("follow").textContent = ""
    modeBeforeFollow = MODES.currentMode()
    if (modeBeforeFollow === "follow") {
        modeBeforeFollow = "normal"
    }
    MODES.setMode("follow")
    alreadyFollowing = false
    informPreload()
    TABS.currentPage().send("follow-mode-start")
    document.getElementById("follow").style.display = "flex"
    links = []
}

const cancelFollow = () => {
    alreadyFollowing = false
    document.getElementById("follow").style.display = ""
    document.getElementById("follow").textContent = ""
    TABS.listPages().forEach(page => {
        try {
            page.send("follow-mode-stop")
        } catch (e) {
            // Cancel follow mode in all tabs
        }
    })
    links = []
}

const getModeBeforeFollow = () => modeBeforeFollow

const numberToKeys = (number, total) => {
    if (total < 27 || number < 26 && number > Math.floor(total / 26)) {
        return String.fromCharCode(65 + number)
    }
    if (number + 1 === total && number % 26 === 0) {
        return String.fromCharCode(65 + Math.floor(number / 26))
    }
    if (number % 26 === Math.floor(total / 26)) {
        if (number < 26 && total % 26 === 0) {
            return String.fromCharCode(65 + number % 26)
        }
    }
    const first = String.fromCharCode(65 + Math.floor(number / 26))
    const second = String.fromCharCode(65 + number % 26)
    return first + second
}

const linkInList = (list, link) => list.find(l => {
    if (!l || !link) {
        return false
    }
    return l.x === link.x && l.y === link.y && l.type === link.type
        && l.height === link.height && l.width === link.width
})

const clickAtLink = async link => {
    const factor = TABS.currentPage().getZoomFactor()
    if (["pointer", "visual"].includes(modeBeforeFollow)) {
        POINTER.start()
        if (modeBeforeFollow === "visual") {
            MODES.setMode("visual")
        }
        POINTER.move(
            (link.x + link.width / 2) * factor,
            (link.y + link.height / 2) * factor)
        return
    }
    if (link.url && link.type === "url" && UTIL.isUrl(link.url)) {
        TABS.navigateTo(link.url)
        return
    }
    MODES.setMode("insert")
    await new Promise(r => setTimeout(r, 5))
    TABS.currentPage().sendInputEvent({
        "type": "mouseEnter", "x": link.x * factor, "y": link.y * factor
    })
    TABS.currentPage().sendInputEvent({
        "type": "mouseDown",
        "x": (link.x + link.width / 2) * factor,
        "y": (link.y + link.height / 2) * factor,
        "button": "left",
        "clickCount": 1
    })
    TABS.currentPage().sendInputEvent({
        "type": "mouseUp",
        "x": (link.x + link.width / 2) * factor,
        "y": (link.y + link.height / 2) * factor,
        "button": "left",
        "clickCount": 1
    })
    TABS.currentPage().sendInputEvent({
        "type": "mouseLeave", "x": link.x * factor, "y": link.y * factor
    })
    document.getElementById("url-hover").style.display = "none"
}

const parseAndDisplayLinks = newLinks => {
    if (MODES.currentMode() !== "follow" || alreadyFollowing) {
        return
    }
    if (followNewtab) {
        newLinks = newLinks.filter(link => UTIL.hasProtocol(link.url))
        newLinks = newLinks.map(link => ({...link, "type": "url"}))
    }
    if (links.length) {
        for (let i = 0;i < links.length;i++) {
            if (!linkInList(newLinks, links[i])) {
                links[i] = null
            }
        }
        newLinks.filter(l => !linkInList(links, l)).forEach(newLink => {
            for (let i = 0;i < links.length;i++) {
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
    // The maximum amount of links is 26 * 26,
    // therefor the slice index is 0 to 26^2 - 1.
    links = links.slice(0, 675)
    const factor = TABS.currentPage().getZoomFactor()
    const followChildren = []
    links.forEach((link, index) => {
        if (!link) {
            return
        }
        // Show the link key in the top right
        const linkElement = document.createElement("span")
        linkElement.textContent = numberToKeys(index, links.length)
        linkElement.className = `follow-${link.type}`
        const characterWidth = SETTINGS.get("fontsize") / 1.3
        let borderRightMargin = characterWidth + SETTINGS.get("fontsize") * .2
        if (linkElement.textContent.length === 2) {
            borderRightMargin += characterWidth
        }
        let left = (link.x + link.width) * factor
        if (left > TABS.currentPage().scrollWidth - borderRightMargin) {
            left = TABS.currentPage().scrollWidth - borderRightMargin
        }
        linkElement.style.left = `${left}px`
        const top = Math.max(link.y * factor, 0)
        linkElement.style.top = `${top}px`
        linkElement.setAttribute("link-id", index)
        const onclickListener = async e => {
            if (e.button === 1 && UTIL.hasProtocol(link.url)) {
                MODES.setMode(modeBeforeFollow)
                TABS.addTab({"url": link.url})
            } else {
                await clickAtLink(link)
                if (link.type !== "inputs-insert") {
                    MODES.setMode(modeBeforeFollow)
                }
            }
        }
        linkElement.addEventListener("mouseup", onclickListener)
        followChildren.push(linkElement)
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
    })
    document.getElementById("follow").replaceChildren(...followChildren)
}

const enterKey = async id => {
    alreadyFollowing = true
    if (id.toLowerCase() === id.toUpperCase() || id.length > 1) {
        return
    }
    const stayInFollowMode = id.toUpperCase() === id
    const key = id.toUpperCase()
    const allLinkKeys = [...document.querySelectorAll("#follow span[link-id]")]
    const matches = []
    allLinkKeys.forEach(linkKey => {
        if (linkKey.textContent.startsWith(key)) {
            matches.push(linkKey)
            linkKey.textContent = linkKey.textContent.replace(key, "")
        } else {
            document.getElementById("follow").removeChild(linkKey)
        }
    })
    if (matches.length === 0) {
        MODES.setMode(modeBeforeFollow)
        if (stayInFollowMode) {
            startFollow()
        }
    } else if (matches.length === 1) {
        const link = links[matches[0].getAttribute("link-id")]
        if (followNewtab) {
            MODES.setMode("normal")
            if (stayInFollowMode) {
                startFollow()
            }
            TABS.addTab({
                "url": link.url,
                "inverted": false,
                "switchTo": !stayInFollowMode
            })
            return
        }
        await clickAtLink(link)
        if (stayInFollowMode) {
            MODES.setMode(modeBeforeFollow)
            startFollow()
        } else if (link.type !== "inputs-insert") {
            MODES.setMode(modeBeforeFollow)
        }
    }
}

module.exports = {
    startFollow,
    cancelFollow,
    parseAndDisplayLinks,
    enterKey,
    getModeBeforeFollow
}
