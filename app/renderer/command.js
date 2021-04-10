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
/* global COMMANDHISTORY FAVICONS HISTORY INPUT MODES PAGELAYOUT
 SETTINGS TABS UTIL */
"use strict"

const {ipcRenderer} = require("electron")

const listSetting = setting => {
    if (setting === "all") {
        UTIL.notify(`--- Options ---\n${SETTINGS.listCurrentSettings(true)}`)
        return
    }
    const value = SETTINGS.get(setting)
    if (value === undefined) {
        UTIL.notify(`The setting '${setting}' doesn't exist`, "warn")
    } else {
        UTIL.notify(`The setting '${setting}' has the value '${value}'`)
    }
}

const splitSettingAndValue = (part, seperator) => {
    const setting = part.split(seperator)[0]
    const value = part.split(seperator).slice(1).join(seperator)
    return [setting, value]
}

const modifyListOrNumber = (setting, value, method) => {
    const isNumber = typeof SETTINGS.get(setting) === "number"
    const isFreeText = SETTINGS.freeText.includes(setting)
    const isListLike = SETTINGS.listLike.includes(setting)
    if (!isNumber && !isFreeText && !isListLike) {
        UTIL.notify(
            `Can't modify '${setting}' as if it were a number or list`, "warn")
        return
    }
    if (method === "append") {
        if (isListLike) {
            SETTINGS.set(setting, `${SETTINGS.get(setting)},${value}`)
        }
        if (isNumber) {
            SETTINGS.set(setting, SETTINGS.get(setting) + Number(value))
        }
        if (isFreeText) {
            SETTINGS.set(setting, SETTINGS.get(setting) + value)
        }
    }
    if (method === "remove") {
        if (isListLike) {
            const current = SETTINGS.get(setting).split(",")
            const newValue = current.filter(e => e && e !== value).join(",")
            SETTINGS.set(setting, newValue)
        }
        if (isNumber) {
            SETTINGS.set(setting, SETTINGS.get(setting) - Number(value))
        }
        if (isFreeText) {
            SETTINGS.set(setting, SETTINGS.get(setting).replace(value, ""))
        }
    }
    if (method === "special") {
        if (isListLike) {
            SETTINGS.set(setting, `${value},${SETTINGS.get(setting)}`)
        }
        if (isNumber) {
            SETTINGS.set(setting, SETTINGS.get(setting) * Number(value))
        }
        if (isFreeText) {
            SETTINGS.set(setting, value + SETTINGS.get(setting))
        }
    }
}

