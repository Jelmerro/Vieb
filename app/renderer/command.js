/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2021 Jelmer van Arnhem
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
    pathExists,
    expandPath,
    isAbsolutePath,
    joinPath,
    basePath,
    downloadPath,
    dirname,
    stringToUrl,
    appData,
    specialPagePath,
    pathToSpecialPageName,
    specialChars,
    appConfigSettings
} = require("../util")
const {
    listTabs, currentTab, currentPage, tabOrPageMatching, getSetting
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
            const current = getSetting(setting).split(",")
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

const set = (...args) => {
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
            if (typeof value === "boolean") {
                const {"set": s} = require("./settings")
                s(part.replace("no", ""), "false")
            } else {
                listSetting(part)
            }
        } else {
            listSetting(part)
        }
    }
}

const sourcedFiles = []

const source = (origin, ...args) => {
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
    const confSettings = appConfigSettings()
    if ([confSettings.override, confSettings.files].includes(absFile)) {
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
        const {addTab, switchToTab} = require("./tabs")
        const id = addTab({"devtools": true, "switchTo": false})
        const {add} = require("./pagelayout")
        add(id, "hor", !getSetting("splitright"))
        switchToTab(tabIndexById(id))
    } else if (position === "split") {
        const {addTab, switchToTab} = require("./tabs")
        const id = addTab({"devtools": true, "switchTo": false})
        const {add} = require("./pagelayout")
        add(id, "ver", !getSetting("splitbelow"))
        switchToTab(tabIndexById(id))
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
    const isNewtab = pathToSpecialPageName(
        currentPage()?.src).name === "newtab"
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

const reload = () => {
    const {loadFromDisk} = require("./settings")
    loadFromDisk()
}

const hardcopy = () => currentPage()?.send("action", "print")

const write = (locationArgument, trailingArgs = false) => {
    if (trailingArgs) {
        notify("The write command takes only a single optional argument:\n"
            + "the location where to write the page", "warn")
        return
    }
    if (!currentPage()) {
        return
    }
    let [name] = basePath(currentPage().src).split("?")
    if (!name.includes(".")) {
        name += ".html"
    }
    name = `${new URL(currentPage().src).hostname} ${name}`.trim()
    let loc = joinPath(downloadPath(), name)
    if (locationArgument) {
        let file = expandPath(file)
        if (!isAbsolutePath(file)) {
            file = joinPath(downloadPath(), file)
        }
        const folder = dirname(file)
        if (isDir(folder)) {
            if (pathExists(file)) {
                if (isDir(file)) {
                    loc = joinPath(file, name)
                } else {
                    loc = file
                }
            } else if (file.endsWith("/")) {
                notify(`The folder '${file}' does not exist`, "warn")
                return
            } else {
                loc = file
            }
        } else {
            notify(`The folder '${folder}' does not exist`, "warn")
            return
        }
    }
    const webContentsId = currentPage().getWebContentsId()
    const {ipcRenderer} = require("electron")
    ipcRenderer.invoke("save-page", webContentsId, loc).then(() => {
        notify(`Page saved at '${loc}'`)
    }).catch(err => {
        notify(`Could not save the page:\n${err}`, "err")
    })
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

const tabForBufferArg = args => {
    if (args.length === 1) {
        const number = Number(args[0])
        if (!isNaN(number)) {
            const tabs = listTabs()
            if (number < 0) {
                return tabs[0]
            }
            return tabs[number] || tabs.pop()
        }
    }
    const simpleSearch = args.join("").replace(specialChars, "").toLowerCase()
    return listTabs().find(t => {
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

const buffer = (...args) => {
    if (args.length === 0) {
        return
    }
    const tab = tabForBufferArg(args)
    if (tab) {
        const {switchToTab} = require("./tabs")
        switchToTab(tab)
    } else {
        const {navigateTo} = require("./tabs")
        navigateTo(args.join(" "))
    }
}

const open = (...args) => {
    if (args.length === 0) {
        return
    }
    const {navigateTo} = require("./tabs")
    navigateTo(args.join(" "))
}

const suspend = (...args) => {
    let tab = null
    if (args.length === 0) {
        tab = currentTab()
    } else {
        tab = tabForBufferArg(args)
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

const hide = (...args) => {
    let tab = null
    if (args.length === 0) {
        tab = currentTab()
    } else {
        tab = tabForBufferArg(args)
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

const mute = (...args) => {
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

const pin = (...args) => {
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

const tabIndexById = id => listTabs().indexOf(listTabs().find(
    t => t.getAttribute("link-id") === id))

const addSplit = (method, leftOrAbove, args) => {
    const {addTab, switchToTab} = require("./tabs")
    if (args.length === 0) {
        const id = addTab({
            "container": getSetting("containersplitpage"), "switchTo": false
        })
        const {add} = require("./pagelayout")
        add(id, method, leftOrAbove)
        switchToTab(tabIndexById(id))
        return
    }
    const tab = tabForBufferArg(args)
    if (tab) {
        if (tab.classList.contains("visible-tab")) {
            notify("Page is already visible", "warn")
        } else {
            const {add} = require("./pagelayout")
            add(tabOrPageMatching(tab), method, leftOrAbove)
            switchToTab(tab)
        }
    } else {
        const id = addTab({
            "container": getSetting("containersplitpage"),
            "switchTo": false,
            "url": stringToUrl(args.join(" "))
        })
        const {add} = require("./pagelayout")
        add(id, method, leftOrAbove)
        switchToTab(tabIndexById(id))
    }
}

const close = (...args) => {
    const {closeTab} = require("./tabs")
    if (args.length === 0) {
        closeTab()
        return
    }
    const tab = tabForBufferArg(args)
    if (tab) {
        closeTab(listTabs().indexOf(tab))
        return
    }
    notify("Can't find matching page, no tabs closed", "warn")
}

const callAction = (...args) => {
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

const extensionsCommand = (...args) => {
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

const noEscapeCommands = ["command", "delcommand"]
const noArgumentComands = [
    "q",
    "quit",
    "qa",
    "quitall",
    "reload",
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
    "lclose",
    "rclose",
    "only"
]
const commands = {
    "Sexplore": (...args) => addSplit("ver", !getSetting("splitbelow"), args),
    "Vexplore": (...args) => addSplit("hor", !getSetting("splitright"), args),
    "b": buffer,
    buffer,
    "call": callAction,
    close,
    colorscheme,
    "comclear": () => {
        userCommands = {}
    },
    "command": (...args) => addCommand(false, args),
    "command!": (...args) => addCommand(true, args),
    "cookies": () => openSpecialPage("cookies"),
    "d": () => openSpecialPage("downloads"),
    "delcommand": (...args) => deleteCommand(...args),
    "devtools": openDevTools,
    "downloads": () => openSpecialPage("downloads"),
    "extensions": extensionsCommand,
    "h": help,
    hardcopy,
    help,
    hide,
    "history": () => openSpecialPage("history"),
    "internaldevtools": openInternalDevTools,
    "lclose": () => {
        let index = listTabs().indexOf(currentTab())
        // Loop is reversed to close as many tabs as possible on the left,
        // without getting stuck trying to close pinned tabs at index 0.
        for (let i = index - 1; i >= 0; i--) {
            index = listTabs().indexOf(currentTab())
            const {closeTab} = require("./tabs")
            closeTab(index - 1)
        }
    },
    makedefault,
    mkviebrc,
    mute,
    "notifications": () => openSpecialPage("notifications"),
    "o": open,
    "only": () => {
        const {only} = require("./pagelayout")
        only()
    },
    open,
    pin,
    "print": hardcopy,
    "q": quit,
    "qa": quitall,
    quit,
    quitall,
    "rclose": () => {
        const index = listTabs().indexOf(currentTab())
        let count = listTabs().length
        // Loop is reversed to close as many tabs as possible on the right,
        // without trying to close a potentially pinned tab right of current.
        for (let i = count - 1; i > index; i--) {
            count = listTabs().length
            const {closeTab} = require("./tabs")
            closeTab(count - 1)
        }
    },
    reload,
    restart,
    "s": set,
    "scriptnames": (hasArgs = null) => {
        if (hasArgs) {
            notify(`Command takes no arguments: scriptnames`, "warn")
            return
        }
        notify(appConfigSettings().files.join("\n"))
    },
    "scriptnames!": (...args) => {
        const scripts = [...appConfigSettings().files, ...sourcedFiles]
        if (args.length === 0) {
            notify(scripts.join("\n"))
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
    set,
    "source": (...args) => source(null, ...args),
    "split": (...args) => addSplit("ver", !getSetting("splitbelow"), args),
    suspend,
    "v": () => openSpecialPage("version"),
    "version": () => openSpecialPage("version"),
    "vsplit": (...args) => addSplit("hor", !getSetting("splitright"), args),
    "w": write,
    write
}
let userCommands = {}
const {mapOrList, unmap, clearmap} = require("./input")
" nicsefpvm".split("").forEach(prefix => {
    commands[`${prefix.trim()}map!`] = (...args) => {
        mapOrList(prefix.trim(), args, false, true)
    }
    commands[`${prefix.trim()}noremap!`] = (...args) => {
        mapOrList(prefix.trim(), args, true, true)
    }
    commands[`${prefix.trim()}map`] = (...args) => {
        mapOrList(prefix.trim(), args)
    }
    noEscapeCommands.push(`${prefix.trim()}map`)
    commands[`${prefix.trim()}noremap`] = (...args) => {
        mapOrList(prefix.trim(), args, true)
    }
    noEscapeCommands.push(`${prefix.trim()}noremap`)
    commands[`${prefix.trim()}unmap`] = (...args) => {
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

const deleteCommand = (...args) => {
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
    return {args, command, confirm, "valid": !escapedSingle && !escapedDouble}
}

const execute = (com, settingsFile = null) => {
    // Remove all redundant spaces
    // Allow commands prefixed with :
    // And return if the command is empty
    const commandStr = com.replace(/^[\s|:]*/, "").trim().replace(/ +/g, " ")
    if (!commandStr) {
        return
    }
    if (getSetting("commandhist") === "all") {
        const {push} = require("./commandhistory")
        push(commandStr)
    }
    if (commandStr.startsWith("!")) {
        if (commandStr !== "!") {
            const {exec} = require("child_process")
            exec(commandStr.replace("!", ""))
        }
        return
    }
    const p = parseAndValidateArgs(commandStr)
    let {command} = p
    const {args, valid, confirm} = p
    if (!valid) {
        notify(`Command could not be executed, unmatched escape quotes:\n${
            commandStr}`, "warn")
        return
    }
    const matches = Object.keys(commands).concat(Object.keys(userCommands))
        .filter(c => c.startsWith(command) && !c.endsWith("!"))
    if (matches.length === 1 || commands[command] || userCommands[command]) {
        if (matches.length === 1) {
            [command] = matches
        }
        if (command === "source" && settingsFile) {
            source(settingsFile, ...args)
        } else if (noArgumentComands.includes(command) && args.length > 0) {
            notify(`Command takes no arguments: ${command}`, "warn")
        } else if (commands[command]) {
            if (confirm) {
                command += "!"
                if (!commands[command]) {
                    notify("No ! allowed", "warn")
                    return
                }
            }
            commands[command](...args)
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
    parseAndValidateArgs
}
