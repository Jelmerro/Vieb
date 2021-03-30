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
"use strict"

window.addEventListener("DOMContentLoaded", () => {
    // Utility functions not related to any other topic, but used in many
    window.UTIL = require("../util")
    // Static action implementations, input will call them
    window.ACTIONS = require("./actions")
    // Mode specific code
    window.MODES = require("./modes")
    window.COMMAND = require("./command")
    window.COMMANDHISTORY = require("./commandhistory")
    window.EXPLOREHISTORY = require("./explorehistory")
    window.FOLLOW = require("./follow")
    // Tabs and webview handler
    window.TABS = require("./tabs")
    // Listen to all input to block them or connect them to specific actions
    window.INPUT = require("./input")
    // Load custom settings from disk
    window.SETTINGS = require("./settings")
    // Create and manage sessions (container, downloads, adblocking etc.)
    window.SESSIONS = require("./sessions")
    // History manager
    window.HISTORY = require("./history")
    // Suggestions for the navigation bar
    window.SUGGEST = require("./suggest")
    // Pointer based navigation mode (hover, visual, drag, right-click etc.)
    window.POINTER = require("./pointer")
    // Load favicon handler
    window.FAVICONS = require("./favicons")
    // Load the layout manager, for splitting multiple webviews
    window.PAGELAYOUT = require("./pagelayout")
    // Load the context menu code, called when right-clicking anywhere
    window.CONTEXTMENU = require("./contextmenu")
    // Some modules require initialisation
    window.INPUT.init()
    window.SETTINGS.init()
    window.SESSIONS.init()
    window.HISTORY.init()
    window.TABS.init()
    window.FAVICONS.init()
    window.MODES.init()
    window.COMMANDHISTORY.init()
})
