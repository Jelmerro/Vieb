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
let links = []

const startFollowCurrentTab = () => {
    followNewtab = false
    startFollow()
}

const startFollowNewTab = () => {
    followNewtab = true
    startFollow()
}

const startFollow = () => {
    document.getElementById("follow").textContent = ""
    if (!SETTINGS.get("allowFollowModeDuringLoad")) {
        if (TABS.currentPage().src === ""
                || TABS.currentPage().isLoadingMainFrame()) {
            UTIL.notify("Follow mode will be available when the page is "
                + "done loading\nOr you could change the setting"
                + "'allowFollowModeDuringLoad'")
            return
        }
    }
    MODES.setMode("follow")
    TABS.currentPage().getWebContents().send("follow-mode-request", "hi")
    document.getElementById("follow").style.display = "flex"
}

const cancelFollow = () => {
    MODES.setMode("normal")
    document.getElementById("follow").style.display = ""
    document.getElementById("follow").textContent = ""
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

const parseAndDisplayLinks = l => {
    if (MODES.currentMode() !== "follow") {
        return
    }
    //The maximum amount of links is 26 * 26,
    //therefor the slice index is 0 to 26^2 - 1
    if (followNewtab) {
        l = l.filter(link => UTIL.isUrl(link.url))
    }
    links = l.slice(0, 675)
    if (links.length === 0) {
        UTIL.notify("No links are visible on the page to follow", "warn")
        cancelFollow()
        return
    }
    const factor = TABS.currentPage().getZoomFactor()
    const followElement = document.getElementById("follow")
    links.forEach((link, index) => {
        //Show the link key in the top right
        const linkElement = document.createElement("span")
        linkElement.textContent = numberToKeys(index, links.length)
        linkElement.className = `follow-${link.type}`
        const characterWidth = SETTINGS.get("fontSize") / 1.3
        let borderRightMargin = characterWidth + 4
        if (linkElement.textContent.length === 2) {
            borderRightMargin += characterWidth
        }
        let left = (link.x + link.width) * factor + 1
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
        if (followNewtab) {
            TABS.addTab(link.url)
            cancelFollow()
            return
        }
        const factor = TABS.currentPage().getZoomFactor()
        if (link.type === "inputs-insert") {
            cancelFollow()
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
        //TODO add a mouseLeave event when there is a proper way to hover links
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
