/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2024 Jelmer van Arnhem
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
    notify,
    clearTempContainers,
    clearCache,
    clearCookies,
    clearLocalStorage,
    readFile,
    writeFile,
    deleteFile,
    isDir,
    isFile,
    expandPath,
    isAbsolutePath,
    joinPath,
    downloadPath,
    dirname,
    appData,
    specialPagePath,
    pathToSpecialPageName,
    specialChars,
    specialCharsAllowSpaces,
    appConfig,
    stringToUrl,
    formatDate,
    propPixels,
    readJSON,
    writeJSON,
    domainName,
    urlToString,
    isUrl,
    execCommand,
    intervalValueToDate,
    getSetting,
    isValidIntervalValue,
    getAppRootDir
} = require("../util")
const {
    listTabs,
    currentTab,
    currentPage,
    pageForTab,
    tabForPage,
    listRealPages
} = require("./common")
const {argsAsHumanList, translate} = require("../translate")

/**
 * List a specific setting, all of them or show the warning regarding name.
 * @param {import("./common").RunSource} src
 * @param {keyof typeof import("./settings").defaultSettings|"all"} setting
 */
const listSetting = (src, setting) => {
    if (setting === "all") {
        const {listCurrentSettings} = require("./settings")
        notify({
            "fields": [listCurrentSettings(true)],
            "id": "commands.settings.optionsList",
            src
        })
        return
    }
    notify({
        "fields": [setting, JSON.stringify(getSetting(setting))],
        "id": "commands.settings.listSingle",
        src
    })
}

/**
 * Split strings based on separator and merge later parts.
 * @param {string} part
 * @param {string} separator
 */
const splitSettingAndValue = (part, separator) => {
    const [setting] = part.split(separator)
    const value = part.split(separator).slice(1).join(separator)
    return [setting, value]
}

/**
 * Check if a setting name is valid.
 * @param {string} name
 * @returns {name is (keyof typeof import("./settings").defaultSettings|"all")}
 */
const isValidSettingName = name => {
    const {isExistingSetting} = require("./settings")
    return name === "all" || isExistingSetting(name)
}

/**
 * Check if an unknown or any value is an array of strings.
 * @param {unknown|any} value
 * @returns {value is string[]}
 */
const isStringArray = value => Array.isArray(value)
    && value.every(s => typeof s === "string")

/**
 * Check if an unknown or any value is an array of arrays each having strings,
 * at least one, maybe two, but no more.
 * @param {unknown|any} value
 * @returns {value is string[][]}
 */
const isStringArrayArray = value => Array.isArray(value)
    && value.every(a => Array.isArray(a)
        && (a.length === 1 || a.length === 2)
            && a.every(s => typeof s === "string"))

/**
 * Check if an unknown or any value is an object containing only string values.
 * @param {unknown|any} value
 * @returns {value is {[key: string]: string}}
 */
const isStringObject = value => typeof value === "object"
    && Object.values(value).every(s => typeof s === "string")
    && !isStringArray(value)

/**
 * Modifiy a list or a number.
 * @param {import("./common").RunSource} src
 * @param {keyof typeof import("./settings").defaultSettings} setting
 * @param {string} value
 * @param {"append"|"remove"|"special"|"replace"} method
 */
const modifyListOrObject = (src, setting, value, method) => {
    const {set, isArraySetting, isObjectSetting} = require("./settings")
    const isList = isArraySetting(setting)
    const isObject = isObjectSetting(setting)
    const {mouseFeatures} = require("./settings")
    /** @type {{[key: string]: string}|string[]|string[][]} */
    let parsed = {}
    try {
        parsed = JSON.parse(value)
    } catch {
        notify({
            "fields": [setting, value],
            "id": "commands.settings.invalidJSON",
            src,
            "type": "warning"
        })
        return
    }
    if (!isStringArray(parsed)
        && !isStringArrayArray(parsed) && !isStringObject(parsed)) {
        notify({
            "fields": [setting, value],
            "id": "commands.settings.invalidStructure",
            src,
            "type": "warning"
        })
        return
    }
    if (isList) {
        let addition = parsed
        if (isStringObject(addition)) {
            /** @type {string[]} */
            const additionList = []
            Object.entries(addition).forEach(([key, val]) => {
                additionList.push(`${key}~${val}`)
            })
            addition = additionList
        }
        if (isStringArrayArray(addition)) {
            /** @type {string[]} */
            const additionList = []
            addition.forEach(([key, val]) => {
                additionList.push(`${key}~${val}`)
            })
            addition = additionList
        }
        let current = getSetting(setting)
        if (current === "all") {
            current = mouseFeatures
        }
        if (method === "replace") {
            set(src, setting, addition)
        }
        if (method === "append") {
            set(src, setting, [...current, ...addition])
        }
        if (method === "remove") {
            let newValue = current
            for (const entry of addition) {
                newValue = newValue.filter(e => e && e !== entry)
            }
            if (JSON.stringify(newValue) === JSON.stringify(current)) {
                for (const entry of addition) {
                    newValue = newValue.filter(
                        e => e.split("~")[0] !== entry.split("~")[0])
                }
            }
            set(src, setting, newValue)
        }
        if (method === "special") {
            set(src, setting, [...addition, ...current])
        }
    } else if (isObject) {
        let addition = parsed
        if (isStringArray(addition)) {
            /** @type {{[key: string]: string}} */
            const additionObj = {}
            addition.forEach(val => {
                additionObj[val.split("~")[0]] = val
                    .split("~").slice(1).join("~") ?? ""
            })
            addition = additionObj
        }
        if (isStringArrayArray(addition)) {
            /** @type {{[key: string]: string}} */
            const additionObj = {}
            addition.forEach(([key, val]) => {
                additionObj[key] = val ?? ""
            })
            addition = additionObj
        }
        if (method === "replace") {
            set(src, setting, addition)
            return
        }
        const newValue = getSetting(setting)
        if (method === "append") {
            Object.entries(addition).forEach(([key, val]) => {
                newValue[key] = val
            })
        }
        if (method === "remove") {
            Object.entries(addition).forEach(([key]) => {
                delete newValue[key]
            })
        }
        if (method === "special") {
            notify({
                "id": "commands.settings.reserved",
                src,
                "type": "warning"
            })
            return
        }
        set(src, setting, newValue)
    }
}

/**
 * Modifiy a list or a number.
 * @param {import("./common").RunSource} src
 * @param {keyof typeof import("./settings").defaultSettings} setting
 * @param {string} rawValue
 * @param {"append"|"remove"|"special"|"replace"} method
 */
const modifySetting = (src, setting, rawValue, method = "replace") => {
    let value = rawValue
    const {
        set, isNumberSetting, isStringSetting, isArraySetting, isObjectSetting
    } = require("./settings")
    const isNumber = isNumberSetting(setting)
    const isText = isStringSetting(setting)
    const isList = isArraySetting(setting)
    const isObject = isObjectSetting(setting)
    const {mouseFeatures} = require("./settings")
    if ((isList || isObject) && (value.startsWith("{") && value.endsWith("}")
        || value.startsWith("[") && value.endsWith("]"))) {
        modifyListOrObject(src, setting, value, method)
        return
    }
    try {
        value = JSON.parse(rawValue)
        if (typeof value !== "string") {
            value = rawValue
        }
    } catch {
        // Not JSON, this is fine
    }
    if (method === "replace") {
        if (isList) {
            const arr = value.split(",").filter(v => v.trim())
            modifyListOrObject(src, setting, JSON.stringify(arr), method)
            return
        }
        if (isObject) {
            /** @type {{[key: string]: string}} */
            const obj = {}
            const arr = value.split(",").filter(v => v.trim())
            for (const val of arr) {
                obj[val.split("~")[0]] = val
                    .split("~").slice(1).join("~") ?? ""
            }
            modifyListOrObject(src, setting, JSON.stringify(obj), method)
            return
        }
        set(src, setting, value)
        return
    }
    if (!isNumber && !isText && !isList && !isObject) {
        notify({
            "fields": [setting],
            "id": "commands.settings.noModify",
            src,
            "type": "warning"
        })
        return
    }
    if (method === "append") {
        if (isObject) {
            const obj = getSetting(setting)
            obj[value.split("~")[0]] = value
                .split("~").slice(1).join("~") ?? ""
            set(src, setting, obj)
        }
        if (isList) {
            let current = getSetting(setting)
            if (current === "all") {
                current = mouseFeatures
            }
            set(src, setting, [...current, value])
        }
        if (isNumber) {
            set(src, setting, getSetting(setting) + Number(value))
        }
        if (isText) {
            set(src, setting, getSetting(setting) + value)
        }
    }
    if (method === "remove") {
        if (isObject) {
            const obj = getSetting(setting)
            delete obj[value.split("~")[0]]
            set(src, setting, obj)
        }
        if (isList) {
            let current = getSetting(setting)
            if (current === "all") {
                current = mouseFeatures
            }
            let newValue = current.filter(e => e && e !== value)
            if (JSON.stringify(newValue) === JSON.stringify(current)) {
                newValue = current.filter(
                    e => e.split("~")[0] !== value.split("~")[0])
            }
            set(src, setting, newValue)
        }
        if (isNumber) {
            set(src, setting, getSetting(setting) - Number(value))
        }
        if (isText) {
            set(src, setting, String(getSetting(setting)).replace(value, ""))
        }
    }
    if (method === "special") {
        if (isObject) {
            notify({
                "id": "commands.settings.reserved",
                src,
                "type": "warning"
            })
        }
        if (isList) {
            let current = getSetting(setting)
            if (current === "all") {
                current = mouseFeatures
            }
            set(src, setting, [value, ...current])
        }
        if (isNumber) {
            set(src, setting, getSetting(setting) * Number(value))
        }
        if (isText) {
            set(src, setting, value + getSetting(setting))
        }
    }
}

