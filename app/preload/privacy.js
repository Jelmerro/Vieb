/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2022 Jelmer van Arnhem
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
const {matchesQuery, readJSON, joinPath, appData} = require("../util")

const message = "The page has requested to view a list of all media devices."
    + " You can allow or deny this below, and choose if you want the list to"
    + " include the names (labels) of the media device in the response."
    + " For help and options, see ':h permissionmediadevices', ':h permissions"
    + "allowed', ':h permissionsasked' and ':h permissionsblocked'."
const settingsFile = joinPath(appData(), "webviewsettings")
const displayCaptureStyling = `html, body {overflow: hidden !important;}
.desktop-capturer-selection {
    font-family: sans-serif;font-weight: revert;font-size: 14px;
    position: fixed;top: 0;left: 0;width: 100%;height: 100vh;line-height: 1;
    background: %SHADE%;color: %FG%;z-index: 10000000;text-align: center;
    display: flex;align-items: center;justify-content: center;
}
.desktop-capturer-selection__scroller {
    width: 100%;max-height: 100vh;overflow-y: auto;
}
.desktop-capturer-selection__close {
    position: fixed;font-size: 40px;top: 10px;right: 10px;width: 40px;
    height: 40px;cursor: pointer;line-height: 1;
}
.desktop-capturer-selection__list {
    max-width: calc(100% - 100px);margin: 50px;padding: 0;display: flex;
    list-style: none;overflow: hidden;justify-content: center;flex-wrap: wrap;
}
.desktop-capturer-selection__item {display: flex;margin: 10px;}
.desktop-capturer-selection__btn {
    display: flex;flex-direction: column;margin: 0;border: 0;width: 160px;
    background: %BG%;color: %FG%;align-items: center;height: auto;
    font-size: %FONTSIZE%px;font-weight: bold;cursor: pointer;line-height: 1;
}
.desktop-capturer-selection__thumbnail {margin: 5px;width: 150px;}
.desktop-capturer-selection__appicon {width: 30px;}
.desktop-capturer-selection__name {margin: 10px;overflow-wrap: anywhere;}
.desktop-capturer-selection__btn:hover, .desktop-capturer-selection__btn:focus {
    background: %FG%;color: %BG%;
}`

