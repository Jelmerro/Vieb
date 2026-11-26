/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2026 Jelmer van Arnhem
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

const {appData, appendFile, joinPath, readFile} = require("../util")
const {getSetting} = require("./settings")
const {currentMode, getUrl} = require("./util")

let commandsFile = ""
/** @type {string[]} */
let previousCommands = []
let previousIndex = -1
let originalCommand = ""
let storeCommands = false

/** Load the command hist of the previous session if stored. */
const init = async() => {
    commandsFile = joinPath(await appData(), "commandhist")
    const fileContent = await readFile(commandsFile)
    previousCommands = fileContent?.split("\n").filter(Boolean) || []
}

/** Pause the collection of commands to the history. */
const pause = () => {
    storeCommands = false
}

/** Resume the collection of new commands into the history. */
const resume = () => {
    storeCommands = true
}

/** Show the right entry based on new index set by previous or next. */
const updateNavWithHistory = async() => {
    let commandText = originalCommand
    if (previousIndex !== -1) {
        commandText = previousCommands[previousIndex]
    }
    const url = getUrl()
    if (url) {
        url.value = commandText
    }
    const {suggestCommand} = require("./suggest")
    await suggestCommand(commandText)
}

/** Go to the previous item in the command history. */
const previous = async() => {
    if (currentMode() !== "command") {
        return
    }
    if (previousIndex === -1) {
        originalCommand = getUrl()?.value ?? ""
        previousIndex = previousCommands.length - 1
    } else if (previousIndex > 0) {
        previousIndex -= 1
    }
    await updateNavWithHistory()
}

/** Go to the next item in the command history. */
const next = async() => {
    if (currentMode() !== "command" || previousIndex === -1) {
        return
    }
    if (previousIndex < previousCommands.length - 1) {
        previousIndex += 1
    } else if (previousIndex === previousCommands.length - 1) {
        previousIndex = -1
    }
    await updateNavWithHistory()
}

/** Reset the position info for the command history. */
const resetPosition = () => {
    previousIndex = -1
    originalCommand = ""
}

/**
 * Push a new command to the list, optionally only if done by the user.
 * @param {string} command
 * @param {boolean} user
 */
const push = async(command, user) => {
    const setting = getSetting("commandhist")
    if (!storeCommands || setting === "none") {
        return
    }
    if (!user && setting.includes("useronly")) {
        return
    }
    if (previousCommands.length > 0 && previousCommands.at(-1) === command) {
        return
    }
    previousCommands.push(command)
    if (setting.includes("persist") && commandsFile) {
        await appendFile(commandsFile, `${command}\n`)
    }
}

module.exports = {init, next, pause, previous, push, resetPosition, resume}