/**
 * Use the set command to list or modify any setting.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const setCommand = (src, args) => {
    if (args.length === 0) {
        const {listCurrentSettings} = require("./settings")
        const allChanges = listCurrentSettings()
        if (allChanges) {
            notify({
                "fields": [allChanges],
                "id": "commands.settings.optionsList",
                src
            })
        } else {
            notify({"id": "commands.settings.noChanges", src})
        }
        return
    }
    for (const part of args) {
        if ((/^\w+\+=/).test(part)) {
            const [setting, value] = splitSettingAndValue(part, "+=")
            if (isValidSettingName(setting) && setting !== "all") {
                modifySetting(src, setting, value, "append")
            } else {
                notify({
                    "fields": [setting],
                    "id": "commands.settings.missing",
                    src,
                    "type": "warning"
                })
            }
        } else if ((/^\w+-=/).test(part)) {
            const [setting, value] = splitSettingAndValue(part, "-=")
            if (isValidSettingName(setting) && setting !== "all") {
                modifySetting(src, setting, value, "remove")
            } else {
                notify({
                    "fields": [setting],
                    "id": "commands.settings.missing",
                    src,
                    "type": "warning"
                })
            }
        } else if ((/^\w+\^=/).test(part)) {
            const [setting, value] = splitSettingAndValue(part, "^=")
            if (isValidSettingName(setting) && setting !== "all") {
                modifySetting(src, setting, value, "special")
            } else {
                notify({
                    "fields": [setting],
                    "id": "commands.settings.missing",
                    src,
                    "type": "warning"
                })
            }
        } else if ((/^\w+=/).test(part)) {
            const [setting, value] = splitSettingAndValue(part, "=")
            if (isValidSettingName(setting) && setting !== "all") {
                modifySetting(src, setting, value)
            } else {
                notify({
                    "fields": [setting],
                    "id": "commands.settings.missing",
                    src,
                    "type": "warning"
                })
            }
        } else if ((/^\w+:/).test(part)) {
            const [setting, value] = splitSettingAndValue(part, ":")
            if (isValidSettingName(setting) && setting !== "all") {
                modifySetting(src, setting, value)
            } else {
                notify({
                    "fields": [setting],
                    "id": "commands.settings.missing",
                    src,
                    "type": "warning"
                })
            }
        } else if ((/^\w+!.+/).test(part)) {
            const [setting] = part.split("!")
            const values = part.split("!").slice(1).join("!").split("|")
            if (isValidSettingName(setting) && setting !== "all") {
                const index = values.indexOf(String(getSetting(setting)))
                modifySetting(src,
                    setting, values[index + 1] || values[0])
            } else {
                notify({
                    "fields": [setting],
                    "id": "commands.settings.missing",
                    src,
                    "type": "warning"
                })
            }
        } else if (part.endsWith("!")) {
            const setting = part.slice(0, -1)
            if (isValidSettingName(setting) && setting !== "all") {
                const value = getSetting(setting)
                const {isEnumSetting, validOptions} = require("./settings")
                if (["boolean", "undefined"].includes(typeof value)) {
                    modifySetting(src, setting, String(!value))
                } else if (isEnumSetting(setting)) {
                    const index = validOptions[setting].indexOf(String(value))
                    modifySetting(src, setting,
                        validOptions[setting][index + 1]
                        || validOptions[setting][0])
                } else {
                    notify({
                        "fields": [setting],
                        "id": "commands.settings.noFlipping",
                        src,
                        "type": "warning"
                    })
                }
            } else {
                notify({
                    "fields": [setting],
                    "id": "commands.settings.missing",
                    src,
                    "type": "warning"
                })
            }
        } else if (part.endsWith("&")) {
            const {reset} = require("./settings")
            reset(src, part.slice(0, -1))
        } else if (part.endsWith("?")) {
            const settingName = part.slice(0, -1)
            if (isValidSettingName(settingName)) {
                listSetting(src, settingName)
            } else {
                notify({
                    "fields": [settingName],
                    "id": "commands.settings.missing",
                    src,
                    "type": "warning"
                })
            }
        } else if (isValidSettingName(part) && part !== "all"
            && typeof getSetting(part) === "boolean") {
            modifySetting(src, part, "true")
        } else if (part.startsWith("inv")) {
            const settingName = part.replace("inv", "")
            if (isValidSettingName(settingName) && settingName !== "all") {
                const value = getSetting(settingName)
                if (typeof value === "boolean") {
                    modifySetting(src, settingName, String(!value))
                } else {
                    notify({
                        "fields": [settingName],
                        "id": "commands.settings.noFlipping",
                        src,
                        "type": "warning"
                    })
                }
            } else if (isValidSettingName(part)) {
                listSetting(src, part)
            } else {
                notify({
                    "fields": [part],
                    "id": "commands.settings.missing",
                    src,
                    "type": "warning"
                })
            }
        } else if (part.startsWith("no")) {
            const settingName = part.replace("no", "")
            if (isValidSettingName(settingName) && settingName !== "all") {
                const value = getSetting(settingName)
                const {
                    isArraySetting, isObjectSetting, isNumberSetting
                } = require("./settings")
                if (typeof value === "boolean") {
                    modifySetting(src, settingName, "false")
                } else if (isArraySetting(settingName)) {
                    modifySetting(src, settingName, "")
                } else if (isObjectSetting(settingName)) {
                    modifySetting(src, settingName, "")
                } else if (isNumberSetting(settingName)) {
                    modifySetting(src, settingName, "0")
                } else {
                    listSetting(src, settingName)
                }
            } else if (isValidSettingName(part)) {
                listSetting(src, part)
            } else {
                notify({
                    "fields": [part],
                    "id": "commands.settings.missing",
                    src,
                    "type": "warning"
                })
            }
        } else if (isValidSettingName(part)) {
            listSetting(src, part)
        } else {
            notify({
                "fields": [part],
                "id": "commands.settings.missing",
                src,
                "type": "warning"
            })
        }
    }
}

/** @type {string[]} */
const sourcedFiles = []

/**
 * Source a specific viebrc file.
 * @param {import("./common").RunSource} src
 * @param {string|null} origin
 * @param {string[]} args
 */
const source = (src, origin, args) => {
    if (args.length !== 1) {
        notify({"id": "commands.source.argCount", src, "type": "warning"})
        return
    }
    let [absFile] = args
    absFile = expandPath(absFile)
    if (!isAbsolutePath(absFile)) {
        if (origin) {
            absFile = joinPath(dirname(origin), absFile)
        } else {
            notify({"id": "commands.source.absolute", src, "type": "error"})
            return
        }
    }
    if (absFile === origin) {
        notify({"id": "commands.source.recursive", src, "type": "error"})
        return
    }
    if ([
        appConfig()?.override, ...appConfig()?.files ?? []
    ].includes(absFile)) {
        notify({"id": "commands.source.startup", src, "type": "error"})
        return
    }
    if (!isFile(absFile)) {
        notify({
            "fields": [absFile],
            "id": "commands.source.missing",
            src,
            "type": "error"
        })
        return
    }
    const parsed = readFile(absFile)
    if (!parsed) {
        notify({
            "fields": [absFile],
            "id": "commands.source.readError",
            src,
            "type": "error"
        })
        return
    }
    if (origin) {
        sourcedFiles.push(absFile)
    }
    for (const line of parsed.split("\n")) {
        if (line && !line.trim().startsWith("\"")) {
            /* eslint-disable-next-line no-use-before-define */
            execute(line, {"settingsFile": absFile, "src": "source"})
        }
    }
}

/**
 * Translate a search based range to a list of tab idxs.
 * @param {import("./common").RunSource} src
 * @param {string} range
 * @param {boolean} silent
 */
const translateSearchRangeToIdx = (src, range, silent) => {
    const [flags] = range.split("/")
    const allFlags = "giaszrtupn".split("")
    if (!flags.split("").every(f => allFlags.includes(f))) {
        if (!silent) {
            notify({
                "fields": [range],
                "id": "commands.ranges.flags",
                src,
                "type": "warning"
            })
        }
        return {"tabs": [], "valid": false}
    }
    let search = range.split("/").slice(1, -1).join("/")
    const ids = listTabs().map((t, i) => ({
        "audio": !!t.getAttribute("media-playing"),
        "idx": i,
        "name": t.querySelector("span")?.textContent,
        "pinned": t.classList.contains("pinned"),
        "suspended": !!t.getAttribute("suspended"),
        "url": pageForTab(t)?.getAttribute("src")
    })).filter(t => {
        let name = String(t.name)
        let url = String(t.url)
        if (flags.includes("i")) {
            search = search.toLowerCase()
            name = name.toLowerCase()
            url = url.toLowerCase()
        }
        if (flags.includes("a") && !t.audio) {
            return false
        }
        if (flags.includes("s") && t.audio) {
            return false
        }
        if (flags.includes("z") && !t.suspended) {
            return false
        }
        if (flags.includes("r") && t.suspended) {
            return false
        }
        if (flags.includes("p") && !t.pinned) {
            return false
        }
        if (flags.includes("n") && t.pinned) {
            return false
        }
        if (flags.includes("t") && !flags.includes("u")) {
            return name.includes(search)
        }
        if (flags.includes("u") && !flags.includes("t")) {
            return url.includes(search)
        }
        return name.includes(search) || url.includes(search)
    }).map(t => t.idx)
    return {"tabs": ids, "valid": true}
}

/**
 * Translate a partial range arg to tab index based on mathematical operations.
 * @param {import("./common").RunSource} src
 * @param {number} start
 * @param {string} rangePart
 * @param {boolean} silent
 */
const translateRangePosToIdx = (src, start, rangePart, silent) => {
    const [, plus] = rangePart.split("/").pop()?.split("+") ?? ["", ""]
    const [, minus] = rangePart.split("/").pop()?.split("-") ?? ["", ""]
    /** @type {(string | number)[]} */
    let [charOrNum] = rangePart.split(/[-+]/g)
    if (rangePart.split("/").length > 2) {
        const searchResult = translateSearchRangeToIdx(src, rangePart, silent)
        ;[charOrNum] = searchResult.tabs.filter(i => i >= start)
        if (typeof charOrNum !== "number" || !searchResult.valid) {
            return {"num": NaN, "valid": searchResult.valid}
        }
    }
    let number = Number(charOrNum)
    if (charOrNum === "^") {
        number = 0
    }
    let currentTabIdx = 0
    const tab = currentTab()
    if (tab) {
        currentTabIdx = listTabs().indexOf(tab)
    }
    if (charOrNum === ".") {
        number = currentTabIdx
    }
    if (charOrNum === "$") {
        number = listTabs().length - 1
    }
    if (plus) {
        if (charOrNum || rangePart.split("/").length > 2) {
            number += Number(plus)
        } else {
            number = currentTabIdx + Number(plus)
        }
    }
    if (minus) {
        if (charOrNum || rangePart.split("/").length > 2) {
            number -= Number(minus)
        } else {
            number = currentTabIdx - Number(minus)
        }
    }
    const valid = !isNaN(number)
    if (!valid && !silent) {
        notify({
            "fields": [rangePart],
            "id": "commands.ranges.indexOrSearch",
            src,
            "type": "warning"
        })
    }
    return {"num": number, valid}
}

/**
 * Get the tab indices for a given range.
 * @param {import("./common").RunSource} src
 * @param {string} range
 * @param {boolean} silent
 */
const rangeToTabIdxs = (src, range, silent = false) => {
    if (range === "%") {
        return {"tabs": listTabs().map((_, i) => i), "valid": true}
    }
    if (range.includes(",")) {
        const [start, end, tooManyArgs] = range.split(",")
        if (tooManyArgs !== undefined) {
            if (!silent) {
                notify({
                    "fields": [range],
                    "id": "commands.ranges.commas",
                    src,
                    "type": "warning"
                })
            }
            return {"tabs": [], "valid": false}
        }
        if (start.match(/^.*g.*\/.*\/[-+]?\d?$/) || end.match(/^.*g.*\/.*\/[-+]?\d?$/)) {
            if (!silent) {
                notify({
                    "fields": [range],
                    "id": "commands.ranges.combined",
                    src,
                    "type": "warning"
                })
            }
            return {"tabs": [], "valid": false}
        }
        const startPos = translateRangePosToIdx(src, 0, start, silent)
        if (!startPos.valid) {
            if (!silent) {
                notify({
                    "fields": [start],
                    "id": "commands.ranges.invalid",
                    src,
                    "type": "warning"
                })
            }
            return {"tabs": [], "valid": false}
        }
        const endPos = translateRangePosToIdx(src, startPos.num, end, silent)
        if (!endPos.valid) {
            if (!silent) {
                notify({
                    "fields": [end],
                    "id": "commands.ranges.invalid",
                    src,
                    "type": "warning"
                })
            }
            return {"tabs": [], "valid": false}
        }
        return {
            "tabs": listTabs().map((_, i) => i).slice(
                startPos.num, endPos.num + 1),
            "valid": true
        }
    }
    if (range.split("/").length > 2) {
        const flags = range.split("/")[0].split("")
        if (flags.includes("g")) {
            return translateSearchRangeToIdx(src, range, silent)
        }
    }
    const result = translateRangePosToIdx(src, 0, range, silent)
    if (result.valid) {
        return {"tabs": [result.num], "valid": true}
    }
    return {"tabs": [], "valid": false}
}

/**
 * Get all tabs for a given buffer argument.
 * @param {string[]|[number]} args
 * @param {((tab: HTMLElement) => boolean)|null} filter
 */
