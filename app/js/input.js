/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2020 Jelmer van Arnhem
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
/* global ACTIONS COMMAND POINTER FOLLOW HISTORY MODES PAGELAYOUT SETTINGS
 SUGGEST */
"use strict"

const defaultBindings = {
    "normal": {
        "Enter": "ACTIONS.clickOnSearch",
        "F1": ":help",
        "C-KeyA": "ACTIONS.increasePageNumber",
        "KeyB": "ACTIONS.previousTab",
        "KeyC": "POINTER.start",
        "KeyD": "ACTIONS.closeTab",
        "KeyE": "ACTIONS.toExploreMode",
        "KeyF": "ACTIONS.startFollowCurrentTab",
        "KeyG": {
            "KeyG": "ACTIONS.scrollTop",
            "KeyI": "ACTIONS.insertAtFirstInput"
        },
        "KeyH": "ACTIONS.scrollLeft",
        "KeyI": "ACTIONS.toInsertMode",
        "KeyJ": "ACTIONS.scrollDown",
        "KeyK": "ACTIONS.scrollUp",
        "KeyL": "ACTIONS.scrollRight",
        "KeyN": "ACTIONS.nextSearchMatch",
        "KeyR": "ACTIONS.reload",
        "KeyS": "POINTER.start",
        "KeyT": "ACTIONS.openNewTab",
        "KeyU": "ACTIONS.reopenTab",
        "KeyV": "POINTER.start",
        "KeyW": "ACTIONS.nextTab",
        "C-KeyX": "ACTIONS.decreasePageNumber",
        "Slash": "ACTIONS.toSearchMode",
        "S-KeyF": "ACTIONS.startFollowNewTab",
        "S-KeyG": "ACTIONS.scrollBottom",
        "S-KeyH": "ACTIONS.backInHistory",
        "S-KeyJ": "ACTIONS.nextTab",
        "S-KeyK": "ACTIONS.previousTab",
        "S-KeyL": "ACTIONS.forwardInHistory",
        "S-KeyN": "ACTIONS.previousSearchMatch",
        "S-KeyR": "ACTIONS.reloadWithoutCache",
        "S-KeyT": "ACTIONS.openNewTabWithCurrentUrl",
        "S-Digit4": "ACTIONS.scrollPageRight",
        "S-Digit6": "ACTIONS.scrollPageLeft",
        "S-Semicolon": "ACTIONS.toCommandMode",
        "C-KeyB": "ACTIONS.scrollPageUp",
        "C-KeyC": "ACTIONS.stopLoadingPage",
        "C-KeyD": "ACTIONS.scrollPageDownHalf",
        "C-KeyF": "ACTIONS.scrollPageDown",
        "C-KeyI": "ACTIONS.forwardInHistory",
        "C-KeyJ": "ACTIONS.moveTabForward",
        "C-KeyK": "ACTIONS.moveTabBackward",
        "C-KeyO": "ACTIONS.backInHistory",
        "C-KeyT": "ACTIONS.openNewTabAtAlternativePosition",
        "C-KeyU": "ACTIONS.scrollPageUpHalf",
        "C-Digit0": "ACTIONS.zoomReset",
        "C-Minus": "ACTIONS.zoomOut",
        "C-Equal": "ACTIONS.zoomIn",
        "CS-Digit0": "ACTIONS.zoomReset",
        "CS-Equal": "ACTIONS.zoomIn",
        "CS-Minus": "ACTIONS.zoomOut"
    },
    "insert": {
        "F1": ":help",
        "Escape": "ACTIONS.toNormalMode",
        "C-BracketLeft": "ACTIONS.toNormalMode",
        "C-KeyI": "ACTIONS.editWithVim"
    },
    "command": {
        "F1": ":help",
        "Escape": "ACTIONS.toNormalMode",
        "Tab": "ACTIONS.nextSuggestion",
        "S-Tab": "ACTIONS.prevSuggestion",
        "C-BracketLeft": "ACTIONS.toNormalMode",
        "C-KeyN": "ACTIONS.commandHistoryNext",
        "C-KeyP": "ACTIONS.commandHistoryPrevious",
        "Enter": "ACTIONS.useEnteredData"
    },
    "search": {
        "F1": ":help",
        "Escape": "ACTIONS.toNormalMode",
        "C-BracketLeft": "ACTIONS.toNormalMode",
        "Enter": "ACTIONS.useEnteredData"
    },
    "explore": {
        "F1": ":help",
        "Escape": "ACTIONS.toNormalMode",
        "Tab": "ACTIONS.nextSuggestion",
        "S-Tab": "ACTIONS.prevSuggestion",
        "C-BracketLeft": "ACTIONS.toNormalMode",
        "Enter": "ACTIONS.useEnteredData"
    },
    "follow": {
        "F1": ":help",
        "Escape": "ACTIONS.stopFollowMode",
        "C-BracketLeft": "ACTIONS.stopFollowMode"
    },
    "pointer": {
        "F1": ":help",
        "Enter": "POINTER.leftClick",
        "BracketLeft": "POINTER.scrollUp",
        "BracketRight": "POINTER.scrollDown",
        "KeyB": "POINTER.moveFastLeft",
        "KeyD": "POINTER.downloadImage",
        "KeyE": "POINTER.inspectElement",
        "KeyF": "ACTIONS.startFollowCurrentTab",
        "KeyG": {
            "KeyG": "POINTER.startOfPage"
        },
        "KeyH": "POINTER.moveLeft",
        "KeyI": "POINTER.insertAtPosition",
        "KeyJ": "POINTER.moveDown",
        "KeyK": "POINTER.moveUp",
        "KeyL": "POINTER.moveRight",
        "KeyR": "POINTER.rightClick",
        "KeyV": "POINTER.startVisualSelect",
        "KeyW": "POINTER.moveFastRight",
        "KeyY": "POINTER.copyAndStop",
        "Escape": "ACTIONS.toNormalMode",
        "S-Comma": "POINTER.scrollLeft",
        "S-Period": "POINTER.scrollRight",
        "S-KeyG": "POINTER.endOfPage",
        "S-KeyH": "POINTER.startOfView",
        "S-KeyJ": "POINTER.scrollDown",
        "S-KeyK": "POINTER.scrollUp",
        "S-KeyL": "POINTER.endOfView",
        "S-KeyM": "POINTER.centerOfView",
        "S-Digit4": "POINTER.moveRightMax",
        "S-Digit6": "POINTER.moveLeftMax",
        "C-KeyD": "POINTER.moveFastDown",
        "C-KeyH": "POINTER.moveSlowLeft",
        "C-KeyJ": "POINTER.moveSlowDown",
        "C-KeyK": "POINTER.moveSlowUp",
        "C-KeyL": "POINTER.moveSlowRight",
        "C-KeyU": "POINTER.moveFastUp",
        "C-BracketLeft": "ACTIONS.toNormalMode"
    },
    "visual": {
        "F1": ":help",
        "BracketLeft": "POINTER.scrollUp",
        "BracketRight": "POINTER.scrollDown",
        "KeyB": "POINTER.moveFastLeft",
        "KeyC": "POINTER.copyAndStop",
        "KeyF": "ACTIONS.startFollowCurrentTab",
        "KeyG": {
            "KeyG": "POINTER.startOfPage"
        },
        "KeyH": "POINTER.moveLeft",
        "KeyJ": "POINTER.moveDown",
        "KeyK": "POINTER.moveUp",
        "KeyL": "POINTER.moveRight",
        "KeyW": "POINTER.moveFastRight",
        "KeyY": "POINTER.copyAndStop",
        "Escape": "ACTIONS.toNormalMode",
        "S-Comma": "POINTER.scrollLeft",
        "S-Period": "POINTER.scrollRight",
        "S-KeyG": "POINTER.endOfPage",
        "S-KeyH": "POINTER.startOfView",
        "S-KeyJ": "POINTER.scrollDown",
        "S-KeyK": "POINTER.scrollUp",
        "S-KeyL": "POINTER.endOfView",
        "S-KeyM": "POINTER.centerOfView",
        "S-Digit4": "POINTER.moveRightMax",
        "S-Digit6": "POINTER.moveLeftMax",
        "C-KeyD": "POINTER.moveFastDown",
        "C-KeyH": "POINTER.moveSlowLeft",
        "C-KeyJ": "POINTER.moveSlowDown",
        "C-KeyK": "POINTER.moveSlowUp",
        "C-KeyL": "POINTER.moveSlowRight",
        "C-KeyU": "POINTER.moveFastUp",
        "C-BracketLeft": "ACTIONS.toNormalMode"
    }
}
let bindings = {}
let repeatCounter = 0
// TODO replace currentSubKey with a list of pressed keys without an action being triggered
// This will only happen if there are actions bound to recursive bindings.
let currentSubKey = null
let supportedActions = []

