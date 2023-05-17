/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2023 Jelmer van Arnhem
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
const {
    specialChars,
    joinPath,
    notify,
    isUrl,
    stringToUrl,
    appData,
    expandPath,
    isFile,
    isDir,
    readFile,
    writeFile,
    writeJSON,
    pathExists,
    pathToSpecialPageName,
    appConfig,
    userAgentTemplated,
    isValidIntervalValue
} = require("../util")
const {
    listTabs,
    listPages,
    currentTab,
    currentPage,
    tabOrPageMatching,
    updateGuiVisibility,
    getMouseConf
} = require("./common")

const mouseFeatures = [
    "pageininsert",
    "pageoutsideinsert",
    "switchtab",
    "history",
    "guiontop",
    "newtab",
    "closetab",
    "menupage",
    "menusuggest",
    "menuvieb",
    "modeselector",
    "movepointer",
    "notification",
    "follow",
    "toinsert",
    "toexplore",
    "url",
    "leaveinput",
    "leaveinsert",
    "suggestselect",
    "scrollsuggest",
    "scrollzoom",
    "scrolltabs",
    "screenshotframe"
]
const defaultSettings = {
    "adblocker": "static",
    "cache": "clearonquit",
    "clearcookiesonquit": false,
    "cleardownloadsoncompleted": false,
    "cleardownloadsonquit": false,
    "clearhistoryinterval": "none",
    "clearhistoryonquit": false,
    "clearlocalstorageonquit": false,
    "closablepinnedtabs": false,
    "commandhist": "persistuseronly",
    "containercolors": "temp\\d+~#ff0",
    "containerkeeponreopen": true,
    "containernames": "",
    "containernewtab": "s:usecurrent",
    "containershowname": "automatic",
    "containersplitpage": "s:usecurrent",
    "containerstartuppage": "main",
    "countlimit": 100,
    "darkreader": false,
    "darkreaderbg": "#181a1b",
    "darkreaderblocklist": "",
    "darkreaderbrightness": 100,
    "darkreadercontrast": 100,
    "darkreaderfg": "#e8e6e3",
    "darkreadergrayscale": 0,
    "darkreadermode": "dark",
    "darkreadersepia": 0,
    "darkreadertextstroke": 0,
    "devtoolsposition": "window",
    "dialogalert": "notifyblock",
    "dialogconfirm": "notifyblock",
    "dialogprompt": "notifyblock",
    "downloadmethod": "automatic",
    "downloadpath": "",
    "encodeurlcopy": "nospaces",
    "encodeurlext": "nospaces",
    "explorehist": "persist",
    "externalcommand": "",
    "favicons": "session",
    "favoritepages": "",
    "followchars": "alpha",
    "followelement": "url,onclick,inputs-insert,inputs-click,media,image,other",
    "followelementpointer":
        "url,onclick,inputs-insert,inputs-click,media,image,other",
    "followfallbackaction": "filter",
    "follownewtabswitch": true,
    "guifontsize": 14,
    "guifullscreennavbar": "oninput",
    "guifullscreentabbar": "onupdate",
    "guihidetimeout": 2000,
    "guinavbar": "always",
    "guiscrollbar": "always",
    "guitabbar": "always",
    "ignorecase": true,
    "incsearch": true,
    "inputfocusalignment": "rememberend",
    "keeprecentlyclosed": true,
    "mapsuggest": 9000000000000000,
    "mapsuggestposition": "topright",
    "markposition": "newtab",
    "markpositionshifted": "default",
    "maxmapdepth": 10,
    "menupage": "elementasneeded",
    "menusuggest": "both",
    "menuvieb": "both",
    "mintabwidth": 28,
    "modifiers": "Ctrl,Shift,Alt,Meta,NumLock,CapsLock,ScrollLock",
    "mouse": "all",
    "mousedisabledbehavior": "nothing",
    "mousefocus": false,
    "mousenewtabswitch": true,
    "mousevisualmode": "onswitch",
    "nativenotification": "never",
    "nativetheme": "system",
    "newtaburl": "",
    "notificationduration": 6000,
    "notificationforpermissions": "silent",
    "notificationforsystemcommands": "errors",
    "notificationposition": "bottomright",
    "permissioncamera": "block",
    "permissioncertificateerror": "block",
    "permissionclipboardread": "block",
    "permissionclipboardwrite": "allow",
    "permissionclosepage": "allow",
    "permissiondisplaycapture": "block",
    "permissionfullscreen": "allow",
    "permissiongeolocation": "block",
    "permissionhid": "block",
    "permissionmediadevices": "block",
    "permissionmicrophone": "block",
    "permissionmidi": "block",
    "permissionmidisysex": "block",
    "permissionnotifications": "block",
    "permissionopenexternal": "ask",
    "permissionpersistentstorage": "block",
    "permissionpointerlock": "block",
    "permissionsallowed": "",
    "permissionsasked": "",
    "permissionsblocked": "",
    "permissionscreenwakelock": "block",
    "permissionsensors": "block",
    "permissionserial": "block",
    "permissionunknown": "block",
    "pointerposlocalid": "domain",
    "pointerpostype": "casing",
    "quickmarkpersistence": "scroll,marks,pointer",
    "quitonlasttabclose": false,
    "redirects": "https?://(www\\.)?google\\.com(\\.\\w+)?/amp/s/amp\\.(.*)"
        + "~https://$3",
    "redirecttohttp": false,
    "reloadtaboncrash": false,
    "replacespecial": "newtab",
    "replacestartup": "never",
    "requesttimeout": 20000,
    "resourcesallowed": "",
    "resourcesblocked": "",
    "resourcetypes": "object,script,media,image,"
        + "stylesheet,font,xhr,ping,websocket",
    "restoretabs": "all",
    "restorewindowmaximize": true,
    "restorewindowposition": true,
    "restorewindowsize": true,
    "scrollposlocalid": "domain",
    "scrollpostype": "casing",
    "searchemptyscope": "global",
    "searchengine": "https://duckduckgo.com/?kae=d&kav=1&ko=1&q=%s&ia=web",
    "searchpointeralignment": "left",
    "searchscope": "global",
    "searchwords": "",
    "shell": "",
    "showcmd": true,
    "smartcase": true,
    "spell": true,
    "spelllang": "system",
    "splitbelow": false,
    "splitright": false,
    "sponsorblock": false,
    "sponsorblockcategories": "sponsor~lime,intro~cyan,outro~blue,"
        + "interaction~red,selfpromo~yellow,music_offtopic",
    "startuppages": "",
    "storenewvisits": "pages",
    "suggestbouncedelay": 100,
    "suggestcommands": 9000000000000000,
    "suggestorder": "history,searchword,file",
    "suggesttopsites": 10,
    "suspendbackgroundtab": true,
    "suspendonrestore": "regular",
    "suspendplayingtab": false,
    "suspendtimeout": 0,
    "tabclosefocus": "left",
    "tabcycle": true,
    "tabnewposition": "right",
    "tabopenmuted": "never",
    "taboverflow": "scroll",
    "tabreopenmuted": "remember",
    "tabreopenposition": "right",
    "timeout": true,
    "timeoutlen": 2000,
    "translateapi": "auto",
    "translatekey": "",
    "translatelang": "en-us",
    "translateurl": "https://api-free.deepl.com/v2/",
    "useragent": "",
    "userscript": false,
    "userstyle": false,
    "vimcommand": "gvim",
    "windowtitle": "%app - %title"
}
const defaultErwicSettings = {
    "containernewtab": "s:external",
    "containerstartuppage": "s:usematching",
    "permissioncamera": "allow",
    "permissionmediadevices": "allowfull",
    "permissionmicrophone": "allow",
    "permissionnotifications": "allow"
}


