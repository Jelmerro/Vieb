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

window.configureIframe = frame => {
    frame.style.height = frame.contentWindow.document.body.scrollHeight + "px"
    frame.contentWindow.document.body.style.color = "#cff"
    frame.contentWindow.document.body.style.background = "#222"
}
window.changeColor = element => {
    if (element.style.borderColor === "rgb(0, 51, 255)") {
        element.style.borderColor = "rgb(0, 255, 51)"
    } else {
        element.style.borderColor = "rgb(0, 51, 255)"
    }
}

window.addEventListener("load", () => {
    const createTOCEntry = element => {
        const link = document.createElement("a")
        link.textContent = element.textContent
        link.className = `toc-${element.tagName.toLowerCase()}`
        link.href = `#${element.id}`
        document.querySelector(".toc").appendChild(link)
    }
    const createIdLabel = element => {
        const section = document.createElement("div")
        section.className = "section"
        const header = document.createElement(element.tagName)
        header.id = element.id
        header.textContent = element.textContent
        section.appendChild(header)
        const label = document.createElement("a")
        label.textContent = `#${element.id}`
        label.href = `#${element.id}`
        section.appendChild(label)
        document.body.replaceChild(section, element)
    }
    //After loading, this will add the ids to the table of contents
    //It also will display the section id for all sections that have one
    const sections = [...document.querySelectorAll("*[id]")]
    sections.forEach(section => {
        createTOCEntry(section)
        createIdLabel(section)
    })
    //Set focus to correct part of the page after it's done loading
    setTimeout(() => {
        if (window.location.hash !== "") {
            document.querySelector(
                `a[href='${window.location.hash}']`).click()
        }
    }, 50)
})