const allTabsForBufferArg = (args, filter = null) => {
    if (args.length === 1 || typeof args === "number") {
        let number = Number(args[0] || args)
        if (!isNaN(number)) {
            const tabs = listTabs()
            if (number >= tabs.length) {
                const tab = tabs.pop()
                if (tab) {
                    return [{
                        tab,
                        "title": tab.querySelector("span")?.textContent ?? "",
                        "url": pageForTab(tab)?.getAttribute("src") ?? ""
                    }]
                }
            }
            if (number < 0) {
                number += tabs.length
            }
            const tab = tabs[number] ?? tabs[0]
            return [{
                tab,
                "title": tab.querySelector("span")?.textContent ?? "",
                "url": pageForTab(tab)?.getAttribute("src") ?? ""
            }]
        }
        if ((args[0] || args) === "#") {
            const {getLastTabIds} = require("./pagelayout")
            const currentTabIdx = currentTab()?.getAttribute("link-id")
            const tabs = listTabs()
            const lastTab = getLastTabIds().map(id => {
                const tab = tabs.find(t => t.getAttribute("link-id") === id)
                if (tab?.getAttribute("link-id") === currentTabIdx) {
                    return null
                }
                return tab
            }).find(t => t) ?? currentTab()
            const tab = lastTab ?? listTabs()[0]
            return [{
                tab,
                "title": tab.querySelector("span")?.textContent ?? "",
                "url": pageForTab(tab)?.getAttribute("src") ?? ""
            }]
        }
    }
    const {getSimpleName, getSimpleUrl} = require("./history")
    /**
     * Checks if all words appear somewhere in the simple url.
     * @param {string[]} search
     * @param {string} simpleUrl
     * @param {string} name
     */
    const allWordsAnywhere = (search, simpleUrl, name) => search.every(
        w => simpleUrl.includes(w) || getSimpleName(name).includes(w))

    const simpleSearch = args.join(" ").split(specialChars).filter(w => w)
    return listTabs().filter(t => !filter || filter(t)).map(t => {
        const url = pageForTab(t)?.getAttribute("src") ?? ""
        const simpleUrl = getSimpleUrl(url)
        const name = t.querySelector("span")?.textContent ?? ""
        let relevance = 1
        if (simpleSearch.every(w => simpleUrl.includes(w))) {
            relevance = 5
        }
        if (url.toLowerCase().includes(args.join(""))) {
            relevance *= 10
        }
        if (relevance > 1 || allWordsAnywhere(simpleSearch, simpleUrl, name)) {
            return {"tab": t, "title": name, "top": relevance, url}
        }
        return null
    }).filter(h => h).sort((a, b) => (b?.top ?? 0) - (a?.top ?? 0))
}

/**
 * Get a tab for a given buffer argument.
 * @param {string[]} args
 * @param {((tab: HTMLElement) => boolean)|null} filter
 */
const tabForBufferArg = (args, filter = null) => {
    const tabs = allTabsForBufferArg(args, filter)
    if (tabs[0]) {
        return tabs[0].tab ?? null
    }
    return null
}

/** Quit the entire app entirely, including all quit settings and cleanup. */
const quitall = () => {
    ipcRenderer.send("hide-window")
    const keepQuickmarkNames = getSetting("quickmarkpersistence")
    const clearMark = ["scroll", "marks", "pointer"]
        .filter(t => !keepQuickmarkNames.includes(t))
    const qm = readJSON(joinPath(appData(), "quickmarks")) ?? {}
    for (const markType of clearMark) {
        delete qm[markType]
    }
    if (Object.keys(qm).length > 0) {
        writeJSON(joinPath(appData(), "quickmarks"), qm)
    } else {
        deleteFile(joinPath(appData(), "quickmarks"))
    }
    const clearHistory = getSetting("clearhistoryinterval")
    if (clearHistory === "session") {
        deleteFile(joinPath(appData(), "hist"))
    } else if (clearHistory === "none") {
        const {writeHistToFile} = require("./history")
        writeHistToFile(true)
    } else {
        const {removeOldHistory} = require("./history")
        removeOldHistory(intervalValueToDate(clearHistory))
    }
    const {saveTabs} = require("./tabs")
    saveTabs()
    const pagesContainer = document.getElementById("pages")
    if (pagesContainer) {
        pagesContainer.textContent = ""
    }
    clearTempContainers()
    if (getSetting("cache") !== "full") {
        clearCache()
    }
    if (getSetting("clearcookiesonquit")) {
        clearCookies()
    }
    if (getSetting("clearlocalstorageonquit")) {
        clearLocalStorage()
    }
    const {updateMappings} = require("./favicons")
    updateMappings({"now": true})
    ipcRenderer.send("destroy-window")
}

/**
 * Quit the current split, a range of splits or the browser if not using splits.
 * @param {import("./common").RunSource} src
 * @param {string} range
 */
const quit = (src, range) => {
    const {closeTab} = require("./tabs")
    if (range) {
        rangeToTabIdxs(src, range).tabs.forEach(t => closeTab(src, t))
        return
    }
    if (document.getElementById("tabs")?.classList.contains("multiple")) {
        closeTab(src)
    } else {
        quitall()
    }
}

let currentscheme = "default"

/**
 * Set the colorscheme by name or log the current one if no name provided.
 * @param {import("./common").RunSource} src
 * @param {string|null} name
 * @param {string|null} trailingArgs
 */
const colorscheme = (src, name = null, trailingArgs = null) => {
    if (trailingArgs) {
        notify({"id": "commands.colorscheme.argCount", src, "type": "warning"})
        return
    }
    if (!name) {
        notify({
            "fields": [currentscheme],
            "id": "commands.colorscheme.current",
            src
        })
        return
    }
    let css = readFile(expandPath(`~/.vieb/colors/${name}.css`))
    if (!css) {
        css = readFile(joinPath(appData(), `colors/${name}.css`))
    }
    if (!css) {
        css = readFile(joinPath(getAppRootDir(), `colors/${name}.css`))
    }
    if (!css) {
        notify({
            "fields": [name],
            "id": "commands.colorscheme.missing",
            src,
            "type": "warning"
        })
        return
    }
    if (name === "default") {
        css = ""
    }
    if (!document.getElementById("custom-styling")) {
        const styleElement = document.createElement("style")
        styleElement.id = "custom-styling"
        document.head.append(styleElement)
    }
    const customStyle = document.getElementById("custom-styling")
    if (customStyle) {
        customStyle.textContent = css
    }
    ipcRenderer.send("set-custom-styling", getSetting("guifontsize"), css)
    const {setCustomStyling} = require("./settings")
    setCustomStyling(css)
    currentscheme = name
}

/** Quit then reopen the app. */
const restart = () => {
    ipcRenderer.send("relaunch")
    quitall()
}

/**
 * Open the development tools.
 * @param {import("./common").RunSource} src
 * @param {string|null} userPosition
 * @param {string|null} trailingArgs
 */
const openDevTools = (src, userPosition = null, trailingArgs = null) => {
    if (trailingArgs) {
        notify({"id": "commands.devtools.argCount", src, "type": "warning"})
        return
    }
    const position = userPosition || getSetting("devtoolsposition")
    const {addTab} = require("./tabs")
    const {add} = require("./pagelayout")
    if (position === "window") {
        currentPage()?.openDevTools()
    } else if (position === "tab") {
        addTab({"devtools": true, src})
    } else if (position === "vsplit") {
        const id = currentTab()?.getAttribute("link-id")
        if (id) {
            addTab({"devtools": true, src})
            add(id, "hor", getSetting("splitright"))
        }
    } else if (position === "split") {
        const id = currentTab()?.getAttribute("link-id")
        if (id) {
            addTab({"devtools": true, src})
            add(id, "ver", getSetting("splitbelow"))
        }
    } else {
        const valid = argsAsHumanList(["window", "vsplit", "split", "tab"])
        notify({
            "fields": [position, valid],
            "id": "commands.devtools.invalid",
            src,
            "type": "warning"
        })
    }
}

/** Open the internal devtools of the app, not the webview one. */
const openInternalDevTools = () => {
    ipcRenderer.send("open-internal-devtools")
}

/**
 * Open a special page using commands.
 * @param {import("./common").RunSource} src
 * @param {string} specialPage
 * @param {boolean} forceNewtab
 * @param {string|null} section
 */
const openSpecialPage = (src, specialPage, forceNewtab, section = null) => {
    const newSpecialUrl = specialPagePath(specialPage, section)
    const url = currentPage()?.src
    const currentSpecial = pathToSpecialPageName(url ?? "")?.name
    const isNewtab = currentSpecial === "newtab"
        || (url?.replace(/\/+$/g, "") ?? "")
        === stringToUrl(getSetting("newtaburl")).replace(/\/+$/g, "")
    const replaceSpecial = getSetting("replacespecial")
    const {navigateTo, addTab} = require("./tabs")
    if (replaceSpecial === "never" || forceNewtab || !currentPage()) {
        addTab({src, "url": newSpecialUrl})
    } else if (replaceSpecial === "always") {
        navigateTo(src, newSpecialUrl)
    } else if (replaceSpecial === "special" && (currentSpecial || isNewtab)) {
        navigateTo(src, newSpecialUrl)
    } else if (currentSpecial === "newtab" && isNewtab) {
        navigateTo(src, newSpecialUrl)
    } else {
        addTab({src, "url": newSpecialUrl})
    }
}

/**
 * Open the help page at a specific section.
 * @param {import("./common").RunSource} src
 * @param {boolean} forceNewtab
 * @param {string|null} section
 * @param {boolean} trailingArgs
 */
const help = (src, forceNewtab, section = null, trailingArgs = false) => {
    if (trailingArgs) {
        notify({"id": "commands.help.argCount", src, "type": "warning"})
        return
    }
    openSpecialPage(src, "help", forceNewtab, section)
}

/** Source the startup configs again to reload the config. */
const reloadconfig = () => {
    const {loadFromDisk} = require("./settings")
    loadFromDisk(false)
}

/**
 * Make a hardcopy print of a page, optionally for a range of pages.
 * @param {import("./common").RunSource} src
 * @param {string} range
 */
const hardcopy = (src, range) => {
    if (range) {
        rangeToTabIdxs(src, range).tabs.forEach(t => {
            const page = pageForTab(listTabs()[t])
            if (!(page instanceof HTMLDivElement)) {
                page?.send("action", "print")
            }
        })
        return
    }
    currentPage()?.send("action", "print")
}

/**
 * Resolve file arguments to an absolute path with fixed type extension.
 * @param {import("./common").RunSource} src
 * @param {string|null} locationArg
 * @param {string} type
 * @param {Electron.WebviewTag|null} customPage
 */
const resolveFileArg = (src, locationArg, type, customPage = null) => {
    const page = customPage || currentPage()
    const tab = tabForPage(page)
    const name = `${tab?.querySelector("span")?.textContent?.replace(
        specialCharsAllowSpaces, "").trim()}_${formatDate(new Date())
        .replace(/:/g, "-")}`.replace(/\s/g, "_")
    let loc = joinPath(downloadPath(), name)
    if (locationArg) {
        let file = expandPath(locationArg)
        if (!isAbsolutePath(file)) {
            file = joinPath(downloadPath(), file)
        }
        let pathSep = "/"
        if (process.platform === "win32") {
            pathSep = "\\"
        }
        if (locationArg.endsWith("/") || locationArg.endsWith("\\")) {
            file = joinPath(`${file}${pathSep}`, name)
        }
        if (!isDir(dirname(file))) {
            notify({
                "fields": [dirname(file)],
                "id": "commands.arguments.folderMissing",
                src,
                "type": "warning"
            })
            return
        }
        loc = file
    }
    if (!loc.endsWith(`.${type}`)) {
        loc += `.${type}`
    }
    return loc
}

/**
 * Write the html of a page to disk based on tab index or current.
 * @param {import("./common").RunSource} src
 * @param {string|null} customLoc
 * @param {"mhtml"|"html"} extension
 * @param {number|null} tabIdx
 */