let allSettings = {}
const freeText = [
    "downloadpath",
    "externalcommand",
    "shell",
    "translatekey",
    "vimcommand",
    "windowtitle"
]
const listLike = [
    "containercolors",
    "containernames",
    "favoritepages",
    "followelement",
    "followelementpointer",
    "modifiers",
    "mouse",
    "permissionsallowed",
    "permissionsasked",
    "permissionsblocked",
    "quickmarkpersistence",
    "redirects",
    "resourcesallowed",
    "resourcesblocked",
    "searchengine",
    "searchwords",
    "spelllang",
    "sponsorblockcategories",
    "startuppages",
    "storenewvisits",
    "suggestorder",
    "resourcetypes"
]
const listLikeTilde = [
    "useragent",
    "darkreaderblocklist"
]
const validOptions = {
    "adblocker": ["off", "static", "update", "custom"],
    "cache": ["none", "clearonquit", "full"],
    "commandhist": ["all", "persistall", "useronly", "persistuseronly", "none"],
    "containershowname": ["automatic", "always", "never"],
    "darkreadermode": ["dark", "light"],
    "devtoolsposition": ["window", "split", "vsplit", "tab"],
    "dialogalert": ["show", "notifyshow", "block", "notifyblock"],
    "dialogconfirm": [
        "show", "notifyshow", "block", "notifyblock", "allow", "notifyallow"
    ],
    "dialogprompt": ["show", "notifyshow", "block", "notifyblock"],
    "downloadmethod": ["automatic", "confirm", "ask", "block"],
    "encodeurlcopy": ["keep", "encode", "decode", "spacesonly", "nospaces"],
    "encodeurlext": ["keep", "encode", "decode", "spacesonly", "nospaces"],
    "explorehist": ["persist", "session", "none"],
    "favicons": [
        "disabled", "nocache", "session", "1day", "5day", "30day", "forever"
    ],
    "followfallbackaction": ["filter", "exit", "nothing"],
    "guifullscreennavbar": ["always", "onupdate", "oninput", "never"],
    "guifullscreentabbar": ["always", "onupdate", "never"],
    "guinavbar": ["always", "onupdate", "oninput", "never"],
    "guiscrollbar": ["always", "onscroll", "onmove", "never"],
    "guitabbar": ["always", "onupdate", "never"],
    "inputfocusalignment": [
        "rememberstart", "rememberend", "alwaysstart", "alwaysend"
    ],
    "mapsuggestposition": ["bottomright", "bottomleft", "topright", "topleft"],
    "markposition": [
        "open",
        "newtab",
        "copy",
        "download",
        "split",
        "vsplit",
        "external",
        "search"
    ],
    "markpositionshifted": [
        "default",
        "open",
        "newtab",
        "copy",
        "download",
        "split",
        "vsplit",
        "external",
        "search"
    ],
    "menupage": ["always", "globalasneeded", "elementasneeded", "never"],
    "menusuggest": ["both", "explore", "command", "never"],
    "menuvieb": ["both", "navbar", "tabbar", "never"],
    "mousedisabledbehavior": ["nothing", "drag"],
    "mousevisualmode": ["activate", "onswitch", "never"],
    "nativenotification": ["always", "smallonly", "never"],
    "nativetheme": ["system", "dark", "light"],
    "notificationforpermissions": [
        "all", "allowed", "blocked", "silent", "none"
    ],
    "notificationforsystemcommands": ["all", "errors", "none"],
    "notificationposition": [
        "bottomright", "bottomleft", "topright", "topleft"
    ],
    "permissioncamera": ["block", "ask", "allow"],
    "permissioncertificateerror": ["block", "ask", "allow"],
    "permissionclipboardread": ["block", "ask", "allow"],
    "permissionclipboardwrite": ["block", "ask", "allow"],
    "permissionclosepage": ["block", "allow"],
    "permissiondisplaycapture": ["block", "ask"],
    "permissionfullscreen": ["block", "ask", "allow"],
    "permissiongeolocation": ["block", "ask", "allow"],
    "permissionhid": ["block", "allow"],
    "permissionmediadevices": ["block", "ask", "allow", "allowfull"],
    "permissionmicrophone": ["block", "ask", "allow"],
    "permissionmidi": ["block", "ask", "allow"],
    "permissionmidisysex": ["block", "ask", "allow"],
    "permissionnotifications": ["block", "ask", "allow"],
    "permissionopenexternal": ["block", "ask", "allow"],
    "permissionpersistentstorage": ["block", "ask", "allow"],
    "permissionpointerlock": ["block", "ask", "allow"],
    "permissionscreenwakelock": ["block", "ask", "allow"],
    "permissionsensors": ["block", "ask", "allow"],
    "permissionserial": ["block", "allow"],
    "permissionunknown": ["block", "ask", "allow"],
    "pointerposlocalid": ["domain", "url"],
    "pointerpostype": ["casing", "local", "global"],
    "replacespecial": ["always", "special", "newtab", "never"],
    "replacestartup": ["always", "newtab", "never"],
    "restoretabs": ["all", "pinned", "regular", "none"],
    "scrollposlocalid": ["domain", "url"],
    "scrollpostype": ["casing", "local", "global"],
    "searchemptyscope": ["global", "local", "both"],
    "searchpointeralignment": ["left", "center", "right"],
    "searchscope": ["global", "local", "inclocal"],
    "suspendonrestore": ["all", "regular", "none"],
    "tabclosefocus": ["left", "right"],
    "tabnewposition": ["right", "end"],
    "tabopenmuted": ["always", "background", "never"],
    "taboverflow": ["hidden", "scroll", "wrap"],
    "tabreopenmuted": ["always", "remember", "never"],
    "tabreopenposition": ["left", "right", "previous"],
    "translateapi": ["auto", "deepl", "libretranslate"],
    "translatelang": [
        "ar",
        "az",
        "bg",
        "cs",
        "da",
        "de",
        "el",
        "en",
        "en-gb",
        "en-us",
        "eo",
        "es",
        "et",
        "fa",
        "fi",
        "fr",
        "ga",
        "he",
        "hi",
        "hu",
        "id",
        "it",
        "ja",
        "ko",
        "lt",
        "lv",
        "nl",
        "pl",
        "pt",
        "pt-br",
        "pt-pt",
        "ro",
        "ru",
        "sk",
        "sl",
        "sv",
        "tr",
        "uk",
        "zh"
    ]
}
const numberRanges = {
    "countlimit": [0, 10000],
    "darkreaderbrightness": [0, 200],
    "darkreadercontrast": [0, 200],
    "darkreadergrayscale": [0, 100],
    "darkreadersepia": [0, 100],
    "darkreadertextstroke": [0, 1],
    "guifontsize": [8, 30],
    "guihidetimeout": [0, 9000000000000000],
    "mapsuggest": [0, 9000000000000000],
    "maxmapdepth": [1, 40],
    "mintabwidth": [0, 9000000000000000],
    "notificationduration": [0, 9000000000000000],
    "requesttimeout": [0, 9000000000000000],
    "suggestbouncedelay": [0, 10000],
    "suggestcommands": [0, 9000000000000000],
    "suggesttopsites": [0, 9000000000000000],
    "suspendtimeout": [0, 9000000000000000],
    "timeoutlen": [0, 9000000000000000]
}
const acceptsIntervals = ["clearhistoryinterval"]
const acceptsInvertedIntervals = []
let customStyling = ""
const downloadSettings = [
    "downloadmethod",
    "downloadpath",
    "cleardownloadsonquit",
    "cleardownloadsoncompleted"
]
const containerSettings = [
    "containernewtab", "containersplitpage", "containerstartuppage"
]
let spelllangs = []

