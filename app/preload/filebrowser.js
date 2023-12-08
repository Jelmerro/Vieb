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
const {translate} = require("../translate")
const {joinPath, basePath, dirname} = require("../util")

/**
 * Convert a location to a clickable url.
 * @param {string} loc
 */
const toUrl = loc => `file:${loc}`.replace(/^file:\/+/, "file:///")

/**
 * Create a dir or file element with onclick handler and return it.
 * @param {"file"|"dir"|"breadcrumb"} type
 * @param {string} loc
 * @param {string|null} customTitle
 */
const createElement = (type, loc, customTitle = null) => {
    const element = document.createElement("div")
    element.className = type
    element.textContent = customTitle || basePath(loc)
    if (type !== "file") {
        element.textContent += "/"
    }
    /** Navigate to the clicked file using the url syntax. */
    element.onclick = () => ipcRenderer.sendToHost("navigate-to", toUrl(loc))
    return element
}

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
    document.body.textContent = ""
    document.body.id = "filebrowser"
    const main = document.createElement("main")
    const title = document.createElement("h2")
    let breadcrumb = folder
    let counter = 0
    while (!isRoot(breadcrumb) || counter > 1000) {
        const dir = basePath(breadcrumb)
        title.prepend(createElement("breadcrumb", breadcrumb, dir))
        breadcrumb = dirname(breadcrumb)
        counter += 1
    }
    title.prepend(createElement("breadcrumb", breadcrumb, basePath(breadcrumb)))
    main.append(title)
    if (!isRoot(folder)) {
        main.append(createElement("dir", joinPath(folder, "../"), ".."))
    }
    if (!allowed) {
        const error = document.createElement("span")
        error.textContent = translate("pages.filebrowser.permissionDenied")
        error.className = "error"
        main.append(error)
    } else if (directories.length === 0 && files.length === 0) {
        const error = document.createElement("span")
        error.textContent = translate("pages.filebrowser.empty")
        error.className = "error"
        main.append(error)
    } else {
        directories.forEach(dir => {
            main.append(createElement("dir", dir))
        })
        files.forEach(file => {
            main.append(createElement("file", file))
        })
    }
    document.body.append(main)
}

ipcRenderer.on("insert-current-directory-files", insertCurrentDirInfo)
