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

let topOfPageWithMouse = false
let navbarGuiTimer = null
let tabbarGuiTimer = null

const listTabs = () => [...document.querySelectorAll("#tabs > span[link-id]")]

const listPages = () => [...document.querySelectorAll("#pages > .webview")]

const currentTab = () => document.getElementById("current-tab")

const currentPage = () => document.getElementById("current-page")

const tabOrPageMatching = el => {
    if (listTabs().indexOf(el) !== -1) {
        return listPages().find(
            e => e.getAttribute("link-id") === el.getAttribute("link-id"))
    }
    if (listPages().indexOf(el) !== -1) {
        return listTabs().find(
            e => e.getAttribute("link-id") === el.getAttribute("link-id"))
    }
    return null
}

const currentMode = () => document.body.getAttribute("current-mode")

const getSetting = val => getStored("settings")?.[val]

const setStored = (set, val) => sessionStorage.setItem(set, JSON.stringify(val))

const getStored = val => {
    try {
        return JSON.parse(sessionStorage.getItem(val))
    } catch (_) {
        return null
    }
}

const getGuiStatus = type => {
    let setting = getSetting(`gui${type}`)
    const {ipcRenderer} = require("electron")
    if (ipcRenderer.sendSync("is-fullscreen")) {
        setting = getSetting(`guifullscreen${type}`)
    }
    if (topOfPageWithMouse && setting !== "never") {
        setting = "always"
    }
    return setting
}

const setTopOfPageWithMouse = status => {
    topOfPageWithMouse = status
    updateGuiVisibility()
}

const guiRelatedUpdate = type => {
    updateGuiVisibility()
    const timeout = getSetting("guihidetimeout")
    if (type === "navbar" && getGuiStatus("navbar") === "onupdate") {
        clearTimeout(navbarGuiTimer)
        document.body.classList.remove("navigationhidden")
        if (timeout) {
            navbarGuiTimer = setTimeout(() => {
                navbarGuiTimer = null
                updateGuiVisibility()
            }, timeout)
        }
    }
    if (type === "tabbar" && getGuiStatus("tabbar") === "onupdate") {
        clearTimeout(tabbarGuiTimer)
        document.body.classList.remove("tabshidden")
        if (timeout) {
            tabbarGuiTimer = setTimeout(() => {
                tabbarGuiTimer = null
                updateGuiVisibility()
            }, timeout)
        }
    }
}

const updateGuiVisibility = () => {
    const navbar = getGuiStatus("navbar")
    const tabbar = getGuiStatus("tabbar")
    if (!navbarGuiTimer) {
        const notTyping = !"ces".includes(currentMode()[0])
        if (navbar === "never" || navbar !== "always" && notTyping) {
            document.body.classList.add("navigationhidden")
        } else {
            document.body.classList.remove("navigationhidden")
        }
    }
    if (!tabbarGuiTimer) {
        if (tabbar === "always") {
            document.body.classList.remove("tabshidden")
        } else {
            document.body.classList.add("tabshidden")
        }
    }
    const {applyLayout} = require("./pagelayout")
    setTimeout(applyLayout, 1)
    if (currentMode() === "pointer") {
        const {updateElement} = require("./pointer")
        updateElement()
    }
}

module.exports = {
    listTabs,
    listPages,
    currentTab,
    currentPage,
    tabOrPageMatching,
    currentMode,
    getSetting,
    setStored,
    getStored,
    setTopOfPageWithMouse,
    guiRelatedUpdate,
    updateGuiVisibility
}
