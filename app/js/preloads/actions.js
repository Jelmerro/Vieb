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
"use strict"

const {ipcRenderer} = require("electron")
const fs = require("fs")

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

const blur = () => {
    if (document.activeElement?.blur) {
        document.activeElement.blur()
    }
}

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

const setInputFieldText = text => {
    const el = document.activeElement
    if (el) {
        if (["input", "textarea"].includes(el.tagName.toLowerCase())) {
            el.value = text
        } else if (el.getAttribute("contenteditable") === "true") {
            el.textContent = text
        }
    }
}

const writeInputToFile = filename => {
    const el = document.activeElement
    if (el) {
        if (["input", "textarea"].includes(el.tagName.toLowerCase())) {
            fs.writeFileSync(filename, el.value)
        } else if (el.getAttribute("contenteditable") === "true") {
            fs.writeFileSync(filename, el.textContent)
        }
    }
}

const print = () => document.execCommand("print")

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
    print
}

ipcRenderer.on("action", (_, name, ...args) => {
    if (functions[name]) {
        functions[name](...args)
    }
})

window.addEventListener("DOMContentLoaded", () => {
    ipcRenderer.on("fontsize", (_, size) => {
        document.body.style.fontSize = `${size}px`
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

window.addEventListener("keydown", e => {
    if (e.code === "F11") {
        e.preventDefault()
    }
})

window.addEventListener("mousemove", e => {
    ipcRenderer.sendToHost("top-of-page-with-mouse", !e.clientY)
})