const writePage = (src, customLoc, extension, tabIdx = null) => {
    /** @type {Electron.WebviewTag|HTMLDivElement|null} */
    let page = currentPage()
    if (tabIdx !== null) {
        page = pageForTab(listTabs()[tabIdx]) ?? null
    }
    if (!page || page instanceof HTMLDivElement) {
        return
    }
    let type = "HTMLComplete"
    if (extension === "mhtml") {
        type = "MHTML"
    }
    const loc = resolveFileArg(src, customLoc, extension, page)
    if (!loc) {
        return
    }
    const webContentsId = page.getWebContentsId()
    ipcRenderer.invoke("save-page", webContentsId, loc, type).then(() => {
        notify({
            "fields": [loc],
            "id": "commands.write.success",
            src,
            "type": "success"
        })
    }).catch(err => {
        notify({
            "fields": [err],
            "id": "commands.write.failed",
            src,
            "type": "error"
        })
    })
}

/**
 * Write the html of a page to disk, optionally a range of pages at custom loc.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 * @param {string} range
 */
const write = (src, args, range) => {
    if (args.length > 2) {
        notify({"id": "commands.write.argCount", src, "type": "warning"})
        return
    }
    let [path, type = "html"] = args
    if (!["mhtml", "html"].includes(type) || ["mhtml", "html"].includes(path)) {
        [type, path] = args
    }
    if (type !== "html" && type !== "mhtml") {
        notify({
            "fields": [type],
            "id": "commands.write.type",
            src,
            "type": "warning"
        })
        return
    }
    if (range && path) {
        notify({"id": "commands.write.combined", src, "type": "warning"})
        return
    }
    if (range) {
        for (const t of rangeToTabIdxs(src, range).tabs) {
            writePage(src, null, type, t)
        }
        return
    }
    writePage(src, path, type)
}

/**
 * Translate a screen* command argument to valid dims within view.
 * @param {string} dims
 */
const translateDimsToRect = dims => {
    const page = currentPage()
    if (!dims || !page) {
        return
    }
    const rect = {
        "height": Number(dims.split(",")[1]),
        "width": Number(dims.split(",")[0]),
        "x": Number(dims.split(",")[2]),
        "y": Number(dims.split(",")[3])
    }
    const pageWidth = propPixels(page.style, "width")
    const pageHeight = propPixels(page.style, "height")
    if (rect.x > pageWidth) {
        rect.x = pageWidth
    }
    if (rect.y > pageHeight) {
        rect.y = pageHeight
    }
    if (rect.width === 0 || rect.width > pageWidth - rect.x) {
        rect.width = pageWidth - rect.x
    }
    if (rect.height === 0 || rect.height > pageHeight - rect.y) {
        rect.height = pageHeight - rect.y
    }
    return rect
}

/**
 * Copy the current page screen to the clipboard, optionally with custom dims.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const screencopy = (src, args) => {
    if (args.length > 1) {
        notify({"id": "commands.screencopy.argCount", src, "type": "warning"})
        return
    }
    if (args[0] && !args[0].match(/^\d+,\d+,\d+,\d+$/g)) {
        notify({"id": "commands.screencopy.dimensions", src, "type": "warning"})
        return
    }
    if (!currentPage()) {
        return
    }
    const rect = translateDimsToRect(args[0])
    setTimeout(() => {
        currentPage()?.capturePage(rect).then(img => {
            const {nativeImage, clipboard} = require("electron")
            clipboard.writeImage(nativeImage.createFromBuffer(img.toPNG()))
        })
    }, 20)
}

/**
 * Write the actual page to disk based on dims and location.
 * @param {import("./common").RunSource} src
 * @param {string} dims
 * @param {string} location
 */
const takeScreenshot = (src, dims, location) => {
    const rect = translateDimsToRect(dims)
    const loc = resolveFileArg(src, location, "png", currentPage())
    if (!loc) {
        return
    }
    setTimeout(() => {
        currentPage()?.capturePage(rect).then(img => {
            const success = writeFile(loc, img.toPNG())
            if (success) {
                notify({
                    "fields": [loc],
                    "id": "commands.screenshot.success",
                    src,
                    "type": "success"
                })
            } else {
                notify({
                    "fields": [loc],
                    "id": "commands.screenshot.failed",
                    src,
                    "type": "success"
                })
            }
        })
    }, 20)
}

/**
 * Write the current page screen a location, optionally with custom dims.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const screenshot = (src, args) => {
    if (args.length > 2) {
        notify({"id": "commands.screenshot.argCount", src, "type": "warning"})
        return
    }
    let [dims, location] = args
    if (!dims?.match(/^\d+,\d+,\d+,\d+$/g)) {
        [location, dims] = args
    }
    if (dims && !dims.match(/^\d+,\d+,\d+,\d+$/g)) {
        notify({"id": "commands.screenshot.dimensions", src, "type": "warning"})
        return
    }
    takeScreenshot(src, dims, location)
}

/**
 * Make a custom viebrc config based on current settings.
 * @param {import("./common").RunSource} src
 * @param {string|null} full
 * @param {boolean} trailingArgs
 */
const mkviebrc = (src, full = null, trailingArgs = false) => {
    if (trailingArgs) {
        notify({"id": "commands.mkviebrc.argCount", src, "type": "warning"})
        return
    }
    let exportAll = false
    if (full) {
        if (full === "full") {
            exportAll = true
        } else {
            notify({
                "fields": [full],
                "id": "commands.mkviebrc.invalid",
                src,
                "type": "warning"
            })
            return
        }
    }
    const {saveToDisk} = require("./settings")
    saveToDisk(src, exportAll)
}

/**
 * Buffer switch command, switch pages based on arguments.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const buffer = (src, args) => {
    if (args.length === 0) {
        return
    }
    const tab = tabForBufferArg(args)
    if (tab) {
        const {switchToTab} = require("./tabs")
        switchToTab(tab)
    } else {
        const {navigateTo} = require("./tabs")
        navigateTo(src, stringToUrl(args.join(" ")))
    }
}

/**
 * List all the buffers currently opened by tab index.
 * @param {import("./common").RunSource} src
 */
const buffers = src => {
    const output = listTabs().map((tab, index) => {
        const page = pageForTab(tab)
        if (!page) {
            return `${index}: `
        }
        return `${index}: ${urlToString(page.getAttribute("src") ?? "")}`
    }).join("\n")
    notify({"fields": [output], "id": "commands.buffers", src})
}

/**
 * Open command, navigate to a url by argument, mostly useful for mappings.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const open = (src, args) => {
    if (args.length === 0) {
        return
    }
    const {navigateTo} = require("./tabs")
    navigateTo(src, stringToUrl(args.join(" ")))
}

/**
 * Suspend a page or a range of pages.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 * @param {string|null} range
 */
const suspend = (src, args, range = null) => {
    if (range && args.length) {
        notify({"id": "commands.suspend.range", src, "type": "warning"})
        return
    }
    if (range) {
        rangeToTabIdxs(src, range).tabs.forEach(t => suspend(src, [`${t}`]))
        return
    }
    let tab = null
    if (args.length === 0) {
        tab = currentTab()
    } else {
        tab = tabForBufferArg(args, t => !t.classList.contains("visible-tab")
                && !t.getAttribute("suspended"))
    }
    if (tab) {
        if (tab.classList.contains("visible-tab")) {
            notify({"id": "commands.suspend.visible", src, "type": "warning"})
        } else {
            const {suspendTab} = require("./tabs")
            suspendTab(src, tab)
        }
    }
}

/**
 * Hide a page or a range of pages.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 * @param {string|null} range
 */
const hideCommand = (src, args, range = null) => {
    if (range && args.length) {
        notify({"id": "commands.hide.range", src, "type": "warning"})
        return
    }
    if (range) {
        rangeToTabIdxs(src, range).tabs.forEach(t => hideCommand(src, [`${t}`]))
        return
    }
    let tab = null
    if (args.length === 0) {
        tab = currentTab()
    } else {
        tab = tabForBufferArg(args, t => t.classList.contains("visible-tab"))
    }
    if (tab) {
        if (tab.classList.contains("visible-tab")) {
            const {hide} = require("./pagelayout")
            const page = pageForTab(tab)
            if (page) {
                hide(page)
            }
        } else {
            notify({"id": "commands.hide.visible", src, "type": "warning"})
        }
    }
}

/**
 * Mute a page or a range of pages.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 * @param {string} range
 */
const setMute = (src, args, range) => {
    if (args.length !== 1 || !["true", "false"].includes(args[0])) {
        notify({"id": "commands.mute.argCount", src, "type": "warning"})
        return
    }
    let targets = [currentTab()]
    if (range) {
        const tabs = listTabs()
        targets = rangeToTabIdxs(src, range).tabs.map(id => tabs[id])
    }
    targets.forEach(tab => {
        if (args[0] === "true") {
            tab?.setAttribute("muted", "muted")
        } else {
            tab?.removeAttribute("muted")
        }
        const page = pageForTab(tab)
        if (page && !(page instanceof HTMLDivElement)) {
            page.setAudioMuted(!!tab?.getAttribute("muted"))
        }
    })
    const {saveTabs} = require("./tabs")
    saveTabs()
}

/**
 * Toggle mute for a page or a range of pages.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 * @param {string|null} range
 */
const mute = (src, args, range = null) => {
    if (range && args.length) {
        notify({"id": "commands.mute.range", src, "type": "warning"})
        return
    }
    if (range) {
        rangeToTabIdxs(src, range).tabs.forEach(t => mute(src, [`${t}`]))
        return
    }
    let tab = currentTab()
    if (args.length > 0) {
        tab = tabForBufferArg(args)
    }
    if (!tab) {
        notify({"id": "commands.mute.noMatch", src, "type": "warning"})
        return
    }
    if (tab.getAttribute("muted")) {
        tab.removeAttribute("muted")
    } else {
        tab.setAttribute("muted", "muted")
    }
    const page = pageForTab(tab)
    if (page && !(page instanceof HTMLDivElement)) {
        page.setAudioMuted(!!tab.getAttribute("muted"))
    }
    const {saveTabs} = require("./tabs")
    saveTabs()
}

/**
 * Set the pin state for a tab or a range of tabs.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 * @param {string} range
 */
const setPin = (src, args, range) => {
    if (args.length !== 1 || !["true", "false"].includes(args[0])) {
        notify({"id": "commands.pin.argCount", src, "type": "warning"})
        return
    }
    let targets = [currentTab()]
    const tabs = listTabs()
    if (range) {
        targets = rangeToTabIdxs(src, range).tabs.map(id => tabs[id])
    }
    const firstUnpinned = tabs.find(t => !t.classList.contains("pinned"))
    targets.forEach(tab => {
        const tabContainer = document.getElementById("tabs")
        if (args[0] === "true") {
            if (tab && !tab.classList.contains("pinned")) {
                tabContainer?.insertBefore(tab,
                    tabs.find(t => !t.classList.contains("pinned")) ?? null)
                tab.classList.add("pinned")
            }
        } else if (tab && tab?.classList.contains("pinned")) {
            tabContainer?.insertBefore(tab, firstUnpinned ?? null)
            tab.classList.remove("pinned")
        }
    })
    const {saveTabs} = require("./tabs")
    saveTabs()
}

/**
 * Toggle the pin state for a tab or a range of tabs.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 * @param {string} range
 */
