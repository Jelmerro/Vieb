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
    updateGuiVisibility,
    getMouseConf,
    tabForPage,
    listReadyPages
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
    /** @type {"off"|"static"|"update"|"custom"} */
    "adblocker": "static",
    /** @type {"none"|"clearonquit"|"full"} */
    "cache": "clearonquit",
    "clearcookiesonquit": false,
    "cleardownloadsoncompleted": false,
    "cleardownloadsonquit": false,
    "clearhistoryinterval": "none",
    "clearlocalstorageonquit": false,
    "closablepinnedtabs": false,
    /** @type {"all"|"persistall"|"useronly"|"persistuseronly"|"none"} */
    "commandhist": "persistuseronly",
    /** @type {string[]} */
    "containercolors": ["temp\\d+~#ff0"],
    "containerkeeponreopen": true,
    /** @type {string[]} */
    "containernames": [],
    "containernewtab": "s:usecurrent",
    /** @type {"automatic"|"always"|"never"} */
    "containershowname": "automatic",
    "containersplitpage": "s:usecurrent",
    "containerstartuppage": "main",
    "countlimit": 100,
    "darkreader": false,
    "darkreaderbg": "#181a1b",
    /** @type {string[]} */
    "darkreaderblocklist": [],
    "darkreaderbrightness": 100,
    "darkreadercontrast": 100,
    "darkreaderfg": "#e8e6e3",
    "darkreadergrayscale": 0,
    /** @type {"dark"|"light"} */
    "darkreadermode": "dark",
    "darkreaderscope": ["page"],
    "darkreadersepia": 0,
    "darkreadertextstroke": 0,
    /** @type {"window"|"split"|"vsplit"|"tab"} */
    "devtoolsposition": "window",
    /** @type {"show"|"notifyshow"|"block"|"notifyblock"} */
    "dialogalert": "notifyblock",
    /** @type {(
     *   "show"|"notifyshow"|"block"|"notifyblock"|"allow"|"notifyallow"
     * )} */
    "dialogconfirm": "notifyallow",
    /** @type {"show"|"notifyshow"|"block"|"notifyblock"} */
    "dialogprompt": "notifyblock",
    /** @type {"automatic"|"confirm"|"ask"|"block"} */
    "downloadmethod": "automatic",
    "downloadpath": "",
    /** @type {"keep"|"encode"|"decode"|"spacesonly"|"nospaces"} */
    "encodeurlcopy": "nospaces",
    /** @type {"keep"|"encode"|"decode"|"spacesonly"|"nospaces"} */
    "encodeurlext": "nospaces",
    /** @type {"persist"|"session"|"none"} */
    "explorehist": "persist",
    "externalcommand": "",
    /** @type {(
     *   "disabled"|"nocache"|"session"|"1day"|"5day"|"30day"|"forever"
     * )} */
    "favicons": "session",
    /** @type {string[]} */
    "favoritepages": [],
    "followchars": "alpha",
    "followelement": [
        "url",
        "onclick",
        "inputs-insert",
        "inputs-click",
        "media",
        "image",
        "other"
    ],
    "followelementpointer": [
        "url",
        "onclick",
        "inputs-insert",
        "inputs-click",
        "media",
        "image",
        "other"
    ],
    /** @type {"filter"|"exit"|"nothing"} */
    "followfallbackaction": "filter",
    /** @type {("center"|"cornertopleft"|"cornertopright"|"cornerbottomright"|
     * "cornerbottomleft"|"outsidetopleft"|"outsidetopcenter"|
     * "outsidetopright"|"outsiderighttop"|"outsiderightcenter"|
     * "outsiderightbottom"|"outsidebottomright"|"outsidebottomcenter"|
     * "outsidebottomleft"|"outsideleftbottom"|"outsideleftcenter"|
     * "outsidelefttop"|"insidetopleft"|"insidetopcenter"|"insidetopright"|
     * "insiderightcenter"|"insidebottomright"|"insidebottomcenter"|
     * "insidebottomleft"|"insideleftcenter"
     * )} */
    "followlabelposition": "outsiderighttop",
    "follownewtabswitch": true,
    "guifontsize": 14,
    /** @type {"always"|"onupdate"|"oninput"|"never"} */
    "guifullscreennavbar": "oninput",
    /** @type {"always"|"onupdate"|"never"} */
    "guifullscreentabbar": "onupdate",
    "guihidetimeout": 2000,
    /** @type {"always"|"onupdate"|"oninput"|"never"} */
    "guinavbar": "always",
    "guiscrollbar": "always",
    /** @type {"always"|"onupdate"|"never"} */
    "guitabbar": "always",
    "historyperpage": 100,
    "ignorecase": true,
    "incsearch": true,
    /** @type {"rememberstart"|"rememberend"|"alwaysstart"|"alwaysend"} */
    "inputfocusalignment": "rememberend",
    "keeprecentlyclosed": true,
    /** @type {"none"|"spinner"|"line"|"all"} */
    "loadingindicator": "spinner",
    "mapsuggest": 9000000000000000,
    /** @type {"bottomright"|"bottomleft"|"topright"|"topleft"} */
    "mapsuggestposition": "topright",
    /** @type {import("./tabs").tabPosition} */
    "markposition": "newtab",
    /** @type {import("./tabs").tabPosition|"default"} */
    "markpositionshifted": "default",
    "maxmapdepth": 10,
    /** @type {"always"|"globalasneeded"|"elementasneeded"|"never"} */
    "menupage": "elementasneeded",
    /** @type {"both"|"explore"|"command"|"never"} */
    "menusuggest": "both",
    /** @type {"both"|"navbar"|"tabbar"|"never"} */
    "menuvieb": "both",
    "mintabwidth": 28,
    "modifiers": [
        "Ctrl", "Shift", "Alt", "Meta", "NumLock", "CapsLock", "ScrollLock"
    ],
    /** @type {"all"|string[]} */
    "mouse": "all",
    /** @type {"nothing"|"drag"} */
    "mousedisabledbehavior": "nothing",
    "mousefocus": false,
    "mousenewtabswitch": true,
    /** @type {"activate"|"onswitch"|"never"} */
    "mousevisualmode": "onswitch",
    /** @type {"always"|"largeonly"|"smallonly"|"never"} */
    "nativenotification": "never",
    /** @type {"dark"|"light"} */
    "nativetheme": "dark",
    "newtaburl": "",
    "notificationduration": 6000,
    /** @type {"all"|"allowed"|"blocked"|"silent"|"none"} */
    "notificationforpermissions": "silent",
    /** @type {"all"|"errors"|"none"} */
    "notificationforsystemcommands": "errors",
    "notificationlimitsmall": 3,
    /** @type {"bottomright"|"bottomleft"|"topright"|"topleft"} */
    "notificationposition": "bottomright",
    /** @type {{[key: string]: string}} */
    "passthroughkeys": {},
    /** @type {"view"|"block"|"download"|"external"} */
    "pdfbehavior": "download",
    /** @type {"block"|"ask"|"allow"} */
    "permissioncamera": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissioncertificateerror": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionclipboardread": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionclipboardwrite": "allow",
    /** @type {"block"|"ask"|"allow"} */
    "permissionclosepage": "allow",
    /** @type {"block"|"ask"} */
    "permissiondisplaycapture": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionfullscreen": "allow",
    /** @type {"block"|"ask"|"allow"} */
    "permissiongeolocation": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionhid": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionidledetection": "block",
    /** @type {"block"|"allow"|"allowkind"|"allowfull"} */
    "permissionmediadevices": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionmicrophone": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionmidi": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionmidisysex": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionnotifications": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionopenexternal": "ask",
    /** @type {"block"|"ask"|"allow"} */
    "permissionpersistentstorage": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionpointerlock": "block",
    /** @type {string[]} */
    "permissionsallowed": [],
    /** @type {string[]} */
    "permissionsasked": [],
    /** @type {string[]} */
    "permissionsblocked": [],
    /** @type {"block"|"ask"|"allow"} */
    "permissionscreenwakelock": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionsensors": "block",
    /** @type {"block"|"allow"} */
    "permissionserial": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionunknown": "block",
    /** @type {"block"|"allow"} */
    "permissionusb": "block",
    /** @type {"block"|"ask"|"allow"} */
    "permissionwindowmanagement": "block",
    /** @type {"domain"|"url"} */
    "pointerposlocalid": "domain",
    /** @type {"casing"|"local"|"global"} */
    "pointerpostype": "casing",
    "quickmarkpersistence": ["scroll", "marks", "pointer"],
    "quitonlasttabclose": false,
    /** @type {string[]} */
    "redirects": [
        "https?://(www\\.)?google\\.com(\\.\\w+)?/amp/s/amp\\.(.*)~https://$3"
    ],
    "redirecttohttp": false,
    "reloadtaboncrash": false,
    /** @type {"always"|"special"|"newtab"|"never"} */
    "replacespecial": "special",
    /** @type {"always"|"newtab"|"never"} */
    "replacestartup": "never",
    /** @type {{[key: string]: string}} */
    "requestheaders": {},
    "requesttimeout": 20000,
    /** @type {string[]} */
    "resourcesallowed": [],
    /** @type {string[]} */
    "resourcesblocked": [],
    "resourcetypes": [
        "object",
        "script",
        "media",
        "image",
        "stylesheet",
        "font",
        "xhr",
        "ping",
        "websocket"
    ],
    /** @type {"all"|"pinned"|"regular"|"none"} */
    "restoretabs": "all",
    "restorewindowfullscreen": true,
    "restorewindowmaximize": true,
    "restorewindowposition": true,
    "restorewindowsize": true,
    /** @type {"domain"|"url"} */
    "scrollposlocalid": "domain",
    /** @type {"casing"|"local"|"global"} */
    "scrollpostype": "casing",
    /** @type {"global"|"local"|"both"} */
    "searchemptyscope": "global",
    "searchengine": ["https://duckduckgo.com/?kae=d&kav=1&ko=1&q=%s&ia=web"],
    /** @type {"left"|"center"|"right"} */
    "searchpointeralignment": "left",
    /** @type {"global"|"local"|"inclocal"} */
    "searchscope": "global",
    /** @type {{[key: string]: string}} */
    "searchwords": {},
    "shell": "",
    "showcmd": true,
    "smartcase": true,
    "spell": true,
    "spelllang": ["system"],
    "splitbelow": false,
    "splitright": false,
    "sponsorblock": false,
    /** @type {{[key: string]: string}} */
    "sponsorblockcategories": {
        "interaction": "red",
        "intro": "cyan",
        "music_offtopic": "",
        "outro": "blue",
        "selfpromo": "yellow",
        "sponsor": "lime"
    },
    /** @type {string[]} */
    "startuppages": [],
    "storenewvisits": ["pages"],
    "suggestbouncedelay": 100,
    "suggestcommands": 9000000000000000,
    "suggestorder": ["history", "searchword", "file"],
    "suggesttopsites": 10,
    "suspendbackgroundtab": true,
    /** @type {"all"|"regular"|"none"} */
    "suspendonrestore": "regular",
    "suspendtimeout": 0,
    "suspendtimeoutignore": ["ga//", "gp//"],
    /** @type {"left"|"right"|"previous"} */
    "tabclosefocus": "left",
    "tabcycle": true,
    /** @type {"left"|"right"|"start"|"end"} */
    "tabnewposition": "right",
    /** @type {"always"|"background"|"never"} */
    "tabopenmuted": "never",
    /** @type {"hidden"|"scroll"|"wrap"} */
    "taboverflow": "scroll",
    /** @type {"always"|"remember"|"never"} */
    "tabreopenmuted": "remember",
    /** @type {"left"|"right"|"previous"} */
    "tabreopenposition": "right",
    "timeout": true,
    "timeoutlen": 2000,
    /** @type {string[]} */
    "tocpages": [],
    /** @type {"auto"|"deepl"|"libretranslate"} */
    "translateapi": "auto",
    "translatekey": "",
    "translatelang": "en-us",
    "translateurl": "https://api-free.deepl.com/v2/",
    /** @type {string[]} */
    "useragent": [],
    "userscript": false,
    "userscriptscope": ["page"],
    "userstyle": false,
    "userstylescope": ["page"],
    "vimcommand": "gvim",
    "windowtitle": "%app - %title"
}
/** @type {typeof defaultSettings} */
let allSettings = JSON.parse(JSON.stringify(defaultSettings))
const defaultErwicSettings = {
    "containernewtab": "s:external",
    "containerstartuppage": "s:usematching",
    "permissioncamera": "allow",
    "permissiondisplaycapture": "ask",
    "permissionmediadevices": "allowfull",
    "permissionmicrophone": "allow",
    "permissionnotifications": "allow"
}
const freeText = [
    "downloadpath",
    "externalcommand",
    "shell",
    "translatekey",
    "vimcommand",
    "windowtitle"
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
    "followlabelposition": [
        "center",
        "cornertopleft",
        "cornertopright",
        "cornerbottomright",
        "cornerbottomleft",
        "outsidetopleft",
        "outsidetopcenter",
        "outsidetopright",
        "outsiderighttop",
        "outsiderightcenter",
        "outsiderightbottom",
        "outsidebottomright",
        "outsidebottomcenter",
        "outsidebottomleft",
        "outsideleftbottom",
        "outsideleftcenter",
        "outsidelefttop",
        "insidetopleft",
        "insidetopcenter",
        "insidetopright",
        "insiderightcenter",
        "insidebottomright",
        "insidebottomcenter",
        "insidebottomleft",
        "insideleftcenter"
    ],
    "guifullscreennavbar": ["always", "onupdate", "oninput", "never"],
    "guifullscreentabbar": ["always", "onupdate", "never"],
    "guinavbar": ["always", "onupdate", "oninput", "never"],
    "guiscrollbar": ["always", "onscroll", "onmove", "never"],
    "guitabbar": ["always", "onupdate", "never"],
    "inputfocusalignment": [
        "rememberstart", "rememberend", "alwaysstart", "alwaysend"
    ],
    "loadingindicator": ["none", "spinner", "line", "all"],
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
    "nativenotification": ["always", "largeonly", "smallonly", "never"],
    "nativetheme": ["dark", "light"],
    "notificationforpermissions": [
        "all", "allowed", "blocked", "silent", "none"
    ],
    "notificationforsystemcommands": ["all", "errors", "none"],
    "notificationposition": [
        "bottomright", "bottomleft", "topright", "topleft"
    ],
    "pdfbehavior": ["view", "block", "download", "external"],
    "permissioncamera": ["block", "ask", "allow"],
    "permissioncertificateerror": ["block", "ask", "allow"],
    "permissionclipboardread": ["block", "ask", "allow"],
    "permissionclipboardwrite": ["block", "ask", "allow"],
    "permissionclosepage": ["block", "allow"],
    "permissiondisplaycapture": ["block", "ask"],
    "permissionfullscreen": ["block", "ask", "allow"],
    "permissiongeolocation": ["block", "ask", "allow"],
    "permissionhid": ["block", "allow"],
    "permissionidledetection": ["block", "ask", "allow"],
    "permissionmediadevices": ["block", "allow", "allowkind", "allowfull"],
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
    "permissionusb": ["block", "allow"],
    "permissionwindowmanagement": ["block", "ask", "allow"],
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
    "tabclosefocus": ["left", "right", "previous"],
    "tabnewposition": ["left", "right", "start", "end"],
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
    "guifontsize": [1, 300],
    "guihidetimeout": [0, 9000000000000000],
    "historyperpage": [1, 9000000000000000],
    "mapsuggest": [0, 9000000000000000],
    "maxmapdepth": [1, 40],
    "mintabwidth": [0, 9000000000000000],
    "notificationduration": [0, 9000000000000000],
    "notificationlimitsmall": [0, 9000000000000000],
    "requesttimeout": [0, 9000000000000000],
    "suggestbouncedelay": [0, 10000],
    "suggestcommands": [0, 9000000000000000],
    "suggesttopsites": [0, 9000000000000000],
    "suspendtimeout": [0, 9000000000000000],
    "timeoutlen": [0, 9000000000000000]
}
/** @type {(keyof typeof defaultSettings)[]} */
const acceptsIntervals = ["clearhistoryinterval"]
/** @type {(keyof typeof defaultSettings)[]} */
const acceptsInvertedIntervals = []
let customStyling = ""
/** @type {(keyof typeof defaultSettings)[]} */
const downloadSettings = [
    "downloadmethod",
    "downloadpath",
    "cleardownloadsonquit",
    "cleardownloadsoncompleted"
]
const containerSettings = [
    "containernewtab", "containersplitpage", "containerstartuppage"
]
/** @type {string[]} */
let spelllangs = []

