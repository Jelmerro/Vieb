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

const filterList = () => {
    const filter = document.getElementById("filter").value.trim().toLowerCase()
    const cookieElements = [...document.getElementsByClassName("cookie")]
    let anyResult = false
    cookieElements.forEach(cookie => {
        if (cookie.getAttribute("cookie-url").includes(filter)) {
            cookie.style.display = ""
            anyResult = true
        } else {
            cookie.style.display = "none"
        }
    })
    if (anyResult) {
        document.getElementById("remove-all").style.display = ""
        document.getElementById("no-results").style.display = "none"
    } else {
        document.getElementById("remove-all").style.display = "none"
        document.getElementById("no-results").style.display = ""
        if (filter) {
            document.getElementById("no-results").textContent
                = "No results for current filter"
        } else {
            document.getElementById("no-results").textContent
                = "There are no cookies stored"
        }
    }
}

const cookieToUrl = cookie => {
    let url = "http"
    if (cookie.secure) {
        url += "s"
    }
    url += "://"
    if (cookie.domain.charAt(0) === ".") {
        url += "www"
    }
    return url + cookie.domain + cookie.path
}

const removeAllCookies = () => {
    const cookieElements = [...document.getElementsByClassName("cookie")]
    document.getElementById("remove-all").style.display = "none"
    cookieElements.forEach(async cookie => {
        if (cookie.style.display !== "none") {
            await remote.session.fromPartition("persist:main").cookies.remove(
                cookie.getAttribute("cookie-url"),
                cookie.getAttribute("cookie-name"))
        }
    })
    refreshList()
}

const parseList = cookies => {
    document.getElementById("list").textContent = ""
    const removeAll = document.getElementById("remove-all")
    if (cookies.length === 0) {
        removeAll.style.display = "none"
    }
    cookies.forEach(cookie => {
        const cookieElement = document.createElement("div")
        cookieElement.className = "cookie"
        cookieElement.setAttribute("cookie-url", cookieToUrl(cookie))
        cookieElement.setAttribute("cookie-name", cookie.name)
        const domain = document.createElement("span")
        domain.textContent = cookie.domain
        cookieElement.appendChild(domain)
        const name = document.createElement("span")
        name.textContent = cookie.name
        cookieElement.appendChild(name)
        const value = document.createElement("span")
        value.textContent = cookie.value
        cookieElement.appendChild(value)
        const remove = document.createElement("img")
        remove.src = path.join(__dirname, "../../img/trash.png")
        remove.className = "remove"
        remove.addEventListener("click", async () => {
            await remote.session.fromPartition("persist:main").cookies.remove(
                cookieToUrl(cookie), cookie.name)
            refreshList()
        })
        cookieElement.appendChild(remove)
        document.getElementById("list").appendChild(cookieElement)
    })
    filterList()
}

const refreshList = () => {
    remote.session.fromPartition("persist:main")
        .cookies.get({}).then(cookieList => {
            parseList(cookieList.sort((a, b) => {
                return a.domain.replace(/\W/, "")
                    .localeCompare(b.domain.replace(/\W/, ""))
            }))
            document.getElementById("filter")
                .addEventListener("input", filterList)
        })
}

window.addEventListener("load", () => {
    const removeAll = document.createElement("img")
    removeAll.id = "remove-all"
    removeAll.src = path.join(__dirname, "../../img/trash.png")
    removeAll.addEventListener("click", removeAllCookies)
    document.body.insertBefore(removeAll, document.body.firstChild)
    refreshList()
})
