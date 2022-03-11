/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2022 Jelmer van Arnhem
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
    domainName
} = require("../util")
const {
    listTabs, listPages, currentTab, currentPage, tabOrPageMatching, getSetting
} = require("./common")

const listSetting = setting => {
    if (setting === "all") {
        const {listCurrentSettings} = require("./settings")
        notify(`--- Options ---\n${listCurrentSettings(true)}`)
        return
    }
    const value = getSetting(setting)
    if (value === undefined) {
        notify(`The setting '${setting}' doesn't exist`, "warn")
    } else {
        notify(`The setting '${setting}' has the value '${value}'`)
    }
}

const splitSettingAndValue = (part, seperator) => {
    const [setting] = part.split(seperator)
    const value = part.split(seperator).slice(1).join(seperator)
    return [setting, value]
}

const modifyListOrNumber = (setting, value, method) => {
    const isNumber = typeof getSetting(setting) === "number"
    const {freeText, listLike, set} = require("./settings")
    const isFreeText = freeText.includes(setting)
    const isListLike = listLike.includes(setting)
    if (!isNumber && !isFreeText && !isListLike) {
        notify(
            `Can't modify '${setting}' as if it were a number or list`, "warn")
        return
    }
    if (method === "append") {
        if (isListLike) {
            set(setting, `${getSetting(setting)},${value}`)
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
            let current = getSetting(setting).split(",")
            if (setting === "mouse" && current?.[0] === "all") {
                const {mouseFeatures} = require("./settings")
                current = mouseFeatures
            }
            const newValue = current.filter(e => e && e !== value).join(",")
            set(setting, newValue)
        }
        if (isNumber) {
            set(setting, getSetting(setting) - Number(value))
        }
        if (isFreeText) {
            set(setting, getSetting(setting).replace(value, ""))
        }
    }
    if (method === "special") {
        if (isListLike) {
            set(setting, `${value},${getSetting(setting)}`)
        }
        if (isNumber) {
            set(setting, getSetting(setting) * Number(value))
        }
        if (isFreeText) {
            set(setting, value + getSetting(setting))
        }
    }
}

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
    for (const part of args) {
        if ((/^\w+\+=/).test(part)) {
            modifyListOrNumber(...splitSettingAndValue(part, "+="), "append")
        } else if ((/^\w+-=/).test(part)) {
            modifyListOrNumber(...splitSettingAndValue(part, "-="), "remove")
        } else if ((/^\w+\^=/).test(part)) {
            modifyListOrNumber(...splitSettingAndValue(part, "^="), "special")
        } else if ((/^\w+=/).test(part)) {
            const {"set": s} = require("./settings")
            s(...splitSettingAndValue(part, "="))
        } else if ((/^\w+:/).test(part)) {
            const {"set": s} = require("./settings")
            s(...splitSettingAndValue(part, ":"))
        } else if (part.includes("=") || part.includes(":")) {
            notify(
                `The setting '${part.replace(/[+-^:=].*/, "")}' contains `
                + "invalid characters", "warn")
        } else if (part.endsWith("&")) {
            const {reset} = require("./settings")
            reset(part.slice(0, -1))
        } else if (part.endsWith("!")) {
            const setting = part.slice(0, -1)
            const value = getSetting(setting)
            const {"set": s, validOptions} = require("./settings")
            if (["boolean", "undefined"].includes(typeof value)) {
                s(setting, String(!value))
            } else if (validOptions[setting]) {
                const index = validOptions[setting].indexOf(value)
                s(setting, validOptions[setting][index + 1]
                    || validOptions[setting][0])
            } else {
                notify(
                    `The setting '${setting}' can not be flipped`, "warn")
            }
        } else if (part.endsWith("?")) {
            listSetting(part.slice(0, -1))
        } else if (typeof getSetting(part) === "boolean") {
            const {"set": s} = require("./settings")
            s(part, "true")
        } else if (part.startsWith("inv")) {
            const value = getSetting(part.replace("inv", ""))
            if (typeof value === "boolean") {
                const {"set": s} = require("./settings")
                s(part.replace("inv", ""), String(!value))
            } else {
                listSetting(part)
            }
        } else if (part.startsWith("no")) {
            const value = getSetting(part.replace("no", ""))
            const {"set": s, listLike} = require("./settings")
            if (typeof value === "boolean") {
                s(part.replace("no", ""), "false")
            } else if (listLike.includes(part.replace("no", ""))) {
                s(part.replace("no", ""), "")
            } else {
                listSetting(part)
            }
        } else {
            listSetting(part)
        }
    }
}

