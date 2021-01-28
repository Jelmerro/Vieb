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

const {ipcRenderer} = require("electron")
const fs = require("fs")
const path = require("path")

const message = "The page has requested to view a list of all media devices."
    + " You can allow or deny this below, and choose if you want the list to"
    + " include the names (labels) of the media device in the response."
    + " For help and options, see ':h permissionmediadevices',"
    + " ':h permissionsallowed' and ':h permissionsblocked'."
const settingsFile = path.join(
    ipcRenderer.sendSync("appdata-path"), "webviewsettings")

// Hide device labels from the list of media devices
// Disable the screen share API, as electron has no support for it
try {
    const enumerate = window.navigator.mediaDevices.enumerateDevices
    const constraints = window.navigator.mediaDevices.getSupportedConstraints
    const usermedia = window.navigator.mediaDevices.getUserMedia
    const ondevicechange = window.navigator.mediaDevices.ondevicechange
    const mediaDeviceList = async (action, notify = false) => {
        if (notify) {
            ipcRenderer.sendToHost("notify",
                `${notify} ${action}ed 'mediadevices' at `
                + `'${window.location.href}' based on `
                + "'permissionmediadevices'", "perm")
        }
        if (action === "block") {
            throw new DOMException("Permission denied", "NotAllowedError")
        }
        const devices = await enumerate.call(window.navigator.mediaDevices)
        if (action === "allowfull") {
            if (!notify) {
                ipcRenderer.sendToHost("notify",
                    `Manually allowfulled 'mediadevices' at `
                    + `'${window.location.href}'`, "perm")
            }
            return devices
        }
        return devices.map(({deviceId, groupId, kind}) => ({
            deviceId, groupId, "label": "", kind
        }))
    }
    window.navigator.mediaDevices.enumerateDevices = async () => {
        let action = "ask"
        let settings = {}
        try {
            settings = JSON.parse(fs.readFileSync(settingsFile).toString())
        } catch (e) {
            // No webview settings configured, assuming the default ask value
        }
        for (const type of ["block", "allow"]) {
            for (const r of settings[`permissions${type}ed`]?.split(",")) {
                if (!r.trim()) {
                    continue
                }
                const [match, ...names] = r.split("~")
                if (names.find(p => p.endsWith("mediadevices"))) {
                    if (window.location.href.match(match)) {
                        ipcRenderer.sendToHost("notify",
                            `Automatic rule for 'mediadevices' `
                            + `activated at '${window.location.href}' `
                            + `which was ${type}ed`, "perm")
                        return mediaDeviceList(type)
                    }
                }
            }
        }
        action = settings.permissionmediadevices
        if (!["block", "ask", "allow", "allowfull"].includes(action)) {
            action = "ask"
        }
        if (action === "ask") {
            let url = window.location.href
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
                    return mediaDeviceList("allowfull")
                }
                action = "allow"
            }
            if (ask.response === 1) {
                action = "block"
            }
            return mediaDeviceList(action, "Manually")
        }
        return mediaDeviceList(action, "Globally")
    }
    window.navigator.mediaDevices.getDisplayMedia = () => new Promise(() => {
        throw new DOMException("Permission denied", "NotAllowedError")
    })
    window.navigator.mediaDevices.getSupportedConstraints = constraints
    window.navigator.mediaDevices.getUserMedia = usermedia
    window.navigator.mediaDevices.ondevicechange = ondevicechange
} catch (e) {
    // Some devices and electron versions don't expose these anyway
    // Also does not seem to be added when page does not use https
}

// Empty the list of browser plugins, as there shouldn't be any installed
Object.defineProperty(window.navigator, "plugins", {"value": []})
Object.defineProperty(window.navigator, "mimeTypes", {"value": []})

// Don't share the connection information
Object.defineProperty(window.navigator, "connection", {})

// Disable the experimental keyboard API, which exposes every key mapping
Object.defineProperty(window.navigator, "keyboard", {})

// Disable the battery API entirely
window.navigator.__proto__.getBattery = undefined

// Always return the cancel action for prompts, without throwing
window.prompt = () => null

// Return the static maximum value for memory and thread count
Object.defineProperty(window.navigator, "hardwareConcurrency", {"value": 8})
Object.defineProperty(window.navigator, "deviceMemory", {"value": 8})

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

// If using Firefox mode, also modify the other navigator properties to match
if (window.navigator.userAgent.includes("Firefox")) {
    Object.defineProperty(window.navigator,
        "buildID", {"value": "20181001000000"})
    Object.defineProperty(window.navigator,
        "doNotTrack", {"value": "unspecified"})
    Object.defineProperty(window.navigator,
        "oscpu", {"value": window.navigator.platform})
    Object.defineProperty(window.navigator, "productSub", {"value": "20100101"})
    Object.defineProperty(window.navigator, "vendor", {"value": ""})
    Object.defineProperty(window.navigator, "webdriver", {"value": false})
}

// Provide a wrapper for window.open so that it doesn't crash websites
// Also provide the option to open new tabs by setting the location property
const electronWindowOpen = window.open
window.open = (url = null) => {
    if (url) {
        electronWindowOpen(url)
    }
    const test = {}
    Object.defineProperty(test, "location", {
        "get": () => "", "set": val => electronWindowOpen(val)
    })
    return test
}
