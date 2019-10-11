/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019 Jelmer van Arnhem
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

// Some styling is flagged with important, because of the default light theme
const styling = `
body {background: #333 !important;color: #eee !important;display: flex;
    font-family: monospace;line-height: 2;margin: 0;}
#main {margin: auto;width: 50vw;background: #444;padding: 50px;
    min-width: 300px;overflow: hidden;text-overflow: ellipsis;}
a {color: #0cf;}
kbd {background: #111;color: #fff;padding: 0.1em;}
 {
`
const sslErrors = [
    "ERR_CERT_COMMON_NAME_INVALID",
    "ERR_SSL_PROTOCOL_ERROR",
    "ERR_CERT_AUTHORITY_INVALID"
]

ipcRenderer.on("insert-failed-page-info", (_, e) => {
    const styleElement = document.createElement("style")
    styleElement.textContent = styling
    document.head.appendChild(styleElement)
    const mainInfo = document.createElement("div")
    if (sslErrors.includes(e.errorDescription)) {
        const http = e.validatedURL.replace("https://", "http://")
        mainInfo.innerHTML += `<h1>Redirect to HTTP Blocked</h1>
            The page could not be loaded succesfully,
            because HTTP redirects are disabled.
            You can enabled them with this command:
            <kbd>set redirectToHttp=true</kbd><br>
            Alternatively, you can choose to go there just this once
            by clicking the HTTP link:
            <a href=${http}>${http}</a><br>
            The exact error that caused this request to be blocked:
            </kbd>${e.errorDescription}</kbd>`
    } else {
        mainInfo.innerHTML += `<h1>Unreachable page</h1>
            The page could not be loaded succesfully.
            The following error occured:<br>
            <h3>${e.errorDescription}</h3>
            The first step you could try is reloading the page by pressing the
            <kbd>r</kbd> key from normal mode. If the error persists,
            make sure you typed the url correctly. Finally,
            please check your internet connection and DNS settings.`
    }
    mainInfo.id = "main"
    document.body.appendChild(mainInfo)
})
