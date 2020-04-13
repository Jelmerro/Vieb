/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020 Jelmer van Arnhem
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

const {remote} = require("electron")
const fs = require("fs")
const path = require("path")

const message = "The page has requested to view a list of all media devices."
    + " You can allow or deny this below, and choose if you want the list to"
    + " include the names (labels) of the media device in the response."
    + " To prevent pages from asking this, change the permission like so:"
    + " 'set permissionmediadevices=<value>'"
const webviewSettingsFile = path.join(
    remote.app.getPath("appData"), "webviewsettings")

// Hide device labels from the list of media devices
// Disable the screen share API, as electron has no support for it
try {
    const enumerate = window.navigator.mediaDevices.enumerateDevices
    const constraints = window.navigator.mediaDevices.getSupportedConstraints
    const usermedia = window.navigator.mediaDevices.getUserMedia
    const ondevicechange = window.navigator.mediaDevices.ondevicechange
    window.navigator.mediaDevices.enumerateDevices = async () => {
        let action = "ask"
        try {
            action = JSON.parse(fs.readFileSync(
                webviewSettingsFile).toString()).permissionmediadevices
            if (!["block", "ask", "allow", "allowfull"].includes(action)) {
                action = "ask"
            }
        } catch (e) {
            // No webview settings configured, assuming the default ask value
        }
        if (action === "ask") {
            const ask = await remote.dialog.showMessageBox(
                remote.getCurrentWindow(), {
                    "type": "question",
                    "buttons": ["Allow", "Deny"],
                    "defaultId": 0,
                    "cancelId": 1,
                    "checkboxLabel": "Include media device name labels",
                    "title": "Allow this page to view a list of media devices?",
                    "message": `${message}\n\npage:\n${window.location.href}`
                })
            if (ask.response === 0 && ask.checkboxChecked) {
                action = "allowfull"
            }
            if (ask.response === 1) {
                action = "block"
            }
        }
        if (action === "block") {
            throw new DOMException("Permission denied", "NotAllowedError")
        }
        const devices = await enumerate.call(window.navigator.mediaDevices)
        if (action === "allowfull") {
            return devices
        }
        return devices.map(({deviceId, groupId, kind}) => ({
            deviceId, groupId, "label": "", kind
        }))
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
window.navigator.__defineGetter__("plugins", () => [])

// Don't share the connection information
window.navigator.__defineGetter__("connection", () => undefined)

// Disable the experimental keyboard API, which exposes every key mapping
window.navigator.__defineGetter__("keyboard", () => undefined)

// Disable the battery API entirely
window.navigator.__proto__.getBattery = () => undefined

// Return the static maximum value for memory and thread count
window.navigator.__defineGetter__("hardwareConcurrency", () => 8)
window.navigator.__defineGetter__("deviceMemory", () => 8)

// Hide graphics card information from the canvas API
const getParam = window.WebGLRenderingContext.prototype.getParameter
window.WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if ([37445, 37446].includes(parameter)) {
        return ""
    }
    return getParam.call(this, parameter)
}