const init = () => {
    window.addEventListener("keydown", handleKeyboard)
    window.addEventListener("keypress", handleUserInput)
    window.addEventListener("keyup", handleUserInput)
    window.addEventListener("auxclick", e => {
        e.preventDefault()
        ACTIONS.setFocusCorrectly()
    })
    window.addEventListener("click", e => {
        if (e.target.classList.contains("no-focus-reset")) {
            e.preventDefault()
            return
        }
        e.preventDefault()
        ACTIONS.setFocusCorrectly()
    })
    window.addEventListener("mouseup", e => {
        if (SETTINGS.get("mouse")) {
            if (e.target === document.getElementById("url")) {
                if (!["explore", "command"].includes(MODES.currentMode())) {
                    ACTIONS.toExploreMode()
                }
            } else if (["explore", "command"].includes(MODES.currentMode())) {
                ACTIONS.toNormalMode()
            }
        }
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
        if (["pointer", "visual"].includes(MODES.currentMode())) {
            POINTER.updateElement()
        }
        PAGELAYOUT.applyLayout()
    })
    document.getElementById("url").addEventListener("input", () => {
        if (MODES.currentMode() === "explore") {
            HISTORY.suggestHist(document.getElementById("url").value)
        } else if (MODES.currentMode() === "command") {
            SUGGEST.suggestCommand(document.getElementById("url").value)
        }
    })
    setInterval(() => {
        ACTIONS.setFocusCorrectly()
    }, 500)
    ACTIONS.setFocusCorrectly()
    // TODO rethink this list now that functions can very well have arguments,
    // This also includes simplifying the ACTIONS based on the now supported arguments.
    const unSupportedActions = [
        "ACTIONS.setFocusCorrectly",
        "POINTER.move",
        "POINTER.handleScrollDiffEvent",
        "POINTER.updateElement",
        "POINTER.releaseKeys"
    ]
    supportedActions = [
        ...Object.keys(ACTIONS).map(a => `ACTIONS.${a}`),
        ...Object.keys(POINTER).map(c => `POINTER.${c}`)
    ].filter(m => !unSupportedActions.includes(m))
    bindings = JSON.parse(JSON.stringify(defaultBindings))
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
    return idToAction(toIdentifier(e))
}

