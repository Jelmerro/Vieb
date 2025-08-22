/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2025 Jelmer van Arnhem
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

import {appConfig} from "../preloadutil.js"
import {translate, translateAsHTML} from "../translate.js"
import {compareVersions} from "../util.js"

const apiUrl = "https://api.github.com/repos/Jelmerro/Vieb/releases/latest"
const {icon, name, versions} = appConfig() ?? {}

/** Check for updates to Vieb on button click via Github. */
const checkForUpdates = () => {
    const versionCheck = document.getElementById("version-check")
    const button = document.querySelector("button")
    if (!versionCheck || !button || !versions?.app) {
        return
    }
    versionCheck.textContent = translate("pages.version.loading")
    button.disabled = true
    const req = new XMLHttpRequest()
    /** Compare the current version to the latest Github version and report. */
    req.onreadystatechange = () => {
        if (req.readyState === 4) {
            if (req.status === 200) {
                try {
                    const release = JSON.parse(req.responseText)
                    const diff = compareVersions(versions.app, release.tag_name)
                    if (diff === "older") {
                        versionCheck.textContent = translate(
                            "pages.version.newerFound",
                            {"fields": [release.tag_name]})
                    } else if (diff === "newer") {
                        versionCheck.textContent = translate(
                            "pages.version.alreadyNewer",
                            {"fields": [release.tag_name]})
                    } else if (diff === "even") {
                        versionCheck.textContent = translate(
                            "pages.version.latest")
                    } else {
                        versionCheck.textContent = translate(
                            "pages.version.failed")
                    }
                } catch {
                    versionCheck.textContent = translate("pages.version.failed")
                }
            } else {
                versionCheck.textContent = translate("pages.version.failed")
            }
            button.disabled = false
        }
    }
    req.open("GET", apiUrl, true)
    req.send(null)
}

/** Load translations and add event listener for update button. */
const init = () => {
    const subtitleEl = document.getElementById("subtitle")
    if (subtitleEl) {
        subtitleEl.textContent = translate("util.catchphrase")
    }
    const buttonEl = document.querySelector("button")
    if (buttonEl) {
        buttonEl.textContent = translate("pages.version.checkUpdate")
    }
    const checkResultEl = document.getElementById("version-check")
    if (checkResultEl) {
        checkResultEl.textContent = translate("pages.version.notChecked")
    }
    /** @type {{
     *   src: string, id: import("../../types/i18n.js").TranslationKeys
     * }[]} */
    const versionLinks = [
        {"id": "pages.version.homepage", "src": "vieb.dev"},
        {"id": "pages.version.repository", "src": "github.com/Jelmerro/Vieb"},
        {
            "id": "pages.version.releases",
            "src": "github.com/Jelmerro/Vieb/releases"
        },
        {"id": "pages.version.sponsor", "src": "github.com/sponsors/Jelmerro"},
        {"id": "pages.version.donate", "src": "ko-fi.com/Jelmerro"},
        {
            "id": "pages.version.faq",
            "src": "github.com/Jelmerro/Vieb/blob/master/FAQ.md"
        },
        {
            "id": "pages.version.changelog",
            "src": "github.com/Jelmerro/Vieb/blob/master/CHANGELOG.md"
        },
        {"id": "pages.version.matrix", "src": "matrix.to/#/#vieb:matrix.org"},
        {"id": "pages.version.telegram", "src": "t.me/vieb_general"},
        {
            "id": "pages.version.discussions",
            "src": "github.com/Jelmerro/Vieb/discussions"
        }
    ]
    const versionLinksEl = document.getElementById("version-links")
    if (versionLinksEl) {
        for (const link of versionLinks) {
            const linkEl = document.createElement("a")
            linkEl.href = `https://${link.src}`
            linkEl.textContent = translate(link.id)
            versionLinksEl.append(linkEl)
        }
    }
    const descriptionEl = document.getElementById("description")
    if (descriptionEl) {
        descriptionEl.append(...translateAsHTML("pages.version.description",
            {"fields": [versions?.electron ?? "", versions?.chrome ?? ""]}))
    }
    // Regular init
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
        versionEl.textContent = versions?.app ?? ""
    }
    if (buttonEl) {
        buttonEl.addEventListener("click", checkForUpdates)
    }
}

if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init)
} else {
    init()
}
