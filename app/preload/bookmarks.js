/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2026 Jelmer van Arnhem
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

const {getBMTree} = require("../util")

/**
 * The main function of the page to load the bookmarks tree and render it.
 */
const load = async() => {
    const tree = await getBMTree()
    const bookmarksList = document.getElementById("bookmarks-list")
    if (!bookmarksList) {
        return
    }
    bookmarksList.replaceChildren()
    if (tree.length === 0) {
        const notFoundMessage = document.createElement("p")
        notFoundMessage.textContent = "No bookmarks found."
        bookmarksList.append(notFoundMessage)
        return
    }
    /**
     * Renders a bookmark item and its children recursively.
     * @param {import("../util").BMTreeItem} item
     * @param {HTMLElement} parent
     */
    const renderItem = (item, parent) => {
        if (item.type === "folder") {
            const details = document.createElement("details")
            details.open = true
            details.classList.add("bookmark-folder")
            const summary = document.createElement("summary")
            summary.classList.add("bookmark-folder-name")
            summary.textContent = item.name
            const items = document.createElement("div")
            items.classList.add("bookmark-folder-items")
            details.append(summary, items)
            parent.append(details)
            for (const child of item.items) {
                renderItem(child, items)
            }
        } else {
            const div = document.createElement("div")
            div.classList.add("bookmark-item")
            const visualization = document.createElement("div")
            visualization.classList.add("bookmark-visualization")
            const img = document.createElement("img")
            img.src = item.icon
            img.alt = item.name
            img.classList.add("bookmark-icon")
            const reference = document.createElement("span")
            reference.classList.add("bookmark-reference")
            reference.textContent = `#${item.reference}`
            visualization.append(img, reference)
            const properties = document.createElement("div")
            properties.classList.add("bookmark-properties")
            const name = document.createElement("span")
            name.textContent = item.name
            name.classList.add("bookmark-name")
            const a = document.createElement("a")
            a.href = item.url
            a.textContent = item.url
            a.classList.add("bookmark-link")
            properties.append(name, a)
            div.append(visualization, properties)
            parent.append(div)
        }
    }
    for (const item of tree) {
        renderItem(item, bookmarksList)
    }
}

document.addEventListener("DOMContentLoaded", load)
