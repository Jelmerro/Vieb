/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2021 Jelmer van Arnhem
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
const {joinPath} = require("../util")

const listExtension = ext => {
    const container = document.createElement("div")
    container.className = "extension"
    const img = document.createElement("img")
    img.src = joinPath(ext.path, ext.icon)
    container.appendChild(img)
    const textNodes = document.createElement("div")
    textNodes.className = "fullwidth"
    const title = document.createElement("div")
    title.textContent = ext.name
    title.className = "title"
    textNodes.appendChild(title)
    const version = document.createElement("div")
    version.textContent = `Version: ${ext.version}`
    textNodes.appendChild(version)
    const id = document.createElement("div")
    id.textContent = `ID: ${ext.path.replace(/^.*(\/|\\)/g, "")}`
    textNodes.appendChild(id)
    container.appendChild(textNodes)
    const removeIcon = document.createElement("img")
    removeIcon.src = joinPath(__dirname, "../img/trash.png")
    removeIcon.addEventListener("click", () => {
        ipcRenderer.send("remove-extension", ext.path.replace(
            /^.*(\/|\\)/g, ""))
        window.location.reload()
    })
    container.appendChild(removeIcon)
    document.getElementById("list").appendChild(container)
}

const refreshList = () => {
    const list = ipcRenderer.sendSync("list-extensions")
    if (list.length) {
        document.getElementById("list").textContent = ""
        list.forEach(listExtension)
    } else {
        document.getElementById("list").textContent
            = "No extensions currently installed"
    }
}

window.addEventListener("DOMContentLoaded", () => refreshList())
