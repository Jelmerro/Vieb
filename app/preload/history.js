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
const {joinPath, formatDate, urlToString} = require("../util")

// Configure breakpoints to make searching easier
const now = new Date()
const anHourAgo = new Date(now.getTime() - 3600000)
const todayStartTime = new Date(now)
todayStartTime.setHours(0, 0, 0, 0)
const yesterdayStartTime = new Date(todayStartTime)
yesterdayStartTime.setDate(yesterdayStartTime.getDate() - 1)
const pastSevenDays = new Date(now)
pastSevenDays.setDate(pastSevenDays.getDate() - 7)
const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
const pastYear = new Date()
pastYear.setFullYear(pastYear.getFullYear() - 1)
// "enabled" is there to calculate if the breakpoint makes sense at this time
// If true, the breakpoint might have no entries in case it still won't be shown
// Only breakpoints that make sense AND contain history entries will be visible
const dateBreakpoints = [
    {
        "date": anHourAgo,
        "enabled": true,
        "link": "hour",
        "title": "Past hour"
    },
    {
        "date": todayStartTime,
        "enabled": anHourAgo.getTime() > todayStartTime.getTime(),
        "link": "day",
        "title": "Today"
    },
    {
        "date": yesterdayStartTime,
        "enabled": true,
        "link": "yesterday",
        "title": "Yesterday"
    },
    {
        "date": pastSevenDays,
        "enabled": true,
        "link": "week",
        "title": "Past 7 days"
    },
    {
        "date": thisMonth,
        "enabled": pastSevenDays.getTime() > thisMonth.getTime(),
        "link": "month",
        "title": "This month"
    },
    {
        "date": pastYear,
        "enabled": true,
        "link": "year",
        "title": "Past year"
    },
    {
        "date": null,
        "enabled": true,
        "link": "old",
        "title": "Older than a year"
    }
].reverse().filter(b => b.enabled)
let currentBreakpointIndex = 0
let lineNumberBreakpoint = 0
let list = document.createElement("div")
list.id = "list"
let currentlyRemoving = false

// Actually parse the list and use the breakpoints

/**
 * Show the received history in a list
 *
 * @param {import("../renderer/history").historyItem[]} history
 */
const receiveHistory = history => {
    const scrollPosition = window.scrollY
    const removeAllEl = document.getElementById("remove-all")
    if (removeAllEl) {
        removeAllEl.style.display = "none"
    }
    const breakpointsEl = document.getElementById("breakpoints")
    if (breakpointsEl) {
        breakpointsEl.textContent = ""
    }
    list = document.createElement("div")
    list.id = "list"
    currentBreakpointIndex = 0
    lineNumberBreakpoint = 0
    let lineNumber = 0
    history.forEach(hist => {
        addHistToList({
            ...hist, "date": new Date(hist.date), "line": lineNumber
        })
        if (removeAllEl) {
            removeAllEl.style.display = ""
        }
        lineNumber += 1
    })
    if (history.length === 0) {
        list.textContent = "No pages have been visited yet"
    } else if (currentBreakpointIndex >= dateBreakpoints.length) {
        addBreakpoint(dateBreakpoints.length - 1, lineNumber)
    } else {
        addBreakpoint(currentBreakpointIndex, lineNumber)
    }
    const listEl = document.getElementById("list")
    if (listEl) {
        listEl.parentNode?.replaceChild(list, listEl)
    }
    if (scrollPosition) {
        window.scrollTo(0, scrollPosition)
    } else if (window.location.hash !== "") {
        const el = document.querySelector(`a[href='${window.location.hash}']`)
        if (el instanceof HTMLAnchorElement) {
            el.click()
        }
    }
}

/** Add a breakpoint by index at a line number
 *
 * @param {number} index
 * @param {number} lineNumber
 */
const addBreakpoint = (index, lineNumber) => {
    if (list.textContent === "") {
        return
    }
    const breakpoint = dateBreakpoints[index]
    // Add link to the top of the page
    const link = document.createElement("a")
    link.textContent = breakpoint.title
    link.setAttribute("href", `#${breakpoint.link}`)
    document.getElementById("breakpoints")?.insertBefore(
        link, document.getElementById("breakpoints")?.firstChild ?? null)
    // Add header to the list
    const h2 = document.createElement("h2")
    h2.setAttribute("id", breakpoint.link)
    h2.textContent = breakpoint.title
    list.insertBefore(h2, list.firstChild)
    const img = document.createElement("img")
    img.src = joinPath(__dirname, "../img/trash.png")
    const breakpointNm = Number(lineNumberBreakpoint)
    const lineNm = Number(lineNumber)
    img.addEventListener("click", () => {
        clearLinesFromHistory(breakpointNm, lineNm)
    })
    list.insertBefore(img, list.firstChild)
    lineNumberBreakpoint = lineNumber + 1
}

/**
 * Add a single history entry to the list
 *
 * @param {(
 *   import("../renderer/history").historyItem & {date: Date, line: number}
 * )} hist
 */
