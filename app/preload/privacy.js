/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2026 Jelmer van Arnhem
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

const {contextBridge, ipcRenderer} = require("electron")
const {translate} = require("../translate")
const {getSetting} = require("../util")

let firefoxPlatformString = "Linux x86_64"
if (process.platform === "win32") {
    firefoxPlatformString = "Win32"
}
if (process.platform === "darwin") {
    firefoxPlatformString = "MacIntel"
}

/**
 * Send a notification to the renderer thread.
 * @param {import("../util").NotificationInfo} opts
 */
const notify = opts => ipcRenderer.sendToHost("notify", opts)

// Custom prompt, confirm and alert, based on "dialog*" settings
// Options: return the default cancel action, show a custom popup or notify
/**
 * Show a custom prompt, a notification, both or neither based on dialogprompt.
 * @param {string|undefined} title
 * @param {string} defaultText
 */
const promptOverride = (title, defaultText = "") => {
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
const confirmOverride = text => {
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
const alertOverride = text => {
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
}

contextBridge.executeInMainWorld({
    "args": [promptOverride, confirmOverride, alertOverride],
    /**
     * Override window dialogs on the page with custom ones.
     * @param {(message?: string) => null} prompt
     * @param {(message?: string) => boolean} confirm
     * @param {(message?: string) => null} alert
     */
    "func": (prompt, confirm, alert) => {
        window.prompt = prompt
        window.confirm = confirm
        window.alert = alert
    }
})

/**
 * Run privacy overrides function inside the main window.
 * @param {string} platform
 */
const privacyOverrides = platform => {
    /**
     * Override privacy sensitive APIs with empty or simple defaults.
     * @param {(Window & typeof globalThis)|null} customScope
     */
    const privacyOverridesInScope = customScope => {
        const scope = customScope || window
        // Return a static maximum value for memory and thread count
        scope.Object.defineProperty(scope.Navigator.prototype,
            "hardwareConcurrency", {"get": (() => 8).bind(null)})
        scope.Object.defineProperty(scope.Navigator.prototype,
            "deviceMemory", {"get": (() => 8).bind(null)})
        // Hide graphics card information from the canvas API
        const getParam = scope.WebGLRenderingContext.prototype.getParameter
        /* eslint-disable no-restricted-syntax */
        /**
         * Override getParameter function to return nothing instead of GPU info.
         * @param {number} param
         */
        scope.WebGLRenderingContext.prototype.getParameter = function(param) {
            if ([37445, 37446].includes(param)) {
                return ""
            }
            return getParam.call(this, param)
        }
        const getParam2 = scope.WebGL2RenderingContext.prototype.getParameter
        /**
         * Override getParameter function to return nothing instead of GPU info.
         * @param {number} param
         */
        scope.WebGL2RenderingContext.prototype.getParameter = function(param) {
            if ([37445, 37446].includes(param)) {
                return ""
            }
            return getParam2.call(this, param)
        }
        /* eslint-enable no-restricted-syntax */
        // If using a Firefox useragent, also modify Firefox navigator props
        if (scope.navigator.userAgent.includes("Firefox")) {
            scope.Object.defineProperty(scope.Navigator.prototype,
                "buildID", {"get": (() => "20181001000000").bind(null)})
            scope.Object.defineProperty(scope.Navigator.prototype,
                "doNotTrack", {"get": (() => "unspecified").bind(null)})
            scope.Object.defineProperty(scope.Navigator.prototype,
                "oscpu", {"get": (() => platform).bind(null)})
            scope.Object.defineProperty(scope.Navigator.prototype,
                "productSub", {"get": (() => "20100101").bind(null)})
            scope.Object.defineProperty(scope.Navigator.prototype,
                "vendor", {"get": (() => "").bind(null)})
            scope.Object.defineProperty(scope, "chrome", {})
        }
        // Don't share the connection information
        scope.Object.defineProperty(scope.Navigator.prototype,
            // eslint-disable-next-line unicorn/no-useless-undefined
            "connection", {"get": (() => undefined).bind(null)})
        try {
            delete scope.Object.getPrototypeOf(scope.navigator).connection
        } catch {
            // No deletion allowed in this context, set to undefined instead
        }
        // Disable the experimental keyboard API, which exposes every mapping
        scope.Object.defineProperty(scope.Navigator.prototype,
            // eslint-disable-next-line unicorn/no-useless-undefined
            "keyboard", {"get": (() => undefined).bind(null)})
        try {
            delete scope.Object.getPrototypeOf(scope.navigator).keyboard
        } catch {
            // No deletion allowed in this context, set to undefined instead
        }
        // Disable redundant userAgentData API, which exposes extra version info
        scope.Object.defineProperty(scope.Navigator.prototype,
            // eslint-disable-next-line unicorn/no-useless-undefined
            "userAgentData", {"get": (() => undefined).bind(null)})
        try {
            delete scope.Object.getPrototypeOf(scope.navigator).userAgentData
        } catch {
            // No deletion allowed in this context, set to undefined instead
        }
        // HTTPS-only: Always return there is no battery
        /* eslint-disable jsdoc/require-jsdoc */
        // @ts-expect-error Not present in HTTP environments nor ts spec
        if (scope.BatteryManager) {
            // @ts-expect-error Not present in HTTP environments nor ts spec
            scope.Object.defineProperty(scope.BatteryManager.prototype,
                "level", {"get": () => 1})
            // @ts-expect-error Not present in HTTP environments nor ts spec
            scope.Object.defineProperty(scope.BatteryManager.prototype,
                "charging", {"get": () => true})
            // @ts-expect-error Not present in HTTP environments nor ts spec
            scope.Object.defineProperty(scope.BatteryManager.prototype,
                "chargingTime", {"get": () => 0})
            // @ts-expect-error Not present in HTTP environments nor ts spec
            scope.Object.defineProperty(scope.BatteryManager.prototype,
                "dischargingTime", {"get": () => Infinity})
            // @ts-expect-error Not present in HTTP environments nor ts spec
            scope.Object.defineProperty(scope.BatteryManager.prototype,
                "onchargingchange", {"get": () => null})
            // @ts-expect-error Not present in HTTP environments nor ts spec
            scope.Object.defineProperty(scope.BatteryManager.prototype,
                "onchargingtimechange", {"get": () => null})
            // @ts-expect-error Not present in HTTP environments nor ts spec
            scope.Object.defineProperty(scope.BatteryManager.prototype,
                "ondischargingtimechange", {"get": () => null})
            // @ts-expect-error Not present in HTTP environments nor ts spec
            scope.Object.defineProperty(scope.BatteryManager.prototype,
                "onlevelchange", {"get": () => null})
        }
        /* eslint-enable jsdoc/require-jsdoc */
    }
    const observer = new MutationObserver(mutations => {
        const iframes = mutations.flatMap(m => [...m.addedNodes]
            .filter(n => n.nodeName.toLowerCase() === "iframe"))
        for (const frame of iframes) {
            if ("contentWindow" in frame) {
                // @ts-expect-error contentWindow is not compatible with window
                privacyOverridesInScope(frame.contentWindow)
            }
        }
    })
    observer.observe(document, {
        "attributes": false,
        "characterData": false,
        "childList": true,
        "subtree": true
    })
    privacyOverridesInScope(window)
}

contextBridge.executeInMainWorld({
    "args": [firefoxPlatformString],
    "func": privacyOverrides
})

/** Handle media device permission requests within the enumerateDevices func. */
const deviceEnumeratePermissionHandler = () => {
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
            return devices.map(({deviceId, groupId, kind, label}) => ({
                deviceId,
                groupId,
                kind,
                label,
                /** Add the toJSON method of the MediaDeviceInfo. */
                "toJSON": () => ({deviceId, groupId, kind, label})
            }))
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
            "toJSON": () => ({deviceId, groupId, kind, "label": ""})
        }))
    }
    /** Override the device list based on permission settings. */
    return () => {
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
                const [pattern, ...names] = r.split("~")
                const urlMatch = new RegExp(pattern).test(url)
                if (names.some(p => p.endsWith("mediadevices")) && urlMatch) {
                    settingRule = type
                    break
                }
                if (names.some(p => p.endsWith("mediadevicesfull"))
                    && urlMatch && type === "allow") {
                    settingRule = "allowfull"
                    break
                }
                if (names.some(p => p.endsWith("mediadeviceskind"))
                    && urlMatch && type === "allow") {
                    settingRule = "allowkind"
                    break
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
}

contextBridge.executeInMainWorld({
    "args": [deviceEnumeratePermissionHandler],
    /**
     * Override enumerateDevices with a custom one with permissions.
     * @param {() => (() => Promise<MediaDeviceInfo[]>)} deviceEnumerate
     */
    "func": deviceEnumerate => {
        if (window.navigator.mediaDevices?.enumerateDevices) {
            window.navigator.mediaDevices.enumerateDevices = deviceEnumerate()
        }
    }
})
