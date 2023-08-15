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

ipcRenderer.on("insert-failed-page-info", (_, e, isSSLError) => {
    document.body.textContent = ""
    document.body.id = "failedload"
    const err = JSON.parse(e)
    const mainInfo = document.createElement("main")
    if (isSSLError) {
        const http = err.validatedURL.replace(/^https?:\/\//g, "http://")
        mainInfo.innerHTML += `<h2>Unreachable page</h2>
            The page could not be loaded successfully.
            The following error occurred:<br><h3>${err.errorDescription}</h3>
            You can enable automatic HTTP redirects with
            <kbd>:set redirecttohttp</kbd>.<br>
            Alternatively, you can choose to go there just once via this HTTP
            link: <a href=${http}>${http}</a><br>
            Finally, you can control what to do with invalid certificates
            by changing <kbd>permissioncertificateerror</kbd>.`
    } else {
        mainInfo.innerHTML += `<h2>Unreachable page</h2>
            The page could not be loaded successfully.
            The following error occurred:<br><h3>${err.errorDescription}</h3>
            The first step you could try is reloading the page, by default
            mapped to <kbd>r</kbd> in normal mode. If the error persists, make
            sure you typed the url correctly. Alternatively, the website might
            not support the '${err.validatedURL.replace(/:.*$/g, "")}' protocol.
            Finally, please check your internet connection and DNS settings.`
    }
    document.body.append(mainInfo)
})
