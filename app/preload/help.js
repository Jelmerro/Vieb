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
const {joinPath} = require("../util")

const modes = "nicsefpvm".split("")
let allActionsByKeys = modes.reduce((a, m) => {
    a[m] = {}
    return a
}, {})
let allCommandsByKeys = modes.reduce((a, m) => {
    a[m] = {}
    return a
}, {})

ipcRenderer.on("settings", (_, settings, mappings, uncountableActions) => {
    allActionsByKeys = modes.reduce((a, m) => {
        a[m] = {}
        return a
    }, {})
    allCommandsByKeys = modes.reduce((a, m) => {
        a[m] = {}
        return a
    }, {})
    // Enrich the settings list with type, default, current and value lists
    ;[...document.querySelectorAll(".setting-status, .map-status, .countable")]
        .forEach(el => el.remove())
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
    // Enrich the command list with the keys that map to them
    ;[...document.querySelectorAll("h3[id^=':']")].forEach(cmdNode => {
        // List mappings in which this command is used
        const mapList = document.createElement("div")
        mapList.className = "map-status"
        const commandMappings = mappings.split("\n").filter(
            map => map.includes(`<${cmdNode.id} `)
                || map.includes(`<${cmdNode.id}>`))
        commandMappings.forEach(mapping => {
            const mode = mapping.split(" ")[0].replace(/(nore)?map$/g, "")
            const [, keys] = mapping.split(" ")
            if (mode) {
                if (!allCommandsByKeys[mode][keys]) {
                    allCommandsByKeys[mode][keys] = document.querySelector(
                        `a[href='#${cmdNode.id}']`)
                }
            } else {
                modes.forEach(m => {
                    if (!allCommandsByKeys[m][keys]) {
                        allCommandsByKeys[m][keys] = document.querySelector(
                            `a[href='#${cmdNode.id}']`)
                    }
                })
            }
            const mappingKbd = document.createElement("kbd")
            mappingKbd.textContent = mapping
            mappingKbd.className = "command-block"
            mapList.appendChild(mappingKbd)
        })
        if (!commandMappings.length) {
            const noMappingsLabel = document.createElement("kbd")
            noMappingsLabel.textContent = "No mappings with this command found"
            mapList.appendChild(noMappingsLabel)
        }
        const exampleUl = cmdNode.parentNode.nextSibling.nextSibling
        if (exampleUl.tagName.toLowerCase() === "ul") {
            cmdNode.parentNode.parentNode.insertBefore(
                mapList, exampleUl.nextSibling)
        } else {
            cmdNode.parentNode.parentNode.insertBefore(
                mapList, cmdNode.parentNode.nextSibling)
        }
    })
    // Enrich the action list with the keys that map to them
    ;[
        ...document.querySelectorAll("h3[id^='action.']"),
        ...document.querySelectorAll("h3[id^='pointer.']"),
        document.getElementById("Nop")
    ].forEach(actionNode => {
        // List mappings in which this action is used
        const mapList = document.createElement("div")
        mapList.className = "map-status"
        const actionName = actionNode.id.replace(
            /^a.*\./, "").replace(/p.*\./, "p.")
        const actionMappings = mappings.split("\n").filter(map => map.includes(
            `<${actionName}>`))
        actionMappings.forEach(mapping => {
            const mode = mapping.split(" ")[0].replace(/(nore)?map$/g, "")
            const [, keys] = mapping.split(" ")
            if (mode) {
                if (!allActionsByKeys[mode][keys]) {
                    allActionsByKeys[mode][keys] = document.querySelector(
                        `a[href='#${actionNode.id}']`)
                }
            } else {
                modes.forEach(m => {
                    if (!allActionsByKeys[m][keys]) {
                        allActionsByKeys[m][keys] = document.querySelector(
                            `a[href='#${actionNode.id}']`)
                    }
                })
            }
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
        // Countable action badge
        if (!uncountableActions.includes(actionName)) {
            const badge = document.createElement("kbd")
            badge.className = "countable"
            badge.textContent = "Countable"
            actionNode.parentNode.insertBefore(badge, actionNode.nextSibling)
        }
    })
    // Set focus to correct part of the page after it's done loading
    if (window.scrollY < 10) {
        processHash()
    }
})

const processHash = () => {
    const ids = [...document.querySelectorAll("[id]")].map(e => e.id)
    const hash = decodeURIComponent(window.location.hash).trim()
        .replace(/^#?/, "")
    const easyHash = hash.replace(/^:?/, "").replace(/!$/, "")
        .replace(/-/g, "").toLowerCase()
    if (easyHash !== "") {
        const match = ids.find(raw => {
            const id = decodeURIComponent(raw.replace(/^#?:?/, "").replace(/!$/, "")
                .replace(/-/g, "").toLowerCase().trim())
            return easyHash === id.replace(/^action\./, "")
                .replace(/^pointer\./, "") || easyHash === id
        })
        if (match && document.querySelector(`a[href='#${match}']`)) {
            document.querySelector(`a[href='#${match}']`).click()
            return
        }
    }
    let mode = null
    let keys = String(hash)
    if (hash.match(/^\w_.*/)) {
        [mode] = hash.split("_")
        keys = hash.split("_").slice(1).join("_")
    }
    if (mode) {
        if (allActionsByKeys[mode][keys]) {
            allActionsByKeys[mode][keys].click()
        } else if (allCommandsByKeys[mode][keys]) {
            allCommandsByKeys[mode][keys].click()
        }
        return
    }
    for (const m of modes) {
        if (allActionsByKeys[m][keys]) {
            allActionsByKeys[m][keys].click()
            return
        }
        if (allCommandsByKeys[m][keys]) {
            allCommandsByKeys[m][keys].click()
            return
        }
    }
}

window.addEventListener("hashchange", processHash)

window.addEventListener("DOMContentLoaded", () => {
    const examples = [
        "chromium", "firefox", "qutebrowser", "vimium", "tridactyl"
    ]
    for (const example of examples) {
        const button = document.createElement("button")
        button.textContent = example[0].toUpperCase() + example.slice(1)
        button.addEventListener("click", () => {
            const link = document.createElement("a")
            link.href = joinPath(__dirname, `../examples/${example}`)
            link.download = `${example}.viebrc`
            link.style.display = "none"
            document.body.appendChild(link)
            link.click()
            link.remove()
        })
        document.querySelector(".example-buttons").appendChild(button)
    }
})

window.addEventListener("load", () => {
    const createIdLabel = element => {
        const section = document.createElement("div")
        section.className = "section"
        const header = document.createElement(element.tagName)
        header.id = element.id
        header.textContent = element.textContent
        header.setAttribute("countable", element.getAttribute("countable"))
        section.appendChild(header)
        const spacer = document.createElement("div")
        spacer.className = "spacer"
        section.appendChild(spacer)
        const label = document.createElement("a")
        label.textContent = `#${element.id}`
        label.setAttribute("href", `#${element.id}`)
        section.appendChild(label)
        document.querySelector("main").replaceChild(section, element)
    }
    // After loading, this will display the section id as a link
    const sections = [...document.querySelectorAll("#helppage *[id]")]
    sections.forEach(section => createIdLabel(section))
    // Set focus to correct part of the page after it's done loading
    setTimeout(processHash, 200)
})