const pin = (src, args, range) => {
    if (range && args.length) {
        notify({"id": "commands.pin.range", src, "type": "warning"})
        return
    }
    if (range) {
        const tabs = listTabs()
        const tabContainer = document.getElementById("tabs")
        const firstUnpinned = tabs.find(t => !t.classList.contains("pinned"))
        rangeToTabIdxs(src, range).tabs.map(id => tabs[id]).forEach(target => {
            if (target.classList.contains("pinned")) {
                tabContainer?.insertBefore(target, firstUnpinned ?? null)
                target.classList.remove("pinned")
            } else {
                tabContainer?.insertBefore(target,
                    tabs.find(t => !t.classList.contains("pinned")) ?? null)
                target.classList.add("pinned")
            }
        })
        return
    }
    let tab = currentTab()
    if (args.length > 0) {
        tab = tabForBufferArg(args, t => !t.getAttribute("suspended"))
    }
    if (!tab) {
        notify({"id": "commands.pin.noMatch", src, "type": "warning"})
        return
    }
    const tabContainer = document.getElementById("tabs")
    const tabs = listTabs()
    const firstUnpinned = tabs.find(t => !t.classList.contains("pinned"))
    if (tab.classList.contains("pinned")) {
        tabContainer?.insertBefore(tab, firstUnpinned ?? null)
        tab.classList.remove("pinned")
    } else {
        tabContainer?.insertBefore(tab,
            tabs.find(t => !t.classList.contains("pinned")) ?? null)
        tab.classList.add("pinned")
    }
    const {saveTabs} = require("./tabs")
    saveTabs()
}

/**
 * Add a split to the page layout.
 * @param {import("./common").RunSource} src
 * @param {"hor"|"ver"} method
 * @param {boolean} leftOrAbove
 * @param {string[]} args
 * @param {string|null} range
 */
const addSplit = (src, method, leftOrAbove, args, range = null) => {
    if (range && args.length) {
        notify({"id": "commands.split.range", src, "type": "warning"})
        return
    }
    if (range) {
        rangeToTabIdxs(src, range).tabs.forEach(
            t => addSplit(src, method, leftOrAbove, [`${t}`]))
        return
    }
    const {addTab, switchToTab} = require("./tabs")
    const {add} = require("./pagelayout")
    const id = currentTab()?.getAttribute("link-id")
    if (!id) {
        return
    }
    if (args.length === 0) {
        addTab({"container": getSetting("containersplitpage"), src})
        add(id, method, !leftOrAbove)
        return
    }
    const tab = tabForBufferArg(args, t => !t.classList.contains("visible-tab"))
    if (tab) {
        if (tab.classList.contains("visible-tab")) {
            notify({"id": "commands.split.visible", src, "type": "warning"})
        } else {
            const page = pageForTab(tab)
            if (page) {
                add(page, method, leftOrAbove)
                switchToTab(tab)
            }
        }
    } else {
        addTab({
            "container": getSetting("containersplitpage"),
            src,
            "url": stringToUrl(args.join(" "))
        })
        add(id, method, !leftOrAbove)
    }
}

/**
 * Close a page or a custom one with ranges/arguments.
 * @param {import("./common").RunSource} src
 * @param {boolean} force
 * @param {string[]} args
 * @param {string} range
 */
const close = (src, force, args, range) => {
    if (range && args.length) {
        notify({"id": "commands.close.range", src, "type": "warning"})
        return
    }
    const {closeTab} = require("./tabs")
    if (range) {
        const tabs = listTabs()
        rangeToTabIdxs(src, range).tabs.map(id => tabs[id]).forEach(target => {
            closeTab(src, listTabs().indexOf(target), force)
        })
        return
    }
    if (args.length === 0) {
        closeTab(src, null, force)
        return
    }
    const tab = tabForBufferArg(args)
    if (tab) {
        closeTab(src, listTabs().indexOf(tab), force)
        return
    }
    notify({"id": "commands.close.noMatch", src, "type": "warning"})
}

/**
 * Call command, run any mapstring immediately.
 * @param {string[]} args
 * @param {import("./common").RunSource} src
 */
const callAction = (args, src) => {
    setTimeout(() => {
        const {executeMapString, sanitiseMapString} = require("./input")
        executeMapString(sanitiseMapString(src, args.join(" "), true), true, {
            "initial": true, src
        })
    }, 5)
}

/**
 * Make Vieb the default browser of the operating system if possible.
 * @param {import("./common").RunSource} src
 */
const makedefault = src => {
    if (process.execPath.endsWith("electron")) {
        notify({"id": "commands.makedefault.installed", src, "type": "error"})
        return
    }
    ipcRenderer.send("make-default-app")
    if (process.platform === "linux" || process.platform.includes("bsd")) {
        execCommand(
            "xdg-settings set default-web-browser vieb.desktop", err => {
                if (err?.message) {
                    notify({
                        "fields": [err.message],
                        "id": "commands.makedefault.failed",
                        src,
                        "type": "error"
                    })
                }
            })
    } else if (process.platform === "win32") {
        const scriptContents = readFile(joinPath(
            getAppRootDir(), "defaultapp/windows.bat"))
        const tempFile = joinPath(appData(), "defaultapp.bat")
        if (scriptContents) {
            writeFile(tempFile, scriptContents)
        }
        execCommand(`Powershell Start ${tempFile} -ArgumentList `
            + `"""${process.execPath}""" -Verb Runas`, err => {
            if (err?.message) {
                notify({
                    "fields": [err.message],
                    "id": "commands.makedefault.failed",
                    src,
                    "type": "error"
                })
            }
        })
    } else if (process.platform === "darwin") {
        // Electron API should be enough to show a popup for default app request
    } else {
        notify({"id": "commands.makedefault.other", src, "type": "warning"})
    }
}

/**
 * Close all tabs to the left of the current one, optionally including pinned.
 * @param {import("./common").RunSource} src
 * @param {boolean} force
 */
const lclose = (src, force = false) => {
    const tab = currentTab()
    if (!tab) {
        return
    }
    let index = listTabs().indexOf(tab)
    // Loop is reversed to close as many tabs as possible on the left,
    // without getting stuck trying to close pinned tabs at index 0.
    for (let i = index - 1; i >= 0; i--) {
        index = listTabs().indexOf(tab)
        const {closeTab} = require("./tabs")
        closeTab(src, index - 1, force)
    }
}

/**
 * Close all tabs to the right of the current one, optionally including pinned.
 * @param {import("./common").RunSource} src
 * @param {boolean} force
 */
const rclose = (src, force = false) => {
    const tab = currentTab()
    if (!tab) {
        return
    }
    const index = listTabs().indexOf(tab)
    let count = listTabs().length
    // Loop is reversed to close as many tabs as possible on the right,
    // without trying to close a potentially pinned tab right of current.
    for (let i = count - 1; i > index; i--) {
        count = listTabs().length
        const {closeTab} = require("./tabs")
        closeTab(src, count - 1, force)
    }
}

/**
 * Run custom JS in the page or a range of pages.
 * @param {import("./common").RunSource} src
 * @param {string} raw
 * @param {string} range
 */
const runjsinpage = (src, raw, range) => {
    let javascript = raw.split(" ").slice(1).join(" ")
    const filePath = expandPath(javascript)
    if (isAbsolutePath(filePath)) {
        javascript = readFile(filePath) || javascript
    }
    if (range) {
        rangeToTabIdxs(src, range).tabs.forEach(tabId => {
            const page = pageForTab(listTabs()[tabId])
            if (page && !(page instanceof HTMLDivElement)) {
                page.executeJavaScript(javascript, true)
            }
        })
    } else {
        currentPage()?.executeJavaScript(javascript, true)
    }
}

/**
 * Open a new tab optionally with a custom session and url.
 * @param {import("./common").RunSource} src
 * @param {string|null} session
 * @param {string|null} url
 */
const tabnew = (src, session = null, url = null) => {
    const {addTab} = require("./tabs")
    /** @type {{
     *   url?: string, session?: string, src: import("./common").RunSource
     * }}
     */
    const options = {src}
    if (url?.trim()) {
        options.url = stringToUrl(url)
    }
    if (session?.trim()) {
        options.session = session
    }
    addTab(options)
}

/**
 * Make or list marks.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const marks = (src, args) => {
    if (args.length > 2) {
        notify({"id": "commands.marks.argCount", src, "type": "warning"})
        return
    }
    if (args.length === 2) {
        const {makeMark} = require("./actions")
        if (isUrl(args[1])) {
            makeMark({"key": args[0], src, "url": args[1]})
        } else {
            notify({
                "fields": [args[1]],
                "id": "commands.marks.url",
                src,
                "type": "warning"
            })
        }
        return
    }
    const qm = readJSON(joinPath(appData(), "quickmarks")) ?? {}
    const relevantMarks = []
    const longest = Object.keys(qm.marks ?? {}).reduce((prev, curr) => {
        if (curr.length > prev) {
            return curr.length
        }
        return prev
    }, 0) + 1
    if (args.length === 0) {
        for (const key of Object.keys(qm.marks ?? {})) {
            relevantMarks.push(`${key.padEnd(longest)}${qm.marks[key]}`)
        }
    } else {
        const [key] = args
        if (qm.marks?.[key] !== undefined) {
            relevantMarks.push(`${key.padEnd(longest)}${qm.marks[key]}`)
        }
    }
    if (relevantMarks.length === 0) {
        if (args.length && Object.keys(qm.marks ?? {}).length) {
            notify({
                "fields": args,
                "id": "commands.marks.noKey",
                src,
                "type": "warning"
            })
        } else {
            notify({"id": "commands.marks.none", src, "type": "warning"})
        }
    } else {
        notify({
            "fields": [relevantMarks.join("\n")],
            "id": "commands.marks.list",
            src,
            "type": "warning"
        })
    }
}

/**
 * Restore a mark.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const restoremark = (src, args) => {
    if (args.length > 2) {
        notify({"id": "commands.restoremark.argCount", src, "type": "warning"})
        return
    }
    if (args.length === 0) {
        notify({"id": "commands.restoremark.keyname", src, "type": "warning"})
        return
    }
    const {restoreMark} = require("./actions")
    const {validOptions} = require("./settings")
    const [key, position] = args

    /**
     * Check if a mark position is valid.
     * @param {string} pos
     * @returns {pos is import("./tabs").tabPosition|undefined}
     */
    const isValidPosition = pos => pos === undefined
        || validOptions.markposition.includes(pos)

    if (isValidPosition(position)) {
        restoreMark({key, position, src})
    } else {
        notify({
            "fields": [
                position, argsAsHumanList(validOptions.markpositionshifted)
            ],
            "id": "commands.restoremark.argCount",
            src,
            "type": "warning"
        })
    }
}

/**
 * Delete marks.
 * @param {import("./common").RunSource} src
 * @param {boolean} all
 * @param {string[]} args
 */
const delmarks = (src, all, args) => {
    if (all && args.length) {
        notify({"id": "commands.delmarks.argCount", src, "type": "warning"})
        return
    }
    const qm = readJSON(joinPath(appData(), "quickmarks")) ?? {}
    if (all) {
        qm.marks = {}
        writeJSON(joinPath(appData(), "quickmarks"), qm)
        return
    }
    if (args.length !== 1) {
        notify({"id": "commands.delmarks.keyname", src, "type": "warning"})
        return
    }
    const [key] = args
    if (qm.marks?.[key] !== undefined) {
        delete qm.marks[key]
    }
    writeJSON(joinPath(appData(), "quickmarks"), qm)
}