try {
    // Hide device labels from the list of media devices by default
    const enumerate = window.navigator.mediaDevices.enumerateDevices
    const mediaDeviceList = async action => {
        if (action === "block") {
            throw new DOMException("Permission denied", "NotAllowedError")
        }
        const devices = await enumerate.call(window.navigator.mediaDevices)
        if (action === "allowfull") {
            return devices
        }
        return devices.map(({deviceId, groupId, kind}) => ({
            deviceId, groupId, kind, "label": ""
        }))
    }
    window.navigator.mediaDevices.enumerateDevices = async() => {
        let setting = "ask"
        const settings = readJSON(settingsFile) || {}
        setting = settings.permissionmediadevices || setting
        if (!["block", "ask", "allow", "allowfull"].includes(setting)) {
            setting = "ask"
        }
        let settingRule = ""
        for (const type of ["ask", "block", "allow"]) {
            const permList = settings[`permissions${type}ed`]?.split(",")
            for (const r of permList || []) {
                if (!r.trim() || settingRule) {
                    continue
                }
                const [match, ...names] = r.split("~")
                if (names.find(p => p.endsWith("mediadevices"))) {
                    if (window.location.href.match(match)) {
                        settingRule = type
                    }
                }
            }
        }
        setting = settingRule || setting
        if (setting === "ask") {
            let url = window.location.href
            if (url.length > 100) {
                url = url.replace(/.{50}/g, "$&\n")
            }
            const ask = await ipcRenderer.invoke("show-message-dialog", {
                "buttons": ["Allow", "Deny"],
                "cancelId": 1,
                "checkboxLabel": "Include media device name labels",
                "defaultId": 0,
                "message": `${message}\n\npage:\n${url}`,
                "title": "Allow this page to access 'mediadevices'?",
                "type": "question"
            })
            if (ask.response === 0) {
                if (ask.checkboxChecked) {
                    ipcRenderer.sendToHost("notify",
                        `Manually allowfulled 'mediadevices' at `
                            + `'${window.location.href}'`, "perm")
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
                        + `${window.location.href}' which was `
                        + `${setting}ed by user`, "perm")
            } else {
                ipcRenderer.sendToHost("notify",
                    `Manually ${setting}ed 'mediadevices' at `
                        + `'${window.location.href}'`, "perm")
            }
            return mediaDeviceList(setting)
        }
        if (settingRule) {
            ipcRenderer.sendToHost("notify",
                `Automatic rule for 'mediadevices' activated at '${
                    window.location.href}' which was ${setting}ed`, "perm")
        } else {
            ipcRenderer.sendToHost("notify",
                `Globally ${setting}ed 'mediadevices' at `
                    + `'${window.location.href}' based on `
                    + "'permissionmediadevices'", "perm")
        }
        return mediaDeviceList(setting)
    }
    // Enable screensharing functionality linked to permissiondisplaycapture
    window.navigator.mediaDevices.getDisplayMedia = () => new Promise((
        resolve, reject
    ) => {
        let setting = "block"
        const settings = readJSON(settingsFile) || {}
        setting = settings.permissiondisplaycapture || setting
        let settingRule = ""
        for (const type of ["ask", "block"]) {
            for (const r of settings[`permissions${type}ed`].split(",")) {
                if (!r.trim() || settingRule) {
                    continue
                }
                const [match, ...names] = r.split("~")
                if (names.find(p => p.endsWith("displaycapture"))) {
                    if (window.location.href.match(match)) {
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
                + `${window.location.href}' which was blocked`, "perm")
            } else {
                ipcRenderer.sendToHost("notify",
                    `Globally blocked 'displaycapture' at `
                + `'${window.location.href}' based on 'permission`
                + "displaycapture'", "perm")
            }
            throw new DOMException("Permission denied", "NotAllowedError")
        }
        try {
            ipcRenderer.invoke("desktop-capturer-sources").then(sources => {
                const stylingElem = document.createElement("style")
                stylingElem.textContent = displayCaptureStyling
                    .replace(/%FONTSIZE%/g, settings.guifontsize || "14")
                    .replace(/%FG%/g, settings.fg || "#eee")
                    .replace(/%BG%/g, settings.bg || "#333")
                    .replace(/%SHADE%/g, "#7777")
                const selectionElem = document.createElement("div")
                selectionElem.classList = "desktop-capturer-selection"
                const appIcon = icon => {
                    if (!icon || icon.isEmpty() || icon.getSize().width < 1) {
                        return ""
                    }
                    return icon.toDataURL()
                }
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
                            <img class="desktop-capturer-selection__appicon"
                                src="${appIcon(details.appIcon)}" />
                            <span class="desktop-capturer-selection__name">
                                ${details.name.trim()}</span>
                            </span>
                        </span>
                    `).join("")}
                </span>
            </span>`
                document.body.appendChild(selectionElem)
                document.head.appendChild(stylingElem)
                const closeButtons = [selectionElem, selectionElem
                    .querySelector(".desktop-capturer-selection__close")]
                closeButtons.forEach(button => {
                    button.addEventListener("click", e => {
                        if (e.composedPath().find(el => matchesQuery(el,
                            ".desktop-capturer-selection__btn"))) {
                            // Also clicked on a display to share, ignore close
                            return
                        }
                        selectionElem.remove()
                        stylingElem.remove()
                        if (settingRule) {
                            ipcRenderer.sendToHost("notify",
                                `Ask rule for 'displaycapture' activated at '`
                            + `${window.location.href}' which was `
                            + `blocked by user`, "perm")
                        } else {
                            ipcRenderer.sendToHost("notify",
                                `Manually blocked 'displaycapture' at `
                            + `'${window.location.href}'`, "perm")
                        }
                        throw new DOMException(
                            "Permission denied", "NotAllowedError")
                    })
                })
                selectionElem.querySelectorAll(
                    ".desktop-capturer-selection__btn").forEach(button => {
                    button.addEventListener("click", async() => {
                        try {
                            const id = button.getAttribute("data-id")
                            resolve(await window.navigator.mediaDevices
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
            })
        } catch (err) {
            reject(err)
        }
    })
} catch {
    // Non-secure resources don't expose these APIs
}
// Don't share the connection information
Object.defineProperty(window.Navigator.prototype,
    "connection", {"get": (() => undefined).bind(null)})
try {
    delete Object.getPrototypeOf(window.navigator).connection
} catch {
    // No deletion allowed in this context, set to undefined instead
}
// Disable the experimental keyboard API, which exposes every key mapping
Object.defineProperty(window.Navigator.prototype,
    "keyboard", {"get": (() => undefined).bind(null)})
try {
    delete Object.getPrototypeOf(window.navigator).keyboard
} catch {
    // No deletion allowed in this context, set to undefined instead
}
// Always act as if there is no battery and the state never changes
Object.defineProperty(window.BatteryManager.prototype,
    "level", {"get": () => 1})
Object.defineProperty(window.BatteryManager.prototype,
    "charging", {"get": () => true})
Object.defineProperty(window.BatteryManager.prototype,
    "chargingTime", {"get": () => 0})
Object.defineProperty(window.BatteryManager.prototype,
    "dischargingTime", {"get": () => Infinity})
Object.defineProperty(window.BatteryManager.prototype,
    "onchargingchange", {"get": () => null})
Object.defineProperty(window.BatteryManager.prototype,
    "onchargingtimechange", {"get": () => null})
Object.defineProperty(window.BatteryManager.prototype,
    "ondischargingtimechange", {"get": () => null})
Object.defineProperty(window.BatteryManager.prototype,
    "onlevelchange", {"get": () => null})
// Custom prompt, confirm and alert, based on "dialog*" settings
// Options: return the default cancel action, show a custom popup or notify
window.prompt = text => {
    const settings = readJSON(settingsFile) || {}
    const promptBehavior = settings.dialogprompt || "notifyblock"
    if (promptBehavior.includes("notify")) {
        const url = window.location.href
        ipcRenderer.sendToHost("notify",
            `Page ${url} wanted to show a prompt dialog: ${text}`, "dial")
    }
    if (promptBehavior.includes("show")) {
        return ipcRenderer.sendSync("show-prompt-dialog", text)
    }
    return null
}
window.confirm = text => {
    const settings = readJSON(settingsFile) || {}
    const confirmBehavior = settings.dialogconfirm || "notifyblock"
    if (confirmBehavior.includes("notify")) {
        const url = window.location.href
        ipcRenderer.sendToHost("notify",
            `Page ${url} wanted to show a confirm dialog: ${text}`, "dial")
    }
    if (confirmBehavior.includes("show")) {
        const button = ipcRenderer.sendSync("sync-message-dialog", {
            "buttons": ["OK", "Cancel"],
            "cancelId": 1,
            "defaultId": 0,
            "message": text,
            "title": "Confirm",
            "type": "question"
        })
        return button === 0
    }
    return false
}
window.alert = text => {
    const settings = readJSON(settingsFile) || {}
    const alertBehavior = settings.dialogalert || "notifyblock"
    if (alertBehavior.includes("notify")) {
        const url = window.location.href
        ipcRenderer.sendToHost("notify",
            `Page ${url} wanted to show an alert dialog: ${text}`, "dial")
    }
    if (alertBehavior.includes("show")) {
        ipcRenderer.sendSync("sync-message-dialog", {
            "buttons": ["OK"],
            "cancelId": 1,
            "defaultId": 0,
            "message": text,
            "title": "Alert",
            "type": "question"
        })
    }
    return undefined
}
// Return a static maximum value for memory and thread count
Object.defineProperty(window.Navigator.prototype,
    "hardwareConcurrency", {"get": (() => 8).bind(null)})
Object.defineProperty(window.Navigator.prototype,
    "deviceMemory", {"get": (() => 8).bind(null)})
// Hide graphics card information from the canvas API
const getParam = window.WebGLRenderingContext.prototype.getParameter
window.WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if ([37445, 37446].includes(parameter)) {
        return ""
    }
    return getParam.call(this, parameter)
}
const getParam2 = window.WebGL2RenderingContext.prototype.getParameter
window.WebGL2RenderingContext.prototype.getParameter = function(parameter) {
    if ([37445, 37446].includes(parameter)) {
        return ""
    }
    return getParam2.call(this, parameter)
}
// If using a Firefox useragent, also modify the Firefox navigator properties
if (window.navigator.userAgent.includes("Firefox")) {
    Object.defineProperty(window.Navigator.prototype,
        "buildID", {"get": (() => "20181001000000").bind(null)})
    Object.defineProperty(window.Navigator.prototype,
        "doNotTrack", {"get": (() => "unspecified").bind(null)})
    Object.defineProperty(window.Navigator.prototype,
        "oscpu", {"get": (() => String(window.Navigator.platform)).bind(null)})
    Object.defineProperty(window.Navigator.prototype,
        "productSub", {"get": (() => "20100101").bind(null)})
    Object.defineProperty(window.Navigator.prototype,
        "vendor", {"get": (() => "").bind(null)})
    Object.defineProperty(window, "chrome", {})
}
// Provide a wrapper for window.open with a subset of the regular API
// Also provide the option to open new tabs by setting the location property
window.open = (url = null) => {
    if (url) {
        ipcRenderer.sendToHost(
            "url", new URL(url, window.location.href).href)
    }
    const obj = {}
    Object.defineProperty(obj, "location", {"get": (() => "").bind(null),
        "set": (val => {
            ipcRenderer.sendToHost(
                "url", new URL(val, window.location.href).href)
        }).bind(null)})
    return obj
}
