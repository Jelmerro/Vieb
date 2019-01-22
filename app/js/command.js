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
/* global SETTINGS */
"use strict"

const { remote } = require("electron")

const execute = command => {
    command = command.trim()
    if (["q", "quit"].indexOf(command) !== -1) {
        quit()
    }
    if (["r", "reload"].indexOf(command) !== -1) {
        SETTINGS.loadFromDisk()
    }
}

const quit = () => {
    remote.getCurrentWindow().destroy()
    remote.app.exit(0)
}

module.exports = {
    execute,
    quit
}