const sourcedFiles = []

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
    if ([appConfig().override, appConfig().files].includes(absFile)) {
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

const quit = () => {
    if (document.getElementById("tabs").classList.contains("multiple")) {
        const {closeTab} = require("./tabs")
        closeTab()
    } else {
        quitall()
    }
}

const quitall = () => {
    const {ipcRenderer} = require("electron")
    ipcRenderer.send("hide-window")
    if (getSetting("clearhistoryonquit")) {
        deleteFile(joinPath(appData(), "hist"))
    } else {
        const {writeHistToFile} = require("./history")
        writeHistToFile(true)
    }
    const {saveTabs} = require("./tabs")
    saveTabs()
    document.getElementById("pages").innerHTML = ""
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
    updateMappings()
    ipcRenderer.send("destroy-window")
}

let currentscheme = "default"
const colorscheme = (name = null, trailingArgs = false) => {
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
    document.getElementById("custom-styling").textContent = css
    const {ipcRenderer} = require("electron")
    ipcRenderer.send("set-custom-styling", getSetting("fontsize"), css)
    const {setCustomStyling} = require("./settings")
    setCustomStyling(css)
    currentscheme = name
}

const restart = () => {
    const {ipcRenderer} = require("electron")
    ipcRenderer.send("relaunch")
    quitall()
}

const openDevTools = (userPosition = null, trailingArgs = false) => {
    if (trailingArgs) {
        notify("The devtools command takes a single optional argument",
            "warn")
        return
    }
    const position = userPosition || getSetting("devtoolsposition")
    if (position === "window") {
        currentPage()?.openDevTools()
    } else if (position === "tab") {
        const {addTab} = require("./tabs")
        addTab({"devtools": true})
    } else if (position === "vsplit") {
        const {addTab} = require("./tabs")
        const id = currentTab().getAttribute("link-id")
        addTab({"devtools": true})
        const {add} = require("./pagelayout")
        add(id, "hor", getSetting("splitright"))
    } else if (position === "split") {
        const {addTab} = require("./tabs")
        const id = currentTab().getAttribute("link-id")
        addTab({"devtools": true})
        const {add} = require("./pagelayout")
        add(id, "ver", getSetting("splitbelow"))
    } else {
        notify("Invalid devtools position specified, must be one of: "
            + "window, vsplit, split or tab", "warn")
    }
}

const openInternalDevTools = () => {
    const {ipcRenderer} = require("electron")
    ipcRenderer.send("open-internal-devtools")
}

const openSpecialPage = (specialPage, section = null) => {
    // Open the url in the current or new tab, depending on currently open page
    const pageUrl = specialPagePath(specialPage, section)
    const isNewtab = pathToSpecialPageName(currentPage()?.src).name === "newtab"
        || currentPage()?.src.replace(/\/+$/g, "")
        === stringToUrl(getSetting("newtaburl")).replace(/\/+$/g, "")
    if (currentPage() && !currentPage().isLoading() && isNewtab) {
        const {navigateTo} = require("./tabs")
        navigateTo(pageUrl)
    } else {
        const {addTab} = require("./tabs")
        addTab({"url": pageUrl})
    }
}

const help = (section = null, trailingArgs = false) => {
    if (trailingArgs) {
        notify("The help command takes a single optional argument", "warn")
        return
    }
    openSpecialPage("help", section)
}

const reloadconfig = () => {
    const {loadFromDisk} = require("./settings")
    loadFromDisk()
}

const hardcopy = range => {
    if (range) {
        rangeToTabIdxs(range).forEach(t => tabOrPageMatching(listTabs()[t])
            .send("action", "print"))
        return
    }
    currentPage()?.send("action", "print")
}

const resolveFileArg = (locationArg, type, customPage = null) => {
    const page = customPage || currentPage()
    const tab = tabOrPageMatching(page)
    const name = `${tab.querySelector("span").textContent.replace(
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

const writePage = (customLoc, tabIdx) => {
    let page = currentPage()
    if (tabIdx !== null) {
        page = tabOrPageMatching(listTabs()[tabIdx])
    }
    if (!page) {
        return
    }
    if (!page) {
        return
    }
    const loc = resolveFileArg(customLoc, "html", page)
    if (!loc) {
        return
    }
    const webContentsId = page.getWebContentsId()
    const {ipcRenderer} = require("electron")
    ipcRenderer.invoke("save-page", webContentsId, loc).then(() => {
        notify(`Page saved at '${loc}'`)
    }).catch(err => {
        notify(`Could not save the page:\n${err}`, "err")
    })
}

const translateDimsToRect = dims => {
    if (!dims) {
        return undefined
    }
    const rect = {
        "height": Number(dims.split(",")[1]),
        "width": Number(dims.split(",")[0]),
        "x": Number(dims.split(",")[2]),
        "y": Number(dims.split(",")[3])
    }
    const pageWidth = propPixels(currentPage().style, "width")
    const pageHeight = propPixels(currentPage().style, "height")
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
        currentPage().capturePage(rect).then(img => {
            const {nativeImage, clipboard} = require("electron")
            clipboard.writeImage(nativeImage.createFromBuffer(img.toPNG()))
        })
    }, 20)
}

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

const takeScreenshot = (dims, location, tabIdx = null) => {
    let page = currentPage()
    if (tabIdx !== null) {
        page = tabOrPageMatching(listTabs()[tabIdx])
    }
    if (!page) {
        return
    }
    const rect = translateDimsToRect(dims)
    const loc = resolveFileArg(location, "png", page)
    if (!loc) {
        return
    }
    setTimeout(() => {
        page.capturePage(rect).then(img => {
            writeFile(loc, img.toPNG(), "Something went wrong saving the image",
                `Screenshot saved at ${loc}`)
        })
    }, 20)
}

const mkviebrc = (full = false, trailingArgs = false) => {
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

const translateRangePosToIdx = (start, rangePart) => {
    const [, plus] = rangePart.split("/").pop().split("+")
    const [, minus] = rangePart.split("/").pop().split("-")
    let [charOrNum] = rangePart.split(/[-+]/g)
    if (rangePart.split("/").length > 2) {
        const [flags] = rangePart.split("/")
        let search = rangePart.split("/").slice(1, -1).join("/")
        ;[charOrNum] = listTabs().map((t, i) => ({
            "idx": i,
            "name": t.querySelector("span").textContent,
            "url": tabOrPageMatching(t).src
        })).filter(t => {
            let name = String(t.name)
            let url = String(t.url)
            if (flags.includes("i")) {
                search = search.toLowerCase()
                name = name.toLowerCase()
                url = url.toLowerCase()
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
    if (charOrNum === ".") {
        number = listTabs().indexOf(currentTab())
    }
    if (charOrNum === "$") {
        number = listTabs().length - 1
    }
    if (plus) {
        if (charOrNum || rangePart.split("/").length > 2) {
            number += Number(plus)
        } else {
            number = listTabs().indexOf(currentTab()) + Number(plus)
        }
    }
    if (minus) {
        if (charOrNum || rangePart.split("/").length > 2) {
            number -= Number(minus)
        } else {
            number = listTabs().indexOf(currentTab()) - Number(minus)
        }
    }
    return number
}

const rangeToTabIdxs = range => {
    if (range === "%") {
        return listTabs().map((_, i) => i)
    }
    if (range.includes(",")) {
        const [start, end, tooManyArgs] = range.split(",")
        if (tooManyArgs !== undefined) {
            notify("Too many commas in range, at most 1 is allowed", "warn")
            return []
        }
        if (start.match(/^.*g.*\/.*\/[-+]?\d?$/) || end.match(/^.*g.*\/.*\/[-+]?\d?$/)) {
            notify("Can't combine global search with 2 indexes, either supply"
                + " two indexes/searches OR use a global search", "warn")
            return []
        }
        const startPos = translateRangePosToIdx(0, start)
        if (isNaN(startPos)) {
            notify(`Range section '${start}' is not a valid range`, "warn")
            return []
        }
        const endPos = translateRangePosToIdx(startPos, end)
        if (isNaN(endPos)) {
            notify(`Range section '${end}' is not a valid range`, "warn")
            return []
        }
        return listTabs().map((_, i) => i).slice(startPos, endPos + 1)
    }
    if (range.split("/").length > 2) {
        const [flags] = range.split("/")
        if (flags.includes("g")) {
            let search = range.split("/").slice(1, -1).join("/")
            return listTabs().map((t, i) => ({
                "idx": i,
                "name": t.querySelector("span").textContent,
                "url": tabOrPageMatching(t).src
            })).filter(t => {
                let name = String(t.name)
                let url = String(t.url)
                if (flags.includes("i")) {
                    search = search.toLowerCase()
                    name = name.toLowerCase()
                    url = url.toLowerCase()
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
    return [translateRangePosToIdx(0, range, true)]
}

const tabForBufferArg = (args, filter = null) => {
    if (args.length === 1 || typeof args === "number") {
        let number = Number(args[0] || args)
        if (!isNaN(number)) {
            const tabs = listTabs()
            if (number >= tabs.length) {
                return tabs.pop()
            }
            if (number < 0) {
                number += tabs.length
            }
            return tabs[number] || tabs[0]
        }
        if ((args[0] || args) === "#") {
            const {getLastTabId} = require("./pagelayout")
            return document.querySelector(
                `#tabs span[link-id='${getLastTabId()}']`)
        }
    }
    const simpleSearch = args.join("").replace(specialChars, "").toLowerCase()
    return listTabs().filter(t => !filter || filter(t)).find(t => {
        const simpleTabUrl = tabOrPageMatching(t).src
            .replace(specialChars, "").toLowerCase()
        if (simpleTabUrl.includes(simpleSearch)) {
            return true
        }
        const simpleTitle = t.querySelector("span").textContent
            .replace(specialChars, "").toLowerCase()
        return simpleTitle.includes(simpleSearch)
    })
}

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