const set = (...args) => {
    if (args.length === 0) {
        const allChanges = SETTINGS.listCurrentSettings()
        if (allChanges) {
            UTIL.notify(`--- Options ---\n${allChanges}`)
        } else {
            UTIL.notify("No settings have been changed compared to the default")
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
            SETTINGS.set(...splitSettingAndValue(part, "="))
        } else if (/^\w+:/.test(part)) {
            SETTINGS.set(...splitSettingAndValue(part, ":"))
        } else if (part.includes("=") || part.includes(":")) {
            UTIL.notify(
                `The setting '${part.replace(/[+-^:=].*/, "")}' contains `
                + "invalid characters", "warn")
        } else if (part.endsWith("&")) {
            SETTINGS.reset(part.slice(0, -1))
        } else if (part.endsWith("!")) {
            const setting = part.slice(0, -1)
            const value = SETTINGS.get(setting)
            if (["boolean", "undefined"].includes(typeof value)) {
                SETTINGS.set(setting, String(!value))
            } else {
                UTIL.notify(
                    `The setting '${setting}' can not be flipped`, "warn")
            }
        } else if (part.endsWith("?")) {
            listSetting(part.slice(0, -1))
        } else if (typeof SETTINGS.get(part) === "boolean") {
            SETTINGS.set(part, "true")
        } else if (part.startsWith("inv")) {
            const value = SETTINGS.get(part.replace("inv", ""))
            if (typeof value === "boolean") {
                SETTINGS.set(part.replace("inv", ""), String(!value))
            } else {
                listSetting(part)
            }
        } else if (part.startsWith("no")) {
            const value = SETTINGS.get(part.replace("no", ""))
            if (typeof value === "boolean") {
                SETTINGS.set(part.replace("no", ""), "false")
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
        TABS.closeTab()
    } else {
        quitall()
    }
}

const quitall = () => {
    ipcRenderer.send("hide-window")
    if (SETTINGS.get("clearhistoryonquit")) {
        HISTORY.clearHistory()
    } else {
        HISTORY.writeHistToFile(true)
    }
    TABS.saveTabs()
    document.getElementById("pages").innerHTML = ""
    UTIL.clearTempContainers()
    if (SETTINGS.get("cache") !== "full") {
        UTIL.clearCache()
    }
    if (SETTINGS.get("clearcookiesonquit")) {
        UTIL.clearCookies()
    }
    if (SETTINGS.get("clearlocalstorageonquit")) {
        UTIL.clearLocalStorage()
    }
    FAVICONS.updateMappings()
    ipcRenderer.send("destroy-window")
}

let currentscheme = "default"
const colorscheme = (name = null, trailingArgs = false) => {
    if (trailingArgs) {
        UTIL.notify("The colorscheme command takes a single optional argument",
            "warn")
        return
    }
    if (!name) {
        UTIL.notify(currentscheme)
        return
    }
    let css = UTIL.readFile(UTIL.expandPath(`~/.vieb/colors/${name}.css`))
    if (!css) {
        css = UTIL.readFile(UTIL.joinPath(UTIL.appData(), `colors/${name}.css`))
    }
    if (!css) {
        css = UTIL.readFile(UTIL.joinPath(__dirname,
            "../colors", `${name}.css`))
    }
    if (!css) {
        UTIL.notify(`Cannot find colorscheme '${name}'`, "warn")
        return
    }
    if (name === "default") {
        css = ""
    }
    document.getElementById("custom-styling").textContent = css
    ipcRenderer.send("set-custom-styling", SETTINGS.get("fontsize"), css)
    SETTINGS.setCustomStyling(css)
    currentscheme = name
}

const restart = () => {
    ipcRenderer.send("relaunch")
    quitall()
}

const openDevTools = (position = null, trailingArgs = false) => {
    if (trailingArgs) {
        UTIL.notify("The devtools command takes a single optional argument",
            "warn")
        return
    }
    if (!position) {
        position = SETTINGS.get("devtoolsposition")
    }
    if (position === "window") {
        TABS.currentPage()?.openDevTools()
    } else if (position === "tab") {
        TABS.addTab({"devtools": true})
    } else if (position === "vsplit") {
        TABS.addTab({
            "switchTo": false,
            "devtools": true,
            "callback": id => {
                PAGELAYOUT.add(id, "hor", !SETTINGS.get("splitright"))
                TABS.switchToTab(tabIndexById(id))
            }
        })
    } else if (position === "split") {
        TABS.addTab({
            "switchTo": false,
            "devtools": true,
            "callback": id => {
                PAGELAYOUT.add(id, "ver", !SETTINGS.get("splitbelow"))
                TABS.switchToTab(tabIndexById(id))
            }
        })
    } else {
        UTIL.notify("Invalid devtools position specified, must be one of: "
            + "window, vsplit, split or tab", "warn")
    }
}

const openInternalDevTools = () => ipcRenderer.send("open-internal-devtools")

const openSpecialPage = (specialPage, section = null) => {
    // Open the url in the current or new tab, depending on currently open page
    const pageUrl = UTIL.specialPagePath(specialPage, section)
    const isNewtab = UTIL.pathToSpecialPageName(
        TABS.currentPage()?.src).name === "newtab"
    if (TABS.currentPage() && !TABS.currentPage().isLoading() && isNewtab) {
        TABS.navigateTo(pageUrl)
    } else {
        TABS.addTab({"url": pageUrl})
    }
}

const help = (section = null, trailingArgs = false) => {
    if (trailingArgs) {
        UTIL.notify("The help command takes a single optional argument", "warn")
        return
    }
    openSpecialPage("help", section)
}

const reload = () => {
    COMMANDHISTORY.pause()
    SETTINGS.loadFromDisk()
    COMMANDHISTORY.resume()
}

const hardcopy = () => {
    TABS.currentPage()?.send("action", "print")
}

const write = (file, trailingArgs = false) => {
    if (trailingArgs) {
        UTIL.notify("The write command takes only a single optional argument:\n"
            + "the location where to write the page", "warn")
        return
    }
    if (!TABS.currentPage()) {
        return
    }
    let name = UTIL.basePath(TABS.currentPage().src).split("?")[0]
    if (!name.includes(".")) {
        name += ".html"
    }
    name = `${new URL(TABS.currentPage().src).hostname} ${name}`.trim()
    let loc = UTIL.joinPath(UTIL.downloadPath(), name)
    if (file) {
        file = UTIL.expandPath(file)
        if (!UTIL.isAbsolutePath(file)) {
            file = UTIL.joinPath(UTIL.downloadPath(), file)
        }
        const folder = UTIL.dirname(file)
        if (UTIL.isDir(folder)) {
            if (UTIL.pathExists(file)) {
                if (UTIL.isDir(file)) {
                    loc = UTIL.joinPath(file, name)
                } else {
                    loc = file
                }
            } else if (file.endsWith("/")) {
                UTIL.notify(`The folder '${file}' does not exist`, "warn")
                return
            } else {
                loc = file
            }
        } else {
            UTIL.notify(`The folder '${folder}' does not exist`, "warn")
            return
        }
    }
    const webContentsId = TABS.currentPage().getWebContentsId()
    ipcRenderer.invoke("save-page", webContentsId, loc).then(() => {
        UTIL.notify(`Page saved at '${loc}'`)
    }).catch(err => {
        UTIL.notify(`Could not save the page:\n${err}`, "err")
    })
}

const mkviebrc = (full = false, trailingArgs = false) => {
    if (trailingArgs) {
        UTIL.notify(
            "The mkviebrc command takes a single optional argument", "warn")
        return
    }
    let exportAll = false
    if (full) {
        if (full === "full") {
            exportAll = true
        } else {
            UTIL.notify(
                "The only optional argument supported is: 'full'", "warn")
            return
        }
    }
    SETTINGS.saveToDisk(exportAll)
}

const tabForBufferArg = args => {
    if (args.length === 1) {
        const number = Number(args[0])
        if (!isNaN(number)) {
            const tabs = TABS.listTabs()
            if (number < 0) {
                return tabs[0]
            }
            return tabs[number] || tabs.pop()
        }
    }
    const simpleSearch = args.join("").replace(/\W/g, "").toLowerCase()
    return TABS.listTabs().find(t => {
        const simpleTabUrl = TABS.tabOrPageMatching(t).src
            .replace(/\W/g, "").toLowerCase()
        if (simpleTabUrl.includes(simpleSearch)) {
            return true
        }
        const simpleTitle = t.querySelector("span").textContent
            .replace(/\W/g, "").toLowerCase()
        return simpleTitle.includes(simpleSearch)
    })
}

const buffer = (...args) => {
    if (args.length === 0) {
        return
    }
    const tab = tabForBufferArg(args)
    if (tab) {
        TABS.switchToTab(TABS.listTabs().indexOf(tab))
        return
    }
    TABS.navigateTo(UTIL.stringToUrl(args.join(" ")))
}

const suspend = (...args) => {
    let tab = null
    if (args.length === 0) {
        tab = TABS.currentTab()
    } else {
        tab = tabForBufferArg(args)
    }
    if (tab) {
        if (tab.classList.contains("visible-tab")) {
            UTIL.notify(
                "Only tabs not currently visible can be suspended", "warn")
        } else {
            TABS.suspendTab(tab)
        }
    }
}

const hide = (...args) => {
    let tab = null
    if (args.length === 0) {
        tab = TABS.currentTab()
    } else {
        tab = tabForBufferArg(args)
    }
    if (tab) {
        if (tab.classList.contains("visible-tab")) {
            PAGELAYOUT.hide(TABS.tabOrPageMatching(tab))
        } else {
            UTIL.notify("Only visible pages can be hidden", "warn")
        }
    }
}

const mute = (...args) => {
    let tab = TABS.currentTab()
    if (args.length > 0) {
        tab = tabForBufferArg(args)
    }
    if (!tab) {
        UTIL.notify("Can't find matching page, no tabs (un)muted", "warn")
        return
    }
    if (tab.getAttribute("muted")) {
        tab.removeAttribute("muted")
    } else {
        tab.setAttribute("muted", "muted")
    }
    TABS.tabOrPageMatching(tab).setAudioMuted(!!tab.getAttribute("muted"))
    TABS.saveTabs()
}

const pin = (...args) => {
    let tab = TABS.currentTab()
    if (args.length > 0) {
        tab = tabForBufferArg(args)
    }
    if (!tab) {
        UTIL.notify("Can't find matching page, no tabs (un)pinned", "warn")
        return
    }
    const tabContainer = document.getElementById("tabs")
    if (tab.classList.contains("pinned")) {
        tabContainer.insertBefore(tab, TABS.listTabs().find(
            t => !t.classList.contains("pinned")))
        tab.classList.remove("pinned")
    } else {
        tab.classList.add("pinned")
        tabContainer.insertBefore(tab, TABS.listTabs().find(
            t => !t.classList.contains("pinned")))
    }
    TABS.saveTabs()
}

const tabIndexById = id => TABS.listTabs().indexOf(TABS.listTabs().find(
    t => t.getAttribute("link-id") === id))

const addSplit = (method, leftOrAbove, args) => {
    if (args.length === 0) {
        TABS.addTab({
            "switchTo": false,
            "container": SETTINGS.get("containersplitpage"),
            "callback": id => {
                PAGELAYOUT.add(id, method, leftOrAbove)
                TABS.switchToTab(tabIndexById(id))
            }
        })
        return
    }
    const tab = tabForBufferArg(args)
    if (tab) {
        if (tab.classList.contains("visible-tab")) {
            UTIL.notify("Page is already visible", "warn")
        } else {
            PAGELAYOUT.add(TABS.tabOrPageMatching(tab), method, leftOrAbove)
            TABS.switchToTab(TABS.listTabs().indexOf(tab))
        }
    } else {
        TABS.addTab({
            "url": UTIL.stringToUrl(args.join(" ")),
            "container": SETTINGS.get("containersplitpage"),
            "switchTo": false,
            "callback": id => {
                PAGELAYOUT.add(id, method, leftOrAbove)
                TABS.switchToTab(tabIndexById(id))
            }
        })
    }
}

const close = (...args) => {
    if (args.length === 0) {
        TABS.closeTab()
        return
    }
    const tab = tabForBufferArg(args)
    if (tab) {
        TABS.closeTab(TABS.listTabs().indexOf(tab))
        return
    }
    UTIL.notify("Can't find matching page, no tabs closed", "warn")
}


const addCommand = (overwrite, args) => {
    if (overwrite && args.length < 2) {
        UTIL.notify("Can't combine ! with reading a value", "warn")
        return
    }
    if (args.length === 0) {
        const commandString = Object.keys(userCommands).map(
            c => `${c} => ${userCommands[c]}`).join("\n").trim()
        if (commandString) {
            UTIL.notify(`--- User defined commands ---\n${commandString}`)
        } else {
            UTIL.notify("There are no user defined commands")
        }
        return
    }
    const command = args[0].replace(/^[:'" ]*/, "")
    args = args.slice(1)
    if (commands[command]) {
        UTIL.notify(`Command can not be a built-in command: ${command}`, "warn")
        return
    }
    if (args.length === 0) {
        if (userCommands[command]) {
            UTIL.notify(`${command} => ${userCommands[command]}`)
        } else {
            UTIL.notify(`Not an editor command: ${command}`, "warn")
        }
        return
    }
    if (!overwrite && userCommands[command]) {
        UTIL.notify(
            "Duplicate custom command definition (add ! to overwrite)", "warn")
        return
    }
    userCommands[command] = args.join(" ")
}

const deleteCommand = (...args) => {
    if (args.length !== 1) {
        UTIL.notify(
            "Exactly one command name is required for delcommand", "warn")
        return
    }
    const command = args[0].replace(/^[:'" ]*/, "")
    if (userCommands[command]) {
        delete userCommands[args[0]]
    } else {
        UTIL.notify(`No such user defined command: ${command}`, "warn")
    }
}

const callAction = (...args) => {
    if (args.length !== 1) {
        UTIL.notify(
            "Exactly one action name is required for the call command", "warn")
        return
    }
    const action = args[0].replace(/(^<|>$)/g, "")
    if (INPUT.listSupportedActions().includes(action)) {
        setTimeout(() => INPUT.doAction(action), 0)
    } else {
        UTIL.notify("Unsupported action provided, can't be called", "warn")
    }
}

const logError = err => {
    if (err?.message) {
        UTIL.notify(`Script to set Vieb as the default browser failed:\n${
            err.message}`, "err")
    }
}

const makedefault = () => {
    if (process.execPath.endsWith("electron")) {
        UTIL.notify("Command only works for installed versions of Vieb", "err")
        return
    }
    ipcRenderer.send("make-default-app")
    const {exec} = require("child_process")
    if (process.platform === "linux" || process.platform.endsWith("bsd")) {
        exec("xdg-settings set default-web-browser vieb.desktop", logError)
    } else if (process.platform === "win32") {
        const scriptContents = UTIL.readFile(UTIL.joinPath(
            __dirname, "../defaultapp/windows.bat"))
        const tempFile = UTIL.joinPath(UTIL.appData(), "defaultapp.bat")
        UTIL.writeFile(tempFile, scriptContents)
        exec(`Powershell Start ${tempFile} -ArgumentList `
            + `"""${process.execPath}""" -Verb Runas`, logError)
    } else if (process.platform === "darwin") {
        // Electron API should be enough to show a popup for default app request
    } else {
        UTIL.notify("If you didn't get a notification to set Vieb as your defau"
            + "lt browser, this command does not work for this OS.", "warn")
    }
}

const extensionsCommand = (...args) => {
    if (!args[0]) {
        openSpecialPage("extensions")
        return
    }
    if (args[0] === "install") {
        if (args[1]) {
            UTIL.notify("Extension install command takes no arguments", "warn")
            return
        }
        const version = navigator.userAgent.replace(
            /.*Chrome\//g, "").replace(/ .*/g, "")
        const extension = TABS.currentPage()?.src.replace(/.*\//g, "")
        if (extension && /^[A-z0-9]{32}$/.test(extension)) {
            const url = `https://clients2.google.com/service/update2/crx?`
            + `response=redirect&prodversion=${version}&acceptformat=crx2,crx3`
            + `&x=id%3D${extension}%26uc`
            ipcRenderer.send("install-extension", url, extension, "crx")
        } else {
            TABS.currentPage()?.send("action", "installFirefoxExtension")
        }
    } else if (args[0] === "list") {
        if (args[1]) {
            UTIL.notify("Extension list command takes no arguments", "warn")
            return
        }
        let list = ipcRenderer.sendSync("list-extensions")
        list = list.map(ext => `${ext.name}: ${ext.version}`).join("\n")
        if (list.length) {
            UTIL.notify(`Installed extensions: \n${list}`)
        } else {
            UTIL.notify(`No extensions currently installed`)
        }
    } else if (args[0] === "remove") {
        if (!args[1] || args[2]) {
            UTIL.notify("Removing an extension requires exactly one argument:\n"
                + "The id of an extension", "warn")
            return
        }
        ipcRenderer.send("remove-extension", args[1])
    } else {
        UTIL.notify("Unknown argument to the extensions command, must be:\n"
            + "install, list or remove", "warn")
    }
}

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
    "Vexplore": (...args) => addSplit("hor", !SETTINGS.get("splitright"), args),
    "Sexplore": (...args) => addSplit("ver", !SETTINGS.get("splitbelow"), args),
    "split": (...args) => addSplit("ver", !SETTINGS.get("splitbelow"), args),
    "vsplit": (...args) => addSplit("hor", !SETTINGS.get("splitright"), args),
    "close": close,
    "cookies": () => openSpecialPage("cookies"),
    "command": (...args) => addCommand(false, args),
    "command!": (...args) => addCommand(true, args),
    "delcommand": deleteCommand,
    "comclear": () => {
        userCommands = {}
    },
    "call": callAction,
    "makedefault": makedefault,
    "extensions": extensionsCommand,
    "lclose": () => {
        let index = TABS.listTabs().indexOf(TABS.currentTab())
        // Loop is reversed to close as many tabs as possible on the left,
        // without getting stuck trying to close pinned tabs at index 0.
        for (let i = index - 1;i >= 0;i--) {
            index = TABS.listTabs().indexOf(TABS.currentTab())
            TABS.closeTab(index - 1)
        }
    },
    "rclose": () => {
        const index = TABS.listTabs().indexOf(TABS.currentTab())
        let count = TABS.listTabs().length
        // Loop is reversed to close as many tabs as possible on the right,
        // without trying to close a potentially pinned tab right of current.
        for (let i = count - 1;i > index;i--) {
            count = TABS.listTabs().length
            TABS.closeTab(count - 1)
        }
    }
}
let userCommands = {}

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
    "rclose"
]

const noEscapeCommands = ["command", "delcommand"]

const modes = ["all", ...MODES.allModes(), "menu"]
modes.forEach(mode => {
    let prefix = mode[0]
    if (mode === "all") {
        prefix = ""
    }
    commands[`${prefix}map!`] = (...args) => {
        INPUT.mapOrList(prefix, args, false, true)
    }
    commands[`${prefix}noremap!`] = (...args) => {
        INPUT.mapOrList(prefix, args, true, true)
    }
    commands[`${prefix}map`] = (...args) => {
        INPUT.mapOrList(prefix, args)
    }
    noEscapeCommands.push(`${prefix}map`)
    commands[`${prefix}noremap`] = (...args) => {
        INPUT.mapOrList(prefix, args, true)
    }
    noEscapeCommands.push(`${prefix}noremap`)
    commands[`${prefix}unmap`] = (...args) => {
        INPUT.unmap(prefix, args)
    }
    noEscapeCommands.push(`${prefix}unmap`)
    commands[`${prefix}mapclear`] = () => {
        INPUT.clearmap(prefix)
    }
    noArgumentComands.push(`${prefix}mapclear`)
    commands[`${prefix}mapclear!`] = () => {
        INPUT.clearmap(prefix, true)
    }
})

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
    COMMANDHISTORY.push(command)
    const parsed = parseAndValidateArgs(command)
    if (!parsed.valid) {
        UTIL.notify(`Command could not be executed, unmatched escape quotes:\n${
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
            UTIL.notify(`Command takes no arguments: ${command}`, "warn")
        } else if (commands[command]) {
            if (parsed.confirm) {
                command += "!"
                if (!commands[command]) {
                    UTIL.notify("No ! allowed", "warn")
                    return
                }
            }
            commands[command](...args)
        } else {
            setTimeout(() => {
                INPUT.executeMapString(userCommands[command], true, true)
            }, 0)
        }
    } else if (matches.length > 1) {
        UTIL.notify(
            `Command is ambiguous, please be more specific: ${command}`, "warn")
    } else {
        // No command
        UTIL.notify(`Not an editor command: ${command}`, "warn")
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
