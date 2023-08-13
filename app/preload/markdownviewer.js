/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2023 Jelmer van Arnhem
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

window.addEventListener("load", () => {
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
    const toc = document.createElement("details")
    toc.classList.add("toc")
    const summary = document.createElement("summary")
    const title = document.createElement("h1")
    title.textContent = "TOC"
    summary.append(title)
    const baseUl = document.createElement("ul")
    baseUl.setAttribute("depth", "1")
    toc.append(summary, baseUl)
    const lists = [baseUl]
    const currentDepth = () => Number(lists.at(-1)?.getAttribute("depth"))
    /** @type {string[]} */
    const headingNames = []
    for (const heading of headings) {
        const depth = Number(heading.tagName[1])
        while (currentDepth() > depth && lists.length > 1) {
            lists.pop()
        }
        while (currentDepth() < depth) {
            const list = document.createElement("ul")
            list.setAttribute("depth", String(currentDepth() + 1))
            lists.at(-1)?.append(list)
            lists.push(list)
        }
        const listItem = document.createElement("li")
        const baseHeadingId = heading.textContent
            ?.replace(/\s+/g, "_").replace(/[\u{0080}-\u{FFFF}]/gu, "") ?? ""
        let headingId = baseHeadingId
        let duplicateHeadingCounter = 2
        while (headingNames.includes(headingId)) {
            headingId = `${baseHeadingId}${duplicateHeadingCounter}`
            duplicateHeadingCounter += 1
        }
        const listLink = document.createElement("a")
        listLink.href = `#${headingId}`
        listLink.textContent = heading.textContent
        heading.id = headingId
        listItem.append(listLink)
        lists.at(-1)?.append(listItem)
    }
    document.body.append(toc)
})

module.exports = {}
