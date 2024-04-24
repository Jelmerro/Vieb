/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2023 Jelmer van Arnhem
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
const {translateAsHTML} = require("../translate")

ipcRenderer.on("insert-failed-page-info", (_, e, isSSLError) => {
    document.body.textContent = ""
    document.body.id = "failedload"
    const err = JSON.parse(e)
    const mainInfo = document.createElement("main")
    if (isSSLError) {
        const http = err.validatedURL.replace(/^https?:\/\//g, "http://")
        mainInfo.append(...translateAsHTML("pages.failedload.sslError",
            {"fields": [err.errorDescription, http]}))
    } else {
        const protocol = err.validatedURL.replace(/:.*$/g, "")
        mainInfo.append(...translateAsHTML("pages.failedload.otherError",
            {"fields": [err.errorDescription, protocol]}))
    }
    document.body.append(mainInfo)
})
