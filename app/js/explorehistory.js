/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2021 Jelmer van Arnhem
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

const previousSites = []
let previousIndex = -1
let originalSite = ""

const updateNavWithSite = () => {
    let exploreText = originalSite
    if (previousIndex !== -1) {
        exploreText = previousSites[previousIndex]
    }
    document.getElementById("url").value = exploreText
    SUGGEST.suggestExplore(exploreText)
}

const previous = () => {
    if (MODES.currentMode() !== "explore") {
        return
    }
    if (previousIndex === -1) {
        originalSite = document.getElementById("url").value
        previousIndex = previousSites.length - 1
    } else if (previousIndex > 0) {
        previousIndex -= 1
    }
    updateNavWithSite()
}

const next = () => {
    if (MODES.currentMode() !== "explore" || previousIndex === -1) {
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

const push = explore => {
    if (previousSites.length) {
        if (previousSites[previousSites.length - 1] !== explore) {
            previousSites.push(explore)
        }
    } else {
        previousSites.push(explore)
    }
}

module.exports = {previous, next, resetPosition, push}
