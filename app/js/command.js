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
/* global SETTINGS UTIL */
"use strict"

const { remote } = require("electron")

const execute = command => {
    while (command.indexOf("  ") !== -1) {
        command = command.replace("  ", " ")
    }
    command = command.trim()
    if (["q", "quit"].indexOf(command) !== -1) {
        quit()
        return
    }
    if (command.startsWith("q ") || command.startsWith("quit ")) {
        UTIL.notify("The quit command takes no arguments", "warn")
        return
    }
    if (["r", "reload"].indexOf(command) !== -1) {
        SETTINGS.loadFromDisk()
        return
    }
    if (command.startsWith("r ") || command.startsWith("reload ")) {
        UTIL.notify("The reload command takes no arguments", "warn")
        return
    }
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
    UTIL.notify(`The command '${command}' can not be found`, "warn")
}

const quit = () => {
    remote.getCurrentWindow().destroy()
    remote.app.exit(0)
}

module.exports = {
    execute,
    quit
}