const open = args => {
    if (args.length === 0) {
        return
    }
    const {navigateTo} = require("./tabs")
    navigateTo(stringToUrl(args.join(" ")))
}

const suspend = (args, range) => {
    if (range && args.length) {
        notify("Range cannot be combined with providing arguments", "warn")
        return
    }
    if (range) {
        rangeToTabIdxs(range).forEach(t => suspend(t))
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

const hide = (args, range) => {
    if (range && args.length) {
        notify("Range cannot be combined with providing arguments", "warn")
        return
    }
    if (range) {
        rangeToTabIdxs(range).forEach(t => hide(t))
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
            h(tabOrPageMatching(tab))
        } else {
            notify("Only visible pages can be hidden", "warn")
        }
    }
}

const mute = (args, range) => {
    if (range && args.length) {
        notify("Range cannot be combined with providing arguments", "warn")
        return
    }
    if (range) {
        rangeToTabIdxs(range).forEach(t => mute(t))
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
    tabOrPageMatching(tab).setAudioMuted(!!tab.getAttribute("muted"))
    const {saveTabs} = require("./tabs")
    saveTabs()
}

const pin = (args, range) => {
    if (range && args.length) {
        notify("Range cannot be combined with providing arguments", "warn")
        return
    }
    if (range) {
        rangeToTabIdxs(range).forEach(t => pin(t))
        return
    }
    let tab = currentTab()
    if (args.length > 0) {
        tab = tabForBufferArg(args)
    }
    if (!tab) {
        notify("Can't find matching page, no tabs (un)pinned", "warn")
        return
    }
    const tabContainer = document.getElementById("tabs")
    if (tab.classList.contains("pinned")) {
        tabContainer.insertBefore(tab, listTabs().find(
            t => !t.classList.contains("pinned")))
        tab.classList.remove("pinned")
    } else {
        tab.classList.add("pinned")
        tabContainer.insertBefore(tab, listTabs().find(
            t => !t.classList.contains("pinned")))
    }
    const {saveTabs} = require("./tabs")
    saveTabs()
}

const addSplit = (method, leftOrAbove, args, range) => {
    if (range && args.length) {
        notify("Range cannot be combined with providing arguments", "warn")
        return
    }
    if (range) {
        rangeToTabIdxs(range).forEach(t => addSplit(method, leftOrAbove, t))
        return
    }
    const {addTab, switchToTab} = require("./tabs")
    const {add} = require("./pagelayout")
    const id = currentTab().getAttribute("link-id")
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
            add(tabOrPageMatching(tab), method, leftOrAbove)
            switchToTab(tab)
        }
    } else {
        addTab({
            "container": getSetting("containersplitpage"),
            "url": stringToUrl(args.join(" "))
        })
        add(id, method, !leftOrAbove)
    }
}

