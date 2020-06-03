/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2020 Jelmer van Arnhem
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

const {remote} = require("electron")
const path = require("path")

const windowStateFile = path.join(remote.app.getPath("appData"), "windowstate")

const init = () => {
    load()
    // Save the window state when resizing or maximizing.
    // Move and resize state are saved and checked to detect window snapping.
    let justMoved = false
    let justResized = false
    UTIL.windowByName("main").on("maximize", saveWindowState)
    UTIL.windowByName("main").on("unmaximize", () => {
        saveWindowState(true)
    })
    UTIL.windowByName("main").on("resize", () => {
        justResized = true
        setTimeout(() => {
            if (!justMoved) {
                saveWindowState()
            }
        }, 10)
        setTimeout(() => {
            justResized = false
        }, 30)
    })
    UTIL.windowByName("main").on("move", () => {
        justMoved = true
        setTimeout(() => {
            if (!justResized) {
                saveWindowState()
            }
        }, 10)
        setTimeout(() => {
            justMoved = false
        }, 30)
    })
}

const load = () => {
    // Load the window state
    const bounds = {}
    const parsed = UTIL.readJSON(windowStateFile)
    if (parsed) {
        bounds.x = Number(parsed.x)
        bounds.y = Number(parsed.y)
        bounds.width = Number(parsed.width)
        bounds.height = Number(parsed.height)
        bounds.maximized = !!parsed.maximized
    }
    if (SETTINGS.get("restorewindowposition")) {
        if (bounds.x > 0 && bounds.y > 0) {
            UTIL.windowByName("main").setPosition(
                bounds.x, bounds.y)
        }
    }
    if (SETTINGS.get("restorewindowsize")) {
        if (bounds.width > 500 && bounds.height > 500) {
            UTIL.windowByName("main").setSize(
                bounds.width, bounds.height)
        }
    }
    if (bounds.maximized && SETTINGS.get("restorewindowmaximize")) {
        UTIL.windowByName("main").maximize()
    }
    UTIL.windowByName("main").show()
}

const saveWindowState = (maximizeOnly = false) => {
    let state = UTIL.readJSON(windowStateFile) || {}
    if (!maximizeOnly && !UTIL.windowByName("main").isMaximized()) {
        const newBounds = UTIL.windowByName("main").getBounds()
        const currentScreen = remote.screen.getDisplayMatching(newBounds).bounds
        if (newBounds.width !== currentScreen.width) {
            if (newBounds.height !== currentScreen.height) {
                if (newBounds.width !== currentScreen.width / 2) {
                    if (newBounds.height !== currentScreen.height / 2) {
                        if (newBounds.x !== currentScreen.x / 2) {
                            if (newBounds.y / 2 !== currentScreen.y / 2) {
                                state = newBounds
                            }
                        }
                    }
                }
            }
        }
    }
    state.maximized = UTIL.windowByName("main").isMaximized()
    UTIL.writeJSON(windowStateFile, state)
}

module.exports = {init}
