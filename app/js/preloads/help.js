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

ipcRenderer.on("settings", (_, settings, mappings) => {
    // Enrich the settings list with type, default, current and value lists
    ;[...document.querySelectorAll(".setting-status, .map-status")]
        .forEach(el => el.parentNode.removeChild(el))
    settings.forEach(setting => {
        if (document.getElementById(setting.name)) {
            const settingStatus = document.createElement("div")
            settingStatus.className = "setting-status"
            const typeLabel = document.createElement("span")
            typeLabel.textContent = "Type:"
            settingStatus.appendChild(typeLabel)
            const type = document.createElement("kbd")
            type.textContent = setting.typeLabel
            settingStatus.appendChild(type)
            const originalLabel = document.createElement("span")
            originalLabel.textContent = "Default:"
            settingStatus.appendChild(originalLabel)
            const original = document.createElement("kbd")
            if (typeof setting.default === "string") {
                original.textContent = `"${setting.default}"`
            } else {
                original.textContent = setting.default
            }
            settingStatus.appendChild(original)
            const currentLabel = document.createElement("span")
            currentLabel.textContent = "Current:"
            settingStatus.appendChild(currentLabel)
            const current = document.createElement("kbd")
            if (typeof setting.default === "string") {
                current.textContent = `"${setting.current}"`
            } else {
                current.textContent = setting.current
            }
            settingStatus.appendChild(current)
            const allowedValuesLabel = document.createElement("span")
            allowedValuesLabel.textContent = "Accepted:"
            settingStatus.appendChild(allowedValuesLabel)
            const allowedValues = document.createElement("kbd")
            allowedValues.textContent = setting.allowedValues
            settingStatus.appendChild(allowedValues)
            document.getElementById(setting.name).parentNode.parentNode
                .insertBefore(settingStatus, document.getElementById(
                    setting.name).parentNode.nextSibling)
        }
    })
    // Enrich the action list with the keys that map to them
    ;[
        ...document.querySelectorAll("h3[id^='action.']"),
        ...document.querySelectorAll("h3[id^='pointer.']")
    ].forEach(actionNode => {
        const mapList = document.createElement("div")
        mapList.className = "map-status"
        const actionMappings = mappings.split("\n").filter(map => {
            return map.includes(`<${actionNode.id}>`)
        })
        actionMappings.forEach(mapping => {
            const mappingKbd = document.createElement("kbd")
            mappingKbd.textContent = mapping
            mappingKbd.className = "command-block"
            mapList.appendChild(mappingKbd)
        })
        if (!actionMappings.length) {
            const noMappingsLabel = document.createElement("kbd")
            noMappingsLabel.textContent = "No mappings with this action found"
            mapList.appendChild(noMappingsLabel)
        }
        actionNode.parentNode.parentNode.insertBefore(
            mapList, actionNode.parentNode.nextSibling)
    })
})

window.addEventListener("load", () => {
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
        document.querySelector("main").replaceChild(section, element)
    }
    // After loading, this will display the section id as a link
    const sections = [...document.querySelectorAll("*[id]")]
    sections.forEach(section => createIdLabel(section))
    // Set focus to correct part of the page after it's done loading
    setTimeout(() => {
        let hash = window.location.hash.toLowerCase()
        if (hash !== "") {
            if (document.querySelector(`a[href='${hash}']`)) {
                document.querySelector(`a[href='${hash}']`).click()
            }
            hash = hash.replace("#", "#:")
            if (document.querySelector(`a[href='${hash}']`)) {
                document.querySelector(`a[href='${hash}']`).click()
            }
        }
    }, 50)
})
