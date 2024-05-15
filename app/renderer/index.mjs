/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2024 Jelmer van Arnhem
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
window.addEventListener("DOMContentLoaded", async() => {
    (await import("./input.js")).init()
    ;(await import("./settings.js")).init()
    ;(await import("./history.js")).init()
    ;(await import("./tabs.js")).init()
    ;(await import("./favicons.js")).init()
    ;(await import("./modes.js")).init()
    ;(await import("./commandhistory.js")).init()
    ;(await import("./explorehistory.js")).init()
    ;(await import("./follow.js")).init()
    ;(await import("./contextmenu.js")).init()
    ;(await import("./pointer.js")).init()
})
