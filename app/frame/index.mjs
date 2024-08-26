/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2024 Jelmer van Arnhem
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

import "./modes.js"
import {ipcRenderer} from "electron"

window.addEventListener("keyup", e => e.preventDefault())
window.addEventListener("keypress", e => e.preventDefault())
window.addEventListener("keydown", e => {
    e.preventDefault()
    if (e.isComposing || e.which === 229) {
        return
    }
    if (document.body.classList.contains("fullscreen")) {
        // TODO
        // ACTIONS.toInsertMode()
        return
    }
    ipcRenderer.send("keydown", {
        "altKey": e.altKey,
        "bubbles": e.bubbles,
        "ctrlKey": e.ctrlKey,
        "isComposing": e.isComposing,
        "isTrusted": e.isTrusted,
        "key": e.key,
        "location": e.location,
        "metaKey": e.metaKey,
        "shiftKey": e.shiftKey
    })
})
