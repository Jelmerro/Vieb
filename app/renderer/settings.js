/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2025 Jelmer van Arnhem
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
const {argsAsHumanList, validLanguages} = require("../translate")
const {
    appConfig,
    appData,
    expandPath,
    isDir,
    isFile,
    isUrl,
    isValidIntervalValue,
    joinPath,
    notify,
    pathExists,
    pathToSpecialPageName,
    readFile,
    specialChars,
    stringToUrl,
    urlToString,
    userAgentTemplated,
    writeFile,
    writeJSON
} = require("../util")
const {
    currentPage,
    currentTab,
    getMouseConf,
    listPages,
    listReadyPages,
    listTabs,
    tabForPage,
    updateGuiVisibility
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
    /** @type {"all"|"done"|"error"|"none"} */
    "adblockernotifications": "all",
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
    "lang": "en",
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
        "<Ctrl>",
        "<Shift>",
        "<Alt>",
        "<Meta>",
        "<NumLock>",
        "<CapsLock>",
        "<ScrollLock>"
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
    "windowfullscreen": "restore",
    "windowmaximize": "restore",
    "windowposition": "restore",
    "windowsize": "restore",
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
    "adblockernotifications": ["all", "done", "error", "none"],
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
    "lang": validLanguages(),
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
        "jp",
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
    ],
    "windowfullscreen": ["true", "false", "restore"],
    "windowmaximize": ["true", "false", "restore"]
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
            notify({
                "fields": [setting, argsAsHumanList(optionList)],
                "id": "settings.errors.oneof",
                src,
                "type": "warning"
            })
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
        notify({
            "fields": [setting, String(numberRange[0]), String(numberRange[1])],
            "id": "settings.errors.numberRange",
            src,
            "type": "warning"
        })
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
            notify({
                "fields": [suggest],
                "id": "settings.errors.suggestorder.tilde",
                src,
                "type": "warning"
            })
            return false
        }
        const args = suggest.split("~")
        const type = args.shift() ?? ""
        if (!["file", "history", "searchword"].includes(type)) {
            notify({
                "fields": [type],
                "id": "settings.errors.suggestorder.type",
                src,
                "type": "warning"
            })
            return false
        }
        let hasHadCount = false
        let hasHadOrder = false
        for (const arg of args) {
            if (!arg) {
                notify({
                    "id": "settings.errors.suggestorder.empty",
                    src,
                    "type": "warning"
                })
                return false
            }
            const potentialCount = Number(arg)
            if (potentialCount > 0 && potentialCount <= 9000000000000000) {
                if (hasHadCount) {
                    notify({
                        "id": "settings.errors.suggestorder.duplicateCount",
                        src,
                        "type": "warning"
                    })
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
                    notify({
                        "id": "settings.errors.suggestorder.duplicateSort",
                        src,
                        "type": "warning"
                    })
                    return false
                }
                hasHadOrder = true
                continue
            }
            notify({
                "fields": [type, argsAsHumanList(validOrders)],
                "id": "settings.errors.suggestorder.invalidSort",
                src,
                "type": "warning"
            })
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
        const valid = ["none", "session"].includes(value)
            || isValidIntervalValue(value)
        if (!valid) {
            notify({
                "fields": [value],
                "id": "settings.errors.clearhistoryinterval",
                src,
                "type": "warning"
            })
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
            notify({
                "fields": [setting, argsAsHumanList(specialNames)],
                "id": "settings.errors.container.invalidspecial",
                src,
                "type": "warning"
            })
            return false
        }
        const simpleValue = value.replace("%n", "valid").replace(/_/g, "")
        if (simpleValue.match(specialChars)) {
            notify({
                "fields": [setting, value],
                "id": "settings.errors.container.specialchars",
                src,
                "type": "warning"
            })
            return false
        }
    }
    if (setting === "containercolors") {
        if (!Array.isArray(value)) {
            return false
        }
        for (const colorMatch of value) {
            if ((colorMatch.match(/~/g) || []).length !== 1) {
                notify({
                    "fields": [setting, colorMatch],
                    "id": "settings.errors.container.colorSeparator",
                    src,
                    "type": "warning"
                })
                return false
            }
            const [match, color] = colorMatch.split("~")
            try {
                RegExp(match)
            } catch {
                notify({
                    "fields": [match],
                    "id": "settings.errors.container.colorRegex",
                    src,
                    "type": "warning"
                })
                return false
            }
            const {style} = document.createElement("div")
            style.color = "white"
            style.color = color
            if (style.color === "white" && color !== "white" || !color) {
                notify({
                    "fields": [color],
                    "id": "settings.errors.container.colorName",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
    }
    if (setting === "containernames") {
        if (!Array.isArray(value)) {
            return false
        }
        for (const containerMatch of value) {
            if (![1, 2].includes((containerMatch.match(/~/g) || []).length)) {
                notify({
                    "fields": [setting, containerMatch],
                    "id": "settings.errors.container.namesSeparator",
                    src,
                    "type": "warning"
                })
                return false
            }
            const [match, container, newtabParam] = containerMatch.split("~")
            if (newtabParam && newtabParam !== "newtab") {
                notify({
                    "fields": [containerMatch],
                    "id": "settings.errors.container.namesNewtab",
                    src,
                    "type": "warning"
                })
                return false
            }
            try {
                RegExp(match)
            } catch {
                notify({
                    "fields": [match],
                    "id": "settings.errors.container.namesRegex",
                    src,
                    "type": "warning"
                })
                return false
            }
            const simpleValue = container.replace("%n", "valid").replace(/_/g, "")
            if (simpleValue.match(specialChars)) {
                notify({
                    "fields": [setting, simpleValue],
                    "id": "settings.errors.container.specialchars",
                    src,
                    "type": "warning"
                })
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
            notify({
                "fields": [value],
                "id": "settings.errors.darkreader.color",
                src,
                "type": "warning"
            })
            return false
        }
    }
    if (setting === "darkreaderblocklist") {
        if (!Array.isArray(value)) {
            return false
        }
        for (const match of value) {
            try {
                RegExp(match)
            } catch {
                notify({
                    "fields": [setting, match],
                    "id": "settings.errors.darkreader.blocklistRegex",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
    }
    const scopeConf = ["darkreaderscope", "userscriptscope", "userstylescope"]
    if (scopeConf.includes(setting)) {
        if (!Array.isArray(value)) {
            return false
        }
        for (const match of value) {
            if (!["file", "page", "special"].includes(match)) {
                notify({
                    "fields": [match, setting],
                    "id": "settings.errors.invalidScope",
                    src,
                    "type": "warning"
                })
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
            notify({
                "fields": [expandedPath],
                "id": "settings.errors.downloadpathMissing",
                src,
                "type": "warning"
            })
            return false
        }
        if (value && !isDir(expandedPath)) {
            notify({
                "fields": [expandedPath],
                "id": "settings.errors.downloadpathIsFolder",
                src,
                "type": "warning"
            })
            return false
        }
    }
    if (setting === "favoritepages") {
        if (!Array.isArray(value)) {
            return false
        }
        for (const page of value) {
            if (!isUrl(page)) {
                notify({
                    "fields": [page],
                    "id": "settings.errors.favoritepages",
                    src,
                    "type": "warning"
                })
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
            notify({
                "fields": [value],
                "id": "settings.errors.followchars.invalidSet",
                src,
                "type": "warning"
            })
            return false
        }
        if (value.startsWith("custom:")) {
            const chars = value.replace("custom:", "").split("")
            if (chars.length < 2) {
                notify({
                    "id": "settings.errors.followchars.notEnough",
                    src,
                    "type": "warning"
                })
                return false
            }
            if (new Set(chars).size < chars.length) {
                notify({
                    "id": "settings.errors.followchars.duplicate",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
    }
    if (setting.startsWith("followelement")) {
        if (!Array.isArray(value)) {
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
        for (const element of value) {
            if (!ok.includes(element)) {
                notify({
                    "fields": [element, argsAsHumanList(ok)],
                    "id": "settings.errors.followelement",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
    }
    const {keyNames, splitMapString} = require("./input")
    if (setting === "modifiers") {
        if (!Array.isArray(value)) {
            return false
        }
        for (const name of value) {
            if (name.length > 1) {
                if (!keyNames.some(l => l.vim.map(k => `<${k}>`).includes(name))
                    || name === "<Any>") {
                    notify({
                        "fields": [name],
                        "id": "settings.errors.modifiers",
                        src,
                        "type": "warning"
                    })
                    return false
                }
            }
        }
    }
    if (setting === "mouse") {
        if (!Array.isArray(value)) {
            return false
        }
        const invalid = value.find(
            m => !mouseFeatures.includes(m) && m !== "all")
        if (invalid) {
            notify({
                "fields": [invalid],
                "id": "settings.errors.mouseFeature",
                src,
                "type": "warning"
            })
            return false
        }
    }
    if (setting === "newtaburl") {
        if (typeof value !== "string") {
            return false
        }
        if (value && !isUrl(stringToUrl(value).replace(/^https?:\/\//g, ""))) {
            notify({
                "fields": [value],
                "id": "settings.errors.newtaburl",
                src,
                "type": "warning"
            })
            return false
        }
    }
    if (setting === "passthroughkeys") {
        if (typeof value !== "object" || Array.isArray(value)) {
            return false
        }
        for (const val of Object.keys(value)) {
            try {
                RegExp(val)
            } catch {
                notify({
                    "fields": [val],
                    "id": "settings.errors.passthrough.regex",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
        for (const val of Object.values(value)) {
            const {maps, valid} = splitMapString(val)
            if (!valid) {
                notify({
                    "fields": [val],
                    "id": "settings.errors.passthrough.keys",
                    src,
                    "type": "warning"
                })
                return false
            }
            for (let name of maps) {
                if (name.length === 1) {
                    continue
                }
                if (name.startsWith("<") && name.endsWith(">")) {
                    name = name.slice(1, -1)
                } else {
                    notify({
                        "fields": [name],
                        "id": "settings.errors.passthrough.keyname",
                        src,
                        "type": "warning"
                    })
                    return false
                }
                if (!keyNames.some(key => key.vim.includes(name))) {
                    notify({
                        "fields": [name],
                        "id": "settings.errors.passthrough.keyname",
                        src,
                        "type": "warning"
                    })
                    return false
                }
            }
        }
        return true
    }
    const permissionSettings = [
        "permissionsallowed", "permissionsasked", "permissionsblocked"
    ]
    if (permissionSettings.includes(setting)) {
        if (!Array.isArray(value)) {
            return false
        }
        for (const override of value) {
            if ((override.match(/~/g) || []).length === 0) {
                notify({
                    "fields": [setting, override],
                    "id": "settings.errors.permission.separator",
                    src,
                    "type": "warning"
                })
                return false
            }
            const [match, ...names] = override.split("~")
            try {
                RegExp(match)
            } catch {
                notify({
                    "fields": [match],
                    "id": "settings.errors.permission.regex",
                    src,
                    "type": "warning"
                })
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
                    notify({
                        "fields": [name],
                        "id": "settings.errors.permission.name",
                        src,
                        "type": "warning"
                    })
                    return false
                }
                if (setting.endsWith("asked") && name.endsWith("hid")) {
                    notify({
                        "id": "settings.errors.permission.hidasked",
                        src,
                        "type": "warning"
                    })
                    return false
                }
                if (setting.endsWith("asked") && name.endsWith("usb")) {
                    notify({
                        "id": "settings.errors.permission.usbasked",
                        src,
                        "type": "warning"
                    })
                    return false
                }
                if (setting.endsWith("asked") && name.endsWith("serial")) {
                    notify({
                        "id": "settings.errors.permission.serialasked",
                        src,
                        "type": "warning"
                    })
                    return false
                }
                if (setting.endsWith("asked") && name.endsWith("ediadevices")) {
                    notify({
                        "id": "settings.errors.permission.mediadevicesasked",
                        src,
                        "type": "warning"
                    })
                    return false
                }
                if (setting.endsWith("allowed") && name.endsWith("capture")) {
                    notify({
                        "id": "settings.errors.permission.captureallowed",
                        src,
                        "type": "warning"
                    })
                    return false
                }
            }
        }
    }
    if (setting === "quickmarkpersistence" && value !== "") {
        if (!Array.isArray(value)) {
            return false
        }
        for (const mType of value) {
            if (!["marks", "pointer", "scroll"].includes(mType)) {
                notify({
                    "fields": [mType],
                    "id": "settings.errors.markpersistencetype",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
    }
    if (setting === "redirects") {
        if (!Array.isArray(value)) {
            return false
        }
        for (const redirect of value) {
            if ((redirect.match(/~/g) || []).length !== 1) {
                notify({
                    "fields": [redirect],
                    "id": "settings.errors.redirect.separator",
                    src,
                    "type": "warning"
                })
                return false
            }
            const [match] = redirect.split("~")
            try {
                RegExp(match)
            } catch {
                notify({
                    "fields": [match],
                    "id": "settings.errors.redirect.regex",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
    }
    if (["resourcesallowed", "resourcesblocked"].includes(setting)) {
        if (!Array.isArray(value)) {
            return false
        }
        for (const override of value) {
            const [match, ...names] = override.split("~")
            try {
                RegExp(match)
            } catch {
                notify({
                    "fields": [setting, match],
                    "id": "settings.errors.resources.regex",
                    src,
                    "type": "warning"
                })
                return false
            }
            for (const name of names) {
                const supported = defaultSettings.resourcetypes
                if (!supported.includes(name)) {
                    notify({
                        "fields": [setting, name],
                        "id": "settings.errors.resources.type",
                        src,
                        "type": "warning"
                    })
                    return false
                }
            }
        }
    }
    if (setting === "resourcetypes" && value !== "") {
        if (!Array.isArray(value)) {
            return false
        }
        for (const rsrc of value) {
            if (!defaultSettings.resourcetypes.includes(rsrc)) {
                notify({
                    "fields": [setting, rsrc],
                    "id": "settings.errors.resources.type",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
    }
    if (setting === "searchengine") {
        if (!Array.isArray(value)) {
            return false
        }
        for (let baseUrl of value) {
            baseUrl = baseUrl.replace(/^https?:\/\//g, "")
            if (baseUrl.length === 0 || !baseUrl.includes("%s")) {
                notify({
                    "fields": [baseUrl],
                    "id": "settings.errors.searchengine.replace",
                    src,
                    "type": "warning"
                })
                return false
            }
            if (!isUrl(baseUrl)) {
                notify({
                    "fields": [baseUrl],
                    "id": "settings.errors.searchengine.url",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
    }
    if (setting === "searchwords") {
        if (typeof value !== "object" || Array.isArray(value)) {
            return false
        }
        /** @type {string[]} */
        const knownSearchwords = []
        for (const searchword of Object.entries(value)) {
            const [keyword, url] = searchword
            const simpleKeyword = keyword.replace(/_/g, "")
            if (keyword.length === 0 || simpleKeyword.match(specialChars)) {
                notify({
                    "fields": [searchword.join("~")],
                    "id": "settings.errors.searchwords.separator",
                    src,
                    "type": "warning"
                })
                return false
            }
            if (url.length === 0 || !url.includes("%s")) {
                notify({
                    "fields": [searchword.join("~")],
                    "id": "settings.errors.searchwords.separator",
                    src,
                    "type": "warning"
                })
                return false
            }
            if (knownSearchwords.includes(keyword)) {
                notify({
                    "fields": [searchword.join("~"), keyword],
                    "id": "settings.errors.searchwords.separator",
                    src,
                    "type": "warning"
                })
                return false
            }
            knownSearchwords.push(keyword)
        }
    }
    if (setting === "spelllang" && value !== "") {
        if (!Array.isArray(value)) {
            return false
        }
        for (const lang of value) {
            if (spelllangs.length && !spelllangs.includes(lang)) {
                notify({
                    "fields": [lang],
                    "id": "settings.errors.spelllang",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
    }
    if (setting === "sponsorblockcategories") {
        if (typeof value !== "object" || Array.isArray(value)) {
            return false
        }
        /** @type {string[]} */
        const knownCategories = []
        const allCategories = Object.keys(
            defaultSettings.sponsorblockcategories)
        for (const catColorPair of Object.entries(value)) {
            const [category, color] = catColorPair
            if (!allCategories.includes(category)) {
                notify({
                    "fields": [category],
                    "id": "settings.errors.sponsorblock.name",
                    src,
                    "type": "warning"
                })
                return false
            }
            const {style} = document.createElement("div")
            style.color = "white"
            style.color = color
            if (color && style.color === "white" && color !== "white") {
                notify({
                    "fields": [color],
                    "id": "settings.errors.sponsorblock.color",
                    src,
                    "type": "warning"
                })
                return false
            }
            if (knownCategories.includes(category)) {
                notify({
                    "fields": [category],
                    "id": "settings.errors.sponsorblock.duplicate",
                    src,
                    "type": "warning"
                })
                return false
            }
            knownCategories.push(category)
        }
    }
    if (setting === "startuppages") {
        if (!Array.isArray(value)) {
            return false
        }
        for (const page of value) {
            const parts = page.split("~")
            const url = parts.shift() ?? ""
            const cname = parts.shift()
            if (!isUrl(url)) {
                notify({
                    "fields": [url],
                    "id": "settings.errors.startuppages.url",
                    src,
                    "type": "warning"
                })
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
                    notify({
                        "fields": [cname],
                        "id": "settings.errors.startuppages.name",
                        src,
                        "type": "warning"
                    })
                    return false
                }
            }
            if (parts.length > 2) {
                notify({
                    "fields": [page],
                    "id": "settings.errors.startuppages.toomany",
                    src,
                    "type": "warning"
                })
                return false
            }
            if (parts[0] && parts[0] !== "muted" && parts[0] !== "pinned") {
                notify({
                    "fields": [parts[0]],
                    "id": "settings.errors.startuppages.invalidopts",
                    src,
                    "type": "warning"
                })
                return false
            }
            if (parts[1] && parts[1] !== "muted" && parts[1] !== "pinned") {
                notify({
                    "fields": [parts[1]],
                    "id": "settings.errors.startuppages.invalidopts",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
    }
    if (setting === "storenewvisits") {
        if (!Array.isArray(value)) {
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
        for (const visitType of value) {
            if (!valid.includes(visitType)) {
                notify({
                    "fields": [visitType, argsAsHumanList(valid)],
                    "id": "settings.errors.storenewvisits",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
    }
    if (setting === "suggestorder") {
        if (!Array.isArray(value)) {
            return false
        }
        return checkSuggestOrder(src, value)
    }
    if (setting === "suspendtimeoutignore") {
        if (!Array.isArray(value)) {
            return false
        }
        for (const ignore of value) {
            const {rangeToTabIdxs} = require("./command")
            if (!rangeToTabIdxs(src, ignore).valid) {
                return false
            }
        }
    }
    if (setting === "tocpages") {
        if (!Array.isArray(value)) {
            return false
        }
        for (const match of value) {
            try {
                RegExp(match)
            } catch {
                notify({
                    "fields": [match],
                    "id": "settings.errors.tocpages",
                    src,
                    "type": "warning"
                })
                return false
            }
        }
    }
    if (setting === "translateurl") {
        if (typeof value !== "string") {
            return false
        }
        if (!isUrl(stringToUrl(value).replace(/^https?:\/\//g, ""))) {
            notify({
                "fields": [value],
                "id": "settings.errors.translateurl",
                src,
                "type": "warning"
            })
            return false
        }
    }
    if (setting === "windowposition" || setting === "windowsize") {
        if (typeof value !== "string") {
            return false
        }
        if (value === "restore" || value === "default") {
            return true
        }
        if (!value.match(/^\d+x\d+$/g)) {
            notify({
                "fields": [setting],
                "id": "settings.errors.windowsize.format",
                src,
                "type": "warning"
            })
            return false
        }
        const nums = value.split("x").map(Number)
        if (setting === "windowsize") {
            if (nums.some(v => v < 500)) {
                notify({
                    "fields": [String(nums.find(v => v < 500))],
                    "id": "settings.errors.windowsize.minimum",
                    src,
                    "type": "warning"
                })
                return false
            }
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
    let expectedType = typeof allSettings[setting]
    if (setting === "mouse") {
        expectedType = "object"
        if (typeof value === "string") {
            expectedType = "string"
        }
    }
    /** @type {string|number|boolean|string[]|{[key: string]: string}} */
    let parsedValue = value
    if (expectedType === "number" && !isNaN(Number(parsedValue))) {
        parsedValue = Number(value)
    }
    if (expectedType === "string") {
        parsedValue = String(value)
    }
    if (expectedType === "boolean") {
        if (["false", "true"].includes(String(parsedValue))) {
            parsedValue = value === "true"
        }
    }
    if (expectedType !== typeof parsedValue) {
        notify({
            "fields": [setting, expectedType, typeof parsedValue],
            "id": "settings.errors.type",
            src,
            "type": "warning"
        })
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

/** Update the settings in the file so they are updated in main/preload. */
const updateSettings = () => {
    const settingsFile = joinPath(appData(), "settings")
    /** @type {{[setting: string]: boolean|number|string|string[]
     *   |{[key: string]: string}}} */
    const data = {
        "bg": document.body.computedStyleMap().get("--bg")?.toString() ?? "",
        "fg": document.body.computedStyleMap().get("--fg")?.toString() ?? "",
        "linkcolor": document.body.computedStyleMap().get(
            "--link-color")?.toString() ?? ""
    }
    Object.keys(allSettings).forEach(setting => {
        data[setting] = allSettings[setting]
    })
    writeJSON(settingsFile, data)
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
        } else if (isObjectSetting(setting) || isArraySetting(setting)
            || isNumberSetting(setting)) {
            listOfSuggestions.push(`${setting}=`)
            listOfSuggestions.push(`${setting}=${
                JSON.stringify(defaultSettings[setting])}`)
            listOfSuggestions.push(`no${setting}`)
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
    const url = urlToString(currentPage()?.src || "")
    ipcRenderer.send("set-window-title", allSettings.windowtitle
        .replace(/%app/g, name).replace(/%title/g, title)
        .replace(/%url/g, url).replace(/%version/g, version))
}

/** Get the custom styling CSS lines. */
const getCustomStyling = () => customStyling

/** Update the custom styling in the webview using colorscheme and fontsize. */
const updateCustomStyling = () => {
    document.body.style.fontSize = `${allSettings.guifontsize}px`
    updateSettings()
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
    if (setting === "windowposition" || setting === "windowsize") {
        allowedValues = "'default', 'restore' or custom value"
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
            const {rangeCompatibleCommands} = require("./command")
            const {
                listMappingsAsCommandList, uncountableActions
            } = require("./input")
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
        } else if (isArraySetting(setting)) {
            if (typeof value === "string") {
                try {
                    allSettings[setting] = JSON.parse(value)
                } catch {
                    allSettings[setting] = value.split(",").filter(t => t)
                }
            } else if (Array.isArray(value)) {
                allSettings[setting] = value
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
            }
        } else if (isStringSetting(setting)) {
            // @ts-expect-error properly checked: is a string, but not an enum
            allSettings[setting] = String(value)
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
        updateSettings()
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
            const {hideScrollbar, showScrollbar} = require("./pagelayout")
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
        updateSettings()
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
                notify({
                    "fields": [conf],
                    "id": "settings.errors.fileload",
                    src,
                    "type": "error"
                })
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
    updateSettings()
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
        notify({
            "fields": [setting],
            "id": "settings.errors.missing",
            src,
            "type": "warning"
        })
    }
}

/**
 * Escape value chars as needed.
 * @param {string|number} value
 */
const escapeValueChars = value => {
    if (typeof value === "string" && value.match(/('|"| )/g)?.length) {
        return JSON.stringify(value)
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
        notify({"id": "settings.errors.unchanged", src})
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
        const success = writeFile(destFile, settingsAsCommands)
        if (success) {
            notify({
                "fields": ["Viebrc", destFile],
                "id": "settings.files.success",
                src,
                "type": "success"
            })
        } else {
            notify({
                "fields": [destFile],
                "id": "settings.files.failed",
                src,
                "type": "error"
            })
        }
    } else {
        notify({"id": "settings.files.missingloc", src, "type": "error"})
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
    ipcRenderer.on("notify", (_, opts) => {
        if (getMouseConf("notification")) {
            if (opts.action?.type === "download-success") {
                /** If a download function is provided, add the right action. */
                opts.action.func = () => ipcRenderer.send(
                    "open-download", opts.action.path)
            }
        }
        notify(opts)
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
