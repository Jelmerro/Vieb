/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 20

19-2022 Jelmer van Arnhem
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
    writeJSON,
    readJSON,
    joinPath,
    notify,
    isAbsolutePath,
    appData
} = require("../util")
const {
    currentPage,
    getSetting,
    currentTab
} = require("./common")

let bookmarkData = {}
let bookmarksFile = ""

const validOptions = [
    "bg",
    "fg",
    "keywords",
    "name",
    "path",
    "tag",
    "title",
    "url"
]

const setBookmarkSettings = () => {
    const setFile = getSetting("bookmarksfile")
    if (setFile === "bookmarks" || setFile.trim() === "") {
        bookmarksFile = joinPath(appData(), "bookmarks")
    } else if (isAbsolutePath(setFile)) {
        bookmarksFile = setFile
    } else {
        bookmarksFile = joinPath(appData(), setFile)
    }
    bookmarkData = readJSON(bookmarksFile)
}

const addBookmark = input => {
    const newbookmark = {}
    // If there's "=" or "~" we parse the input.
    if (input.join().includes("=") || input.join().includes("~")) {
        // Retain spaces for multiple word inputs.
        const options = input.join(" ").split("~")
        for (let i = 0; i < options.length; i++) {
            // Get key and value: [0,1]
            const keyAndValue = options[i].split("=")
            const allValue = keyAndValue.slice(1).join("")
            if (allValue?.trim()) {
                newbookmark[keyAndValue[0]] = allValue
            }
        }
    } else {
        // If there's only text, we take it as name for current page bookmark
        newbookmark.name = input.join(" ")
        if (newbookmark.name?.trim()) {
            // When user doesn't enter anything delete empty string
            delete newbookmark.name
        }
    }
    // Fill missing essential data from relevant sources
    if (!newbookmark.name?.trim()) {
        newbookmark.name = currentTab().querySelector("span").textContent
    }
    if (!newbookmark.title?.trim()) {
        newbookmark.title = currentTab().querySelector("span").textContent
    }
    if (!newbookmark.url?.trim()) {
        newbookmark.url = currentPage().src
    }
    if (isBookmarkValid(newbookmark)) {
        bookmarkData.bookmarks.push(newbookmark)
        writeBookmarksToFile()
        notify(`Bookmark added: ${newbookmark.name.substring(0, 20)}:
                ${newbookmark.url.substring(0, 40)}`)
    }
}

const getAllBookmarks = () => bookmarkData.bookmarks

const writeBookmarksToFile = () => {
    writeJSON(bookmarksFile, bookmarkData)
}

const isBookmarkValid = bookmark => {
    let isValid = true
    const badOptions = []

    // Remove invalid options
    for (const option in bookmark) {
        if (!validOptions.includes(option)) {
            badOptions.push(option)
            delete bookmark[option]
        }
    }
    // Check path format
    // Check color hex values
    // Check keywords and tags.
    // Single words?

    if (badOptions.length !== 0) {
        notify(`Not valid options: ${badOptions.join(", ")}.`)
    }
    return isValid
}


module.exports = {
    addBookmark,
    getAllBookmarks,
    setBookmarkSettings
}
