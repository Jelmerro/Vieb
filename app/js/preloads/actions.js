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

const functions = {
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
    exitFullscreen
}

ipcRenderer.on("action", (_, name) => {
    if (functions[name]) {
        functions[name]()
    }
})

ipcRenderer.on("fontsize", (_, size) => {
    document.body.style.fontSize = `${size}px`
})
