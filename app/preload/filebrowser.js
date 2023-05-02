/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2021 Jelmer van Arnhem
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
const {joinPath, basePath} = require("../util")

const styling = `body {color: var(--fg, #eee);display: flex;
    font: 14px monospace;line-height: 1.5;margin: 0;}
main {margin: 3em auto;width: 50vw;background: #7772;min-width: 300px;
    padding: 3em;overflow: visible;text-overflow: ellipsis;height: fit-content;}
h2 {font-size: 2em;margin: 0 0 1em;}
.dir, .file {margin: .7em;cursor: pointer;}
.dir {font-weight: bold;color: var(--suggestions-file, #ffb);}
.file {color: var(--suggestions-url, #bff);}
.error {color: var(--notification-error, #f33);}`

/**
 * Create a dir or file element with onclick handler and return it.
 * @param {"file"|"dir"} type
 * @param {string} loc
 * @param {string|null} customTitle
 */
const createElement = (type, loc, customTitle = null) => {
    const element = document.createElement("div")
    element.className = type
    element.textContent = customTitle || basePath(loc)
    if (type === "dir") {
        element.textContent += "/"
    }
    element.onclick = () => ipcRenderer.sendToHost("navigate-to", toUrl(loc))
    return element
}

/**
 * Convert a location to a clickable url.
 * @param {string} loc
 */
const toUrl = loc => `file:${loc}`.replace(/^file:\/+/, "file:///")

/**
 * Check if the provided location is the root location of the system.
 * @param {string} loc
 */
const isRoot = loc => loc === joinPath(loc, "../")

/**
 * Insert the current directory info into the page to explore local files.
 * @param {Electron.IpcRendererEvent} _
 * @param {string[]} directories
 * @param {string[]} files
 * @param {boolean} allowed
 * @param {string} folder
 */
const insertCurrentDirInfo = (_, directories, files, allowed, folder) => {
    // Styling
    const styleElement = document.createElement("style")
    styleElement.textContent = styling
    document.head.appendChild(styleElement)
    // Main
    const main = document.createElement("main")
    const title = document.createElement("h2")
    title.textContent = folder
    main.appendChild(title)
    if (!isRoot(folder)) {
        main.appendChild(createElement("dir", joinPath(folder, "../"), ".."))
    }
    if (!allowed) {
        const error = document.createElement("span")
        error.textContent = "Permission denied"
        error.className = "error"
        main.appendChild(error)
    } else if (directories.length === 0 && files.length === 0) {
        const error = document.createElement("span")
        error.textContent = "Empty directory"
        error.className = "error"
        main.appendChild(error)
    } else {
        directories.forEach(dir => {
            main.appendChild(createElement("dir", dir))
        })
        files.forEach(file => {
            main.appendChild(createElement("file", file))
        })
    }
    document.body.appendChild(main)
}
ipcRenderer.on("insert-current-directory-files", insertCurrentDirInfo)