const idToAction = id => {
    if (document.body.classList.contains("fullscreen")) {
        MODES.setMode("insert")
        return
    }
    return bindings[MODES.currentMode()][id]
}

// This is a list of actions that can be counted in advance by a count argument
// Functions not listed will be executed for x times using a while loop
const countableActions = [
    // Actually countable with notable speed increase
    "ACTIONS.increasePageNumber",
    "ACTIONS.decreasePageNumber",
    "ACTIONS.previousTab",
    "ACTIONS.nextTab",
    "ACTIONS.zoomOut",
    "ACTIONS.zoomIn",
    // Single use actions that ignore the count and only execute once
    "ACTIONS.emptySearch",
    "ACTIONS.toExploreMode",
    "ACTIONS.startFollowCurrentTab",
    "ACTIONS.scrollTop",
    "ACTIONS.insertAtFirstInput",
    "ACTIONS.toInsertMode",
    "ACTIONS.reload",
    "ACTIONS.toSearchMode",
    "ACTIONS.startFollowNewTab",
    "ACTIONS.scrollBottom",
    "ACTIONS.openNewTabWithCurrentUrl",
    "ACTIONS.toCommandMode",
    "ACTIONS.stopLoadingPage",
    "ACTIONS.zoomReset",
    "ACTIONS.toNormalMode",
    "ACTIONS.stopFollowMode",
    "ACTIONS.useEnteredData",
    "ACTIONS.editWithVim",
    "POINTER.start",
    "POINTER.inspectElement",
    "POINTER.copyAndStop",
    "POINTER.startOfPage",
    "POINTER.insertAtPosition",
    "POINTER.centerOfView",
    "POINTER.startOfView",
    "POINTER.endOfView",
    "POINTER.endOfPage",
    "POINTER.moveRightMax",
    "POINTER.moveLeftMax"
]

