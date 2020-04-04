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

// Hide device labels and ids from the list of media devices
// Disable the screen share API, as electron has no support for it
const generateRandomId = () => {
    // Generate a random string of 64 characters as the device ids
    const uints = new Uint8Array(32)
    window.crypto.getRandomValues(uints)
    return Array.from(uints, n => `0${n.toString(16)}`.substr(-2)).join("")
}
try {
    const enumerate = window.navigator.mediaDevices.enumerateDevices
    const constraints = window.navigator.mediaDevices.getSupportedConstraints
    const usermedia = window.navigator.mediaDevices.getUserMedia
    const ondevicechange = window.navigator.mediaDevices.ondevicechange

    window.navigator.mediaDevices.enumerateDevices = async () => {
        const devices = await enumerate.call(window.navigator.mediaDevices)
        const safeDeviceList = []
        ;["audiooutput", "audioinput", "videoinput"].forEach(type => {
            if (devices.find(d => d.kind === type)) {
                safeDeviceList.push({
                    "deviceId": generateRandomId(),
                    "groupId": generateRandomId(),
                    "label": "",
                    "kind": type
                })
            }
        })
        return safeDeviceList
    }
    window.navigator.mediaDevices.getDisplayMedia = () => new Promise(() => {
        throw new DOMException("Permission denied", "NotAllowedError")
    })
    window.navigator.mediaDevices.getSupportedConstraints = constraints
    window.navigator.mediaDevices.getUserMedia = usermedia
    window.navigator.mediaDevices.ondevicechange = ondevicechange
} catch (e) {
    // Some devices and electron version don't expose these anyway
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
const getParam = WebGLRenderingContext.getParameter
window.WebGLRenderingContext.prototype.getExtension = parameter => {
    if ([37445, 37446].includes(parameter)) {
        return null
    }
    return getParam(parameter)
}
