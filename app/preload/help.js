/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2023 Jelmer van Arnhem
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
const {joinPath, title, readFile, appConfig} = require("../util")
const {icon} = appConfig() ?? {}
const modes = "nicsefpvm".split("")
/** @type {{[mode: string]: {[key: string]: HTMLElement|null}}} */
let allActionsByKeys = modes.reduce((a, m) => {
    // @ts-expect-error Creation of keys on empty object is not allowed
    a[m] = {}
    return a
}, {})
/** @type {{[mode: string]: {[key: string]: HTMLElement|null}}} */
let allCommandsByKeys = modes.reduce((a, m) => {
    // @ts-expect-error Creation of keys on empty object is not allowed
    a[m] = {}
    return a
}, {})

/** Process the current page hash and jump to the right section if found. */
const processHash = () => {
    const ids = [...document.querySelectorAll("[id]")].map(e => e.id)
    const hash = decodeURIComponent(window.location.hash).trim()
        .replace(/^#?/, "")
    let easyHash = hash.replace(/!$/, "").replace(/-/g, "").toLowerCase()
    if (easyHash !== "") {
        easyHash = easyHash.replace(/^a\w*\./, "action.")
            .replace(/^p\w*\./, "pointer.")
        if (easyHash.length > 2) {
            easyHash = easyHash.replace(/^</g, "").replace(/>$/g, "")
        }
        let match = ids.find(raw => {
            const id = decodeURIComponent(raw.replace(/^#?/, "")
                .replace(/!$/, "").replace(/-/g, "").toLowerCase().trim())
            return easyHash === id
        })
        if (!match || !document.querySelector(`a[href='#${match}']`)) {
            easyHash = easyHash.replace(/^a\w*\./, "").replace(/^p\w*\./, "")
                .replace(/^:?/, "")
            match = ids.find(raw => {
                const id = decodeURIComponent(raw.replace(/^#?:?/, "")
                    .replace(/!$/, "").replace(/-/g, "").toLowerCase().trim())
                return easyHash === id || easyHash === id
                    .replace(/^action\./, "").replace(/^pointer\./, "")
            })
        }
        const matchEl = document.querySelector(`a[href='#${match}']`)
        if (match && matchEl instanceof HTMLAnchorElement) {
            matchEl.click()
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
            allActionsByKeys[mode][keys]?.click()
        } else if (allCommandsByKeys[mode][keys]) {
            allCommandsByKeys[mode][keys]?.click()
        }
        return
    }
    for (const m of modes) {
        if (allActionsByKeys[m][keys]) {
            allActionsByKeys[m][keys]?.click()
            return
        }
        if (allCommandsByKeys[m][keys]) {
            allCommandsByKeys[m][keys]?.click()
            return
        }
    }
}

/**
 * Add an elements type description text, optionally with links to types.
 * @param {Element} baseEl
 * @param {string} text
 */
const addTextWithLinksToTypes = (baseEl, text) => {
    const types = ["Boolean", "List", "String", "Interval", "Number", "Enum"]
    text.split(RegExp(`(${types.join("|")})`, "g")).forEach(s => {
        /** @type {HTMLAnchorElement|Text} */
        let el = document.createElement("a")
        if (types.includes(s)) {
            el.textContent = s
            el.href = `#${s.toLowerCase()}`
        } else {
            el = document.createTextNode(s)
        }
        baseEl.append(el)
    })
}

/**
 * Update the setting list with realtime information based on current settings.
 * @param {Electron.IpcRendererEvent} _
 * @param {{
 *   name: string,
 *   typeLabel: string,
 *   allowedValues: string|string[],
 *   current: number|boolean|string,
 *   default: number|boolean|string
 * }[]} settings
 * @param {string} mappings
 * @param {string[]} uncountActs
 * @param {string[]} rangeComp
 */
const updateSettingsList = (_, settings, mappings, uncountActs, rangeComp) => {
    allActionsByKeys = modes.reduce((a, m) => {
        // @ts-expect-error Creation of keys on empty object is not allowed
        a[m] = {}
        return a
    }, {})
    allCommandsByKeys = modes.reduce((a, m) => {
        // @ts-expect-error Creation of keys on empty object is not allowed
        a[m] = {}
        return a
    }, {})
    // Enrich the settings list with type, default, current and value lists
    ;[...document.querySelectorAll(
        ".setting-status, .map-status, .countable, .range-compat")]
        .forEach(el => el.remove())
    settings.forEach(setting => {
        if (document.getElementById(setting.name)) {
            const settingStatus = document.createElement("div")
            settingStatus.className = "setting-status"
            const typeLabel = document.createElement("span")
            typeLabel.textContent = "Type:"
            settingStatus.append(typeLabel)
            const type = document.createElement("kbd")
            addTextWithLinksToTypes(type, setting.typeLabel)
            settingStatus.append(type)
            const originalLabel = document.createElement("span")
            originalLabel.textContent = "Default:"
            settingStatus.append(originalLabel)
            const original = document.createElement("kbd")
            if (typeof setting.default === "string") {
                original.textContent = `"${setting.default}"`
            } else {
                original.textContent = `${setting.default}`
            }
            settingStatus.append(original)
            const currentLabel = document.createElement("span")
            currentLabel.textContent = "Current:"
            settingStatus.append(currentLabel)
            const current = document.createElement("kbd")
            if (typeof setting.default === "string") {
                current.textContent = `"${setting.current}"`
            } else {
                current.textContent = `${setting.current}`
            }
            settingStatus.append(current)
            const allowedValuesLabel = document.createElement("span")
            allowedValuesLabel.textContent = "Accepted:"
            settingStatus.append(allowedValuesLabel)
            const allowedValues = document.createElement("kbd")
            addTextWithLinksToTypes(
                allowedValues, String(setting.allowedValues))
            settingStatus.append(allowedValues)
            document.getElementById(setting.name)?.parentNode?.parentNode
                ?.insertBefore(settingStatus, document.getElementById(
                    setting.name)?.parentNode?.nextSibling ?? null)
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
            mapList.append(mappingKbd)
        })
        if (!commandMappings.length) {
            const noMappingsLabel = document.createElement("kbd")
            noMappingsLabel.textContent = "No mappings with this command found"
            mapList.append(noMappingsLabel)
        }
        const exampleUl = cmdNode.parentElement
            ?.nextElementSibling?.nextElementSibling
        if (exampleUl?.tagName.toLowerCase() === "ul") {
            cmdNode.parentNode?.parentNode?.insertBefore(
                mapList, exampleUl.nextSibling)
        } else {
            cmdNode.parentNode?.parentNode?.insertBefore(
                mapList, cmdNode.parentNode.nextSibling)
        }
        // Range compat badge
        if (rangeComp.includes(cmdNode.id.replace(":", ""))) {
            const badge = document.createElement("kbd")
            badge.className = "range-compat"
            badge.textContent = "Supports ranges"
            cmdNode.parentNode?.insertBefore(badge, cmdNode.nextSibling)
        }
    })
    // Enrich the action list with the keys that map to them
    ;[
        ...document.querySelectorAll("h3[id^='action.']"),
        ...document.querySelectorAll("h3[id^='pointer.']")
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
            mapList.append(mappingKbd)
        })
        if (!actionMappings.length) {
            const noMappingsLabel = document.createElement("kbd")
            noMappingsLabel.textContent = "No mappings with this action found"
            mapList.append(noMappingsLabel)
        }
        actionNode.parentNode?.parentNode?.insertBefore(
            mapList, actionNode.parentNode.nextSibling ?? null)
        // Countable action badge
        if (!uncountActs.includes(actionName)) {
            const badge = document.createElement("kbd")
            badge.className = "countable"
            badge.textContent = "Countable"
            actionNode.parentNode?.insertBefore(badge, actionNode.nextSibling)
        }
    })
    // Set focus to correct part of the page after it's done loading
    if (window.scrollY < 10) {
        processHash()
    }
}

