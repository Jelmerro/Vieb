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

const privacyFixes = (w = window) => {
    // Hide device labels from the list of media devices
    // Disable the screen share API, as electron has no support for it
    try {
        const enumerate = w.navigator.mediaDevices.enumerateDevices
        const constraints = w.navigator.mediaDevices.getSupportedConstraints
        const usermedia = w.navigator.mediaDevices.getUserMedia
        const ondevicechange = w.navigator.mediaDevices.ondevicechange
        const mediaDeviceList = async (action, notify = false) => {
            if (notify) {
                ipcRenderer.sendToHost("notify",
                    `${notify} ${action}ed 'mediadevices' at `
                    + `'${w.location.href}' based on `
                    + "'permissionmediadevices'", "perm")
            }
            if (action === "block") {
                throw new DOMException("Permission denied", "NotAllowedError")
            }
            const devices = await enumerate.call(w.navigator.mediaDevices)
            if (action === "allowfull") {
                if (!notify) {
                    ipcRenderer.sendToHost("notify",
                        `Manually allowfulled 'mediadevices' at `
                        + `'${w.location.href}'`, "perm")
                }
                return devices
            }
            return devices.map(({deviceId, groupId, kind}) => ({
                deviceId, groupId, "label": "", kind
            }))
        }
        w.navigator.mediaDevices.enumerateDevices = async () => {
            let action = "ask"
            let settings = {}
            try {
                settings = JSON.parse(fs.readFileSync(settingsFile).toString())
            } catch (e) {
                // No webview settings configured, assuming the default "ask"
            }
            for (const type of ["block", "allow"]) {
                for (const r of settings[`permissions${type}ed`]?.split(",")) {
                    if (!r.trim()) {
                        continue
                    }
                    const [match, ...names] = r.split("~")
                    if (names.find(p => p.endsWith("mediadevices"))) {
                        if (w.location.href.match(match)) {
                            ipcRenderer.sendToHost("notify",
                                `Automatic rule for 'mediadevices' `
                                + `activated at '${w.location.href}' `
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
        w.navigator.mediaDevices.getDisplayMedia = () => new Promise(() => {
            throw new DOMException("Permission denied", "NotAllowedError")
        })
        w.navigator.mediaDevices.getSupportedConstraints = constraints
        w.navigator.mediaDevices.getUserMedia = usermedia
        w.navigator.mediaDevices.ondevicechange = ondevicechange
    } catch (e) {
        // Some devices and electron versions don't expose these anyway
        // Also does not seem to be added when page does not use https
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
