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
/* global HISTORY MODES ACTIONS FOLLOW COMMAND SETTINGS SUGGEST */
"use strict"

const bindings = {
    "normal": {
        "F1": "COMMAND.help",
        "KeyB": "ACTIONS.previousTab",
        "KeyD": "ACTIONS.closeTab",
        "KeyE": "ACTIONS.toNavMode",
        "KeyF": "FOLLOW.startFollowCurrentTab",
        "KeyG": "ACTIONS.scrollTop",
        "KeyH": "ACTIONS.scrollLeft",
        "KeyI": "ACTIONS.toInsertMode",
        "KeyJ": "ACTIONS.scrollDown",
        "KeyK": "ACTIONS.scrollUp",
        "KeyL": "ACTIONS.scrollRight",
        "KeyN": "ACTIONS.nextSearchMatch",
        "KeyR": "ACTIONS.reload",
        "KeyT": "ACTIONS.openNewTab",
        "KeyU": "ACTIONS.reopenTab",
        "KeyW": "ACTIONS.nextTab",
        "Slash": "ACTIONS.toSearchMode",
        "S-KeyF": "FOLLOW.startFollowNewTab",
        "S-KeyG": "ACTIONS.scrollBottom",
        "S-KeyH": "ACTIONS.backInHistory",
        "S-KeyJ": "ACTIONS.nextTab",
        "S-KeyK": "ACTIONS.previousTab",
        "S-KeyL": "ACTIONS.forwardInHistory",
        "S-KeyN": "ACTIONS.previousSearchMatch",
        "S-KeyR": "ACTIONS.reloadWithoutCache",
        "S-Semicolon": "ACTIONS.toCommandMode",
        "C-KeyB": "ACTIONS.scrollPageUp",
        "C-KeyD": "ACTIONS.scrollPageDownHalf",
        "C-KeyF": "ACTIONS.scrollPageDown",
        "C-KeyI": "ACTIONS.forwardInHistory",
        "C-KeyO": "ACTIONS.backInHistory",
        "C-KeyU": "ACTIONS.scrollPageUpHalf",
        "C-Digit0": "ACTIONS.zoomReset",
        "C-Minus": "ACTIONS.zoomOut",
        "C-Equal": "ACTIONS.zoomIn",
        "CS-Digit0": "ACTIONS.zoomReset",
        "CS-Equal": "ACTIONS.zoomIn",
        "CS-Minus": "ACTIONS.zoomOut"
    },
    "insert": {
        "F1": "COMMAND.help",
        "Escape": "ACTIONS.toNormalMode",
        "C-BracketLeft": "ACTIONS.toNormalMode"
    },
    "command": {
        "F1": "COMMAND.help",
        "Escape": "ACTIONS.toNormalMode",
        "Tab": "ACTIONS.nextSuggestion",
        "S-Tab": "ACTIONS.prevSuggestion",
        "C-BracketLeft": "ACTIONS.toNormalMode",
        "Enter": "ACTIONS.useEnteredData"
    },
    "search": {
        "F1": "COMMAND.help",
        "Escape": "ACTIONS.toNormalMode",
        "C-BracketLeft": "ACTIONS.toNormalMode",
        "Enter": "ACTIONS.useEnteredData"
    },
    "nav": {
        "F1": "COMMAND.help",
        "Escape": "ACTIONS.toNormalMode",
        "Tab": "ACTIONS.nextSuggestion",
        "S-Tab": "ACTIONS.prevSuggestion",
        "C-BracketLeft": "ACTIONS.toNormalMode",
        "Enter": "ACTIONS.useEnteredData"
    },
    "follow": {
        "F1": "COMMAND.help",
        "Escape": "FOLLOW.cancelFollow",
        "C-BracketLeft": "FOLLOW.cancelFollow"
    }
}

const init = () => {
    window.addEventListener("keydown", handleKeyboard)
    window.addEventListener("keypress", handleUserInput)
    window.addEventListener("keyup", handleUserInput)
    window.addEventListener("click", e => {
        e.preventDefault()
        ACTIONS.setFocusCorrectly()
    })
    window.addEventListener("contextmenu", e => {
        e.preventDefault()
        ACTIONS.setFocusCorrectly()
    })
    window.addEventListener("resize", () => {
        if (MODES.currentMode() === "follow") {
            FOLLOW.startFollow()
        }
    })
    document.getElementById("url").addEventListener("input", () => {
        if (MODES.currentMode() === "nav") {
            HISTORY.suggestHist(document.getElementById("url").value)
        } else if (MODES.currentMode() === "command") {
            SUGGEST.suggestCommand(document.getElementById("url").value)
        }
    })
    ACTIONS.setFocusCorrectly()
}

const toIdentifier = e => {
    if (e.ctrlKey || e.shiftKey || e.metaKey || e.altKey) {
        let identifier = ""
        if (e.ctrlKey) {
            identifier += "C"
        }
        if (e.shiftKey) {
            identifier += "S"
        }
        if (e.metaKey) {
            identifier += "M"
        }
        if (e.altKey) {
            identifier += "A"
        }
        return `${identifier}-${e.code}`
    }
    return e.code
}

const eventToAction = e => {
    if (document.body.className === "fullscreen") {
        MODES.setMode("insert")
        return
    }
    const allBindings = JSON.parse(JSON.stringify(bindings))
    const customBindings = SETTINGS.get("keybindings")
    Object.keys(allBindings).forEach(mode => {
        allBindings[mode] = Object.assign(
            allBindings[mode], customBindings[mode])
    })
    return allBindings[MODES.currentMode()][toIdentifier(e)]
}

const handleKeyboard = e => {
    if (document.body.className === "fullscreen") {
        MODES.setMode("insert")
        return
    }
    const action = eventToAction(e)
    const isAction = executeAction(action)
    if (isAction) {
        e.preventDefault()
        return
    }
    handleUserInput(e)
}

const executeAction = action => {
    if (typeof action !== "string") {
        return false
    }
    const actionParts = action.split(".")
    if (actionParts.length !== 2) {
        return false
    }
    const categories = {
        "ACTIONS": ACTIONS,
        "FOLLOW": FOLLOW,
        "COMMAND": COMMAND
    }
    const categoryName = actionParts[0]
    if (categories[categoryName] === undefined) {
        return false
    }
    const category = categories[categoryName]
    const func = actionParts[1]
    if (category[func] === undefined) {
        return false
    }
    category[func]()
    return true
}

const handleUserInput = e => {
    const id = toIdentifier(e)
    if (MODES.currentMode() === "follow") {
        if (e.type === "keydown") {
            FOLLOW.enterKey(id)
        }
        e.preventDefault()
        return
    }
    const allowedUserInput = [
        "C-KeyX",
        "C-KeyC",
        "C-KeyV",
        "C-KeyA",
        "C-Backspace",
        "C-ArrowLeft",
        "C-ArrowRight",
        "CS-ArrowLeft",
        "CS-ArrowRight"
    ]
    const shift = id.startsWith("S-")
    const allowedInput = allowedUserInput.indexOf(id) !== -1
    const hasModifier = id.indexOf("-") !== -1
    if (!shift && !allowedInput && hasModifier || e.code === "Tab") {
        e.preventDefault()
    }
    ACTIONS.setFocusCorrectly()
}

module.exports = {
    init,
    eventToAction,
    executeAction
}