/**
 * Set or list scroll positions.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const scrollpos = (src, args) => {
    if (args.length > 3) {
        notify({"id": "commands.scrollpos.argCount", src, "type": "warning"})
        return
    }
    if (args.length === 2 || args.length === 3) {
        const {storeScrollPos} = require("./actions")
        const [key, pathOrPixels, pixelsOrPath] = args
        let pixels = Number(pathOrPixels)
        let path = pixelsOrPath
        if (pixels !== undefined) {
            if (isNaN(pixels)) {
                pixels = Number(pixelsOrPath)
                path = pathOrPixels
            }
            if (isNaN(pixels)) {
                notify({
                    "fields": [pixelsOrPath],
                    "id": "commands.scrollpos.pixels",
                    src,
                    "type": "warning"
                })
                return
            }
        }
        if (pixels !== undefined) {
            pixels = Number(pixels)
        }
        storeScrollPos({key, path, pixels, src})
        return
    }
    const qm = readJSON(joinPath(appData(), "quickmarks")) ?? {}
    if (!qm.scroll) {
        qm.scroll = {"global": {}, "local": {}}
    }
    const relevantPos = []
    const longest = [
        ...Object.keys(qm.scroll.global),
        ...Object.values(qm.scroll.local).reduce(
            (prev, curr) => prev.concat(Object.keys(curr)), [])
    ].reduce((prev, curr) => {
        if (curr.length > prev) {
            return curr.length
        }
        return prev
    }, 0) + 1
    if (args.length === 0) {
        for (const key of Object.keys(qm.scroll.global)) {
            relevantPos.push(`${key.padEnd(longest)}${qm.scroll.global[key]}`)
        }
        for (const domain of Object.keys(qm.scroll.local)) {
            for (const key of Object.keys(qm.scroll.local[domain])) {
                relevantPos.push(`${key.padEnd(longest)}${
                    String(qm.scroll.local[domain][key]).padEnd(7)}${domain}`)
            }
        }
    } else {
        const [key] = args
        if (qm.scroll.global[key] !== undefined) {
            relevantPos.push(`${key.padEnd(longest)}${qm.scroll.global[key]}`)
        }
        for (const domain of Object.keys(qm.scroll.local)) {
            if (qm.scroll.local[domain][key] !== undefined) {
                relevantPos.push(`${key.padEnd(longest)}${
                    String(qm.scroll.local[domain][key]).padEnd(7)}${domain}`)
            }
        }
    }
    if (relevantPos.length === 0) {
        const notEmpty = Object.keys(qm.scroll.global).length
            || Object.keys(qm.scroll.local).length
        if (args.length && notEmpty) {
            notify({
                "fields": args,
                "id": "commands.scrollpos.noKey",
                src,
                "type": "warning"
            })
        } else {
            notify({"id": "commands.scrollpos.none", src, "type": "warning"})
        }
    } else {
        notify({
            "fields": [relevantPos.join("\n")],
            "id": "commands.scrollpos.list",
            src
        })
    }
}

/**
 * Restore a scroll position.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const restorescrollpos = (src, args) => {
    if (args.length > 2) {
        notify({
            "id": "commands.restorescrollpos.argCount", src, "type": "warning"
        })
        return
    }
    if (args.length === 0) {
        notify({
            "id": "commands.restorescrollpos.keyname", src, "type": "warning"
        })
        return
    }
    const {restoreScrollPos} = require("./actions")
    const [key, path] = args
    restoreScrollPos({key, path, src})
}

/**
 * Delete a scroll position.
 * @param {import("./common").RunSource} src
 * @param {boolean} all
 * @param {string[]} args
 */
const delscrollpos = (src, all, args) => {
    const qm = readJSON(joinPath(appData(), "quickmarks")) ?? {}
    if (!qm.scroll) {
        qm.scroll = {"global": {}, "local": {}}
    }
    const scrollPosId = getSetting("scrollposlocalid")
    let path = ""
    if (scrollPosId === "domain") {
        path = domainName(urlToString(currentPage()?.src ?? ""))
            || domainName(currentPage()?.src ?? "") || ""
    }
    if (scrollPosId === "url" || !path) {
        path = urlToString(currentPage()?.src ?? "") || currentPage()?.src || ""
    }
    if (all) {
        if (args.length > 1) {
            notify({
                "id": "commands.deletescrollpos.overridePath",
                src,
                "type": "warning"
            })
            return
        }
        if (args[0] === "*") {
            delete qm.scroll
        } else if (args[0] === "global") {
            delete qm.scroll.global
        } else if (args[0] === "local") {
            delete qm.scroll.local
        } else if (args[0]) {
            if (qm.scroll.local[args[0]]) {
                delete qm.scroll.local[args[0]]
            }
        } else {
            delete qm.scroll.local[path]
        }
        writeJSON(joinPath(appData(), "quickmarks"), qm)
        return
    }
    if (args.length === 0) {
        notify({
            "id": "commands.deletescrollpos.toofew", src, "type": "warning"
        })
        return
    }
    if (args.length > 2) {
        notify({
            "id": "commands.deletescrollpos.toomany", src, "type": "warning"
        })
        return
    }
    if (args[1]) {
        [, path] = args
    }
    if (path === "*") {
        for (const localPath of Object.keys(qm.scroll.local)) {
            if (qm.scroll.local[localPath]?.[args[0]] !== undefined) {
                delete qm.scroll.local[localPath][args[0]]
            }
            if (Object.keys(qm.scroll.local[localPath]).length === 0) {
                delete qm.scroll.local[localPath]
            }
        }
    } else if (qm.scroll.local[path]?.[args[0]] !== undefined) {
        delete qm.scroll.local[path][args[0]]
        if (Object.keys(qm.scroll.local[path]).length === 0) {
            delete qm.scroll.local[path]
        }
    }
    if (qm.scroll.global[args[0]] !== undefined) {
        delete qm.scroll.global[args[0]]
    }
    if (Object.keys(qm.scroll.local).length === 0) {
        if (Object.keys(qm.scroll.global).length === 0) {
            delete qm.scroll
        }
    }
    writeJSON(joinPath(appData(), "quickmarks"), qm)
}

/**
 * Set or list a pointer position.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const pointerpos = (src, args) => {
    if (args.length > 4) {
        notify({"id": "commands.pointerpos.argCount", src, "type": "warning"})
        return
    }
    if (args.length > 1) {
        const {storePos} = require("./pointer")
        const [key, x, y, path] = args
        const location = {"x": Number(x), "y": Number(y)}
        if (isNaN(location.x) || isNaN(location.y)) {
            notify({
                "id": "commands.pointerpos.location", src, "type": "warning"
            })
            return
        }
        storePos({key, location, path})
        return
    }
    const qm = readJSON(joinPath(appData(), "quickmarks")) ?? {}
    if (!qm.pointer) {
        qm.pointer = {"global": {}, "local": {}}
    }
    const relevantPos = []
    const longest = [
        ...Object.keys(qm.pointer.global),
        ...Object.values(qm.pointer.local).reduce(
            (prev, curr) => prev.concat(Object.keys(curr)), [])
    ].reduce((prev, curr) => {
        if (curr.length > prev) {
            return curr.length
        }
        return prev
    }, 0) + 1
    if (args.length === 0) {
        for (const key of Object.keys(qm.pointer.global)) {
            const {x, y} = qm.pointer.global[key]
            relevantPos.push(`${key.padEnd(longest)}${String(x).padEnd(7)}${
                String(y).padEnd(7)}`)
        }
        for (const domain of Object.keys(qm.pointer.local)) {
            for (const key of Object.keys(qm.pointer.local[domain])) {
                const {x, y} = qm.pointer.local[domain][key]
                relevantPos.push(`${key.padEnd(longest)}${String(x).padEnd(7)}${
                    String(y).padEnd(7)}${domain}`)
            }
        }
    } else {
        const [key] = args
        if (qm.pointer.global[key] !== undefined) {
            const {x, y} = qm.pointer.global[key]
            relevantPos.push(`${key.padEnd(longest)}${String(x).padEnd(7)}${
                String(y).padEnd(7)}`)
        }
        for (const domain of Object.keys(qm.pointer.local)) {
            if (qm.pointer.local[domain][key] !== undefined) {
                const {x, y} = qm.pointer.local[domain][key]
                relevantPos.push(`${key.padEnd(longest)}${String(x).padEnd(7)}${
                    String(y).padEnd(7)}${domain}`)
            }
        }
    }
    if (relevantPos.length === 0) {
        const notEmpty = Object.keys(qm.pointer.global).length
            || Object.keys(qm.pointer.local).length
        if (args.length && notEmpty) {
            notify({
                "fields": args,
                "id": "commands.pointerpos.noKey",
                src,
                "type": "warning"
            })
        } else {
            notify({"id": "commands.pointerpos.none", src, "type": "warning"})
        }
    } else {
        notify({
            "fields": [relevantPos.join("\n")],
            "id": "commands.pointerpos.list",
            src
        })
    }
}

/**
 * Restore the pointer position.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const restorepointerpos = (src, args) => {
    if (args.length > 2) {
        notify({
            "id": "commands.restorepointerpos.argCount", src, "type": "warning"
        })
        return
    }
    if (args.length === 0) {
        notify({
            "id": "commands.restorepointerpos.keyname", src, "type": "warning"
        })
        return
    }
    const {restorePos} = require("./pointer")
    const [key, path] = args
    restorePos({key, path})
}

/**
 * Delete a pointer position.
 * @param {import("./common").RunSource} src
 * @param {boolean} all
 * @param {string[]} args
 */
const delpointerpos = (src, all, args) => {
    const qm = readJSON(joinPath(appData(), "quickmarks")) ?? {}
    if (!qm.pointer) {
        qm.pointer = {"global": {}, "local": {}}
    }
    const pointerPosId = getSetting("pointerposlocalid")
    let path = ""
    if (pointerPosId === "domain") {
        path = domainName(urlToString(currentPage()?.src ?? ""))
            || domainName(currentPage()?.src ?? "") || ""
    }
    if (pointerPosId === "url" || !path) {
        path = urlToString(currentPage()?.src ?? "") || currentPage()?.src || ""
    }
    if (all) {
        if (args.length > 1) {
            notify({
                "id": "commands.deletepointerpos.overridePath",
                src,
                "type": "warning"
            })
            return
        }
        if (args[0] === "*") {
            delete qm.pointer
        } else if (args[0] === "global") {
            delete qm.pointer.global
        } else if (args[0] === "local") {
            delete qm.pointer.local
        } else if (args[0]) {
            if (qm.pointer.local[args[0]]) {
                delete qm.pointer.local[args[0]]
            }
        } else {
            delete qm.pointer.local[path]
        }
        writeJSON(joinPath(appData(), "quickmarks"), qm)
        return
    }
    if (args.length === 0) {
        notify({
            "id": "commands.deletepointerpos.toofew", src, "type": "warning"
        })
        return
    }
    if (args.length > 2) {
        notify({
            "id": "commands.deletepointerpos.toomany", src, "type": "warning"
        })
        return
    }
    if (args[1]) {
        [, path] = args
    }
    if (path === "*") {
        for (const localPath of Object.keys(qm.pointer.local)) {
            if (qm.pointer.local[localPath]?.[args[0]] !== undefined) {
                delete qm.pointer.local[localPath][args[0]]
            }
            if (Object.keys(qm.pointer.local[localPath]).length === 0) {
                delete qm.pointer.local[localPath]
            }
        }
    } else if (qm.pointer.local[path]?.[args[0]] !== undefined) {
        delete qm.pointer.local[path][args[0]]
        if (Object.keys(qm.pointer.local[path]).length === 0) {
            delete qm.pointer.local[path]
        }
    }
    if (qm.pointer.global[args[0]] !== undefined) {
        delete qm.pointer.global[args[0]]
    }
    if (Object.keys(qm.pointer.local).length === 0) {
        if (Object.keys(qm.pointer.global).length === 0) {
            delete qm.pointer
        }
    }
    writeJSON(joinPath(appData(), "quickmarks"), qm)
}

