/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020 Jelmer van Arnhem
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
/* global SETTINGS TABS */
"use strict"

const layoutDivById = id => {
    return document.querySelector(`#pagelayout div[link-id='${id}']`)
}

const switchView = (oldViewOrId, newView) => {
    let oldId = oldViewOrId
    if (oldViewOrId && !["number", "string"].includes(typeof oldViewOrId)) {
        oldId = oldViewOrId.getAttribute("link-id")
    }
    const newId = newView.getAttribute("link-id")
    if (oldId) {
        if (!layoutDivById(newId)) {
            if (layoutDivById(oldId)) {
                layoutDivById(oldId).setAttribute("link-id", newId)
            }
        }
    } else if (document.getElementById("pagelayout").children.length === 0) {
        document.getElementById("pagelayout").classList.add("hor")
        const singleView = document.createElement("div")
        singleView.setAttribute("link-id", newId)
        document.querySelector("#pagelayout").appendChild(singleView)
    }
    applyLayout()
}

const hide = (view, close = false) => {
    if (!document.getElementById("pages").classList.contains("multiple")) {
        return
    }
    const inLayout = layoutDivById(view.getAttribute("link-id"))
    const parent = inLayout.parentNode
    const sibling = inLayout.nextSibling
    parent.removeChild(inLayout)
    if (view.id === "current-page") {
        const visibleTabs = [...document.querySelectorAll("#tabs .visible-tab")]
        let newTab = null
        if (sibling) {
            newTab = visibleTabs.find(t => t.getAttribute("link-id")
                === sibling.getAttribute("link-id"))
        }
        if (!newTab && parent.children[0]) {
            newTab = visibleTabs.find(t => t.getAttribute("link-id")
                === parent.children[0].getAttribute("link-id"))
        }
        if (!newTab) {
            newTab = visibleTabs.find(t => t.getAttribute("link-id")
                !== view.getAttribute("link-id"))
        }
        if (close) {
            document.getElementById("tabs").removeChild(TABS.currentTab())
            document.getElementById("pages").removeChild(TABS.currentPage())
        }
        TABS.switchToTab(TABS.listTabs().indexOf(newTab))
    }
    applyLayout()
}

const add = (viewOrId, method, leftOrAbove) => {
    let id = viewOrId
    if (!["number", "string"].includes(typeof viewOrId)) {
        id = viewOrId.getAttribute("link-id")
    }
    const currentPage = TABS.currentPage()
    const inLayout = layoutDivById(currentPage.getAttribute("link-id"))
    if ([...document.querySelectorAll("#pagelayout *[link-id]")].length === 1) {
        document.getElementById("pagelayout").className = method
    }
    if (inLayout.parentNode.classList.contains(method)) {
        const singleView = document.createElement("div")
        singleView.setAttribute("link-id", id)
        if (leftOrAbove) {
            inLayout.parentNode.insertBefore(singleView, inLayout)
        } else {
            inLayout.parentNode.insertBefore(singleView, inLayout.nextSibling)
        }
    } else {
        const verContainer = document.createElement("div")
        verContainer.className = method
        if (leftOrAbove) {
            const singleView = document.createElement("div")
            singleView.setAttribute("link-id", id)
            verContainer.appendChild(singleView)
        }
        const existingView = document.createElement("div")
        existingView.setAttribute("link-id", inLayout.getAttribute("link-id"))
        verContainer.appendChild(existingView)
        if (!leftOrAbove) {
            const singleView = document.createElement("div")
            singleView.setAttribute("link-id", id)
            verContainer.appendChild(singleView)
        }
        inLayout.parentNode.insertBefore(verContainer, inLayout)
        inLayout.parentNode.removeChild(inLayout)
    }
    applyLayout()
}

const removeSingleEntryContainers = () => {
    [...document.querySelectorAll("#pagelayout .hor, #pagelayout .ver")]
        .forEach(container => {
            if (container.children.length < 2) {
                const lonelyView = container.children[0]
                if (lonelyView) {
                    const id = lonelyView.getAttribute("link-id")
                    if (!id) {
                        return
                    }
                    const singleView = document.createElement("div")
                    singleView.setAttribute("link-id", id)
                    container.parentNode.insertBefore(singleView, container)
                }
                container.parentNode.removeChild(container)
            }
        })
}

const applyLayout = () => {
    document.querySelectorAll("#pagelayout *[link-id]").forEach(element => {
        const id = element.getAttribute("link-id")
        const page = document.querySelector(`#pages webview[link-id='${id}']`)
        if (!page) {
            element.parentNode.removeChild(element)
        }
    })
    removeSingleEntryContainers()
    if (document.getElementById("pagelayout").children.length === 0) {
        document.getElementById("pagelayout").classList.add("hor")
        const cur = document.getElementById("current-page")
        if (cur) {
            const singleView = document.createElement("div")
            singleView.setAttribute("link-id", cur.getAttribute("link-id"))
            document.querySelector("#pagelayout").appendChild(singleView)
        }
    }
    const visiblePages = []
    const visibleTabs = []
    document.querySelectorAll("#pagelayout *[link-id]").forEach(element => {
        const id = element.getAttribute("link-id")
        const page = document.querySelector(`#pages webview[link-id='${id}']`)
        visibleTabs.push(document.querySelector(`#tabs span[link-id='${id}']`))
        visiblePages.push(page)
        const dimensions = element.getBoundingClientRect()
        page.style.left = `${Math.round(dimensions.x)}px`
        page.style.top = `${Math.round(dimensions.y)}px`
        page.style.width = `${Math.round(dimensions.width)}px`
        page.style.height = `${Math.round(dimensions.height)}px`
    })
    if (visiblePages.length > 1) {
        document.getElementById("pages").classList.add("multiple")
        document.getElementById("tabs").classList.add("multiple")
    } else {
        document.getElementById("pages").classList.remove("multiple")
        document.getElementById("tabs").classList.remove("multiple")
    }
    TABS.listPages().forEach(page => {
        if (visiblePages.includes(page)) {
            page.classList.add("visible-page")
        } else {
            page.classList.remove("visible-page")
        }
    })
    TABS.listTabs().forEach(tab => {
        if (visibleTabs.includes(tab)) {
            tab.classList.add("visible-tab")
        } else {
            tab.classList.remove("visible-tab")
        }
    })
    const cur = TABS.currentPage()
    if (cur) {
        const follow = document.getElementById("follow")
        if (document.getElementById("pages").classList.contains("multiple")) {
            const bor = SETTINGS.get("fontsize") * 0.15
            follow.style.top = `${Math.round(Number(
                cur.style.top.split(/[.|px]/g)[0]) + bor)}px`
            follow.style.left = `${Math.round(Number(
                cur.style.left.split(/[.|px]/g)[0]) + bor)}px`
        } else {
            follow.style.top = cur.style.top
            follow.style.left = cur.style.left
        }
    }
}

module.exports = {switchView, hide, add, applyLayout}
