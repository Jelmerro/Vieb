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

const execute = command => {
    //remove all redundant spaces
    //allow commands prefixed with :
    //and return if the command is empty
    while (command.includes("  ")) {
        command = command.replace("  ", " ")
    }
    command = command.trim()
    if (command.startsWith(":")) {
        command = command.replace(":", "")
    }
    command = command.trim()
    if (!command) {
        return
    }
    //quit command
    if (["q", "quit"].includes(command)) {
        quit()
        return
    }
    if (command.startsWith("q ") || command.startsWith("quit ")) {
        UTIL.notify("The quit command takes no arguments", "warn")
        return
    }
    //devtools command
    if (["dev", "devtools"].includes(command)) {
        devtools()
        return
    }
    if (command.startsWith("dev ") || command.startsWith("devtools ")) {
        UTIL.notify("The devtools command takes no arguments", "warn")
        return
    }
    //reload command
    if (["r", "reload"].includes(command)) {
        SETTINGS.loadFromDisk()
        return
    }
    if (command.startsWith("r ") || command.startsWith("reload ")) {
        UTIL.notify("The reload command takes no arguments", "warn")
        return
    }
    //version command
    if (["v", "version"].includes(command)) {
        version()
        return
    }
    if (command.startsWith("v ") || command.startsWith("version ")) {
        UTIL.notify("The version command takes no arguments", "warn")
        return
    }
    //help command
    if (["h", "help"].includes(command)) {
        help()
        return
    }
    if (command.startsWith("h ") || command.startsWith("help ")) {
        const parts = command.split(" ")
        if (parts.length > 2) {
            UTIL.notify("The help command only takes a single argument")
            return
        }
        help(parts[1].toLowerCase())
        return
    }
    //history command
    if (command === "history") {
        history()
        return
    }
    if (command.startsWith("history ")) {
        UTIL.notify("The history command takes no arguments", "warn")
        return
    }
    //downloads command
    if (["d", "downloads"].includes(command)) {
        downloads()
        return
    }
    if (command.startsWith("d ") || command.startsWith("downloads ")) {
        UTIL.notify("The downloads command takes no arguments", "warn")
        return
    }
    //set command
    if (command.startsWith("set ") || command === "set") {
        const parts = command.split(" ")
        if (parts.length === 2) {
            if (parts[1].endsWith("?")) {
                const setting = parts[1].slice(0, -1)
                const value = SETTINGS.get(setting)
                if (value === undefined) {
                    UTIL.notify(
                        "Unknown setting, try using the suggestions", "warn")
                } else {
                    UTIL.notify(
                        `The setting '${setting}' has the value '${value}'`)
                }
                return
            }
        } else if (parts.length === 3) {
            SETTINGS.set(parts[1], parts[2])
            return
        }
        UTIL.notify(
            "Invalid usage, you could try:\nReading: 'set <setting>?'\n"
            + "Writing: 'set <setting> <value>'", "warn")
        return
    }
    //accept/confirm command
    if (["accept", "confirm"].includes(command)) {
        DOWNLOADS.confirmRequest()
        return
    }
    if (command.startsWith("accept ") || command.startsWith("confirm ")) {
        UTIL.notify("The accept command takes no arguments", "warn")
        return
    }
    //deny/reject command
    if (["deny", "reject"].includes(command)) {
        DOWNLOADS.rejectRequest()
        return
    }
    if (command.startsWith("deny ") || command.startsWith("reject ")) {
        UTIL.notify("The deny command takes no arguments", "warn")
        return
    }
    //no command
    UTIL.notify(`The command '${command}' can not be found`, "warn")
}

const quit = () => {
    if (SETTINGS.get("history.clearOnQuit")) {
        HISTORY.clearHistory()
    }
    TABS.saveTabs()
    if (SETTINGS.get("clearCacheOnQuit")) {
        UTIL.clearCache()
    }
    if (SETTINGS.get("clearCookiesOnQuit")) {
        UTIL.clearCookies()
    }
    if (SETTINGS.get("clearLocalStorageOnQuit")) {
        UTIL.clearLocalStorage()
    }
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
    if (TABS.currentPage().src === "" || alreadyOpen) {
        TABS.navigateTo(pageUrl)
    } else {
        TABS.addTab(pageUrl)
    }
}

const version = () => {
    openSpecialPage("version")
}

const help = (section=null) => {
    openSpecialPage("help", section)
}

const history = () => {
    openSpecialPage("history")
}

const downloads = () => {
    openSpecialPage("downloads")
}

module.exports = {
    execute,
    quit,
    devtools,
    openSpecialPage,
    version,
    help,
    history,
    downloads
}
