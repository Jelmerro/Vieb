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
const {joinPath, formatDate, urlToString, getSetting} = require("../util")

let currentlyRemoving = false
let virtualList = document.createElement("div")
let viewIndex = 0
let viewItemCount = getSetting("historyperpage") ?? 100

/**
 * Update the current history view by fetching from the cached list by index.
 * @param {boolean} user
 */
const updateCurrentView = (user = true) => {
    const list = document.getElementById("list")
    const filterEl = document.getElementById("filter")
    const pages = document.getElementById("pages")
    const removeAllEl = document.getElementById("remove-all")
    if (!(filterEl instanceof HTMLInputElement)
        || !list || !pages || !removeAllEl) {
        return
    }
    const filter = filterEl.value.trim().toLowerCase()
    let allElements = [...virtualList.children]
    if (filter) {
        allElements = allElements.filter(el => {
            const url = el.querySelector("a")?.getAttribute("href")
            const title = el.querySelector(".hist-title")?.textContent
            if (url?.toLowerCase().includes(filter)) {
                return true
            }
            if (title?.toLowerCase().includes(filter)) {
                return true
            }
            return false
        })
    }
    if (list.children.length !== viewItemCount || user) {
        list.textContent = ""
        const elements = allElements.slice(viewIndex, viewIndex + viewItemCount)
            .map(original => {
                const el = original.cloneNode(true)
                const url = el.querySelector("a")?.getAttribute("href")
                const date = el.querySelector(".hist-date")?.getAttribute("iso")
                el.querySelector(".trash")?.addEventListener("click", () => {
                    original.classList.add("marked")
                    updateCurrentView()
                    ipcRenderer.sendToHost("history-list-request", "range", [{
                        date, url
                    }])
                })
                return el
            })
        if (elements.length === 0) {
            if (filter) {
                list.textContent = translate("pages.history.filterNoResults")
            } else {
                list.textContent = translate("pages.history.filterEmpty")
            }
            removeAllEl.style.display = "none"
        } else {
            list.append(...elements)
            removeAllEl.style.display = ""
        }
    }
    const pageCount = Math.ceil(allElements.length / viewItemCount)
    const pageNumber = Math.floor(viewIndex / viewItemCount + 1)
    pages.querySelector(`.current`)?.classList.remove("current")
    for (let page = pages.children.length + 1; page <= pageCount; page++) {
        const pageEl = document.createElement("button")
        pageEl.setAttribute("page-number", `${page}`)
        pageEl.textContent = `${page}`
        pageEl.addEventListener("click", () => {
            viewIndex = (page - 1) * viewItemCount
            updateCurrentView()
        })
        pages.append(pageEl)
    }
    [...pages.children].slice(pageCount).forEach(p => p.remove())
    pages.querySelector(`[page-number="${pageNumber}"]`)
        ?.classList.add("current")
    if (user) {
        pages.querySelector(".current")
            ?.scrollIntoView({"block": "nearest", "inline": "center"})
    }
}

/**
 * Add a single history entry to the list.
 * @param {(
 *   import("../renderer/history").historyItem
 * )} hist
 */
const addHistToList = hist => {
    const histElement = document.createElement("div")
    histElement.className = "hist-entry"
    if (hist.icon) {
        const icon = document.createElement("img")
        icon.src = hist.icon
        icon.className = "favicon"
        histElement.append(icon)
    }
    const img = document.createElement("img")
    img.classList.add("trash")
    img.src = joinPath(__dirname, "../img/trash.png")
    histElement.append(img)
    const date = document.createElement("span")
    date.textContent = formatDate(hist.date)
    date.setAttribute("iso", hist.date.toISOString())
    date.className = "hist-date"
    histElement.append(date)
    const title = document.createElement("span")
    title.textContent = hist.title
    title.className = "hist-title"
    histElement.append(title)
    const url = document.createElement("a")
    url.textContent = urlToString(hist.url)
    url.setAttribute("href", hist.url)
    histElement.append(url)
    virtualList?.append(histElement)
}

/**
 * Show the received history in a list.
 * @param {import("../renderer/history").historyItem[]} history
 */
