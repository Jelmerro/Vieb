/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2020 Jelmer van Arnhem
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
/* global COMMANDHISTORY DOWNLOADS FAVICONS HISTORY INPUT SETTINGS TABS UTIL */
"use strict"

const {remote} = require("electron")
const path = require("path")

const set = (...args) => {
    if (args.length === 0) {
        UTIL.notify(
            "Invalid usage, you could try:\nReading: 'set <setting>?'\n"
            + "Writing: 'set <setting>=<value>'", "warn")
        return
    }
    for (const part of args) {
        if (part.includes("=")) {
            const setting = part.split("=")[0]
            const value = part.split("=").slice(1).join("=")
            SETTINGS.set(setting, value)
        } else if (part.endsWith("!")) {
            const setting = part.slice(0, -1)
            const value = SETTINGS.get(setting)
            if (value === undefined) {
                UTIL.notify(`Unknown setting '${setting}', try using `
                    + "the suggestions", "warn")
            } else if (typeof value === "boolean") {
                SETTINGS.set(setting, String(!value))
            } else {
                UTIL.notify(
                    `The setting '${setting}' can not be flipped`, "warn")
            }
        } else {
            let setting = part
            if (part.endsWith("?")) {
                setting = part.slice(0, -1)
            }
            const value = SETTINGS.get(setting)
            if (value === undefined) {
                UTIL.notify(`Unknown setting '${setting}', try using `
                    + "the suggestions", "warn")
            } else if (value.length === undefined
                && typeof value === "object" || setting === "redirects") {
                UTIL.notify(
                    `The setting '${setting}' has the value `
                    + `'${JSON.stringify(value, null, 2)
                        .replace(/ /g, "&nbsp;")}'`)
            } else {
                UTIL.notify(
                    `The setting '${setting}' has the value '${value}'`)
            }
        }
    }
}

const quit = () => {
    remote.getCurrentWindow().hide()
    if (SETTINGS.get("history.clearOnQuit")) {
        HISTORY.clearHistory()
    }
    TABS.saveTabs()
    if (SETTINGS.get("cache") !== "full") {
        UTIL.clearCache()
    }
    if (SETTINGS.get("clearCookiesOnQuit")) {
        UTIL.clearCookies()
    }
    if (SETTINGS.get("clearLocalStorageOnQuit")) {
        UTIL.clearLocalStorage()
    }
    DOWNLOADS.cancelAll()
    FAVICONS.updateMappings()
    remote.getCurrentWindow().destroy()
    remote.app.exit(0)
}

const devtools = () => {
    TABS.currentPage().openDevTools()
}

const openSpecialPage = (specialPage, section = null) => {
    // Switch to already open special page if available
    let alreadyOpen = false
    TABS.listTabs().forEach((tab, index) => {
        // The list of tabs is ordered, the list of pages isn't
        const page = TABS.tabOrPageMatching(tab)
        if (UTIL.pathToSpecialPageName(page.src).name === specialPage) {
            alreadyOpen = true
            TABS.switchToTab(index)
        }
    })
    // Open the url in the current or new tab, depending on currently open page
    const pageUrl = UTIL.specialPagePath(specialPage, section)
    const isNewtab = UTIL.pathToSpecialPageName(
        TABS.currentPage().src).name === "newtab"
    if (TABS.currentPage().src === "" || alreadyOpen || isNewtab) {
        TABS.navigateTo(pageUrl)
    } else {
        TABS.addTab(pageUrl)
    }
}

const version = () => {
    openSpecialPage("version")
}

const help = (section = null, trailingArgs = false) => {
    if (trailingArgs) {
        UTIL.notify("The help command takes a single optional argument", "warn")
        return
    }
    openSpecialPage("help", section)
}

const history = () => {
    openSpecialPage("history")
}

const downloads = () => {
    openSpecialPage("downloads")
}

const reload = () => {
    SETTINGS.loadFromDisk()
    TABS.listPages().forEach(p => {
        if (UTIL.pathToSpecialPageName(p.src).name === "help") {
            p.getWebContents().send(
                "settings", SETTINGS.listCurrentSettings(true),
                INPUT.listSupportedActions())
        }
    })
}

