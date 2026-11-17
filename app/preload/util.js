/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2026 Jelmer van Arnhem
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

const {ipcRenderer} = require("electron")

/**
 * @typedef {(typeof import("../renderer/settings").defaultSettings & {
 *   "fg": string
 *   "bg": string
 *   "linkcolor": string
 * })} validSetting
 */
/**
 * Get a setting from the settings file.
 * @template {keyof validSetting} T Valid setting names.
 * @param {T} set
 * @returns {Promise<validSetting[T]>}
 */
const getSetting = set => new Promise(res => {
    ipcRenderer.once(`setting-query-response-${set}`, (_, value) => {
        res(value)
    })
    ipcRenderer.sendToHost("setting-query", set)
})

/**
 * Send a notification to the renderer thread.
 * @param {import("../renderer/common").NotificationInfo} opts
 */
const notify = opts => ipcRenderer.sendToHost("notify", opts)

module.exports = {getSetting, notify}
