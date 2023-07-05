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

// Create tree structure to keep track of added folders.
const tree = {
    "children": [],
    "folderName": "/",
    "fullpath": "/"
}

ipcRenderer.on("bookmark-data-response", (_, bookmarkData) => {
    // Create folder structure
    createFolderStructure(bookmarkData)
})

window.addEventListener("load", () => {
    // Set up the tree structure.
    const treeRootElement = document.createElement("ul")
    treeRootElement.className = "bm-block"
    const treeRootList = document.createElement("li")
    const treeRootDetails = document.createElement("details")
    treeRootDetails.open = true
    const treeRootSummary = document.createElement("summary")
    treeRootSummary.textContent = "/"
    const treeRootContent = document.createElement("ul")

    treeRootContent.id = "/"

    treeRootDetails.appendChild(treeRootSummary)
    treeRootDetails.appendChild(treeRootContent)
    treeRootList.appendChild(treeRootDetails)
    treeRootElement.appendChild(treeRootList)

    document.getElementById("bookmarks").appendChild(treeRootElement)
    update()
})

const update = () => {
    ipcRenderer.sendToHost("bookmark-data-request")
}

const addBookmarkToPage = bookmark => {
    const bookmarkElement = document.createElement("li")
    const bookmarkDiv = document.createElement("div")
    const bookmarkLink = document.createElement("a")
    bookmarkLink.href = bookmark.url
    if (bookmark.title === bookmark.name) {
        bookmarkLink.textContent = bookmark.name
    } else {
        bookmarkLink.textContent
            = `${bookmark.name} - ${bookmark.title}`
    }

    bookmarkDiv.appendChild(bookmarkLink)
    bookmarkElement.appendChild(bookmarkDiv)
    document.getElementById(bookmark.path)
        .appendChild(bookmarkElement)
}

const createFolderStructure = bookmarkData => {
    // Create folder structure in a depth first fashion.
    const {folders} = bookmarkData
    for (let i = 0; i < folders.length; i++) {
        const folderElements = folders[i].path.split("/")
            .filter(e => e)

        // Set the tree root as the starting point.
        let currentCheckingFolder = tree
        folderElements.forEach(e => {
            // Ignore / because it already exists.
            if (e !== "/") {
                const currentChildren = currentCheckingFolder
                    .children.map(c => c.folderName)
                if (!currentChildren.includes(e)) {
                    // Create html structure for the folder
                    const folderElement = document.createElement("li")
                    const folderDetails = document.createElement("details")
                    const folderSummary = document.createElement("summary")
                    folderSummary.textContent = e
                    const folderContent = document.createElement("ul")
                    let path = ""
                    if (currentCheckingFolder.fullpath === "/") {
                        path = currentCheckingFolder.fullpath + e
                    } else {
                        path = `${currentCheckingFolder.fullpath}/${e}`
                    }
                    folderContent.id = path
                    folderDetails.appendChild(folderSummary)
                    folderDetails.appendChild(folderContent)
                    folderElement.appendChild(folderDetails)

                    // Append folder to the correct place in html.
                    document.getElementById(
                        currentCheckingFolder.fullpath)
                        .appendChild(folderElement)

                    // Add it to the tree structure.
                    const newFolder = {
                        "children": [],
                        "folderName": e,
                        "fullpath": path
                    }
                    currentCheckingFolder.children.push(newFolder)
                }
                // Go to next folder.
                currentCheckingFolder
                    = currentCheckingFolder.children
                        .find(c => c.folderName === e)
            }
        })
    }
    // Populate folders with bookmarks
    const {bookmarks} = bookmarkData
    for (let i = 0; i < bookmarks.length; i++) {
        const currentBookmark = bookmarks[i]
        addBookmarkToPage(currentBookmark)
    }
}