const receiveHistory = history => {
    const removeAllEl = document.getElementById("remove-all")
    const scanningProgress = document.getElementById("scanning-progress")
    if (!removeAllEl || !scanningProgress) {
        return
    }
    scanningProgress.style.display = ""
    removeAllEl.style.display = "none"
    virtualList = document.createElement("div")
    if (history.length === 0) {
        updateCurrentView(false)
        return
    }
    removeAllEl.style.display = ""
    const goal = history.length - 1
    let lineNumber = 0

    /**
     * Add an item to the history list on a timeout based on previous duration.
     * @param {import("../renderer/history").historyItem} hist
     */
    const addHistTimeout = hist => {
        setTimeout(() => {
            addHistToList(hist)
            lineNumber += 1
            if (goal === lineNumber) {
                scanningProgress.style.display = "none"
                updateCurrentView(false)
                return
            }
            scanningProgress.textContent = translate(
                "pages.history.readingProgress", [
                    lineNumber, goal, formatDate(hist.date)
                ])
            let max = viewItemCount
            if (max < 100) {
                max = 100
            }
            if (lineNumber % max === 1) {
                updateCurrentView(false)
            }
            addHistTimeout(history[lineNumber])
        }, 0)
    }

    addHistTimeout(history[lineNumber])
}

/**
 * Clear the history from specific lines by startl index and optionally end.
 */
const clearHistory = () => {
    if (currentlyRemoving) {
        return
    }
    currentlyRemoving = true
    const filterEl = document.getElementById("filter")
    if (!(filterEl instanceof HTMLInputElement)) {
        return
    }
    const filter = filterEl.value.trim().toLowerCase()
    const allElements = [...virtualList.children].filter(el => {
        if (!filter) {
            return true
        }
        const url = el.querySelector("a")?.getAttribute("href")
        const title = el.querySelector(".hist-title")?.textContent
        if (url?.toLowerCase().includes(filter)) {
            return true
        }
        if (title?.toLowerCase().includes(filter)) {
            return true
        }
        return false
    })
    const entries = allElements.map(h => {
        h.classList.add("marked")
        const date = h.querySelector(".hist-date")?.getAttribute("iso")
        const url = h.querySelector("a")?.getAttribute("href")
        if (date && url) {
            return {date, url}
        }
        return null
    }).filter(h => h)
    updateCurrentView()
    ipcRenderer.sendToHost("history-list-request", "range", entries)
}

window.addEventListener("DOMContentLoaded", () => {
    // Translations
    const h1 = document.querySelector("h1")
    if (h1) {
        h1.textContent = translate("pages.history.title")
    }
    const scanningEl = document.getElementById("scanning-progress")
    if (scanningEl) {
        scanningEl.textContent = translate("pages.history.loading")
    }
    const filterEl = document.getElementById("filter")
    if (filterEl instanceof HTMLInputElement) {
        filterEl.placeholder = translate("pages.history.filterPlaceholder")
    }
    const perPageEl = document.getElementById("perpage")
    if (perPageEl instanceof HTMLInputElement) {
        perPageEl.placeholder = translate("pages.history.perpage")
    }
    // Init
    const removeAll = document.createElement("img")
    removeAll.id = "remove-all"
    removeAll.style.display = "none"
    removeAll.src = joinPath(__dirname, "../img/trash.png")
    removeAll.addEventListener("click", () => clearHistory())
    document.body.insertBefore(removeAll, document.body.firstChild)
    document.getElementById("filter")?.addEventListener("input", () => {
        viewIndex = 0
        updateCurrentView()
    })
    const perpage = document.getElementById("perpage")
    perpage?.addEventListener("input", () => {
        if (perpage instanceof HTMLInputElement) {
            const count = Number(perpage.value)
            if (!count || isNaN(count) || count < 1) {
                viewItemCount = getSetting("historyperpage") ?? 100
            } else {
                viewItemCount = count
            }
            updateCurrentView()
        }
    })
    ipcRenderer.sendToHost("history-list-request")
})
ipcRenderer.on("history-list", (_, h) => receiveHistory(h))
ipcRenderer.on("history-removal-status", success => {
    [...virtualList.querySelectorAll(".marked")].forEach(m => {
        if (success) {
            m.remove()
        } else {
            m.classList.remove("marked")
        }
    })
    currentlyRemoving = false
    updateCurrentView()
})