/**
 * Translate the current page.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const translatepage = (src, args) => {
    if (args.length > 1) {
        notify({
            "id": "commands.translatepage.argCount", src, "type": "warning"
        })
        return
    }
    const url = getSetting("translateurl").replace(/\/*$/g, "")
    let api = getSetting("translateapi")
    if (api === "auto") {
        if (url.includes("deepl.com")) {
            api = "deepl"
        } else {
            api = "libretranslate"
        }
    }
    const apiKey = getSetting("translatekey").trim()
    if ((api === "deepl" || url.includes("libretranslate.com")) && !apiKey) {
        notify({"id": "commands.translatepage.apiKey", src, "type": "warning"})
        return
    }
    const {validOptions} = require("./settings")
    let [lang] = args
    if (lang && !validOptions.translatelang.includes(lang.toLowerCase())) {
        notify({
            "fields": [lang],
            "id": "commands.translatepage.language",
            src,
            "type": "warning"
        })
        return
    }
    lang = lang?.toLowerCase() ?? getSetting("translatelang")
    if (lang === "jp") {
        lang = "ja"
    }
    if (api === "libretranslate" && lang.startsWith("en")) {
        lang = "en"
    }
    if (api === "libretranslate" && lang.startsWith("pt")) {
        lang = "pt"
    }
    if (api === "deepl" && lang === "en") {
        lang = "en-us"
    }
    if (api === "deepl" && lang === "pt") {
        lang = "pt-pt"
    }
    currentPage()?.send("action", "translatepage", api, url, lang, apiKey)
}

/**
 * Clear history based on an interval.
 * @param {import("./common").RunSource} src
 * @param {string} type
 * @param {string} interval
 * @param {string|null} trailingArgs
 */
const clear = (src, type, interval, trailingArgs = null) => {
    if (trailingArgs) {
        notify({"id": "commands.clear.argCount", src, "type": "warning"})
        return
    }
    if (!type) {
        notify({"id": "commands.clear.typeMissing", src, "type": "warning"})
        return
    }
    if (!interval) {
        notify({"id": "commands.clear.intervalMissing", src, "type": "warning"})
        return
    }
    if (!["history"].includes(type)) {
        notify({"id": "commands.clear.typeInvalid", src, "type": "warning"})
        return
    }
    if (type === "history") {
        const {removeOldHistory} = require("./history")
        if (isValidIntervalValue(interval, true)) {
            if (interval.startsWith("last")) {
                const {removeRecentHistory} = require("./history")
                removeRecentHistory(intervalValueToDate(
                    interval.replace(/^last/g, "")))
            } else {
                removeOldHistory(intervalValueToDate(interval))
            }
        } else if (interval === "all") {
            removeOldHistory(new Date())
        } else if (isUrl(interval)) {
            const {removeHistoryByPartialUrl} = require("./history")
            removeHistoryByPartialUrl(interval)
        } else {
            notify({
                "id": "commands.clear.intervalInvalid", src, "type": "warning"
            })
        }
    }
}

const noEscapeCommands = ["command", "delcommand"]
const rangeCompatibleCommands = [
    "Sexplore",
    "Vexplore",
    "close",
    "hardcopy",
    "hide",
    "mute",
    "pin",
    "print",
    "q",
    "quit",
    "runjsinpage",
    "suspend",
    "vsplit",
    "split",
    "w",
    "write"
]
const noArgumentComands = [
    "q",
    "quit",
    "qa",
    "quitall",
    "reloadconfig",
    "restart",
    "v",
    "version",
    "history",
    "d",
    "downloads",
    "notifications",
    "cookies",
    "hardcopy",
    "print",
    "comclear",
    "makedefault",
    "nohlsearch",
    "lclose",
    "rclose",
    "only",
    "buffers"
]
/** @type {{[command: string]: string}} */
let userCommands = {}
/* eslint-disable jsdoc/require-jsdoc */
/** @type {{
 *   [command: string]: (props: {
 *     args: string[],
 *     range: string,
 *     raw: string,
 *     src: import("./common").RunSource
 *   }) => void
 * }} */
const commands = {
    "Sexplore": ({src, args, range}) => addSplit(
        src, "ver", !getSetting("splitbelow"), args, range),
    "Vexplore": ({src, args, range}) => addSplit(
        src, "hor", !getSetting("splitright"), args, range),
    "b": ({src, args}) => buffer(src, args),
    "buffer": ({src, args}) => buffer(src, args),
    "buffers": ({src}) => buffers(src),
    "call": ({args, src}) => callAction(args, src),
    "clear": ({src, args}) => clear(src, args[0], args[1], args[2]),
    "close": ({src, args, range}) => close(src, false, args, range),
    "close!": ({src, args, range}) => close(src, true, args, range),
    "colorscheme": ({src, args}) => colorscheme(src, ...args),
    "comclear": () => {
        userCommands = {}
    },
    /* eslint-disable-next-line no-use-before-define */
    "command": ({src, args}) => addCommand(src, false, args),
    /* eslint-disable-next-line no-use-before-define */
    "command!": ({src, args}) => addCommand(src, true, args),
    "cookies": ({src}) => openSpecialPage(src, "cookies", false),
    "cookies!": ({src}) => openSpecialPage(src, "cookies", true),
    "d": ({src}) => openSpecialPage(src, "downloads", false),
    "d!": ({src}) => openSpecialPage(src, "downloads", true),
    /* eslint-disable-next-line no-use-before-define */
    "delcommand": ({src, args}) => deleteCommand(src, args),
    "delmarks": ({src, args}) => delmarks(src, false, args),
    "delmarks!": ({src, args}) => delmarks(src, true, args),
    "delpointerpos": ({src, args}) => delpointerpos(src, false, args),
    "delpointerpos!": ({src, args}) => delpointerpos(src, true, args),
    "delscrollpos": ({src, args}) => delscrollpos(src, false, args),
    "delscrollpos!": ({src, args}) => delscrollpos(src, true, args),
    "devtools": ({src, args}) => openDevTools(src, ...args),
    "downloads": ({src}) => openSpecialPage(src, "downloads", false),
    "downloads!": ({src}) => openSpecialPage(src, "downloads", true),
    "echo": ({args, src}) => notify({
        "fields": [args.join(" ")], "id": "util.untranslated", src
    }),
    "h": ({src, args}) => help(src, false, ...args),
    "h!": ({src, args}) => help(src, true, ...args),
    "hardcopy": ({src, range}) => hardcopy(src, range),
    "help": ({src, args}) => help(src, false, ...args),
    "help!": ({src, args}) => help(src, true, ...args),
    "hide": ({src, args, range}) => hideCommand(src, args, range),
    "history": ({src}) => openSpecialPage(src, "history", false),
    "history!": ({src}) => openSpecialPage(src, "history", true),
    "internaldevtools": openInternalDevTools,
    "lclose": ({src}) => lclose(src),
    "lclose!": ({src}) => lclose(src, true),
    "makedefault": ({src}) => makedefault(src),
    "marks": ({src, args}) => marks(src, args),
    "mkviebrc": ({src, args}) => mkviebrc(src, ...args),
    "mute": ({src, args, range}) => mute(src, args, range),
    "mute!": ({src, args, range}) => setMute(src, args, range),
    "nohlsearch": () => {
        listRealPages().forEach(page => page.stopFindInPage("clearSelection"))
    },
    "notifications": ({src}) => openSpecialPage(src, "notifications", false),
    "notifications!": ({src}) => openSpecialPage(src, "notifications", true),
    "o": ({src, args}) => open(src, args),
    "only": () => {
        const {only} = require("./pagelayout")
        only()
    },
    "open": ({src, args}) => open(src, args),
    "pin": ({src, args, range}) => pin(src, args, range),
    "pin!": ({src, args, range}) => setPin(src, args, range),
    "pointerpos": ({src, args}) => pointerpos(src, args),
    "print": ({src, range}) => hardcopy(src, range),
    "q": ({src, range}) => quit(src, range),
    "qa": quitall,
    "quit": ({src, range}) => quit(src, range),
    quitall,
    "rclose": ({src}) => rclose(src),
    "rclose!": ({src}) => rclose(src, true),
    reloadconfig,
    restart,
    "restoremark": ({src, args}) => restoremark(src, args),
    "restorepointerpos": ({src, args}) => restorepointerpos(src, args),
    "restorescrollpos": ({src, args}) => restorescrollpos(src, args),
    "runjsinpage": ({src, raw, range}) => runjsinpage(src, raw, range),
    "s": ({src, args}) => setCommand(src, args),
    "screencopy": ({src, args}) => screencopy(src, args),
    "screenshot": ({src, args}) => screenshot(src, args),
    "scriptnames": ({args, src}) => {
        if (args?.length) {
            notify({
                "id": "commands.scriptnames.noArgs", src, "type": "warning"
            })
            return
        }
        const names = appConfig()?.files.map(
            (f, i) => `${i + 1}: ${f}`).join("\n") ?? ""
        notify({"fields": [names], "id": "util.untranslated", src})
    },
    "scriptnames!": ({args, src}) => {
        const scripts = [...appConfig()?.files ?? [], ...sourcedFiles]
        if (args.length === 0) {
            const names = scripts.map((f, i) => `${i + 1}: ${f}`).join("\n")
            notify({"fields": [names], "id": "util.untranslated", src})
        } else if (args.length === 1) {
            const number = Number(args[0])
            if (isNaN(number)) {
                notify({
                    "id": "commands.scriptnames.argType", src, "type": "warning"
                })
                return
            }
            const script = scripts[number - 1]
            if (!script) {
                notify({
                    "fields": [String(number)],
                    "id": "commands.scriptnames.notFound",
                    src,
                    "type": "warning"
                })
                return
            }
            execCommand(`${getSetting("vimcommand")} "${script}"`, err => {
                if (err) {
                    notify({
                        "id": "commands.scriptnames.editor",
                        src,
                        "type": "error"
                    })
                }
            })
        } else {
            notify({
                "id": "commands.scriptnames.singleArg",
                src,
                "type": "error"
            })
        }
    },
    "scrollpos": ({src, args}) => scrollpos(src, args),
    "set": ({src, args}) => setCommand(src, args),
    "source": ({src, args}) => source(src, null, args),
    "split": ({src, args, range}) => addSplit(
        src, "ver", !getSetting("splitbelow"), args, range),
    "suspend": ({src, args, range}) => suspend(src, args, range),
    "tabnew": ({src, raw}) => tabnew(
        src, null, raw.split(" ").slice(1).join(" ")),
    "tabnewcontainer": ({src, raw}) => tabnew(src, raw.split(" ")[1],
        raw.split(" ").slice(2).join(" ")),
    "translatepage": ({src, args}) => translatepage(src, args),
    "v": ({src}) => openSpecialPage(src, "version", false),
    "v!": ({src}) => openSpecialPage(src, "version", true),
    "version": ({src}) => openSpecialPage(src, "version", false),
    "version!": ({src}) => openSpecialPage(src, "version", true),
    "vsplit": ({src, args, range}) => addSplit(
        src, "hor", !getSetting("splitright"), args, range),
    "w": ({src, args, range}) => write(src, args, range),
    "write": ({src, args, range}) => write(src, args, range)
}
/** @type {string[]} */
const holdUseCommands = ["command"]
const {mapOrList, unmap, clearmap} = require("./input")
" nicsefpvm".split("").forEach(prefix => {
    commands[`${prefix.trim()}map!`] = ({src, args}) => {
        mapOrList(src, prefix.trim(), args, false, true)
    }
    commands[`${prefix.trim()}noremap!`] = ({src, args}) => {
        mapOrList(src, prefix.trim(), args, true, true)
    }
    holdUseCommands.push(`${prefix.trim()}map`)
    commands[`${prefix.trim()}map`] = ({src, args}) => {
        mapOrList(src, prefix.trim(), args)
    }
    noEscapeCommands.push(`${prefix.trim()}map`)
    commands[`${prefix.trim()}noremap`] = ({src, args}) => {
        mapOrList(src, prefix.trim(), args, true)
    }
    noEscapeCommands.push(`${prefix.trim()}noremap`)
    commands[`${prefix.trim()}unmap`] = ({src, args}) => {
        unmap(src, prefix.trim(), args, false)
    }
    noEscapeCommands.push(`${prefix.trim()}unmap`)
    commands[`${prefix.trim()}unmap!`] = ({src, args}) => {
        unmap(src, prefix.trim(), args, true)
    }
    noEscapeCommands.push(`${prefix.trim()}unmap!`)
    commands[`${prefix.trim()}mapclear`] = ({src}) => {
        clearmap(src, prefix.trim())
    }
    noArgumentComands.push(`${prefix.trim()}mapclear`)
    commands[`${prefix.trim()}mapclear!`] = ({src}) => {
        clearmap(src, prefix.trim(), true)
    }
})
/* eslint-enable jsdoc/require-jsdoc */