const close = (force, args, range) => {
    if (range && args.length) {
        notify("Range cannot be combined with providing arguments", "warn")
        return
    }
    const {closeTab} = require("./tabs")
    if (range) {
        rangeToTabIdxs(range).forEach(t => close(force, t))
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

const callAction = args => {
    setTimeout(() => {
        const {executeMapString, sanitiseMapString} = require("./input")
        executeMapString(sanitiseMapString(args.join(" "), true), true, true)
    }, 5)
}

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
    const {ipcRenderer} = require("electron")
    ipcRenderer.send("make-default-app")
    const {exec} = require("child_process")
    if (process.platform === "linux") {
        exec("xdg-settings set default-web-browser vieb.desktop", logError)
    } else if (process.platform === "win32") {
        const scriptContents = readFile(joinPath(
            __dirname, "../defaultapp/windows.bat"))
        const tempFile = joinPath(appData(), "defaultapp.bat")
        writeFile(tempFile, scriptContents)
        exec(`Powershell Start ${tempFile} -ArgumentList `
            + `"""${process.execPath}""" -Verb Runas`, logError)
    } else if (process.platform === "darwin") {
        // Electron API should be enough to show a popup for default app request
    } else {
        notify("If you didn't get a notification to set Vieb as your defau"
            + "lt browser, this command does not work for this OS.", "warn")
    }
}

const extensionsCommand = args => {
    if (!args[0]) {
        openSpecialPage("extensions")
        return
    }
    const {ipcRenderer} = require("electron")
    if (args[0] === "install") {
        if (args[1]) {
            notify("Extension install command takes no arguments", "warn")
            return
        }
        const version = navigator.userAgent.replace(
            /.*Chrome\//g, "").replace(/ .*/g, "")
        const extension = currentPage()?.src.replace(/.*\//g, "")
        if (extension && (/^[A-z0-9]{32}$/).test(extension)) {
            const url = `https://clients2.google.com/service/update2/crx?`
            + `response=redirect&prodversion=${version}&acceptformat=crx2,crx3`
            + `&x=id%3D${extension}%26uc`
            ipcRenderer.send("install-extension", url, extension, "crx")
        } else {
            currentPage()?.send("action", "installFirefoxExtension")
        }
    } else if (args[0] === "list") {
        if (args[1]) {
            notify("Extension list command takes no arguments", "warn")
            return
        }
        let list = ipcRenderer.sendSync("list-extensions")
        list = list.map(ext => `${ext.name}: ${ext.version}`).join("\n")
        if (list.length) {
            notify(`Installed extensions: \n${list}`)
        } else {
            notify(`No extensions currently installed`)
        }
    } else if (args[0] === "remove") {
        if (!args[1] || args[2]) {
            notify("Removing an extension requires exactly one argument:\n"
                + "The id of an extension", "warn")
            return
        }
        ipcRenderer.send("remove-extension", args[1])
    } else {
        notify("Unknown argument to the extensions command, must be:\n"
            + "install, list or remove", "warn")
    }
}

const lclose = (force = false) => {
    let index = listTabs().indexOf(currentTab())
    // Loop is reversed to close as many tabs as possible on the left,
    // without getting stuck trying to close pinned tabs at index 0.
    for (let i = index - 1; i >= 0; i--) {
        index = listTabs().indexOf(currentTab())
        const {closeTab} = require("./tabs")
        closeTab(index - 1, force)
    }
}

const rclose = (force = false) => {
    const index = listTabs().indexOf(currentTab())
    let count = listTabs().length
    // Loop is reversed to close as many tabs as possible on the right,
    // without trying to close a potentially pinned tab right of current.
    for (let i = count - 1; i > index; i--) {
        count = listTabs().length
        const {closeTab} = require("./tabs")
        closeTab(count - 1, force)
    }
}

const runjsinpage = (raw, range) => {
    let javascript = raw.split(" ").slice(1).join(" ")
    const filePath = expandPath(javascript)
    if (isAbsolutePath(filePath)) {
        javascript = readFile(filePath) || javascript
    }
    if (range) {
        rangeToTabIdxs(range).forEach(tabId => {
            tabOrPageMatching(listTabs()[tabId]).executeJavaScript(javascript)
        })
    } else {
        currentPage().executeJavaScript(javascript)
    }
}

const tabnew = (session = null, url = null) => {
    const {addTab} = require("./tabs")
    const options = {}
    if (url?.trim()) {
        options.url = url
    }
    if (session?.trim()) {
        options.session = session
    }
    addTab(options)
}

const marks = args => {
    if (args.length > 1) {
        notify("Command marks only accepts a single optional keyname", "warn")
        return
    }
    const marksObj = readJSON(joinPath(appData(), "marks"))
        || {"global": {}, "local": {}}
    const marklist = []
    if (args.length === 0) {
        for (const key of Object.keys(marksObj.global)) {
            marklist.push(`${key.padEnd(3)}${marksObj.global[key]}`)
        }
        for (const domain of Object.keys(marksObj.local)) {
            for (const key of Object.keys(marksObj.local[domain])) {
                marklist.push(`${key.padEnd(3)}${
                    String(marksObj.local[domain][key]).padEnd(6)}${domain}`)
            }
        }
    } else {
        const [key] = args
        if (marksObj.global[key] !== undefined) {
            marklist.push(`${key.padEnd(3)}${marksObj.global[key]}`)
        }
        for (const domain of Object.keys(marksObj.local)) {
            if (marksObj.local[domain][key] !== undefined) {
                marklist.push(`${key.padEnd(3)}${
                    String(marksObj.local[domain][key]).padEnd(6)}${domain}`)
            }
        }
    }
    if (marklist.length === 0) {
        if (args.length && (marksObj.global.length || marksObj.local.length)) {
            notify("No marks found for current keys", "warn")
        } else {
            notify("No marks found", "warn")
        }
    } else {
        notify(marklist.join("\n"))
    }
}

const delmarks = (all, args) => {
    if (all && args?.length) {
        notify("Command takes no arguments: delmarks!", "warn")
        return
    }
    const marksObj = readJSON(joinPath(appData(), "marks"))
        || {"global": {}, "local": {}}
    const domain = domainName(currentPage().src)
    if (all) {
        marksObj.local[domain] = {}
        writeJSON(joinPath(appData(), "marks"), marksObj)
        return
    }
    if (args.length !== 1) {
        notify("Command delmarks only accepts a single keyname", "warn")
        return
    }
    const [key] = args
    if (marksObj.local[domain]?.[key] !== undefined) {
        delete marksObj.local[domain]?.[key]
    }
    writeJSON(joinPath(appData(), "marks"), marksObj)
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
const commands = {
    "Sexplore": ({args, range}) => addSplit(
        "ver", !getSetting("splitbelow"), args, range),
    "Vexplore": ({args, range}) => addSplit(
        "hor", !getSetting("splitright"), args, range),
    "b": ({args}) => buffer(args),
    "buffer": ({args}) => buffer(args),
    "call": ({args}) => callAction(args),
    "close": ({args, range}) => close(false, args, range),
    "close!": ({args, range}) => close(true, args, range),
    "colorscheme": ({args}) => colorscheme(...args),
    "comclear": () => {
        userCommands = {}
    },
    "command": ({args}) => addCommand(false, args),
    "command!": ({args}) => addCommand(true, args),
    "cookies": () => openSpecialPage("cookies"),
    "d": () => openSpecialPage("downloads"),
    "delcommand": ({args}) => deleteCommand(args),
    "delmarks": ({args}) => delmarks(false, args),
    "delmarks!": ({args}) => delmarks(true, args),
    "devtools": ({args}) => openDevTools(...args),
    "downloads": () => openSpecialPage("downloads"),
    "extensions": ({args}) => extensionsCommand(args),
    "h": ({args}) => help(...args),
    "hardcopy": ({range}) => hardcopy(range),
    "help": ({args}) => help(...args),
    "hide": ({args, range}) => hide(args, range),
    "history": () => openSpecialPage("history"),
    "internaldevtools": openInternalDevTools,
    "lclose": () => lclose(),
    "lclose!": () => lclose(true),
    makedefault,
    "marks": ({args}) => marks(args),
    "mkviebrc": ({args}) => mkviebrc(...args),
    "mute": ({args, range}) => mute(args, range),
    "nohlsearch": () => {
        listPages().forEach(page => {
            try {
                page.stopFindInPage("clearSelection")
            } catch {
                // Page unavailable or suspended
            }
        })
    },
    "notifications": () => openSpecialPage("notifications"),
    "o": ({args}) => open(args),
    "only": () => {
        const {only} = require("./pagelayout")
        only()
    },
    "open": ({args}) => open(args),
    "pin": ({args, range}) => pin(args, range),
    "print": ({range}) => hardcopy(range),
    "q": ({range}) => quit(range),
    "qa": quitall,
    "quit": ({range}) => quit(range),
    quitall,
    "rclose": () => rclose(),
    "rclose!": () => rclose(true),
    reloadconfig,
    restart,
    "runjsinpage": ({raw, range}) => runjsinpage(raw, range),
    "s": ({args}) => set(args),
    "screencopy": ({args}) => screencopy(args),
    "screenshot": ({args}) => screenshot(args),
    "scriptnames": ({args}) => {
        if (args?.length) {
            notify("Command takes no arguments: scriptnames", "warn")
            return
        }
        notify(appConfig().files.map((f, i) => `${i + 1}: ${f}`).join("\n"))
    },
    "scriptnames!": ({args}) => {
        const scripts = [...appConfig().files, ...sourcedFiles]
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
            const {exec} = require("child_process")
            exec(`${getSetting("vimcommand")} "${script}"`, err => {
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
    "set": ({args}) => set(args),
    "source": ({args}) => source(null, args),
    "split": ({args, range}) => addSplit(
        "ver", !getSetting("splitbelow"), args, range),
    "suspend": ({args, range}) => suspend(args, range),
    "tabnew": ({raw}) => tabnew(null, raw.split(" ").slice(1).join(" ")),
    "tabnewcontainer": ({raw}) => tabnew(raw.split(" ")[1],
        raw.split(" ").slice(2).join(" ")),
    "v": () => openSpecialPage("version"),
    "version": () => openSpecialPage("version"),
    "vsplit": ({args, range}) => addSplit(
        "hor", !getSetting("splitright"), args, range),
    "w": ({args, range}) => write(args, range),
    "write": ({args, range}) => write(args, range)
}
let userCommands = {}
const {mapOrList, unmap, clearmap} = require("./input")
" nicsefpvm".split("").forEach(prefix => {
    commands[`${prefix.trim()}map!`] = ({args}) => {
        mapOrList(prefix.trim(), args, false, true)
    }
    commands[`${prefix.trim()}noremap!`] = ({args}) => {
        mapOrList(prefix.trim(), args, true, true)
    }
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

const execute = (com, settingsFile = null) => {
    // Remove all redundant spaces
    // Allow commands prefixed with :
    // And return if the command is empty
    const commandStr = com.replace(/^[\s|:]*/, "").trim().replace(/ +/g, " ")
    if (!commandStr) {
        return
    }
    const {push} = require("./commandhistory")
    push(commandStr)
    if (commandStr.startsWith("!")) {
        if (commandStr !== "!") {
            const {exec} = require("child_process")
            exec(commandStr.replace("!", ""), (err, stdout) => {
                const reportExit = getSetting("notificationforsystemcommands")
                if (err && reportExit !== "none") {
                    notify(`${err}`, "err")
                } else if (reportExit === "all") {
                    notify(stdout || "Command exitted successfully!", "suc")
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

const commandList = (includeCustom = true) => {
    if (includeCustom) {
        return Object.keys(commands).filter(c => c.length > 2)
            .concat(Object.keys(userCommands))
    }
    return Object.keys(commands).filter(c => c.length > 2)
}

const customCommandsAsCommandList = full => {
    let commandString = Object.keys(userCommands).map(
        command => `command ${command} ${userCommands[command]}`).join("\n")
    if (full || currentscheme !== "default") {
        commandString += `\ncolorscheme ${currentscheme}`
    }
    return commandString
}

module.exports = {
    commandList,
    customCommandsAsCommandList,
    execute,
    openSpecialPage,
    parseAndValidateArgs,
    rangeCompatibleCommands
}
