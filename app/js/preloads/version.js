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

const { remote } = require("electron")

window.addEventListener("load", () => {
    const version = process.env.npm_package_version || remote.app.getVersion()
    document.getElementById("version").textContent = version
    const apiUrl = "https://api.github.com/repos/Jelmerro/Vieb/releases/latest"
    const versionCheck = document.getElementById("version-check")
    document.querySelector("button").onclick = () => {
        versionCheck.textContent = "Loading..."
        const req = new XMLHttpRequest()
        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    try {
                        const release = JSON.parse(req.responseText)
                        if (release.tag_name !== version) {
                            versionCheck.textContent =
                                `Version ${release.tag_name} available!`
                            return
                        }
                    } catch (e) {
                        versionCheck.textContent = "Failed to fetch updates."
                        return
                    }
                    versionCheck.textContent = "Your Vieb is up to date."
                    return
                }
                versionCheck.textContent = "Failed to fetch updates."
            }
        }
        req.open("GET", apiUrl, true)
        req.send(null)
    }
    document.getElementById("chromium-version")
        .textContent = /Chrome\/(.*) /.exec(navigator.userAgent)[1]
})