const init = () => {
    loadFromDisk()
    ipcRenderer.invoke("list-spelllangs").then(langs => {
        spelllangs = langs || []
        spelllangs.push("system")
        if (!isValidSetting("spelllang", allSettings.spelllang)) {
            set("spelllang", "system")
        }
        ipcRenderer.send("set-spelllang", allSettings.spelllang)
    })
    ipcRenderer.on("set-permission", (_, name, value) => set(name, value))
    ipcRenderer.on("notify", (_, message, type, clickAction) => {
        if (getMouseConf("notification")) {
            if (clickAction?.type === "download-success") {
                clickAction.func = () => ipcRenderer.send(
                    "open-download", clickAction.path)
            }
        }
        notify(message, type, clickAction)
    })
    ipcRenderer.on("main-error", (_, ex) => console.error(ex))
    ipcRenderer.send("create-session", `persist:main`,
        allSettings.adblocker, allSettings.cache !== "none")
}

const checkOption = (setting, value) => {
    const optionList = JSON.parse(JSON.stringify(validOptions[setting]))
    if (optionList) {
        const valid = optionList.includes(value)
        if (!valid) {
            const lastOption = optionList.pop()
            let text = `'${optionList.join("', '")}' or '${lastOption}'`
            if (optionList.length === 0) {
                text = `'${lastOption}'`
            }
            notify(`The value of setting '${setting}' can only be one of:`
                + ` ${text}`, "warn")
        }
        return valid
    }
    return false
}

const checkNumber = (setting, value) => {
    const numberRange = numberRanges[setting]
    if (numberRange[0] > value || numberRange[1] < value) {
        notify(`The value of setting '${setting}' must be between `
            + `${numberRange[0]} and ${numberRange[1]}`, "warn")
        return false
    }
    return true
}

