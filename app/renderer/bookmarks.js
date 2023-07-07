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
    isFile,
    appData,
    specialChars,
    specialCharsAllowSpaces
} = require("../util")
const {
    currentPage,
    getSetting,
    currentTab
} = require("./common")

let bookmarkData = {}
let bookmarksFile = ""

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
    bookmarkData = readJSON(bookmarksFile)
}

const addBookmark = input => {
    const newbookmark = bookmarkObject(input)
    // Fill missing essential data from relevant sources
    // If the url is not custom-set with url=
    if (newbookmark.url === currentPage().src || !newbookmark.url?.trim()) {
        if (!newbookmark.name?.trim()) {
            newbookmark.name = currentTab().querySelector("span").textContent
        }
        if (!newbookmark.title?.trim()) {
            newbookmark.title = currentTab().querySelector("span").textContent
        }
        if (!newbookmark.url?.trim()) {
            newbookmark.url = currentPage().src
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
        notify(`Bookmark added: ${newbookmark.name.substring(0, 20)}:
                ${newbookmark.url.substring(0, 40)}`)
    }
}

const fixBookmarkData = (option, value) => {
    let correctFormat = ""
    if (option === "path") {
        if (!value[0] === "/") {
            correctFormat = `/${value}`
        } else {
            correctFormat = value
        }
        correctFormat = correctFormat.replace(/\s/g, "-").replace(/[/]$/, "")
    } else if (option === "tag") {
        correctFormat = value.forEach(
            t => t.replace(specialCharsAllowSpaces, ""))
    } else if (option === "keywords") {
        correctFormat = value.forEach(k => k.replace(specialChars, ""))
    } else if (option === "name") {
        correctFormat = value.replace(specialCharsAllowSpaces, "")
    } else {
        correctFormat = value
    }
    return correctFormat
}

const bookmarkObject = input => {
    const newbookmark = {}
    newbookmark.id = bookmarkData.lastId
    // If there's "=" or "~" we parse the input.
    if (input.join().includes("=") || input.join().includes("~")) {
        // Retain spaces for multiple word inputs.
        const options = input.join(" ").split("~")
        for (let i = 0; i < options.length; i++) {
            // Get key and value: [0,1]
            const keyAndValue = options[i].split("=")
            if (keyAndValue[0] === "keywords" || keyAndValue[0] === "tag") {
                const tagsOrKeywordList = keyAndValue[1].split(",")
                newbookmark[keyAndValue[0]] = tagsOrKeywordList
            } else {
                const allValue = keyAndValue.slice(1).join("")
                if (allValue?.trim()) {
                    const correctData = fixBookmarkData(keyAndValue[0],
                        allValue)
                    newbookmark[keyAndValue[0]] = correctData
                }
            }
        }
    } else {
        // If there's only text, we take it as name for current page bookmark
        newbookmark.name = input.join(" ")
        if (!newbookmark.name?.trim()) {
            // When user doesn't enter anything delete empty string
            delete newbookmark.name
        }
    }
    return newbookmark
}

const loadBookmark = input => {
    const selectedBookmarks = matchBookmarksToInput(input)
    const {navigateTo, addTab} = require("./tabs")
    if (selectedBookmarks.length === 0) {
        notify("Could not find bookmark.")
    } else if (selectedBookmarks.length === 1) {
        navigateTo(selectedBookmarks[0].url)
    } else {
        notify(`Loaded ${selectedBookmarks.length} bookmarks \
                that matched the query.`)
        selectedBookmarks.forEach(e => addTab({
            "url": e.url
        }))
    }
}

const matchBookmarksToInput = input => {
    const storedBookmarkData = getBookmarkData().bookmarks
    let selectedBookmarks = []
    if (validBookmarkOptions.some(option => input.join().includes(`${option}=`))) {
        const eachOption = input.join("").split("~")
        selectedBookmarks = storedBookmarkData.filter(b => {
            let matchedOptions = 0
            eachOption.forEach(e => {
                const keyAndValue = e.split("=")
                if (keyAndValue[0] === "tag" || keyAndValue[0] === "keywords") {
                    if (b[keyAndValue[0]].includes(keyAndValue[1])) {
                        matchedOptions += 1
                    }
                } else {
                    if (b[keyAndValue[0]] === keyAndValue[1]) {
                        matchedOptions += 1
                    }
                }
            })
            if (matchedOptions === eachOption.length) {
                return true
            }
        })
    } else {
        const individualBookmark = storedBookmarkData.filter(
            e => e.name.replace(specialChars) === input.join(" ")
                .replace(specialChars))
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


const deleteBookmark = input => {
    let selectedBookmarks = []
    if (input.join() === "") {
        selectedBookmarks = matchBookmarksToInput([`url=${currentPage().src}`])
    } else {
        selectedBookmarks = matchBookmarksToInput(input)
    }
    notify(`Deleted ${selectedBookmarks.length} bookmarks \
            that matched the query.`)
    selectedBookmarks.forEach(sb => {
        for (let x = 0; x < bookmarkData.bookmarks.length; x++) {
            if (sb.id === bookmarkData.bookmarks[x].id) {
                bookmarkData.bookmarks.splice(x, 1)
            }
        }
    })
    writeBookmarksToFile()
}

const addTags = tags => {
    const currentTagIds = bookmarkData.tags.map(tag => tag.id)
    tags.forEach(t => {
        if (!currentTagIds.includes(t)) {
            bookmarkData.tags.push(
                {
                    "id": t,
                    "keywords": [],
                    "name": ""
                }
            )
        }
    })
}

const addFolder = path => {
    const currentStoredPaths = bookmarkData.folders.map(f => f.path)
    if (!currentStoredPaths.includes(path)) {
        bookmarkData.folders.push(
            {
                "keywords": [],
                "name": "",
                path
            })
    }
}

const getBookmarkData = () => bookmarkData

const writeBookmarksToFile = () => {
    writeJSON(bookmarksFile, bookmarkData)
}

const isBookmarkValid = bookmark => {
    let isValid = true
    const badOptions = []

    if (!bookmark.name?.trim()) {
        isValid = false
        notify("No name provided for the bookmark")
    }

    // Remove invalid options
    for (const option in bookmark) {
        if (!validBookmarkOptions.includes(option)) {
            badOptions.push(option)
            delete bookmark[option]
        }
    }
    const names = bookmarkData.bookmarks.map(b => b.name)
    if (names.includes(bookmark.name)) {
        isValid = false
        notify(`A bookmark with name: ${bookmark.name} already exists.`)
    }

    addTags(bookmark.tag)
    addFolder(bookmark.path)

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
    deleteBookmark,
    getBookmarkData,
    loadBookmark,
    setBookmarkSettings,
    validBookmarkOptions
}
