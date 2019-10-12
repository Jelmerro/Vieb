/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019 Jelmer van Arnhem
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
/* global MODES TABS SETTINGS UTIL */
"use strict"

let followNewtab = true
let alreadyFollowing = false
let links = []

const informPreload = () => {
    setTimeout(() => {
        if (MODES.currentMode() === "follow" && !alreadyFollowing) {
            TABS.currentPage().getWebContents().send("follow-mode-start")
            informPreload()
        } else {
            TABS.currentPage().getWebContents().send("follow-mode-stop")
        }
    }, 100)
}

const startFollow = (newtab=followNewtab) => {
    followNewtab = newtab
    document.getElementById("follow").textContent = ""
    MODES.setMode("follow")
    alreadyFollowing = false
    informPreload()
    TABS.currentPage().getWebContents().send("follow-mode-start")
    document.getElementById("follow").style.display = "flex"
    links = []
}

const cancelFollow = () => {
    alreadyFollowing = false
    document.getElementById("follow").style.display = ""
    document.getElementById("follow").textContent = ""
    TABS.currentPage().getWebContents().send("follow-mode-stop")
    links = []
}

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

const linkInList = (list, link) => {
    return list.find(l => {
        if (!l || !link) {
            return false
        }
        return l.x === link.x && l.y === link.y && l.type === link.type
            && l.height === link.height && l.width === link.width
    })
}

const parseAndDisplayLinks = newLinks => {
    if (MODES.currentMode() !== "follow" || alreadyFollowing) {
        return
    }
    //The maximum amount of links is 26 * 26,
    //therefor the slice index is 0 to 26^2 - 1
    if (followNewtab) {
        newLinks = newLinks.filter(link => UTIL.hasProtocol(link.url))
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
    links = links.slice(0, 675)
    const factor = TABS.currentPage().getZoomFactor()
    const followElement = document.getElementById("follow")
    followElement.textContent = ""
    links.forEach((link, index) => {
        if (!link) {
            return
        }
        //Show the link key in the top right
        const linkElement = document.createElement("span")
        linkElement.textContent = numberToKeys(index, links.length)
        linkElement.className = `follow-${link.type}`
        const characterWidth = SETTINGS.get("fontSize") / 1.3
        let borderRightMargin = characterWidth + SETTINGS.get("fontSize") * 0.2
        if (linkElement.textContent.length === 2) {
            borderRightMargin += characterWidth
        }
        let left = (link.x + link.width) * factor
        if (left > window.innerWidth - borderRightMargin) {
            left = window.innerWidth - borderRightMargin
        }
        linkElement.style.left = `${left}px`
        const top = Math.max(link.y * factor, 0)
        linkElement.style.top = `${top}px`
        linkElement.setAttribute("link-id", index)
        followElement.appendChild(linkElement)
        //Show a border around the link
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
        followElement.appendChild(borderElement)
    })
}

const enterKey = identifier => {
    alreadyFollowing = true
    if (identifier.includes("-")) {
        return
    }
    if (!identifier.startsWith("Key")) {
        return
    }
    const key = identifier.replace("Key", "")
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
        MODES.setMode("normal")
    }
    if (matches.length === 1) {
        const link = links[matches[0].getAttribute("link-id")]
        if (followNewtab) {
            MODES.setMode("normal")
            TABS.addTab(link.url)
            return
        }
        const factor = TABS.currentPage().getZoomFactor()
        if (link.type === "inputs-insert") {
            MODES.setMode("normal")
        }
        MODES.setMode("insert")
        TABS.currentPage().sendInputEvent({
            "type": "mouseEnter",
            "x": link.x * factor,
            "y": link.y * factor
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
            "type": "mouseLeave",
            "x": link.x * factor,
            "y": link.y * factor
        })
        if (link.type !== "inputs-insert") {
            MODES.setMode("normal")
        }
    }
}

module.exports = {
    startFollow,
    cancelFollow,
    parseAndDisplayLinks,
    enterKey
}
