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
"use strict"

const {ipcRenderer} = require("electron")
const {
    appData,
    getSetting,
    isAbsolutePath,
    isFile,
    isValidColor,
    joinPath,
    notify,
    pathToSpecialPageName,
    readFile,
    readJSON,
    specialChars,
    specialCharsAllowSpaces,
    writeJSON
} = require("../util")
const {
    currentPage,
    currentTab,
    listReadyPages
} = require("./common")

/**
 * @typedef {{
 *  keywords: string[],
 *  name: string,
 *  path: string
 * }} Folder
 */

/**
 * @typedef {{
 *  id: number,
 *  name: string,
 *  title: string,
 *  url: string,
 *  path: string,
 *  keywords: string[],
 *  bg?: string,
 *  fg?: string,
 *  tag?: string[],
 * }} Bookmark
 */

/**
 * @typedef {{
 *   bookmarks: Bookmark[],
 *   folders: Folder[],
 *   lastId: number,
 * }} BookmarkData
 */

const emptyBookmarkData = {
    "bookmarks": [],
    "folders": [],
    "lastId": 0
}

/** @type {BookmarkData} */
let bookmarkData = emptyBookmarkData
let bookmarksFile = ""
const validFoldersOptions = [
    "keywords",
    "name",
    "path"
]
const validBookmarkOptions = [
    "bg",
    "fg",
    "id",
    "keywords",
    "name",
    "path",
    "title",
    "url",
    "tag"
]

/**
 * Returns bookmarkData object.
 */
const getBookmarkData = () => bookmarkData

/**
 * Adds folder to the bookmarkData for the given path.
 * @param {string} path - The path of the folder to add.
 */
const addFolder = path => {
    const currentStoredPaths = bookmarkData.folders.map(f => f.path)
    if (!currentStoredPaths?.includes(path)) {
        bookmarkData.folders.push(
            {"keywords": [], "name": "", path})
    }
}


/**
 * Write JSON to file.
 */
const writeBookmarksToFile = () => {
    writeJSON(bookmarksFile, bookmarkData)
}

/**
 * Notify any open bookmarks pages to refresh their display.
 */
const notifyBookmarksPages = () => {
    for (const page of listReadyPages()) {
        if (pathToSpecialPageName(page.src)?.name === "bookmarks") {
            page.send("bookmark-data-response", bookmarkData)
        }
    }
}

/**
 * Handle keywords option.
 * @param {string} value
*/
const handleKeywords = value => {
    return value.split(",").map(
        item => item.trim()).filter(Boolean)
}

/**
 * Handle name option.
 * @param {string} value
*/
const handleName = value => {
    return value.replace(specialCharsAllowSpaces, "")
}

/**
 * Handle path option.
 * @param {string} value
*/
const handlePath = value => {
    let pathValue = ""
    if (value.startsWith("/")) {
        pathValue = value
    } else {
        pathValue = `/${value}`
    }
    pathValue = pathValue.replace(/\s/g, "-").replace(/\/$/, "")
    return pathValue
}

/**
 * Prepare bookmark's object.
 * @param {string[]} input - The input to parse.
 */
const bookmarkObject = input => {
    /** @type {Bookmark} */
    const newbookmark = {
        "id": bookmarkData.lastId,
        "keywords": [],
        "name": "",
        "path": "",
        "title": "",
        "url": ""
    }
    // If there's "=" or "~" we parse the input.
    if (input.join(",").includes("=") || input.join(",").includes("~")) {
        // Retain spaces for multiple word inputs.
        const options = input.join(" ").split("~")
        for (const option of options) {
            // Get key and value: [0,1]
            const [rawKey, value] = option.split("=")
            // @type {keyof Bookmark}
            const key = rawKey
            switch(key) {
                case "keywords":
                    newbookmark[key] = handleKeywords(value)
                    break
                case "path":
                    newbookmark[key] = handlePath(value)
                    break
                case "name":
                    newbookmark[key] = handleName(value)
                    break
                case "bg":
                    newbookmark[key] = value
                    break
                case "fg":
                    newbookmark[key] = value
                    break
                case "id":
                    newbookmark[key] = +value
                    break
                case "title":
                    newbookmark[key] = value
                    break
                case "url":
                    newbookmark[key] = value
                    break
                case "tag":
                    newbookmark[key] = [value]
                    break

            }
        }
    } else {
        // If there's only text, we take it as name for current page bookmark
        newbookmark.name = input.join(" ")
    }
    return newbookmark
}

/**
 * Check if bookmark is valid.
 * @param {Bookmark} bookmark - The bookmark object to validate.
 */
