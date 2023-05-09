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
        "title": "Last hour"
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
        "title": "Last 7 days"
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
        "title": "This year"
    },
    {
        "date": null,
        "enabled": true,
        "link": "old",
        "title": "Older than this year"
    }
].reverse().filter(b => b.enabled)
let currentBreakpointIndex = -1
let currentlyRemoving = false

// Actually parse the list and use the breakpoints

/**
 * Show the received history in a list.
 * @param {import("../renderer/history").historyItem[]} history
 */
const receiveHistory = history => {
    const removeAllEl = document.getElementById("remove-all")
    const list = document.getElementById("list")
    const scanningProgress = document.getElementById("scanning-progress")
    const breakpointsEl = document.getElementById("breakpoints")
    if (!removeAllEl || !list || !scanningProgress || !breakpointsEl) {
        return
    }
    removeAllEl.style.display = "none"
    breakpointsEl.textContent = ""
    list.textContent = ""
    currentBreakpointIndex = -1
    if (history.length === 0) {
        list.textContent = "No pages have been visited yet"
        return
    }
    removeAllEl.style.display = ""
    const goal = history.length
    let lineNumber = 0
    /**
     * Add an item to the history list on a timeout based on previous duration.
     * @param {import("../renderer/history").historyItem} hist
     */
    const addHistTimeout = hist => {
        requestAnimationFrame(() => {
            addHistToList({
                ...hist, "date": new Date(hist.date), "line": lineNumber
            })
            lineNumber += 1
            if (goal === lineNumber) {
                scanningProgress.style.display = "none"
            } else {
                scanningProgress.textContent
                    = `Reading history ${lineNumber}/${goal}, currently going `
                    + `back to history from ${formatDate(hist.date)}`
            }
            addHistTimeout(history[lineNumber])
        })
    }
    addHistTimeout(history[lineNumber])
}

/** Add a breakpoint by index at a line number.
 * @param {number} index
 * @param {number} lineNumber
 */
const addBreakpoint = (index, lineNumber) => {
    const breakpoint = dateBreakpoints[index]
    // Add link to the top of the page
    const link = document.createElement("a")
    link.textContent = breakpoint.title
    link.setAttribute("href", `#${breakpoint.link}`)
    document.getElementById("breakpoints")?.append(link)
    // Add remove img button to the list
    const img = document.createElement("img")
    img.src = joinPath(__dirname, "../img/trash.png")
    document.getElementById("list")?.append(img)
    // Add header to the list
    const h2 = document.createElement("h2")
    h2.setAttribute("id", breakpoint.link)
    h2.textContent = breakpoint.title
    document.getElementById("list")?.append(h2)
    // Add the remove listener to the trash bin button
    img.addEventListener("click", () => {
        let nextBreakpoint = h2.nextElementSibling
        while (nextBreakpoint) {
            if (nextBreakpoint.matches("h2,img")) {
                break
            }
            nextBreakpoint = nextBreakpoint.nextElementSibling
        }
        const endNumber = Number(nextBreakpoint?.previousElementSibling
            ?.getAttribute("hist-line")) || Number.MAX_SAFE_INTEGER
        clearLinesFromHistory(lineNumber, endNumber)
    })
}

/**
 * Add a single history entry to the list.
 * @param {(
 *   import("../renderer/history").historyItem & {date: Date, line: number}
 * )} hist
 */
const addHistToList = hist => {
    // Shift the breakpoint to the next one
    let newBreakpointIndex = 0
    let breakpoint = dateBreakpoints[newBreakpointIndex]
    while (breakpoint
        && (breakpoint.date?.getTime() ?? 0) < hist.date.getTime()) {
        newBreakpointIndex += 1
        breakpoint = dateBreakpoints[newBreakpointIndex]
    }
    newBreakpointIndex -= 1
    // And show only the relevant breakpoint if multiple are skipped
    if (newBreakpointIndex !== currentBreakpointIndex) {
        addBreakpoint(newBreakpointIndex, hist.line - 1)
        currentBreakpointIndex = newBreakpointIndex
    }
    // Finally show the history entry (possibly after new breakpoint)
    const histElement = document.createElement("div")
    histElement.setAttribute("hist-line", `${hist.line}`)
    histElement.className = "hist-entry"
    if (hist.icon) {
        const icon = document.createElement("img")
        icon.src = hist.icon
        icon.className = "favicon"
        histElement.append(icon)
    }
    const img = document.createElement("img")
    img.src = joinPath(__dirname, "../img/trash.png")
    img.addEventListener("click", () => clearLinesFromHistory(hist.line))
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
    const filterEl = document.getElementById("filter")
    if (filterEl instanceof HTMLInputElement) {
        const filter = filterEl.value.trim().toLowerCase()
        if (hist.url.toLowerCase().includes(filter)) {
            histElement.style.display = ""
        } else if (hist.title.toLowerCase().includes(filter)) {
            histElement.style.display = ""
        } else {
            histElement.style.display = "none"
        }
    }
    document.getElementById("list")?.append(histElement)
}

const clearHistory = () => {
    const newestElement = document.querySelector("*[hist-line]")
    clearLinesFromHistory(0, newestElement?.getAttribute("hist-line"))
}

/**
 * Clear the history from specific lines by startl index and optionally end.
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
            return
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
    const history = JSON.parse(h).reverse()
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
