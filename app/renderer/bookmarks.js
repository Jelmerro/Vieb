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
 *  [key: string]: number | string | string[] | undefined
 * }} Bookmark
 */

/**
 * @typedef {{
 *   bookmarks: Bookmark[],
 *   folders: Folder[],
 *   lastId: number,
 * }} BookmarkData
 */

/** @type {BookmarkData} */
let bookmarkData = {
    "bookmarks": [],
    "folders": [],
    "lastId": 0
}
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
    "url"
]

/**
 * Returns bookmarkData object.
 * @returns {BookmarkData}
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
 * Fix bookmarkData values based on the option type.
 * @param {string} option - The option to fix.
 * @param {string} value - The value to fix.
 */
const fixBookmarkData = (option, value) => {
    let correctFormat = ""
    if (option === "path") {
        if (value.startsWith("/")) {
            correctFormat = value
        } else {
            correctFormat = `/${value}`
        }
        correctFormat = correctFormat.replace(/\s/g, "-").replace(/\/$/, "")
    } else if (option === "keywords") {
        correctFormat = [...value].map(k => k.replace(specialChars, ""))
            .join("")
    } else if (option === "name") {
        correctFormat = value.replace(specialCharsAllowSpaces, "")
    } else {
        correctFormat = value
    }
    return correctFormat
}

/**
 * Prepare bookmark's object.
 * @param {string[]} input - The input to parse.
 * @returns {Bookmark}
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
            const [key, value] = option.split("=")
            if (key === "keywords") {
                const keywordList = value.split(",").map(
                    item => item.trim()).filter(Boolean)
                newbookmark[key] = keywordList
            } else {
                const allValue = option.split("=").slice(1).join("")
                if (allValue?.trim()) {
                    const correctData = fixBookmarkData(key,
                        allValue)
                    newbookmark[key] = correctData
                }
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
 * @returns {boolean} - True if the bookmark is valid.
 */
const isBookmarkValid = bookmark => {
    let isValid = true
    const badOptions = []
    if (!bookmark.name?.trim()) {
        isValid = false
        notify({
            "id": "commands.bookmarks.noname",
            "src": "user",
            "type": "dialog"
        })
    }
    // Remove invalid options
    for (const option in bookmark) {
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
            "type": "dialog"
        })
    }
    // Color check
    if (bookmark?.bg && !isValidColor(bookmark.bg)) {
        isValid = false
        notify({
            "fields": [bookmark.bg],
            "id": "commands.bookmarks.color.invalid",
            "src": "user",
            "type": "dialog"
        })
    }
    if (bookmark?.fg && !isValidColor(bookmark.fg)) {
        isValid = false
        notify({
            "fields": [bookmark.fg],
            "id": "commands.bookmarks.color.invalid",
            "src": "user",
            "type": "dialog"
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
            "type": "dialog"
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
                "type": "dialog"
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
            "type": "dialog"
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
        writeJSON(bookmarksFile, {"bookmarks": [],
            "folders": [],
            "lastId": 0})
    }
    bookmarkData = readJSON(bookmarksFile) || {
        "bookmarks": [],
        "folders": [],
        "lastId": 0
    }
}

/**
 * Filter bookmarks based on input.
 * @param {string[]} input - The input to parse.
 */
const matchBookmarksToInput = input => {
    const storedBookmarkData = bookmarkData.bookmarks
    let selectedBookmarks = []
    if (validBookmarkOptions.some(option => input.join(",")
        .includes(`${option}=`))) {
        const eachOption = input.join("").split("~")
        selectedBookmarks = storedBookmarkData.filter(b => {
            let matchedOptions = 0
            for (const e of eachOption) {
                const [key, value] = e.split("=")
                if (key === "keywords") {
                    const eachValue = value.split(",")
                    let matchedValues = 0
                    for (const v of eachValue) {
                        if (v.startsWith("!") && !b[key].includes(v.slice(1))) {
                            matchedValues += 1
                        } else if (b[key].includes(v)) {
                            matchedValues += 1
                        }
                    }
                    if (eachValue.length === matchedValues) {
                        matchedOptions += 1
                    }
                }
                if (b[key] === value) {
                    matchedOptions += 1
                }
            }
            if (matchedOptions === eachOption.length) {
                return true
            }
            return false
        })
    } else {
        const individualBookmark = storedBookmarkData.filter(
            e => e.name.replace(specialChars, "") === input.join(" ")
                .replace(specialChars, ""))
        const bookmarksSelectedByKeyword = storedBookmarkData.filter(
            e => e.keywords.find(k => k === input.join("")))
        selectedBookmarks
            = [...individualBookmark, ...bookmarksSelectedByKeyword]
    }
    return selectedBookmarks
}

/**
 * Filter folders based on input.
 * @param {string[]} input - The input to parse.
 * @returns {Folder | null | undefined}
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
            "type": "dialog"
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