/**
 * Check if an option is considered a valid one, only checks at all if an enum.
 * @param {import("./common").RunSource} src
 * @param {keyof typeof validOptions} setting
 * @param {string} value
 */
const checkOption = (src, setting, value) => {
    /** @type {typeof validOptions[setting]} */
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
                + ` ${text}`, {src, "type": "warn"})
        }
        return valid
    }
    return false
}

/**
 * Check if an option is considered a valid value for a number setting.
 * @param {import("./common").RunSource} src
 * @param {keyof typeof numberRanges} setting
 * @param {number} value
 */
const checkNumber = (src, setting, value) => {
    const numberRange = numberRanges[setting]
    if (numberRange[0] > value || numberRange[1] < value) {
        notify(`The value of setting '${setting}' must be between `
            + `${numberRange[0]} and ${numberRange[1]}`, {src, "type": "warn"})
        return false
    }
    return true
}

/**
 * Check if the provided suggest order is valid.
 * @param {import("./common").RunSource} src
 * @param {string[]} value
 */
const checkSuggestOrder = (src, value) => {
    for (const suggest of value) {
        const parts = (suggest.match(/~/g) || []).length
        if (parts > 2) {
            notify(
                `Invalid suggestorder entry: ${suggest}\n`
                + "Entries must have at most two ~ to separate the type "
                + "from the count and the order (both optional)",
                {src, "type": "warn"})
            return false
        }
        const args = suggest.split("~")
        const type = args.shift() ?? ""
        if (!["history", "file", "searchword"].includes(type)) {
            notify(`Invalid suggestorder type: ${type}\n`
                    + "Suggestion type must be one of: history, file or "
                    + "searchword", {src, "type": "warn"})
            return false
        }
        let hasHadCount = false
        let hasHadOrder = false
        for (const arg of args) {
            if (!arg) {
                notify("Configuration for suggestorder after the type can "
                        + "not be empty", {src, "type": "warn"})
                return false
            }
            const potentialCount = Number(arg)
            if (potentialCount > 0 && potentialCount <= 9000000000000000) {
                if (hasHadCount) {
                    notify(
                        "Count configuration for a suggestorder entry "
                        + "can only be set once per entry",
                        {src, "type": "warn"})
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
                    notify(
                        "Order configuration for a suggestorder entry "
                        + "can only be set once per entry",
                        {src, "type": "warn"})
                    return false
                }
                hasHadOrder = true
                continue
            }
            notify(
                `Order configuration is invalid, supported orders for ${
                    type} suggestions are: ${validOrders.join(", ")}`,
                {src, "type": "warn"})
            return false
        }
    }
    return true
}

