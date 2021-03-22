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

const {ipcRenderer} = require("electron")
const fs = require("fs")
const util = require("./util")

const increasePageNumber = url => {
    const paginations = [...document.querySelectorAll(".pagination")]
    for (const pagination of paginations) {
        const next = pagination.querySelector("*[rel=next]")
        if (next?.href) {
            window.location = next.href
            return
        }
    }
    movePortNumber(1, url)
}

const decreasePageNumber = url => {
    const paginations = [...document.querySelectorAll(".pagination")]
    for (const pagination of paginations) {
        const prev = pagination.querySelector("*[rel=prev]")
        if (prev?.href) {
            window.location = prev.href
            return
        }
    }
    movePortNumber(-1, url)
}

const movePortNumber = (movement, url) => {
    const loc = document.createElement("a")
    loc.href = url
    if (loc.port) {
        const next = url.toString()
            .replace(/(^.*:)(\d+)(.*$)/, (_, p1, p2, p3) => {
                if (Number(p2) + movement < 1) {
                    return `${p1}1${p3}`
                }
                return `${p1}${Number(p2) + movement}${p3}`
            })
        if (next !== url.toString()) {
            window.location = next
            return
        }
    }
    movePageNumber(movement, url)
}

const movePageNumber = (movement, url) => {
    const next = url.replace(/(\?|&)p(age)?=(\d+)/g, (_, p1, p2, p3) => {
        if (Number(p3) + movement < 1) {
            return `${p1}p${p2}=1`
        }
        return `${p1}p${p2}=${Number(p3) + movement}`
    })
    if (next !== url) {
        window.location = next
    }
    movePageNumberNaive(movement, url)
}

const movePageNumberNaive = (movement, url) => {
    const next = url.replace(/\d+/, match => {
        if (Number(match) + movement < 1) {
            return "1"
        }
        return `${Number(match) + movement}`
    })
    window.location = next
}

const blur = () => util.activeElement()?.blur?.()

const scrollTop = () => window.scrollBy(0, -1000000000)

const scrollLeft = () => window.scrollBy(-100, 0)

const scrollDown = () => window.scrollBy(0, 100)

const scrollUp = () => window.scrollBy(0, -100)

const scrollRight = () => window.scrollBy(100, 0)

const scrollBottom = () => window.scrollBy(0, 1000000000)

const scrollPageRight = () => window.scrollBy(window.innerWidth - 50, 0)

const scrollPageLeft = () => window.scrollBy(-window.innerWidth + 50, 0)

const scrollPageUp = () => window.scrollBy(0, -window.innerHeight + 50)

const scrollPageDownHalf = () => window.scrollBy(0, window.innerHeight / 2 - 25)

const scrollPageDown = () => window.scrollBy(0, window.innerHeight - 50)

const scrollPageUpHalf = () => window.scrollBy(0, -window.innerHeight / 2 + 25)

const focusTopLeftCorner = () => document.elementFromPoint(0, 0).focus()

const exitFullscreen = () => {
    document.webkitExitFullscreen()
    document.exitFullscreen()
}

const writeableInputs = {}

const setInputFieldText = (filename, text) => {
    const el = writeableInputs[filename]
    if (["input", "textarea"].includes(el.tagName.toLowerCase())) {
        el.value = text
    } else if (el.getAttribute("contenteditable") === "true") {
        el.textContent = text
    }
}

const writeInputToFile = filename => {
    const el = util.activeElement()
    if (el) {
        if (["input", "textarea"].includes(el.tagName.toLowerCase())) {
            fs.writeFileSync(filename, el.value)
        } else if (el.getAttribute("contenteditable") === "true") {
            fs.writeFileSync(filename, el.textContent)
        }
        writeableInputs[filename] = el
    }
}

const print = () => document.execCommand("print")

const installFirefoxExtension = () => {
    const link = [...document.querySelectorAll("a")].find(
        a => a.href?.endsWith(".xpi"))?.href
    const extension = link?.replace(/.*\/(\d{7,10}).*/g, "$1")
    if (link && extension) {
        ipcRenderer.send("install-extension", link, extension, "xpi")
    } else {
        ipcRenderer.sendToHost("notify",
            "No extensions found on this page", "warn")
    }
}

const functions = {
    blur,
    increasePageNumber,
    decreasePageNumber,
    scrollTop,
    scrollLeft,
    scrollDown,
    scrollUp,
    scrollRight,
    scrollBottom,
    scrollPageRight,
    scrollPageLeft,
    scrollPageUp,
    scrollPageDownHalf,
    scrollPageDown,
    scrollPageUpHalf,
    focusTopLeftCorner,
    exitFullscreen,
    setInputFieldText,
    writeInputToFile,
    print,
    installFirefoxExtension
}

ipcRenderer.on("action", (_, name, ...args) => {
    if (functions[name]) {
        functions[name](...args)
    }
})

window.addEventListener("DOMContentLoaded", () => {
    ipcRenderer.on("set-custom-styling", (_, fontsize, customCSS) => {
        document.body.style.fontSize = `${fontsize}px`
        if (!document.getElementById("custom-styling")) {
            const styleElement = document.createElement("style")
            styleElement.id = "custom-styling"
            document.head.appendChild(styleElement)
        }
        document.getElementById("custom-styling").textContent = customCSS
        document.body.style.opacity = 1
    })
})

let focussedSearchElement = null

ipcRenderer.on("search-element-location", (_, pos) => {
    focussedSearchElement = document.elementFromPoint(
        pos.x + pos.width / 2, pos.y + pos.height / 2)
})

ipcRenderer.on("search-element-click", () => {
    if (focussedSearchElement) {
        focussedSearchElement.click()
    }
})
