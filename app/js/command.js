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
/* global MODES SETTINGS TABS UTIL */
"use strict"

const { remote } = require("electron")
const url = require("url")
const path = require("path")

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
    //reload command
    if (["r", "reload"].indexOf(command) !== -1) {
        SETTINGS.loadFromDisk()
        return
    }
    if (command.startsWith("r ") || command.startsWith("reload ")) {
        UTIL.notify("The reload command takes no arguments", "warn")
        return
    }
    //reload command
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
    //no command
    UTIL.notify(`The command '${command}' can not be found`, "warn")
}

const quit = () => {
    remote.getCurrentWindow().destroy()
    remote.app.exit(0)
}

const version = () => {
    MODES.setMode("normal")
    const versionUrl = url.format({
        pathname: path.join(__dirname, "../version.html"),
        protocol: "file:",
        slashes: true
    })
    //Switch to already open help if available
    let alreadyOpen = false
    TABS.listPages().forEach((page, index) => {
        if (!page.src || decodeURIComponent(page.src).startsWith(versionUrl)) {
            alreadyOpen = true
            TABS.switchToTab(index)
        }
    })
    //Open the url in the current or new tab, depending on currently open page
    if (TABS.currentPage().src === "" || alreadyOpen) {
        TABS.navigateTo(versionUrl)
    } else {
        TABS.addTab(versionUrl)
    }
    const version = "0.1.0"
    TABS.currentPage().executeJavaScript(
        `document.getElementById('version').textContent = "${version}"`)
}

const help = (section=null) => {
    MODES.setMode("normal")
    let helpUrl = url.format({
        pathname: path.join(__dirname, "../help.html"),
        protocol: "file:",
        slashes: true
    })
    //Switch to already open help if available
    let alreadyOpen = false
    TABS.listPages().forEach((page, index) => {
        if (!page.src || decodeURIComponent(page.src).startsWith(helpUrl)) {
            alreadyOpen = true
            TABS.switchToTab(index)
        }
    })
    //Append section to the helpUrl
    if (section !== null) {
        if (section.startsWith("#")) {
            section = section.slice(1, -1)
        }
        helpUrl += `#${section}`
    }
    //Open the url in the current or new tab, depending on currently open page
    if (TABS.currentPage().src === "" || alreadyOpen) {
        TABS.navigateTo(helpUrl)
    } else {
        TABS.addTab(helpUrl)
    }
}

module.exports = {
    execute,
    quit,
    version,
    help
}
