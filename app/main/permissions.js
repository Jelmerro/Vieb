/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2024 Jelmer van Arnhem
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

import {app, dialog} from "electron"
import {
    domainName,
    formatDate,
    getSetting,
    notify
} from "../util.js"
import {translate} from "../translate.js"

/** @type {{[domain: string]: string[]}} */
const allowedFingerprints = {}
let DRM = false

/**
 * Main check if a permission should be allowed or declined.
 * @param {Electron.BaseWindow|null} mainWindow
 * @param {string} pm
 * @param {null|((_: any) => void)} callback
 * @param {{
 *   mediaTypes?: string[],
 *   externalURL?: string,
 *   requestingUrl?: string
 *   cert?: Electron.Certificate
 *   error?: string
 * }} details
 */
const permissionHandler = (mainWindow, pm, callback, details) => {
    if (!mainWindow) {
        return false
    }
    let permission = pm.toLowerCase().replace("sanitized", "").replace(/-/g, "")
    if (permission === "mediakeysystem") {
        // Block any access to DRM, unless Castlabs' DRM fork is used.
        callback?.(DRM)
        return DRM
    }
    if (permission === "media") {
        if (details.mediaTypes?.includes("video")) {
            permission = "camera"
        } else if (details.mediaTypes?.includes("audio")) {
            permission = "microphone"
        } else if (details.mediaTypes) {
            permission = "displaycapture"
        } else {
            permission = "mediadevices"
        }
    }
    let permissionName = `permission${permission}`
    if (permission === "openexternal" && details.externalURL) {
        if (details.externalURL.startsWith(`${app.getName().toLowerCase()}:`)) {
            mainWindow.webContents.send("navigate-to", details.externalURL)
            return false
        }
    }
    let setting = getSetting(permissionName)
    if (!setting) {
        permissionName = "permissionunknown"
        setting = getSetting("permissionunknown")
    }
    /** @type {"ask"|"block"|"allow"|null} */
    let settingRule = null
    /** @type {("ask"|"block"|"allow")[]} */
    const permissionOverrideTypes = ["ask", "block", "allow"]
    for (const override of permissionOverrideTypes) {
        const permList = getSetting(`permissions${override}ed`)
        for (const rule of permList || []) {
            if (!rule.trim() || settingRule) {
                continue
            }
            const [match, ...names] = rule.split("~")
            if (names.some(p => permissionName.endsWith(p))) {
                if (details.requestingUrl?.match(match)) {
                    settingRule = override
                    break
                }
            }
            if (permissionName.includes("mediadevices")) {
                if (details.requestingUrl?.match(match)) {
                    if (names.some(p => p.endsWith("mediadeviceskind"))) {
                        settingRule = "allow"
                        break
                    }
                    if (names.some(p => p.endsWith("mediadevicesfull"))) {
                        settingRule = "allow"
                        break
                    }
                }
            }
        }
    }
    setting = settingRule || setting
    if (!callback) {
        return setting !== "block"
    }
    const domain = domainName(details.requestingUrl ?? "") ?? ""
    if (permission === "certificateerror") {
        if (allowedFingerprints[domain]
            ?.includes(details.cert?.fingerprint ?? "")) {
            notify({
                "fields": [permission, details.requestingUrl ?? ""],
                "id": "permissions.domainCachedAllowed",
                "src": "user",
                "type": "permission"
            })
            callback(true)
            return true
        }
    }
    if (setting === "ask") {
        let url = details.requestingUrl ?? ""
        if (url.length > 100) {
            url = url.replace(/.{50}/g, "$&\n")
        }
        if (url.length > 1000) {
            url = `${url.split("").slice(0, 1000).join("")}...`
        }
        let message = translate("permissions.ask.body", {
            "fields": [permission, permissionName, url]
        })
        /** @type {string|undefined} */
        /** @type {import("electron").MessageBoxOptions} */
        const dialogOptions = {
            "buttons": ["Allow", "Deny"],
            "cancelId": 1,
            "checkboxLabel": translate("permissions.ask.label"),
            "defaultId": 0,
            message,
            "title": translate("permissions.ask.title", {
                "fields": [permission]
            }),
            "type": "question"
        }
        if (permission === "openexternal") {
            let exturl = details.externalURL ?? ""
            if (exturl.length > 100) {
                exturl = exturl.replace(/.{50}/g, "$&\n")
            }
            if (exturl.length > 1000) {
                exturl = `${exturl.split("").slice(0, 1000).join("")}...`
            }
            message = translate("permissions.ask.bodyExternal", {
                "fields": [url, exturl]
            })
        }
        if (permission === "certificateerror") {
            message = translate("permissions.ask.bodyCertificate", {
                "fields": [
                    url,
                    domain,
                    details.cert?.issuerName ?? "",
                    String(!details.cert?.issuerCert),
                    details.cert?.subjectName ?? "",
                    formatDate(details.cert?.validStart),
                    formatDate(details.cert?.validExpiry),
                    details.cert?.fingerprint ?? ""
                ]
            })
            delete dialogOptions.checkboxLabel
        }
        dialogOptions.message = message
        dialog.showMessageBox(mainWindow, dialogOptions).then(e => {
            if (!mainWindow) {
                return false
            }
            /** @type {"allow"|"block"|"ask"|"allowkind"|"allowfull"} */
            let action = "allow"
            if (e.response !== 0) {
                action = "block"
            }
            if (settingRule) {
                notify({
                    "fields": [
                        permission,
                        details.requestingUrl ?? "",
                        translate(`permissions.notifyLevels.${action}`)
                    ],
                    "id": "permissions.notify.ask",
                    "src": "user",
                    "type": "permission"
                })
            } else {
                notify({
                    "fields": [
                        translate(`permissions.notifyLevels.${action}`),
                        permission,
                        details.requestingUrl ?? ""
                    ],
                    "id": "permissions.notify.manual",
                    "src": "user",
                    "type": "permission"
                })
            }
            const allow = action === "allow"
            const canSave = !allow || permission !== "displaycapture"
            if (e.checkboxChecked && canSave) {
                mainWindow.webContents.send(
                    "set-permission", permissionName, action)
                // TODO
                // permissions[permissionName] = action
            }
            if (permission === "certificateerror" && allow) {
                if (!allowedFingerprints[domain]) {
                    allowedFingerprints[domain] = []
                }
                allowedFingerprints[domain].push(
                    details.cert?.fingerprint ?? "")
            }
            callback(allow)
            return allow
        })
    } else {
        if (settingRule) {
            notify({
                "fields": [
                    translate(`permissions.notifyLevels.${setting}`),
                    permission,
                    details.requestingUrl ?? "",
                    setting
                ],
                "id": "permissions.notify.global",
                "src": "user",
                "type": "permission"
            })
        } else {
            notify({
                "fields": [
                    translate(`permissions.notifyLevels.${setting}`),
                    permission,
                    details.requestingUrl ?? "",
                    permissionName
                ],
                "id": "permissions.notify.global",
                "src": "user",
                "type": "permission"
            })
        }
        const allow = setting === "allow"
        if (permission === "certificateerror" && allow) {
            if (!allowedFingerprints[domain]) {
                allowedFingerprints[domain] = []
            }
            allowedFingerprints[domain].push(details.cert?.fingerprint ?? "")
        }
        callback(allow)
        return allow
    }
    return false
}