const isBookmarkValid = bookmark => {
    let isValid = true
    const badOptions = []
    if (!bookmark.name?.trim()) {
        isValid = false
        notify({
            "id": "commands.bookmarks.noname",
            "src": "user",
            "type": "warning"
        })
    }
    // Remove invalid options
    for (const option of Object.keys(bookmark)) {
        if (!validBookmarkOptions.includes(option)) {
            badOptions.push(option)
            delete bookmark[option]
        }
    }
    const names = bookmarkData.bookmarks.map(b => b.name)
    if (names?.includes(bookmark.name)) {
        isValid = false
        notify({
            "fields": [bookmark.name],
            "id": "actions.bookmarks.exists",
            "src": "user",
            "type": "warning"
        })
    }
    // Color check
    if (bookmark?.bg && !isValidColor(bookmark.bg)) {
        isValid = false
        notify({
            "fields": [bookmark.bg],
            "id": "commands.bookmarks.color.invalid",
            "src": "user",
            "type": "warning"
        })
    }
    if (bookmark?.fg && !isValidColor(bookmark.fg)) {
        isValid = false
        notify({
            "fields": [bookmark.fg],
            "id": "commands.bookmarks.color.invalid",
            "src": "user",
            "type": "warning"
        })
    }
    // Path validation: should be slash-separate,
    // no special chars, no empty segments.
    const pathRegex = /^\/([\w-]+(\/[\w-]+)*)?$/
    if (bookmark.path && bookmark.path !== "/"
        && !pathRegex.test(bookmark.path)) {
        isValid = false
        notify({
            "fields": [bookmark.path],
            "id": "commands.bookmarks.path.invalid",
            "src": "user",
            "type": "warning"
        })
    }
    // Keyword validation: should be single words.
    if (isValid && bookmark.keywords) {
        const multiWordKeywords = bookmark.keywords.filter(
            k => k.trim().includes(" "))
        if (multiWordKeywords.length > 0) {
            isValid = false
            notify({
                "fields": [multiWordKeywords.join(", ")],
                "id": "commands.bookmarks.keywords.multiword",
                "src": "user",
                "type": "warning"
            })
        }
    }
    // If all checks passed so far, sanitize and add folders
    if (isValid) {
        if (bookmark.keywords) {
            // Sanitize keywords: remove special chars and filter empty ones
            bookmark.keywords = bookmark.keywords.map(
                k => k.trim().replace(specialChars, ""))
                .filter(k => k && !k.includes(" "))
        }
        addFolder(bookmark.path)
    }
    if (badOptions.length > 0) {
        notify({
            "fields": [badOptions.join(", ")],
            "id": "commands.bookmarks.invalid.options",
            "src": "user",
            "type": "warning"
        })
    }
    return isValid
}

/**
 * Add bookmark based on input.
 * @param {string[]} input - The input to parse.
 */
const addBookmark = input => {
    /** @type {Bookmark} */
    const newbookmark = bookmarkObject(input)
    // Fill missing essential data from relevant sources
    // If the url is not custom-set with url=
    if (newbookmark.url === currentPage()?.src || !newbookmark.url?.trim()) {
        if (!newbookmark.name?.trim()) {
            newbookmark.name = currentTab()?.querySelector("span")?.textContent
                || ""
        }
        if (!newbookmark.title?.trim()) {
            newbookmark.title = currentTab()?.querySelector("span")?.textContent
                || ""
        }
        if (!newbookmark.url?.trim()) {
            newbookmark.url = currentPage()?.src || ""
        }
    }
    if (!newbookmark.path?.trim()) {
        newbookmark.path = "/"
    }
    if (newbookmark.keywords === undefined) {
        newbookmark.keywords = []
    }
    if (isBookmarkValid(newbookmark)) {
        bookmarkData.bookmarks.push(newbookmark)
        bookmarkData.lastId += 1
        writeBookmarksToFile()
        notifyBookmarksPages()
        notify({
            "fields": [
                newbookmark.name.slice(0, 20),
                newbookmark.url.slice(0, 40)
            ],
            "id": "actions.bookmarks.added",
            "src": "user",
            "type": "success"
        })
    }
}

/**
 * Set bookmark's data.
 */
const setBookmarkSettings = () => {
    const setFile = getSetting("bookmarksfile")
    if (setFile === "bookmarks" || setFile.trim() === "") {
        bookmarksFile = joinPath(appData(), "bookmarks")
    } else if (isAbsolutePath(setFile)) {
        bookmarksFile = setFile
    } else {
        bookmarksFile = joinPath(appData(), setFile)
    }
    if (!isFile(bookmarksFile)) {
        writeJSON(bookmarksFile, emptyBookmarkData)
    }
    bookmarkData = /** @type {BookmarkData} */ (
        readJSON(bookmarksFile) || emptyBookmarkData
    )
}

