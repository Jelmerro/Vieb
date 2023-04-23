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

const {appConfig, compareVersions} = require("../util")

const apiUrl = "https://api.github.com/repos/Jelmerro/Vieb/releases/latest"
const {name, icon, version} = appConfig()

const checkForUpdates = () => {
    document.querySelector("button").disabled = true
    const versionCheck = document.getElementById("version-check")
    versionCheck.textContent = "Loading..."
    const req = new XMLHttpRequest()
    req.onreadystatechange = () => {
        if (req.readyState === 4) {
            if (req.status === 200) {
                try {
                    const release = JSON.parse(req.responseText)
                    const diff = compareVersions(version, release.tag_name)
                    if (diff === "older") {
                        versionCheck.textContent
                            = `New version ${release.tag_name} is available`
                    } else if (diff === "newer") {
                        versionCheck.textContent
                            = `Latest release ${release.tag_name} is older`
                    } else if (diff === "even") {
                        versionCheck.textContent
                            = "Your Vieb is up to date"
                    } else {
                        versionCheck.textContent = "Failed to fetch updates"
                    }
                } catch {
                    versionCheck.textContent = "Failed to fetch updates"
                }
            } else {
                versionCheck.textContent = "Failed to fetch updates"
            }
            document.querySelector("button").disabled = false
        }
    }
    req.open("GET", apiUrl, true)
    req.send(null)
}

window.addEventListener("load", () => {
    document.getElementById("name").textContent = name
    if (icon) {
        document.querySelector("img").src = icon
    }
    document.getElementById("version").textContent = version
    document.querySelector("button").onclick = checkForUpdates
    document.getElementById("chromium-version")
        .textContent = process.versions.chrome
    document.getElementById("electron-version")
        .textContent = process.versions.electron
})