const hardcopy = () => {
    TABS.currentPage().send("action", "print")
}

const write = (file, trailingArgs = false) => {
    if (trailingArgs) {
        UTIL.notify("The write command takes only a single optional argument:\n"
            + "the location where to write the page", "warn")
        return
    }
    let name = path.basename(TABS.currentPage().src).split("?")[0]
    if (!name.includes(".")) {
        name += ".html"
    }
    name = `${new URL(TABS.currentPage().src).hostname} ${name}`.trim()
    let loc = path.join(remote.app.getPath("downloads"), name)
    if (file) {
        if (!path.isAbsolute(file)) {
            file = UTIL.expandPath(file)
            if (!path.isAbsolute(file)) {
                file = path.join(remote.app.getPath("downloads"), file)
            }
        }
        const folder = path.dirname(file)
        if (UTIL.isDir(folder)) {
            if (UTIL.pathExists(file)) {
                if (UTIL.isDir(file)) {
                    loc = path.join(file, name)
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
    TABS.currentPage().getWebContents().savePage(loc, "HTMLComplete")
        .then(() => {
            UTIL.notify(`Page successfully saved at '${loc}'`)
        })
        .catch(err => {
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

const buffer = (...args) => {
    if (args.length === 0) {
        UTIL.notify("The buffer command requires a buffer name or id", "warn")
        return
    }
    if (args.length === 1) {
        const number = Number(args[0])
        if (!isNaN(number)) {
            TABS.switchToTab(number)
            return
        }
    }
    const simpleSearch = args.join("").replace(/\W/g, "").toLowerCase()
    const tab = TABS.listTabs().find(t => {
        const simpleTabUrl = TABS.tabOrPageMatching(t).src
            .replace(/\W/g, "").toLowerCase()
        if (simpleTabUrl.includes(simpleSearch)) {
            return true
        }
        const simpleTitle = t.querySelector("span").textContent
            .replace(/\W/g, "").toLowerCase()
        return simpleTitle.includes(simpleSearch)
    })
    if (tab) {
        TABS.switchToTab(TABS.listTabs().indexOf(tab))
    }
}

const cookies = () => {
    openSpecialPage("cookies")
}

const commands = {
    "q": quit,
    "quit": quit,
    "devtools": devtools,
    "reload": reload,
    "v": version,
    "version": version,
    "history": history,
    "d": downloads,
    "downloads": downloads,
    "h": help,
    "help": help,
    "s": set,
    "set": set,
    "hardcopy": hardcopy,
    "print": hardcopy,
    "w": write,
    "write": write,
    "mkv": mkviebrc,
    "mkviebrc": mkviebrc,
    "b": buffer,
    "buffer": buffer,
    "cookies": cookies
}

const noArgumentComands = [
    "q",
    "quit",
    "devtools",
    "reload",
    "v",
    "version",
    "history",
    "d",
    "downloads",
    "hardcopy"
]

const execute = command => {
    // Remove all redundant spaces
    // Allow commands prefixed with :
    // And return if the command is empty
    command = command.replace(/^[\s|:]*/, "").trim().replace(/ +/g, " ")
    if (!command) {
        return
    }
    const args = command.split(" ").slice(1)
    command = command.split(" ")[0]
    COMMANDHISTORY.push([command, ...args].join(" "))
    const matches = Object.keys(commands).filter(c => c.startsWith(command))
    if (matches.length === 1 || commands[command]) {
        if (matches.length === 1) {
            command = matches[0]
        }
        if (noArgumentComands.includes(command) && args.length > 0) {
            UTIL.notify(`The ${command} command takes no arguments`, "warn")
        } else {
            commands[command](...args)
        }
    } else if (matches.length > 1) {
        UTIL.notify(
            `Ambiguous command '${command}', please be more specific`, "warn")
    } else {
        // No command
        UTIL.notify(`The '${command}' command can not be found`, "warn")
    }
}

const commandList = () => {
    return Object.keys(commands).filter(c => c.length > 1)
}

module.exports = {
    openSpecialPage,
    execute,
    commandList
}
