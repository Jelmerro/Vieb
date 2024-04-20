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
const {joinPath} = require("../util")

/** Filter the cookie list based on the search query in the input box. */
const filterList = () => {
    const filterEl = document.getElementById("filter")
    let filter = ""
    if (filterEl instanceof HTMLInputElement) {
        filter = filterEl.value.trim().toLowerCase()
    }
    const cookieElements = [...document.getElementsByClassName("cookie")]
    let anyResult = false
    cookieElements.forEach(cookie => {
        if (!(cookie instanceof HTMLElement)) {
            return
        }
        if (cookie.getAttribute("cookie-url")?.includes(filter)) {
            cookie.style.display = ""
            anyResult = true
        } else {
            cookie.style.display = "none"
        }
    })
    const removeAll = document.getElementById("remove-all")
    const noResults = document.getElementById("no-results")
    if (!removeAll || !noResults) {
        return
    }
    if (anyResult) {
        removeAll.style.display = ""
        noResults.style.display = "none"
    } else {
        removeAll.style.display = "none"
        noResults.style.display = ""
        if (filter) {
            noResults.textContent = translate("pages.cookies.filterEmpty")
        } else {
            noResults.textContent = translate("pages.cookies.empty")
        }
    }
}

/**
 * Convert an electron cookie object to a valid url.
 * @param {Electron.Cookie} cookie
 */
const cookieToUrl = cookie => {
    let url = "http://"
    if (cookie.secure) {
        url = "https://"
    }
    if (cookie.domain?.charAt(0) === ".") {
        url += "www"
    }
    return url + cookie.domain + cookie.path
}

/** Parse the list of cookies and show them. */
const refreshList = async() => {
    /** @type {Electron.Cookie[]} */
    const cookieList = await ipcRenderer.invoke("list-cookies")
    const cookies = cookieList.sort((a, b) => (a.domain?.replace(/\W/, "")
        ?? "").localeCompare(b.domain?.replace(/\W/, "") ?? ""))
    const listEl = document.getElementById("list")
    if (listEl) {
        listEl.textContent = ""
    }
    const removeAll = document.getElementById("remove-all")
    if (cookies.length === 0 && removeAll) {
        removeAll.style.display = "none"
    }
    cookies.forEach(cookie => {
        const cookieElement = document.createElement("div")
        cookieElement.className = "cookie"
        cookieElement.setAttribute("cookie-url", cookieToUrl(cookie))
        cookieElement.setAttribute("cookie-name", cookie.name)
        const domain = document.createElement("span")
        domain.textContent = cookie.domain ?? ""
        cookieElement.append(domain)
        const name = document.createElement("span")
        name.textContent = cookie.name
        cookieElement.append(name)
        const value = document.createElement("span")
        value.textContent = cookie.value
        cookieElement.append(value)
        const remove = document.createElement("img")
        remove.src = joinPath(__dirname, "../img/trash.png")
        remove.className = "remove"
        remove.addEventListener("click", async() => {
            await ipcRenderer.invoke("remove-cookie",
                cookieToUrl(cookie), cookie.name)
            refreshList()
        })
        cookieElement.append(remove)
        listEl?.append(cookieElement)
    })
    filterList()
}

/** Remove all cookies either based on filter or completely. */
const removeAllCookies = () => {
    const cookieElements = [...document.getElementsByClassName("cookie")]
    const removeAll = document.getElementById("remove-all")
    if (removeAll) {
        removeAll.style.display = "none"
    }
    cookieElements.forEach(async cookie => {
        if (!(cookie instanceof HTMLElement)) {
            return
        }
        if (cookie.style.display !== "none") {
            await ipcRenderer.invoke("remove-cookie",
                cookie.getAttribute("cookie-url"),
                cookie.getAttribute("cookie-name"))
        }
    })
    refreshList()
}

window.addEventListener("DOMContentLoaded", () => {
    const h1 = document.querySelector("h1")
    if (h1) {
        h1.textContent = translate("pages.cookies.title")
    }
    const list = document.getElementById("list")
    if (list) {
        list.textContent = translate("pages.cookies.loading")
    }
    const filter = document.getElementById("filter")
    if (filter instanceof HTMLInputElement) {
        filter.placeholder = translate("pages.cookies.filterPlaceholder")
    }
    const removeAll = document.createElement("img")
    removeAll.id = "remove-all"
    removeAll.src = joinPath(__dirname, "../img/trash.png")
    removeAll.addEventListener("click", removeAllCookies)
    document.body.insertBefore(removeAll, document.body.firstChild)
    document.getElementById("filter")?.addEventListener("input", filterList)
    refreshList()
})