const handleKeyboard = e => {
    if (document.body.classList.contains("fullscreen")) {
        MODES.setMode("insert")
        return
    }
    const ignoredKeys = [
        "ControlLeft",
        "ControlRight",
        "ShiftLeft",
        "ShiftRight",
        "AltLeft",
        "AltRight",
        "MetaLeft",
        "MetaRight",
        "NumLock",
        "CapsLock",
        "ScrollLock"
    ]
    if (ignoredKeys.includes(e.code)) {
        // Keys such as control should not be registered on their own,
        // This will prevent the cancellation of bindings like 'g g',
        // After pressing just a single g and then control.
        e.preventDefault()
        return
    }
    const id = toIdentifier(e)
    let action = eventToAction(e)
    if (currentSubKey) {
        const actionSet = idToAction(currentSubKey)
        if (actionSet) {
            action = actionSet[toIdentifier(e)]
        }
        currentSubKey = null
        document.getElementById("mode").style.textDecoration = ""
        document.getElementById("mode").style.fontStyle = ""
    } else if (typeof action === "object") {
        currentSubKey = id
        document.getElementById("mode").style.textDecoration = "underline"
        document.getElementById("mode").style.fontStyle = "italic"
        e.preventDefault()
        return
    }
    if (id === "Escape" || id === "C-BracketLeft") {
        if (repeatCounter !== 0) {
            repeatCounter = 0
            e.preventDefault()
            return
        }
    }
    const actionFunction = actionToFunction(action)
    if (actionFunction) {
        if (countableActions.includes(action)) {
            actionFunction(Math.max(repeatCounter, 1))
            e.preventDefault()
            repeatCounter = 0
            return
        }
        actionFunction()
        if (["normal", "pointer", "visual"].includes(MODES.currentMode())) {
            while (repeatCounter > 1) {
                actionFunction()
                repeatCounter -= 1
            }
            repeatCounter = 0
        }
        e.preventDefault()
        return
    }
    if (id.startsWith("Digit")) {
        if (["normal", "pointer", "visual"].includes(MODES.currentMode())) {
            const keyNumber = Number(id.replace("Digit", ""))
            if (!isNaN(keyNumber)) {
                repeatCounter = Number(String(repeatCounter) + keyNumber)
                if (repeatCounter > 100) {
                    repeatCounter = 100
                }
                e.preventDefault()
                return
            }
        } else {
            repeatCounter = 0
        }
    }
    handleUserInput(e)
}

const actionToFunction = action => {
    if (action && action.startsWith && action.startsWith(":")) {
        return () => COMMAND.execute(action)
    }
    if (supportedActions.includes(action)) {
        const categories = {"ACTIONS": ACTIONS, "POINTER": POINTER}
        const [categoryName, func] = action.split(".")
        return categories[categoryName][func]
    }
    return null
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
    const allowedInput = allowedUserInput.includes(id)
    const hasModifier = id.includes("-")
    if (!shift && !allowedInput && hasModifier || e.code === "Tab") {
        e.preventDefault()
    }
    ACTIONS.setFocusCorrectly()
}

const listSupportedActions = () => {
    return supportedActions
}

module.exports = {
    init,
    eventToAction,
    actionToFunction,
    bindings,
    listSupportedActions
}
