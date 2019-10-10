/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019 Jelmer van Arnhem
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
/* global DOWNLOADS HISTORY MODES SETTINGS TABS UTIL */
"use strict"

const {remote} = require("electron")

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
                UTIL.notify(`Unknown setting '${setting}, try using `
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
                UTIL.notify(`Unknown setting '${setting}, try using `
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
    remote.getCurrentWindow().destroy()
    remote.app.exit(0)
}

const devtools = () => {
    TABS.currentPage().openDevTools()
}

const openSpecialPage = (specialPage, section=null) => {
    MODES.setMode("normal")
    //Switch to already open special page if available
    let alreadyOpen = false
    TABS.listTabs().forEach((tab, index) => {
        // The list of tabs is ordered, the list of pages isn't
        const page = TABS.tabOrPageMatching(tab)
        if (UTIL.pathToSpecialPageName(page.src).name === specialPage) {
            alreadyOpen = true
            TABS.switchToTab(index)
        }
    })
    //Open the url in the current or new tab, depending on currently open page
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

const help = (section=null, trailingArgs=false) => {
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
}

const hardcopy = () => {
    TABS.currentPage().print()
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
    "print": hardcopy
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
    "downloads"
]

const execute = command => {
    //remove all redundant spaces
    //allow commands prefixed with :
    //and return if the command is empty
    command = command.replace(/^[\s|:]*/, "").trim().replace(/ +/g, " ")
    if (!command) {
        return
    }
    const args = command.split(" ").slice(1)
    command = command.split(" ")[0]
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
        //no command
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
