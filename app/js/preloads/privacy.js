/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2021 Jelmer van Arnhem
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

const {desktopCapturer, ipcRenderer} = require("electron")
const fs = require("fs")
const path = require("path")

const message = "The page has requested to view a list of all media devices."
    + " You can allow or deny this below, and choose if you want the list to"
    + " include the names (labels) of the media device in the response."
    + " For help and options, see ':h permissionmediadevices', ':h permissions"
    + "allowed', ':h permissionsasked' and ':h permissionsblocked'."
const settingsFile = path.join(
    ipcRenderer.sendSync("appdata-path"), "webviewsettings")

const privacyFixes = (w = window) => {
    try {
        // Hide device labels from the list of media devices
        const enumerate = w.navigator.mediaDevices.enumerateDevices
        const mediaDeviceList = async action => {
            if (action === "block") {
                throw new DOMException("Permission denied", "NotAllowedError")
            }
            const devices = await enumerate.call(w.navigator.mediaDevices)
            if (action === "allowfull") {
                return devices
            }
            return devices.map(({deviceId, groupId, kind}) => ({
                deviceId, groupId, "label": "", kind
            }))
        }
        w.navigator.mediaDevices.enumerateDevices = async () => {
            let setting = "ask"
            let settings = {}
            try {
                settings = JSON.parse(fs.readFileSync(settingsFile).toString())
            } catch (e) {
                // No webview settings configured, assuming the default "ask"
            }
            setting = settings.permissionmediadevices || setting
            if (!["block", "ask", "allow", "allowfull"].includes(setting)) {
                setting = "ask"
            }
            let settingRule = ""
            for (const type of ["ask", "block", "allow"]) {
                for (const r of settings[`permissions${type}ed`]?.split(",")) {
                    if (!r.trim() || settingRule) {
                        continue
                    }
                    const [match, ...names] = r.split("~")
                    if (names.find(p => p.endsWith("mediadevices"))) {
                        if (w.location.href.match(match)) {
                            settingRule = type
                        }
                    }
                }
            }
            setting = settingRule || setting
            if (setting === "ask") {
                let url = w.location.href
                if (url.length > 100) {
                    url = url.replace(/.{50}/g, "$&\n")
                }
                const ask = await ipcRenderer.invoke("show-message-dialog", {
                    "type": "question",
                    "buttons": ["Allow", "Deny"],
                    "defaultId": 0,
                    "cancelId": 1,
                    "checkboxLabel": "Include media device name labels",
                    "title": "Allow this page to access 'mediadevices'?",
                    "message": `${message}\n\npage:\n${url}`
                })
                if (ask.response === 0) {
                    if (ask.checkboxChecked) {
                        ipcRenderer.sendToHost("notify",
                            `Manually allowfulled 'mediadevices' at `
                            + `'${w.location.href}'`, "perm")
                        return mediaDeviceList("allowfull")
                    }
                    setting = "allow"
                }
                if (ask.response === 1) {
                    setting = "block"
                }
                if (settingRule) {
                    ipcRenderer.sendToHost("notify",
                        `Ask rule for 'mediadevices' activated at '`
                        + `${w.location.href}' which was `
                        + `${setting}ed by user`, "perm")
                } else {
                    ipcRenderer.sendToHost("notify",
                        `Manually ${setting}ed 'mediadevices' at `
                        + `'${w.location.href}'`, "perm")
                }
                return mediaDeviceList(setting)
            }
            if (settingRule) {
                ipcRenderer.sendToHost("notify",
                    `Automatic rule for 'mediadevices' activated at `
                    + `'${w.location.href}' which was ${setting}ed`, "perm")
            } else {
                ipcRenderer.sendToHost("notify",
                    `Globally ${setting}ed 'mediadevices' at `
                    + `'${w.location.href}' based on `
                    + "'permissionmediadevices'", "perm")
            }
            return mediaDeviceList(setting)
        }
        // Enable screensharing functionality linked to permissiondisplaycapture
        w.navigator.mediaDevices.getDisplayMedia = () => customDisplayMedia(w)
    } catch (e) {
        // Non-secure resources don't expose these APIs
    }
    // Empty the list of browser plugins, as there shouldn't be any installed
    Object.defineProperty(w.navigator, "plugins", {"value": []})
    Object.defineProperty(w.navigator, "mimeTypes", {"value": []})
    // Don't share the connection information
    Object.defineProperty(w.navigator, "connection", {})
    // Disable the experimental keyboard API, which exposes every key mapping
    Object.defineProperty(w.navigator, "keyboard", {})
    // Disable the battery API entirely
    w.navigator.__proto__.getBattery = undefined
    // Always return the cancel action for prompts, without throwing
    w.prompt = () => null
    // Return the static maximum value for memory and thread count
    Object.defineProperty(w.navigator, "hardwareConcurrency", {"value": 8})
    Object.defineProperty(w.navigator, "deviceMemory", {"value": 8})
    // Hide graphics card information from the canvas API
    const getParam = w.WebGLRenderingContext.prototype.getParameter
    w.WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if ([37445, 37446].includes(parameter)) {
            return ""
        }
        return getParam.call(this, parameter)
    }
    const getParam2 = w.WebGL2RenderingContext.prototype.getParameter
    w.WebGL2RenderingContext.prototype.getParameter = function(parameter) {
        if ([37445, 37446].includes(parameter)) {
            return ""
        }
        return getParam2.call(this, parameter)
    }
    // If using Firefox mode, also modify the Firefox navigator properties
    if (w.navigator.userAgent.includes("Firefox")) {
        Object.defineProperty(w.navigator,
            "buildID", {"value": "20181001000000"})
        Object.defineProperty(w.navigator,
            "doNotTrack", {"value": "unspecified"})
        Object.defineProperty(w.navigator,
            "oscpu", {"value": w.navigator.platform})
        Object.defineProperty(w.navigator, "productSub", {"value": "20100101"})
        Object.defineProperty(w.navigator, "vendor", {"value": ""})
        Object.defineProperty(w.navigator, "webdriver", {"value": false})
    }
    // Provide a wrapper for w.open so that it doesn't crash websites
    // Also provide the option to open new tabs by setting the location property
    const electronWindowOpen = w.open
    w.open = (url = null) => {
        if (url) {
            electronWindowOpen(url)
        }
        const obj = {}
        Object.defineProperty(obj, "location", {
            "get": () => "", "set": val => electronWindowOpen(val)
        })
        return obj
    }
}
privacyFixes()
module.exports = {privacyFixes}

