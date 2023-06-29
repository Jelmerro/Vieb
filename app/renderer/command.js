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
    isValidIntervalValue
} = require("../util")
const {
    listTabs,
    currentTab,
    currentPage,
    getSetting,
    pageForTab,
    tabForPage,
    listRealPages
} = require("./common")

/**
 * List a specific setting, all of them or show the warning regarding name.
 * @param {keyof typeof import("./settings").defaultSettings|"all"} setting
 */
const listSetting = setting => {
    if (setting === "all") {
        const {listCurrentSettings} = require("./settings")
        notify(`--- Options ---\n${listCurrentSettings(true)}`)
        return
    }
    notify(`The setting '${setting}' has the value '${getSetting(setting)}'`)
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
 * Modifiy a list or a number.
 * @param {keyof typeof import("./settings").defaultSettings} setting
 * @param {string} value
 * @param {"append"|"remove"|"special"} method
 */
const modifyListOrNumber = (setting, value, method) => {
    const {
        freeText, listLike, listLikeTilde, set, isNumberSetting
    } = require("./settings")
    const isNumber = isNumberSetting(setting)
    const isFreeText = freeText.includes(setting)
    const isListLike = listLike.includes(setting)
    const isListLikeTilde = listLikeTilde.includes(setting)
    if (!isNumber && !isFreeText && !isListLike && !listLikeTilde) {
        notify(
            `Can't modify '${setting}' as if it were a number or list`, "warn")
        return
    }
    if (method === "append") {
        if (isListLike) {
            set(setting, `${getSetting(setting)},${value}`)
        }
        if (isListLikeTilde) {
            set(setting, `${getSetting(setting)}~${value}`)
        }
        if (isNumber) {
            set(setting, getSetting(setting) + Number(value))
        }
        if (isFreeText) {
            set(setting, getSetting(setting) + value)
        }
    }
    if (method === "remove") {
        if (isListLike) {
            let current = String(getSetting(setting)).split(",")
            if (setting === "mouse" && current?.[0] === "all") {
                const {mouseFeatures} = require("./settings")
                current = mouseFeatures
            }
            let newValue = current.filter(e => e && e !== value).join(",")
            if (newValue === current.join(",")) {
                newValue = current.filter(
                    e => e.split("~")[0] !== value.split("~")[0]).join(",")
            }
            set(setting, newValue)
        }
        if (isListLikeTilde) {
            const current = String(getSetting(setting)).split("~")
            const newValue = current.filter(e => e && e !== value).join("~")
            set(setting, newValue)
        }
        if (isNumber) {
            set(setting, getSetting(setting) - Number(value))
        }
        if (isFreeText) {
            set(setting, String(getSetting(setting)).replace(value, ""))
        }
    }
    if (method === "special") {
        if (isListLike) {
            set(setting, `${value},${getSetting(setting)}`)
        }
        if (isListLikeTilde) {
            set(setting, `${value}~${getSetting(setting)}`)
        }
        if (isNumber) {
            set(setting, getSetting(setting) * Number(value))
        }
        if (isFreeText) {
            set(setting, value + getSetting(setting))
        }
    }
}

/**
 * Use the set command to list or modify any setting.
 * @param {string[]} args
 */
const set = args => {
    if (args.length === 0) {
        const {listCurrentSettings} = require("./settings")
        const allChanges = listCurrentSettings()
        if (allChanges) {
            notify(`--- Options ---\n${allChanges}`)
        } else {
            notify("No settings have been changed compared to the default")
        }
        return
    }
    const {"set": s} = require("./settings")
    for (const part of args) {
        if ((/^\w+\+=/).test(part)) {
            const [setting, value] = splitSettingAndValue(part, "+=")
            if (isValidSettingName(setting) && setting !== "all") {
                modifyListOrNumber(setting, value, "append")
            } else {
                notify(`The setting '${setting}' doesn't exist`, "warn")
            }
        } else if ((/^\w+-=/).test(part)) {
            const [setting, value] = splitSettingAndValue(part, "-=")
            if (isValidSettingName(setting) && setting !== "all") {
                modifyListOrNumber(setting, value, "remove")
            } else {
                notify(`The setting '${setting}' doesn't exist`, "warn")
            }
        } else if ((/^\w+\^=/).test(part)) {
            const [setting, value] = splitSettingAndValue(part, "^=")
            if (isValidSettingName(setting) && setting !== "all") {
                modifyListOrNumber(setting, value, "special")
            } else {
                notify(`The setting '${setting}' doesn't exist`, "warn")
            }
        } else if ((/^\w+=/).test(part)) {
            s(...splitSettingAndValue(part, "="))
        } else if ((/^\w+:/).test(part)) {
            s(...splitSettingAndValue(part, ":"))
        } else if ((/^\w+!.+/).test(part)) {
            const [setting] = part.split("!")
            const values = part.split("!").slice(1).join("!").split("|")
            if (isValidSettingName(setting) && setting !== "all") {
                const index = values.indexOf(String(getSetting(setting)))
                s(setting, values[index + 1] || values[0])
            } else {
                notify(`The setting '${setting}' doesn't exist`, "warn")
            }
        } else if (part.endsWith("!")) {
            const setting = part.slice(0, -1)
            if (isValidSettingName(setting) && setting !== "all") {
                const value = getSetting(setting)
                const {isEnumSetting, validOptions} = require("./settings")
                if (["boolean", "undefined"].includes(typeof value)) {
                    s(setting, String(!value))
                } else if (isEnumSetting(setting)) {
                    const index = validOptions[setting].indexOf(String(value))
                    s(setting, validOptions[setting][index + 1]
                    || validOptions[setting][0])
                } else {
                    notify(
                        `The setting '${setting}' can not be flipped`, "warn")
                }
            } else {
                notify(`The setting '${setting}' doesn't exist`, "warn")
            }
        } else if (part.endsWith("&")) {
            const {reset} = require("./settings")
            reset(part.slice(0, -1))
        } else if (part.endsWith("?")) {
            const settingName = part.slice(0, -1)
            if (isValidSettingName(settingName)) {
                listSetting(settingName)
            } else {
                notify(`The setting '${settingName}' doesn't exist`, "warn")
            }
        } else if (isValidSettingName(part) && part !== "all"
            && typeof getSetting(part) === "boolean") {
            s(part, "true")
        } else if (part.startsWith("inv")) {
            const settingName = part.replace("inv", "")
            if (isValidSettingName(settingName) && settingName !== "all") {
                const value = getSetting(settingName)
                if (typeof value === "boolean") {
                    s(part.replace("inv", ""), String(!value))
                } else {
                    notify(`The setting '${settingName}' can not be flipped`,
                        "warn")
                }
            } else if (isValidSettingName(part)) {
                listSetting(part)
            } else {
                notify(`The setting '${part}' doesn't exist`, "warn")
            }
        } else if (part.startsWith("no")) {
            const settingName = part.replace("no", "")
            if (isValidSettingName(settingName) && settingName !== "all") {
                const value = getSetting(settingName)
                const {listLike, listLikeTilde} = require("./settings")
                if (typeof value === "boolean") {
                    s(settingName, "false")
                } else if (listLike.includes(part.replace("no", ""))) {
                    s(settingName, "")
                } else if (listLikeTilde.includes(part.replace("no", ""))) {
                    s(settingName, "")
                } else {
                    listSetting(settingName)
                }
            } else if (isValidSettingName(part)) {
                listSetting(part)
            } else {
                notify(`The setting '${part}' doesn't exist`, "warn")
            }
        } else if (isValidSettingName(part)) {
            listSetting(part)
        } else {
            notify(`The setting '${part}' doesn't exist`, "warn")
        }
    }
}

/** @type {string[]} */
const sourcedFiles = []

/**
 * Source a specific viebrc file.
 * @param {string|null} origin
 * @param {string[]} args
 */
const source = (origin, args) => {
    if (args.length !== 1) {
        notify("Source requires exactly argument representing the filename",
            "warn")
        return
    }
    let [absFile] = args
    absFile = expandPath(absFile)
    if (!isAbsolutePath(absFile)) {
        if (origin) {
            absFile = joinPath(dirname(origin), absFile)
        } else {
            notify("Filename must be absolute when sourcing files at runtime",
                "err")
            return
        }
    }
    if (absFile === origin) {
        notify("Recursive sourcing of files is not supported", "err")
        return
    }
    if ([
        appConfig()?.override, ...appConfig()?.files ?? []
    ].includes(absFile)) {
        notify("It's not possible to source a file that is loaded on startup",
            "err")
        return
    }
    if (!isFile(absFile)) {
        notify("Specified file could not be found", "err")
        return
    }
    const parsed = readFile(absFile)
    if (!parsed) {
        notify(`Read error for config file located at '${absFile}'`, "err")
        return
    }
    if (origin) {
        sourcedFiles.push(absFile)
    }
    for (const line of parsed.split("\n")) {
        if (line && !line.trim().startsWith("\"")) {
            execute(line, absFile)
        }
    }
}

/**
 * Quit the current split, a range of splits or the browser if not using splits.
 * @param {string|null} range
 */
const quit = (range = null) => {
    const {closeTab} = require("./tabs")
    if (range) {
        rangeToTabIdxs(range).forEach(t => closeTab(t))
        return
    }
    if (document.getElementById("tabs")?.classList.contains("multiple")) {
        closeTab()
    } else {
        quitall()
    }
}

const quitall = () => {
    ipcRenderer.send("hide-window")
    const keepQuickmarkNames = getSetting("quickmarkpersistence").split(",")
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

let currentscheme = "default"
/**
 * Set the colorscheme by name or log the current one if no name provided.
 * @param {string|null} name
 * @param {string|null} trailingArgs
 */
const colorscheme = (name = null, trailingArgs = null) => {
    if (trailingArgs) {
        notify("The colorscheme command takes a single optional argument",
            "warn")
        return
    }
    if (!name) {
        notify(currentscheme)
        return
    }
    let css = readFile(expandPath(`~/.vieb/colors/${name}.css`))
    if (!css) {
        css = readFile(joinPath(appData(), `colors/${name}.css`))
    }
    if (!css) {
        css = readFile(joinPath(__dirname,
            "../colors", `${name}.css`))
    }
    if (!css) {
        notify(`Cannot find colorscheme '${name}'`, "warn")
        return
    }
    if (name === "default") {
        css = ""
    }
    const customStyleEl = document.getElementById("custom-styling")
    if (customStyleEl) {
        customStyleEl.textContent = css
    }
    ipcRenderer.send("set-custom-styling", getSetting("guifontsize"), css)
    const {setCustomStyling} = require("./settings")
    setCustomStyling(css)
    currentscheme = name
}

const restart = () => {
    ipcRenderer.send("relaunch")
    quitall()
}

/**
 * Open the development tools.
 * @param {string|null} userPosition
 * @param {string|null} trailingArgs
 */
const openDevTools = (userPosition = null, trailingArgs = null) => {
    if (trailingArgs) {
        notify("The devtools command takes a single optional argument",
            "warn")
        return
    }
    const position = userPosition || getSetting("devtoolsposition")
    const {addTab} = require("./tabs")
    const {add} = require("./pagelayout")
    if (position === "window") {
        currentPage()?.openDevTools()
    } else if (position === "tab") {
        addTab({"devtools": true})
    } else if (position === "vsplit") {
        const id = currentTab()?.getAttribute("link-id")
        if (id) {
            addTab({"devtools": true})
            add(id, "hor", getSetting("splitright"))
        }
    } else if (position === "split") {
        const id = currentTab()?.getAttribute("link-id")
        if (id) {
            addTab({"devtools": true})
            add(id, "ver", getSetting("splitbelow"))
        }
    } else {
        notify("Invalid devtools position specified, must be one of: "
            + "window, vsplit, split or tab", "warn")
    }
}

const openInternalDevTools = () => {
    ipcRenderer.send("open-internal-devtools")
}

/**
 * Open a special page using commands.
 * @param {string} specialPage
 * @param {boolean} forceNewtab
 * @param {string|null} section
 */
const openSpecialPage = (specialPage, forceNewtab, section = null) => {
    const newSpecialUrl = specialPagePath(specialPage, section)
    const url = currentPage()?.src
    const currentSpecial = pathToSpecialPageName(url ?? "")?.name
    const isNewtab = currentSpecial === "newtab"
        || (url?.replace(/\/+$/g, "") ?? "")
        === stringToUrl(getSetting("newtaburl")).replace(/\/+$/g, "")
    const replaceSpecial = getSetting("replacespecial")
    const {navigateTo, addTab} = require("./tabs")
    if (replaceSpecial === "never" || forceNewtab || !currentPage()) {
        addTab({"url": newSpecialUrl})
    } else if (replaceSpecial === "always") {
        navigateTo(newSpecialUrl)
    } else if (replaceSpecial === "special" && (currentSpecial || isNewtab)) {
        navigateTo(newSpecialUrl)
    } else if (currentSpecial === "newtab" && isNewtab) {
        navigateTo(newSpecialUrl)
    } else {
        addTab({"url": newSpecialUrl})
    }
}

/**
 * Open the help page at a specific section.
 * @param {boolean} forceNewtab
 * @param {string|null} section
 * @param {boolean} trailingArgs
 */
const help = (forceNewtab, section = null, trailingArgs = false) => {
    if (trailingArgs) {
        notify("The help command takes a single optional argument", "warn")
        return
    }
    openSpecialPage("help", forceNewtab, section)
}

const reloadconfig = () => {
    const {loadFromDisk} = require("./settings")
    loadFromDisk(false)
}

/**
 * Make a hardcopy print of a page, optionally for a range of pages.
 * @param {string} range
 */
const hardcopy = range => {
    if (range) {
        rangeToTabIdxs(range).forEach(t => {
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
 * @param {string|null} locationArg
 * @param {string} type
 * @param {Electron.WebviewTag|null} customPage
 */
const resolveFileArg = (locationArg, type, customPage = null) => {
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
            notify(`Folder '${dirname(file)}' does not exist!`, "warn")
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
 * Write the html of a page to disk, optionally a range of pages at custom loc.
 * @param {string[]} args
 * @param {string} range
 */
const write = (args, range) => {
    if (args.length > 1) {
        notify("The write command takes only a single optional argument:\n"
            + "the location where to write the page", "warn")
        return
    }
    if (range && args[0]) {
        notify("Range cannot be combined with a custom location", "warn")
        return
    }
    if (range) {
        rangeToTabIdxs(range).forEach(t => writePage(null, t))
        return
    }
    writePage(args[0])
}

/**
 * Write the html of a page to disk based on tab index or current.
 * @param {string|null} customLoc
 * @param {number|null} tabIdx
 */
const writePage = (customLoc = null, tabIdx = null) => {
    /** @type {Electron.WebviewTag|HTMLDivElement|null} */
    let page = currentPage()
    if (tabIdx !== null) {
        page = pageForTab(listTabs()[tabIdx]) ?? null
    }
    if (!page || page instanceof HTMLDivElement) {
        return
    }
    const loc = resolveFileArg(customLoc, "html", page)
    if (!loc) {
        return
    }
    const webContentsId = page.getWebContentsId()
    ipcRenderer.invoke("save-page", webContentsId, loc).then(() => {
        notify(`Page saved at '${loc}'`)
    }).catch(err => {
        notify(`Could not save the page:\n${err}`, "err")
    })
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
 * @param {string[]} args
 */
const screencopy = args => {
    if (args.length > 1) {
        notify("The screencopy command only accepts optional dimensions",
            "warn")
        return
    }
    if (args[0] && !args[0].match(/^\d+,\d+,\d+,\d+$/g)) {
        notify("Dimensions must match 'width,height,x,y' with round numbers",
            "warn")
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
 * Write the current page screen a location, optionally with custom dims.
 * @param {string[]} args
 */
const screenshot = args => {
    if (args.length > 2) {
        notify("The screenshot command takes only two optional arguments:\nthe "
            + "location where to write the image and the dimensions", "warn")
        return
    }
    let [dims, location] = args
    if (!dims?.match(/^\d+,\d+,\d+,\d+$/g)) {
        [location, dims] = args
    }
    if (dims && !dims.match(/^\d+,\d+,\d+,\d+$/g)) {
        notify("Dimensions must match 'width,height,x,y' with round numbers",
            "warn")
        return
    }
    takeScreenshot(dims, location)
}

/**
 * Write the actual page to disk based on dims and location.
 * @param {string} dims
 * @param {string} location
 */
const takeScreenshot = (dims, location) => {
    const rect = translateDimsToRect(dims)
    const loc = resolveFileArg(location, "png", currentPage())
    if (!loc) {
        return
    }
    setTimeout(() => {
        currentPage()?.capturePage(rect).then(img => {
            writeFile(loc, img.toPNG(), "Something went wrong saving the image",
                `Screenshot saved at ${loc}`)
        })
    }, 20)
}

/**
 * Make a custom viebrc config based on current settings.
 * @param {string|null} full
 * @param {boolean} trailingArgs
 */
const mkviebrc = (full = null, trailingArgs = false) => {
    if (trailingArgs) {
        notify(
            "The mkviebrc command takes a single optional argument", "warn")
        return
    }
    let exportAll = false
    if (full) {
        if (full === "full") {
            exportAll = true
        } else {
            notify(
                "The only optional argument supported is: 'full'", "warn")
            return
        }
    }
    const {saveToDisk} = require("./settings")
    saveToDisk(exportAll)
}

/**
 * Translate a partial range arg to tab index based on mathematical operations.
 * @param {number} start
 * @param {string} rangePart
 */
const translateRangePosToIdx = (start, rangePart) => {
    const [, plus] = rangePart.split("/").pop()?.split("+") ?? ["", ""]
    const [, minus] = rangePart.split("/").pop()?.split("-") ?? ["", ""]
    /** @type {(string | number)[]} */
    let [charOrNum] = rangePart.split(/[-+]/g)
    if (rangePart.split("/").length > 2) {
        const [flags] = rangePart.split("/")
        let search = rangePart.split("/").slice(1, -1).join("/")
        ;[charOrNum] = listTabs().map((t, i) => ({
            "audio": !!t.getAttribute("media-playing"),
            "idx": i,
            "name": t.querySelector("span")?.textContent,
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
            if (flags.includes("t") && !flags.includes("u")) {
                return name.includes(search)
            }
            if (flags.includes("u") && !flags.includes("t")) {
                return url.includes(search)
            }
            return name.includes(search) || url.includes(search)
        }).map(t => t.idx).filter(i => i >= start)
        if (charOrNum === undefined) {
            return listTabs().length + 10
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
    return number
}

/**
 * Get the tab indices for a given range.
 * @param {string} range
 * @param {boolean} silent
 */
const rangeToTabIdxs = (range, silent = false) => {
    if (range === "%") {
        return listTabs().map((_, i) => i)
    }
    if (range.includes(",")) {
        const [start, end, tooManyArgs] = range.split(",")
        if (tooManyArgs !== undefined) {
            if (!silent) {
                notify("Too many commas in range, at most 1 is allowed", "warn")
            }
            return []
        }
        if (start.match(/^.*g.*\/.*\/[-+]?\d?$/) || end.match(/^.*g.*\/.*\/[-+]?\d?$/)) {
            if (!silent) {
                notify("Can't combine global search with 2 indexes, either supp"
                    + "ly two indexes/searches OR use a global search", "warn")
            }
            return []
        }
        const startPos = translateRangePosToIdx(0, start)
        if (isNaN(startPos)) {
            if (!silent) {
                notify(`Range section '${start}' is not a valid range`, "warn")
            }
            return []
        }
        const endPos = translateRangePosToIdx(startPos, end)
        if (isNaN(endPos)) {
            if (!silent) {
                notify(`Range section '${end}' is not a valid range`, "warn")
            }
            return []
        }
        return listTabs().map((_, i) => i).slice(startPos, endPos + 1)
    }
    if (range.split("/").length > 2) {
        const [flags] = range.split("/")
        if (flags.includes("g")) {
            let search = range.split("/").slice(1, -1).join("/")
            return listTabs().map((t, i) => ({
                "audio": !!t.getAttribute("media-playing"),
                "idx": i,
                "name": t.querySelector("span")?.textContent,
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
                if (flags.includes("t") && !flags.includes("u")) {
                    return name.includes(search)
                }
                if (flags.includes("u") && !flags.includes("t")) {
                    return url.includes(search)
                }
                return name.includes(search) || url.includes(search)
            }).map(t => t.idx)
        }
    }
    return [translateRangePosToIdx(0, range)]
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
 * Buffer switch command, switch pages based on arguments.
 * @param {string[]} args
 */
const buffer = args => {
    if (args.length === 0) {
        return
    }
    const tab = tabForBufferArg(args)
    if (tab) {
        const {switchToTab} = require("./tabs")
        switchToTab(tab)
    } else {
        const {navigateTo} = require("./tabs")
        navigateTo(stringToUrl(args.join(" ")))
    }
}

/**
 * Open command, navigate to a url by argument, mostly useful for mappings.
 * @param {string[]} args
 */
const open = args => {
    if (args.length === 0) {
        return
    }
    const {navigateTo} = require("./tabs")
    navigateTo(stringToUrl(args.join(" ")))
}

/**
 * Suspend a page or a range of pages.
 * @param {string[]} args
 * @param {string|null} range
 */
const suspend = (args, range = null) => {
    if (range && args.length) {
        notify("Range cannot be combined with searching", "warn")
        return
    }
    if (range) {
        rangeToTabIdxs(range).forEach(t => suspend([`${t}`]))
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
            notify(
                "Only tabs not currently visible can be suspended", "warn")
        } else {
            const {suspendTab} = require("./tabs")
            suspendTab(tab)
        }
    }
}

/**
 * Hide a page or a range of pages.
 * @param {string[]} args
 * @param {string|null} range
 */
const hide = (args, range = null) => {
    if (range && args.length) {
        notify("Range cannot be combined with searching", "warn")
        return
    }
    if (range) {
        rangeToTabIdxs(range).forEach(t => hide([`${t}`]))
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
            const {"hide": h} = require("./pagelayout")
            h(pageForTab(tab))
        } else {
            notify("Only visible pages can be hidden", "warn")
        }
    }
}

/**
 * Mute a page or a range of pages.
 * @param {string[]} args
 * @param {string} range
 */
const setMute = (args, range) => {
    if (args.length !== 1 || !["true", "false"].includes(args[0])) {
        notify("Command mute! requires a single boolean argument", "warn")
        return
    }
    let targets = [currentTab()]
    if (range) {
        const tabs = listTabs()
        targets = rangeToTabIdxs(range).map(id => tabs[id])
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
 * @param {string[]} args
 * @param {string|null} range
 */
const mute = (args, range = null) => {
    if (range && args.length) {
        notify("Range cannot be combined with searching", "warn")
        return
    }
    if (range) {
        rangeToTabIdxs(range).forEach(t => mute([`${t}`]))
        return
    }
    let tab = currentTab()
    if (args.length > 0) {
        tab = tabForBufferArg(args)
    }
    if (!tab) {
        notify("Can't find matching page, no tabs (un)muted", "warn")
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
 * @param {string[]} args
 * @param {string} range
 */
const setPin = (args, range) => {
    if (args.length !== 1 || !["true", "false"].includes(args[0])) {
        notify("Command pin! requires a single boolean argument", "warn")
        return
    }
    let targets = [currentTab()]
    const tabs = listTabs()
    if (range) {
        targets = rangeToTabIdxs(range).map(id => tabs[id])
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
 * @param {string[]} args
 * @param {string} range
 */
const pin = (args, range) => {
    if (range && args.length) {
        notify("Range cannot be combined with searching", "warn")
        return
    }
    if (range) {
        const tabs = listTabs()
        const tabContainer = document.getElementById("tabs")
        const firstUnpinned = tabs.find(t => !t.classList.contains("pinned"))
        rangeToTabIdxs(range).map(id => tabs[id]).forEach(target => {
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
        notify("Can't find matching page, no tabs (un)pinned", "warn")
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
 * @param {"hor"|"ver"} method
 * @param {boolean} leftOrAbove
 * @param {string[]} args
 * @param {string|null} range
 */
const addSplit = (method, leftOrAbove, args, range = null) => {
    if (range && args.length) {
        notify("Range cannot be combined with searching", "warn")
        return
    }
    if (range) {
        rangeToTabIdxs(range).forEach(
            t => addSplit(method, leftOrAbove, [`${t}`]))
        return
    }
    const {addTab, switchToTab} = require("./tabs")
    const {add} = require("./pagelayout")
    const id = currentTab()?.getAttribute("link-id")
    if (!id) {
        return
    }
    if (args.length === 0) {
        addTab({"container": getSetting("containersplitpage")})
        add(id, method, !leftOrAbove)
        return
    }
    const tab = tabForBufferArg(args, t => !t.classList.contains("visible-tab"))
    if (tab) {
        if (tab.classList.contains("visible-tab")) {
            notify("Page is already visible", "warn")
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
            "url": stringToUrl(args.join(" "))
        })
        add(id, method, !leftOrAbove)
    }
}

/**
 * Close a page or a custom one with ranges/arguments.
 * @param {boolean} force
 * @param {string[]} args
 * @param {string} range
 */
const close = (force, args, range) => {
    if (range && args.length) {
        notify("Range cannot be combined with searching", "warn")
        return
    }
    const {closeTab} = require("./tabs")
    if (range) {
        const tabs = listTabs()
        rangeToTabIdxs(range).map(id => tabs[id]).forEach(target => {
            closeTab(listTabs().indexOf(target), force)
        })
        return
    }
    if (args.length === 0) {
        closeTab(null, force)
        return
    }
    const tab = tabForBufferArg(args)
    if (tab) {
        closeTab(listTabs().indexOf(tab), force)
        return
    }
    notify("Can't find matching page, no tabs closed", "warn")
}

/**
 * Call command, run any mapstring immediately.
 * @param {string[]} args
 */
const callAction = args => {
    setTimeout(() => {
        const {executeMapString, sanitiseMapString} = require("./input")
        executeMapString(sanitiseMapString(args.join(" "), true), true, true)
    }, 5)
}

/**
 * Log command errors.
 * @param {import("child_process").ExecException|null} err
 */
const logError = err => {
    if (err?.message) {
        notify(`Script to set Vieb as the default browser failed:\n${
            err.message}`, "err")
    }
}

const makedefault = () => {
    if (process.execPath.endsWith("electron")) {
        notify("Command only works for installed versions of Vieb", "err")
        return
    }
    ipcRenderer.send("make-default-app")
    if (process.platform === "linux" || process.platform.includes("bsd")) {
        execCommand(
            "xdg-settings set default-web-browser vieb.desktop", logError)
    } else if (process.platform === "win32") {
        const scriptContents = readFile(joinPath(
            __dirname, "../defaultapp/windows.bat"))
        const tempFile = joinPath(appData(), "defaultapp.bat")
        if (scriptContents) {
            writeFile(tempFile, scriptContents)
        }
        execCommand(`Powershell Start ${tempFile} -ArgumentList `
            + `"""${process.execPath}""" -Verb Runas`, logError)
    } else if (process.platform === "darwin") {
        // Electron API should be enough to show a popup for default app request
    } else {
        notify("If you didn't get a notification to set Vieb as your defau"
            + "lt browser, this command does not work for this OS.", "warn")
    }
}

const lclose = (force = false) => {
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
        closeTab(index - 1, force)
    }
}

const rclose = (force = false) => {
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
        closeTab(count - 1, force)
    }
}

/**
 * Run custom JS in the page or a range of pages.
 * @param {string} raw
 * @param {string} range
 */
const runjsinpage = (raw, range) => {
    let javascript = raw.split(" ").slice(1).join(" ")
    const filePath = expandPath(javascript)
    if (isAbsolutePath(filePath)) {
        javascript = readFile(filePath) || javascript
    }
    if (range) {
        rangeToTabIdxs(range).forEach(tabId => {
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
 * @param {string|null} session
 * @param {string|null} url
 */
const tabnew = (session = null, url = null) => {
    const {addTab} = require("./tabs")
    /** @type {{url?: string, session?: string}} */
    const options = {}
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
 * @param {string[]} args
 */
const marks = args => {
    if (args.length > 2) {
        notify("Command marks only accepts a maxmimum of two args", "warn")
        return
    }
    if (args.length === 2) {
        const {makeMark} = require("./actions")
        if (isUrl(args[1])) {
            makeMark({"key": args[0], "url": args[1]})
        } else {
            notify(`Mark url must be a valid url: ${args[1]}`, "warn")
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
            notify("No marks found for current keys", "warn")
        } else {
            notify("No marks found", "warn")
        }
    } else {
        notify(relevantMarks.join("\n"))
    }
}

/**
 * Restore a mark.
 * @param {string[]} args
 */
const restoremark = args => {
    if (args.length > 2) {
        notify("Command restoremark only accepts up to two args", "warn")
        return
    }
    if (args.length === 0) {
        notify("Command restoremark requires at least one key argument", "warn")
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
        restoreMark({key, position})
    } else {
        notify("Invalid mark restore position, must be one of: "
            + `${validOptions.markpositionshifted.join(", ")}`, "warn")
    }
}

/**
 * Delete marks.
 * @param {boolean} all
 * @param {string[]} args
 */
const delmarks = (all, args) => {
    if (all && args.length) {
        notify("Command takes no arguments: delmarks!", "warn")
        return
    }
    const qm = readJSON(joinPath(appData(), "quickmarks")) ?? {}
    if (all) {
        qm.marks = {}
        writeJSON(joinPath(appData(), "quickmarks"), qm)
        return
    }
    if (args.length !== 1) {
        notify("Command delmarks only accepts a single keyname", "warn")
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
 * @param {string[]} args
 */
const scrollpos = args => {
    if (args.length > 3) {
        notify("Command scrollpos only accepts a maxmimum of three args",
            "warn")
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
                notify("Command scrollpos requires at least one pixels "
                    + "arg after the key", "warn")
                return
            }
        }
        if (pixels !== undefined) {
            pixels = Number(pixels)
        }
        storeScrollPos({key, path, pixels})
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
            notify("No scroll positions found for current keys", "warn")
        } else {
            notify("No scroll positions found", "warn")
        }
    } else {
        notify(relevantPos.join("\n"))
    }
}

/**
 * Restore a scroll position.
 * @param {string[]} args
 */
const restorescrollpos = args => {
    if (args.length > 2) {
        notify("Command restorescrollpos only accepts up to two args", "warn")
        return
    }
    if (args.length === 0) {
        notify("Command restorescrollpos requires at least one key argument",
            "warn")
        return
    }
    const {restoreScrollPos} = require("./actions")
    const [key, path] = args
    restoreScrollPos({key, path})
}

/**
 * Delete a scroll position.
 * @param {boolean} all
 * @param {string[]} args
 */
const delscrollpos = (all, args) => {
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
            notify("Command delscrollpos! only accepts a single path", "warn")
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
        notify("Command delscrollpos requires at least the key", "warn")
        return
    }
    if (args.length > 2) {
        notify("Command delscrollpos only accepts a key and an optional path",
            "warn")
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
 * @param {string[]} args
 */
const pointerpos = args => {
    if (args.length > 4) {
        notify("Command pointerpos only accepts a maxmimum of three args",
            "warn")
        return
    }
    if (args.length > 1) {
        const {storePos} = require("./pointer")
        const [key, x, y, path] = args
        const location = {"x": Number(x), "y": Number(y)}
        if (isNaN(location.x) || isNaN(location.y)) {
            notify("Command pointerpos requires the x and y "
                + "location after the key", "warn")
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
            notify("No pointer positions found for current keys", "warn")
        } else {
            notify("No pointer positions found", "warn")
        }
    } else {
        notify(relevantPos.join("\n"))
    }
}

/**
 * Restore the pointer position.
 * @param {string[]} args
 */
const restorepointerpos = args => {
    if (args.length > 2) {
        notify("Command restorepointerpos only accepts up to two args", "warn")
        return
    }
    if (args.length === 0) {
        notify("Command restorepointerpos requires at least one key argument",
            "warn")
        return
    }
    const {restorePos} = require("./pointer")
    const [key, path] = args
    restorePos({key, path})
}

/**
 * Delete a pointer position.
 * @param {boolean} all
 * @param {string[]} args
 */
const delpointerpos = (all, args) => {
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
            notify("Command delpointerpos! only accepts a single path", "warn")
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
        notify("Command delpointerpos requires at least the key", "warn")
        return
    }
    if (args.length > 2) {
        notify("Command delpointerpos only accepts a key and an optional path",
            "warn")
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
 * @param {string[]} args
 */
const translatepage = args => {
    if (args.length > 1) {
        notify("Command translatepage only accepts a single optional language",
            "warn")
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
        notify("API key not set, see ':h translatekey' for help", "warn")
        return
    }
    const {validOptions} = require("./settings")
    let [lang] = args
    if (lang && !validOptions.translatelang.includes(lang.toLowerCase())) {
        notify("Invalid language supplied, see ':h translatelang' for help",
            "warn")
        return
    }
    lang = lang?.toLowerCase() ?? getSetting("translatelang")
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
 * @param {string} type
 * @param {string} interval
 * @param {string|null} trailingArgs
 */
const clear = (type, interval, trailingArgs = null) => {
    if (trailingArgs) {
        notify("The clear command takes at most two arguments: "
            + "a type and optionally an interval", "warn")
        return
    }
    if (!type) {
        notify("The clear command requires a type argument to clear", "warn")
        return
    }
    if (!interval) {
        notify("The clear command interval is required", "warn")
        return
    }
    if (!["history"].includes(type)) {
        notify("The clear command type must be one of: "
            + "history", "warn")
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
            notify("The clear command interval must be all, a valid url or a "
                + "valid interval, such as 1day, or inverted like last3hours")
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
    "only"
]
/** @type {{
 *   [command: string]: (props: {
 *     args: string[], range: string, raw: string
 *   }) => void
 * }} */
const commands = {
    "Sexplore": ({args, range}) => addSplit(
        "ver", !getSetting("splitbelow"), args, range),
    "Vexplore": ({args, range}) => addSplit(
        "hor", !getSetting("splitright"), args, range),
    "b": ({args}) => buffer(args),
    "buffer": ({args}) => buffer(args),
    "call": ({args}) => callAction(args),
    "clear": ({args}) => clear(args[0], args[1], args[2]),
    "close": ({args, range}) => close(false, args, range),
    "close!": ({args, range}) => close(true, args, range),
    "colorscheme": ({args}) => colorscheme(...args),
    "comclear": () => {
        userCommands = {}
    },
    "command": ({args}) => addCommand(false, args),
    "command!": ({args}) => addCommand(true, args),
    "cookies": () => openSpecialPage("cookies", false),
    "cookies!": () => openSpecialPage("cookies", true),
    "d": () => openSpecialPage("downloads", false),
    "d!": () => openSpecialPage("downloads", true),
    "delcommand": ({args}) => deleteCommand(args),
    "delmarks": ({args}) => delmarks(false, args),
    "delmarks!": ({args}) => delmarks(true, args),
    "delpointerpos": ({args}) => delpointerpos(false, args),
    "delpointerpos!": ({args}) => delpointerpos(true, args),
    "delscrollpos": ({args}) => delscrollpos(false, args),
    "delscrollpos!": ({args}) => delscrollpos(true, args),
    "devtools": ({args}) => openDevTools(...args),
    "downloads": () => openSpecialPage("downloads", false),
    "downloads!": () => openSpecialPage("downloads", true),
    "h": ({args}) => help(false, ...args),
    "h!": ({args}) => help(true, ...args),
    "hardcopy": ({range}) => hardcopy(range),
    "help": ({args}) => help(false, ...args),
    "help!": ({args}) => help(true, ...args),
    "hide": ({args, range}) => hide(args, range),
    "history": () => openSpecialPage("history", false),
    "history!": () => openSpecialPage("history", true),
    "internaldevtools": openInternalDevTools,
    "lclose": () => lclose(),
    "lclose!": () => lclose(true),
    makedefault,
    "marks": ({args}) => marks(args),
    "mkviebrc": ({args}) => mkviebrc(...args),
    "mute": ({args, range}) => mute(args, range),
    "mute!": ({args, range}) => setMute(args, range),
    "nohlsearch": () => {
        listRealPages().forEach(page => page.stopFindInPage("clearSelection"))
    },
    "notifications": () => openSpecialPage("notifications", false),
    "notifications!": () => openSpecialPage("notifications", true),
    "o": ({args}) => open(args),
    "only": () => {
        const {only} = require("./pagelayout")
        only()
    },
    "open": ({args}) => open(args),
    "pin": ({args, range}) => pin(args, range),
    "pin!": ({args, range}) => setPin(args, range),
    "pointerpos": ({args}) => pointerpos(args),
    "print": ({range}) => hardcopy(range),
    "q": ({range}) => quit(range),
    "qa": quitall,
    "quit": ({range}) => quit(range),
    quitall,
    "rclose": () => rclose(),
    "rclose!": () => rclose(true),
    reloadconfig,
    restart,
    "restoremark": ({args}) => restoremark(args),
    "restorepointerpos": ({args}) => restorepointerpos(args),
    "restorescrollpos": ({args}) => restorescrollpos(args),
    "runjsinpage": ({raw, range}) => runjsinpage(raw, range),
    "s": ({args}) => set(args),
    "screencopy": ({args}) => screencopy(args),
    "screenshot": ({args}) => screenshot(args),
    "scriptnames": ({args}) => {
        if (args?.length) {
            notify("Command takes no arguments: scriptnames", "warn")
            return
        }
        notify(appConfig()?.files.map(
            (f, i) => `${i + 1}: ${f}`).join("\n") ?? "")
    },
    "scriptnames!": ({args}) => {
        const scripts = [...appConfig()?.files ?? [], ...sourcedFiles]
        if (args.length === 0) {
            notify(scripts.map((f, i) => `${i + 1}: ${f}`).join("\n"))
        } else if (args.length === 1) {
            const number = Number(args[0])
            if (isNaN(number)) {
                notify("Scriptnames argument must be a number for a script",
                    "warn")
                return
            }
            const script = scripts[number - 1]
            if (!script) {
                notify("No script found with that index, see ':scriptnames!'",
                    "warn")
                return
            }
            execCommand(`${getSetting("vimcommand")} "${script}"`, err => {
                if (err) {
                    notify("Command to edit files with vim failed, "
                        + "please update the 'vimcommand' setting", "err")
                }
            })
        } else {
            notify("Scriptnames with the ! added takes one optional argument",
                "warn")
        }
    },
    "scrollpos": ({args}) => scrollpos(args),
    "set": ({args}) => set(args),
    "source": ({args}) => source(null, args),
    "split": ({args, range}) => addSplit(
        "ver", !getSetting("splitbelow"), args, range),
    "suspend": ({args, range}) => suspend(args, range),
    "tabnew": ({raw}) => tabnew(null, raw.split(" ").slice(1).join(" ")),
    "tabnewcontainer": ({raw}) => tabnew(raw.split(" ")[1],
        raw.split(" ").slice(2).join(" ")),
    "translatepage": ({args}) => translatepage(args),
    "v": () => openSpecialPage("version", false),
    "v!": () => openSpecialPage("version", true),
    "version": () => openSpecialPage("version", false),
    "version!": () => openSpecialPage("version", true),
    "vsplit": ({args, range}) => addSplit(
        "hor", !getSetting("splitright"), args, range),
    "w": ({args, range}) => write(args, range),
    "write": ({args, range}) => write(args, range)
}
/** @type {string[]} */
const holdUseCommands = ["command"]
/** @type {{[command: string]: string}} */
let userCommands = {}
const {mapOrList, unmap, clearmap} = require("./input")
" nicsefpvm".split("").forEach(prefix => {
    commands[`${prefix.trim()}map!`] = ({args}) => {
        mapOrList(prefix.trim(), args, false, true)
    }
    commands[`${prefix.trim()}noremap!`] = ({args}) => {
        mapOrList(prefix.trim(), args, true, true)
    }
    holdUseCommands.push(`${prefix.trim()}map`)
    commands[`${prefix.trim()}map`] = ({args}) => {
        mapOrList(prefix.trim(), args)
    }
    noEscapeCommands.push(`${prefix.trim()}map`)
    commands[`${prefix.trim()}noremap`] = ({args}) => {
        mapOrList(prefix.trim(), args, true)
    }
    noEscapeCommands.push(`${prefix.trim()}noremap`)
    commands[`${prefix.trim()}unmap`] = ({args}) => {
        unmap(prefix.trim(), args)
    }
    noEscapeCommands.push(`${prefix.trim()}unmap`)
    commands[`${prefix.trim()}mapclear`] = () => {
        clearmap(prefix.trim())
    }
    noArgumentComands.push(`${prefix.trim()}mapclear`)
    commands[`${prefix.trim()}mapclear!`] = () => {
        clearmap(prefix.trim(), true)
    }
})

/**
 * Add a new command, or optionally overwrite existing custom commands.
 * @param {boolean} overwrite
 * @param {string[]} args
 */
const addCommand = (overwrite, args) => {
    if (overwrite && args.length < 2) {
        notify("Can't combine ! with reading a value", "warn")
        return
    }
    if (args.length === 0) {
        const commandString = Object.keys(userCommands).map(
            c => `${c} => ${userCommands[c]}`).join("\n").trim()
        if (commandString) {
            notify(`--- User defined commands ---\n${commandString}`)
        } else {
            notify("There are no user defined commands")
        }
        return
    }
    const command = args[0].replace(/^[:'" ]*/, "")
    if (command.includes("/") || command.includes("\\")) {
        notify("Command name cannot contain any slashes", "warn")
        return
    }
    if (command[0]?.match(specialChars) || command[0]?.match(/\d+/g)) {
        notify("Command name cannot start with a number or special character",
            "warn")
        return
    }
    const params = args.slice(1)
    if (commands[command]) {
        notify(`Command can not be a built-in command: ${command}`, "warn")
        return
    }
    if (params.length === 0) {
        if (userCommands[command]) {
            notify(`${command} => ${userCommands[command]}`)
        } else {
            notify(`Not an editor command: ${command}`, "warn")
        }
        return
    }
    if (!overwrite && userCommands[command]) {
        notify(
            "Duplicate custom command definition (add ! to overwrite)", "warn")
        return
    }
    const {sanitiseMapString} = require("./input")
    userCommands[command] = sanitiseMapString(params.join(" "), true)
}

/**
 * Delete a custom command.
 * @param {string[]} args
 */
const deleteCommand = args => {
    if (args.length !== 1) {
        notify(
            "Exactly one command name is required for delcommand", "warn")
        return
    }
    const command = args[0].replace(/^[:'" ]*/, "")
    if (userCommands[command]) {
        delete userCommands[args[0]]
    } else {
        notify(`No such user defined command: ${command}`, "warn")
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
    const args = []
    let currentArg = ""
    let escapedDouble = false
    let escapedSingle = false
    const noEscape = noEscapeCommands.includes(command)
    for (const char of argsString) {
        if (char === "'" && !escapedDouble && !noEscape) {
            escapedSingle = !escapedSingle
            continue
        }
        if (char === "\"" && !escapedSingle && !noEscape) {
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
    if (currentArg) {
        args.push(currentArg)
    }
    let confirm = false
    if (command.endsWith("!") && !command.endsWith("!!")) {
        confirm = true
        command = command.slice(0, -1)
    }
    return {
        args,
        command,
        confirm,
        range,
        "valid": !escapedSingle && !escapedDouble && !command.includes("\\")
    }
}

/**
 * Execute a command.
 * @param {string} com
 * @param {string|null} settingsFile
 */
const execute = (com, settingsFile = null) => {
    // Remove all redundant spaces
    // Allow commands prefixed with :
    // And return if the command is empty
    let commandStr = com.replace(/^[\s|:]*/, "").trim().replace(/ +/g, " ")
    if (!commandStr) {
        return
    }

    // Don't "use current" on holdUseCommands, commands like 'command' or 'map'
    // which will hold <useCurrent... for calling it when it is used
    // otherwise they will always use the same value at creation
    if (commandStr.includes("<use")
        && !holdUseCommands.some(command => commandStr.startsWith(command))) {
        const {useCurrentUrl, useCurrentOrigin} = require("./actions")
        // Replace all occurrences of <useCurrent for their values
        commandStr
            = commandStr
                .replace("<useCurrentUrl>", `${useCurrentUrl()}`)
                .replace("<useCurrentOrigin>", `${useCurrentOrigin()}`)
    }

    const {push} = require("./commandhistory")
    push(commandStr)
    if (commandStr.startsWith("!")) {
        if (commandStr !== "!") {
            execCommand(commandStr.replace("!", ""), (err, stdout) => {
                const reportExit = getSetting("notificationforsystemcommands")
                if (err && reportExit !== "none") {
                    notify(`${err}`, "err")
                } else if (reportExit === "all") {
                    notify(stdout.toString()
                        || "Command exitted successfully!", "suc")
                }
            })
        }
        return
    }
    const p = parseAndValidateArgs(commandStr)
    let {command} = p
    const {range, args, valid, confirm} = p
    if (!valid) {
        notify(
            "Command could not be executed, unmatched quotes or backslash:"
            + `\n${commandStr}`, "warn")
        return
    }
    const matches = Object.keys(commands).concat(Object.keys(userCommands))
        .filter(c => c.startsWith(command) && !c.endsWith("!"))
    if (matches.length === 1 || commands[command] || userCommands[command]) {
        if (matches.length === 1) {
            [command] = matches
        }
        if (command === "source" && settingsFile) {
            source(settingsFile, args)
        } else if (noArgumentComands.includes(command) && args.length > 0) {
            notify(`Command takes no arguments: ${command}`, "warn")
        } else if (commands[command]) {
            if (!rangeCompatibleCommands.includes(command) && range) {
                notify(`Command does not accept a range: ${command}`, "warn")
                return
            }
            if (confirm) {
                command += "!"
                if (!commands[command]) {
                    notify("No ! allowed", "warn")
                    return
                }
            }
            commands[command]({args, range, "raw": com})
        } else {
            setTimeout(() => {
                const {executeMapString} = require("./input")
                executeMapString(userCommands[command], true, true)
            }, 5)
        }
    } else if (matches.length > 1) {
        notify(
            `Command is ambiguous, please be more specific: ${command}`, "warn")
    } else {
        notify(`Not an editor command: ${command}`, "warn")
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
    openSpecialPage,
    parseAndValidateArgs,
    rangeCompatibleCommands,
    rangeToTabIdxs
}
