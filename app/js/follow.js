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
/* global MODES TABS */
"use strict"
let followNewtab = true
let links = []

const startFollowCurrentTab = () => {
    startFollow()
    followNewtab = false
}

const startFollowNewTab = () => {
    startFollow()
    followNewtab = true
}

const startFollow = () => {
    document.getElementById("follow").innerHTML = ""
    if (TABS.currentPage().src === "" || TABS.currentPage().isLoading()) {
        //TODO notify the user that follow mode is unavailable during loads
    } else {
        MODES.setMode("follow")
        TABS.currentPage().getWebContents().send("follow-mode-request", "hi")
        document.getElementById("follow").style.display = "flex"
    }
}

const cancelFollow = () => {
    MODES.setMode("normal")
    document.getElementById("follow").style.display = ""
    document.getElementById("follow").innerHTML = ""
}

const numberToKeys = (number, total) => {
    if (total < 26 || (number < 26 && number > Math.floor(total / 26))) {
        return String.fromCharCode(65 + number)
    }
    const first = String.fromCharCode(65 + Math.floor(number / 26))
    const second = String.fromCharCode(65 + (number % 26))
    return first + second
}

const parseAndDisplayLinks = l => {
    if (MODES.currentMode() !== "follow") {
        return
    }
    links = l
    if (links.length === 0) {
        cancelFollow()
        return
    }
    const followElement = document.getElementById("follow")
    //Regular anchor tags
    links.forEach((link, index) => {
        const linkElement = document.createElement("span")
        linkElement.textContent = numberToKeys(index, links.length)
        linkElement.className = `follow-${link.type}`
        //TODO sometimes they are not visible on the complete right of the page
        linkElement.style.left = `${link.x+link.width}px`
        linkElement.style.top = `${link.y}px`
        linkElement.setAttribute("link-id", index)
        followElement.appendChild(linkElement)
        const borderElement = document.createElement("span")
        borderElement.className = `follow-${link.type}-border`
        borderElement.style.left = `${link.x}px`
        borderElement.style.top = `${link.y}px`
        borderElement.style.width = `${link.width}px`
        borderElement.style.height = `${link.height}px`
        followElement.appendChild(borderElement)
    })
}

const enterKey = identifier => {
    if (identifier.indexOf("-") !== -1) {
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
        cancelFollow()
    }
    if (matches.length === 1) {
        const link = links[matches[0].getAttribute("link-id")]
        //TODO improve url check to work for more urls
        if (link.url.trim() !== "") {
            if (followNewtab) {
                TABS.addTab(link.url)
            } else {
                TABS.navigateTo(link.url)
            }
            cancelFollow()
            return
        }
        if (link.type === "inputs-insert") {
            cancelFollow()
        }
        MODES.setMode("insert")
        TABS.currentPage().sendInputEvent({
            "type": "mouseEnter",
            "x": link.x,
            "y": link.y
        })
        TABS.currentPage().sendInputEvent({
            "type": "mouseDown",
            "x": link.x + (link.width / 2),
            "y": link.y + (link.height / 2),
            "button": "left",
            "clickCount": 1
        })
        TABS.currentPage().sendInputEvent({
            "type": "mouseUp",
            "x": link.x + (link.width / 2),
            "y": link.y + (link.height / 2),
            "button": "left",
            "clickCount": 1
        })
        TABS.currentPage().sendInputEvent({
            "type": "mouseLeave",
            "x": link.x,
            "y": link.y
        })
        if (link.type !== "inputs-insert") {
            cancelFollow()
        }
    }
}

module.exports = {
    startFollowCurrentTab,
    startFollowNewTab,
    startFollow,
    cancelFollow,
    parseAndDisplayLinks,
    enterKey
}
