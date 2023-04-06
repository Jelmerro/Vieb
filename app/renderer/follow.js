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
    getMouseConf
} = require("./common")
const {propPixels, sendToPageOrSubFrame} = require("../util")

let hoverLink = null
let followLinkDestination = "current"
let alreadyFollowing = false
let alreadyFilteringLinks = false
let links = []
const savedOrder = [
    "image", "media", "url", "onclick", "inputs-click", "inputs-insert"
]

const init = () => {
    ipcRenderer.on("follow-response", (_, l) => parseAndDisplayLinks(l))
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
        ipcRenderer.send("follow-mode-start", currentPage().getWebContentsId(),
            elemTypesToFollow, true)
    }
    setTimeout(() => {
        if (currentPage().getAttribute("dom-ready")) {
            if (currentMode() === "follow" && !alreadyFollowing) {
                ipcRenderer.send("follow-mode-start",
                    currentPage().getWebContentsId(), elemTypesToFollow)
                informPreload()
            } else {
                ipcRenderer.send("follow-mode-stop")
            }
        }
    }, 100)
}

const startFollow = (newtab = followLinkDestination) => {
    followLinkDestination = newtab || "current"
    document.getElementById("follow").textContent = ""
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
    document.getElementById("follow").style.display = "flex"
}

const cancelFollow = () => {
    alreadyFollowing = false
    alreadyFilteringLinks = false
    hoverLink = null
    document.getElementById("follow").style.display = ""
    document.getElementById("follow").textContent = ""
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
    document.getElementById("url-hover").style.display = "none"
}

const reorderDisplayedLinks = () => {
    savedOrder.push(savedOrder.shift())
    applyIndexedOrder()
}

const applyIndexedOrder = () => {
    savedOrder.forEach((type, index) => {
        [...document.querySelectorAll(`.follow-${type}`)]
            .forEach(e => { e.style.zIndex = index + 10 + savedOrder.length })
        ;[...document.querySelectorAll(`.follow-${type}-border`)]
            .forEach(e => { e.style.zIndex = index + 9 })
    })
    ;[...document.querySelectorAll(`.follow-other`)]
        .forEach(e => { e.style.zIndex = 8 })
    ;[...document.querySelectorAll(`.follow-other-border`)]
        .forEach(e => { e.style.zIndex = 7 })
}

const emptyHoverLink = () => {
    hoverLink = null
    if (alreadyFollowing) {
        [...document.querySelectorAll(`#follow .hover`)]
            .forEach(el => el.classList.remove("hover"))
    }
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
    const {scrollWidth, scrollHeight} = currentPage()
    const fontsize = getSetting("guifontsize")
    const styling = document.createElement("span")
    styling.className = "follow-url-border"
    document.getElementById("follow").appendChild(styling)
    const borderWidthOutline = propPixels(styling, "borderWidth")
    styling.className = "follow-url"
    let borderWidthKeys = propPixels(styling, "borderWidth") * 2
    borderWidthKeys += propPixels(styling, "paddingLeft")
    borderWidthKeys += propPixels(styling, "paddingRight")
    document.getElementById("follow").removeChild(styling)
    const neededLength = numberToKeys(links.length).length
    const followlabelposition = getSetting("followlabelposition")
    const linkElementHeight = fontsize + borderWidthKeys + borderWidthOutline
    links.forEach((link, index) => {
        if (!link) {
            return
        }
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
        const charWidth = fontsize * 0.52
        const linkElementWidth = charWidth * linkElement.textContent.length
            + borderWidthKeys + borderWidthOutline
        let left = {
            "cornerbottomleft": x - linkElementWidth,
            "cornerbottomright": x + width,
            "cornertopleft": x - linkElementWidth,
            "cornertopright": x + width,
            "insidebottomcenter": x + width / 2 - linkElementWidth / 2,
            "insidebottomleft": x,
            "insidebottomright": x + width - linkElementWidth,
            "insideleftcenter": x,
            "insiderightcenter": x + width - linkElementWidth,
            "insidetopcenter": x + width / 2 - linkElementWidth / 2,
            "insidetopleft": x,
            "insidetopright": x + width - linkElementWidth,
            "outsidebottomcenter": x + width / 2 - linkElementWidth / 2,
            "outsidebottomleft": x,
            "outsidebottomright": x + width - linkElementWidth,
            "outsideleftbottom": x - linkElementWidth,
            "outsideleftcenter": x - linkElementWidth,
            "outsidelefttop": x - linkElementWidth,
            "outsiderightbottom": x + width,
            "outsiderightcenter": x + width,
            "outsiderighttop": x + width,
            "outsidetopcenter": x + width / 2 - linkElementWidth / 2,
            "outsidetopleft": x,
            "outsidetopright": x + width - linkElementWidth
        }[followlabelposition]
        let top = {
            "cornerbottomleft": y + height,
            "cornerbottomright": y + height,
            "cornertopleft": y - linkElementHeight,
            "cornertopright": y - linkElementHeight,
            "insidebottomcenter": y + height - linkElementHeight,
            "insidebottomleft": y + height - linkElementHeight,
            "insidebottomright": y + height - linkElementHeight,
            "insideleftcenter": y + height / 2 - linkElementHeight / 2,
            "insiderightcenter": y + height / 2 - linkElementHeight / 2,
            "insidetopcenter": y,
            "insidetopleft": y,
            "insidetopright": y,
            "outsidebottomcenter": y + height,
            "outsidebottomleft": y + height,
            "outsidebottomright": y + height,
            "outsideleftbottom": y + height - linkElementHeight,
            "outsideleftcenter": y + height / 2 - linkElementHeight / 2,
            "outsidelefttop": y,
            "outsiderightbottom": y + height - linkElementHeight,
            "outsiderightcenter": y + height / 2 - linkElementHeight / 2,
            "outsiderighttop": y,
            "outsidetopcenter": y - linkElementHeight,
            "outsidetopleft": y - linkElementHeight,
            "outsidetopright": y - linkElementHeight
        }[followlabelposition]
        if (left > scrollWidth - linkElementWidth) {
            left = scrollWidth - linkElementWidth
        }
        if (left < 0) {
            left = 0
        }
        if (top > scrollHeight - linkElementHeight) {
            top = scrollHeight - linkElementHeight
        }
        if (top < 0) {
            top = 0
        }
        if (linkInList([link], hoverLink)) {
            borderElement.classList.add("hover")
        }
        linkElement.style.left = `${left.toFixed(2)}px`
        linkElement.style.top = `${top.toFixed(2)}px`
        linkElement.setAttribute("link-id", index)
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
            } else if (followLinkDestination === "copylink") {
                clipboard.writeText(link.url)
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