const checkOther = (setting, value) => {
    // Special cases
    if (setting === "clearhistoryinterval") {
        const valid = ["session", "none"].includes(value)
            || isValidIntervalValue(value)
        if (!valid) {
            notify("clearhistoryinterval can only be set to none, session or "
                + "a valid interval, such as 1day or 3months", "warn")
        }
        return valid
    }
    if (containerSettings.includes(setting)) {
        const specialNames = ["s:usematching", "s:usecurrent"]
        if (setting !== "containersplitpage") {
            specialNames.push("s:replacematching", "s:replacecurrent")
        }
        if (setting === "containernewtab") {
            specialNames.push("s:external")
        }
        if (value.startsWith("s:")) {
            if (specialNames.includes(value)) {
                return true
            }
            const lastName = specialNames.pop()
            const text = `'${specialNames.join("', '")}' or '${lastName}'`
            notify(
                `Special container name for '${setting}' can only be one of:`
                + ` ${text}`, "warn")
            return false
        }
        const simpleValue = value.replace("%n", "valid").replace(/_/g, "")
        if (simpleValue.match(specialChars)) {
            notify(
                "No special characters besides underscores are allowed in the "
                + `name of a container, invalid ${setting}: ${value}`, "warn")
            return false
        }
    }
    if (setting === "containercolors") {
        for (const colorMatch of value.split(",").filter(c => c.trim())) {
            if ((colorMatch.match(/~/g) || []).length !== 1) {
                notify(`Invalid ${setting} entry: ${colorMatch}\n`
                    + "Entries must have exactly one ~ to separate the "
                    + "name regular expression and color name/hex", "warn")
                return false
            }
            const [match, color] = colorMatch.split("~")
            try {
                RegExp(match)
            } catch {
                notify(
                    `Invalid regular expression in containercolors: ${match}`,
                    "warn")
                return false
            }
            const {style} = document.createElement("div")
            style.color = "white"
            style.color = color
            if (style.color === "white" && color !== "white" || !color) {
                notify("Invalid color, must be a valid color name or hex"
                    + `, not: ${color}`, "warn")
                return false
            }
        }
    }
    if (setting === "containernames") {
        for (const containerMatch of value.split(",").filter(c => c.trim())) {
            if (![1, 2].includes((containerMatch.match(/~/g) || []).length)) {
                notify(`Invalid ${setting} entry: ${containerMatch}\n`
                    + "Entries must have one or two ~ to separate the "
                    + "regular expression, container name and newtab param",
                "warn")
                return false
            }
            const [match, container, newtabParam] = containerMatch.split("~")
            if (newtabParam && newtabParam !== "newtab") {
                notify(`Invalid containernames newtab param: ${containerMatch}`,
                    "warn")
                return false
            }
            try {
                RegExp(match)
            } catch {
                notify(
                    `Invalid regular expression in containernames: ${match}`,
                    "warn")
                return false
            }
            const simpleValue = container.replace("%n", "valid").replace(/_/g, "")
            if (simpleValue.match(specialChars)) {
                notify(
                    "No special characters besides underscores are allowed in "
                    + `the name of a container, invalid ${setting}: ${value}`,
                    "warn")
                return false
            }
        }
    }
    if (setting === "darkreaderfg" || setting === "darkreaderbg") {
        const {style} = document.createElement("div")
        style.color = "white"
        style.color = value
        if (style.color === "white" && value !== "white" || !value) {
            notify("Invalid color, must be a valid color name or hex"
                    + `, not: ${value}`, "warn")
            return false
        }
    }
    if (setting === "darkreaderblocklist") {
        for (const match of value.split("~").filter(c => c.trim())) {
            try {
                RegExp(match)
            } catch {
                notify(`Invalid regular expression in ${setting}: ${match}`,
                    "warn")
                return false
            }
        }
    }
    if (setting === "downloadpath") {
        const expandedPath = expandPath(value)
        if (value && !pathExists(expandedPath)) {
            notify("The download path does not exist", "warn")
            return false
        }
        if (value && !isDir(expandedPath)) {
            notify("The download path is not a directory", "warn")
            return false
        }
    }
    if (setting === "favoritepages") {
        for (const page of value.split(",").filter(p => p.trim())) {
            if (!isUrl(page)) {
                notify(`Invalid URL passed to favoritepages: ${page}`, "warn")
                return false
            }
        }
    }
    if (setting === "followchars") {
        const ok = [
            "all",
            "alpha",
            "alphanum",
            "dvorakhome",
            "numbers",
            "qwertyhome"
        ]
        if (!ok.includes(value) && !value.startsWith("custom:")) {
            notify(`Invalid value: ${value}, `
               + `must be any of: alpha, alphanum, dvorakhome, numbers,
                  qwertyhome, or a custom list starting with 'custom:'`, "warn")
            return false
        }
        if (value.startsWith("custom:")) {
            const chars = value.replace("custom:", "").split("")
            if (chars.length < 2) {
                notify("A minimum of two characters is required", "warn")
                return
            }
            if (new Set(chars).size < chars.length) {
                notify("All characters must be unique, no duplicates", "warn")
                return
            }
        }
    }
    if (setting.startsWith("followelement")) {
        const ok = [
            "url",
            "onclick",
            "inputs-insert",
            "inputs-click",
            "media",
            "image",
            "other"
        ]
        for (const element of value.split(",").filter(e => e.trim())) {
            if (!ok.includes(element)) {
                notify(`Invalid element type passed: ${element}, `
                   + `must be any combination of: url, onclick,
                      inputs-insert, inputs-click or other`, "warn")
                return false
            }
        }
    }
    if (setting === "modifiers") {
        const {"keyNames": valid} = require("./input")
        for (const name of value.split(",").filter(n => n.trim())) {
            if (name.length > 1 && !valid.find(key => key.vim.includes(name))) {
                notify(`Key name '${name}' is not recognized as a valid key`,
                    "warn")
                return false
            }
        }
    }
    if (setting === "mouse") {
        const invalid = value.split(",").find(
            v => !mouseFeatures.includes(v) && v !== "all")
        if (invalid) {
            notify(`Feature '${invalid}' is not a valid mouse feature`, "warn")
            return false
        }
    }
    if (setting === "newtaburl") {
        if (value && !isUrl(stringToUrl(value).replace(/^https?:\/\//g, ""))) {
            notify("The newtaburl value must be a valid url or empty", "warn")
            return false
        }
    }
    const permissionSettings = [
        "permissionsallowed", "permissionsasked", "permissionsblocked"
    ]
    if (permissionSettings.includes(setting)) {
        for (const override of value.split(",").filter(o => o.trim())) {
            if ((override.match(/~/g) || []).length === 0) {
                notify(`Invalid ${setting} entry: ${override}\n`
                    + "Entries must have at least one ~ to separate the "
                    + "domain regular expression and permission names", "warn")
                return false
            }
            const [match, ...names] = override.split("~")
            try {
                RegExp(match)
            } catch {
                notify(
                    `Invalid regular expression in permission: ${match}`,
                    "warn")
                return false
            }
            for (let name of names) {
                if (!name.startsWith("permission")) {
                    name = `permission${name}`
                }
                if (name === "permissionmediadevicesfull"
                    && setting.endsWith("allowed")) {
                    return true
                }
                const reservedName = permissionSettings.includes(name)
                if (reservedName || !allSettings[name]) {
                    notify(
                        `Invalid name for a permission: ${name}`, "warn")
                    return false
                }
                if (setting.endsWith("asked") && name.endsWith("hid")) {
                    notify(
                        "HID permission can't be asked, "
                        + "only allowed or blocked", "warn")
                    return false
                }
                if (setting.endsWith("asked") && name.endsWith("serial")) {
                    notify(
                        "Serial device permission can't be asked, "
                        + "only allowed or blocked", "warn")
                    return false
                }
                if (setting.endsWith("allowed") && name.endsWith("capture")) {
                    notify(
                        "Display capture permission can't be allowed, "
                        + "only asked or blocked", "warn")
                    return false
                }
            }
        }
    }
    if (setting === "quickmarkpersistence" && value !== "") {
        for (const mType of value.split(",").filter(l => l.trim())) {
            if (!["scroll", "marks", "pointer"].includes(mType)) {
                notify(`Invalid quickmark type passed to ${setting}: ${mType}`,
                    "warn")
                return false
            }
        }
    }
    if (setting === "redirects") {
        for (const redirect of value.split(",").filter(r => r.trim())) {
            if ((redirect.match(/~/g) || []).length !== 1) {
                notify(`Invalid redirect entry: ${redirect}\n`
                    + "Entries must have exactly one ~ to separate the "
                    + "regular expression from the replacement", "warn")
                return false
            }
            const [match] = redirect.split("~")
            try {
                RegExp(match)
            } catch {
                notify(
                    `Invalid regular expression in redirect: ${match}`, "warn")
                return false
            }
        }
    }
    if (["resourcesallowed", "resourcesblocked"].includes(setting)) {
        for (const override of value.split(",").filter(o => o.trim())) {
            const [match, ...names] = override.split("~")
            try {
                RegExp(match)
            } catch {
                notify(
                    `Invalid regular expression in ${setting}: ${match}`,
                    "warn")
                return false
            }
            for (const name of names) {
                const supported = defaultSettings.resourcetypes.split(",")
                if (!supported.includes(name)) {
                    notify(`Invalid resource type in ${setting}: ${name}`,
                        "warn")
                    return false
                }
            }
        }
    }
    if (setting === "resourcetypes" && value !== "") {
        for (const rsrc of value.split(",").filter(l => l.trim())) {
            if (!defaultSettings.resourcetypes.split(",").includes(rsrc)) {
                notify(`Invalid resource type passed to ${setting}: ${rsrc}`,
                    "warn")
                return false
            }
        }
    }
    if (setting === "searchengine") {
        for (let baseUrl of value.split(",").filter(e => e.trim())) {
            baseUrl = baseUrl.replace(/^https?:\/\//g, "")
            if (baseUrl.length === 0 || !baseUrl.includes("%s")) {
                notify(`Invalid searchengine value: ${baseUrl}\n`
                        + "Each URL must contain a %s parameter, which will "
                        + "be replaced by the search string", "warn")
                return false
            }
            if (!isUrl(baseUrl)) {
                notify(
                    "Each URL of the searchengine setting must be a valid url",
                    "warn")
                return false
            }
        }
    }
    if (setting === "searchwords") {
        const knownSearchwords = []
        for (const searchword of value.split(",").filter(s => s.trim())) {
            if ((searchword.match(/~/g) || []).length !== 1) {
                notify(`Invalid searchwords entry: ${searchword}\n`
                    + "Entries must have exactly one ~ to separate the "
                    + "searchword from the URL", "warn")
                return false
            }
            const [keyword, url] = searchword.split("~")
            const simpleKeyword = keyword.replace(/_/g, "")
            if (keyword.length === 0 || simpleKeyword.match(specialChars)) {
                notify(`Invalid searchwords entry: ${searchword}\n`
                    + "Searchwords before the ~ must not contain any special "
                    + "characters besides underscores", "warn")
                return false
            }
            if (url.length === 0 || !url.includes("%s")) {
                notify(`Invalid searchwords entry: ${searchword}\n`
                    + "URLs for searchwords must exist and must "
                    + "contain a %s parameter, which will be "
                    + "replaced by the search string", "warn")
                return false
            }
            if (knownSearchwords.includes(keyword)) {
                notify(`Invalid searchwords entry: ${searchword}\n`
                    + `The searchword ${keyword} was already defined. `
                    + "A searchword must be defined only once", "warn")
                return false
            }
            knownSearchwords.push(keyword)
        }
    }
    if (setting === "spelllang" && value !== "") {
        for (const lang of value.split(",").filter(l => l.trim())) {
            if (spelllangs.length && !spelllangs.includes(lang)) {
                notify(`Invalid language passed to spelllang: ${lang}`,
                    "warn")
                return false
            }
        }
    }
    if (setting === "sponsorblockcategories") {
        const knownCategories = []
        const allCategories = defaultSettings.sponsorblockcategories
            .split(",").map(s => s.split("~")[0])
        for (const catColorPair of value.split(",").filter(c => c.trim())) {
            if ((catColorPair.match(/~/g) || []).length > 1) {
                notify(`Invalid ${setting} entry: ${catColorPair}\n`
                    + "Entries must have zero or one ~ to separate the "
                    + "category name and color name/hex", "warn")
                return false
            }
            const [category, color] = catColorPair.split("~")
            if (!allCategories.includes(category)) {
                notify(`Invalid category in ${setting}: ${category}`, "warn")
                return false
            }
            const {style} = document.createElement("div")
            style.color = "white"
            style.color = color
            if (color && style.color === "white" && color !== "white") {
                notify("Invalid color, must be a valid color name or hex"
                    + `, not: ${color}`, "warn")
                return false
            }
            if (knownCategories.includes(category)) {
                notify(`Invalid sponsorblockcategories entry: ${catColorPair}\n`
                    + `The category ${category} was already defined. `
                    + "A category must be defined only once", "warn")
                return false
            }
            knownCategories.push(category)
        }
    }
    if (setting === "startuppages") {
        for (const page of value.split(",").filter(p => p.trim())) {
            const parts = page.split("~")
            const url = parts.shift()
            const cname = parts.shift()
            if (!isUrl(url)) {
                notify(`Invalid URL passed to startuppages: ${url}`, "warn")
                return false
            }
            if (cname) {
                const specials = [
                    "s:usematching",
                    "s:usecurrent",
                    "s:replacematching",
                    "s:replacecurrent"
                ]
                const simple = cname.replace("%n", "valid").replace(/_/g, "")
                if (!specials.includes(cname) && simple.match(specialChars)) {
                    notify("No special characters besides underscores are "
                        + "allowed in the name of a container, invalid "
                        + `${setting}: ${cname}`, "warn")
                    return false
                }
            }
            if (parts.length > 2) {
                notify("Too many options given to startuppages entry", "warn")
                return false
            }
            if (parts[0] && parts[0] !== "muted" && parts[0] !== "pinned") {
                notify(`Invalid option '${parts[0]}' given to startuppages, `
                    + "only 'muted' and 'pinned' are accepted", "warn")
                return false
            }
            if (parts[1] && parts[1] !== "muted" && parts[1] !== "pinned") {
                notify(`Invalid option '${parts[1]}' given to startuppages, `
                    + "only 'muted' and 'pinned' are accepted", "warn")
                return false
            }
        }
    }
    if (setting === "storenewvisits") {
        const valid = [
            "pages",
            "files",
            "special",
            "sourceviewer",
            "readerview",
            "markdownviewer"
        ]
        for (const visitType of value.split(",").filter(v => v.trim())) {
            if (!valid.includes(visitType)) {
                notify(`Invalid type of history passed: ${visitType}, `
                    + `must be one of: ${valid.join(", ")}`, "warn")
                return false
            }
        }
    }
    if (setting === "suggestorder") {
        return checkSuggestOrder(value)
    }
    if (setting === "translateurl") {
        if (!isUrl(stringToUrl(value).replace(/^https?:\/\//g, ""))) {
            notify("The translateurl value must be a valid url", "warn")
            return false
        }
    }
    return true
}

const checkSuggestOrder = value => {
    for (const suggest of value.split(",").filter(s => s.trim())) {
        const parts = (suggest.match(/~/g) || []).length
        if (parts > 2) {
            notify(`Invalid suggestorder entry: ${suggest}\n`
                    + "Entries must have at most two ~ to separate the type "
                    + "from the count and the order (both optional)", "warn")
            return false
        }
        const args = suggest.split("~")
        const type = args.shift()
        if (!["history", "file", "searchword"].includes(type)) {
            notify(`Invalid suggestorder type: ${type}\n`
                    + "Suggestion type must be one of: history, file or "
                    + "searchword", "warn")
            return false
        }
        let hasHadCount = false
        let hasHadOrder = false
        for (const arg of args) {
            if (!arg) {
                notify("Configuration for suggestorder after the type can "
                        + "not be empty", "warn")
                return false
            }
            const potentialCount = Number(arg)
            if (potentialCount > 0 && potentialCount <= 9000000000000000) {
                if (hasHadCount) {
                    notify("Count configuration for a suggestorder entry "
                            + "can only be set once per entry", "warn")
                    return false
                }
                hasHadCount = true
                continue
            }
            const validOrders = []
            if (type === "history") {
                validOrders.push("alpha", "relevance", "date")
            }
            if (type === "file") {
                validOrders.push("alpha")
            }
            if (type === "searchword") {
                validOrders.push("alpha", "setting")
            }
            if (validOrders.includes(arg)) {
                if (hasHadOrder) {
                    notify("Order configuration for a suggestorder entry "
                            + "can only be set once per entry", "warn")
                    return false
                }
                hasHadOrder = true
                continue
            }
            notify(`Order configuration is invalid, supported orders for ${
                type} suggestions are: ${validOrders.join(", ")}`, "warn")
            return false
        }
    }
    return true
}

const isValidSetting = (setting, value) => {
    if (allSettings[setting] === undefined) {
        notify(`The setting '${setting}' doesn't exist`, "warn")
        return false
    }
    const expectedType = typeof allSettings[setting]
    let parsedValue = String(value)
    if (expectedType === "number" && !isNaN(Number(parsedValue))) {
        parsedValue = Number(value)
    }
    if (expectedType === "boolean") {
        if (["true", "false"].includes(parsedValue)) {
            parsedValue = value === "true"
        }
    }
    if (expectedType !== typeof parsedValue) {
        notify(`The value of setting '${setting}' is of an incorrect `
            + `type, expected '${expectedType}' but got `
            + `'${typeof parsedValue}' instead.`, "warn")
        return false
    }
    if (validOptions[setting]) {
        return checkOption(setting, parsedValue)
    }
    if (numberRanges[setting]) {
        return checkNumber(setting, parsedValue)
    }
    return checkOther(setting, parsedValue)
}

const updateMouseSettings = () => {
    for (const mouseSetting of mouseFeatures) {
        if (getMouseConf(mouseSetting)) {
            document.body.classList.add(`mouse-${mouseSetting}`)
        } else {
            document.body.classList.remove(`mouse-${mouseSetting}`)
        }
    }
    if (allSettings.mousedisabledbehavior === "drag") {
        document.body.classList.add("mousedisabled-drag")
    } else {
        document.body.classList.remove("mousedisabled-drag")
    }
}

const updateNativeTheme = () => {
    ipcRenderer.send("update-native-theme", allSettings.nativetheme)
}

const updateContainerSettings = (full = true) => {
    if (full) {
        for (const page of listPages()) {
            const color = allSettings.containercolors.split(",").find(
                c => page.getAttribute("container").match(c.split("~")[0]))
            if (color) {
                [, tabOrPageMatching(page).style.color] = color.split("~")
            } else {
                tabOrPageMatching(page).style.color = null
            }
        }
    }
    const container = currentPage()?.getAttribute("container")
    if (!container) {
        return
    }
    const color = allSettings.containercolors.split(",").find(
        c => container.match(c.split("~")[0]))
    const show = allSettings.containershowname
    if (container === "main" && show === "automatic" || show === "never") {
        document.getElementById("containername").style.display = "none"
    } else {
        document.getElementById("containername").textContent = container
        if (color) {
            [, document.getElementById("containername")
                .style.color] = color.split("~")
        } else {
            document.getElementById("containername").style.color = null
        }
        document.getElementById("containername").style.display = null
    }
}

const updateDownloadSettings = () => {
    const downloads = {}
    downloadSettings.forEach(setting => {
        downloads[setting] = allSettings[setting]
    })
    ipcRenderer.send("set-download-settings", downloads)
}

const webviewSettings = [
    "darkreader",
    "darkreaderbg",
    "darkreaderblocklist",
    "darkreaderbrightness",
    "darkreadercontrast",
    "darkreaderfg",
    "darkreadergrayscale",
    "darkreadermode",
    "darkreadersepia",
    "darkreadertextstroke",
    "dialogalert",
    "dialogconfirm",
    "dialogprompt",
    "guifontsize",
    "guiscrollbar",
    "inputfocusalignment",
    "permissiondisplaycapture",
    "permissionmediadevices",
    "permissionsallowed",
    "permissionsasked",
    "permissionsblocked",
    "searchpointeralignment",
    "sponsorblock",
    "sponsorblockcategories",
    "userstyle"
]

const updateWebviewSettings = () => {
    const webviewSettingsFile = joinPath(appData(), "webviewsettings")
    const data = {
        "bg": getComputedStyle(document.body).getPropertyValue("--bg"),
        "fg": getComputedStyle(document.body).getPropertyValue("--fg"),
        "linkcolor": getComputedStyle(document.body)
            .getPropertyValue("--link-color")
    }
    webviewSettings.forEach(setting => {
        data[setting] = allSettings[setting]
    })
    writeJSON(webviewSettingsFile, data)
}

const updatePermissionSettings = () => {
    const permissions = {}
    Object.keys(allSettings).forEach(setting => {
        if (setting.startsWith("permission")) {
            permissions[setting] = allSettings[setting]
        }
    })
    ipcRenderer.send("set-permissions", permissions)
}

const updateHelpPage = () => {
    listPages().forEach(p => {
        if (pathToSpecialPageName(p.src).name === "help") {
            const {
                listMappingsAsCommandList, uncountableActions
            } = require("./input")
            const {rangeCompatibleCommands} = require("./command")
            try {
                p.send("settings", settingsWithDefaults(),
                    listMappingsAsCommandList(false, true), uncountableActions,
                    rangeCompatibleCommands)
            } catch {
                // Page not ready yet or suspended
            }
        }
    })
}

const listSettingsAsArray = () => Object.keys(defaultSettings)

const suggestionList = () => {
    const listOfSuggestions = ["all", ...listSettingsAsArray()]
    listOfSuggestions.push("all&")
    listOfSuggestions.push("all?")
    for (const setting of listSettingsAsArray()) {
        if (typeof defaultSettings[setting] === "boolean") {
            listOfSuggestions.push(`${setting}!`)
            listOfSuggestions.push(`no${setting}`)
            listOfSuggestions.push(`inv${setting}`)
        } else if (validOptions[setting]) {
            listOfSuggestions.push(`${setting}!`)
            listOfSuggestions.push(`${setting}=`)
            for (const option of validOptions[setting]) {
                listOfSuggestions.push(`${setting}=${option}`)
            }
        } else {
            listOfSuggestions.push(`${setting}=`)
            listOfSuggestions.push(`${setting}=${defaultSettings[setting]}`)
        }
        if (setting === "clearhistoryinterval") {
            listOfSuggestions.push(`${setting}=session`)
        }
        if (setting === "followchars") {
            listOfSuggestions.push(`${setting}=custom:`)
            listOfSuggestions.push(`${setting}=all`)
            listOfSuggestions.push(`${setting}=alphanum`)
            listOfSuggestions.push(`${setting}=dvorakhome`)
            listOfSuggestions.push(`${setting}=numbers`)
            listOfSuggestions.push(`${setting}=qwertyhome`)
            listOfSuggestions.push(`${setting}=qwertyhome`)
        }
        if (containerSettings.includes(setting)) {
            listOfSuggestions.push(`${setting}=s:usematching`)
            listOfSuggestions.push(`${setting}=s:usecurrent`)
            if (setting !== "containersplitpage") {
                listOfSuggestions.push(`${setting}=s:replacematching`)
                listOfSuggestions.push(`${setting}=s:replacecurrent`)
            }
            if (setting === "containernewtab") {
                listOfSuggestions.push(`${setting}=s:external`)
            }
            listOfSuggestions.push(`${setting}=temp%n`)
        }
        if (acceptsIntervals.includes(setting)) {
            listOfSuggestions.push(`${setting}=1second`)
            listOfSuggestions.push(`${setting}=1minute`)
            listOfSuggestions.push(`${setting}=1hour`)
            listOfSuggestions.push(`${setting}=1day`)
            listOfSuggestions.push(`${setting}=1month`)
            listOfSuggestions.push(`${setting}=1year`)
        }
        if (acceptsInvertedIntervals.includes(setting)) {
            listOfSuggestions.push(`${setting}=last1second`)
            listOfSuggestions.push(`${setting}=last1minute`)
            listOfSuggestions.push(`${setting}=last1hour`)
            listOfSuggestions.push(`${setting}=last1day`)
            listOfSuggestions.push(`${setting}=last1month`)
            listOfSuggestions.push(`${setting}=last1year`)
        }
        const isNumber = typeof defaultSettings[setting] === "number"
        const isFreeText = freeText.includes(setting)
        const isListLike = listLike.includes(setting)
            || listLikeTilde.includes(setting)
        if (isNumber || isFreeText || isListLike) {
            listOfSuggestions.push(`${setting}+=`)
            listOfSuggestions.push(`${setting}^=`)
            listOfSuggestions.push(`${setting}-=`)
        }
        listOfSuggestions.push(`${setting}&`)
        listOfSuggestions.push(`${setting}?`)
    }
    return listOfSuggestions
}

const loadFromDisk = (firstRun = true) => {
    const {pause, resume} = require("./commandhistory")
    pause()
    const {files, islite} = appConfig()
    if (islite) {
        defaultSettings.adblocker = "off"
        validOptions.adblocker = ["off"]
    }
    if (firstRun) {
        allSettings = JSON.parse(JSON.stringify(defaultSettings))
        sessionStorage.setItem("settings", JSON.stringify(allSettings))
    }
    if (isFile(joinPath(appData(), "erwicmode"))) {
        const erwicDefaults = JSON.parse(JSON.stringify(defaultErwicSettings))
        Object.keys(erwicDefaults).forEach(t => {
            set(t, erwicDefaults[t])
        })
    }
    for (const conf of files) {
        if (isFile(conf)) {
            const parsed = readFile(conf)
            if (!parsed) {
                notify(`Read error for config file located at '${conf}'`, "err")
                continue
            }
            for (const line of parsed.split("\n").filter(l => l.trim())) {
                if (!line.trim().startsWith("\"")) {
                    const {execute} = require("./command")
                    execute(line, conf)
                }
            }
        }
    }
    updateContainerSettings()
    updateDownloadSettings()
    updatePermissionSettings()
    updateWebviewSettings()
    updateMouseSettings()
    updateNativeTheme()
    resume()
}

const reset = setting => {
    if (setting === "all") {
        Object.keys(defaultSettings).forEach(s => set(s, defaultSettings[s]))
    } else if (allSettings[setting] === undefined) {
        notify(`The setting '${setting}' doesn't exist`, "warn")
    } else {
        set(setting, defaultSettings[setting])
    }
}

const set = (setting, value) => {
    if (setting === "search") {
        notify("search is deprecated and will be replaced with the "
            + "functionally identical searchengine setting", "warn")
        set("searchengine", value)
        return
    }
    if (isValidSetting(setting, value)) {
        if (typeof allSettings[setting] === "boolean") {
            allSettings[setting] = ["true", true].includes(value)
        } else if (typeof allSettings[setting] === "number") {
            allSettings[setting] = Number(value)
        } else if (listLike.includes(setting)) {
            // Remove empty and duplicate elements from the comma separated list
            allSettings[setting] = Array.from(new Set(
                value.split(",").map(e => e.trim()).filter(e => e))).join(",")
        } else if (listLikeTilde.includes(setting)) {
            // Remove empty and duplicate elements from the comma separated list
            allSettings[setting] = Array.from(new Set(
                value.split("~").map(e => e.trim()).filter(e => e))).join("~")
        } else {
            allSettings[setting] = value
        }
        if (setting === "mouse") {
            let newval = allSettings.mouse
            if (!mouseFeatures.find(f => !newval.includes(f))) {
                newval = "all"
            }
            if (newval.split(",").includes("all")) {
                newval = "all"
            }
            allSettings.mouse = newval
        }
        sessionStorage.setItem("settings", JSON.stringify(allSettings))
        // Update settings elsewhere
        if (setting === "adblocker") {
            if (value === "off") {
                ipcRenderer.send("adblock-disable")
            } else {
                ipcRenderer.send("adblock-enable", allSettings.adblocker)
            }
        }
        if (setting === "clearhistoryonquit") {
            notify("clearhistoryonquit is deprecated, "
                + "use clearhistoryinterval=session", "warn")
        }
        if (setting === "containercolors" || setting === "containershowname") {
            updateContainerSettings()
        }
        if (setting === "useragent") {
            ipcRenderer.sendSync("override-global-useragent",
                userAgentTemplated(value.split("~")[0]))
        }
        if (setting === "guifontsize") {
            updateCustomStyling()
        }
        if (setting === "guiscrollbar") {
            const {showScrollbar, hideScrollbar} = require("./pagelayout")
            if (value === "always") {
                showScrollbar()
            } else {
                hideScrollbar()
            }
        }
        if (downloadSettings.includes(setting)) {
            updateDownloadSettings()
        }
        if (setting.startsWith("gui")) {
            updateGuiVisibility()
        }
        if (setting === "mintabwidth") {
            listTabs().forEach(tab => {
                tab.style.minWidth = `${allSettings.mintabwidth}px`
            })
            try {
                currentTab().scrollIntoView({"inline": "center"})
            } catch {
                // No tabs present yet
            }
            const {applyLayout} = require("./pagelayout")
            applyLayout()
        }
        if (setting === "mouse" || setting === "mousedisabledbehavior") {
            updateMouseSettings()
        }
        if (setting === "nativetheme") {
            updateNativeTheme()
        }
        if (setting === "spelllang" || setting === "spell") {
            if (allSettings.spell) {
                ipcRenderer.send("set-spelllang", allSettings.spelllang)
            } else {
                ipcRenderer.send("set-spelllang", "")
            }
        }
        if (setting.includes("resource")) {
            ipcRenderer.send("update-resource-settings",
                allSettings.resourcetypes.trim().split(",").filter(r => r),
                allSettings.resourcesblocked.trim().split(",").filter(r => r),
                allSettings.resourcesallowed.trim().split(",").filter(r => r))
        }
        if (setting === "taboverflow") {
            const tabs = document.getElementById("tabs")
            tabs.classList.remove("scroll")
            tabs.classList.remove("wrap")
            if (value !== "hidden") {
                tabs.classList.add(value)
            }
            currentTab()?.scrollIntoView({"inline": "center"})
            const {applyLayout} = require("./pagelayout")
            applyLayout()
        }
        if (webviewSettings.includes(setting)) {
            updateWebviewSettings()
        }
        if (setting.startsWith("darkreader")) {
            listPages().forEach(p => {
                try {
                    if (allSettings.darkreader) {
                        p.send("enable-darkreader")
                    } else {
                        p.send("disable-darkreader")
                    }
                } catch {
                    // Page not ready yet or suspended
                }
            })
        }
        if (setting === "userstyle") {
            listPages().forEach(p => {
                try {
                    if (allSettings.userstyle) {
                        p.send("enable-userstyle")
                    } else {
                        p.send("disable-userstyle")
                    }
                } catch {
                    // Page not ready yet or suspended
                }
            })
        }
        if (setting.startsWith("permission")) {
            updatePermissionSettings()
        }
        if (setting === "redirects") {
            ipcRenderer.send("set-redirects", allSettings.redirects)
        }
        if (setting === "suspendtimeout") {
            const {restartSuspendTimeouts} = require("./pagelayout")
            restartSuspendTimeouts()
        }
        if (setting === "windowtitle") {
            updateWindowTitle()
        }
        updateHelpPage()
    }
}

const updateWindowTitle = () => {
    const {name, version} = appConfig()
    const title = tabOrPageMatching(currentPage())
        ?.querySelector("span").textContent || ""
    let url = currentPage()?.src || ""
    const specialPage = pathToSpecialPageName(url)
    if (specialPage.name) {
        url = `${name.toLowerCase()}://${specialPage.name}`
        if (specialPage.section) {
            url += `#${specialPage.section}`
        }
    }
    ipcRenderer.send("set-window-title", allSettings.windowtitle
        .replace(/%app/g, name).replace(/%title/g, title)
        .replace(/%url/g, url).replace(/%version/g, version))
}

const settingsWithDefaults = () => Object.keys(allSettings).map(setting => {
    let typeLabel = "String"
    let allowedValues = ""
    if (listLike.includes(setting)) {
        typeLabel = "List"
        allowedValues = "Comma-separated list"
    }
    if (listLikeTilde.includes(setting)) {
        typeLabel = "List"
        allowedValues = "Tilde-separated list"
    }
    if (validOptions[setting]) {
        typeLabel = "Enum"
        allowedValues = validOptions[setting]
    }
    if (typeof allSettings[setting] === "boolean") {
        typeLabel = "Boolean"
        allowedValues = "true,false"
    }
    if (setting === "clearhistoryinterval") {
        allowedValues = "Interval, session or none"
    }
    if (containerSettings.includes(setting) || setting === "followchars") {
        allowedValues = "See description"
    }
    if (setting === "darkreaderfg" || setting === "darkreaderbg") {
        allowedValues = "Any valid CSS color"
    }
    if (setting === "downloadpath") {
        allowedValues = "Any directory on disk or empty"
    }
    if (setting === "externalcommand") {
        allowedValues = "Any system command"
    }
    if (setting === "mouse") {
        allowedValues = "'all' or list of features"
    }
    if (setting === "newtaburl") {
        allowedValues = "Any URL"
    }
    if (setting === "searchengine") {
        allowedValues = "Any URL with %s"
    }
    if (setting === "shell") {
        allowedValues = "Any system shell"
    }
    if (setting === "spelllang") {
        allowedValues = `A list containing any of these supported languages: ${
            spelllangs.join(", ")}`
    }
    if (setting === "translatekey") {
        allowedValues = "API key"
    }
    if (setting === "translateurl") {
        allowedValues = "API endpoint"
    }
    if (setting === "vimcommand") {
        allowedValues = "Any system command"
    }
    if (setting === "windowtitle") {
        allowedValues = "Any title"
    }
    if (typeof allSettings[setting] === "number") {
        typeLabel = "Number"
        if (numberRanges[setting]) {
            allowedValues = `from ${
                numberRanges[setting][0]} to ${numberRanges[setting][1]}`
        }
    }
    return {
        allowedValues,
        "current": allSettings[setting],
        "default": defaultSettings[setting],
        "name": setting,
        typeLabel
    }
})

const escapeValueChars = value => {
    if (value?.match?.(/(')/g)?.length) {
        return `"${value}"`
    }
    if (value?.match?.(/("| )/g)?.length) {
        return `'${value}'`
    }
    return value
}

const listCurrentSettings = full => {
    const settings = JSON.parse(JSON.stringify(allSettings))
    if (!full) {
        const defaults = JSON.parse(JSON.stringify(defaultSettings))
        if (isFile(joinPath(appData(), "erwicmode"))) {
            const erwicDefaults = JSON.parse(
                JSON.stringify(defaultErwicSettings)
            )
            Object.assign(defaults, erwicDefaults)
        }

        Object.keys(settings).forEach(t => {
            if (JSON.stringify(settings[t]) === JSON.stringify(defaults[t])) {
                delete settings[t]
            }
        })
    }
    let setCommands = ""
    Object.keys(settings).forEach(setting => {
        const value = settings[setting]
        if (typeof value === "boolean") {
            if (value) {
                setCommands += `${setting}\n`
            } else {
                setCommands += `no${setting}\n`
            }
            return
        }
        if (listLike.includes(setting)) {
            const entries = value.split(",")
            if (entries.length > 1 || value.match(/( |'|")/g)) {
                setCommands += `${setting}=\n`
                entries.forEach(entry => {
                    setCommands += `${setting}+=${escapeValueChars(entry)}\n`
                })
                return
            }
        }
        if (listLikeTilde.includes(setting)) {
            const entries = value.split("~")
            if (entries.length > 1 || value.match(/( |'|")/g)) {
                setCommands += `${setting}=\n`
                entries.forEach(entry => {
                    setCommands += `${setting}+=${escapeValueChars(entry)}\n`
                })
                return
            }
        }
        setCommands += `${setting}=${escapeValueChars(value)}\n`
    })
    return setCommands
}

const saveToDisk = full => {
    let settingsAsCommands = ""
    const options = listCurrentSettings(full).split("\n").filter(s => s)
        .map(s => `set ${s}`).join("\n").trim()
    const {listMappingsAsCommandList} = require("./input")
    const mappings = listMappingsAsCommandList().trim()
    const {customCommandsAsCommandList} = require("./command")
    const commands = customCommandsAsCommandList(full).trim()
    if (!options && !mappings && !commands) {
        notify("There are no options set, no mappings changed and no "
            + "custom commands that have been added, no viebrc written")
        return
    }
    if (options) {
        settingsAsCommands += `" Options\n${options}\n\n`
    }
    if (mappings) {
        settingsAsCommands += `" Mappings\n${mappings}\n\n`
    }
    if (commands) {
        settingsAsCommands += `" Commands\n${commands}\n\n`
    }
    settingsAsCommands += "\" Viebrc generated by Vieb\n\" vim: ft=vim\n"
    const destFile = appConfig().config
    writeFile(destFile, settingsAsCommands,
        `Could not write to '${destFile}'`, `Viebrc saved to '${destFile}'`, 4)
}

const setCustomStyling = css => {
    customStyling = css
    updateCustomStyling()
}

const getCustomStyling = () => customStyling

const updateCustomStyling = () => {
    document.body.style.fontSize = `${allSettings.guifontsize}px`
    updateWebviewSettings()
    listPages().forEach(p => {
        const isSpecialPage = pathToSpecialPageName(p.src).name
        const isLocal = p.src.startsWith("file:/")
        const isErrorPage = p.getAttribute("failed-to-load")
        const isCustomView = p.src.startsWith("sourceviewer:")
            || p.src.startsWith("readerview:")
            || p.src.startsWith("markdownviewer:")
        if (isSpecialPage || isLocal || isErrorPage || isCustomView) {
            try {
                p.send("set-custom-styling",
                    allSettings.guifontsize, customStyling)
            } catch {
                // Page not ready yet or suspended
            }
        }
    })
    const {applyLayout} = require("./pagelayout")
    applyLayout()
    ipcRenderer.send("set-custom-styling",
        allSettings.guifontsize, customStyling)
}

module.exports = {
    freeText,
    getCustomStyling,
    init,
    listCurrentSettings,
    listLike,
    listLikeTilde,
    loadFromDisk,
    mouseFeatures,
    reset,
    saveToDisk,
    set,
    setCustomStyling,
    settingsWithDefaults,
    suggestionList,
    updateContainerSettings,
    updateCustomStyling,
    updateHelpPage,
    updateWindowTitle,
    validOptions
}
