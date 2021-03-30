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
/* global MODES SUGGEST */
"use strict"

const previousCommands = []
let previousIndex = -1
let originalCommand = ""
let storeCommands = false

const init = () => {
    storeCommands = true
}

const pause = () => {
    storeCommands = false
}

const resume = () => {
    storeCommands = true
}

const updateNavWithHistory = () => {
    let commandText = originalCommand
    if (previousIndex !== -1) {
        commandText = previousCommands[previousIndex]
    }
    document.getElementById("url").value = commandText
    SUGGEST.suggestCommand(commandText)
}

const previous = () => {
    if (MODES.currentMode() !== "command") {
        return
    }
    if (previousIndex === -1) {
        originalCommand = document.getElementById("url").value
        previousIndex = previousCommands.length - 1
    } else if (previousIndex > 0) {
        previousIndex -= 1
    }
    updateNavWithHistory()
}

const next = () => {
    if (MODES.currentMode() !== "command" || previousIndex === -1) {
        return
    }
    if (previousIndex < previousCommands.length - 1) {
        previousIndex += 1
    } else if (previousIndex === previousCommands.length - 1) {
        previousIndex = -1
    }
    updateNavWithHistory()
}

const resetPosition = () => {
    previousIndex = -1
    originalCommand = ""
}

const push = command => {
    if (!storeCommands) {
        return
    }
    if (previousCommands.length) {
        if (previousCommands[previousCommands.length - 1] !== command) {
            previousCommands.push(command)
        }
    } else {
        previousCommands.push(command)
    }
}

module.exports = {init, pause, resume, previous, next, resetPosition, push}
