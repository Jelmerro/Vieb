/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2021 Jelmer van Arnhem
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
/* global ACTIONS COMMAND CONTEXTMENU POINTER FOLLOW MODES PAGELAYOUT SETTINGS
 SUGGEST TABS UTIL */
"use strict"

const {ipcRenderer} = require("electron")

const defaultBindings = {
    "n": {
        "<CR>": {"mapping": "<action.clickOnSearch>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<Tab>": {"mapping": "<Nop>"},
        "<C-a>": {"mapping": "<action.increasePageNumber>"},
        "b": {"mapping": "<action.previousTab>"},
        "<C-b>": {"mapping": "<action.scrollPageUp>"},
        "c": {"mapping": "<pointer.start>"},
        "<C-c>": {"mapping": "<action.stopLoadingPage>"},
        "d": {"mapping": "<action.closeTab>"},
        "<C-d>": {"mapping": "<action.scrollPageDownHalf>"},
        "e": {"mapping": "<action.toExploreMode>"},
        "f": {"mapping": "<action.startFollowCurrentTab>"},
        "F": {"mapping": "<action.startFollowNewTab>"},
        "<C-f>": {"mapping": "<action.scrollPageDown>"},
        "gg": {"mapping": "<action.scrollTop>"},
        "gi": {"mapping": "<action.insertAtFirstInput>"},
        "gt": {"mapping": "<action.nextTab>"},
        "gT": {"mapping": "<action.previousTab>"},
        "G": {"mapping": "<action.scrollBottom>"},
        "h": {"mapping": "<action.scrollLeft>"},
        "H": {"mapping": "<action.backInHistory>"},
        "i": {"mapping": "<action.toInsertMode>"},
        "<C-i>": {"mapping": "<action.forwardInHistory>"},
        "j": {"mapping": "<action.scrollDown>"},
        "J": {"mapping": "<action.nextTab>"},
        "<C-j>": {"mapping": "<action.moveTabForward>"},
        "k": {"mapping": "<action.scrollUp>"},
        "K": {"mapping": "<action.previousTab>"},
        "<C-k>": {"mapping": "<action.moveTabBackward>"},
        "l": {"mapping": "<action.scrollRight>"},
        "L": {"mapping": "<action.forwardInHistory>"},
        "n": {"mapping": "<action.nextSearchMatch>"},
        "N": {"mapping": "<action.previousSearchMatch>"},
        "<C-o>": {"mapping": "<action.backInHistory>"},
        "p": {"mapping": "<action.openFromClipboard>"},
        "P": {"mapping": "<action.openNewTab><action.openFromClipboard>"},
        "r": {"mapping": "<action.reload>"},
        "R": {"mapping": "<action.reloadWithoutCache>"},
        "s": {"mapping": "<pointer.start>"},
        "t": {"mapping": "<action.openNewTab>"},
        "T": {"mapping": "<action.openNewTabWithCurrentUrl>"},
        "<C-t>": {"mapping": "<:set tabnexttocurrent!>"
            + "<action.openNewTab><:set tabnexttocurrent!>"},
        "u": {"mapping": "<action.reopenTab>"},
        "<C-u>": {"mapping": "<action.scrollPageUpHalf>"},
        "v": {"mapping": "<pointer.start>"},
        "w": {"mapping": "<action.nextTab>"},
        "x": {"mapping": "<action.openLinkExternal>"},
        "ZZ": {"mapping": "<:quit>"},
        "<C-w>c": {"mapping": "<:close>"},
        "<C-w><C-c>": {"mapping": "<:close>"},
        "<C-w>n": {"mapping": "<:split>"},
        "<C-w><C-n>": {"mapping": "<:split>"},
        "<C-w>o": {"mapping": "<:only>"},
        "<C-w><C-o>": {"mapping": "<:only>"},
        "<C-w>q": {"mapping": "<:quit>"},
        "<C-w><C-q>": {"mapping": "<:quit>"},
        "<C-w>s": {"mapping": "<:split>"},
        "<C-w><C-s>": {"mapping": "<:split>"},
        "<C-w>v": {"mapping": "<:vsplit>"},
        "<C-w><C-v>": {"mapping": "<:vsplit>"},
        "<C-w>r": {"mapping": "<action.rotateSplitWindow>"},
        "<C-w><C-r>": {"mapping": "<action.rotateSplitWindow>"},
        "<C-w>R": {"mapping": "<action.rotateSplitWindowBackward>"},
        "<C-w><C-R>": {"mapping": "<action.rotateSplitWindowBackward>"},
        "<C-w>H": {"mapping": "<action.leftHalfSplitWindow>"},
        "<C-w><C-H>": {"mapping": "<action.leftHalfSplitWindow>"},
        "<C-w>J": {"mapping": "<action.bottomHalfSplitWindow>"},
        "<C-w><C-J>": {"mapping": "<action.bottomHalfSplitWindow>"},
        "<C-w>K": {"mapping": "<action.topHalfSplitWindow>"},
        "<C-w><C-K>": {"mapping": "<action.topHalfSplitWindow>"},
        "<C-w>L": {"mapping": "<action.rightHalfSplitWindow>"},
        "<C-w><C-L>": {"mapping": "<action.rightHalfSplitWindow>"},
        "<C-w>h": {"mapping": "<action.toLeftSplitWindow>"},
        "<C-w><C-h>": {"mapping": "<action.toLeftSplitWindow>"},
        "<C-w>j": {"mapping": "<action.toBottomSplitWindow>"},
        "<C-w><C-j>": {"mapping": "<action.toBottomSplitWindow>"},
        "<C-w>k": {"mapping": "<action.toTopSplitWindow>"},
        "<C-w><C-k>": {"mapping": "<action.toTopSplitWindow>"},
        "<C-w>l": {"mapping": "<action.toRightSplitWindow>"},
        "<C-w><C-l>": {"mapping": "<action.toRightSplitWindow>"},
        "<C-w>b": {"mapping": "<action.toLastSplitWindow>"},
        "<C-w><C-b>": {"mapping": "<action.toLastSplitWindow>"},
        "<C-w>t": {"mapping": "<action.toFirstSplitWindow>"},
        "<C-w><C-t>": {"mapping": "<action.toFirstSplitWindow>"},
        "<C-w>w": {"mapping": "<action.toNextSplitWindow>"},
        "<C-w><C-w>": {"mapping": "<action.toNextSplitWindow>"},
        "<C-w>W": {"mapping": "<action.toPreviousSplitWindow>"},
        "<C-w><C-W>": {"mapping": "<action.toPreviousSplitWindow>"},
        "<C-w>x": {"mapping": "<action.exchangeSplitWindow>"},
        "<C-w><C-x>": {"mapping": "<action.exchangeSplitWindow>"},
        "<C-w>p": {"mapping": "<action.toLastUsedTab>"},
        "<C-w><C-p>": {"mapping": "<action.toLastUsedTab>"},
        "<C-w>-": {"mapping": "<action.decreaseHeightSplitWindow>"},
        "<C-w>+": {"mapping": "<action.increaseHeightSplitWindow>"},
        "<C-w>=": {"mapping": "<action.distrubuteSpaceSplitWindow>"},
        "<C-w><C-=>": {"mapping": "<action.distrubuteSpaceSplitWindow>"},
        "<C-w><lt>": {"mapping": "<action.decreaseWidthSplitWindow>"},
        "<C-w>>": {"mapping": "<action.increaseWidthSplitWindow>"},
        "<C-w><C-lt>": {"mapping": "<action.decreaseWidthSplitWindow>"},
        "<C-w><C->>": {"mapping": "<action.increaseWidthSplitWindow>"},
        "<C-x>": {"mapping": "<action.decreasePageNumber>"},
        "y": {"mapping": "<action.pageToClipboard>"},
        "/": {"mapping": "<action.toSearchMode>"},
        "$": {"mapping": "<action.scrollPageRight>"},
        "^": {"mapping": "<action.scrollPageLeft>"},
        ":": {"mapping": "<action.toCommandMode>"},
        "-": {"mapping": "<action.zoomOut>"},
        "_": {"mapping": "<action.zoomOut>"},
        "=": {"mapping": "<action.zoomIn>"},
        "+": {"mapping": "<action.zoomIn>"},
        "<C-0>": {"mapping": "<action.zoomReset>"}
    },
    "i": {
        "<NumLock>": {"mapping": "<Nop>"},
        "<CapsLock>": {"mapping": "<Nop>"},
        "<ScrollLock>": {"mapping": "<Nop>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<Esc>": {"mapping": "<action.toNormalMode>"},
        "<C-i>": {"mapping": "<action.editWithVim>"},
        "<C-[>": {"mapping": "<action.toNormalMode>"}
    },
    "c": {
        "<CR>": {"mapping": "<action.useEnteredData>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<Esc>": {"mapping": "<action.toNormalMode>"},
        "<Tab>": {"mapping": "<action.nextSuggestion>"},
        "<S-Tab>": {"mapping": "<action.prevSuggestion>"},
        "<C-n>": {"mapping": "<action.commandHistoryNext>"},
        "<C-p>": {"mapping": "<action.commandHistoryPrevious>"},
        "<C-[>": {"mapping": "<action.toNormalMode>"}
    },
    "s": {
        "<CR>": {"mapping": "<action.useEnteredData>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<Esc>": {"mapping": "<action.toNormalMode>"},
        "<C-[>": {"mapping": "<action.toNormalMode>"}
    },
    "e": {
        "<CR>": {"mapping": "<action.useEnteredData>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<Esc>": {"mapping": "<action.toNormalMode>"},
        "<Tab>": {"mapping": "<action.nextSuggestion>"},
        "<S-Tab>": {"mapping": "<action.prevSuggestion>"},
        "<C-n>": {"mapping": "<action.exploreHistoryNext>"},
        "<C-p>": {"mapping": "<action.exploreHistoryPrevious>"},
        "<C-[>": {"mapping": "<action.toNormalMode>"}
    },
    "f": {
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<Tab>": {"mapping": "<action.reorderFollowLinks>"},
        "<Esc>": {"mapping": "<action.stopFollowMode>"},
        "<C-[>": {"mapping": "<action.stopFollowMode>"}
    },
    "p": {
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<CR>": {"mapping": "<pointer.leftClick>"},
        "<Esc>": {"mapping": "<action.toNormalMode>"},
        "[": {"mapping": "<pointer.scrollUp>"},
        "]": {"mapping": "<pointer.scrollDown>"},
        "b": {"mapping": "<pointer.moveFastLeft>"},
        "d": {"mapping": "<pointer.downloadImage>"},
        "D": {"mapping": "<pointer.downloadLink>"},
        "<C-d>": {"mapping": "<pointer.moveFastDown>"},
        "e": {"mapping": "<pointer.inspectElement>"},
        "f": {"mapping": "<action.startFollowCurrentTab>"},
        "gg": {"mapping": "<pointer.startOfPage>"},
        "G": {"mapping": "<pointer.endOfPage>"},
        "h": {"mapping": "<pointer.moveLeft>"},
        "H": {"mapping": "<pointer.startOfView>"},
        "<C-h>": {"mapping": "<pointer.moveSlowLeft>"},
        "i": {"mapping": "<pointer.insertAtPosition>"},
        "j": {"mapping": "<pointer.moveDown>"},
        "J": {"mapping": "<pointer.scrollDown>"},
        "<C-j>": {"mapping": "<pointer.moveSlowDown>"},
        "k": {"mapping": "<pointer.moveUp>"},
        "K": {"mapping": "<pointer.scrollUp>"},
        "<C-k>": {"mapping": "<pointer.moveSlowUp>"},
        "l": {"mapping": "<pointer.moveRight>"},
        "L": {"mapping": "<pointer.endOfView>"},
        "<C-l>": {"mapping": "<pointer.moveSlowRight>"},
        "M": {"mapping": "<pointer.centerOfView>"},
        "r": {"mapping": "<pointer.rightClick>"},
        "<C-u>": {"mapping": "<pointer.moveFastUp>"},
        "v": {"mapping": "<pointer.startVisualSelect>"},
        "w": {"mapping": "<pointer.moveFastRight>"},
        "x": {"mapping": "<action.openLinkExternal>"},
        "y": {"mapping": "<pointer.copyAndStop>"},
        "<lt>": {"mapping": "<pointer.scrollLeft>"},
        ">": {"mapping": "<pointer.scrollRight>"},
        "$": {"mapping": "<pointer.moveRightMax>"},
        "^": {"mapping": "<pointer.moveLeftMax>"},
        "<C-[>": {"mapping": "<action.toNormalMode>"}
    },
    "v": {
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<Esc>": {"mapping": "<action.toNormalMode>"},
        "[": {"mapping": "<pointer.scrollUp>"},
        "]": {"mapping": "<pointer.scrollDown>"},
        "b": {"mapping": "<pointer.moveFastLeft>"},
        "c": {"mapping": "<pointer.copyAndStop>"},
        "<C-d>": {"mapping": "<pointer.moveFastDown>"},
        "f": {"mapping": "<action.startFollowCurrentTab>"},
        "gg": {"mapping": "<pointer.startOfPage>"},
        "G": {"mapping": "<pointer.endOfPage>"},
        "h": {"mapping": "<pointer.moveLeft>"},
        "H": {"mapping": "<pointer.startOfView>"},
        "<C-h>": {"mapping": "<pointer.moveSlowLeft>"},
        "j": {"mapping": "<pointer.moveDown>"},
        "J": {"mapping": "<pointer.scrollDown>"},
        "<C-j>": {"mapping": "<pointer.moveSlowDown>"},
        "k": {"mapping": "<pointer.moveUp>"},
        "K": {"mapping": "<pointer.scrollUp>"},
        "<C-k>": {"mapping": "<pointer.moveSlowUp>"},
        "l": {"mapping": "<pointer.moveRight>"},
        "L": {"mapping": "<pointer.endOfView>"},
        "<C-l>": {"mapping": "<pointer.moveSlowRight>"},
        "M": {"mapping": "<pointer.centerOfView>"},
        "r": {"mapping": "<pointer.rightClick>"},
        "<C-u>": {"mapping": "<pointer.moveFastUp>"},
        "w": {"mapping": "<pointer.moveFastRight>"},
        "x": {"mapping": "<action.openLinkExternal>"},
        "y": {"mapping": "<pointer.copyAndStop>"},
        "<lt>": {"mapping": "<pointer.scrollLeft>"},
        ">": {"mapping": "<pointer.scrollRight>"},
        "$": {"mapping": "<pointer.moveRightMax>"},
        "^": {"mapping": "<pointer.moveLeftMax>"},
        "<C-[>": {"mapping": "<action.toNormalMode>"}
    },
    "m": {
        "<Up>": {"mapping": "<action.menuUp>"},
        "<Down>": {"mapping": "<action.menuDown>"},
        "<CR>": {"mapping": "<action.menuSelect>"},
        "<Esc>": {"mapping": "<action.menuClose>"},
        "<C-n>": {"mapping": "<action.menuDown>"},
        "<C-p>": {"mapping": "<action.menuUp>"}
    }
}
let repeatCounter = 0
let recursiveCounter = 0
let pressedKeys = ""
let bindings = {}
let supportedActions = []
let timeoutTimer = null
let blockNextInsertKey = false
const mapStringSplitter = /(<.*?[^-]>|<.*?->>|.)/g

const init = () => {
    window.addEventListener("keydown", handleKeyboard)
    window.addEventListener("keypress", handleUserInput)
    window.addEventListener("keyup", handleUserInput)
    window.addEventListener("click", e => {
        e.preventDefault()
        if (e.button === 2) {
            if (document.getElementById("context-menu").innerText) {
                return
            }
        } else if (e.path.find(el => el.matches?.("#context-menu"))) {
            return
        }
        CONTEXTMENU.clear()
        if (e.target.classList.contains("no-focus-reset")) {
            return
        }
        ACTIONS.setFocusCorrectly()
    })
    window.addEventListener("mouseup", e => {
        if (e.button === 2) {
            if (document.getElementById("context-menu").innerText) {
                return
            }
        } else if (e.path.find(el => el.matches?.("#context-menu"))) {
            return
        }
        if (SETTINGS.get("mouse")) {
            if (e.target === document.getElementById("url")) {
                if (!["explore", "command"].includes(MODES.currentMode())) {
                    ACTIONS.toExploreMode()
                }
            } else if (["explore", "command"].includes(MODES.currentMode())) {
                ACTIONS.toNormalMode()
            }
            const tab = e.path.find(el => TABS.listTabs().includes(el))
            if (tab) {
                CONTEXTMENU.clear()
                if (e.button === 1) {
                    TABS.closeTab(TABS.listTabs().indexOf(tab))
                } else {
                    TABS.switchToTab(TABS.listTabs().indexOf(tab))
                }
            }
        } else {
            e.preventDefault()
        }
        ACTIONS.setFocusCorrectly()
    })
    window.addEventListener("mousemove", e => {
        if (SETTINGS.get("mouse") && SETTINGS.get("mousefocus")) {
            document.elementsFromPoint(e.x, e.y).forEach(el => {
                if (el.matches("#pagelayout *[link-id], #tabs *[link-id]")) {
                    const tab = TABS.listTabs().find(t => t.getAttribute(
                        "link-id") === el.getAttribute("link-id"))
                    if (tab && TABS.currentTab() !== tab) {
                        TABS.switchToTab(TABS.listTabs().indexOf(tab))
                    }
                }
            })
        }
    })
    window.addEventListener("contextmenu", e => {
        e.preventDefault()
        if (SETTINGS.get("mouse")) {
            CONTEXTMENU.viebMenu(e)
        } else {
            ACTIONS.setFocusCorrectly()
        }
    })
    window.addEventListener("resize", () => {
        CONTEXTMENU.clear()
        PAGELAYOUT.applyLayout()
        if (["pointer", "visual"].includes(MODES.currentMode())) {
            POINTER.updateElement()
        }
    })
    document.getElementById("url").addEventListener("input", () => {
        if (MODES.currentMode() === "explore") {
            SUGGEST.suggestExplore(document.getElementById("url").value)
        } else if (MODES.currentMode() === "command") {
            SUGGEST.suggestCommand(document.getElementById("url").value)
        } else if (MODES.currentMode() === "search") {
            if (SETTINGS.get("incsearch")) {
                ACTIONS.incrementalSearch()
            }
        }
    })
    ipcRenderer.on("insert-mode-input-event", (_, input) => {
        if (input.code === "Tab") {
            TABS.currentPage().focus()
        }
        // Check if fullscreen should be disabled
        const noMods = !input.shift && !input.meta && !input.alt
        const ctrl = input.control
        const escapeKey = input.code === "Escape" && noMods && !ctrl
        const ctrlBrack = input.code === "BracketLeft" && noMods && ctrl
        if (escapeKey || ctrlBrack) {
            if (document.body.classList.contains("fullscreen")) {
                TABS.currentPage().send("action", "exitFullscreen")
                return
            }
        }
        if (MODES.currentMode() !== "insert") {
            return
        }
        if (input.type.toLowerCase() !== "keydown") {
            return
        }
        handleKeyboard({
            "ctrlKey": input.control,
            "shiftKey": input.shift,
            "metaKey": input.meta,
            "altKey": input.alt,
            "key": input.key,
            "isTrusted": true,
            "preventDefault": () => undefined,
            "passedOnFromInsert": true
        })
    })
    ipcRenderer.on("window-close", () => {
        if (process.platform === "darwin") {
            executeMapString("<M-q>", true, true)
        } else {
            executeMapString("<A-F4>", true, true)
        }
    })
    ipcRenderer.on("app-command", (_, cmd) => {
        if (SETTINGS.get("mouse")) {
            if (cmd === "browser-backward") {
                ACTIONS.backInHistory()
            } else if (cmd === "browser-forward") {
                ACTIONS.forwardInHistory()
            }
        }
    })
    setInterval(() => ACTIONS.setFocusCorrectly(), 500)
    ACTIONS.setFocusCorrectly()
    const unSupportedActions = [
        "action.setFocusCorrectly",
        "action.incrementalSearch",
        "pointer.move",
        "pointer.handleScrollDiffEvent",
        "pointer.updateElement",
        "pointer.releaseKeys"
    ]
    supportedActions = [
        ...Object.keys(ACTIONS).map(a => `action.${a}`),
        ...Object.keys(POINTER).map(c => `pointer.${c}`),
        "Nop"
    ].filter(m => !unSupportedActions.includes(m))
    bindings = JSON.parse(JSON.stringify(defaultBindings))
    updateKeysOnScreen()
}

const keyNames = [
    {"js": ["<"], "vim": ["lt"]},
    {"js": ["Backspace"], "vim": ["BS"]},
    {"js": ["Enter"], "vim": ["CR", "NL", "Return", "Enter"]},
    {"js": ["|"], "vim": ["Bar"]},
    {"js": ["\\"], "vim": ["Bslash"]},
    {"js": ["ArrowLeft"], "vim": ["Left"]},
    {"js": ["ArrowRight"], "vim": ["Right"]},
    {"js": ["ArrowUp"], "vim": ["Up"]},
    {"js": ["ArrowDown"], "vim": ["Down"]},
    {"js": ["Escape"], "vim": ["Esc"]},
    {"js": [" "], "vim": ["Space", " "]},
    {"js": ["Delete"], "vim": ["Del"]},
    {"js": ["PrintScreen"], "vim": ["PrintScreen", "PrtScr"]},
    // Keys with the same names, which are listed here to detect incorrect names
    // Note: some of these are not present in Vim and use the JavaScript name
    {"js": ["F1"], "vim": ["F1"]},
    {"js": ["F2"], "vim": ["F2"]},
    {"js": ["F3"], "vim": ["F3"]},
    {"js": ["F4"], "vim": ["F4"]},
    {"js": ["F5"], "vim": ["F5"]},
    {"js": ["F6"], "vim": ["F6"]},
    {"js": ["F7"], "vim": ["F7"]},
    {"js": ["F8"], "vim": ["F8"]},
    {"js": ["F9"], "vim": ["F9"]},
    {"js": ["F10"], "vim": ["F10"]},
    {"js": ["F11"], "vim": ["F11"]},
    {"js": ["F12"], "vim": ["F12"]},
    {"js": ["Tab"], "vim": ["Tab"]},
    {"js": ["Insert"], "vim": ["Insert"]},
    {"js": ["Home"], "vim": ["Home"]},
    {"js": ["PageUp"], "vim": ["PageUp"]},
    {"js": ["End"], "vim": ["End"]},
    {"js": ["PageDown"], "vim": ["PageDown"]},
    {"js": ["Help"], "vim": ["Help"]},
    {"js": ["Pause"], "vim": ["Pause"]},
    {"js": ["NumLock"], "vim": ["NumLock"]},
    {"js": ["CapsLock"], "vim": ["CapsLock"]},
    {"js": ["ScrollLock"], "vim": ["ScrollLock"]}
]

const toIdentifier = e => {
    let keyCode = e.key
    keyNames.forEach(key => {
        if (key.js.includes(keyCode)) {
            keyCode = key.vim[0]
        }
    })
    // If the shift status can be detected by name or casing,
    // it will not be prefixed with 'S-'.
    if (e.shiftKey && keyCode.length > 1 && !["lt", "Bar"].includes(keyCode)) {
        keyCode = `S-${keyCode}`
    }
    if (e.altKey) {
        keyCode = `A-${keyCode}`
    }
    if (e.metaKey) {
        keyCode = `M-${keyCode}`
    }
    if (e.ctrlKey) {
        keyCode = `C-${keyCode}`
    }
    if (keyCode.length > 1) {
        keyCode = `<${keyCode}>`
    }
    return keyCode
}

const fromIdentifier = identifier => {
    let id = String(identifier) || ""
    id = id.split(mapStringSplitter).filter(m => m)[0] || id
    const options = {"modifiers": []}
    if (id.startsWith("<") && id.endsWith(">")) {
        id = id.slice(1, -1)
    }
    if (id.startsWith("C-")) {
        options.ctrlKey = true
        options.control = true
        options.modifiers.push("control")
        id = id.slice(2)
    }
    if (id.startsWith("M-")) {
        options.metaKey = true
        options.meta = true
        options.modifiers.push("super")
        id = id.slice(2)
    }
    if (id.startsWith("A-")) {
        options.altKey = true
        options.alt = true
        options.modifiers.push("alt")
        id = id.slice(2)
    }
    if (id.startsWith("S-")) {
        options.shiftKey = true
        options.shift = true
        options.modifiers.push("shift")
        id = id.slice(2)
    }
    const isLetter = id.toLowerCase() !== id.toUpperCase()
    const isUpper = id.toUpperCase() === id
    if (id.length === 1 && isLetter && isUpper) {
        options.shiftKey = true
        options.modifiers.push("shift")
    } else {
        keyNames.forEach(key => {
            if (key.vim.includes(id)) {
                id = key.js[0]
            }
        })
    }
    return {...options, "key": id, "keyCode": id}
}

// Single use actions that do not need to be called multiple times if counted
const uncountableActions = [
    "action.emptySearch",
    "action.increasePageNumber",
    "action.clickOnSearch",
    "action.toExploreMode",
    "action.startFollowCurrentTab",
    "action.scrollTop",
    "action.insertAtFirstInput",
    "action.toInsertMode",
    "action.reload",
    "action.decreasePageNumber",
    "action.toSearchMode",
    "action.startFollowNewTab",
    "action.scrollBottom",
    "action.openNewTabWithCurrentUrl",
    "action.toCommandMode",
    "action.stopLoadingPage",
    "action.zoomReset",
    "action.toNormalMode",
    "action.stopFollowMode",
    "action.editWithVim",
    "action.leftHalfSplitWindow",
    "action.bottomHalfSplitWindow",
    "action.topHalfSplitWindow",
    "action.rightHalfSplitWindow",
    "action.distrubuteSpaceSplitWindow",
    "action.pageToClipboard",
    "action.openFromClipboard",
    "action.toggleFullscreen",
    "action.useEnteredData",
    "pointer.start",
    "pointer.inspectElement",
    "pointer.copyAndStop",
    "pointer.startOfPage",
    "pointer.insertAtPosition",
    "pointer.centerOfView",
    "pointer.startOfView",
    "pointer.endOfView",
    "pointer.endOfPage",
    "pointer.moveRightMax",
    "pointer.moveLeftMax"
]


const hasFutureActionsBasedOnKeys = keys => Object.keys(bindings[
    MODES.currentMode()[0]]).find(map => map.startsWith(keys) && map !== keys)

const sendKeysToWebview = async (options, mapStr) => {
    blockNextInsertKey = true
    if (options.keyCode.length === 1) {
        TABS.currentPage().sendInputEvent({...options, "type": "char"})
    }
    TABS.currentPage().sendInputEvent({...options, "type": "keyDown"})
    if (options.bubbles) {
        const action = bindings[MODES.currentMode()[0]][mapStr]
        if (action) {
            await executeMapString(action.mapping, !action.noremap)
        }
    }
}

const executeMapString = async (mapStr, recursive, initial) => {
    if (initial) {
        recursiveCounter = 0
        if (!hasFutureActionsBasedOnKeys(pressedKeys)) {
            pressedKeys = ""
        }
    }
    recursiveCounter += 1
    const repeater = Number(repeatCounter) || 1
    repeatCounter = 0
    updateKeysOnScreen()
    for (let i = 0;i < repeater;i++) {
        if (recursiveCounter > SETTINGS.get("maxmapdepth")) {
            break
        }
        for (const key of mapStr.split(mapStringSplitter).filter(m => m)) {
            if (recursiveCounter > SETTINGS.get("maxmapdepth")) {
                break
            }
            const options = {...fromIdentifier(key), "bubbles": recursive}
            if (supportedActions.includes(key.replace(/(^<|>$)/g, ""))) {
                const count = Number(repeatCounter)
                repeatCounter = 0
                await doAction(key.replace(/(^<|>$)/g, ""), count)
            } else if (key.startsWith("<:")) {
                COMMAND.execute(key.replace(/^<:|>$/g, ""))
            } else if (key.match(/^(<(C-)?(M-)?(A-)?(S-)?.+>|.)$/g)) {
                if (MODES.currentMode() === "insert") {
                    await sendKeysToWebview(options, key)
                } else {
                    window.dispatchEvent(new KeyboardEvent("keydown", options))
                }
            }
            await new Promise(r => setTimeout(r, 2))
        }
    }
    if (initial) {
        setTimeout(() => {
            blockNextInsertKey = false
        }, 100)
        recursiveCounter = 0
        if (!hasFutureActionsBasedOnKeys(pressedKeys)) {
            repeatCounter = 0
            pressedKeys = ""
            updateKeysOnScreen()
        }
    }
}

const doAction = async (name, count) => {
    if (name === "Nop") {
        repeatCounter = 0
        updateKeysOnScreen()
        return
    }
    count = count || 1
    const pointer = name.toLowerCase().startsWith("pointer.")
    if (uncountableActions.includes(name)) {
        count = 1
    }
    name = name.replace(/^.*\./g, "")
    for (let i = 0;i < count;i++) {
        if (pointer) {
            await POINTER[name]()
        } else {
            await ACTIONS[name]()
        }
    }
    repeatCounter = 0
    updateKeysOnScreen()
}

const handleKeyboard = e => {
    if (document.body.classList.contains("fullscreen")) {
        MODES.setMode("insert")
        return
    }
    const ignoredKeys = [
        "Control", "Meta", "Alt", "Shift", "NumLock", "CapsLock", "ScrollLock"
    ]
    if (recursiveCounter > SETTINGS.get("maxmapdepth")) {
        e.preventDefault()
        return
    }
    if (e.passedOnFromInsert && blockNextInsertKey) {
        e.preventDefault()
        return
    }
    if (ignoredKeys.includes(e.key) || !e.key) {
        // Keys such as control should not be registered on their own
        e.preventDefault()
        return
    }
    const id = toIdentifier(e)
    updateKeysOnScreen()
    clearTimeout(timeoutTimer)
    if (SETTINGS.get("timeout")) {
        timeoutTimer = setTimeout(() => {
            repeatCounter = 0
            pressedKeys = ""
            updateKeysOnScreen()
        }, SETTINGS.get("timeoutlen"))
    }
    if (["normal", "pointer", "visual"].includes(MODES.currentMode())) {
        const keyNumber = Number(id)
        const noFutureActions = !hasFutureActionsBasedOnKeys(pressedKeys + id)
        if (!isNaN(keyNumber) && noFutureActions) {
            repeatCounter = Number(String(repeatCounter) + keyNumber)
            if (repeatCounter > SETTINGS.get("countlimit")) {
                repeatCounter = SETTINGS.get("countlimit")
            }
            updateKeysOnScreen()
            e.preventDefault()
            return
        }
        if (id === "<Esc>" || id === "<C-[>") {
            if (repeatCounter !== 0) {
                repeatCounter = 0
                updateKeysOnScreen()
                e.preventDefault()
                return
            }
        }
    } else {
        repeatCounter = 0
    }
    if (!hasFutureActionsBasedOnKeys(pressedKeys)) {
        pressedKeys = ""
    }
    pressedKeys += id
    const menuAction = bindings.m[pressedKeys]
    if (menuAction && CONTEXTMENU.active()) {
        e.preventDefault()
        if (e.isTrusted) {
            executeMapString(menuAction.mapping, !menuAction.noremap, true)
        } else {
            executeMapString(menuAction.mapping, e.bubbles)
        }
        repeatCounter = 0
        pressedKeys = ""
        return
    }
    CONTEXTMENU.clear()
    const action = bindings[MODES.currentMode()[0]][pressedKeys]
    if (action && (e.isTrusted || e.bubbles)) {
        e.preventDefault()
        if (e.isTrusted) {
            executeMapString(action.mapping, !action.noremap, true)
        } else {
            executeMapString(action.mapping, e.bubbles)
        }
        return
    }
    if (!hasFutureActionsBasedOnKeys(pressedKeys)) {
        repeatCounter = 0
        pressedKeys = ""
    }
    if (!e.isTrusted) {
        typeCharacterIntoNavbar(id)
    }
    updateKeysOnScreen()
    handleUserInput(e)
}

const typeCharacterIntoNavbar = id => {
    if (!"ces".includes(MODES.currentMode()[0])) {
        return
    }
    const url = document.getElementById("url")
    if (url.selectionEnd && url.selectionStart !== url.selectionEnd) {
        url.value = url.value.substr(0, url.selectionStart)
            + url.value.substr(url.selectionEnd)
    }
    if (id.length === 1) {
        url.value += id
    }
    if (id === "<lt>") {
        url.value += "<"
    }
    if (id === "<Bar>") {
        url.value += "|"
    }
    if (id === "<Bslash>") {
        url.value += "\\"
    }
    if (id === "<Space>") {
        url.value += " "
    }
}

const updateKeysOnScreen = () => {
    document.getElementById("repeat-counter").textContent = repeatCounter
    document.getElementById("pressed-keys").textContent = pressedKeys
    if (MODES.currentMode() === "insert") {
        ipcRenderer.send("insert-mode-blockers", Object.keys(bindings.i)
            .map(mapping => fromIdentifier(mapping.replace(pressedKeys, ""))))
    }
    if (repeatCounter && SETTINGS.get("showcmd")) {
        document.getElementById("repeat-counter").style.display = "flex"
    } else {
        document.getElementById("repeat-counter").style.display = "none"
    }
    if (pressedKeys && SETTINGS.get("showcmd")) {
        document.getElementById("pressed-keys").style.display = "flex"
    } else {
        document.getElementById("pressed-keys").style.display = "none"
    }
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
    let allowedUserInput = [
        "<C-a>",
        "<C-c>",
        "<C-x>",
        "<C-v>",
        "<C-y>",
        "<C-z>",
        "<C-BS>",
        "<C-Left>",
        "<C-Right>",
        "<C-S-Left>",
        "<C-S-Right>"
    ]
    if (process.platform === "darwin") {
        allowedUserInput = [
            "<M-a>",
            "<M-c>",
            "<M-x>",
            "<M-v>",
            "<M-z>",
            "<M-BS>",
            "<M-Left>",
            "<M-Right>",
            "<M-S-Left>",
            "<M-S-Right>",
            "<M-Z>",
            "<A-BS>",
            "<A-Left>",
            "<A-Right>",
            "<A-S-Left>",
            "<A-S-Right>"
        ]
    }
    const shiftOnly = id.startsWith("<S-")
    const allowedInput = allowedUserInput.includes(id)
    const hasModifier = id.match(/^<.*-.*>$/)
    if (!shiftOnly && !allowedInput && hasModifier || id === "Tab") {
        e.preventDefault()
    }
    ACTIONS.setFocusCorrectly()
}

const listSupportedActions = () => supportedActions

const mappingModified = (mode, mapping) => {
    const current = bindings[mode][mapping]
    const original = defaultBindings[mode][mapping]
    if (!current && !original) {
        return false
    }
    if (current && original) {
        if (current.mapping === original.mapping) {
            if (current.noremap === original.noremap) {
                return false
            }
        }
    }
    return true
}

const listMappingsAsCommandList = (oneMode = false, includeDefault = false) => {
    let mappings = []
    let modes = Object.keys(defaultBindings)
    if (oneMode) {
        modes = [oneMode]
    }
    modes.forEach(bindMode => {
        const keys = [...new Set(Object.keys(defaultBindings[bindMode])
            .concat(Object.keys(bindings[bindMode])))]
        for (const key of keys) {
            mappings.push(listMapping(bindMode, key, includeDefault))
        }
    })
    if (!oneMode) {
        // Mappings that can be added with a global "map" instead of 1 per mode
        const globalMappings = []
        mappings.filter(m => m.match(/^n(noremap|map|unmap) /g))
            .filter(m => !modes.find(mode => !mappings.includes(
                `${mode}${m.slice(1)}`)))
            .forEach(m => {
                globalMappings.push(m.slice(1))
                mappings = mappings.filter(map => map.slice(1) !== m.slice(1))
            })
        mappings = [...globalMappings, ...mappings]
    }
    return mappings.join("\n").replace(/[\r\n]+/g, "\n").trim()
}

const listMapping = (mode, key, includeDefault) => {
    key = sanitiseMapString(key)
    if (!mappingModified(mode, key) && !includeDefault) {
        return ""
    }
    const mapping = bindings[mode][key]
    if (mapping) {
        if (mapping.noremap) {
            return `${mode}noremap ${key} ${mapping.mapping}`
        }
        return `${mode}map ${key} ${mapping.mapping}`
    }
    if (defaultBindings[mode][key]) {
        return `${mode}unmap ${key}`
    }
    return ""
}

const mapOrList = (mode, args, noremap, includeDefault) => {
    if (includeDefault && args.length > 1) {
        UTIL.notify("Mappings are always overwritten, no need for !", "warn")
        return
    }
    if (args.length === 0) {
        const mappings = listMappingsAsCommandList(mode, includeDefault)
        if (mappings) {
            UTIL.notify(mappings)
        } else if (includeDefault) {
            UTIL.notify("No mappings found")
        } else {
            UTIL.notify("No custom mappings found")
        }
        return
    }
    if (args.length === 1) {
        if (mode) {
            const mapping = listMapping(mode, args[0], includeDefault).trim()
            if (mapping) {
                UTIL.notify(mapping)
            } else if (includeDefault) {
                UTIL.notify("No mapping found for this sequence")
            } else {
                UTIL.notify("No custom mapping found for this sequence")
            }
        } else {
            let mappings = ""
            Object.keys(bindings).forEach(m => {
                mappings += `${listMapping(m, args[0], includeDefault)}\n`
            })
            mappings = mappings.replace(/[\r\n]+/g, "\n").trim()
            if (mappings) {
                UTIL.notify(mappings)
            } else if (includeDefault) {
                UTIL.notify("No mapping found for this sequence")
            } else {
                UTIL.notify("No custom mapping found for this sequence")
            }
        }
        return
    }
    mapSingle(mode, args, noremap)
}

const sanitiseMapString = (mapString, allowSpecials = false) => mapString
    .split(/(<.*?[^-]>|<.*?->>|.)/g).filter(m => m).map(m => {
        if (m === ">") {
            return ">"
        }
        let key = m
        let modifiers = []
        if (m.length > 1) {
            const splitKeys = m.replace(/(^<|>$)/g, "")
                .split("-").filter(s => s)
            modifiers = splitKeys.slice(0, -1).map(mod => mod.toUpperCase())
            key = splitKeys.slice(-1)[0]
        }
        let knownKey = false
        for (const name of keyNames) {
            if (name.vim.find(vk => vk.toUpperCase() === key.toUpperCase())) {
                key = name.vim[0]
                knownKey = true
                break
            }
        }
        if (allowSpecials) {
            if (ACTIONS[key.replace(/^action\./gi, "")]) {
                knownKey = true
            }
            if (POINTER[key.replace(/^pointer\./gi, "")]) {
                knownKey = true
            }
            if (key.startsWith(":")) {
                knownKey = true
            }
            if (key.toLowerCase() === "nop") {
                knownKey = true
                key = "Nop"
            }
        }
        if (!knownKey && key.length > 1) {
            UTIL.notify(
                `Unsupported key in mapping which was skipped: ${key}`, "warn")
            return ""
        }
        if (!key) {
            return ""
        }
        let modString = ""
        if (key.toLowerCase() !== key.toUpperCase() && key.length === 1) {
            if (modifiers.includes("S") && key.toLowerCase() === key) {
                modifiers = modifiers.filter(mod => mod !== "S")
                key = key.toUpperCase()
            }
            if (modifiers.includes("S") && key.toLowerCase() !== key) {
                modifiers = modifiers.filter(mod => mod !== "S")
            }
        }
        for (const mod of ["C", "M", "A", "S"]) {
            if (modifiers.includes(mod)) {
                modString += `${mod}-`
            }
        }
        if (modString || key.length > 1) {
            return `<${modString}${key}>`
        }
        return key
    }).join("")

const mapSingle = (mode, args, noremap) => {
    const mapping = sanitiseMapString(args.shift())
    const actions = sanitiseMapString(args.join(" "), true)
    if (!actions) {
        return
    }
    if (mode) {
        bindings[mode][mapping] = {"mapping": actions, "noremap": noremap}
    } else {
        Object.keys(bindings).forEach(m => {
            bindings[m][mapping] = {"mapping": actions, "noremap": noremap}
        })
    }
    SETTINGS.updateHelpPage()
}

const unmap = (mode, args) => {
    if (args.length !== 1) {
        UTIL.notify(
            `The ${mode}unmap command requires exactly one mapping`, "warn")
        return
    }
    if (mode) {
        delete bindings[mode][sanitiseMapString(args[0])]
    } else {
        Object.keys(bindings).forEach(bindMode => {
            delete bindings[bindMode][sanitiseMapString(args[0])]
        })
    }
    SETTINGS.updateHelpPage()
}

const clearmap = (mode, removeDefaults) => {
    if (mode) {
        if (removeDefaults) {
            bindings[mode] = {}
        } else {
            bindings[mode] = JSON.parse(JSON.stringify(defaultBindings[mode]))
        }
    } else if (removeDefaults) {
        Object.keys(bindings).forEach(bindMode => {
            bindings[bindMode] = {}
        })
    } else {
        bindings = JSON.parse(JSON.stringify(defaultBindings))
    }
    SETTINGS.updateHelpPage()
}

module.exports = {
    init,
    executeMapString,
    doAction,
    handleKeyboard,
    listSupportedActions,
    listMappingsAsCommandList,
    mapOrList,
    unmap,
    clearmap
}
