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

const {
    appData,
    getSetting,
    isAbsolutePath,
    isFile,
    joinPath,
    notify,
    readJSON,
    specialChars,
    specialCharsAllowSpaces,
    writeJSON
} = require("../util")
const {
    currentPage,
    currentTab
} = require("./common")

/**
 * @typedef {{
 *  id: string,
 *  keywords: string[],
 *  name: string
 * }} Tag
 */

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
 *  tag: string[],
 *  keywords: string[],
 *  bg?: string,
 *  fg?: string,
 *  [key: string]: any
 * }} Bookmark
 */

/**
 * @typedef {{
 *   bookmarks: Bookmark[],
 *   folders: Folder[],
 *   lastId: number,
 *   tags: Tag[]
 * }} BookmarkData
 */

/** @type {BookmarkData} */
let bookmarkData = {
    "bookmarks": [],
    "folders": [],
    "lastId": 0,
    "tags": []
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
    "tag",
    "title",
    "url"
]

/**
 * Returns bookmarkData object.
 * @returns {BookmarkData}
 */
const getBookmarkData = () => bookmarkData

/**
 * Adds tag to the bookmarkData for the given path.
 * @param {string[]} tags - The tags to add.
 */
const addTags = tags => {
    const currentTagIds = bookmarkData.tags.map(tag => tag.id)
    tags.forEach(t => {
        if (!currentTagIds.includes(t)) {
            bookmarkData.tags.push({"id": t, "keywords": [], "name": ""})
        }
    })
}

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
        correctFormat = correctFormat.replace(/\s/g, "-").replace(/[/]$/, "")
    } else if (option === "tag") {
        correctFormat = value.split("").map(
            t => t.replace(specialCharsAllowSpaces, "")).join("")
    } else if (option === "keywords") {
        correctFormat = value.split("").map(k => k.replace(specialChars, "")).
            join("")
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
    const newbookmark = {}
    newbookmark.id = bookmarkData.lastId
    // If there's "=" or "~" we parse the input.
    if (input.join().includes("=") || input.join().includes("~")) {
        // Retain spaces for multiple word inputs.
        const options = input.join(" ").split("~")
        for (let i = 0; i < options.length; i++) {
            // Get key and value: [0,1]
            const [key, value] = options[i].split("=")
            if (key === "keywords" || key === "tag") {
                const tagsOrKeywordList = value.split(",")
                newbookmark[key] = tagsOrKeywordList
            } else {
                const allValue = options[i].split("=").slice(1).join("")
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
            "id": "bookmarks.noname",
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
            "id": "bookmarks.exists",
            "src": "user",
            "type": "dialog"
        })
    }
    addTags(bookmark.tag)
    addFolder(bookmark.path)
    // Check path format
    // Check color hex values
    // Check keywords and tags.
    // Single words?
    if (badOptions.length) {
        notify({
            "fields": [badOptions.join(", ")],
            "id": "bookmarks.invalid.options",
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
    if (typeof newbookmark.tag === "undefined") {
        newbookmark.tag = []
    }
    if (typeof newbookmark.keywords === "undefined") {
        newbookmark.keywords = []
    }
    if (isBookmarkValid(newbookmark)) {
        bookmarkData.bookmarks.push(newbookmark)
        bookmarkData.lastId += 1
        writeBookmarksToFile()
        notify({
            "fields": [
                newbookmark.name.substring(0, 20),
                newbookmark.url.substring(0, 40)
            ],
            "id": "bookmarks.added",
            "src": "user",
            "type": "dialog"
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
            "lastId": 0,
            "tags": []})
    }
    bookmarkData = readJSON(bookmarksFile) || {
        "bookmarks": [],
        "folders": [],
        "lastId": 0,
        "tags": []
    }
}

/**
 * Filter bookmarks based on input.
 * @param {string[]} input - The input to parse.
 */
const matchBookmarksToInput = input => {
    const storedBookmarkData = bookmarkData.bookmarks
    let selectedBookmarks = []
    if (validBookmarkOptions.some(option => input.join()
        .includes(`${option}=`))) {
        const eachOption = input.join("").split("~")
        selectedBookmarks = storedBookmarkData.filter(b => {
            let matchedOptions = 0
            eachOption.forEach(e => {
                const [key, value] = e.split("=")
                if (key === "tag" || key === "keywords") {
                    const eachValue = value.split(",")
                    let matchedValues = 0
                    eachValue.forEach(v => {
                        if (v.startsWith("!")) {
                            if (!b[key].includes(v.substring(1))) {
                                matchedValues += 1
                            }
                        } else if (b[key].includes(v)) {
                            matchedValues += 1
                        }
                    })
                    if (eachValue.length === matchedValues) {
                        matchedOptions += 1
                    }
                }
                if (b[key] === value) {
                    matchedOptions += 1
                }
            })
            if (matchedOptions === eachOption.length) {
                return true
            }
            return false
        })
    } else {
        const individualBookmark = storedBookmarkData.filter(
            e => e.name.replace(specialChars, "") === input.join(" ")
                .replace(specialChars, ""))
        const bookmarksSelectedByTag = storedBookmarkData.filter(
            e => e.tag.find(t => t === input.join(" ")))
        const bookmarksSelectedByKeyword = storedBookmarkData.filter(
            e => e.keywords.find(k => k === input.join("")))
        selectedBookmarks
            = individualBookmark.concat(bookmarksSelectedByTag)
                .concat(bookmarksSelectedByKeyword)
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
            "id": "bookmarks.notfound",
            "src": "user",
            "type": "dialog"
        })
    } else if (selectedBookmarks.length === 1) {
        navigateTo("user", selectedBookmarks[0].url)
    } else {
        notify({
            "fields": [String(selectedBookmarks.length)],
            "id": "bookmarks.loaded",
            "src": "user",
            "type": "dialog"
        })
        selectedBookmarks.forEach(e => addTab({
            "src": "user",
            "url": e.url
        }))
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
        bookmarkData.bookmarks.forEach(b => {
            if (selectedFolder.path === b.path) {
                b.path = "/"
            }
        })
        writeBookmarksToFile()
        notify({
            "id": "bookmarks.folder.deleted",
            "src": "user",
            "type": "dialog"
        })
    }
}

/**
 * Delete bookmark based on the input.
 * @param {string[]} input - The input to parse.
 * @param {Bookmark | undefined} bookmark - The bookmark object.
 */
const deleteBookmark = (input, bookmark) => {
    let selectedBookmarks = []
    if (bookmark) {
        selectedBookmarks = bookmarkData.bookmarks.filter(b => b.url
            === bookmark.url && b.name === bookmark.name
        && b.path === bookmark.path)
    } else if (input.join() === "") {
        selectedBookmarks = matchBookmarksToInput([`url=${currentPage()?.src}`])
    } else {
        selectedBookmarks = matchBookmarksToInput(input)
    }
    notify({
        "fields": [String(selectedBookmarks.length)],
        "id": "bookmarks.deleted",
        "src": "user",
        "type": "dialog"
    })
    selectedBookmarks.forEach(sb => {
        for (let x = 0; x < bookmarkData.bookmarks.length; x++) {
            if (sb.id === bookmarkData.bookmarks[x].id) {
                bookmarkData.bookmarks.splice(x, 1)
            }
        }
    })
    writeBookmarksToFile()
}

module.exports = {
    addBookmark,
    deleteBookmark,
    deleteFolder,
    getBookmarkData,
    loadBookmark,
    setBookmarkSettings,
    validBookmarkOptions
}
