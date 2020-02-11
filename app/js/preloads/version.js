/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2020 Jelmer van Arnhem
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

const {remote} = require("electron")

const apiUrl = "https://api.github.com/repos/Jelmerro/Vieb/releases/latest"
const version = process.env.npm_package_version || remote.app.getVersion()

const compareVersions = (v1, v2) => {
    v1 = v1.replace(/^v/g, "").trim()
    v2 = v2.replace(/^v/g, "").trim()
    if (v1 === v2) {
        return "even"
    }
    const [v1num, v1ext] = v1.split("-")
    const [v2num, v2ext] = v2.split("-")
    // Same number and at least one of them has a suffix such as "-dev"
    if (v1num === v2num) {
        if (v1ext && v2ext) {
            return "unknown"
        }
        if (v1ext) {
            return "older"
        }
        if (v2ext) {
            return "newer"
        }
    }
    // Test if the version number is actually formatted like "1.1.1" or similar
    if (!/^\d*\.\d*\.\d*$/.test(v1num) || !/^\d*\.\d*\.\d*$/.test(v2num)) {
        return "unknown"
    }
    for (let i = 0;i < 3;i++) {
        if (Number(v1num.split(".")[i]) > Number(v2num.split(".")[i])) {
            return "newer"
        }
        if (Number(v1num.split(".")[i]) < Number(v2num.split(".")[i])) {
            return "older"
        }
    }
    return "even"
}

const checkForUpdates = () => {
    document.querySelector("button").disabled = "disabled"
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
                            = `New version ${release.tag_name} is available!`
                    } else if (diff === "newer") {
                        versionCheck.textContent
                            = `Latest release ${release.tag_name} is older.`
                    } else if (diff === "even") {
                        versionCheck.textContent
                            = "Your Vieb is up to date."
                    } else {
                        versionCheck.textContent = "Failed to fetch updates."
                    }
                } catch (e) {
                    versionCheck.textContent = "Failed to fetch updates."
                }
            } else {
                versionCheck.textContent = "Failed to fetch updates."
            }
            document.querySelector("button").disabled = false
        }
    }
    req.open("GET", apiUrl, true)
    req.send(null)
}

window.addEventListener("load", () => {
    document.getElementById("version").textContent = version
    document.querySelector("button").onclick = checkForUpdates
    document.getElementById("chromium-version")
        .textContent = process.versions.chrome
    document.getElementById("electron-version")
        .textContent = process.versions.electron
})
