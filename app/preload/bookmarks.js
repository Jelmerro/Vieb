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

/**
 * @typedef {{
 *   bookmarks: Bookmark[],
 *   folders: {path: string}[],
 *   lastId: number,
 *   tags: object[]
 * }} BookmarkData
 */

/**
 * @typedef {{
 *  children: FolderNode[],
 *  folderName: string,
 *  fullpath: string
 * }} FolderNode
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
 *  fg?: string
 * }} Bookmark
 */

const {ipcRenderer} = require("electron")

/** @type {FolderNode} */
const tree = {
    "children": [],
    "folderName": "/",
    "fullpath": "/"
}

/**
 * Trigger send to host bookmark data request.
 */
const update = () => ipcRenderer.sendToHost("bookmark-data-request")

/**
 * Trigger bookmark's folder delete.
 * @param {PointerEvent} e - HTML onclick event.
 */
const deleteFolderClick = e => {
    e.stopPropagation()
    // @ts-ignore
    const path = e?.target?.dataset?.path
    ipcRenderer.sendToHost("delete-folder", path)
    window.location.reload()
}

/**
 * Trigger bookmark's folder delete.
 * @param {PointerEvent} e - HTML onclick event.
 */
const deleteBookmarkClick = e => {
    e.stopPropagation()
    // @ts-ignore
    // @ts-ignore
    const bookmark = e?.target?.dataset?.bookmark
    // @ts-ignore
        && JSON.parse(e.target.dataset.bookmark)
    ipcRenderer.sendToHost("delete-bookmark", bookmark)
    window.location.reload()
}

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
    document.getElementById("bookmarks")?.appendChild(treeRootElement)
    update()
})


/**
 * Add a bookmark to the page.
 * @param {Bookmark} bookmark - The bookmark object to add.
 */
const addBookmarkToPage = bookmark => {
    const bookmarkElement = document.createElement("li")
    bookmarkElement.className = "bookmark"
    const bookmarkDiv = document.createElement("div")
    const bookmarkLink = document.createElement("a")
    bookmarkLink.href = bookmark.url
    if (bookmark.title === bookmark.name) {
        bookmarkLink.textContent = bookmark.name
    } else {
        bookmarkLink.textContent
            = `${bookmark.name} - ${bookmark.title}`
    }
    const removeButton = document.createElement("button")
    removeButton.innerText = "Remove"
    removeButton.setAttribute("data-bookmark", JSON.stringify(bookmark))
    removeButton.onclick = deleteBookmarkClick
    bookmarkDiv.appendChild(bookmarkLink)
    bookmarkDiv.appendChild(removeButton)
    bookmarkElement.appendChild(bookmarkDiv)
    document.getElementById(bookmark.path)
        ?.appendChild(bookmarkElement)
}

/**
 * Create the HTML for a folder.
 * @param {string} folderName
 * @param {string} parentPath
 * @returns {{element: HTMLLIElement, path: string}} - The folder element.
 */
const createFolderHtml = (folderName, parentPath) => {
    const folderElement = document.createElement("li")
    const folderDetails = document.createElement("details")
    const folderSummary = document.createElement("summary")
    const folderDiv = document.createElement("a")
    const folderContent = document.createElement("ul")
    const removeButton = document.createElement("button")
    removeButton.innerText = "Remove"
    removeButton.onclick = deleteFolderClick
    folderElement.className = "folder"
    folderSummary.appendChild(folderDiv)
    folderDiv.textContent = folderName
    folderDiv.appendChild(removeButton)
    let path = ""
    if (parentPath === "/") {
        path = `/${folderName}`
    } else {
        path = `${parentPath}/${folderName}`
    }
    removeButton.setAttribute("data-path", path)
    folderContent.id = path
    folderDetails.appendChild(folderSummary)
    folderDetails.appendChild(folderContent)
    folderElement.appendChild(folderDetails)
    return {"element": folderElement, path}
}

/**
 * Find or create a folder in the tree.
 * @param {string} folderName
 * @param {FolderNode} parentFolder
 * @returns {FolderNode} - The folder object.
 */
const findOrCreateFolder = (folderName, parentFolder) => {
    // Check if folder already exists in tree structure
    let existingFolder = parentFolder.children.
        find(c => c.folderName === folderName)
    if (!existingFolder) {
        // Create HTML structure for the folder
        const {element, path}
            = createFolderHtml(folderName, parentFolder.fullpath)
        // Append folder to the correct place in HTML
        document.getElementById(parentFolder.fullpath)?.appendChild(element)
        // Create new folder object and add to tree structure
        existingFolder = {
            "children": [],
            folderName,
            "fullpath": path
        }
        parentFolder.children.push(existingFolder)
    }
    return existingFolder
}

/**
 * Process a folder path and create the folder structure.
 * @param {string} folderPath
 */
const processFolderPath = folderPath => {
    const folderElements = folderPath.split("/").filter(e => e)
    let currentFolder = tree
    folderElements.forEach(folderName => {
        currentFolder = findOrCreateFolder(folderName, currentFolder)
    })
}

/**
 * Create the folder structure and add the bookmarks to the page.
 * @param {BookmarkData} bookmarkData - The bookmark data object.
 */
const createFolderStructure = bookmarkData => {
    const {bookmarks, folders} = bookmarkData
    // Create all folder structures
    folders.forEach(folder => {
        processFolderPath(folder.path)
    })
    // Add bookmarks to their respective folders
    bookmarks.forEach(bookmark => {
        addBookmarkToPage(bookmark)
    })
}

ipcRenderer.on("bookmark-data-response", (_, bookmarkData) => {
    // Create folder structure
    createFolderStructure(bookmarkData)
})
