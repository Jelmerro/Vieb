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
    while (command.indexOf("  ") !== -1) {
        command = command.replace("  ", " ")
    }
    command = command.trim()
    //quit command
    if (["q", "quit"].indexOf(command) !== -1) {
        quit()
        return
    }
    if (command.startsWith("q ") || command.startsWith("quit ")) {
        UTIL.notify("The quit command takes no arguments", "warn")
        return
    }
    //devtools command
    if (["dev", "devtools"].indexOf(command) !== -1) {
        devtools()
        return
    }
    if (command.startsWith("dev ") || command.startsWith("devtools ")) {
        UTIL.notify("The devtools command takes no arguments", "warn")
        return
    }
    //reload command
    if (["r", "reload"].indexOf(command) !== -1) {
        SETTINGS.loadFromDisk()
        return
    }
    if (command.startsWith("r ") || command.startsWith("reload ")) {
        UTIL.notify("The reload command takes no arguments", "warn")
        return
    }
    //version command
    if (["v", "version"].indexOf(command) !== -1) {
        version()
        return
    }
    if (command.startsWith("v ") || command.startsWith("version ")) {
        UTIL.notify("The version command takes no arguments", "warn")
        return
    }
    //help command
    if (["h", "help"].indexOf(command) !== -1) {
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
    //downloads command
    if (["d", "downloads"].indexOf(command) !== -1) {
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
        if (parts.length !== 3) {
            UTIL.notify(
                "The set command always takes two arguments like this:\n"
                + "'set <setting> <value>'", "warn")
            return
        }
        SETTINGS.set(parts[1], parts[2])
        return
    }
    //accept/confirm command
    if (["accept", "confirm"].indexOf(command) !== -1) {
        DOWNLOADS.confirmRequest()
        return
    }
    if (command.startsWith("accept ") || command.startsWith("confirm ")) {
        UTIL.notify("The accept command takes no arguments", "warn")
        return
    }
    //deny/reject command
    if (["deny", "reject"].indexOf(command) !== -1) {
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
    DOWNLOADS.cancelAll()
    DOWNLOADS.writeToFile()
    if (SETTINGS.get("clearCacheOnQuit")) {
        UTIL.clearCache()
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
    let pageUrl = UTIL.specialPage(specialPage)
    //Switch to already open help if available
    let alreadyOpen = false
    TABS.listPages().forEach((page, index) => {
        if (decodeURIComponent(page.src).startsWith(pageUrl)) {
            alreadyOpen = true
            TABS.switchToTab(index)
        } else if (page.src.startsWith(pageUrl)) {
            alreadyOpen = true
            TABS.switchToTab(index)
        }
    })
    //Append section to the helpUrl
    if (section !== null) {
        if (section.startsWith("#")) {
            section = section.slice(1)
        }
        pageUrl += `#${section}`
    }
    //Open the url in the current or new tab, depending on currently open page
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
    downloads
}
