/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2021 Jelmer van Arnhem
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
    currentMode,
    getSetting,
    setStored,
    getStored,
    getMouseConf
} = require("./common")

const {propPixels} = require("../util")

let followNewtab = true
let alreadyFollowing = false
let links = []
const savedOrder = ["url", "onclick", "inputs-click", "inputs-insert"]

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

const startFollow = (newtab = followNewtab) => {
    followNewtab = newtab
    document.getElementById("follow").textContent = ""
    let modeBeforeFollow = currentMode()
    if (modeBeforeFollow === "follow") {
        modeBeforeFollow = "normal"
    }
    setStored("modebeforefollow", modeBeforeFollow)
    const {setMode} = require("./modes")
    setMode("follow")
    alreadyFollowing = false
    informPreload()
    currentPage().send("follow-mode-start")
    document.getElementById("follow").style.display = "flex"
}

const cancelFollow = () => {
    alreadyFollowing = false
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
        [...document.querySelectorAll(`.follow-${type}`)]
            .forEach(e => { e.style.zIndex = index + 10 })
        ;[...document.querySelectorAll(`.follow-${type}-border`)]
            .forEach(e => { e.style.zIndex = index + 5 })
    })
    ;[...document.querySelectorAll(`.follow-other`)]
        .forEach(e => { e.style.zIndex = 9 })
    ;[...document.querySelectorAll(`.follow-other-border`)]
        .forEach(e => { e.style.zIndex = 4 })
}

const parseAndDisplayLinks = receivedLinks => {
    if (currentMode() !== "follow" || alreadyFollowing) {
        return
    }
    let newLinks = receivedLinks
    if (followNewtab) {
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
    // The maximum amount of links is 26 * 26,
    // therefor the slice index is 0 to 26^2 - 1.
    links = links.slice(0, 675)
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
    const elemTypesToFollow = getSetting("followelement")
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
            linkElement.textContent = numberToKeys(index, links.length)
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
    document.getElementById("follow").replaceChildren(...followChildren)
    applyIndexedOrder()
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
            linkKey.remove()
        }
    })
    const {setMode} = require("./modes")
    if (matches.length === 0) {
        setMode(getStored("modebeforefollow"))
        if (stayInFollowMode) {
            startFollow()
        }
    } else if (matches.length === 1) {
        const link = links[matches[0].getAttribute("link-id")]
        if (followNewtab) {
            setMode("normal")
            if (stayInFollowMode) {
                startFollow()
            }
            const {addTab} = require("./tabs")
            addTab({
                "switchTo": !stayInFollowMode
                    && getSetting("follownewtabswitch"),
                "url": link.url
            })
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
    parseAndDisplayLinks,
    reorderDisplayedLinks,
    startFollow
}
