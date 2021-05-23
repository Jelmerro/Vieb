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
"use strict"

const {notify, specialChars} = require("../util")
const {
    listTabs, currentTab, currentPage, currentMode, getSetting
} = require("./common")

const ACTIONS = require("./actions")
const POINTER = require("./pointer")

const defaultBindings = {
    "c": {
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<action.toNormalMode>"},
        "<C-m>": {"mapping": "<action.menuOpen>"},
        "<C-n>": {"mapping": "<action.commandHistoryNext>"},
        "<C-p>": {"mapping": "<action.commandHistoryPrevious>"},
        "<CR>": {"mapping": "<action.useEnteredData>"},
        "<Esc>": {"mapping": "<action.toNormalMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<S-Tab>": {"mapping": "<action.prevSuggestion>"},
        "<Tab>": {"mapping": "<action.nextSuggestion>"}
    },
    "e": {
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<action.toNormalMode>"},
        "<C-m>": {"mapping": "<action.menuOpen>"},
        "<C-n>": {"mapping": "<action.exploreHistoryNext>"},
        "<C-p>": {"mapping": "<action.exploreHistoryPrevious>"},
        "<CR>": {"mapping": "<action.useEnteredData>"},
        "<Esc>": {"mapping": "<action.toNormalMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<S-Tab>": {"mapping": "<action.prevSuggestion>"},
        "<Tab>": {"mapping": "<action.nextSuggestion>"}
    },
    "f": {
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<action.stopFollowMode>"},
        "<C-m>": {"mapping": "<action.menuOpen>"},
        "<Esc>": {"mapping": "<action.stopFollowMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<Tab>": {"mapping": "<action.reorderFollowLinks>"}
    },
    "i": {
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<action.toNormalMode>"},
        "<C-i>": {"mapping": "<action.editWithVim>"},
        "<C-m>": {"mapping": "<action.menuOpen>"},
        "<CapsLock>": {"mapping": "<Nop>"},
        "<Esc>": {"mapping": "<action.toNormalMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<NumLock>": {"mapping": "<Nop>"},
        "<ScrollLock>": {"mapping": "<Nop>"}
    },
    "m": {
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<action.menuClose>"},
        "<C-m>": {"mapping": "<action.menuOpen>"},
        "<C-n>": {"mapping": "<action.menuDown>"},
        "<C-p>": {"mapping": "<action.menuUp>"},
        "<CR>": {"mapping": "<action.menuSelect>"},
        "<CapsLock>": {"mapping": "<Nop>"},
        "<Down>": {"mapping": "<action.menuDown>"},
        "<Esc>": {"mapping": "<action.menuClose>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<NumLock>": {"mapping": "<Nop>"},
        "<ScrollLock>": {"mapping": "<Nop>"},
        "<Up>": {"mapping": "<action.menuUp>"}
    },
    "n": {
        "$": {"mapping": "<action.scrollPageRight>"},
        "+": {"mapping": "<action.zoomIn>"},
        "/": {"mapping": "<action.toSearchMode>"},
        ":": {"mapping": "<action.toCommandMode>"},
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-0>": {"mapping": "<action.zoomReset>"},
        "<C-a>": {"mapping": "<action.increasePageNumber>"},
        "<C-b>": {"mapping": "<action.scrollPageUp>"},
        "<C-c>": {"mapping": "<action.stopLoadingPage>"},
        "<C-d>": {"mapping": "<action.scrollPageDownHalf>"},
        "<C-f>": {"mapping": "<action.scrollPageDown>"},
        "<C-i>": {"mapping": "<action.forwardInHistory>"},
        "<C-j>": {"mapping": "<action.moveTabForward>"},
        "<C-k>": {"mapping": "<action.moveTabBackward>"},
        "<C-m>": {"mapping": "<action.menuOpen>"},
        "<C-o>": {"mapping": "<action.backInHistory>"},
        "<C-t>": {"mapping": "<:set tabnexttocurrent!>"
            + "<action.openNewTab><:set tabnexttocurrent!>"},
        "<C-u>": {"mapping": "<action.scrollPageUpHalf>"},
        "<C-w>+": {"mapping": "<action.increaseHeightSplitWindow>"},
        "<C-w><C-=>": {"mapping": "<action.distrubuteSpaceSplitWindow>"},
        "<C-w><C->>": {"mapping": "<action.increaseWidthSplitWindow>"},
        "<C-w><C-H>": {"mapping": "<action.leftHalfSplitWindow>"},
        "<C-w><C-J>": {"mapping": "<action.bottomHalfSplitWindow>"},
        "<C-w><C-K>": {"mapping": "<action.topHalfSplitWindow>"},
        "<C-w><C-L>": {"mapping": "<action.rightHalfSplitWindow>"},
        "<C-w><C-R>": {"mapping": "<action.rotateSplitWindowBackward>"},
        "<C-w><C-W>": {"mapping": "<action.toPreviousSplitWindow>"},
        "<C-w><C-b>": {"mapping": "<action.toLastSplitWindow>"},
        "<C-w><C-c>": {"mapping": "<:close>"},
        "<C-w><C-h>": {"mapping": "<action.toLeftSplitWindow>"},
        "<C-w><C-j>": {"mapping": "<action.toBottomSplitWindow>"},
        "<C-w><C-k>": {"mapping": "<action.toTopSplitWindow>"},
        "<C-w><C-l>": {"mapping": "<action.toRightSplitWindow>"},
        "<C-w><C-lt>": {"mapping": "<action.decreaseWidthSplitWindow>"},
        "<C-w><C-n>": {"mapping": "<:split>"},
        "<C-w><C-o>": {"mapping": "<:only>"},
        "<C-w><C-p>": {"mapping": "<action.toLastUsedTab>"},
        "<C-w><C-q>": {"mapping": "<:quit>"},
        "<C-w><C-r>": {"mapping": "<action.rotateSplitWindowForward>"},
        "<C-w><C-s>": {"mapping": "<:split>"},
        "<C-w><C-t>": {"mapping": "<action.toFirstSplitWindow>"},
        "<C-w><C-v>": {"mapping": "<:vsplit>"},
        "<C-w><C-w>": {"mapping": "<action.toNextSplitWindow>"},
        "<C-w><C-x>": {"mapping": "<action.exchangeSplitWindow>"},
        "<C-w><lt>": {"mapping": "<action.decreaseWidthSplitWindow>"},
        "<C-w>=": {"mapping": "<action.distrubuteSpaceSplitWindow>"},
        "<C-w>>": {"mapping": "<action.increaseWidthSplitWindow>"},
        "<C-w>-": {"mapping": "<action.decreaseHeightSplitWindow>"},
        "<C-w>H": {"mapping": "<action.leftHalfSplitWindow>"},
        "<C-w>J": {"mapping": "<action.bottomHalfSplitWindow>"},
        "<C-w>K": {"mapping": "<action.topHalfSplitWindow>"},
        "<C-w>L": {"mapping": "<action.rightHalfSplitWindow>"},
        "<C-w>R": {"mapping": "<action.rotateSplitWindowBackward>"},
        "<C-w>W": {"mapping": "<action.toPreviousSplitWindow>"},
        "<C-w>b": {"mapping": "<action.toLastSplitWindow>"},
        "<C-w>c": {"mapping": "<:close>"},
        "<C-w>h": {"mapping": "<action.toLeftSplitWindow>"},
        "<C-w>j": {"mapping": "<action.toBottomSplitWindow>"},
        "<C-w>k": {"mapping": "<action.toTopSplitWindow>"},
        "<C-w>l": {"mapping": "<action.toRightSplitWindow>"},
        "<C-w>n": {"mapping": "<:split>"},
        "<C-w>o": {"mapping": "<:only>"},
        "<C-w>p": {"mapping": "<action.toLastUsedTab>"},
        "<C-w>q": {"mapping": "<:quit>"},
        "<C-w>r": {"mapping": "<action.rotateSplitWindowForward>"},
        "<C-w>s": {"mapping": "<:split>"},
        "<C-w>t": {"mapping": "<action.toFirstSplitWindow>"},
        "<C-w>v": {"mapping": "<:vsplit>"},
        "<C-w>w": {"mapping": "<action.toNextSplitWindow>"},
        "<C-w>x": {"mapping": "<action.exchangeSplitWindow>"},
        "<C-x>": {"mapping": "<action.decreasePageNumber>"},
        "<CR>": {"mapping": "<action.clickOnSearch>"},
        "<CapsLock>": {"mapping": "<Nop>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<NumLock>": {"mapping": "<Nop>"},
        "<ScrollLock>": {"mapping": "<Nop>"},
        "<Tab>": {"mapping": "<Nop>"},
        "=": {"mapping": "<action.zoomIn>"},
        "^": {"mapping": "<action.scrollPageLeft>"},
        "_": {"mapping": "<action.zoomOut>"},
        "-": {"mapping": "<action.zoomOut>"},
        "D": {"mapping": "<action.downloadLink>"},
        "F": {"mapping": "<action.startFollowNewTab>"},
        "G": {"mapping": "<action.scrollBottom>"},
        "H": {"mapping": "<action.backInHistory>"},
        "J": {"mapping": "<action.nextTab>"},
        "K": {"mapping": "<action.previousTab>"},
        "L": {"mapping": "<action.forwardInHistory>"},
        "N": {"mapping": "<action.previousSearchMatch>"},
        "P": {"mapping": "<action.openNewTab><action.openFromClipboard>"},
        "R": {"mapping": "<action.reloadWithoutCache>"},
        "T": {"mapping": "<action.openNewTabWithCurrentUrl>"},
        "ZZ": {"mapping": "<:quit>"},
        "b": {"mapping": "<action.previousTab>"},
        "c": {"mapping": "<pointer.start>"},
        "d": {"mapping": "<:close>"},
        "e": {"mapping": "<action.toExploreMode>"},
        "f": {"mapping": "<action.startFollowCurrentTab>"},
        "gT": {"mapping": "<action.previousTab>"},
        "gg": {"mapping": "<action.scrollTop>"},
        "gi": {"mapping": "<action.insertAtFirstInput>"},
        "gt": {"mapping": "<action.nextTab>"},
        "h": {"mapping": "<action.scrollLeft>"},
        "i": {"mapping": "<action.toInsertMode>"},
        "j": {"mapping": "<action.scrollDown>"},
        "k": {"mapping": "<action.scrollUp>"},
        "l": {"mapping": "<action.scrollRight>"},
        "n": {"mapping": "<action.nextSearchMatch>"},
        "p": {"mapping": "<action.openFromClipboard>"},
        "r": {"mapping": "<action.reload>"},
        "t": {"mapping": "<action.openNewTab>"},
        "u": {"mapping": "<action.reopenTab>"},
        "v": {"mapping": "<pointer.start>"},
        "w": {"mapping": "<action.nextTab>"},
        "x": {"mapping": "<action.openLinkExternal>"},
        "y": {"mapping": "<action.pageToClipboard>"}
    },
    "p": {
        "$": {"mapping": "<pointer.moveRightMax>"},
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<action.toNormalMode>"},
        "<C-d>": {"mapping": "<pointer.moveFastDown>"},
        "<C-h>": {"mapping": "<pointer.moveSlowLeft>"},
        "<C-j>": {"mapping": "<pointer.moveSlowDown>"},
        "<C-k>": {"mapping": "<pointer.moveSlowUp>"},
        "<C-l>": {"mapping": "<pointer.moveSlowRight>"},
        "<C-m>": {"mapping": "<action.menuOpen>"},
        "<C-u>": {"mapping": "<pointer.moveFastUp>"},
        "<CR>": {"mapping": "<pointer.leftClick>"},
        "<CapsLock>": {"mapping": "<Nop>"},
        "<Esc>": {"mapping": "<action.toNormalMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<NumLock>": {"mapping": "<Nop>"},
        "<S-CR>": {"mapping": "<pointer.newtabLink>"},
        "<ScrollLock>": {"mapping": "<Nop>"},
        "<lt>": {"mapping": "<pointer.scrollLeft>"},
        ">": {"mapping": "<pointer.scrollRight>"},
        "[": {"mapping": "<pointer.scrollUp>"},
        "]": {"mapping": "<pointer.scrollDown>"},
        "^": {"mapping": "<pointer.moveLeftMax>"},
        "D": {"mapping": "<pointer.downloadLink>"},
        "G": {"mapping": "<pointer.endOfPage>"},
        "H": {"mapping": "<pointer.startOfView>"},
        "J": {"mapping": "<pointer.scrollDown>"},
        "K": {"mapping": "<pointer.scrollUp>"},
        "L": {"mapping": "<pointer.endOfView>"},
        "M": {"mapping": "<pointer.centerOfView>"},
        "b": {"mapping": "<pointer.moveFastLeft>"},
        "da": {"mapping": "<pointer.downloadAudio>"},
        "dd": {"mapping": "<pointer.downloadLink>"},
        "df": {"mapping": "<pointer.downloadFrame>"},
        "di": {"mapping": "<pointer.downloadImage>"},
        "dl": {"mapping": "<pointer.downloadLink>"},
        "dv": {"mapping": "<pointer.downloadVideo>"},
        "e": {"mapping": "<pointer.inspectElement>"},
        "f": {"mapping": "<action.startFollowCurrentTab>"},
        "gg": {"mapping": "<pointer.startOfPage>"},
        "h": {"mapping": "<pointer.moveLeft>"},
        "i": {"mapping": "<pointer.insertAtPosition>"},
        "j": {"mapping": "<pointer.moveDown>"},
        "k": {"mapping": "<pointer.moveUp>"},
        "l": {"mapping": "<pointer.moveRight>"},
        "na": {"mapping": "<pointer.newtabAudio>"},
        "nf": {"mapping": "<pointer.newtabFrame>"},
        "ni": {"mapping": "<pointer.newtabImage>"},
        "nl": {"mapping": "<pointer.newtabLink>"},
        "nn": {"mapping": "<pointer.newtabLink>"},
        "nv": {"mapping": "<pointer.newtabVideo>"},
        "oa": {"mapping": "<pointer.openAudio>"},
        "of": {"mapping": "<pointer.openFrame>"},
        "oi": {"mapping": "<pointer.openImage>"},
        "ol": {"mapping": "<pointer.openLink>"},
        "oo": {"mapping": "<pointer.openLink>"},
        "ov": {"mapping": "<pointer.openVideo>"},
        "r": {"mapping": "<pointer.rightClick>"},
        "v": {"mapping": "<pointer.startVisualSelect>"},
        "w": {"mapping": "<pointer.moveFastRight>"},
        "xa": {"mapping": "<pointer.externalAudio>"},
        "xf": {"mapping": "<pointer.externalFrame>"},
        "xi": {"mapping": "<pointer.externalImage>"},
        "xl": {"mapping": "<pointer.externalLink>"},
        "xv": {"mapping": "<pointer.externalVideo>"},
        "xx": {"mapping": "<pointer.externalLink>"},
        "yI": {"mapping": "<pointer.copyImageBuffer>"},
        "ya": {"mapping": "<pointer.copyAudio>"},
        "yf": {"mapping": "<pointer.copyFrame>"},
        "yi": {"mapping": "<pointer.copyImage>"},
        "yl": {"mapping": "<pointer.copyLink>"},
        "yv": {"mapping": "<pointer.copyVideo>"},
        "yy": {"mapping": "<pointer.copyLink>"}
    },
    "s": {
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<action.toNormalMode>"},
        "<C-m>": {"mapping": "<action.menuOpen>"},
        "<CR>": {"mapping": "<action.useEnteredData>"},
        "<Esc>": {"mapping": "<action.toNormalMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"}
    },
    "v": {
        "$": {"mapping": "<pointer.moveRightMax>"},
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<action.toNormalMode>"},
        "<C-d>": {"mapping": "<pointer.moveFastDown>"},
        "<C-h>": {"mapping": "<pointer.moveSlowLeft>"},
        "<C-j>": {"mapping": "<pointer.moveSlowDown>"},
        "<C-k>": {"mapping": "<pointer.moveSlowUp>"},
        "<C-l>": {"mapping": "<pointer.moveSlowRight>"},
        "<C-m>": {"mapping": "<action.menuOpen>"},
        "<C-u>": {"mapping": "<pointer.moveFastUp>"},
        "<CapsLock>": {"mapping": "<Nop>"},
        "<Esc>": {"mapping": "<action.toNormalMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F11>": {"mapping": "<action.toggleFullscreen>"},
        "<NumLock>": {"mapping": "<Nop>"},
        "<ScrollLock>": {"mapping": "<Nop>"},
        "<lt>": {"mapping": "<pointer.scrollLeft>"},
        ">": {"mapping": "<pointer.scrollRight>"},
        "[": {"mapping": "<pointer.scrollUp>"},
        "]": {"mapping": "<pointer.scrollDown>"},
        "^": {"mapping": "<pointer.moveLeftMax>"},
        "G": {"mapping": "<pointer.endOfPage>"},
        "H": {"mapping": "<pointer.startOfView>"},
        "J": {"mapping": "<pointer.scrollDown>"},
        "K": {"mapping": "<pointer.scrollUp>"},
        "L": {"mapping": "<pointer.endOfView>"},
        "M": {"mapping": "<pointer.centerOfView>"},
        "b": {"mapping": "<pointer.moveFastLeft>"},
        "c": {"mapping": "<pointer.copyText><action.toNormalMode>"},
        "f": {"mapping": "<action.startFollowCurrentTab>"},
        "gg": {"mapping": "<pointer.startOfPage>"},
        "h": {"mapping": "<pointer.moveLeft>"},
        "j": {"mapping": "<pointer.moveDown>"},
        "k": {"mapping": "<pointer.moveUp>"},
        "l": {"mapping": "<pointer.moveRight>"},
        "o": {"mapping": "<pointer.swapPosition>"},
        "r": {"mapping": "<pointer.rightClick>"},
        "w": {"mapping": "<pointer.moveFastRight>"},
        "x": {"mapping": "<action.openLinkExternal>"},
        "y": {"mapping": "<pointer.copyText><action.toNormalMode>"}
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
let inputHistoryList = [{"index": 0, "value": ""}]
let inputHistoryIndex = 0

const init = () => {
    window.addEventListener("keydown", handleKeyboard)
    window.addEventListener("keypress", e => e.preventDefault())
    window.addEventListener("keyup", e => e.preventDefault())
    window.addEventListener("mousedown", e => {
        if (e.button === 1) {
            e.preventDefault()
        }
    })
    window.addEventListener("mouseup", e => {
        if (e.button === 1) {
            if (getSetting("mouse")) {
                if (e.target === document.getElementById("url")) {
                    ACTIONS.toExploreMode()
                    return
                }
                const tab = e.path.find(el => listTabs().includes(el))
                if (tab) {
                    const {closeTab} = require("./tabs")
                    closeTab(listTabs().indexOf(tab))
                }
                const {clear} = require("./contextmenu")
                clear()
            }
            e.preventDefault()
        }
    })
    window.addEventListener("click", e => {
        if (e.path.find(el => el.matches?.("#context-menu"))) {
            return
        }
        const {clear} = require("./contextmenu")
        clear()
        if (e.target.classList.contains("no-focus-reset")) {
            return
        }
        if (getSetting("mouse")) {
            if (e.target === document.getElementById("url")) {
                if (!"sec".includes(currentMode()[0])) {
                    ACTIONS.toExploreMode()
                }
            } else if ("sec".includes(currentMode()[0])) {
                ACTIONS.toNormalMode()
            }
            const tab = e.path.find(el => listTabs().includes(el))
            if (tab) {
                clear()
                const {switchToTab} = require("./tabs")
                switchToTab(tab)
            }
        } else {
            e.preventDefault()
        }
        ACTIONS.setFocusCorrectly()
    })
    window.addEventListener("mousemove", e => {
        if (getSetting("mouse") && getSetting("mousefocus")) {
            document.elementsFromPoint(e.x, e.y).forEach(el => {
                if (el.matches("#pagelayout *[link-id], #tabs *[link-id]")) {
                    const tab = listTabs().find(t => t.getAttribute(
                        "link-id") === el.getAttribute("link-id"))
                    if (tab && currentTab() !== tab) {
                        const {switchToTab} = require("./tabs")
                        switchToTab(tab)
                    }
                }
            })
        }
    })
    window.addEventListener("contextmenu", e => {
        e.preventDefault()
        if (getSetting("mouse")) {
            const {viebMenu} = require("./contextmenu")
            viebMenu(e)
        } else {
            ACTIONS.setFocusCorrectly()
        }
    })
    window.addEventListener("resize", () => {
        const {clear} = require("./contextmenu")
        clear()
        const {applyLayout} = require("./pagelayout")
        applyLayout()
        if (["pointer", "visual"].includes(currentMode())) {
            POINTER.updateElement()
        }
    })
    const {ipcRenderer} = require("electron")
    ipcRenderer.on("insert-mode-input-event", (_, input) => {
        if (input.code === "Tab") {
            currentPage().focus()
        }
        // Check if fullscreen should be disabled
        const noMods = !input.shift && !input.meta && !input.alt
        const ctrl = input.control
        const escapeKey = input.code === "Escape" && noMods && !ctrl
        const ctrlBrack = input.code === "BracketLeft" && noMods && ctrl
        if (escapeKey || ctrlBrack) {
            if (document.body.classList.contains("fullscreen")) {
                currentPage().send("action", "exitFullscreen")
                return
            }
        }
        if (currentMode() !== "insert") {
            return
        }
        if (input.type.toLowerCase() !== "keydown") {
            return
        }
        handleKeyboard({
            "altKey": input.alt,
            "ctrlKey": input.control,
            "isTrusted": true,
            "key": input.key,
            "metaKey": input.meta,
            "passedOnFromInsert": true,
            "preventDefault": () => undefined,
            "shiftKey": input.shift
        })
    })
    ipcRenderer.on("window-close", () => executeMapString("<A-F4>", true, true))
    ipcRenderer.on("app-command", (_, cmd) => {
        if (getSetting("mouse")) {
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
            [keyCode] = key.vim
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
                [id] = key.js
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
    "action.reloadWithoutCache",
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
    "action.toFirstSplitWindow",
    "action.toLastSplitWindow",
    "action.distrubuteSpaceSplitWindow",
    "action.pageToClipboard",
    "action.openFromClipboard",
    "action.openLinkExternal",
    "action.downloadLink",
    "action.toggleFullscreen",
    "action.menuOpen",
    "action.menuSelect",
    "action.menuClose",
    "action.useEnteredData",
    "pointer.start",
    "pointer.startVisualSelect",
    "pointer.inspectElement",
    "pointer.startOfPage",
    "pointer.insertAtPosition",
    "pointer.centerOfView",
    "pointer.startOfView",
    "pointer.endOfView",
    "pointer.endOfPage",
    "pointer.moveRightMax",
    "pointer.moveLeftMax",
    "pointer.openAudio",
    "pointer.openFrame",
    "pointer.openImage",
    "pointer.openVideo",
    "pointer.openLink",
    "pointer.downloadAudio",
    "pointer.downloadFrame",
    "pointer.downloadImage",
    "pointer.downloadVideo",
    "pointer.downloadLink",
    "pointer.newtabAudio",
    "pointer.newtabFrame",
    "pointer.newtabImage",
    "pointer.newtabVideo",
    "pointer.newtabLink",
    "pointer.externalAudio",
    "pointer.externalFrame",
    "pointer.externalImage",
    "pointer.externalVideo",
    "pointer.externalLink",
    "pointer.copyImageBuffer",
    "pointer.copyAudio",
    "pointer.copyFrame",
    "pointer.copyImage",
    "pointer.copyVideo",
    "pointer.copyText",
    "pointer.copyLink",
    "Nop"
]


const hasFutureActionsBasedOnKeys = keys => Object.keys(bindings[
    currentMode()[0]]).find(map => map.startsWith(keys) && map !== keys)

const sendKeysToWebview = async(options, mapStr) => {
    blockNextInsertKey = true
    if (options.keyCode.length === 1) {
        currentPage().sendInputEvent({...options, "type": "char"})
    }
    currentPage().sendInputEvent({...options, "type": "keyDown"})
    if (options.bubbles) {
        const action = bindings[currentMode()[0]][mapStr]
        if (action) {
            await executeMapString(action.mapping, !action.noremap)
        }
    }
    await new Promise(r => {
        setTimeout(r, 3)
    })
}

const executeMapString = async(mapStr, recursive, initial) => {
    if (initial) {
        recursiveCounter = 0
        if (!hasFutureActionsBasedOnKeys(pressedKeys)) {
            pressedKeys = ""
        }
    }
    if (mapStr === "<Nop>") {
        updateKeysOnScreen()
        return
    }
    recursiveCounter += 1
    const repeater = Number(repeatCounter) || 1
    repeatCounter = 0
    updateKeysOnScreen()
    for (let i = 0; i < repeater; i++) {
        if (recursiveCounter > getSetting("maxmapdepth")) {
            break
        }
        for (const key of mapStr.split(mapStringSplitter).filter(m => m)) {
            if (recursiveCounter > getSetting("maxmapdepth")) {
                break
            }
            const options = {...fromIdentifier(key), "bubbles": recursive}
            if (supportedActions.includes(key.replace(/(^<|>$)/g, ""))) {
                const count = Number(repeatCounter)
                repeatCounter = 0
                await doAction(key.replace(/(^<|>$)/g, ""), count)
            } else if (key.startsWith("<:")) {
                const {execute} = require("./command")
                execute(key.replace(/^<:|>$/g, ""))
            } else if (key.match(/^(<(C-)?(M-)?(A-)?(S-)?.+>|.)$/g)) {
                if (currentMode() === "insert") {
                    await sendKeysToWebview(options, key)
                } else {
                    window.dispatchEvent(new KeyboardEvent("keydown", options))
                }
            }
            await new Promise(r => {
                setTimeout(r, 3)
            })
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

const doAction = async(actionName, givenCount) => {
    if (actionName === "Nop") {
        updateKeysOnScreen()
        return
    }
    let actionCount = givenCount || 1
    const pointer = actionName.toLowerCase().startsWith("pointer.")
    if (uncountableActions.includes(actionName)) {
        actionCount = 1
    }
    const funcName = actionName.replace(/^.*\./g, "")
    for (let i = 0; i < actionCount; i++) {
        if (pointer) {
            await POINTER[funcName]()
        } else {
            await ACTIONS[funcName]()
        }
    }
    if (!funcName.startsWith("menu")) {
        const {clear} = require("./contextmenu")
        clear()
    }
    repeatCounter = 0
    updateKeysOnScreen()
}

const handleKeyboard = async e => {
    e.preventDefault()
    if (document.body.classList.contains("fullscreen")) {
        ACTIONS.toInsertMode()
        return
    }
    if (recursiveCounter > getSetting("maxmapdepth")) {
        return
    }
    if (e.passedOnFromInsert && blockNextInsertKey) {
        return
    }
    const ignoredKeys = ["Control", "Meta", "Alt", "Shift"]
    if (ignoredKeys.includes(e.key) || !e.key) {
        return
    }
    const id = toIdentifier(e)
    updateKeysOnScreen()
    clearTimeout(timeoutTimer)
    if (getSetting("timeout")) {
        timeoutTimer = setTimeout(async() => {
            const keys = pressedKeys.split(mapStringSplitter).filter(m => m)
            if (currentMode() === "insert") {
                const {ipcRenderer} = require("electron")
                ipcRenderer.sendSync("insert-mode-blockers", "pass")
                // The first event is ignored, so we send a dummy event
                await sendKeysToWebview(fromIdentifier(""), "")
                for (const key of keys) {
                    const options = {...fromIdentifier(key), "bubbles": false}
                    await sendKeysToWebview(options, key)
                }
                blockNextInsertKey = false
                repeatCounter = 0
                pressedKeys = ""
                updateKeysOnScreen()
                return
            }
            for (const key of keys) {
                typeCharacterIntoNavbar(key)
                await new Promise(r => {
                    setTimeout(r, 3)
                })
            }
            repeatCounter = 0
            pressedKeys = ""
            updateKeysOnScreen()
        }, getSetting("timeoutlen"))
    }
    const {"active": menuActive, "clear": menuClear} = require("./contextmenu")
    if ("npv".includes(currentMode()[0]) || menuActive()) {
        const keyNumber = Number(id)
        const noFutureActions = !hasFutureActionsBasedOnKeys(pressedKeys + id)
        const currentAction = bindings[currentMode()[0]][pressedKeys + id]
        if (!isNaN(keyNumber) && noFutureActions && !currentAction) {
            repeatCounter = Number(String(repeatCounter) + keyNumber)
            if (repeatCounter > getSetting("countlimit")) {
                repeatCounter = getSetting("countlimit")
            }
            updateKeysOnScreen()
            return
        }
        if (id === "<Esc>" || id === "<C-[>") {
            if (repeatCounter !== 0) {
                repeatCounter = 0
                updateKeysOnScreen()
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
    if (menuAction && menuActive()) {
        if (e.isTrusted) {
            executeMapString(menuAction.mapping, !menuAction.noremap, true)
        } else {
            executeMapString(menuAction.mapping, e.bubbles)
        }
        return
    }
    if (!hasFutureActionsBasedOnKeys(pressedKeys) || !e.isTrusted) {
        clearTimeout(timeoutTimer)
        const action = bindings[currentMode()[0]][pressedKeys]
        if (action && (e.isTrusted || e.bubbles)) {
            if (e.isTrusted) {
                executeMapString(action.mapping, !action.noremap, true)
            } else {
                executeMapString(action.mapping, e.bubbles)
            }
            return
        }
        menuClear()
        let keys = pressedKeys.split(mapStringSplitter).filter(m => m)
        if (keys.length > 1) {
            if (!hasFutureActionsBasedOnKeys(keys.slice(0, -1).join(""))) {
                keys = keys.slice(0, -1)
            }
            if (currentMode() === "insert") {
                const {ipcRenderer} = require("electron")
                ipcRenderer.sendSync("insert-mode-blockers", "pass")
                // The first event is ignored, so we send a dummy event
                await sendKeysToWebview(fromIdentifier(""), "")
                for (const key of keys) {
                    const options = {...fromIdentifier(key), "bubbles": false}
                    await sendKeysToWebview(options, key)
                }
                blockNextInsertKey = false
                repeatCounter = 0
                pressedKeys = ""
                updateKeysOnScreen()
                return
            }
        }
        for (const key of keys) {
            typeCharacterIntoNavbar(key)
            await new Promise(r => {
                setTimeout(r, 3)
            })
        }
        repeatCounter = 0
        pressedKeys = ""
    }
    menuClear()
    updateKeysOnScreen()
    if (currentMode() === "follow") {
        if (e.type === "keydown") {
            const {enterKey} = require("./follow")
            enterKey(id)
        }
        return
    }
    ACTIONS.setFocusCorrectly()
}

const keyForOs = (regular, mac, key) => regular.includes(key)
    || process.platform === "darwin" && mac.includes(key)

const updateNavbarScrolling = () => {
    const url = document.getElementById("url")
    const charWidth = getSetting("fontsize") * 0.60191
    const end = url.selectionStart * charWidth - charWidth
    const start = url.selectionEnd * charWidth - url.clientWidth + charWidth + 2
    if (url.scrollLeft < end && url.scrollLeft > start) {
        return
    }
    if (url.selectionStart === url.selectionEnd) {
        if (url.scrollLeft > start) {
            url.scrollLeft = end
        } else if (url.scrollLeft < end) {
            url.scrollLeft = start
        }
    } else if (url.selectionDirection === "backward") {
        url.scrollLeft = end
    } else {
        url.scrollLeft = start
    }
}

const typeCharacterIntoNavbar = id => {
    if (!"ces".includes(currentMode()[0])) {
        return
    }
    const url = document.getElementById("url")
    if (keyForOs(["<S-Home>", "<C-S-Home>"], ["<M-S-Left>", "<M-S-Up>"], id)) {
        if (url.selectionDirection !== "backward") {
            url.selectionEnd = url.selectionStart
        }
        url.setSelectionRange(0, url.selectionEnd, "backward")
        updateNavbarScrolling()
        return
    }
    if (keyForOs(["<Home>", "<C-Home>"], ["<M-Left>", "<M-Up>"], id)) {
        url.setSelectionRange(0, 0)
        updateNavbarScrolling()
        return
    }
    if (keyForOs(["<S-End>", "<C-S-End>"], ["<M-S-Right>", "<M-S-Down>"], id)) {
        if (url.selectionDirection === "backward") {
            url.selectionStart = url.selectionEnd
        }
        url.setSelectionRange(url.selectionStart, url.value.length)
        updateNavbarScrolling()
        return
    }
    if (keyForOs(["<End>", "<C-End>"], ["<M-Right>", "<M-Down>"], id)) {
        url.setSelectionRange(url.value.length, url.value.length)
        updateNavbarScrolling()
        return
    }
    if (id === "<Right>") {
        if (url.selectionDirection === "backward") {
            url.selectionEnd = url.selectionStart
        } else {
            url.selectionStart = url.selectionEnd
        }
        if (url.selectionEnd < url.value.length) {
            url.selectionEnd += 1
        }
        url.selectionStart = url.selectionEnd
        updateNavbarScrolling()
        return
    }
    if (id === "<S-Right>") {
        if (url.selectionStart === url.selectionEnd) {
            url.setSelectionRange(url.selectionStart, url.selectionEnd + 1)
        } else if (url.selectionDirection !== "backward") {
            if (url.selectionEnd < url.value.length) {
                url.selectionEnd += 1
            }
        } else if (url.selectionStart < url.value.length) {
            url.selectionStart += 1
        }
        updateNavbarScrolling()
        return
    }
    const wordRegex = specialChars.source.replace("[", "[^")
    const words = url.value.split(new RegExp(`(${
        wordRegex}+|${specialChars.source}+)`, "g")).filter(w => w)
    let index = Number(url.selectionStart)
    if (url.selectionDirection !== "backward") {
        index = Number(url.selectionEnd)
    }
    if (keyForOs(["<C-Right>"], ["<A-Right>"], id)) {
        let wordPosition = 0
        for (const word of words) {
            wordPosition += word.length
            if (wordPosition > index) {
                url.setSelectionRange(wordPosition, wordPosition)
                break
            }
        }
        updateNavbarScrolling()
        return
    }
    if (keyForOs(["<C-S-Right>"], ["<A-S-Right>"], id)) {
        let wordPosition = 0
        for (const word of words) {
            wordPosition += word.length
            if (wordPosition > index) {
                if (url.selectionStart === url.selectionEnd) {
                    url.setSelectionRange(url.selectionStart, wordPosition)
                } else if (url.selectionDirection === "backward") {
                    url.setSelectionRange(wordPosition,
                        url.selectionEnd, "backward")
                } else {
                    url.setSelectionRange(url.selectionStart, wordPosition)
                }
                updateNavbarScrolling()
                return
            }
        }
        return
    }
    if (id === "<Left>") {
        if (url.selectionDirection === "backward") {
            url.selectionEnd = url.selectionStart
        } else {
            url.selectionStart = url.selectionEnd
        }
        if (url.selectionStart > 0) {
            url.selectionStart -= 1
        }
        url.selectionEnd = url.selectionStart
        updateNavbarScrolling()
        return
    }
    if (id === "<S-Left>") {
        if (url.selectionStart === url.selectionEnd) {
            url.setSelectionRange(url.selectionStart - 1,
                url.selectionEnd, "backward")
        } else if (url.selectionDirection === "backward") {
            if (url.selectionStart > 0) {
                url.selectionStart -= 1
            }
        } else if (url.selectionEnd > 0) {
            url.selectionEnd -= 1
        }
        updateNavbarScrolling()
        return
    }
    if (keyForOs(["<C-Left>"], ["<A-Left>"], id)) {
        let wordPosition = url.value.length
        for (const word of words.slice().reverse()) {
            wordPosition -= word.length
            if (wordPosition < index) {
                url.setSelectionRange(wordPosition, wordPosition)
                break
            }
        }
        updateNavbarScrolling()
        return
    }
    if (keyForOs(["<C-S-Left>"], ["<A-S-Left>"], id)) {
        let wordPosition = url.value.length
        for (const word of words.slice().reverse()) {
            wordPosition -= word.length
            if (wordPosition < index) {
                if (url.selectionStart === url.selectionEnd) {
                    url.setSelectionRange(wordPosition,
                        url.selectionEnd, "backward")
                } else if (url.selectionDirection === "backward") {
                    url.setSelectionRange(wordPosition,
                        url.selectionEnd, "backward")
                } else {
                    if (wordPosition < url.selectionStart) {
                        url.setSelectionRange(url.selectionStart,
                            url.selectionStart)
                        return
                    }
                    url.setSelectionRange(url.selectionStart, wordPosition)
                }
                updateNavbarScrolling()
                return
            }
        }
        return
    }
    if (keyForOs(["<C-a>"], ["<M-a>"], id)) {
        url.setSelectionRange(0, url.value.length)
        updateNavbarScrolling()
        return
    }
    if (keyForOs(["<C-x>"], ["<M-x>"], id)) {
        document.execCommand("cut")
        updateSuggestions()
        updateNavbarScrolling()
        return
    }
    if (keyForOs(["<C-c>"], ["<M-c>"], id)) {
        document.execCommand("copy")
        return
    }
    if (keyForOs(["<C-v>"], ["<M-v>"], id)) {
        document.execCommand("paste")
        updateSuggestions()
        updateNavbarScrolling()
        return
    }
    if (keyForOs(["<C-z>"], ["<M-z>"], id)) {
        if (inputHistoryIndex > 0) {
            inputHistoryIndex -= 1
            const histEntry = inputHistoryList[inputHistoryIndex]
            url.value = histEntry.value
            url.setSelectionRange(histEntry.index, histEntry.index)
            updateSuggestions(false)
        }
        updateNavbarScrolling()
        return
    }
    if (keyForOs(["<C-y>"], ["<M-Z>"], id)) {
        if (inputHistoryIndex < inputHistoryList.length - 1) {
            inputHistoryIndex += 1
            const histEntry = inputHistoryList[inputHistoryIndex]
            url.value = histEntry.value
            url.setSelectionRange(histEntry.index, histEntry.index)
            updateSuggestions(false)
        }
        updateNavbarScrolling()
        return
    }
    if (url.selectionStart !== url.selectionEnd) {
        if (!["<lt>", "<Bar>", "<Bslash>", "<Space>"].includes(id)) {
            if (id.length !== 1) {
                if (id !== "<Del>" && !id.endsWith("-Del>")) {
                    if (id !== "<BS>" && !id.endsWith("-BS>")) {
                        return
                    }
                }
            }
        }
        const cur = Number(url.selectionStart)
        url.value = url.value.substr(0, url.selectionStart)
            + url.value.substr(url.selectionEnd)
        url.setSelectionRange(cur, cur)
        updateSuggestions()
        updateNavbarScrolling()
        if (id === "<Del>" || id.endsWith("-Del>")) {
            return
        }
        if (id === "<BS>" || id.endsWith("-BS>")) {
            return
        }
    }
    if (id === "<Del>") {
        if (url.selectionEnd < url.value.length) {
            const cur = Number(url.selectionStart)
            url.value = `${url.value.substr(0, url.selectionStart)}${
                url.value.substr(url.selectionEnd + 1)}`
            url.setSelectionRange(cur, cur)
            updateSuggestions()
            updateNavbarScrolling()
        }
        return
    }
    if (keyForOs(["<C-Del>", "<C-S-Del>"], [], id)) {
        let wordPosition = 0
        for (const word of words) {
            wordPosition += word.length
            if (wordPosition > url.selectionStart) {
                const cur = Number(url.selectionStart)
                url.value = `${url.value.substr(0, url.selectionStart)}${
                    url.value.substr(wordPosition)}`
                url.setSelectionRange(cur, cur)
                updateSuggestions()
                updateNavbarScrolling()
                return
            }
        }
        return
    }
    if (id === "<BS>") {
        if (url.selectionStart > 0) {
            const cur = Number(url.selectionStart)
            url.value = `${url.value.substr(0, url.selectionStart - 1)}${
                url.value.substr(url.selectionEnd)}`
            url.setSelectionRange(cur - 1, cur - 1)
            updateSuggestions()
            updateNavbarScrolling()
        }
        return
    }
    if (keyForOs(["<C-BS>", "<C-S-BS>"], ["<M-BS>", "<A-BS>"], id)) {
        let wordPosition = url.value.length
        for (const word of words.slice().reverse()) {
            wordPosition -= word.length
            if (wordPosition < url.selectionStart) {
                url.value = `${url.value.substr(0, wordPosition)}${
                    url.value.substr(url.selectionStart)}`
                url.setSelectionRange(wordPosition, wordPosition)
                updateSuggestions()
                updateNavbarScrolling()
                return
            }
        }
        return
    }
    const cur = Number(url.selectionStart)
    const text = String(url.value)
    if (id.length === 1) {
        url.value = `${url.value.substr(0, url.selectionStart)}${id}${
            url.value.substr(url.selectionEnd)}`
    }
    if (id === "<lt>") {
        url.value = `${url.value.substr(0, url.selectionStart)}<${
            url.value.substr(url.selectionEnd)}`
    }
    if (id === "<Bar>") {
        url.value = `${url.value.substr(0, url.selectionStart)}|${
            url.value.substr(url.selectionEnd)}`
    }
    if (id === "<Bslash>") {
        url.value = `${url.value.substr(0, url.selectionStart)}\\${
            url.value.substr(url.selectionEnd)}`
    }
    if (id === "<Space>") {
        url.value = `${url.value.substr(0, url.selectionStart)} ${
            url.value.substr(url.selectionEnd)}`
    }
    if (text !== url.value) {
        url.setSelectionRange(cur + 1, cur + 1)
        updateSuggestions()
        updateNavbarScrolling()
    }
}

const resetInputHistory = () => {
    inputHistoryList = [{"index": 0, "value": ""}]
    inputHistoryIndex = 0
}

const updateSuggestions = (updateHistory = true) => {
    const url = document.getElementById("url")
    if (updateHistory) {
        inputHistoryList = inputHistoryList.slice(0, inputHistoryIndex + 1)
        inputHistoryIndex = inputHistoryList.length
        inputHistoryList.push({"index": url.selectionStart, "value": url.value})
    }
    if (currentMode() === "explore") {
        const {suggestExplore} = require("./suggest")
        suggestExplore(url.value)
    } else if (currentMode() === "command") {
        const {suggestCommand} = require("./suggest")
        suggestCommand(url.value)
    } else if (currentMode() === "search" && getSetting("incsearch")) {
        ACTIONS.incrementalSearch()
    }
}

const updateKeysOnScreen = () => {
    document.getElementById("repeat-counter").textContent = repeatCounter
    document.getElementById("pressed-keys").textContent = pressedKeys
    if (repeatCounter && getSetting("showcmd")) {
        document.getElementById("repeat-counter").style.display = "flex"
    } else {
        document.getElementById("repeat-counter").style.display = "none"
    }
    if (pressedKeys && getSetting("showcmd")) {
        document.getElementById("pressed-keys").style.display = "flex"
    } else {
        document.getElementById("pressed-keys").style.display = "none"
    }
    const {ipcRenderer} = require("electron")
    const {active} = require("./contextmenu")
    if (pressedKeys) {
        ipcRenderer.send("insert-mode-blockers", "all")
    } else if (active()) {
        ipcRenderer.send("insert-mode-blockers", Object.keys(bindings.i)
            .concat(Object.keys(bindings.m)).concat("0123456789".split(""))
            .map(mapping => fromIdentifier(
                mapping.split(mapStringSplitter).filter(m => m)[0])))
    } else {
        ipcRenderer.send("insert-mode-blockers", Object.keys(bindings.i)
            .map(mapping => fromIdentifier(
                mapping.split(mapStringSplitter).filter(m => m)[0]))
        )
    }
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

const listMapping = (mode, rawKey, includeDefault) => {
    const key = sanitiseMapString(rawKey)
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
        notify("Mappings are always overwritten, no need for !", "warn")
        return
    }
    if (args.length === 0) {
        const mappings = listMappingsAsCommandList(mode, includeDefault)
        if (mappings) {
            notify(mappings)
        } else if (includeDefault) {
            notify("No mappings found")
        } else {
            notify("No custom mappings found")
        }
        return
    }
    if (args.length === 1) {
        if (mode) {
            const mapping = listMapping(mode, args[0], includeDefault).trim()
            if (mapping) {
                notify(mapping)
            } else if (includeDefault) {
                notify("No mapping found for this sequence")
            } else {
                notify("No custom mapping found for this sequence")
            }
        } else {
            let mappings = ""
            Object.keys(bindings).forEach(m => {
                mappings += `${listMapping(m, args[0], includeDefault)}\n`
            })
            mappings = mappings.replace(/[\r\n]+/g, "\n").trim()
            if (mappings) {
                notify(mappings)
            } else if (includeDefault) {
                notify("No mapping found for this sequence")
            } else {
                notify("No custom mapping found for this sequence")
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
            ;[key] = splitKeys.slice(-1)
        }
        let knownKey = false
        for (const name of keyNames) {
            if (name.vim.find(vk => vk.toUpperCase() === key.toUpperCase())) {
                [key] = name.vim
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
            notify(
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
        bindings[mode][mapping] = {"mapping": actions, noremap}
    } else {
        Object.keys(bindings).forEach(m => {
            bindings[m][mapping] = {"mapping": actions, noremap}
        })
    }
    const {updateHelpPage} = require("./settings")
    updateHelpPage()
}

const unmap = (mode, args) => {
    if (args.length !== 1) {
        notify(`The ${mode}unmap command requires exactly one mapping`, "warn")
        return
    }
    if (mode) {
        delete bindings[mode][sanitiseMapString(args[0])]
    } else {
        Object.keys(bindings).forEach(bindMode => {
            delete bindings[bindMode][sanitiseMapString(args[0])]
        })
    }
    const {updateHelpPage} = require("./settings")
    updateHelpPage()
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
    const {updateHelpPage} = require("./settings")
    updateHelpPage()
}

module.exports = {
    clearmap,
    doAction,
    executeMapString,
    init,
    listMappingsAsCommandList,
    listSupportedActions,
    mapOrList,
    resetInputHistory,
    uncountableActions,
    unmap,
    updateKeysOnScreen
}
