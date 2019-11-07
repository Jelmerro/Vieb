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
"use strict"

const {ipcRenderer} = require("electron")
const fs = require("fs")

const movePageNumber = movement => {
    const path = window.location.pathname + window.location.search
    const next = path.replace(/(\?|&)p(age)?=(\d+)/g, (match, p1, p2, p3) => {
        if (Number(p3) + movement < 1) {
            return `${p1}p${p2}=1`
        }
        return `${p1}p${p2}=${Number(p3) + movement}`
    })
    if (next !== path) {
        window.location = window.location.origin + next
    }
    return next !== path
}

const movePageNumberNaive = movement => {
    const path = window.location.pathname + window.location.search
    const simpleNext = path.replace(/\d+/, match => {
        if (Number(match) + movement < 1) {
            return "1"
        }
        return `${Number(match) + movement}`
    })
    if (simpleNext !== path) {
        window.location = window.location.origin + simpleNext
        return
    }
    movePortNumber(movement)
}

const movePortNumber = movement => {
    if (!window.location.port) {
        return
    }
    const url = window.location.toString()
        .replace(/(^.*:)(\d+)(.*$)/, (match, p1, p2, p3) => {
            if (Number(p2) + movement < 1) {
                return `${p1}1${p3}`
            }
            return `${p1}${Number(p2) + movement}${p3}`
        })
    if (url !== window.location.toString()) {
        window.location = url
    }
}

const increasePageNumber = count => {
    if (isNaN(count)) {
        count = 1
    }
    const moved = movePageNumber(Math.abs(count))
    if (moved) {
        return
    }
    const paginations = [...document.querySelectorAll(".pagination")]
    for (const pagination of paginations) {
        const next = pagination.querySelector("*[rel=next]")
        if (next && next.href) {
            window.location = next.href
            return
        }
    }
    movePageNumberNaive(Math.abs(count))
}

const decreasePageNumber = count => {
    if (isNaN(count)) {
        count = 1
    }
    const moved = movePageNumber(-Math.abs(count))
    if (moved) {
        return
    }
    const paginations = [...document.querySelectorAll(".pagination")]
    for (const pagination of paginations) {
        const prev = pagination.querySelector("*[rel=prev]")
        if (prev && prev.href) {
            window.location = prev.href
            return
        }
    }
    movePageNumberNaive(-Math.abs(count))
}

const scrollTop = () => {
    window.scrollBy(0, -1000000000)
}

const scrollLeft = () => {
    window.scrollBy(-100, 0)
}

const scrollDown = () => {
    window.scrollBy(0, 100)
}

const scrollUp = () => {
    window.scrollBy(0, -100)
}

const scrollRight = () => {
    window.scrollBy(100, 0)
}

const scrollBottom = () => {
    window.scrollBy(0, 1000000000)
}

const scrollPageRight = () => {
    window.scrollBy(window.innerWidth - 50, 0)
}

const scrollPageLeft = () => {
    window.scrollBy(-window.innerWidth + 50, 0)
}

const scrollPageUp = () => {
    window.scrollBy(0, -window.innerHeight + 50)
}

const scrollPageDownHalf = () => {
    window.scrollBy(0, window.innerHeight / 2 - 25)
}

const scrollPageDown = () => {
    window.scrollBy(0, window.innerHeight - 50)
}

const scrollPageUpHalf = () => {
    window.scrollBy(0, -window.innerHeight / 2 + 25)
}

const focusTopLeftCorner = () => {
    document.elementFromPoint(0, 0).focus()
}

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

const functions = {
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
    writeInputToFile
}

ipcRenderer.on("action", (_, name, ...args) => {
    if (functions[name]) {
        functions[name](...args)
    }
})

ipcRenderer.on("fontsize", (_, size) => {
    document.body.style.fontSize = `${size}px`
})

let focussedSearchElement = null

ipcRenderer.on("search-element-location", (e, pos) => {
    focussedSearchElement = document.elementFromPoint(
        pos.x + pos.width / 2, pos.y + pos.height / 2)
})

ipcRenderer.on("search-element-click", () => {
    if (focussedSearchElement) {
        focussedSearchElement.click()
    }
})