// Screensharing code based on the work of @WesselKroos on Github
// https://github.com/electron/electron/issues/16513#issuecomment-602070250
const displayCaptureStyling = `html, body {overflow: hidden !important;}
.desktop-capturer-selection {
    position: fixed;top: 0;left: 0;width: 100%;height: 100vh;
    background: %SHADE%;color: %FG%;z-index: 10000000;text-align: center;
    display: flex;align-items: center;justify-content: center;
}
.desktop-capturer-selection__scroller {
    width: 100%;max-height: 100vh;overflow-y: auto;
}
.desktop-capturer-selection__close {
    position: fixed;font-size: 40px;top: 10px;right: 10px;width: 40px;
    height: 40px;cursor: pointer;
}
.desktop-capturer-selection__list {
    max-width: calc(100% - 100px);margin: 50px;padding: 0;display: flex;
    list-style: none;overflow: hidden;justify-content: center;flex-wrap: wrap;
}
.desktop-capturer-selection__item {display: flex;margin: 10px;}
.desktop-capturer-selection__btn {
    display: flex;flex-direction: column;margin: 0;border: 0;width: 160px;
    background: %BG%;color: %FG%;align-items: center;height: auto;
    font-size: %FONTSIZE%px;font-weight: bold;cursor: pointer;
}
.desktop-capturer-selection__thumbnail {margin: 5px;width: 150px;}
.desktop-capturer-selection__name {margin: 10px;overflow-wrap: anywhere;}
.desktop-capturer-selection__btn:hover, .desktop-capturer-selection__btn:focus {
    background: %FG%;color: %BG%;
}`
const customDisplayMedia = frameWindow => new Promise((resolve, reject) => {
    let setting = "block"
    let settings = {}
    try {
        settings = JSON.parse(fs.readFileSync(settingsFile).toString())
    } catch (e) {
        // No webview settings configured, assuming the default "block"
    }
    setting = settings.permissiondisplaycapture || setting
    let settingRule = ""
    for (const type of ["ask", "block"]) {
        for (const r of settings[`permissions${type}ed`]?.split(",")) {
            if (!r.trim() || settingRule) {
                continue
            }
            const [match, ...names] = r.split("~")
            if (names.find(p => p.endsWith("displaycapture"))) {
                if (frameWindow.location.href.match(match)) {
                    settingRule = type
                }
            }
        }
    }
    setting = settingRule || setting
    // Only blocked requests are notified here right away,
    // because allowed requests are passed to the regular permission system.
    if (setting !== "ask") {
        if (settingRule) {
            ipcRenderer.sendToHost("notify",
                `Automatic rule for 'displaycapture' activated at '`
                + `${frameWindow.location.href}' which was blocked`, "perm")
        } else {
            ipcRenderer.sendToHost("notify",
                `Globally blocked 'displaycapture' at `
                + `'${frameWindow.location.href}'`, "perm")
        }
        throw new DOMException("Permission denied", "NotAllowedError")
    }
    return new Promise(async () => {
        try {
            const sources = await desktopCapturer.getSources(
                {"types": ["screen", "window"]})
            const stylingElem = document.createElement("style")
            stylingElem.textContent = displayCaptureStyling
                .replace(/%FONTSIZE%/g, settings.fontsize || "14")
                .replace(/%FG%/g, settings.fg || "#eee")
                .replace(/%BG%/g, settings.bg || "#333")
                .replace(/%SHADE%/g, "#7777")
            const selectionElem = document.createElement("div")
            selectionElem.classList = "desktop-capturer-selection"
            selectionElem.innerHTML = `
            <span class="desktop-capturer-selection__scroller">
                <span class="desktop-capturer-selection__close">X</span>
                <span class="desktop-capturer-selection__list">
                    ${sources.map(details => `
                        <span class="desktop-capturer-selection__item">
                            <span class="desktop-capturer-selection__btn"
                                data-id="${details.id}">
                            <img class="desktop-capturer-selection__thumbnail"
                                src="${details.thumbnail.toDataURL()}" />
                            <span class="desktop-capturer-selection__name">
                                ${details.name.trim()}</span>
                            </span>
                        </span>
                    `).join("")}
                </span>
            </span>`
            document.body.appendChild(selectionElem)
            document.head.appendChild(stylingElem)
            const closeButtons = [selectionElem, selectionElem.querySelector(
                ".desktop-capturer-selection__close")]
            closeButtons.forEach(button => {
                button.addEventListener("click", e => {
                    if (e.path.find(el => el?.matches?.(
                        ".desktop-capturer-selection__btn"))) {
                        // Also clicked on a display to share, ignore close
                        return
                    }
                    selectionElem.remove()
                    stylingElem.remove()
                    if (settingRule) {
                        ipcRenderer.sendToHost("notify",
                            `Ask rule for 'displaycapture' activated at '`
                            + `${frameWindow.location.href}' which was `
                            + `blocked by user`, "perm")
                    } else {
                        ipcRenderer.sendToHost("notify",
                            `Manually blocked 'displaycapture' at `
                            + `'${frameWindow.location.href}'`, "perm")
                    }
                    throw new DOMException(
                        "Permission denied", "NotAllowedError")
                })
            })
            selectionElem.querySelectorAll(
                ".desktop-capturer-selection__btn").forEach(button => {
                button.addEventListener("click", async () => {
                    try {
                        const id = button.getAttribute("data-id")
                        resolve(await frameWindow.navigator.mediaDevices
                            .getUserMedia({
                                "audio": false,
                                "video": {
                                    "mandatory": {
                                        "chromeMediaSource": "desktop",
                                        "chromeMediaSourceId": id
                                    }
                                }
                            }))
                    } catch (err) {
                        reject(err)
                    }
                    selectionElem.remove()
                    stylingElem.remove()
                })
            })
        } catch (err) {
            reject(err)
        }
    })
})
