/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2022 Jelmer van Arnhem
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
    isUrl,
    isAbsolutePath,
    appData
} = require("../util")
const {
    currentPage,
    getSetting,
    currentTab
} = require("./common")

let bookmarks = {}
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
    if (setFile === "bookmarks") {
        bookmarksFile = joinPath(appData(), "bookmarks")
    } else if (isAbsolutePath(setFile)) {
        bookmarksFile = setFile
    } else {
        bookmarksFile = joinPath(appData(), setFile)
    }
    bookmarks = readJSON(bookmarksFile)
    if (typeof bookmarks.bookmarks !== "undefined") {
        notify("bookmark settings done")
    }
}

const addBookmark = input => {
    const newbookmark = {}
    // Retain spaces for multiple word inputs.
    const values = input.join(" ").split("~")
    for (let i = 0; i < values.length; i++) {
        // Get key and value
        const value = values[i].split("=")
        const allInputs = value.slice(1).join("")
        if (allInputs !== "") {
            newbookmark[value[0]] = allInputs
        } else {
            continue
        }
    }
    // Fill missing essential data from relevant sources
    if (typeof newbookmark.name === "undefined") {
        newbookmark.name = currentTab().querySelector("span").textContent
    }
    if (typeof newbookmark.url === "undefined") {
        newbookmark.url = currentPage().src
    }
    if (isBookmarkValid(newbookmark)) {
        bookmarks.bookmarks.push(newbookmark)
        notify("Bookmark added :)")
        writeBookmarksToFile()
    }
}

const writeBookmarksToFile = () => {
    writeJSON(bookmarksFile, bookmarks)
}

const isBookmarkValid = bookmark => {
    let complaints = "Invalid bookmark: "
    let removedItemCount = 0
    let isValid = true

    // Remove invalid options
    for (const item in bookmark) {
        if (!validOptions.includes(item)) {
            removedItemCount += 1
            const badItem = `option ${item} is not a valid option,`
            complaints += badItem
            delete bookmark[item]
        }
    }

    // Check if data is valid
    if (!isUrl(bookmark.url)) {
        complaints += "The given url is not valid"
        isValid = false
    }
    // Check path format

    // Check color values

    // Check about how to implement keywords and tags.
    // Single words?

    // Give feedback to user

    if (removedItemCount !== 0) {
        notify(complaints)
    }
    return isValid
}


module.exports = {
    addBookmark,
    setBookmarkSettings
}
