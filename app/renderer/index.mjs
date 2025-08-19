/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2025 Jelmer van Arnhem
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

import {init as commandhistoryInit} from "./commandhistory.js"
import {init as contextmenuInit} from "./contextmenu.js"
import {init as explorehistoryInit} from "./explorehistory.js"
import {init as faviconsInit} from "./favicons.js"
import {init as followInit} from "./follow.js"
import {init as historyInit} from "./history.js"
import {init as inputInit} from "./input.js"
import {init as modesInit} from "./modes.js"
import {init as pointerInit} from "./pointer.js"
import {init as settingsInit} from "./settings.js"
import {init as tabsInit} from "./tabs.js"

window.addEventListener("DOMContentLoaded", () => {
    inputInit()
    settingsInit()
    historyInit()
    tabsInit()
    faviconsInit()
    modesInit()
    commandhistoryInit()
    explorehistoryInit()
    followInit()
    contextmenuInit()
    pointerInit()
})
