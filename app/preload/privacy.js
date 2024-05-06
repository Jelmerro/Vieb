/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2024 Jelmer van Arnhem
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
/* eslint-disable no-extra-bind */

const {ipcRenderer} = require("electron")
const {matchesQuery, getSetting} = require("../util")
const {translate} = require("../translate")

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

/**
 * Send a notification to the renderer thread.
 * @param {import("../util").NotificationInfo} opts
 */
const notify = opts => ipcRenderer.sendToHost("notify", opts)

try {
    // Hide device labels from the list of media devices by default
    const enumerate = window.navigator.mediaDevices.enumerateDevices

    /**
     * Get the media devices with or without labels, or throw permission error.
     * @param {string} action
     */
    const mediaDeviceList = async action => {
        if (action === "block") {
            return []
        }
        const devices = await enumerate.call(window.navigator.mediaDevices)
        if (action === "allowfull") {
            return devices
        }
        if (action === "allowkind") {
            return devices.map(({kind}) => ({
                "deviceId": "",
                "groupId": "",
                kind,
                "label": "",
                /** Add the toJSON method of the MediaDeviceInfo. */
                "toJSON": () => ({
                    "deviceId": "", "groupId": "", kind, "label": ""
                })
            }))
        }
        return devices.map(({deviceId, groupId, kind}) => ({
            deviceId,
            groupId,
            kind,
            "label": "",
            /** Add the toJSON method of the MediaDeviceInfo. */
            "toJSON": () => ({
                deviceId, groupId, kind, "label": ""
            })
        }))
    }

    /** Override the device list based on permission settings. */
    window.navigator.mediaDevices.enumerateDevices = () => {
        let setting = getSetting("permissionmediadevices") ?? "block"
        const valid = ["block", "allow", "allowkind", "allowfull"]
        if (!valid.includes(setting)) {
            setting = "block"
        }
        /** @type {"block"|"allow"|"allowkind"|"allowfull"|null} */
        let settingRule = null
        const url = window.location.href
        /** @type {("block"|"allow")[]} */
        const permissionOverrideTypes = ["block", "allow"]
        for (const type of permissionOverrideTypes) {
            const permList = getSetting(
                `permissions${type}ed`)
            for (const r of permList ?? []) {
                if (!r.trim() || settingRule) {
                    continue
                }
                const [match, ...names] = r.split("~")
                if (names.some(p => p.endsWith("mediadevices"))) {
                    if (url.match(match)) {
                        settingRule = type
                        break
                    }
                }
                if (names.some(p => p.endsWith("mediadevicesfull"))) {
                    if (url.match(match) && type === "allow") {
                        settingRule = "allowfull"
                        break
                    }
                }
                if (names.some(p => p.endsWith("mediadeviceskind"))) {
                    if (url.match(match) && type === "allow") {
                        settingRule = "allowkind"
                        break
                    }
                }
            }
        }
        setting = settingRule ?? setting
        if (settingRule) {
            notify({
                "fields": [
                    setting.replace(/allow.*/, "allow"),
                    "mediadevices",
                    window.location.href,
                    translate(`permissions.notifyLevels.${setting}`)
                ],
                "id": "permissions.notify.auto",
                "src": "user",
                "type": "permission"
            })
        } else {
            notify({
                "fields": [
                    translate(`permissions.notifyLevels.${setting}`),
                    "mediadevices",
                    window.location.href,
                    "permissionmediadevices"
                ],
                "id": "permissions.notify.global",
                "src": "user",
                "type": "permission"
            })
        }
        return mediaDeviceList(setting)
    }
    /** Enable screensharing feature linked to permissiondisplaycapture. */
    window.navigator.mediaDevices.getDisplayMedia = () => new Promise((
        resolve, reject
    ) => {
        /** @type {"ask"|"block"} */
        let setting = "block"
        setting = getSetting("permissiondisplaycapture") || setting
        /** @type {"ask"|"block"|null} */
        let settingRule = null
        /** @type {("ask"|"block")[]} */
        const permissionOverrideTypes = ["ask", "block"]
        for (const type of permissionOverrideTypes) {
            for (const r of getSetting(
                `permissions${type}ed`) ?? []) {
                if (!r.trim() || settingRule) {
                    continue
                }
                const [match, ...names] = r.split("~")
                if (names.some(p => p.endsWith("displaycapture"))) {
                    if (window.location.href.match(match)) {
                        settingRule = type
                        break
                    }
                }
            }
        }
        setting = settingRule || setting
        // Only blocked requests are notified here right away,
        // because allowed requests are passed to the regular permission system.
        if (setting !== "ask") {
            if (settingRule) {
                notify({
                    "fields": [
                        setting,
                        "displaycapture",
                        window.location.href,
                        translate(`permissions.notifyLevels.${setting}`)
                    ],
                    "id": "permissions.notify.auto",
                    "src": "user",
                    "type": "permission"
                })
            } else {
                notify({
                    "fields": [
                        translate(`permissions.notifyLevels.${setting}`),
                        "displaycapture",
                        window.location.href,
                        "permissiondisplaycapture"
                    ],
                    "id": "permissions.notify.global",
                    "src": "user",
                    "type": "permission"
                })
            }
            throw new DOMException("Permission denied", "NotAllowedError")
        }
        try {
            /**
             * Generate a window selection for all the deskktop sources.
             * @param {Electron.DesktopCapturerSource[]} sources
             */
            const populateSourceToWindow = sources => {
                const style = displayCaptureStyling
                    .replace(/%FONTSIZE%/g, String(
                        getSetting("guifontsize")) || "14")
                    .replace(/%FG%/g, getSetting("fg") || "#eee")
                    .replace(/%BG%/g, getSetting("bg") || "#333")
                    .replace(/%SHADE%/g, "#7777")
                const selectionElem = document.createElement("div")
                selectionElem.classList.add("desktop-capturer-selection")

                /**
                 * Get a data src url from a native image if possible.
                 * @param {Electron.NativeImage} icon
                 */
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
                document.body.append(selectionElem)
                ipcRenderer.sendToHost(
                    "custom-style-inject", "displaycapture", style)
                const closeButtons = [selectionElem, selectionElem
                    .querySelector(".desktop-capturer-selection__close")]
                closeButtons.forEach(button => {
                    button?.addEventListener("click", e => {
                        if (e.composedPath().some(el => matchesQuery(el,
                            ".desktop-capturer-selection__btn"))) {
                            // Also clicked on a display to share, ignore close
                            return
                        }
                        selectionElem.remove()
                        ipcRenderer.sendToHost(
                            "custom-style-inject", "displaycapture")
                        if (settingRule) {
                            notify({
                                "fields": [
                                    "displaycapture",
                                    window.location.href,
                                    translate("permissions.notifyLevels.block")
                                ],
                                "id": "permissions.notify.ask",
                                "src": "user",
                                "type": "permission"
                            })
                        } else {
                            notify({
                                "fields": [
                                    translate("permissions.notifyLevels.block"),
                                    "displaycapture",
                                    window.location.href
                                ],
                                "id": "permissions.notify.manual",
                                "src": "user",
                                "type": "permission"
                            })
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
                                        // @ts-expect-error Electron required
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
                        ipcRenderer.sendToHost(
                            "custom-style-inject", "displaycapture")
                    })
                })
            }

            ipcRenderer.invoke("desktop-capturer-sources")
                .then(populateSourceToWindow)
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
// HTTPS-only: Always act as if there is no battery and the state never changes
/* eslint-disable jsdoc/require-jsdoc */
// @ts-expect-error Not present in HTTP environments nor ts spec
if (window.BatteryManager) {
    // @ts-expect-error Not present in HTTP environments nor ts spec
    Object.defineProperty(window.BatteryManager.prototype,
        "level", {"get": () => 1})
    // @ts-expect-error Not present in HTTP environments nor ts spec
    Object.defineProperty(window.BatteryManager.prototype,
        "charging", {"get": () => true})
    // @ts-expect-error Not present in HTTP environments nor ts spec
    Object.defineProperty(window.BatteryManager.prototype,
        "chargingTime", {"get": () => 0})
    // @ts-expect-error Not present in HTTP environments nor ts spec
    Object.defineProperty(window.BatteryManager.prototype,
        "dischargingTime", {"get": () => Infinity})
    // @ts-expect-error Not present in HTTP environments nor ts spec
    Object.defineProperty(window.BatteryManager.prototype,
        "onchargingchange", {"get": () => null})
    // @ts-expect-error Not present in HTTP environments nor ts spec
    Object.defineProperty(window.BatteryManager.prototype,
        "onchargingtimechange", {"get": () => null})
    // @ts-expect-error Not present in HTTP environments nor ts spec
    Object.defineProperty(window.BatteryManager.prototype,
        "ondischargingtimechange", {"get": () => null})
    // @ts-expect-error Not present in HTTP environments nor ts spec
    Object.defineProperty(window.BatteryManager.prototype,
        "onlevelchange", {"get": () => null})
}
/* eslint-enable jsdoc/require-jsdoc */
// Custom prompt, confirm and alert, based on "dialog*" settings
// Options: return the default cancel action, show a custom popup or notify
/**
 * Show a custom prompt, a notification, both or neither based on dialogprompt.
 * @param {string|undefined} title
 * @param {string} defaultText
 */
window.prompt = (title, defaultText = "") => {
    const promptBehavior = getSetting("dialogprompt") ?? "notifyblock"
    if (promptBehavior.includes("notify")) {
        notify({
            "fields": [window.location.href, title ?? ""],
            "id": "popups.prompt.block",
            "src": "user",
            "type": "dialog"
        })
    }
    if (promptBehavior.includes("show")) {
        return ipcRenderer.sendSync("show-prompt-dialog", title, defaultText)
    }
    return null
}
/**
 * Show a confirm, a notification, both or neither based on dialogconfirm.
 * @param {string|undefined} text
 */
window.confirm = text => {
    const confirmBehavior = getSetting("dialogconfirm") ?? "notifyblock"
    if (confirmBehavior.includes("notify")) {
        notify({
            "fields": [window.location.href, text ?? ""],
            "id": "popups.confirm.block",
            "src": "user",
            "type": "dialog"
        })
    }
    if (confirmBehavior.includes("show")) {
        const button = ipcRenderer.sendSync("sync-message-dialog", {
            "buttons": [
                translate("popups.confirm.ok"),
                translate("popups.confirm.cancel")
            ],
            "cancelId": 1,
            "defaultId": 0,
            "message": text,
            "title": translate("popups.confirm.title"),
            "type": "question"
        })
        return button === 0
    }
    return confirmBehavior.includes("allow")
}
/**
 * Show an alert, a notification, both or neither based on dialogalert.
 * @param {string|undefined} text
 */
window.alert = text => {
    const alertBehavior = getSetting("dialogalert") ?? "notifyblock"
    if (alertBehavior.includes("notify")) {
        notify({
            "fields": [window.location.href, text ?? ""],
            "id": "popups.alert.block",
            "src": "user",
            "type": "dialog"
        })
    }
    if (alertBehavior.includes("show")) {
        ipcRenderer.sendSync("sync-message-dialog", {
            "buttons": [translate("popups.alert.ok")],
            "cancelId": 1,
            "defaultId": 0,
            "message": text,
            "title": translate("popups.alert.title"),
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
/* eslint-disable no-restricted-syntax */
/**
 * Override the getParameter function to return nothing when asked for GPU info.
 * @param {number} parameter
 */
window.WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if ([37445, 37446].includes(parameter)) {
        return ""
    }
    return getParam.call(this, parameter)
}
const getParam2 = window.WebGL2RenderingContext.prototype.getParameter
/**
 * Override the getParameter function to return nothing when asked for GPU info.
 * @param {number} parameter
 */
window.WebGL2RenderingContext.prototype.getParameter = function(parameter) {
    if ([37445, 37446].includes(parameter)) {
        return ""
    }
    return getParam2.call(this, parameter)
}
/* eslint-enable no-restricted-syntax */
// If using a Firefox useragent, also modify the Firefox navigator properties
if (window.navigator.userAgent.includes("Firefox")) {
    Object.defineProperty(window.Navigator.prototype,
        "buildID", {"get": (() => "20181001000000").bind(null)})
    Object.defineProperty(window.Navigator.prototype,
        "doNotTrack", {"get": (() => "unspecified").bind(null)})
    let platform = "Linux x86_64"
    if (process.platform === "win32") {
        platform = "Win32"
    }
    if (process.platform === "darwin") {
        platform = "MacIntel"
    }
    Object.defineProperty(window.Navigator.prototype,
        "oscpu", {"get": (() => platform).bind(null)})
    Object.defineProperty(window.Navigator.prototype,
        "productSub", {"get": (() => "20100101").bind(null)})
    Object.defineProperty(window.Navigator.prototype,
        "vendor", {"get": (() => "").bind(null)})
    Object.defineProperty(window, "chrome", {})
}

/**
 * Open a url if it is provided and not empty.
 * @param {string|URL|undefined} url
 */
const openUrlIfPresent = url => {
    if (url) {
        ipcRenderer.sendToHost(
            "url", new URL(url, window.location.href).href)
    }
}

/**
 * Provide a wrapper for window.open with a subset of the regular API.
 * Also provide the option to open new tabs by setting the location property.
 * @param {string|URL|undefined} url
 */
window.open = (url = undefined) => {
    openUrlIfPresent(url)
    const obj = {...window}
    Object.defineProperty(obj, "location", {
        "get": (() => {
            const locationMock = new URL(url ?? "", window.location.href)
            Object.defineProperty(locationMock, "ancestorOrigins", {
                "get": (() => []).bind(null)
            })
            Object.defineProperty(locationMock, "assign", {
                // @ts-expect-error val will be an any as users can pass any
                "get": (() => val => openUrlIfPresent(val)).bind(null)
            })
            Object.defineProperty(locationMock, "replace", {
                // @ts-expect-error val will be an any as users can pass any
                "get": (() => val => openUrlIfPresent(val)).bind(null)
            })
            Object.defineProperty(locationMock, "reload", {
                "get": (() => () => undefined).bind(null)
            })
            return locationMock
        }).bind(null),
        // @ts-expect-error val will be an any as users can pass any
        "set": (val => openUrlIfPresent(val)).bind(null)
    })
    return obj
}