ipcRenderer.on("settings", updateSettingsList)
window.addEventListener("hashchange", processHash)
window.addEventListener("DOMContentLoaded", () => {
    const examples = [
        "chromium",
        "firefox",
        "vivaldi",
        "qutebrowser",
        "vimium",
        "tridactyl",
        "pentadactyl",
        "surfingkeys",
        "saka key",
        "vim vixen"
    ]
    for (const example of examples) {
        const button = document.createElement("button")
        button.textContent = title(example)
        button.addEventListener("click", () => {
            const link = document.createElement("a")
            const text = readFile(joinPath(
                __dirname, `../examples/${example.replace(/\s/g, "")}`)) ?? ""
            link.href = window.URL.createObjectURL(
                new Blob([text], {"type": "text/plain"}))
            link.download = `${example}.viebrc`
            link.style.display = "none"
            document.body.append(link)
            link.click()
            link.remove()
        })
        document.querySelector(".example-buttons")?.append(button)
    }
})
window.addEventListener("load", () => {
    const mainImg = document.querySelector("img")
    if (icon && mainImg) {
        mainImg.src = icon
    }

    /**
     * Create an id label for each section element.
     * @param {Element} element
     */
    const createIdLabel = element => {
        const section = document.createElement("div")
        section.className = "section"
        const header = document.createElement(element.tagName)
        header.id = element.id
        header.textContent = element.textContent
        header.setAttribute("countable",
            element.getAttribute("countable") ?? "")
        section.append(header)
        const spacer = document.createElement("div")
        spacer.className = "spacer"
        section.append(spacer)
        const label = document.createElement("a")
        label.textContent = `#${element.id}`
        label.setAttribute("href", `#${element.id}`)
        section.append(label)
        document.querySelector("main")?.replaceChild(section, element)
    }

    // After loading, this will display the section id as a link
    const sections = [...document.querySelectorAll("#helppage *[id]")]
    sections.forEach(section => createIdLabel(section))
    // Set focus to correct part of the page after it's done loading
    setTimeout(processHash, 200)
})
