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
const {name, icon, version} = appConfig() ?? {}

const checkForUpdates = () => {
    const versionCheck = document.getElementById("version-check")
    const button = document.querySelector("button")
    if (!versionCheck || !button || !version) {
        return
    }
    versionCheck.textContent = "Loading..."
    button.disabled = true
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
            button.disabled = false
        }
    }
    req.open("GET", apiUrl, true)
    req.send(null)
}

window.addEventListener("load", () => {
    const nameEl = document.getElementById("name")
    if (nameEl) {
        nameEl.textContent = name ?? "Vieb"
    }
    const imgEl = document.querySelector("img")
    if (imgEl && icon) {
        imgEl.src = icon
    }
    const versionEl = document.getElementById("version")
    if (versionEl) {
        versionEl.textContent = version ?? ""
    }
    const buttonEl = document.querySelector("button")
    if (buttonEl) {
        buttonEl.addEventListener("click", checkForUpdates)
    }
    const chromiumVer = document.getElementById("chromium-version")
    if (chromiumVer) {
        chromiumVer.textContent = process.versions.chrome
    }
    const electronVer = document.getElementById("electron-version")
    if (electronVer) {
        electronVer.textContent = process.versions.electron
    }
})