const addHistToList = hist => {
    // Shift the breakpoint to the next one
    const previousBreakpoint = currentBreakpointIndex
    let breakpoint = dateBreakpoints[currentBreakpointIndex + 1]
    while (breakpoint
        && (breakpoint.date?.getTime() ?? 0) < hist.date.getTime()) {
        currentBreakpointIndex += 1
        breakpoint = dateBreakpoints[currentBreakpointIndex + 1]
    }
    // And show only the relevant breakpoint if multiple are skipped
    if (previousBreakpoint !== currentBreakpointIndex) {
        addBreakpoint(previousBreakpoint, hist.line - 1)
    }
    // Finally show the history entry (possibly after new breakpoint)
    const histElement = document.createElement("div")
    histElement.setAttribute("hist-line", `${hist.line}`)
    histElement.className = "hist-entry"
    if (hist.icon) {
        const icon = document.createElement("img")
        icon.src = hist.icon
        icon.className = "favicon"
        histElement.appendChild(icon)
    }
    const img = document.createElement("img")
    img.src = joinPath(__dirname, "../img/trash.png")
    img.addEventListener("click", () => clearLinesFromHistory(hist.line))
    histElement.appendChild(img)
    const date = document.createElement("span")
    date.textContent = formatDate(hist.date)
    date.setAttribute("iso", hist.date.toISOString())
    date.className = "hist-date"
    histElement.appendChild(date)
    const title = document.createElement("span")
    title.textContent = hist.title
    title.className = "hist-title"
    histElement.appendChild(title)
    const url = document.createElement("a")
    url.textContent = urlToString(hist.url)
    url.setAttribute("href", hist.url)
    histElement.appendChild(url)
    list.insertBefore(histElement, list.firstChild)
}

const clearHistory = () => {
    const newestElement = document.querySelector("*[hist-line]")
    clearLinesFromHistory(0, newestElement?.getAttribute("hist-line"))
}

/**
 * Clear the history from specific lines by startl index and optionally end
 *
 * @param {number} startStr
 * @param {string|number|null} endStr
 */
const clearLinesFromHistory = (startStr, endStr = null) => {
    if (currentlyRemoving) {
        return
    }
    currentlyRemoving = true
    const start = Number(startStr)
    let end = Number(endStr)
    if (!endStr || isNaN(end)) {
        end = start
    }
    const entries = [...document.querySelectorAll("*[hist-line]")].filter(h => {
        if (!(h instanceof HTMLElement) || h.style.display === "none") {
            return false
        }
        const num = Number(h.getAttribute("hist-line"))
        return num >= start && num <= end
    }).map(h => {
        h.classList.add("marked")
        const date = h.querySelector(".hist-date")?.getAttribute("iso")
        const url = h.querySelector("a")?.getAttribute("href")
        return {date, url}
    })
    ipcRenderer.sendToHost("history-list-request", "range", entries)
}

const filterList = () => {
    const filterEl = document.getElementById("filter")
    if (!(filterEl instanceof HTMLInputElement)) {
        return
    }
    const filter = filterEl.value.trim().toLowerCase()
    const histElements = [...document.querySelectorAll("*[hist-line]")]
    let anyResult = false
    histElements.forEach(hist => {
        if (!(hist instanceof HTMLElement)) {
            return false
        }
        const url = hist.querySelector("a")?.getAttribute("href")
        const title = hist.querySelector(".hist-title")?.textContent
        if (url?.toLowerCase().includes(filter)) {
            hist.style.display = ""
            anyResult = true
        } else if (title?.toLowerCase().includes(filter)) {
            hist.style.display = ""
            anyResult = true
        } else {
            hist.style.display = "none"
        }
    })
    const removeAll = document.getElementById("remove-all")
    const noResults = document.getElementById("no-results")
    if (!removeAll || !noResults) {
        return
    }
    if (!histElements.length || anyResult) {
        removeAll.style.display = ""
        noResults.style.display = "none"
    } else {
        removeAll.style.display = "none"
        noResults.style.display = ""
    }
}

window.addEventListener("load", () => {
    const removeAll = document.createElement("img")
    removeAll.id = "remove-all"
    removeAll.style.display = "none"
    removeAll.src = joinPath(__dirname, "../img/trash.png")
    removeAll.addEventListener("click", () => clearHistory())
    document.body.insertBefore(removeAll, document.body.firstChild)
    document.getElementById("filter")?.addEventListener("input", filterList)
    ipcRenderer.sendToHost("history-list-request")
})

ipcRenderer.on("history-list", (_, h) => {
    /** @type {import("../renderer/history").historyItem[]} */
    const history = JSON.parse(h)
    receiveHistory(history)
})

ipcRenderer.on("history-removal-status", success => {
    [...document.querySelectorAll(".marked")].forEach(m => {
        if (success) {
            m.remove()
        } else {
            m.classList.remove("marked")
        }
    })
    currentlyRemoving = false
    filterList()
})