/**
 * Check if other more advanced settings are configured correctly.
 * @param {import("./common").RunSource} src
 * @param {keyof typeof defaultSettings} setting
 * @param {number|string|boolean|string[]|{[key: string]: string}} value
 */
const checkOther = (src, setting, value) => {
    // Special cases
    if (setting === "clearhistoryinterval") {
        if (typeof value !== "string") {
            return false
        }
        const valid = ["session", "none"].includes(value)
            || isValidIntervalValue(value)
        if (!valid) {
            notify("clearhistoryinterval can only be set to none, session or "
                + "a valid interval, such as 1day or 3months",
            {src, "type": "warn"})
        }
        return valid
    }
    if (containerSettings.includes(setting)) {
        if (typeof value !== "string") {
            return false
        }
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
                + ` ${text}`, {src, "type": "warn"})
            return false
        }
        const simpleValue = value.replace("%n", "valid").replace(/_/g, "")
        if (simpleValue.match(specialChars)) {
            notify(
                "No special characters besides underscores are allowed in the "
                + `name of a container, invalid ${setting}: ${value}`,
                {src, "type": "warn"})
            return false
        }
    }
    if (setting === "containercolors") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const colorMatch of v) {
            if ((colorMatch.match(/~/g) || []).length !== 1) {
                notify(`Invalid ${setting} entry: ${colorMatch}\n`
                    + "Entries must have exactly one ~ to separate the "
                    + "name regular expression and color name/hex",
                {src, "type": "warn"})
                return false
            }
            const [match, color] = colorMatch.split("~")
            try {
                RegExp(match)
            } catch {
                notify(
                    `Invalid regular expression in containercolors: ${match}`,
                    {src, "type": "warn"})
                return false
            }
            const {style} = document.createElement("div")
            style.color = "white"
            style.color = color
            if (style.color === "white" && color !== "white" || !color) {
                notify("Invalid color, must be a valid color name or hex"
                    + `, not: ${color}`, {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "containernames") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const containerMatch of v) {
            if (![1, 2].includes((containerMatch.match(/~/g) || []).length)) {
                notify(`Invalid ${setting} entry: ${containerMatch}\n`
                    + "Entries must have one or two ~ to separate the "
                    + "regular expression, container name and newtab param",
                {src, "type": "warn"})
                return false
            }
            const [match, container, newtabParam] = containerMatch.split("~")
            if (newtabParam && newtabParam !== "newtab") {
                notify(`Invalid containernames newtab param: ${containerMatch}`,
                    {src, "type": "warn"})
                return false
            }
            try {
                RegExp(match)
            } catch {
                notify(
                    `Invalid regular expression in containernames: ${match}`,
                    {src, "type": "warn"})
                return false
            }
            const simpleValue = container.replace("%n", "valid").replace(/_/g, "")
            if (simpleValue.match(specialChars)) {
                notify(
                    "No special characters besides underscores are allowed in "
                    + `the name of a container, invalid ${setting}: ${v}`,
                    {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "darkreaderfg" || setting === "darkreaderbg") {
        if (typeof value !== "string") {
            return false
        }
        const {style} = document.createElement("div")
        style.color = "white"
        style.color = value
        if (style.color === "white" && value !== "white" || !value) {
            notify("Invalid color, must be a valid color name or hex"
                    + `, not: ${value}`, {src, "type": "warn"})
            return false
        }
    }
    if (setting === "darkreaderblocklist") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const match of v) {
            try {
                RegExp(match)
            } catch {
                notify(`Invalid regular expression in ${setting}: ${match}`,
                    {src, "type": "warn"})
                return false
            }
        }
    }
    const scopeConf = ["darkreaderscope", "userscriptscope", "userstylescope"]
    if (scopeConf.includes(setting)) {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const match of v) {
            if (!["file", "page", "special"].includes(match)) {
                notify(`Invalid value '${match}' in ${setting}, `
                    + "must be one of: file, page or special",
                {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "downloadpath") {
        if (typeof value !== "string") {
            return false
        }
        const expandedPath = expandPath(value)
        if (value && !pathExists(expandedPath)) {
            notify("The download path does not exist", {src, "type": "warn"})
            return false
        }
        if (value && !isDir(expandedPath)) {
            notify("The download path is not a directory",
                {src, "type": "warn"})
            return false
        }
    }
    if (setting === "favoritepages") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const page of v) {
            if (!isUrl(page)) {
                notify(`Invalid URL passed to favoritepages: ${page}`,
                    {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "followchars") {
        if (typeof value !== "string") {
            return false
        }
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
               + "must be any of: alpha, alphanum, dvorakhome, numbers, "
               + `qwertyhome, or a custom list starting with 'custom:'`,
            {src, "type": "warn"})
            return false
        }
        if (value.startsWith("custom:")) {
            const chars = value.replace("custom:", "").split("")
            if (chars.length < 2) {
                notify("A minimum of two characters is required",
                    {src, "type": "warn"})
                return false
            }
            if (new Set(chars).size < chars.length) {
                notify("All characters must be unique, no duplicates",
                    {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting.startsWith("followelement")) {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        const ok = [
            "url",
            "onclick",
            "inputs-insert",
            "inputs-click",
            "media",
            "image",
            "other"
        ]
        for (const element of v) {
            if (!ok.includes(element)) {
                notify(`Invalid element type passed: ${element}, `
                   + `must be any combination of: url, onclick,
                      inputs-insert, inputs-click or other`,
                {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "modifiers") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        const {keyNames} = require("./input")
        for (const name of v) {
            if (name.length > 1
                && !keyNames.some(key => key.vim.includes(name))) {
                notify(`Key name '${name}' is not recognized as a valid key`,
                    {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "mouse") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        const invalid = v.find(m => !mouseFeatures.includes(m) && m !== "all")
        if (invalid) {
            notify(`Feature '${invalid}' is not a valid mouse feature`,
                {src, "type": "warn"})
            return false
        }
    }
    if (setting === "newtaburl") {
        if (typeof value !== "string") {
            return false
        }
        if (value && !isUrl(stringToUrl(value).replace(/^https?:\/\//g, ""))) {
            notify("The newtaburl value must be a valid url or empty",
                {src, "type": "warn"})
            return false
        }
    }
    if (setting === "passthroughkeys") {
        // TODO implement check for valid url regex + valid map key names list
        return true
    }
    const permissionSettings = [
        "permissionsallowed", "permissionsasked", "permissionsblocked"
    ]
    if (permissionSettings.includes(setting)) {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const override of v) {
            if ((override.match(/~/g) || []).length === 0) {
                notify(`Invalid ${setting} entry: ${override}\n`
                    + "Entries must have at least one ~ to separate the "
                    + "domain regular expression and permission names",
                {src, "type": "warn"})
                return false
            }
            const [match, ...names] = override.split("~")
            try {
                RegExp(match)
            } catch {
                notify(
                    `Invalid regular expression in permission: ${match}`,
                    {src, "type": "warn"})
                return false
            }
            for (let name of names) {
                if (!name.startsWith("permission")) {
                    name = `permission${name}`
                }
                if (name === "permissionmediadeviceskind"
                    && setting.endsWith("allowed")) {
                    return true
                }
                if (name === "permissionmediadevicesfull"
                    && setting.endsWith("allowed")) {
                    return true
                }
                const reservedName = permissionSettings.includes(name)
                if (reservedName || !(name in defaultSettings)) {
                    notify(
                        `Invalid name for a permission: ${name}`,
                        {src, "type": "warn"})
                    return false
                }
                if (setting.endsWith("asked") && name.endsWith("hid")) {
                    notify(
                        "HID permission can't be asked, "
                        + "only allowed or blocked", {src, "type": "warn"})
                    return false
                }
                if (setting.endsWith("asked") && name.endsWith("usb")) {
                    notify(
                        "USB device permission can't be asked, "
                        + "only allowed or blocked", {src, "type": "warn"})
                    return false
                }
                if (setting.endsWith("asked") && name.endsWith("serial")) {
                    notify(
                        "Serial device permission can't be asked, "
                        + "only allowed or blocked", {src, "type": "warn"})
                    return false
                }
                if (setting.endsWith("asked") && name.endsWith("ediadevices")) {
                    notify(
                        "Mediadevices permission can't be asked, "
                        + "only allowed or blocked", {src, "type": "warn"})
                    return false
                }
                if (setting.endsWith("allowed") && name.endsWith("capture")) {
                    notify(
                        "Display capture permission can't be allowed, "
                        + "only asked or blocked", {src, "type": "warn"})
                    return false
                }
            }
        }
    }
    if (setting === "quickmarkpersistence" && value !== "") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const mType of v) {
            if (!["scroll", "marks", "pointer"].includes(mType)) {
                notify(`Invalid quickmark type passed to ${setting}: ${mType}`,
                    {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "redirects") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const redirect of v) {
            if ((redirect.match(/~/g) || []).length !== 1) {
                notify(`Invalid redirect entry: ${redirect}\n`
                    + "Entries must have exactly one ~ to separate the "
                    + "regular expression from the replacement",
                {src, "type": "warn"})
                return false
            }
            const [match] = redirect.split("~")
            try {
                RegExp(match)
            } catch {
                notify(`Invalid regular expression in redirect: ${match}`,
                    {src, "type": "warn"})
                return false
            }
        }
    }
    if (["resourcesallowed", "resourcesblocked"].includes(setting)) {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const override of v) {
            const [match, ...names] = override.split("~")
            try {
                RegExp(match)
            } catch {
                notify(`Invalid regular expression in ${setting}: ${match}`,
                    {src, "type": "warn"})
                return false
            }
            for (const name of names) {
                const supported = defaultSettings.resourcetypes
                if (!supported.includes(name)) {
                    notify(`Invalid resource type in ${setting}: ${name}`,
                        {src, "type": "warn"})
                    return false
                }
            }
        }
    }
    if (setting === "resourcetypes" && value !== "") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const rsrc of v) {
            if (!defaultSettings.resourcetypes.includes(rsrc)) {
                notify(`Invalid resource type passed to ${setting}: ${rsrc}`,
                    {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "searchengine") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (let baseUrl of v) {
            baseUrl = baseUrl.replace(/^https?:\/\//g, "")
            if (baseUrl.length === 0 || !baseUrl.includes("%s")) {
                notify(`Invalid searchengine value: ${baseUrl}\n`
                        + "Each URL must contain a %s parameter, which will "
                        + "be replaced by the search string",
                {src, "type": "warn"})
                return false
            }
            if (!isUrl(baseUrl)) {
                notify(
                    "Each URL of the searchengine setting must be a valid url",
                    {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "searchwords") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (typeof v !== "object") {
            return false
        }
        if (Array.isArray(v)) {
            const list = v
            v = {}
            for (const el of list) {
                if ((el.match(/~/g) || []).length !== 1) {
                    notify(`Invalid searchwords entry: ${el}\n`
                        + "Entries must have exactly one ~ to separate the "
                        + "searchword from the URL", {src, "type": "warn"})
                    return false
                }
                const [keyword, url] = el.split("~")
                v[keyword] = url
            }
        }
        /** @type {string[]} */
        const knownSearchwords = []
        for (const searchword of Object.entries(v)) {
            const [keyword, url] = searchword
            const simpleKeyword = keyword.replace(/_/g, "")
            if (keyword.length === 0 || simpleKeyword.match(specialChars)) {
                notify(`Invalid searchwords entry: ${searchword}\n`
                    + "Searchwords before the ~ must not contain any special "
                    + "characters besides underscores", {src, "type": "warn"})
                return false
            }
            if (url.length === 0 || !url.includes("%s")) {
                notify(`Invalid searchwords entry: ${searchword}\n`
                    + "URLs for searchwords must exist and must "
                    + "contain a %s parameter, which will be "
                    + "replaced by the search string", {src, "type": "warn"})
                return false
            }
            if (knownSearchwords.includes(keyword)) {
                notify(`Invalid searchwords entry: ${searchword}\n`
                    + `The searchword ${keyword} was already defined. `
                    + "A searchword must be defined only once",
                {src, "type": "warn"})
                return false
            }
            knownSearchwords.push(keyword)
        }
    }
    if (setting === "spelllang" && value !== "") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const lang of v) {
            if (spelllangs.length && !spelllangs.includes(lang)) {
                notify(`Invalid language passed to spelllang: ${lang}`,
                    {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "sponsorblockcategories") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (typeof v !== "object") {
            return false
        }
        if (Array.isArray(v)) {
            const list = v
            v = {}
            for (const el of list) {
                if ((el.match(/~/g) || []).length > 1) {
                    notify(`Invalid ${setting} entry: ${el}\n`
                        + "Entries must have zero or one ~ to separate the "
                        + "category name and color name/hex",
                    {src, "type": "warn"})
                    return false
                }
                const [category, color] = el.split("~")
                v[category] = color
            }
        }
        /** @type {string[]} */
        const knownCategories = []
        const allCategories = Object.keys(
            defaultSettings.sponsorblockcategories)
        for (const catColorPair of Object.entries(v)) {
            const [category, color] = catColorPair
            if (!allCategories.includes(category)) {
                notify(`Invalid category in ${setting}: ${category}`,
                    {src, "type": "warn"})
                return false
            }
            const {style} = document.createElement("div")
            style.color = "white"
            style.color = color
            if (color && style.color === "white" && color !== "white") {
                notify("Invalid color, must be a valid color name or hex"
                    + `, not: ${color}`, {src, "type": "warn"})
                return false
            }
            if (knownCategories.includes(category)) {
                notify(`Invalid sponsorblockcategories entry: ${catColorPair}\n`
                    + `The category ${category} was already defined. `
                    + "A category must be defined only once",
                {src, "type": "warn"})
                return false
            }
            knownCategories.push(category)
        }
    }
    if (setting === "startuppages") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const page of v) {
            const parts = page.split("~")
            const url = parts.shift() ?? ""
            const cname = parts.shift()
            if (!isUrl(url)) {
                notify(`Invalid URL passed to startuppages: ${url}`,
                    {src, "type": "warn"})
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
                        + `${setting}: ${cname}`, {src, "type": "warn"})
                    return false
                }
            }
            if (parts.length > 2) {
                notify("Too many options given to startuppages entry",
                    {src, "type": "warn"})
                return false
            }
            if (parts[0] && parts[0] !== "muted" && parts[0] !== "pinned") {
                notify(`Invalid option '${parts[0]}' given to startuppages, `
                    + "only 'muted' and 'pinned' are accepted",
                {src, "type": "warn"})
                return false
            }
            if (parts[1] && parts[1] !== "muted" && parts[1] !== "pinned") {
                notify(`Invalid option '${parts[1]}' given to startuppages, `
                    + "only 'muted' and 'pinned' are accepted",
                {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "storenewvisits") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        const valid = [
            "pages",
            "files",
            "special",
            "sourceviewer",
            "readerview",
            "markdownviewer"
        ]
        for (const visitType of v) {
            if (!valid.includes(visitType)) {
                notify(`Invalid type of history passed: ${visitType}, `
                    + `must be one of: ${valid.join(", ")}`,
                {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "suggestorder") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        return checkSuggestOrder(src, v)
    }
    if (setting === "suspendtimeoutignore") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const ignore of v) {
            const {rangeToTabIdxs} = require("./command")
            if (!rangeToTabIdxs(src, ignore).valid) {
                return false
            }
        }
    }
    if (setting === "tocpages") {
        // TODO check if still needed
        let v = value
        if (typeof v === "string") {
            v = v.split(",").filter(t => t.trim())
        } else if (!Array.isArray(v)) {
            return false
        }
        for (const match of v) {
            try {
                RegExp(match)
            } catch {
                notify(`Invalid regular expression in ${setting}: ${match}`,
                    {src, "type": "warn"})
                return false
            }
        }
    }
    if (setting === "translateurl") {
        if (typeof value !== "string") {
            return false
        }
        if (!isUrl(stringToUrl(value).replace(/^https?:\/\//g, ""))) {
            notify("The translateurl value must be a valid url",
                {src, "type": "warn"})
            return false
        }
    }
    return true
}

/**
 * Check if a given setting name exists at all.
 * @param {string} set
 * @returns {set is keyof typeof defaultSettings}
 */
const isExistingSetting = set => set in defaultSettings

/**
 * Check if a setting is of type boolean.
 * @param {string} set
 * @returns {set is GetKeysOfType<boolean, defaultSettings>}
 */
const isBooleanSetting = set => isExistingSetting(set)
    && typeof defaultSettings[set] === "boolean"

/**
 * Check if a setting is of type enum, so it has to validate the valid opts.
 * @param {string} set
 * @returns {set is keyof typeof validOptions}
 */
const isEnumSetting = set => set in validOptions

/**
 * Check if a setting is of type number, so it has to validate the ranges.
 * @param {string} set
 * @returns {set is keyof typeof numberRanges}
 */
const isNumberSetting = set => set in numberRanges

/**
 * Check if a setting is of type string[], to treat it like an array.
 * @param {string} set
 * @returns {set is GetKeysOfType<string[], defaultSettings>|"mouse"}
 */
const isArraySetting = set => isExistingSetting(set)
    && (Array.isArray(defaultSettings[set]) || set === "mouse")

/**
 * Check if a setting is of type object with string key/value.
 * @param {string} set
 * @returns {set is GetKeysOfType<{[key: string]: string}, defaultSettings>}
 */
const isObjectSetting = set => isExistingSetting(set)
    && !isArraySetting(set) && typeof defaultSettings[set] === "object"

/**
 * Check if a setting is of type string.
 * @param {string} set
 * @returns {set is GetKeysOfType<string, defaultSettings>}
 */
const isStringSetting = set => isExistingSetting(set)
    && typeof defaultSettings[set] === "string"

/**
 * Check if a setting will be valid for a given value.
 * @template {keyof typeof defaultSettings} T
 * @param {import("./common").RunSource} src
 * @param {T} setting
 * @param {typeof defaultSettings[T]} value
 */
const isValidSetting = (src, setting, value) => {
    const expectedType = typeof allSettings[setting]
    /** @type {string|number|boolean|string[]|{[key: string]: string}} */
    let parsedValue = value
    if (expectedType === "number" && !isNaN(Number(parsedValue))) {
        parsedValue = Number(value)
    }
    if (expectedType === "string") {
        parsedValue = String(value)
    }
    if (expectedType === "boolean") {
        if (["true", "false"].includes(String(parsedValue))) {
            parsedValue = value === "true"
        }
    }
    if (expectedType !== typeof parsedValue) {
        notify(`The value of setting '${setting}' is of an incorrect `
            + `type, expected '${expectedType}' but got `
            + `'${typeof parsedValue}' instead.`, {src, "type": "warn"})
        return false
    }
    if (isEnumSetting(setting)) {
        if (typeof parsedValue !== "string") {
            return false
        }
        return checkOption(src, setting, parsedValue)
    }
    if (isNumberSetting(setting)) {
        if (typeof parsedValue !== "number") {
            return false
        }
        return checkNumber(src, setting, parsedValue)
    }
    return checkOther(src, setting, parsedValue)
}

/** Update the mouse related settings on the local DOM body for CSS rules. */
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

/** Update the request headers setting in the main thread. */
const updateRequestHeaders = () => {
    ipcRenderer.send("update-request-headers", allSettings.requestheaders)
}

/** Update the native theme in the main thread. */
const updateNativeTheme = () => {
    ipcRenderer.send("update-native-theme", allSettings.nativetheme)
}

/** Update the PDF behavior setting in the main thread. */
const updatePdfOption = () => {
    ipcRenderer.send("update-pdf-option", allSettings.pdfbehavior)
}

/**
 * Update container related settings on change and update labels/colors.
 * @param {boolean} full
 */
const updateContainerSettings = (full = true) => {
    if (full) {
        for (const page of listPages()) {
            const color = allSettings.containercolors.find(
                c => page.getAttribute("container")?.match(c.split("~")[0]))
            const tab = tabForPage(page)
            if (tab && color) {
                [, tab.style.color] = color.split("~")
            } else if (tab) {
                tab.style.color = ""
            }
        }
    }
    const container = currentPage()?.getAttribute("container")
    if (!container) {
        return
    }
    const color = allSettings.containercolors.find(
        c => container.match(c.split("~")[0]))
    const show = allSettings.containershowname
    const containerNameEl = document.getElementById("containername")
    if (!containerNameEl) {
        return
    }
    if (container === "main" && show === "automatic" || show === "never") {
        containerNameEl.style.display = "none"
    } else {
        containerNameEl.textContent = container
        if (color) {
            [, containerNameEl
                .style.color] = color.split("~")
        } else {
            containerNameEl.style.color = ""
        }
        containerNameEl.style.display = ""
    }
}

/**
 * Update download related settings in the main thread on change.
 * @param {boolean} fromExecute
 */
const updateDownloadSettings = (fromExecute = false) => {
    /** @type {{[setting: string]: boolean|number|string|string[]
     *   |{[key: string]: string}}} */
    const downloads = {}
    downloadSettings.forEach(setting => {
        downloads[setting] = allSettings[setting]
    })
    if (fromExecute) {
        downloads.src = "execute"
    } else {
        downloads.src = "user"
    }
    ipcRenderer.send("set-download-settings", downloads)
}

/** @type {(keyof typeof defaultSettings)[]} */
const webviewSettings = [
    "darkreader",
    "darkreaderbg",
    "darkreaderblocklist",
    "darkreaderbrightness",
    "darkreadercontrast",
    "darkreaderfg",
    "darkreadergrayscale",
    "darkreadermode",
    "darkreaderscope",
    "darkreadersepia",
    "darkreadertextstroke",
    "dialogalert",
    "dialogconfirm",
    "dialogprompt",
    "guifontsize",
    "guiscrollbar",
    "historyperpage",
    "inputfocusalignment",
    "pdfbehavior",
    "permissiondisplaycapture",
    "permissionmediadevices",
    "permissionsallowed",
    "permissionsasked",
    "permissionsblocked",
    "searchpointeralignment",
    "sponsorblock",
    "sponsorblockcategories",
    "userstyle",
    "userstylescope"
]

/** Update the settings in the webviewsettings file that are used there. */
const updateWebviewSettings = () => {
    const webviewSettingsFile = joinPath(appData(), "webviewsettings")
    /** @type {{[setting: string]: boolean|number|string|string[]
     *   |{[key: string]: string}}} */
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

/** Update the permissions in the main thread on change. */
const updatePermissionSettings = () => {
    /** @type {{[setting: string]: boolean|number|string|string[]
     *   |{[key: string]: string}}} */
    const permissions = {}
    Object.keys(allSettings).forEach(setting => {
        if (setting.startsWith("permission")) {
            permissions[setting] = allSettings[setting]
        }
    })
    ipcRenderer.send("set-permissions", permissions)
}

/** Return the list of all setting names. */
const listSettingsAsArray = () => Object.keys(defaultSettings)

/** Return the list of suggestions for all settings. */
const suggestionList = () => {
    const listOfSuggestions = ["all", ...listSettingsAsArray()]
    listOfSuggestions.push("all&")
    listOfSuggestions.push("all?")
    for (const setting of listSettingsAsArray()) {
        if (typeof defaultSettings[setting] === "boolean") {
            listOfSuggestions.push(`${setting}!`)
            listOfSuggestions.push(`no${setting}`)
            listOfSuggestions.push(`inv${setting}`)
        } else if (isEnumSetting(setting)) {
            listOfSuggestions.push(`${setting}!`)
            listOfSuggestions.push(`${setting}=`)
            for (const option of validOptions[setting]) {
                listOfSuggestions.push(`${setting}=${option}`)
            }
        } else {
            listOfSuggestions.push(`${setting}=`)
            listOfSuggestions.push(`${setting}=${
                JSON.stringify(defaultSettings[setting])}`)
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
        const isListLike = typeof defaultSettings[setting] === "object"
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

/** Update the window title using the windowtitle setting and app config. */
const updateWindowTitle = () => {
    const config = appConfig()
    const name = config?.name ?? ""
    const version = config?.version ?? ""
    const title = tabForPage(currentPage())
        ?.querySelector("span")?.textContent || ""
    let url = currentPage()?.src || ""
    const specialPage = pathToSpecialPageName(url)
    if (specialPage?.name) {
        url = `${name.toLowerCase()}://${specialPage.name}`
        if (specialPage.section) {
            url += `#${specialPage.section}`
        }
    }
    ipcRenderer.send("set-window-title", allSettings.windowtitle
        .replace(/%app/g, name).replace(/%title/g, title)
        .replace(/%url/g, url).replace(/%version/g, version))
}

/** Get the custom styling CSS lines. */
const getCustomStyling = () => customStyling

/** Update the custom styling in the webview using colorscheme and fontsize. */
const updateCustomStyling = () => {
    document.body.style.fontSize = `${allSettings.guifontsize}px`
    updateWebviewSettings()
    const {addColorschemeStylingToWebview} = require("./tabs")
    listReadyPages().forEach(p => addColorschemeStylingToWebview(p))
    const {applyLayout} = require("./pagelayout")
    applyLayout()
    ipcRenderer.send("set-custom-styling",
        allSettings.guifontsize, customStyling)
}

/**
 * Apply custom styling based on the colorscheme.
 * @param {string} css
 */
const setCustomStyling = css => {
    customStyling = css
    updateCustomStyling()
}

/** Return a list of all settings with default, type and allowed values. */
const settingsWithDefaults = () => Object.keys(allSettings).map(setting => {
    let typeLabel = "String"
    /** @type {string|string[]} */
    let allowedValues = ""
    if (isArraySetting(setting)) {
        typeLabel = "Array"
        allowedValues
            = "Comma String, Array, Array of Arrays or Object"
    }
    if (isObjectSetting(setting)) {
        typeLabel = "Object"
        allowedValues
            = "Comma String, Array, Array of Arrays or Object"
    }
    if (isEnumSetting(setting)) {
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
    if (isNumberSetting(setting)) {
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

/**
 * Update the help page with updated settings, mapping and commands.
 * @param {import("./common").RunSource} src
 */
const updateHelpPage = src => {
    listReadyPages().forEach(p => {
        const special = pathToSpecialPageName(p.getAttribute("src") ?? "")
        if (special?.name === "help") {
            const {
                listMappingsAsCommandList, uncountableActions
            } = require("./input")
            const {rangeCompatibleCommands} = require("./command")
            p.send("settings", settingsWithDefaults(),
                listMappingsAsCommandList(src, null, true), uncountableActions,
                rangeCompatibleCommands)
        }
    })
}

/**
 * Set the value of a setting, if considered valid, else notify the user.
 * @template {keyof typeof defaultSettings} T
 * @param {import("./common").RunSource} src
 * @param {T} setting
 * @param {typeof defaultSettings[T]} value
 */
const set = (src, setting, value) => {
    if (isValidSetting(src, setting, value)) {
        const {applyLayout} = require("./pagelayout")
        if (isBooleanSetting(setting)) {
            allSettings[setting] = value === "true" || value === true
        } else if (isNumberSetting(setting)) {
            allSettings[setting] = Number(value)
        } else if (isEnumSetting(setting)) {
            // @ts-expect-error this is properly checked with "checkOption"
            allSettings[setting] = String(value)
        } else if (isStringSetting(setting)) {
            // @ts-expect-error properly checked: is a string, but not an enum
            allSettings[setting] = String(value)
        } else if (isArraySetting(setting)) {
            if (typeof value === "string") {
                try {
                    allSettings[setting] = JSON.parse(value)
                } catch {
                    allSettings[setting] = value.split(",").filter(t => t)
                }
            } else if (Array.isArray(value)) {
                allSettings[setting] = value
            } else {
                notify("Please report a bug, this should never happen",
                    {src, "type": "error"})
            }
        } else if (isObjectSetting(setting)) {
            if (typeof value === "string") {
                try {
                    const parsed = JSON.parse(value)
                    if (Array.isArray(parsed)) {
                        /** @type {{[key: string]: string}} */
                        const element = {}
                        parsed.forEach(el => {
                            const [key, val] = el.split("~")
                            element[key] = val
                        })
                        allSettings[setting] = element
                    } else {
                        allSettings[setting] = parsed
                    }
                } catch {
                    /** @type {{[key: string]: string}} */
                    const element = {}
                    value.split(",").filter(t => t).forEach(el => {
                        const [key, val] = el.split("~")
                        element[key] = val
                    })
                    allSettings[setting] = element
                }
            } else if (Array.isArray(value)) {
                /** @type {{[key: string]: string}} */
                const element = {}
                value.forEach(el => {
                    const [key, val] = el.split("~")
                    element[key] = val
                })
                allSettings[setting] = element
            } else if (typeof value === "object") {
                // @ts-expect-error for some reason setting could be never,
                // the type seems correct, so ignoring seems safe for now.
                allSettings[setting] = value
            } else {
                notify("Please report a bug, this should never happen",
                    {src, "type": "error"})
            }
        }
        if (setting === "mouse") {
            let newval = allSettings.mouse
            if (!mouseFeatures.some(f => !newval.includes(f))) {
                newval = "all"
            }
            if (newval !== "all" && newval.includes("all")) {
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
        if (setting === "containercolors" || setting === "containershowname") {
            updateContainerSettings()
        }
        if (setting === "useragent") {
            if (typeof value === "string") {
                ipcRenderer.sendSync("override-global-useragent",
                    userAgentTemplated(value.split("~")[0]))
            }
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
            currentTab()?.scrollIntoView({"inline": "center"})
            applyLayout()
        }
        if (setting === "mouse" || setting === "mousedisabledbehavior") {
            updateMouseSettings()
        }
        if (setting === "nativetheme") {
            updateNativeTheme()
        }
        if (setting === "pdfbehavior") {
            updatePdfOption()
        }
        if (setting === "spelllang" || setting === "spell") {
            if (allSettings.spell) {
                ipcRenderer.send("set-spelllang", allSettings.spelllang)
            } else {
                ipcRenderer.send("set-spelllang", "")
            }
        }
        if (setting === "requestheaders") {
            updateRequestHeaders()
        }
        if (setting.includes("resource")) {
            ipcRenderer.send("update-resource-settings",
                allSettings.resourcetypes,
                allSettings.resourcesblocked,
                allSettings.resourcesallowed)
        }
        if (setting === "taboverflow") {
            const tabs = document.getElementById("tabs")
            tabs?.classList.remove("scroll")
            tabs?.classList.remove("wrap")
            if (typeof value === "string" && value !== "hidden") {
                tabs?.classList.add(value)
            }
            currentTab()?.scrollIntoView({"inline": "center"})
            applyLayout()
        }
        if (webviewSettings.includes(setting)) {
            updateWebviewSettings()
        }
        if (setting.startsWith("darkreader")) {
            listReadyPages().forEach(p => {
                let scope = "page"
                const specialPage = pathToSpecialPageName(p.src)
                if (specialPage?.name) {
                    scope = "special"
                } else if (p.src.startsWith("file://")) {
                    scope = "file"
                }
                const inScope = allSettings.darkreaderscope.includes(scope)
                if (allSettings.darkreader && inScope) {
                    p.send("enable-darkreader")
                } else {
                    p.send("disable-darkreader")
                }
            })
        }
        if (setting.startsWith("userstyle")) {
            listReadyPages().forEach(p => {
                let scope = "page"
                const specialPage = pathToSpecialPageName(p.src)
                if (specialPage?.name) {
                    scope = "special"
                } else if (p.src.startsWith("file://")) {
                    scope = "file"
                }
                const inScope = allSettings.userstylescope.includes(scope)
                if (allSettings.userstyle && inScope) {
                    p.send("enable-userstyle")
                } else {
                    p.send("disable-userstyle")
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
        updateHelpPage(src)
        return true
    }
    return false
}

/**
 * Load the settings from disk, either as a first run or regular.
 * @param {boolean} firstRun
 * @param {import("./common").RunSource} src
 */
const loadFromDisk = (firstRun, src = "source") => {
    const {pause, resume} = require("./commandhistory")
    pause()
    const config = appConfig()
    const files = config?.files ?? []
    if (firstRun) {
        allSettings = JSON.parse(JSON.stringify(defaultSettings))
        sessionStorage.setItem("settings", JSON.stringify(allSettings))
    }
    if (isFile(joinPath(appData(), "erwicmode"))) {
        /** @type {typeof defaultErwicSettings} */
        const erwicDefaults = JSON.parse(JSON.stringify(defaultErwicSettings))
        Object.keys(erwicDefaults).forEach(t => {
            set(src, t, erwicDefaults[t])
        })
    }
    for (const conf of files) {
        if (isFile(conf)) {
            const parsed = readFile(conf)
            if (!parsed) {
                notify(`Read error for config file located at '${conf}'`,
                    {src, "type": "err"})
                continue
            }
            for (const line of parsed.split("\n").filter(l => l.trim())) {
                if (!line.trim().startsWith("\"")) {
                    const {execute} = require("./command")
                    execute(line, {"settingsFile": conf, src})
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
    updateRequestHeaders()
    updatePdfOption()
    resume()
}

/**
 * Reset a setting to its default value.
 * @param {import("./common").RunSource} src
 * @param {string} setting
 */
const reset = (src, setting) => {
    if (setting === "all") {
        Object.keys(defaultSettings).forEach(
            s => set(src, s, defaultSettings[s]))
    } else if (isExistingSetting(setting)) {
        set(src, setting, defaultSettings[setting])
    } else {
        notify(`The setting '${setting}' doesn't exist`, {src, "type": "warn"})
    }
}

/**
 * Escape value chars as needed.
 * @param {string|number} value
 */
const escapeValueChars = value => {
    if (typeof value === "number") {
        return value
    }
    if (value.match(/(')/g)?.length) {
        return `"${value}"`
    }
    if (value.match(/("| )/g)?.length) {
        return `'${value}'`
    }
    return value
}

/**
 * List all current settings, optionally with defaults included.
 * @param {boolean} full
 */
const listCurrentSettings = (full = false) => {
    /** @type {typeof defaultSettings} */
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
        } else if (Array.isArray(value)) {
            const defaultStringVal = JSON.stringify(defaultSettings[setting])
            if (JSON.stringify(value) !== defaultStringVal) {
                setCommands += `${setting}=\n`
                value.forEach(entry => {
                    setCommands += `${setting}+=${escapeValueChars(entry)}\n`
                })
            }
        } else if (typeof value === "object") {
            const valueString = JSON.stringify(value)
            const defaultStringVal = JSON.stringify(defaultSettings[setting])
            if (valueString !== defaultStringVal) {
                setCommands += `${setting}=${valueString}\n`
            }
        } else {
            setCommands += `${setting}=${escapeValueChars(value)}\n`
        }
    })
    return setCommands
}

/**
 * Save the current settings, mappings, custom commands and colorscheme to disk.
 * @param {import("./common").RunSource} src
 * @param {boolean} full
 */
const saveToDisk = (src, full) => {
    let settingsAsCommands = ""
    const options = listCurrentSettings(full).split("\n").filter(s => s)
        .map(s => `set ${s}`).join("\n").trim()
    const {listMappingsAsCommandList} = require("./input")
    const mappings = listMappingsAsCommandList(src).trim()
    const {customCommandsAsCommandList} = require("./command")
    const commands = customCommandsAsCommandList(full).trim()
    if (!options && !mappings && !commands) {
        notify("There are no options set, no mappings changed and no "
            + "custom commands that have been added, no viebrc written", {src})
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
    const destFile = appConfig()?.config
    if (destFile) {
        writeFile(destFile, settingsAsCommands, {
            "err": `Could not write to '${destFile}'`,
            src,
            "success": `Viebrc saved to '${destFile}'`
        })
    } else {
        notify("No config location is known, could not write",
            {src, "type": "error"})
    }
}

/** Load the settings from disk and prepare setting-related listeners. */
const init = () => {
    loadFromDisk(true)
    ipcRenderer.invoke("list-spelllangs").then(langs => {
        spelllangs = langs || []
        spelllangs.push("system")
        if (!isValidSetting("source", "spelllang", allSettings.spelllang)) {
            set("source", "spelllang", ["system"])
        }
        ipcRenderer.send("set-spelllang", allSettings.spelllang)
    })
    ipcRenderer.on("set-permission", (
        _, name, value) => set("user", name, value))
    ipcRenderer.on("notify", (_, message, opts) => {
        if (getMouseConf("notification")) {
            if (opts.action?.type === "download-success") {
                /** If a download function is provided, add the right action. */
                opts.action.func = () => ipcRenderer.send(
                    "open-download", opts.action.path)
            }
        }
        notify(message, opts)
    })
    ipcRenderer.on("main-error", (_, ex) => console.error(ex))
    ipcRenderer.send("create-session", `persist:main`,
        allSettings.adblocker, allSettings.cache !== "none")
}

module.exports = {
    defaultSettings,
    freeText,
    getCustomStyling,
    init,
    isArraySetting,
    isEnumSetting,
    isExistingSetting,
    isNumberSetting,
    isObjectSetting,
    isStringSetting,
    listCurrentSettings,
    loadFromDisk,
    mouseFeatures,
    reset,
    saveToDisk,
    set,
    setCustomStyling,
    settingsWithDefaults,
    suggestionList,
    updateContainerSettings,
    updateDownloadSettings,
    updateHelpPage,
    updateWindowTitle,
    validOptions
}