/**
 * @param {Bookmark} bookmark
 * @param {string} value
 */
const matchKeywordsOption = (bookmark, value) => {
    const values = value.split(",")
    const matched = values.filter(v => v.startsWith("!")
        ? !bookmark.keywords.includes(v.slice(1))
        : bookmark.keywords.includes(v))
    return matched.length === values.length ? 1 : 0
}

/**
 * @param {Bookmark} bookmark
 * @param {keyof Bookmark} key
 * @param {string} value
 */
const matchGenericOption = (bookmark, key, value) => bookmark[key] === value ? 1 : 0

/**
 * @param {Bookmark} bookmark
 * @param {string} optionString - A key=value pair.
 */
const matchOption = (bookmark, optionString) => {
    const [key, value] = optionString.split("=")
    if (key === "keywords") {
        return matchKeywordsOption(bookmark, value)
    }
    return matchGenericOption(bookmark, /** @type {keyof Bookmark} */ (key), value)
}

/**
 * Filter bookmarks based on input.
 * @param {string[]} input
 */
const matchBookmarksToInput = input => {
    const storedBookmarkData = bookmarkData.bookmarks
    const inputString = input.join("")
    const hasStructuredOptions = input.some(
        s => validBookmarkOptions.some(opt => s.includes(`${opt}=`))
    )
    if (hasStructuredOptions) {
        const eachOption = inputString.split("~")
        return storedBookmarkData.filter(bookmark => {
            const matched = eachOption.reduce(
                (count, opt) => count + matchOption(bookmark, opt), 0
            )
            return matched === eachOption.length
        })
    }
    const byName = storedBookmarkData.filter(
        e => e.name.replace(specialChars, "") === input.join(" ").replace(specialChars, "")
    )
    const byKeyword = storedBookmarkData.filter(
        e => e.keywords.find(k => k === inputString)
    )
    return [...byName, ...byKeyword]
}

/**
 * Filter folders based on input.
 * @param {string[]} input - The input to parse.
 */
const matchFoldersToInput = input => {
    /** @type {Folder | null | undefined} */
    let selectedFolder = null
    if (input[0] && validFoldersOptions.some(option => input[0]
        .includes(`${option}=`))) {
        const [key, value] = input[0].split("=")
        if (key === "path") {
            selectedFolder = bookmarkData.folders.find(f => f.path === value)
        }
    }
    return selectedFolder
}

/**
 * Load bookmark based on the input.
 * @param {string[]} input - The input to parse.
 */
const loadBookmark = input => {
    const selectedBookmarks = matchBookmarksToInput(input)
    const {addTab, navigateTo} = require("./tabs")
    if (selectedBookmarks.length === 0) {
        notify({
            "id": "actions.bookmarks.notfound",
            "src": "user",
            "type": "warning"
        })
    } else if (selectedBookmarks.length === 1) {
        navigateTo("user", selectedBookmarks[0].url)
    } else {
        notify({
            "fields": [String(selectedBookmarks.length)],
            "id": "actions.bookmarks.loaded",
            "src": "user",
            "type": "dialog"
        })
        for (const e of selectedBookmarks) {
            addTab({
                "src": "user",
                "url": e.url
            })
        }
    }
}

/**
 * Delete folder based on the input.
 * @param {string[]} input - The input to parse.
 */
const deleteFolder = input => {
    const selectedFolder = matchFoldersToInput(input)
    if (selectedFolder) {
        bookmarkData.folders
            = bookmarkData.folders.filter(f => selectedFolder.path !== f.path)
        for (const b of bookmarkData.bookmarks) {
            if (selectedFolder.path === b.path) {
                b.path = "/"
            }
        }
        writeBookmarksToFile()
        notify({
            "id": "actions.bookmarks.folder.deleted",
            "src": "user",
            "type": "success"
        })
    }
}

/**
 * Delete bookmark based on the input.
 * @param {string[]} input - The input to parse.
 * @param {number | undefined} bookmarkId - The bookmark id or undefined.
 */
