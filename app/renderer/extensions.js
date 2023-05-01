/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2022-2023 Jelmer van Arnhem
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

const {
    appConfig,
    domainName,
    listDir,
    joinPath,
    appData,
    expandPath,
    readFile,
    pathToSpecialPageName
} = require("../util")
const {getSetting} = require("./common")

/**
 * Parse the GM userscript header
 *
 * @param {string} meta
 *
 * @returns {{[string: (string[]|Number|string)]}}
 */
const parseGM = meta => meta.split(/[\r\n]/).filter(line => (/\S+/).test(line)
        && !line.includes("==UserScript==") && !line.includes("==/UserScript==")
).reduce((obj, line) => {
    const arr = line.trim().replace(/^\/\//, "").trim().split(/\s+/)
    let key = arr[0].slice(1)
    if (key === "include" || key === "exclude") {
        key += "s"
    }
    const value = arr.slice(1).join(" ")
    // @ts-expect-error Creation of keys on empty object is not allowed
    if (obj[key] === undefined) {
        // @ts-expect-error Creation of keys on empty object is not allowed
        obj[key] = value
    // @ts-expect-error Creation of keys on empty object is not allowed
    } else if (Array.isArray(obj[key])) {
        // @ts-expect-error Creation of keys on empty object is not allowed
        obj[key].push(value)
    } else {
        // @ts-expect-error Creation of keys on empty object is not allowed
        obj[key] = [obj[key], value]
    }
    return obj
}, {})

/**
 * Run a GM script in the page
 *
 * @param {Electron.WebviewTag} webview
 * @param {string} rawContents
 */
const runGMScript = (webview, rawContents) => {
    const headerLines = []
    const scriptLines = []
    let pastHeader = false
    for (const line of rawContents.split(/[\r\n]/)) {
        if (pastHeader) {
            scriptLines.push(line)
        } else if (line.includes("==/UserScript==")) {
            headerLines.push(line)
            pastHeader = true
        } else {
            headerLines.push(line)
        }
    }
    const info = parseGM(headerLines.join("\n"))
    const os = process.platform.replace("32", "").replace("darwin", "mac")
    const arch = process.arch.replace("arm64", "arm").replace("x64", "x86_64")
    const preload = `const GM = {
        "addElement": (...args) => {
            let parentNode = null
            let [tagName, attributes] = args
            if (args.length === 3) {
                [parentNode, tagName, attributes] = args
            }
            const el = document.createElement(tagName)
            if (attributes) {
                Object.keys(attributes).forEach(attr => {
                    el.setAttribute(attr, attributes[attr])
                })
            }
            if (parentNode) {
                parentNode.appendChild(el)
            } else {
                document.body.appendChild(el)
            }
            return el
        },
        "addStyle": css => {
            const el = document.createElement("style")
            el.textContent = css
            document.head.appendChild(el)
            return el
        },
        "addValueChangeListener": () => undefined,
        "deleteValue": key => new Promise((res, rej) => {
            if (sessionStorage.getItem("GM_VIEB_" + key) === null) {
                rej()
            } else {
                sessionStorage.removeItem("GM_VIEB_" + key)
                res()
            }
        }),
        "download": () => ({"abort": () => undefined}),
        "getResourceText": () => new Promise((_, rej) => {
            rej()
        }),
        "getResourceUrl": () => new Promise((_, rej) => {
            rej()
        }),
        "getTab": callback => callback({}),
        "getTabs": callback => callback([]),
        "getValue": (key, defaultValue = null) => new Promise((res, rej) => {
            if (sessionStorage.getItem("GM_VIEB_" + key) === null) {
                if (defaultValue !== null) {
                    res(defaultValue)
                }
                res()
                return
            }
            try {
                res(JSON.parse(sessionStorage.getItem("GM_VIEB_" + key)))
            } catch {
                rej()
            }
        }),
        "info": {
            "injectInto": "page",
            "platform": {
                "arch": "${arch}",
                "browserName": "vieb",
                "browserVersion": "${appConfig()?.version}",
                "os": "${os}"
            },
            "script": ${JSON.stringify(info)},
            "scriptHandler": "Vieb",
            "scriptMetaStr": ${JSON.stringify(headerLines.join("\n"))},
            "uuid": "${Math.random}",
            "version": "${appConfig()?.version}"
        },
        "listValues": () => new Promise(res => {
            const list = []
            for (let i = 0; i < sessionStorage.length; i++) {
                if (sessionStorage.key(i)?.startsWith("GM_VIEB_")) {
                    list.push(sessionStorage.key(i))
                }
            }
            res(list)
        }),
        "log": console.log,
        "notification": msgOrOpts => window.alert(msgOrOpts?.text ?? msgOrOpts),
        "openInTab": window.open,
        "registerMenuCommand": () => undefined,
        "removeValueChangeListener": () => undefined,
        "saveTab": () => undefined,
        "setClipboard": text => window.navigator.clipboard.writeText(text),
        "setValue": (key, value) => new Promise(res => {
            sessionStorage.setItem("GM_VIEB_" + key, JSON.stringify(value))
            res()
        }),
        "unregisterMenuCommand": () => undefined,
        "xmlHttpRequest": () => undefined
    }
    const GM_addElement = GM.addElement
    const GM_addStyle = GM.addStyle
    const GM_addValueChangeListener = GM.addValueChangeListener
    const GM_deleteValue = key => sessionStorage.removeItem("GM_VIEB_" + key)
    const GM_download = GM.download
    const GM_getResourceText = () => undefined
    const GM_getResourceUrl = () => undefined
    const GM_getTab = GM.getTab
    const GM_getTabs = GM.getTabs
    const GM_getValue = (key, defaultValue = null) => {
        if (sessionStorage.getItem("GM_VIEB_" + key) === null) {
            return defaultValue
        }
        return JSON.parse(sessionStorage.getItem("GM_VIEB_" + key))
    }
    const GM_info = GM.info
    const GM_listValues = () => {
        const list = []
        for (let i = 0; i < sessionStorage.length; i++) {
            if (sessionStorage.key(i)?.startsWith("GM_VIEB_")) {
                list.push(sessionStorage.key(i))
            }
        }
        return list
    }
    const GM_log = GM.log
    const GM_notification = GM.notification
    const GM_openInTab = GM.openInTab
    const GM_registerMenuCommand = GM.registerMenuCommand
    const GM_setClipboard = GM.setClipboard
    const GM_setValue = (key, value) => {
        sessionStorage.setItem("GM_VIEB_" + key, JSON.stringify(value))
    }
    const GM_xmlHttpRequest = GM.xmlHttpRequest
    const GM_xmlhttpRequest = GM.xmlHttpRequest
    const unsafeWindow = window`
    /** @type {import("picomatch")|null} */
    let picomatch = null
    try {
        picomatch = require("picomatch")
    } catch {
        // No picomatch available, assume scripts should run everywhere
    }
    if (info?.name && scriptLines.length) {
        if (!info.includes || info.includes.length < 1) {
            info.includes = ["*"]
        }
        if (Array.isArray(info.match)) {
            info.includes = [...info.includes, ...info.match]
        }
        if (Array.isArray(info["exclude-match"])) {
            info.excludes = [...info.excludes, ...info["exclude-match"]]
        }
        let included = true
        let excluded = false
        if (picomatch) {
            included = picomatch.isMatch(
                webview.src, info.includes, {"bash": true})
            excluded = picomatch.isMatch(
                webview.src, info.excludes ?? [], {"bash": true})
        }
        if (included && !excluded) {
            const script = preload + scriptLines.join("\n")
            webview.executeJavaScript(script, true).catch(() => null)
        }
    }
}

/**
 * Load all userscripts into the page
 *
 * @param {Electron.WebviewTag} webview
 */
const loadUserscripts = webview => {
    let domain = domainName(webview.src)
    let scope = "page"
    const specialPage = pathToSpecialPageName(webview.src)
    if (specialPage?.name) {
        domain = "special"
        scope = "special"
    } else if (webview.src.startsWith("file://")) {
        domain = "file"
        scope = "file"
    }
    if (getSetting("userscriptscope").includes(scope)) {
        const userScriptFiles = [
            ...(listDir(joinPath(appData(), "userscript/global"), true)
                || []).filter(f => f.endsWith(".js")),
            joinPath(appData(), "userscript/global.js"),
            ...(listDir(expandPath("~/.vieb/userscript/global"), true)
                || []).filter(f => f.endsWith(".js")),
            expandPath("~/.vieb/userscript/global.js"),
            joinPath(appData(), `userscript/${domain}.js`),
            expandPath(`~/.vieb/userscript/${domain}.js`)
        ]
        for (const f of userScriptFiles) {
            const text = readFile(f)
            if (text) {
                webview.executeJavaScript(text, true).catch(() => null)
            }
        }
    }
    const gmScriptFiles = [
        ...(listDir(joinPath(appData(), "userscript/gm"), true)
            || []).filter(f => f.endsWith(".js")),
        ...(listDir(expandPath("~/.vieb/userscript/gm"), true)
            || []).filter(f => f.endsWith(".js"))
    ]
    for (const f of gmScriptFiles) {
        const text = readFile(f)
        if (text) {
            runGMScript(webview, text)
        }
    }
}

module.exports = {loadUserscripts}