/**
 * Add a new command, or optionally overwrite existing custom commands.
 * @param {import("./common").RunSource} src
 * @param {boolean} overwrite
 * @param {string[]} args
 */
const addCommand = (src, overwrite, args) => {
    if (overwrite && args.length < 2) {
        notify({"id": "commands.command.combined", src, "type": "warning"})
        return
    }
    if (args.length === 0) {
        const commandString = Object.keys(userCommands).map(c => translate(
            "commands.command.listSingle", {"fields": [c, userCommands[c]]})
        ).join("\n").trim()
        if (commandString) {
            notify({
                "fields": [commandString], "id": "commands.command.list", src
            })
        } else {
            notify({"id": "commands.command.none", src})
        }
        return
    }
    const command = args[0].replace(/^[:'" ]*/, "")
    if (command.includes("/") || command.includes("\\")) {
        notify({"id": "commands.command.slashes", src, "type": "warning"})
        return
    }
    if (command[0]?.match(specialChars) || command[0]?.match(/\d+/g)) {
        notify({"id": "commands.command.special", src, "type": "warning"})
        return
    }
    const params = args.slice(1)
    if (commands[command]) {
        notify({
            "fields": [command],
            "id": "commands.command.builtin",
            src,
            "type": "warning"
        })
        return
    }
    if (params.length === 0) {
        if (userCommands[command]) {
            notify({
                "fields": [command, userCommands[command]],
                "id": "commands.command.listSingle",
                src
            })
        } else {
            notify({
                "fields": [command],
                "id": "commands.command.missing",
                src,
                "type": "warning"
            })
        }
        return
    }
    if (!overwrite && userCommands[command]) {
        notify({
            "fields": [command],
            "id": "commands.command.duplicate",
            src,
            "type": "warning"
        })
        return
    }
    const {sanitiseMapString} = require("./input")
    userCommands[command] = sanitiseMapString(src, params.join(" "), true)
}

/**
 * Delete a custom command.
 * @param {import("./common").RunSource} src
 * @param {string[]} args
 */
const deleteCommand = (src, args) => {
    if (args.length !== 1) {
        notify({"id": "commands.delcommand.argCount", src, "type": "warning"})
        return
    }
    const command = args[0].replace(/^[:'" ]*/, "")
    if (userCommands[command]) {
        delete userCommands[args[0]]
    } else {
        notify({
            "fields": [command],
            "id": "commands.delcommand.missing",
            src,
            "type": "warning"
        })
    }
}

/**
 * Parse and validate the string to a command.
 * @param {string} commandStr
 */
const parseAndValidateArgs = commandStr => {
    const argsString = commandStr.split(" ").slice(1).join(" ")
    let [command] = commandStr.split(" ")
    let range = ""
    while (command[0]?.match(specialChars) || command[0]?.match(/\d+/g) || command.includes("/")) {
        range += command[0]
        command = command.slice(1)
    }
    /** @type {string[]} */
    const args = []
    let currentArg = ""
    let escapedDouble = false
    let escapedSingle = false
    const infoJSON = {
        "curly": 0,
        "double": false,
        "single": false,
        "square": 0
    }
    const noEscape = noEscapeCommands.includes(command)
    const setCommandParsing = "set".startsWith(command)
    if (setCommandParsing) {
        for (const char of argsString) {
            const evenNumberOfEscapesSlashes = (currentArg
                .match(/\\*$/)?.[0]?.length ?? 0) % 2 === 0
            if (!evenNumberOfEscapesSlashes) {
                currentArg += char
                continue
            }
            if (char === `"`) {
                infoJSON.double = !infoJSON.double
            }
            if (char === "`") {
                infoJSON.single = !infoJSON.single
            }
            if (!infoJSON.single && !infoJSON.double) {
                if (char === "{") {
                    infoJSON.curly += 1
                } else if (char === "}") {
                    infoJSON.curly -= 1
                }
                if (char === "[") {
                    infoJSON.square += 1
                } else if (char === "]") {
                    infoJSON.square -= 1
                }
                if (char === " " && !infoJSON.curly && !infoJSON.square) {
                    args.push(currentArg)
                    currentArg = ""
                    continue
                }
            }
            currentArg += char
        }
    } else {
        for (const char of argsString) {
            if (char === "'" && !escapedDouble && !noEscape) {
                escapedSingle = !escapedSingle
                continue
            }
            if (char === `"` && !escapedSingle && !noEscape) {
                escapedDouble = !escapedDouble
                continue
            }
            if (char === " " && !escapedDouble && !escapedSingle) {
                args.push(currentArg)
                currentArg = ""
                continue
            }
            currentArg += char
        }
    }
    if (currentArg) {
        args.push(currentArg)
    }
    let confirm = false
    if (command.endsWith("!") && !command.endsWith("!!")) {
        confirm = true
        command = command.slice(0, -1)
    }
    if (setCommandParsing) {
        let parsingError = ""
        const invalidJSON = args.some(a => {
            const value = a.replace(/^\w+(.?=|:)/, "")
            if (value.startsWith("{") && value.endsWith("}")
                || value.startsWith("[") && value.endsWith("]")) {
                try {
                    JSON.parse(value)
                    return false
                } catch (e) {
                    parsingError = String(e)
                    return true
                }
            }
            return false
        })
        return {
            args,
            command,
            confirm,
            "error": parsingError,
            range,
            "valid": infoJSON.curly === 0 && infoJSON.square === 0
                && !infoJSON.single && !infoJSON.double && !invalidJSON
        }
    }
    return {
        args,
        command,
        confirm,
        range,
        "valid": !escapedSingle && !escapedDouble && !command.includes("\\")
    }
}

/** Return the page title or an empty string. */
const getPageTitle = () => currentTab()?.querySelector("span")
    ?.textContent ?? ""

/** Return the page url as a URL object. */
const getPageUrlClass = () => {
    const {getPageUrl} = require("./actions")
    return new URL(getPageUrl())
}

/** Return the current page url origin. */
const getPageOrigin = () => getPageUrlClass().origin

/** Return the current page url domain. */
const getPageDomain = () => getPageUrlClass().host

/**
 * Execute a command.
 * @param {string} com
 * @param {{
 *   settingsFile?: string|null,
 *   src?: import("./common").RunSource
 * }} opts
 */
const execute = (com, opts = {}) => {
    // Remove all redundant spaces
    // Allow commands prefixed with :
    // And return if the command is empty
    let commandStr = com.replace(/^[\s|:]*/, "").trim().replace(/ +/g, " ")
    if (!commandStr) {
        return
    }
    const src = opts.src ?? "other"
    // Don't "use current" on holdUseCommands, commands like 'command' or 'map'
    // which will hold <useCurrent... for calling it when it is used
    // otherwise they will always use the same value at creation
    if (commandStr.includes("<use")
        && !holdUseCommands.some(command => commandStr.startsWith(command))) {
        const {getPageUrl} = require("./actions")
        // Replace all occurrences of <useCurrent for their values
        commandStr = commandStr.replace("<useCurrentUrl>", `${getPageUrl()}`)
            .replace("<useCurrentOrigin>", `${getPageOrigin()}`)
            .replace("<useCurrentTitle>", `${getPageTitle()}`)
            .replace("<useCurrentDomain>", `${getPageDomain()}`)
    }
    const {push} = require("./commandhistory")
    push(commandStr, src === "user")
    if (commandStr.startsWith("!")) {
        if (commandStr !== "!") {
            execCommand(commandStr.replace("!", ""), (err, stdout) => {
                const reportExit = getSetting("notificationforsystemcommands")
                if (err && reportExit !== "none") {
                    notify({
                        "fields": [`${err}`],
                        "id": "actions.command.failed",
                        src,
                        "type": "error"
                    })
                } else if (reportExit === "all") {
                    const output = stdout.toString()
                    if (output) {
                        notify({
                            "fields": [output],
                            "id": "actions.command.successWithOutput",
                            src,
                            "type": "success"
                        })
                    } else {
                        notify({
                            "id": "actions.command.success",
                            src,
                            "type": "success"
                        })
                    }
                }
            })
        }
        return
    }
    const p = parseAndValidateArgs(commandStr)
    let {command} = p
    const {range, args, valid, confirm, error} = p
    if (!valid) {
        if ("set".startsWith(command)) {
            notify({
                "fields": [commandStr, error ?? ""],
                "id": "commands.execute.invalidJSON",
                src,
                "type": "warning"
            })
        } else {
            notify({
                "fields": [commandStr],
                "id": "commands.execute.unmatched",
                src,
                "type": "warning"
            })
        }
        return
    }
    const matches = Object.keys(commands).concat(Object.keys(userCommands))
        .filter(c => c.startsWith(command) && !c.endsWith("!"))
    if (matches.length === 1 || commands[command] || userCommands[command]) {
        if (matches.length === 1) {
            [command] = matches
        }
        if (command === "source" && opts.settingsFile) {
            source(src, opts.settingsFile, args)
        } else if (noArgumentComands.includes(command) && args.length > 0) {
            notify({
                "fields": [command],
                "id": "commands.execute.argCount",
                src,
                "type": "warning"
            })
        } else if (commands[command]) {
            if (!rangeCompatibleCommands.includes(command) && range) {
                notify({
                    "fields": [command],
                    "id": "commands.execute.noRange",
                    src,
                    "type": "warning"
                })
                return
            }
            if (confirm) {
                command += "!"
                if (!commands[command]) {
                    notify({
                        "fields": [command.slice(0, -1)],
                        "id": "commands.execute.noConfirm",
                        src,
                        "type": "warning"
                    })
                    return
                }
            }
            commands[command]({args, range, "raw": com, src})
        } else {
            setTimeout(() => {
                const {executeMapString} = require("./input")
                executeMapString(userCommands[command], true,
                    {"initial": true, src})
            }, 5)
        }
    } else if (matches.length > 1) {
        notify({
            "fields": [command],
            "id": "commands.execute.ambiguous",
            src,
            "type": "warning"
        })
    } else {
        notify({
            "fields": [command],
            "id": "commands.execute.notFound",
            src,
            "type": "warning"
        })
    }
}

/**
 * List all commands.
 * @param {boolean} includeCustom
 */
const commandList = (includeCustom = true) => {
    if (includeCustom) {
        return Object.keys(commands).filter(c => c.length > 2)
            .concat(Object.keys(userCommands))
    }
    return Object.keys(commands).filter(c => c.length > 2)
}

/**
 * List all custom commands as viebrc statements.
 * @param {boolean} full
 */
const customCommandsAsCommandList = (full = false) => {
    let commandString = Object.keys(userCommands).map(
        command => `command ${command} ${userCommands[command]}`).join("\n")
    if (full || currentscheme !== "default") {
        commandString += `\ncolorscheme ${currentscheme}`
    }
    return commandString
}

module.exports = {
    allTabsForBufferArg,
    commandList,
    customCommandsAsCommandList,
    execute,
    getPageTitle,
    openSpecialPage,
    parseAndValidateArgs,
    rangeCompatibleCommands,
    rangeToTabIdxs
}