const deleteBookmark = (input, bookmarkId) => {
    let selectedBookmarks = []
    if (typeof bookmarkId === "number") {
        selectedBookmarks = bookmarkData.bookmarks.filter(b => b.id
            === bookmarkId)
    } else if (input.join("") === "") {
        selectedBookmarks = matchBookmarksToInput([`url=${currentPage()?.src}`])
    } else {
        selectedBookmarks = matchBookmarksToInput(input)
    }
    notify({
        "fields": [String(selectedBookmarks.length)],
        "id": "actions.bookmarks.deleted",
        "src": "user",
        "type": "success"
    })
    for (const sb of selectedBookmarks) {
        for (let x = 0; x < bookmarkData.bookmarks.length; x++) {
            if (sb.id === bookmarkData.bookmarks[x].id) {
                bookmarkData.bookmarks.splice(x, 1)
            }
        }
    }
    writeBookmarksToFile()
}

/**
 * Parse bookmarks based on DOM element and path.
 * @param {Element} element
 * @param {string} path
 * @param {Partial<Bookmark>[]} bookmarks
 * @param {Set<string>} folders
 */
const parseBookmarks = (element, path, bookmarks, folders) => {
    const children = [...element.children]
    for (const child of children) {
        if (child.tagName === "DT") {
            const a = child.querySelector("A")
            const h3 = child.querySelector("H3")
            if (a && !h3) {
                const url = a.getAttribute("href") || ""
                const name = a.textContent || ""
                if (url && name) {
                    bookmarks.push({
                        "keywords": [],
                        name,
                        path,
                        "tag": [],
                        "title": name,
                        url
                    })
                }
            }
            if (h3
                && !h3.hasAttribute("PERSONAL_TOOLBAR_FOLDER")) {
                const folderName = h3.textContent.trim()
                let newPath = `${path}/${folderName}`
                if (path === "/") {
                    newPath = `/${folderName}`
                }
                folders.add(newPath)
                const nextDl = h3.parentElement
                    ?.querySelector("DL")
                if (nextDl && nextDl.tagName === "DL") {
                    parseBookmarks(nextDl, newPath, bookmarks, folders)
                }
            }
        }
    }
}

/**
 * Process Bookmark logic.
 * @param {string | null} fileContent
 */
const processBookmark = fileContent => {
    if (!fileContent) {
        notify({
            "id": "actions.bookmarks.import.failed",
            "src": "user",
            "type": "error"
        })
        return
    }
    const parser = new DOMParser()
    const dom = parser.parseFromString(fileContent, "text/html")
    /** @type {Partial<Bookmark>[]} bookmarks - bookmarks array */
    const bookmarks = []
    const folders = new Set()
    const firstDl = dom.body.querySelector("DL")
    if (firstDl) {
        parseBookmarks(firstDl, "/", bookmarks, folders)
    }
    const existingBookmarks = new Set(bookmarkData.bookmarks
        .map(b => `${b.name}::${b.url}`))
    let newBookmarksCount = 0
    for (const bookmark of bookmarks) {
        if (!existingBookmarks.has(`${bookmark.name}::${bookmark.url}`)) {
            // @ts-ignore
            bookmarkData.bookmarks.push({
                ...bookmark,
                "id": bookmarkData.lastId += 1
            })
            newBookmarksCount += 1
        }
    }
    for (const folder of folders) {
        if (!bookmarkData.folders.some(f => f.path === folder)) {
            bookmarkData.folders.push({
                "keywords": [], "name": "", "path": folder
            })
        }
    }
    writeBookmarksToFile()
    notify({
        "fields": [String(newBookmarksCount)],
        "id": "actions.bookmarks.import.success",
        "src": "user",
        "type": "success"
    })
}


if (ipcRenderer) {
    ipcRenderer.on("bookmarks-updated", (_, newBookmarkData) => {
        if (newBookmarkData) {
            bookmarkData = newBookmarkData
        }
    })
    ipcRenderer.on("import-bookmarks-files",
        /**
         * Process import for every file.
         * @param {import("electron").IpcRendererEvent} _
         * @param {string[]} filePaths
         */
        (_, filePaths) => {
            for (const filePath of filePaths) {
                const fileContent = readFile(filePath)
                processBookmark(fileContent)
            }
            notifyBookmarksPages()
        })
}


/**
 * Import Bookmarks logic.
 * @param {Electron.OpenDialogReturnValue} result
 */
const importBookmarks = result => {
    if (result.canceled) {
        return
    }
    for (const filePath of result.filePaths) {
        const fileContent = readFile(filePath)
        processBookmark(fileContent)
    }
}

module.exports = {
    addBookmark,
    deleteBookmark,
    deleteFolder,
    getBookmarkData,
    importBookmarks,
    loadBookmark,
    setBookmarkSettings,
    validBookmarkOptions
}
