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
    isDir,
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
    specialChars
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
    const setting = part.split(seperator)[0]
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
        if (/^\w+\+=/.test(part)) {
            modifyListOrNumber(...splitSettingAndValue(part, "+="), "append")
        } else if (/^\w+-=/.test(part)) {
            modifyListOrNumber(...splitSettingAndValue(part, "-="), "remove")
        } else if (/^\w+\^=/.test(part)) {
            modifyListOrNumber(...splitSettingAndValue(part, "^="), "special")
        } else if (/^\w+=/.test(part)) {
            const {"set": s} = require("./settings")
            s(...splitSettingAndValue(part, "="))
        } else if (/^\w+:/.test(part)) {
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
            if (["boolean", "undefined"].includes(typeof value)) {
                const {"set": s} = require("./settings")
                s(setting, String(!value))
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
    const {clearHistory, writeHistToFile} = require("./history")
    if (getSetting("clearhistoryonquit")) {
        clearHistory()
    } else {
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

const openDevTools = (position = null, trailingArgs = false) => {
    if (trailingArgs) {
        notify("The devtools command takes a single optional argument",
            "warn")
        return
    }
    if (!position) {
        position = getSetting("devtoolsposition")
    }
    if (position === "window") {
        currentPage()?.openDevTools()
    } else if (position === "tab") {
        const {addTab} = require("./tabs")
        addTab({"devtools": true})
    } else if (position === "vsplit") {
        const {addTab, switchToTab} = require("./tabs")
        addTab({
            "switchTo": false,
            "devtools": true,
            "callback": id => {
                const {add} = require("./pagelayout")
                add(id, "hor", !getSetting("splitright"))
                switchToTab(tabIndexById(id))
            }
        })
    } else if (position === "split") {
        const {addTab, switchToTab} = require("./tabs")
        addTab({
            "switchTo": false,
            "devtools": true,
            "callback": id => {
                const {add} = require("./pagelayout")
                add(id, "ver", !getSetting("splitbelow"))
                switchToTab(tabIndexById(id))
            }
        })
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

const write = (file, trailingArgs = false) => {
    if (trailingArgs) {
        notify("The write command takes only a single optional argument:\n"
            + "the location where to write the page", "warn")
        return
    }
    if (!currentPage()) {
        return
    }
    let name = basePath(currentPage().src).split("?")[0]
    if (!name.includes(".")) {
        name += ".html"
    }
    name = `${new URL(currentPage().src).hostname} ${name}`.trim()
    let loc = joinPath(downloadPath(), name)
    if (file) {
        file = expandPath(file)
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
        switchToTab(listTabs().indexOf(tab))
        return
    }
    const {navigateTo} = require("./tabs")
    navigateTo(stringToUrl(args.join(" ")))
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
        addTab({
            "switchTo": false,
            "container": getSetting("containersplitpage"),
            "callback": id => {
                const {add} = require("./pagelayout")
                add(id, method, leftOrAbove)
                switchToTab(tabIndexById(id))
            }
        })
        return
    }
    const tab = tabForBufferArg(args)
    if (tab) {
        if (tab.classList.contains("visible-tab")) {
            notify("Page is already visible", "warn")
        } else {
            const {add} = require("./pagelayout")
            add(tabOrPageMatching(tab), method, leftOrAbove)
            switchToTab(listTabs().indexOf(tab))
        }
    } else {
        addTab({
            "url": stringToUrl(args.join(" ")),
            "container": getSetting("containersplitpage"),
            "switchTo": false,
            "callback": id => {
                const {add} = require("./pagelayout")
                add(id, method, leftOrAbove)
                switchToTab(tabIndexById(id))
            }
        })
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
    if (args.length !== 1) {
        notify(
            "Exactly one action name is required for the call command", "warn")
        return
    }
    const action = args[0].replace(/(^<|>$)/g, "")
    const {listSupportedActions, doAction} = require("./input")
    if (listSupportedActions().includes(action)) {
        setTimeout(() => doAction(action), 0)
    } else {
        notify("Unsupported action provided, can't be called", "warn")
    }
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
        if (extension && /^[A-z0-9]{32}$/.test(extension)) {
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
    "q": quit,
    "quit": quit,
    "qa": quitall,
    "quitall": quitall,
    "colorscheme": colorscheme,
    "devtools": openDevTools,
    "internaldevtools": openInternalDevTools,
    "reload": reload,
    "restart": restart,
    "v": () => openSpecialPage("version"),
    "version": () => openSpecialPage("version"),
    "h": help,
    "help": help,
    "history": () => openSpecialPage("history"),
    "d": () => openSpecialPage("downloads"),
    "downloads": () => openSpecialPage("downloads"),
    "notifications": () => openSpecialPage("notifications"),
    "s": set,
    "set": set,
    "hardcopy": hardcopy,
    "print": hardcopy,
    "w": write,
    "write": write,
    "mkviebrc": mkviebrc,
    "b": buffer,
    "buffer": buffer,
    "suspend": suspend,
    "hide": hide,
    "pin": pin,
    "mute": mute,
    "Vexplore": (...args) => addSplit("hor", !getSetting("splitright"), args),
    "Sexplore": (...args) => addSplit("ver", !getSetting("splitbelow"), args),
    "split": (...args) => addSplit("ver", !getSetting("splitbelow"), args),
    "vsplit": (...args) => addSplit("hor", !getSetting("splitright"), args),
    "close": close,
    "cookies": () => openSpecialPage("cookies"),
    "command": (...args) => addCommand(false, args),
    "command!": (...args) => addCommand(true, args),
    "delcommand": (...args) => deleteCommand(...args),
    "comclear": () => {
        userCommands = {}
    },
    "call": callAction,
    "makedefault": makedefault,
    "extensions": extensionsCommand,
    "lclose": () => {
        let index = listTabs().indexOf(currentTab())
        // Loop is reversed to close as many tabs as possible on the left,
        // without getting stuck trying to close pinned tabs at index 0.
        for (let i = index - 1;i >= 0;i--) {
            index = listTabs().indexOf(currentTab())
            const {closeTab} = require("./tabs")
            closeTab(index - 1)
        }
    },
    "rclose": () => {
        const index = listTabs().indexOf(currentTab())
        let count = listTabs().length
        // Loop is reversed to close as many tabs as possible on the right,
        // without trying to close a potentially pinned tab right of current.
        for (let i = count - 1;i > index;i--) {
            count = listTabs().length
            const {closeTab} = require("./tabs")
            closeTab(count - 1)
        }
    },
    "only": () => {
        const {only} = require("./pagelayout")
        only()
    }
}
let userCommands = {}
const {mapOrList, unmap, clearmap} = require("./input")
"anicsefpvm".split("").forEach(prefix => {
    if (prefix === "a") {
        prefix = ""
    }
    commands[`${prefix}map!`] = (...args) => {
        mapOrList(prefix, args, false, true)
    }
    commands[`${prefix}noremap!`] = (...args) => {
        mapOrList(prefix, args, true, true)
    }
    commands[`${prefix}map`] = (...args) => {
        mapOrList(prefix, args)
    }
    noEscapeCommands.push(`${prefix}map`)
    commands[`${prefix}noremap`] = (...args) => {
        mapOrList(prefix, args, true)
    }
    noEscapeCommands.push(`${prefix}noremap`)
    commands[`${prefix}unmap`] = (...args) => {
        unmap(prefix, args)
    }
    noEscapeCommands.push(`${prefix}unmap`)
    commands[`${prefix}mapclear`] = () => {
        clearmap(prefix)
    }
    noArgumentComands.push(`${prefix}mapclear`)
    commands[`${prefix}mapclear!`] = () => {
        clearmap(prefix, true)
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
    args = args.slice(1)
    if (commands[command]) {
        notify(`Command can not be a built-in command: ${command}`, "warn")
        return
    }
    if (args.length === 0) {
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
    userCommands[command] = args.join(" ")
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

const parseAndValidateArgs = command => {
    const argsString = command.split(" ").slice(1).join(" ")
    command = command.split(" ")[0]
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
    return {command, confirm, args, "valid": !escapedSingle && !escapedDouble}
}

const execute = command => {
    // Remove all redundant spaces
    // Allow commands prefixed with :
    // And return if the command is empty
    command = command.replace(/^[\s|:]*/, "").trim().replace(/ +/g, " ")
    if (!command) {
        return
    }
    const {push} = require("./commandhistory")
    push(command)
    const parsed = parseAndValidateArgs(command)
    if (!parsed.valid) {
        notify(`Command could not be executed, unmatched escape quotes:\n${
            command}`, "warn")
        return
    }
    command = parsed.command
    const args = parsed.args
    const matches = Object.keys(commands).concat(Object.keys(userCommands))
        .filter(c => c.startsWith(command) && !c.endsWith("!"))
    if (matches.length === 1 || commands[command] || userCommands[command]) {
        if (matches.length === 1) {
            command = matches[0]
        }
        if (noArgumentComands.includes(command) && args.length > 0) {
            notify(`Command takes no arguments: ${command}`, "warn")
        } else if (commands[command]) {
            if (parsed.confirm) {
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
            }, 0)
        }
    } else if (matches.length > 1) {
        notify(
            `Command is ambiguous, please be more specific: ${command}`, "warn")
    } else {
        // No command
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
    openSpecialPage,
    parseAndValidateArgs,
    execute,
    commandList,
    customCommandsAsCommandList
}
