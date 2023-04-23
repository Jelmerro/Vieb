/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2021-2023 Jelmer van Arnhem
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

const {currentMode, getSetting, getUrl} = require("./common")
const {joinPath, appData, appendFile, readFile} = require("../util")

const exploreFile = joinPath(appData(), "explorehist")
let previousSites = []
let previousIndex = -1
let originalSite = ""

const init = () => {
    previousSites = readFile(exploreFile)?.split("\n").filter(s => s) || []
}

const updateNavWithSite = () => {
    let exploreText = originalSite
    if (previousIndex !== -1) {
        exploreText = previousSites[previousIndex]
    }
    getUrl().value = exploreText
    const {suggestExplore} = require("./suggest")
    suggestExplore(exploreText)
}

const previous = () => {
    if (currentMode() !== "explore") {
        return
    }
    if (previousIndex === -1) {
        originalSite = getUrl().value
        previousIndex = previousSites.length - 1
    } else if (previousIndex > 0) {
        previousIndex -= 1
    }
    updateNavWithSite()
}

const next = () => {
    if (currentMode() !== "explore" || previousIndex === -1) {
        return
    }
    if (previousIndex < previousSites.length - 1) {
        previousIndex += 1
    } else if (previousIndex === previousSites.length - 1) {
        previousIndex = -1
    }
    updateNavWithSite()
}

const resetPosition = () => {
    previousIndex = -1
    originalSite = ""
}

/**
 * Push a new user navigation to the list
 *
 * @param {string} explore
 */
const push = explore => {
    const setting = getSetting("explorehist")
    if (setting === "none") {
        return
    }
    if (previousSites.length) {
        if (previousSites[previousSites.length - 1] === explore) {
            return
        }
    }
    previousSites.push(explore)
    if (setting === "persist") {
        appendFile(exploreFile, `${explore}\n`)
    }
}

module.exports = {init, next, previous, push, resetPosition}
