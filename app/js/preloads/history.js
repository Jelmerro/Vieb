/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019 Jelmer van Arnhem
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

const {remote} = require("electron")
const path = require("path")
const fs = require("fs")
const readline = require("readline")

const histFile = path.join(remote.app.getPath("appData"), "hist")

//Configure breakpoints to make searching easier
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
//"enabled" is there to calculate if the breakpoint makes sense at this time
//If true, the breakpoint might have no entries in case it still won't be shown
//Only breakpoints that make sense AND contain history entries will be visible
const dateBreakpoints = [
    {
        title: "Past hour",
        link: "hour",
        date: anHourAgo,
        enabled: true
    },
    {
        title: "Today",
        link: "day",
        date: todayStartTime,
        enabled: anHourAgo.getTime() > todayStartTime.getTime()
    },
    {
        title: "Yesterday",
        link: "yesterday",
        date: yesterdayStartTime,
        enabled: true
    },
    {
        title: "Past 7 days",
        link: "week",
        date: pastSevenDays,
        enabled: true
    },
    {
        title: "This month",
        link: "month",
        date: thisMonth,
        enabled: pastSevenDays.getTime() > thisMonth.getTime()
    },
    {
        title: "Past year",
        link: "year",
        date: pastYear,
        enabled: true
    },
    {
        title: "Older than a year",
        link: "old",
        date: null,
        enabled: true
    }
].reverse().filter(b => b.enabled)
let currentBreakpointIndex = 0

// Actually parse the list and use the breakpoints

const parseHistory = () => {
    document.getElementById("breakpoints").innerHTML = ""
    document.getElementById("list").innerHTML = ""
    currentBreakpointIndex = 0
    if (!fs.existsSync(histFile) || !fs.statSync(histFile).isFile()) {
        document.getElementById("list").textContent
            = "No pages have been visited yet"
        return
    }
    const histStream = fs.createReadStream(histFile)
    const rl = readline.createInterface({
        input: histStream
    })
    rl.on("line", line => {
        const hist = parseHistLine(line)
        if (hist) {
            addHistToList(hist)
        }
    }).on("close", () => {
        if (document.getElementById("list").innerHTML === "") {
            document.getElementById("list").textContent
                = "No pages have been visited yet"
        } else if (currentBreakpointIndex >= dateBreakpoints.length) {
            addBreakpoint(currentBreakpointIndex - 1)
        } else {
            addBreakpoint(currentBreakpointIndex)
        }
        if (window.location.hash !== "") {
            document.querySelector(`a[href='${window.location.hash}']`).click()
        }
    })
}

const addBreakpoint = index => {
    if (document.getElementById("list").innerHTML === "") {
        return
    }
    const breakpoint = dateBreakpoints[index]
    //Add link to the top of the page
    const link = document.createElement("a")
    link.textContent = breakpoint.title
    link.setAttribute("href", `#${breakpoint.link}`)
    document.getElementById("breakpoints").insertBefore(
        link, document.getElementById("breakpoints").firstChild)
    //Add header to the list
    const h2 = document.createElement("h2")
    h2.setAttribute("id", breakpoint.link)
    h2.textContent = breakpoint.title
    document.getElementById("list").insertBefore(
        h2, document.getElementById("list").firstChild)
}

const addHistToList = hist => {
    hist.date = new Date(hist.date)
    //Shift the breakpoint to the next one
    const previousBreakpoint = currentBreakpointIndex
    let breakpoint = dateBreakpoints[currentBreakpointIndex + 1]
    while (breakpoint && breakpoint.date.getTime() < hist.date.getTime()) {
        currentBreakpointIndex += 1
        breakpoint = dateBreakpoints[currentBreakpointIndex + 1]
    }
    //And show only the revelant breakpoint if multiple are skipped
    if (previousBreakpoint !== currentBreakpointIndex) {
        addBreakpoint(previousBreakpoint)
    }
    //Finally show the history entry (possibly after new breakpoint)
    const histElement = document.createElement("div")
    histElement.className = "hist-entry"
    const date = document.createElement("span")
    date.textContent = formatDate(hist.date)
    histElement.appendChild(date)
    const title = document.createElement("span")
    title.textContent = hist.title
    histElement.appendChild(title)
    const url = document.createElement("a")
    url.textContent = hist.url
    url.setAttribute("href", hist.url)
    histElement.appendChild(url)
    document.getElementById("list").insertBefore(
        histElement, document.getElementById("list").firstChild)
}

const clearHistory = () => {
    try {
        fs.unlinkSync(histFile)
    } catch (e) {
        //Failed to delete, might not exist
    }
    parseHistory()
}

const parseHistLine = line => {
    const parts = line.split("\t")
    if (parts.length < 3) {
        return false
    }
    const date = new Date(parts[0])
    if (!date) {
        return false
    }
    return {
        date: date,
        title: parts[1],
        url: parts.slice(2).join("")
    }
}

const formatDate = date => {
    if (typeof date === "string") {
        date = new Date(date)
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")
    }-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours())
        .padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${
        String(date.getSeconds()).padStart(2, "0")}`
}

window.addEventListener("load", () => {
    parseHistory()
})
