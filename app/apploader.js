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
"use strict"

window.addEventListener("DOMContentLoaded", () => {
    // Utility functions not related to any other topic, but used in many
    window.UTIL = require("./js/util")
    // Static action implementations, input will call them
    window.ACTIONS = require("./js/actions")
    // Mode specific code
    window.MODES = require("./js/modes")
    window.COMMAND = require("./js/command")
    window.COMMANDHISTORY = require("./js/commandhistory")
    window.FOLLOW = require("./js/follow")
    // Tabs and webview handler
    window.TABS = require("./js/tabs")
    // Listen to all input to block them or connect them to specific actions
    window.INPUT = require("./js/input")
    // Load custom settings from disk
    window.SETTINGS = require("./js/settings")
    // Create and manage sessions (container, downloads, adblocking etc.)
    window.SESSIONS = require("./js/sessions")
    // History manager
    window.HISTORY = require("./js/history")
    // Suggestions for the navigation bar
    window.SUGGEST = require("./js/suggest")
    // Pointer based navigation mode (hover, visual, drag, right-click etc.)
    window.POINTER = require("./js/pointer")
    // Load favicon handler
    window.FAVICONS = require("./js/favicons")
    // Load the layout manager, for splitting multiple webviews
    window.PAGELAYOUT = require("./js/pagelayout")
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
