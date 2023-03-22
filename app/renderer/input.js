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
const {
    matchesQuery, notify, specialChars, isUrl, sendToPageOrSubFrame, pageOffset
} = require("../util")
const {
    listTabs,
    currentTab,
    currentPage,
    currentMode,
    getSetting,
    listPages,
    setTopOfPageWithMouse,
    getMouseConf,
    updateScreenshotHighlight
} = require("./common")

const ACTIONS = require("./actions")
const POINTER = require("./pointer")

const defaultBindings = {
    "c": {
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<toNormalMode>"},
        "<C-F4>": {"mapping": "<closeTab>"},
        "<C-F5>": {"mapping": "<refreshTabWithoutCache>"},
        "<C-i>": {"mapping": "<editWithVim>"},
        "<C-m>": {"mapping": "<menuOpen>"},
        "<C-n>": {"mapping": "<commandHistoryNext>"},
        "<C-p>": {"mapping": "<commandHistoryPrevious>"},
        "<CR>": {"mapping": "<useEnteredData>"},
        "<Down>": {"mapping": "<nextSuggestion>"},
        "<Esc>": {"mapping": "<toNormalMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F2>": {"mapping": "<toNormalMode>"},
        "<F3>": {"mapping": "<toSearchMode>"},
        "<F4>": {"mapping": "<startFollowCurrentTab>"},
        "<F5>": {"mapping": "<refreshTab>"},
        "<F6>": {"mapping": "<toExploreMode>"},
        "<F7>": {"mapping": "<p.start>"},
        "<F10>": {"mapping": "<toggleAlwaysOnTop>"},
        "<F11>": {"mapping": "<toggleFullscreen>"},
        "<F12>": {"mapping": "<:devtools>"},
        "<S-Tab>": {"mapping": "<prevSuggestion>"},
        "<Tab>": {"mapping": "<nextSuggestion>"},
        "<Up>": {"mapping": "<prevSuggestion>"},
        "<kClear>": {"mapping": "<useEnteredData>"},
        "<kDown>": {"mapping": "<nextSuggestion>"},
        "<kEnter>": {"mapping": "<useEnteredData>"},
        "<kUp>": {"mapping": "<prevSuggestion>"}
    },
    "e": {
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<toNormalMode>"},
        "<C-Down>": {"mapping": "<nextSuggestionSection>"},
        "<C-F4>": {"mapping": "<closeTab>"},
        "<C-F5>": {"mapping": "<refreshTabWithoutCache>"},
        "<C-Up>": {"mapping": "<prevSuggestionSection>"},
        "<C-i>": {"mapping": "<editWithVim>"},
        "<C-kDown>": {"mapping": "<nextSuggestionSection>"},
        "<C-kUp>": {"mapping": "<prevSuggestionSection>"},
        "<C-m>": {"mapping": "<menuOpen>"},
        "<C-n>": {"mapping": "<exploreHistoryNext>"},
        "<C-p>": {"mapping": "<exploreHistoryPrevious>"},
        "<CR>": {"mapping": "<useEnteredData>"},
        "<Down>": {"mapping": "<nextSuggestion>"},
        "<Esc>": {"mapping": "<toNormalMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F2>": {"mapping": "<toCommandMode>"},
        "<F3>": {"mapping": "<toSearchMode>"},
        "<F4>": {"mapping": "<startFollowCurrentTab>"},
        "<F5>": {"mapping": "<refreshTab>"},
        "<F6>": {"mapping": "<toNormalMode>"},
        "<F7>": {"mapping": "<p.start>"},
        "<F10>": {"mapping": "<toggleAlwaysOnTop>"},
        "<F11>": {"mapping": "<toggleFullscreen>"},
        "<F12>": {"mapping": "<:devtools>"},
        "<PageDown>": {"mapping": "<nextSuggestionSection>"},
        "<PageUp>": {"mapping": "<prevSuggestionSection>"},
        "<S-Tab>": {"mapping": "<prevSuggestion>"},
        "<Tab>": {"mapping": "<nextSuggestion>"},
        "<Up>": {"mapping": "<prevSuggestion>"},
        "<kClear>": {"mapping": "<useEnteredData>"},
        "<kDown>": {"mapping": "<nextSuggestion>"},
        "<kEnter>": {"mapping": "<useEnteredData>"},
        "<kPageDown>": {"mapping": "<nextSuggestionSection>"},
        "<kPageUp>": {"mapping": "<prevSuggestionSection>"},
        "<kUp>": {"mapping": "<prevSuggestion>"}
    },
    "f": {
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<stopFollowMode>"},
        "<C-F4>": {"mapping": "<closeTab>"},
        "<C-F5>": {"mapping": "<refreshTabWithoutCache>"},
        "<C-m>": {"mapping": "<menuOpen>"},
        "<Esc>": {"mapping": "<stopFollowMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F2>": {"mapping": "<toCommandMode>"},
        "<F3>": {"mapping": "<toSearchMode>"},
        "<F4>": {"mapping": "<stopFollowMode>"},
        "<F5>": {"mapping": "<refreshTab>"},
        "<F6>": {"mapping": "<toExploreMode>"},
        "<F7>": {"mapping": "<p.start>"},
        "<F10>": {"mapping": "<toggleAlwaysOnTop>"},
        "<F11>": {"mapping": "<toggleFullscreen>"},
        "<F12>": {"mapping": "<:devtools>"},
        "<Tab>": {"mapping": "<reorderFollowLinks>"}
    },
    "i": {
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<toNormalMode>"},
        "<C-F4>": {"mapping": "<closeTab>"},
        "<C-F5>": {"mapping": "<refreshTabWithoutCache>"},
        "<C-i>": {"mapping": "<editWithVim>"},
        "<C-m>": {"mapping": "<menuOpen>"},
        "<CapsLock>": {"mapping": "<nop>"},
        "<Esc>": {"mapping": "<toNormalMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F2>": {"mapping": "<toCommandMode>"},
        "<F3>": {"mapping": "<toSearchMode>"},
        "<F4>": {"mapping": "<startFollowCurrentTab>"},
        "<F5>": {"mapping": "<refreshTab>"},
        "<F6>": {"mapping": "<toExploreMode>"},
        "<F7>": {"mapping": "<p.start>"},
        "<F8>": {"mapping": "<nop>"},
        "<F9>": {"mapping": "<nop>"},
        "<F10>": {"mapping": "<toggleAlwaysOnTop>"},
        "<F11>": {"mapping": "<toggleFullscreen>"},
        "<F12>": {"mapping": "<:devtools>"},
        "<NumLock>": {"mapping": "<nop>"},
        "<ScrollLock>": {"mapping": "<nop>"}
    },
    "m": {
        ".": {"mapping": "<repeatLastAction>"},
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<menuClose>"},
        "<C-Down>": {"mapping": "<menuSectionDown>"},
        "<C-F4>": {"mapping": "<closeTab>"},
        "<C-F5>": {"mapping": "<refreshTabWithoutCache>"},
        "<C-Up>": {"mapping": "<menuSectionUp>"},
        "<C-kDown>": {"mapping": "<menuSectionDown>"},
        "<C-kUp>": {"mapping": "<menuSectionUp>"},
        "<C-m>": {"mapping": "<menuOpen>"},
        "<C-n>": {"mapping": "<menuDown>"},
        "<C-p>": {"mapping": "<menuUp>"},
        "<CR>": {"mapping": "<menuSelect>"},
        "<Down>": {"mapping": "<menuDown>"},
        "<End>": {"mapping": "<menuBottom>"},
        "<Esc>": {"mapping": "<menuClose>"},
        "<F1>": {"mapping": "<:help>"},
        "<F2>": {"mapping": "<toCommandMode>"},
        "<F3>": {"mapping": "<toSearchMode>"},
        "<F4>": {"mapping": "<startFollowCurrentTab>"},
        "<F5>": {"mapping": "<refreshTab>"},
        "<F6>": {"mapping": "<toExploreMode>"},
        "<F7>": {"mapping": "<p.start>"},
        "<F10>": {"mapping": "<toggleAlwaysOnTop>"},
        "<F11>": {"mapping": "<toggleFullscreen>"},
        "<F12>": {"mapping": "<:devtools>"},
        "<Home>": {"mapping": "<menuTop>"},
        "<PageDown>": {"mapping": "<menuSectionDown>"},
        "<PageUp>": {"mapping": "<menuSectionUp>"},
        "<S-Tab>": {"mapping": "<menuSectionUp>"},
        "<Tab>": {"mapping": "<menuSectionDown>"},
        "<Up>": {"mapping": "<menuUp>"},
        "<kClear>": {"mapping": "<menuSelect>"},
        "<kDown>": {"mapping": "<menuDown>"},
        "<kEnd>": {"mapping": "<menuBottom>"},
        "<kEnter>": {"mapping": "<menuSelect>"},
        "<kHome>": {"mapping": "<menuTop>"},
        "<kPageDown>": {"mapping": "<menuSectionDown>"},
        "<kPageUp>": {"mapping": "<menuSectionUp>"},
        "<kUp>": {"mapping": "<menuUp>"},
        "H": {"mapping": "<menuTop>"},
        "L": {"mapping": "<menuBottom>"}
    },
    "n": {
        "\"<Any>": {"mapping": "<restoreMark>"},
        "$": {"mapping": "<scrollRightMax>"},
        "'<Any>": {"mapping": "<restoreScrollPos>"},
        "+": {"mapping": "<zoomIn>"},
        ".": {"mapping": "<repeatLastAction>"},
        "/": {"mapping": "<toSearchMode>"},
        ":": {"mapping": "<toCommandMode>"},
        "<A-F4>": {"mapping": "<:quitall>"},
        "<BS>": {"mapping": "<emptySearch>"},
        "<C-0>": {"mapping": "<zoomReset>"},
        "<C-F4>": {"mapping": "<closeTab>"},
        "<C-F5>": {"mapping": "<refreshTabWithoutCache>"},
        "<C-PageDown>": {"mapping": "<nextTab>"},
        "<C-PageUp>": {"mapping": "<previousTab>"},
        "<C-S-PageDown>": {"mapping": "<moveTabForward>"},
        "<C-S-Tab>": {"mapping": "<previousTab>"},
        "<C-S-kPageDown>": {"mapping": "<moveTabForward>"},
        "<C-S-kPageUp>": {"mapping": "<moveTabBackward>"},
        "<C-Tab>": {"mapping": "<nextTab>"},
        "<C-a>": {"mapping": "<increasePageNumber>"},
        "<C-b>": {"mapping": "<scrollPageUp>"},
        "<C-c>": {"mapping": "<stopLoadingPage>"},
        "<C-d>": {"mapping": "<scrollPageDownHalf>"},
        "<C-e>": {"mapping": "<scrollDown>"},
        "<C-f>": {"mapping": "<scrollPageDown>"},
        "<C-i>": {"mapping": "<forwardInHistory>"},
        "<C-j>": {"mapping": "<moveTabForward>"},
        "<C-k>": {"mapping": "<moveTabBackward>"},
        "<C-k0>": {"mapping": "<zoomReset>"},
        "<C-kPageDown>": {"mapping": "<nextTab>"},
        "<C-kPageUp>": {"mapping": "<previousTab>"},
        "<C-m>": {"mapping": "<menuOpen>"},
        "<C-n>": {"mapping": "<nextTab>"},
        "<C-o>": {"mapping": "<backInHistory>"},
        "<C-p>": {"mapping": "<previousTab>"},
        "<C-t>": {"mapping": "<:set tabnexttocurrent!>"
            + "<openNewTab><:set tabnexttocurrent!>"},
        "<C-u>": {"mapping": "<scrollPageUpHalf>"},
        "<C-w>+": {"mapping": "<increaseHeightSplitWindow>"},
        "<C-w><C-=>": {"mapping": "<distrubuteSpaceSplitWindow>"},
        "<C-w><C->>": {"mapping": "<increaseWidthSplitWindow>"},
        "<C-w><C-H>": {"mapping": "<leftHalfSplitWindow>"},
        "<C-w><C-J>": {"mapping": "<bottomHalfSplitWindow>"},
        "<C-w><C-K>": {"mapping": "<topHalfSplitWindow>"},
        "<C-w><C-L>": {"mapping": "<rightHalfSplitWindow>"},
        "<C-w><C-R>": {"mapping": "<rotateSplitWindowBackward>"},
        "<C-w><C-W>": {"mapping": "<toPreviousSplitWindow>"},
        "<C-w><C-b>": {"mapping": "<toLastSplitWindow>"},
        "<C-w><C-c>": {"mapping": "<:close>"},
        "<C-w><C-h>": {"mapping": "<toLeftSplitWindow>"},
        "<C-w><C-j>": {"mapping": "<toBottomSplitWindow>"},
        "<C-w><C-k>": {"mapping": "<toTopSplitWindow>"},
        "<C-w><C-l>": {"mapping": "<toRightSplitWindow>"},
        "<C-w><C-lt>": {"mapping": "<decreaseWidthSplitWindow>"},
        "<C-w><C-n>": {"mapping": "<:split>"},
        "<C-w><C-o>": {"mapping": "<:only>"},
        "<C-w><C-p>": {"mapping": "<:buffer #>"},
        "<C-w><C-q>": {"mapping": "<:quit>"},
        "<C-w><C-r>": {"mapping": "<rotateSplitWindowForward>"},
        "<C-w><C-s>": {"mapping": "<:split>"},
        "<C-w><C-t>": {"mapping": "<toFirstSplitWindow>"},
        "<C-w><C-v>": {"mapping": "<:vsplit>"},
        "<C-w><C-w>": {"mapping": "<toNextSplitWindow>"},
        "<C-w><C-x>": {"mapping": "<exchangeSplitWindow>"},
        "<C-w><lt>": {"mapping": "<decreaseWidthSplitWindow>"},
        "<C-w>=": {"mapping": "<distrubuteSpaceSplitWindow>"},
        "<C-w>>": {"mapping": "<increaseWidthSplitWindow>"},
        "<C-w>-": {"mapping": "<decreaseHeightSplitWindow>"},
        "<C-w>H": {"mapping": "<leftHalfSplitWindow>"},
        "<C-w>J": {"mapping": "<bottomHalfSplitWindow>"},
        "<C-w>K": {"mapping": "<topHalfSplitWindow>"},
        "<C-w>L": {"mapping": "<rightHalfSplitWindow>"},
        "<C-w>R": {"mapping": "<rotateSplitWindowBackward>"},
        "<C-w>W": {"mapping": "<toPreviousSplitWindow>"},
        "<C-w>b": {"mapping": "<toLastSplitWindow>"},
        "<C-w>c": {"mapping": "<:close>"},
        "<C-w>h": {"mapping": "<toLeftSplitWindow>"},
        "<C-w>j": {"mapping": "<toBottomSplitWindow>"},
        "<C-w>k": {"mapping": "<toTopSplitWindow>"},
        "<C-w>l": {"mapping": "<toRightSplitWindow>"},
        "<C-w>n": {"mapping": "<:split>"},
        "<C-w>o": {"mapping": "<:only>"},
        "<C-w>p": {"mapping": "<:buffer #>"},
        "<C-w>q": {"mapping": "<:quit>"},
        "<C-w>r": {"mapping": "<rotateSplitWindowForward>"},
        "<C-w>s": {"mapping": "<:split>"},
        "<C-w>t": {"mapping": "<toFirstSplitWindow>"},
        "<C-w>v": {"mapping": "<:vsplit>"},
        "<C-w>w": {"mapping": "<toNextSplitWindow>"},
        "<C-w>x": {"mapping": "<exchangeSplitWindow>"},
        "<C-x>": {"mapping": "<decreasePageNumber>"},
        "<C-y>": {"mapping": "<scrollUp>"},
        "<CR>": {"mapping": "<clickOnSearch>"},
        "<Down>": {"mapping": "<scrollDown>"},
        "<End>": {"mapping": "<scrollBottom>"},
        "<F1>": {"mapping": "<:help>"},
        "<F2>": {"mapping": "<toCommandMode>"},
        "<F3>": {"mapping": "<toSearchMode>"},
        "<F4>": {"mapping": "<startFollowCurrentTab>"},
        "<F5>": {"mapping": "<refreshTab>"},
        "<F6>": {"mapping": "<toExploreMode>"},
        "<F7>": {"mapping": "<p.start>"},
        "<F10>": {"mapping": "<toggleAlwaysOnTop>"},
        "<F11>": {"mapping": "<toggleFullscreen>"},
        "<F12>": {"mapping": "<:devtools>"},
        "<Home>": {"mapping": "<scrollTop>"},
        "<Left>": {"mapping": "<scrollLeft>"},
        "<PageDown>": {"mapping": "<scrollPageDown>"},
        "<PageUp>": {"mapping": "<scrollPageUp>"},
        "<Right>": {"mapping": "<scrollRight>"},
        "<Up>": {"mapping": "<scrollUp>"},
        "<k0>": {"mapping": "<scrollLeftMax>"},
        "<kClear>": {"mapping": "<clickOnSearch>"},
        "<kDivide>": {"mapping": "<toSearchMode>"},
        "<kDown>": {"mapping": "<scrollDown>"},
        "<kEnd>": {"mapping": "<scrollBottom>"},
        "<kEnter>": {"mapping": "<clickOnSearch>"},
        "<kHome>": {"mapping": "<scrollTop>"},
        "<kLeft>": {"mapping": "<scrollLeft>"},
        "<kMinus>": {"mapping": "<zoomOut>"},
        "<kPageDown>": {"mapping": "<scrollPageDown>"},
        "<kPageUp>": {"mapping": "<scrollPageUp>"},
        "<kPlus>": {"mapping": "<zoomIn>"},
        "<kRight>": {"mapping": "<scrollRight>"},
        "<kUp>": {"mapping": "<scrollUp>"},
        "=": {"mapping": "<zoomIn>"},
        "?": {"mapping": "<toSearchMode>"},
        "@:": {"mapping": "<toCommandMode><commandHistoryPrevious>"
            + "<useEnteredData>"},
        "[": {"mapping": "<previousPage>"},
        "]": {"mapping": "<nextPage>"},
        "^": {"mapping": "<scrollLeftMax>"},
        "_": {"mapping": "<zoomOut>"},
        "{": {"mapping": "<previousPageNewTab>"},
        "}": {"mapping": "<nextPageNewTab>"},
        "-": {"mapping": "<zoomOut>"},
        "0": {"mapping": "<scrollLeftMax>"},
        "BB": {"mapping": "<:buffer #>"},
        "BD": {"mapping": "<:close #>"},
        "BH": {"mapping": "<:hide #>"},
        "BS": {"mapping": "<:Sexplore #>"},
        "BV": {"mapping": "<:Vexplore #>"},
        "BZ": {"mapping": "<:suspend #>"},
        "D": {"mapping": "<downloadLink>"},
        "E": {"mapping": "<openNewTab><toExploreMode>"},
        "F": {"mapping": "<startFollowNewTab>"},
        "G": {"mapping": "<scrollBottom>"},
        "H": {"mapping": "<backInHistory>"},
        "I": {"mapping": "<moveTabStart>"},
        "J": {"mapping": "<nextTab>"},
        "K": {"mapping": "<previousTab>"},
        "L": {"mapping": "<forwardInHistory>"},
        "M<Any>": {"mapping": "<makeMark>"},
        "N": {"mapping": "<previousSearchMatch>"},
        "O": {"mapping": "<moveTabEnd>"},
        "P": {"mapping": "<openNewTab><openFromClipboard>"},
        "R": {"mapping": "<refreshTabWithoutCache>"},
        "S": {"mapping": "<startFollowNewSplit>"},
        "T": {"mapping": "<openNewTabWithCurrentUrl>"},
        "V": {"mapping": "<startFollowNewVerSplit>"},
        "ZZ": {"mapping": "<:quit>"},
        "b": {"mapping": "<previousTab>"},
        "c": {"mapping": "<p.start>"},
        "d": {"mapping": "<:close>"},
        "e": {"mapping": "<toExploreMode>"},
        "f": {"mapping": "<startFollowCurrentTab>"},
        "g<C-a>": {"mapping": "<increasePortNumber>"},
        "g<C-x>": {"mapping": "<decreasePortNumber>"},
        "gF": {"mapping": "<toggleSourceViewerNewTab>"},
        "gM": {"mapping": "<toggleMarkdownViewerNewTab>"},
        "gR": {"mapping": "<toggleReaderViewNewTab>"},
        "gS": {"mapping": "<toRootSubdomain>"},
        "gT": {"mapping": "<previousTab>"},
        "gU": {"mapping": "<toRootUrl>"},
        "gf": {"mapping": "<toggleSourceViewer>"},
        "gg": {"mapping": "<scrollTop>"},
        "gi": {"mapping": "<insertAtFirstInput>"},
        "gm": {"mapping": "<toggleMarkdownViewer>"},
        "gr": {"mapping": "<toggleReaderView>"},
        "gs": {"mapping": "<toParentSubdomain>"},
        "gt": {"mapping": "<nextTab>"},
        "gu": {"mapping": "<toParentUrl>"},
        "gv": {"mapping": "<p.restoreSelection>"},
        "h": {"mapping": "<scrollLeft>"},
        "i": {"mapping": "<toInsertMode>"},
        "j": {"mapping": "<scrollDown>"},
        "k": {"mapping": "<scrollUp>"},
        "l": {"mapping": "<scrollRight>"},
        "m<Any>": {"mapping": "<storeScrollPos>"},
        "n": {"mapping": "<nextSearchMatch>"},
        "p": {"mapping": "<openFromClipboard>"},
        "r": {"mapping": "<refreshTab>"},
        "s": {"mapping": "<p.moveToMouse>"},
        "t": {"mapping": "<openNewTab>"},
        "u": {"mapping": "<reopenTab>"},
        "v": {"mapping": "<p.start>"},
        "w": {"mapping": "<nextTab>"},
        "x": {"mapping": "<openLinkExternal>"},
        "ye": {"mapping": "<pageToClipboardEmacs>"},
        "yf": {"mapping": "<startFollowCopyLink>"},
        "yh": {"mapping": "<pageToClipboardHTML>"},
        "ym": {"mapping": "<pageToClipboardMarkdown>"},
        "yr": {"mapping": "<pageToClipboardRST>"},
        "ys": {"mapping": "<p.copyText>"},
        "yt": {"mapping": "<pageTitleToClipboard>"},
        "yy": {"mapping": "<pageToClipboard>"},
        "zH": {"mapping": "<scrollPageLeft>"},
        "zL": {"mapping": "<scrollPageRight>"},
        "zh": {"mapping": "<scrollLeft>"},
        "zl": {"mapping": "<scrollRight>"},
        "zp": {"mapping": "<:pin>"}
    },
    "p": {
        "\"<Any>": {"mapping": "<p.restorePos>"},
        "$": {"mapping": "<p.moveRightMax>"},
        "'<Any>": {"mapping": "<p.restorePos>"},
        "*": {"mapping": "<p.vsplitLink>"},
        ".": {"mapping": "<repeatLastAction>"},
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<toNormalMode>"},
        "<C-End>": {"mapping": "<p.endOfPage>"},
        "<C-F4>": {"mapping": "<closeTab>"},
        "<C-F5>": {"mapping": "<refreshTabWithoutCache>"},
        "<C-Home>": {"mapping": "<p.startOfPage>"},
        "<C-Left>": {"mapping": "<p.moveFastLeft>"},
        "<C-Right>": {"mapping": "<p.moveFastRight>"},
        "<C-b>": {"mapping": "<scrollPageUp>"},
        "<C-d>": {"mapping": "<p.moveFastDown>"},
        "<C-f>": {"mapping": "<scrollPageDown>"},
        "<C-h>": {"mapping": "<p.moveSlowLeft>"},
        "<C-j>": {"mapping": "<p.moveSlowDown>"},
        "<C-k>": {"mapping": "<p.moveSlowUp>"},
        "<C-kEnd>": {"mapping": "<p.endOfPage>"},
        "<C-kHome>": {"mapping": "<p.startOfPage>"},
        "<C-kLeft>": {"mapping": "<p.moveFastLeft>"},
        "<C-kRight>": {"mapping": "<p.moveFastRight>"},
        "<C-l>": {"mapping": "<p.moveSlowRight>"},
        "<C-m>": {"mapping": "<menuOpen>"},
        "<C-u>": {"mapping": "<p.moveFastUp>"},
        "<CR>": {"mapping": "<p.leftClick>"},
        "<Down>": {"mapping": "<p.moveDown>"},
        "<End>": {"mapping": "<p.moveRightMax>"},
        "<Esc>": {"mapping": "<toNormalMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F2>": {"mapping": "<toCommandMode>"},
        "<F3>": {"mapping": "<toSearchMode>"},
        "<F4>": {"mapping": "<startFollowCurrentTab>"},
        "<F5>": {"mapping": "<refreshTab>"},
        "<F6>": {"mapping": "<toExploreMode>"},
        "<F7>": {"mapping": "<toNormalMode>"},
        "<F10>": {"mapping": "<toggleAlwaysOnTop>"},
        "<F11>": {"mapping": "<toggleFullscreen>"},
        "<F12>": {"mapping": "<:devtools>"},
        "<Home>": {"mapping": "<p.moveLeftMax>"},
        "<Left>": {"mapping": "<p.moveLeft>"},
        "<Right>": {"mapping": "<p.moveRight>"},
        "<S-CR>": {"mapping": "<p.newtabLink>"},
        "<S-kClear>": {"mapping": "<p.newtabLink>"},
        "<S-kEnter>": {"mapping": "<p.newtabLink>"},
        "<Up>": {"mapping": "<p.moveUp>"},
        "<k0>": {"mapping": "<p.moveLeftMax>"},
        "<kClear>": {"mapping": "<p.leftClick>"},
        "<kDown>": {"mapping": "<p.moveDown>"},
        "<kEnd>": {"mapping": "<p.moveRightMax>"},
        "<kEnter>": {"mapping": "<p.leftClick>"},
        "<kHome>": {"mapping": "<p.moveLeftMax>"},
        "<kLeft>": {"mapping": "<p.moveLeft>"},
        "<kRight>": {"mapping": "<p.moveRight>"},
        "<kUp>": {"mapping": "<p.moveUp>"},
        "<lt>": {"mapping": "<p.scrollLeft>"},
        ">": {"mapping": "<p.scrollRight>"},
        "[": {"mapping": "<p.scrollUp>"},
        "]": {"mapping": "<p.scrollDown>"},
        "^": {"mapping": "<p.moveLeftMax>"},
        "0": {"mapping": "<p.moveLeftMax>"},
        "B": {"mapping": "<p.moveFastLeft>"},
        "D": {"mapping": "<p.downloadLink>"},
        "G": {"mapping": "<p.endOfPage>"},
        "H": {"mapping": "<p.startOfView>"},
        "J": {"mapping": "<p.scrollDown>"},
        "K": {"mapping": "<p.scrollUp>"},
        "L": {"mapping": "<p.endOfView>"},
        "M": {"mapping": "<p.centerOfView>"},
        "N": {"mapping": "<previousSearchMatch>"},
        "SA": {"mapping": "<p.splitAudio>"},
        "SF": {"mapping": "<p.splitFrame>"},
        "SI": {"mapping": "<p.splitImage>"},
        "SL": {"mapping": "<p.splitLink>"},
        "SS": {"mapping": "<p.splitLink>"},
        "SV": {"mapping": "<p.splitVideo>"},
        "Sa": {"mapping": "<p.splitAudio>"},
        "Sf": {"mapping": "<p.splitFrame>"},
        "Si": {"mapping": "<p.splitImage>"},
        "Sl": {"mapping": "<p.splitLink>"},
        "Ss": {"mapping": "<p.splitLink>"},
        "Sv": {"mapping": "<p.splitVideo>"},
        "VA": {"mapping": "<p.vsplitAudio>"},
        "VF": {"mapping": "<p.vsplitFrame>"},
        "VI": {"mapping": "<p.vsplitImage>"},
        "VL": {"mapping": "<p.vsplitLink>"},
        "VS": {"mapping": "<p.vsplitLink>"},
        "VV": {"mapping": "<p.vsplitVideo>"},
        "Va": {"mapping": "<p.vsplitAudio>"},
        "Vf": {"mapping": "<p.vsplitFrame>"},
        "Vi": {"mapping": "<p.vsplitImage>"},
        "Vl": {"mapping": "<p.vsplitLink>"},
        "Vs": {"mapping": "<p.vsplitLink>"},
        "Vv": {"mapping": "<p.vsplitVideo>"},
        "W": {"mapping": "<p.moveFastRight>"},
        "a<Any>": {"mapping": "<p.storePos>"},
        "b": {"mapping": "<p.moveFastLeft>"},
        "da": {"mapping": "<p.downloadAudio>"},
        "dd": {"mapping": "<p.downloadLink>"},
        "df": {"mapping": "<p.downloadFrame>"},
        "di": {"mapping": "<p.downloadImage>"},
        "dl": {"mapping": "<p.downloadLink>"},
        "dv": {"mapping": "<p.downloadVideo>"},
        "e": {"mapping": "<p.inspectElement>"},
        "f": {"mapping": "<startFollowCurrentTab>"},
        "gg": {"mapping": "<p.startOfPage>"},
        "gv": {"mapping": "<p.restoreSelection>"},
        "h": {"mapping": "<p.moveLeft>"},
        "i": {"mapping": "<p.insertAtPosition>"},
        "j": {"mapping": "<p.moveDown>"},
        "k": {"mapping": "<p.moveUp>"},
        "l": {"mapping": "<p.moveRight>"},
        "mc": {"mapping": "<p.toggleMediaControls>"},
        "md": {"mapping": "<p.mediaDown>"},
        "ml": {"mapping": "<p.toggleMediaLoop>"},
        "mm": {"mapping": "<p.toggleMediaMute>"},
        "mp": {"mapping": "<p.toggleMediaPlay>"},
        "mu": {"mapping": "<p.mediaUp>"},
        "n": {"mapping": "<nextSearchMatch>"},
        "oa": {"mapping": "<p.openAudio>"},
        "of": {"mapping": "<p.openFrame>"},
        "oi": {"mapping": "<p.openImage>"},
        "ol": {"mapping": "<p.openLink>"},
        "oo": {"mapping": "<p.openLink>"},
        "ov": {"mapping": "<p.openVideo>"},
        "r": {"mapping": "<p.rightClick>"},
        "s": {"mapping": "<p.moveToMouse>"},
        "ta": {"mapping": "<p.newtabAudio>"},
        "tf": {"mapping": "<p.newtabFrame>"},
        "ti": {"mapping": "<p.newtabImage>"},
        "tl": {"mapping": "<p.newtabLink>"},
        "tn": {"mapping": "<p.newtabLink>"},
        "tv": {"mapping": "<p.newtabVideo>"},
        "v": {"mapping": "<p.startVisualSelect>"},
        "w": {"mapping": "<p.moveFastRight>"},
        "xa": {"mapping": "<p.externalAudio>"},
        "xf": {"mapping": "<p.externalFrame>"},
        "xi": {"mapping": "<p.externalImage>"},
        "xl": {"mapping": "<p.externalLink>"},
        "xv": {"mapping": "<p.externalVideo>"},
        "xx": {"mapping": "<p.externalLink>"},
        "yI": {"mapping": "<p.copyImageBuffer>"},
        "ya": {"mapping": "<p.copyAudio>"},
        "yf": {"mapping": "<p.copyFrame>"},
        "yi": {"mapping": "<p.copyImage>"},
        "yl": {"mapping": "<p.copyLink>"},
        "yv": {"mapping": "<p.copyVideo>"},
        "yy": {"mapping": "<p.copyLink>"},
        "zH": {"mapping": "<scrollPageLeft>"},
        "zL": {"mapping": "<scrollPageRight>"},
        "zh": {"mapping": "<scrollLeft>"},
        "zl": {"mapping": "<scrollRight>"}
    },
    "s": {
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<toNormalMode>"},
        "<C-F4>": {"mapping": "<closeTab>"},
        "<C-F5>": {"mapping": "<refreshTabWithoutCache>"},
        "<C-i>": {"mapping": "<editWithVim>"},
        "<C-m>": {"mapping": "<menuOpen>"},
        "<CR>": {"mapping": "<useEnteredData>"},
        "<Esc>": {"mapping": "<toNormalMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F2>": {"mapping": "<toCommandMode>"},
        "<F3>": {"mapping": "<toNormalMode>"},
        "<F4>": {"mapping": "<startFollowCurrentTab>"},
        "<F5>": {"mapping": "<refreshTab>"},
        "<F6>": {"mapping": "<toExploreMode>"},
        "<F7>": {"mapping": "<p.start>"},
        "<F10>": {"mapping": "<toggleAlwaysOnTop>"},
        "<F11>": {"mapping": "<toggleFullscreen>"},
        "<F12>": {"mapping": "<:devtools>"},
        "<kClear>": {"mapping": "<useEnteredData>"},
        "<kEnter>": {"mapping": "<useEnteredData>"}
    },
    "v": {
        "\"<Any>": {"mapping": "<p.restorePos>"},
        "$": {"mapping": "<p.moveRightMax>"},
        "'<Any>": {"mapping": "<p.restorePos>"},
        "*": {"mapping": "<p.searchText><toNormalMode>"},
        ".": {"mapping": "<repeatLastAction>"},
        "<A-F4>": {"mapping": "<:quitall>"},
        "<C-[>": {"mapping": "<toNormalMode>"},
        "<C-End>": {"mapping": "<p.endOfPage>"},
        "<C-F4>": {"mapping": "<closeTab>"},
        "<C-F5>": {"mapping": "<refreshTabWithoutCache>"},
        "<C-Home>": {"mapping": "<p.startOfPage>"},
        "<C-Left>": {"mapping": "<p.moveFastLeft>"},
        "<C-Right>": {"mapping": "<p.moveFastRight>"},
        "<C-b>": {"mapping": "<scrollPageUp>"},
        "<C-d>": {"mapping": "<p.moveFastDown>"},
        "<C-f>": {"mapping": "<scrollPageDown>"},
        "<C-h>": {"mapping": "<p.moveSlowLeft>"},
        "<C-j>": {"mapping": "<p.moveSlowDown>"},
        "<C-k>": {"mapping": "<p.moveSlowUp>"},
        "<C-kEnd>": {"mapping": "<p.endOfPage>"},
        "<C-kHome>": {"mapping": "<p.startOfPage>"},
        "<C-kLeft>": {"mapping": "<p.moveFastLeft>"},
        "<C-kRight>": {"mapping": "<p.moveFastRight>"},
        "<C-l>": {"mapping": "<p.moveSlowRight>"},
        "<C-m>": {"mapping": "<menuOpen>"},
        "<C-u>": {"mapping": "<p.moveFastUp>"},
        "<Down>": {"mapping": "<p.moveDown>"},
        "<End>": {"mapping": "<p.moveRightMax>"},
        "<Esc>": {"mapping": "<toNormalMode>"},
        "<F1>": {"mapping": "<:help>"},
        "<F2>": {"mapping": "<toCommandMode>"},
        "<F3>": {"mapping": "<toSearchMode>"},
        "<F4>": {"mapping": "<startFollowCurrentTab>"},
        "<F5>": {"mapping": "<refreshTab>"},
        "<F6>": {"mapping": "<toExploreMode>"},
        "<F7>": {"mapping": "<toNormalMode>"},
        "<F10>": {"mapping": "<toggleAlwaysOnTop>"},
        "<F11>": {"mapping": "<toggleFullscreen>"},
        "<F12>": {"mapping": "<:devtools>"},
        "<Home>": {"mapping": "<p.moveLeftMax>"},
        "<Left>": {"mapping": "<p.moveLeft>"},
        "<Right>": {"mapping": "<p.moveRight>"},
        "<Up>": {"mapping": "<p.moveUp>"},
        "<k0>": {"mapping": "<p.moveLeftMax>"},
        "<kDown>": {"mapping": "<p.moveDown>"},
        "<kEnd>": {"mapping": "<p.moveRightMax>"},
        "<kHome>": {"mapping": "<p.moveLeftMax>"},
        "<kLeft>": {"mapping": "<p.moveLeft>"},
        "<kMultiply>": {"mapping": "<p.searchText><toNormalMode>"},
        "<kRight>": {"mapping": "<p.moveRight>"},
        "<kUp>": {"mapping": "<p.moveUp>"},
        "<lt>": {"mapping": "<p.scrollLeft>"},
        ">": {"mapping": "<p.scrollRight>"},
        "[": {"mapping": "<p.scrollUp>"},
        "]": {"mapping": "<p.scrollDown>"},
        "^": {"mapping": "<p.moveLeftMax>"},
        "0": {"mapping": "<p.moveLeftMax>"},
        "B": {"mapping": "<p.moveFastLeft>"},
        "G": {"mapping": "<p.endOfPage>"},
        "H": {"mapping": "<p.startOfView>"},
        "J": {"mapping": "<p.scrollDown>"},
        "K": {"mapping": "<p.scrollUp>"},
        "L": {"mapping": "<p.endOfView>"},
        "M": {"mapping": "<p.centerOfView>"},
        "W": {"mapping": "<p.moveFastRight>"},
        "a<Any>": {"mapping": "<p.storePos>"},
        "b": {"mapping": "<p.moveFastLeft>"},
        "c": {"mapping": "<toNormalMode><p.start>"},
        "f": {"mapping": "<startFollowCurrentTab>"},
        "gg": {"mapping": "<p.startOfPage>"},
        "h": {"mapping": "<p.moveLeft>"},
        "j": {"mapping": "<p.moveDown>"},
        "k": {"mapping": "<p.moveUp>"},
        "l": {"mapping": "<p.moveRight>"},
        "o": {"mapping": "<p.swapPosition>"},
        "r": {"mapping": "<p.rightClick>"},
        "s": {"mapping": "<p.moveToMouse>"},
        "tS": {"mapping": "<p.splitText>"},
        "tV": {"mapping": "<p.vsplitText>"},
        "td": {"mapping": "<p.downloadText><toNormalMode>"},
        "tn": {"mapping": "<p.newtabText>"},
        "to": {"mapping": "<p.openText><toNormalMode>"},
        "ts": {"mapping": "<p.searchText><toNormalMode>"},
        "tx": {"mapping": "<p.externalText><toNormalMode>"},
        "ty": {"mapping": "<p.copyText><toNormalMode>"},
        "w": {"mapping": "<p.moveFastRight>"},
        "y": {"mapping": "<p.copyText><toNormalMode>"},
        "zH": {"mapping": "<scrollPageLeft>"},
        "zL": {"mapping": "<scrollPageRight>"},
        "zh": {"mapping": "<scrollLeft>"},
        "zl": {"mapping": "<scrollRight>"}
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
let lastActionInMapping = null
let lastExecutedMapstring = null
let draggingScreenshotFrame = false
let lastScreenshotX = 0
let lastScreenshotY = 0
let suggestionTimer = null
let hadModifier = false

const init = () => {
    window.addEventListener("keydown", handleKeyboard)
    window.addEventListener("keypress", e => e.preventDefault())
    window.addEventListener("keyup", e => e.preventDefault())
    window.addEventListener("mousedown", e => {
        if (currentMode() === "insert" && getMouseConf("leaveinsert")) {
            ACTIONS.toNormalMode()
        }
        if (e.button === 3) {
            if (getMouseConf("history")) {
                ACTIONS.backInHistory()
            }
            e.preventDefault()
            return
        }
        if (e.button === 4) {
            if (getMouseConf("history")) {
                ACTIONS.forwardInHistory()
            }
            e.preventDefault()
            return
        }
        if (e.button === 1) {
            e.preventDefault()
        }
        const selector = "#screenshot-highlight"
        if (e.composedPath().find(el => matchesQuery(el, selector))) {
            if (getMouseConf("screenshotframe")) {
                if (e.button === 0) {
                    draggingScreenshotFrame = "position"
                } else {
                    draggingScreenshotFrame = "size"
                }
                e.preventDefault()
            }
        }
        if (e.target === document.getElementById("url")) {
            const {followFiltering} = require("./follow")
            const typing = "sec".includes(currentMode()[0]) || followFiltering()
            if (typing && !getMouseConf("url")) {
                e.preventDefault()
            }
            if (!typing && !getMouseConf("toexplore")) {
                e.preventDefault()
            }
        }
    })
    document.getElementById("tabs").addEventListener("dblclick", e => {
        if (getMouseConf("newtab")) {
            const {addTab} = require("./tabs")
            addTab()
        } else {
            e.preventDefault()
        }
        ACTIONS.setFocusCorrectly()
    })
    window.addEventListener("mousewheel", ev => {
        if (ev.composedPath().find(e => matchesQuery(e, "#tabs"))) {
            if (getMouseConf("scrolltabs")) {
                // Make both directions of scrolling move the tabs horizontally
                document.getElementById("tabs").scrollBy(
                    ev.deltaX + ev.deltaY, ev.deltaX + ev.deltaY)
            }
        }
        const overPageElements = "#page-container, #screenshot-highlight"
        if (ev.composedPath().find(e => matchesQuery(e, overPageElements))) {
            if (getMouseConf("pageoutsideinsert")) {
                const {top, left} = pageOffset(currentPage())
                sendToPageOrSubFrame("send-input-event", {
                    "deltaX": -ev.deltaX,
                    "deltaY": -ev.deltaY,
                    "type": "scroll",
                    "x": ev.x - left,
                    "y": ev.y - top
                })
            }
        }
        if (ev.composedPath().find(e => matchesQuery(e, "#suggest-dropdown"))) {
            if (!getMouseConf("scrollsuggest")) {
                ev.preventDefault()
            }
        }
    }, {"passive": false})
    window.addEventListener("mouseup", e => {
        if (draggingScreenshotFrame) {
            setTimeout(() => {
                draggingScreenshotFrame = false
            }, 10)
            e.preventDefault()
            return
        }
        if (e.target === document.getElementById("url")) {
            const {followFiltering} = require("./follow")
            const typing = "sec".includes(currentMode()[0]) || followFiltering()
            if (typing && !getMouseConf("url")) {
                e.preventDefault()
            } else if (typing && e.button === 1) {
                setTimeout(() => requestSuggestUpdate(), 1)
            }
            if (getMouseConf("toexplore")) {
                if (!typing) {
                    ACTIONS.toExploreMode()
                }
                return
            }
        } else {
            e.preventDefault()
        }
        if (e.button === 1 && getMouseConf("closetab")) {
            const tab = e.composedPath().find(el => listTabs().includes(el))
            if (tab) {
                const {closeTab} = require("./tabs")
                closeTab(listTabs().indexOf(tab))
            }
            const {clear} = require("./contextmenu")
            clear()
        }
        ACTIONS.setFocusCorrectly()
    })
    window.addEventListener("mouseout", () => {
        const {followFiltering} = require("./follow")
        const typing = "sec".includes(currentMode()[0]) || followFiltering()
        if (!typing) {
            document.getElementById("url").setSelectionRange(0, 0)
            window.getSelection().removeAllRanges()
        }
        ACTIONS.setFocusCorrectly()
    })
    window.addEventListener("cut", cutInput)
    window.addEventListener("copy", copyInput)
    window.addEventListener("copy", pasteInput)
    window.addEventListener("click", e => {
        if (e.composedPath().find(el => matchesQuery(el, "#context-menu"))) {
            return
        }
        if (draggingScreenshotFrame && getMouseConf("screenshotframe")) {
            e.preventDefault()
            return
        }
        const {clear} = require("./contextmenu")
        clear()
        if (e.target.classList.contains("no-focus-reset")) {
            return
        }
        e.preventDefault()
        const urlOrSuggest = ev => ev.composedPath().find(
            el => matchesQuery(el, "#url, #suggest-dropdown"))
        if (urlOrSuggest(e)) {
            const {followFiltering} = require("./follow")
            const typing = "sec".includes(currentMode()[0]) || followFiltering()
            if (!typing && getMouseConf("toexplore")) {
                ACTIONS.toExploreMode()
            }
        } else if ("sec".includes(currentMode()[0])) {
            if (getMouseConf("leaveinput")) {
                ACTIONS.toNormalMode()
            }
        } else if (getMouseConf("switchtab")) {
            const tab = e.composedPath().find(el => listTabs().includes(el))
            if (tab) {
                clear()
                const {switchToTab} = require("./tabs")
                switchToTab(tab)
            }
        }
        ACTIONS.setFocusCorrectly()
    })
    const tabSelector = "#pagelayout *[link-id], #tabs *[link-id]"
    window.addEventListener("mousemove", e => {
        if (e.y === 0) {
            setTopOfPageWithMouse(getMouseConf("guiontop"))
        }
        if (getSetting("mousefocus")) {
            document.elementsFromPoint(e.x, e.y).forEach(el => {
                if (matchesQuery(el, tabSelector)) {
                    const tab = listTabs().find(t => t.getAttribute(
                        "link-id") === el.getAttribute("link-id"))
                    if (tab && currentTab() !== tab) {
                        const {switchToTab} = require("./tabs")
                        switchToTab(tab)
                    }
                }
            })
        }
        moveScreenshotFrame(e.x, e.y)
    })
    window.addEventListener("contextmenu", e => {
        e.preventDefault()
        if (getMouseConf("leaveinput")) {
            const {followFiltering} = require("./follow")
            const typing = "sec".includes(currentMode()[0]) || followFiltering()
            const urlOrSuggest = ev => ev.composedPath().find(
                el => matchesQuery(el, "#url, #suggest-dropdown"))
            if (typing && !urlOrSuggest(e)) {
                ACTIONS.toNormalMode()
            }
        }
        if (getMouseConf("menuvieb")) {
            const {viebMenu} = require("./contextmenu")
            viebMenu(e)
        }
        ACTIONS.setFocusCorrectly()
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
    ipcRenderer.on("zoom-changed", (_, ctxId, direction) => {
        const page = listPages().find(p => p.getWebContentsId?.() === ctxId)
        if (!page || !getMouseConf("scrollzoom")) {
            return
        }
        if (direction === "in") {
            ACTIONS.zoomIn({"customPage": page})
        }
        if (direction === "out") {
            ACTIONS.zoomOut({"customPage": page})
        }
    })
    ipcRenderer.on("insert-mode-input-event", (_, input) => {
        if (input.key === "Tab") {
            currentPage().focus()
        }
        // Check if fullscreen should be disabled
        if (document.body.classList.contains("fullscreen")) {
            const noMods = !input.shift && !input.meta && !input.alt
            const ctrl = input.control
            const escapeKey = input.key === "Escape" && noMods && !ctrl
            const ctrlBrack = input.key === "[" && noMods && ctrl
            if (escapeKey || ctrlBrack) {
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
            "location": input.location,
            "metaKey": input.meta,
            "passedOnFromInsert": true,
            "preventDefault": () => undefined,
            "shiftKey": input.shift
        })
    })
    ipcRenderer.on("window-close", () => executeMapString("<A-F4>", true, true))
    ipcRenderer.on("window-focus", () => {
        document.body.classList.add("focus")
        ACTIONS.setFocusCorrectly()
    })
    ipcRenderer.on("window-blur", () => {
        document.body.classList.remove("focus")
        ACTIONS.setFocusCorrectly()
    })
    ACTIONS.setFocusCorrectly()
    const unSupportedActions = [
        "setFocusCorrectly",
        "incrementalSearch",
        "resetIncrementalSearch",
        "resetInputHistory",
        "p.init",
        "p.move",
        "p.storeMouseSelection",
        "p.handleScrollDiffEvent",
        "p.updateElement",
        "p.releaseKeys"
    ]
    supportedActions = [
        ...Object.keys(ACTIONS), ...Object.keys(POINTER).map(c => `p.${c}`)
    ].filter(m => !unSupportedActions.includes(m))
    bindings = JSON.parse(JSON.stringify(defaultBindings))
    updateKeysOnScreen()
}

const resetScreenshotDrag = () => setTimeout(() => {
    draggingScreenshotFrame = false
}, 10)

const moveScreenshotFrame = (x, y) => {
    const deltaX = x - lastScreenshotX
    const deltaY = y - lastScreenshotY
    if (getMouseConf("screenshotframe") && draggingScreenshotFrame) {
        const url = document.getElementById("url")
        const dims = url.value.split(" ").find(
            arg => arg?.match(/^\d+,\d+,\d+,\d+$/g))
        if (!currentMode() === "command" || !dims || !currentPage()) {
            return
        }
        const rect = {
            "height": Number(dims.split(",")[1]),
            "width": Number(dims.split(",")[0]),
            "x": Number(dims.split(",")[2]),
            "y": Number(dims.split(",")[3])
        }
        if (draggingScreenshotFrame === "position") {
            rect.x += deltaX
            rect.y += deltaY
            rect.x = Math.round(Math.max(rect.x, 0))
            rect.y = Math.round(Math.max(rect.y, 0))
        } else if (draggingScreenshotFrame === "size") {
            rect.width += deltaX
            rect.height += deltaY
            rect.width = Math.round(Math.max(rect.width, 1))
            rect.height = Math.round(Math.max(rect.height, 1))
        }
        url.value = url.value.replace(/\d+,\d+,\d+,\d+/g, `${rect.width},${
            rect.height},${rect.x},${rect.y}`)
        updateScreenshotHighlight()
        requestSuggestUpdate()
    }
    lastScreenshotX = x
    lastScreenshotY = y
}

const cutInput = (event = null) => {
    event?.preventDefault()
    let selection = document.getSelection().toString()
    if (currentMode() === "explore" && isUrl(selection)) {
        selection = selection.replace(/ /g, "%20")
    }
    const {clipboard} = require("electron")
    clipboard.writeText(selection)
    const url = document.getElementById("url")
    const cur = Number(url.selectionStart)
    url.value = url.value.substr(0, url.selectionStart)
        + url.value.substr(url.selectionEnd)
    url.setSelectionRange(cur, cur)
    requestSuggestUpdate()
    updateNavbarScrolling()
}

const copyInput = (event = null) => {
    event?.preventDefault()
    let selection = document.getSelection().toString()
    if (currentMode() === "explore" && isUrl(selection)) {
        selection = selection.replace(/ /g, "%20")
    }
    const {clipboard} = require("electron")
    clipboard.writeText(selection)
}

const pasteInput = (event = null) => {
    event?.preventDefault()
    const url = document.getElementById("url")
    const cur = Number(url.selectionStart)
    const {clipboard} = require("electron")
    const pastedText = clipboard.readText()
    url.value = url.value.substr(0, url.selectionStart) + pastedText
        + url.value.substr(url.selectionEnd)
    url.setSelectionRange(cur + pastedText.length, cur + pastedText.length)
    requestSuggestUpdate()
    updateNavbarScrolling()
}

const keyNames = [
    {"js": ["<"], "vim": ["lt"]},
    {"js": ["Backspace"], "vim": ["BS"]},
    {
        "electron": "Return",
        "js": ["Enter"],
        "vim": ["CR", "NL", "Return", "Enter"]
    },
    {"js": ["|"], "vim": ["Bar"]},
    {"js": ["\\"], "vim": ["Bslash"]},
    {"js": ["ArrowLeft"], "vim": ["Left"]},
    {"js": ["ArrowRight"], "vim": ["Right"]},
    {"js": ["ArrowUp"], "vim": ["Up"]},
    {"js": ["ArrowDown"], "vim": ["Down"]},
    {"js": ["Escape", "Esc"], "vim": ["Esc"]},
    {"js": [" "], "vim": ["Space", " "]},
    {"js": ["Delete"], "vim": ["Del"]},
    {"js": ["PrintScreen"], "vim": ["PrintScreen", "PrtScr"]},
    {"js": ["Control"], "vim": ["Ctrl"]},
    {"electron": "ArrowLeft", "js": ["kArrowLeft"], "vim": ["kLeft"]},
    {"electron": "ArrowRight", "js": ["kArrowRight"], "vim": ["kRight"]},
    {"electron": "ArrowUp", "js": ["kArrowUp"], "vim": ["kUp"]},
    {"electron": "ArrowDown", "js": ["kArrowDown"], "vim": ["kDown"]},
    {"electron": "numadd", "js": ["k+", "kPlus"], "vim": ["kPlus"]},
    {"electron": "numsub", "js": ["k-", "kMinus"], "vim": ["kMinus"]},
    {"electron": "nummult", "js": ["k*", "kMultiply"], "vim": ["kMultiply"]},
    {"electron": "numdiv", "js": ["k/", "kDivide"], "vim": ["kDivide"]},
    {"electron": "numdec", "js": ["k.", "kPoint"], "vim": ["kPoint"]},
    {"electron": "num0", "js": ["k0"], "vim": ["k0"]},
    {"electron": "num1", "js": ["k1"], "vim": ["k1"]},
    {"electron": "num2", "js": ["k2"], "vim": ["k2"]},
    {"electron": "num3", "js": ["k3"], "vim": ["k3"]},
    {"electron": "num4", "js": ["k4"], "vim": ["k4"]},
    {"electron": "num5", "js": ["k5"], "vim": ["k5"]},
    {"electron": "num6", "js": ["k6"], "vim": ["k6"]},
    {"electron": "num7", "js": ["k7"], "vim": ["k7"]},
    {"electron": "num8", "js": ["k8"], "vim": ["k8"]},
    {"electron": "num9", "js": ["k9"], "vim": ["k9"]},
    {"electron": "Delete", "js": ["kDelete"], "vim": ["kDel"]},
    {"electron": "Clear", "js": ["kClear"], "vim": ["kClear"]},
    {"electron": "Home", "js": ["kHome"], "vim": ["kHome"]},
    {"electron": "End", "js": ["kEnd"], "vim": ["kEnd"]},
    {"electron": "PageUp", "js": ["kPageUp"], "vim": ["kPageUp"]},
    {"electron": "PageDown", "js": ["kPageDown"], "vim": ["kPageDown"]},
    {"electron": "Return", "js": ["kEnter"], "vim": ["kEnter"]},
    {"electron": "Insert", "js": ["kInsert"], "vim": ["kInsert"]},
    // Keys with the same names, which are listed here to detect incorrect names
    // Note: some of these are not present in Vim and use the JavaScript name
    {"js": ["Shift"], "vim": ["Shift"]},
    {"js": ["Alt"], "vim": ["Alt"]},
    {"js": ["Meta"], "vim": ["Meta"]},
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
    {"js": ["ScrollLock"], "vim": ["ScrollLock"]},
    // Fictional keys with custom implementation
    {"js": ["Any"], "vim": ["Any"]}
]
const toIdentifier = e => {
    let keyCode = e.key
    if (e.key === "\u0000") {
        keyCode = "Delete"
    }
    if (e.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
        keyCode = `k${keyCode}`
    }
    keyNames.forEach(key => {
        if (key.js.includes(keyCode)) {
            [keyCode] = key.vim
        }
    })
    // If the shift status can be detected by name or casing,
    // it will not be prefixed with 'S-'.
    const needsShift = keyCode.length > 1 && !["lt", "Bar"].includes(keyCode)
    if (e.shiftKey && needsShift && keyCode !== "Shift") {
        keyCode = `S-${keyCode}`
    }
    if (e.altKey && keyCode !== "Alt") {
        keyCode = `A-${keyCode}`
    }
    if (e.metaKey && keyCode !== "Meta") {
        keyCode = `M-${keyCode}`
    }
    if (e.ctrlKey && keyCode !== "Ctrl") {
        keyCode = `C-${keyCode}`
    }
    if (keyCode.length > 1) {
        keyCode = `<${keyCode}>`
    }
    return keyCode
}

const fromIdentifier = (identifier, electronNames = true) => {
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
                if (electronNames && key.electron) {
                    id = key.electron
                } else {
                    [id] = key.js
                }
            }
        })
    }
    return {...options, "key": id, "keyCode": id}
}

// Single use actions that do not need to be called multiple times if counted
const uncountableActions = [
    "emptySearch",
    "clickOnSearch",
    "toExploreMode",
    "startFollowCopyLink",
    "startFollowCurrentTab",
    "startFollowNewTab",
    "startFollowNewSplit",
    "startFollowNewVerSplit",
    "scrollRightMax",
    "scrollLeftMax",
    "insertAtFirstInput",
    "toInsertMode",
    "refreshTab",
    "refreshTabWithoutCache",
    "moveTabEnd",
    "moveTabStart",
    "nextPage",
    "previousPage",
    "nextPageNewTab",
    "previousPageNewTab",
    "toRootUrl",
    "toSearchMode",
    "openNewTabWithCurrentUrl",
    "toCommandMode",
    "stopLoadingPage",
    "zoomReset",
    "toNormalMode",
    "stopFollowMode",
    "editWithVim",
    "leftHalfSplitWindow",
    "bottomHalfSplitWindow",
    "topHalfSplitWindow",
    "rightHalfSplitWindow",
    "toFirstSplitWindow",
    "toLastSplitWindow",
    "distrubuteSpaceSplitWindow",
    "pageToClipboard",
    "pageTitleToClipboard",
    "pageToClipboardEmacs",
    "pageToClipboardHTML",
    "pageToClipboardMarkdown",
    "pageToClipboardRST",
    "openFromClipboard",
    "openLinkExternal",
    "downloadLink",
    "toggleAlwaysOnTop",
    "toggleFullscreen",
    "makeMark",
    "restoreMark",
    "storeScrollPos",
    "restoreScrollPos",
    "menuOpen",
    "menuTop",
    "menuBottom",
    "menuSelect",
    "menuClose",
    "useEnteredData",
    "nop",
    "p.start",
    "p.moveToMouse",
    "p.startVisualSelect",
    "p.inspectElement",
    "p.startOfPage",
    "p.insertAtPosition",
    "p.centerOfView",
    "p.startOfView",
    "p.endOfView",
    "p.endOfPage",
    "p.moveRightMax",
    "p.moveLeftMax",
    "p.storePos",
    "p.restorePos",
    "p.openAudio",
    "p.openFrame",
    "p.openImage",
    "p.openVideo",
    "p.openLink",
    "p.downloadAudio",
    "p.downloadFrame",
    "p.downloadImage",
    "p.downloadVideo",
    "p.downloadLink",
    "p.newtabAudio",
    "p.newtabFrame",
    "p.newtabImage",
    "p.newtabVideo",
    "p.newtabLink",
    "p.externalAudio",
    "p.externalFrame",
    "p.externalImage",
    "p.externalVideo",
    "p.externalLink",
    "p.copyImageBuffer",
    "p.copyAudio",
    "p.copyFrame",
    "p.copyImage",
    "p.copyVideo",
    "p.copyLink",
    "p.splitAudio",
    "p.splitFrame",
    "p.splitImage",
    "p.splitVideo",
    "p.splitLink",
    "p.vsplitAudio",
    "p.vsplitFrame",
    "p.vsplitImage",
    "p.vsplitVideo",
    "p.vsplitLink",
    "p.openText",
    "p.downloadText",
    "p.newtabText",
    "p.externalText",
    "p.copyText",
    "p.searchText",
    "p.splitText",
    "p.vsplitText"
]

const findMaps = (actionKeys, mode, future = false) => {
    const keys = actionKeys.split(mapStringSplitter).filter(k => k)
    return Object.keys(bindings[mode[0]]).filter(m => {
        const mapKeys = m.split(mapStringSplitter).filter(k => k)
        if (future && mapKeys.length <= keys.length) {
            return false
        }
        if (!future && mapKeys.length !== keys.length) {
            return false
        }
        let keyCount = 0
        for (const key of keys) {
            if (key !== mapKeys[keyCount] && mapKeys[keyCount] !== "<Any>") {
                return false
            }
            keyCount += 1
        }
        return true
    }).sort((a, b) => a.split(mapStringSplitter).filter(k => k).indexOf("<Any>")
    - b.split(mapStringSplitter).filter(k => k).indexOf("<Any>"))
}
window.findMaps = findMaps

const hasFutureActions = keys => findMaps(keys, currentMode(), true).length

const sendKeysToWebview = async(options, mapStr) => {
    blockNextInsertKey = true
    sendToPageOrSubFrame("send-keyboard-event", options)
    if (options.bubbles) {
        const action = actionForKeys(mapStr)
        if (action) {
            await executeMapString(action.mapping, !action.noremap)
        }
    }
    await new Promise(r => {
        setTimeout(r, 3)
    })
}

const repeatLastAction = () => {
    if (lastExecutedMapstring) {
        executeMapString(lastExecutedMapstring.mapStr,
            lastExecutedMapstring.recursive, true)
    }
}

const executeMapString = async(mapStr, recursive, initial) => {
    const actionCallKey = pressedKeys.split(mapStringSplitter)
        .filter(k => k).at(-1)
    if (initial) {
        if (!mapStr.includes("<repeatLastAction>")) {
            lastExecutedMapstring = {mapStr, recursive}
        }
        recursiveCounter = 0
        if (!hasFutureActions(pressedKeys)) {
            pressedKeys = ""
        }
    }
    recursiveCounter += 1
    let repeater = Number(repeatCounter) || 1
    if (initial && repeatCounter) {
        if (["<scrollBottom>", "<scrollTop>"].includes(mapStr)) {
            currentPage()?.send("action", "scrollPerc", repeatCounter)
            repeater = 0
        }
    }
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
            if (supportedActions.includes(key.replace(/(^<|>$)/g, ""))) {
                const count = Number(repeatCounter)
                repeatCounter = 0
                await doAction(key.replace(/(^<|>$)/g, ""), count, actionCallKey)
                await new Promise(r => {
                    setTimeout(r, 3)
                })
                continue
            } else if (key.startsWith("<:")) {
                const {execute} = require("./command")
                execute(key.replace(/^<:|>$/g, ""))
                lastActionInMapping = null
                await new Promise(r => {
                    setTimeout(r, 3)
                })
                continue
            }
            if (currentMode() === "insert") {
                const options = {...fromIdentifier(key), "bubbles": recursive}
                if (!options.bubbles) {
                    ipcRenderer.sendSync("insert-mode-blockers", "pass")
                }
                await sendKeysToWebview(options, key)
            } else {
                const options = {
                    ...fromIdentifier(key, false), "bubbles": recursive
                }
                window.dispatchEvent(new KeyboardEvent("keydown", options))
            }
            lastActionInMapping = null
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
        repeatCounter = 0
        pressedKeys = ""
        lastActionInMapping = null
        updateKeysOnScreen()
    }
}

const doAction = async(actionName, givenCount, key) => {
    let actionCount = givenCount || 1
    if (uncountableActions.includes(actionName)) {
        if (lastActionInMapping === actionName) {
            repeatCounter = 0
            updateKeysOnScreen()
            return
        }
        actionCount = 1
    }
    lastActionInMapping = String(actionName)
    const pointer = actionName.toLowerCase().startsWith("p.")
    const funcName = actionName.replace(/^.*\./g, "")
    for (let i = 0; i < actionCount; i++) {
        if (pointer) {
            await POINTER[funcName]({hadModifier, key})
        } else {
            await ACTIONS[funcName]({hadModifier, key})
        }
    }
    if (!funcName.startsWith("menu") && funcName !== "nop") {
        const {clear} = require("./contextmenu")
        clear()
    }
    repeatCounter = 0
}

const actionForKeys = keys => {
    const {"active": menuActive} = require("./contextmenu")
    const allMenu = findMaps(keys, "menu")
    const menuAction = bindings.m[allMenu[0]]
    if (menuActive() && menuAction) {
        return menuAction
    }
    const allCurrent = findMaps(keys, currentMode())
    return bindings[currentMode()[0]][allCurrent[0]]
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
    if (e.isComposing || e.which === 229) {
        return
    }
    const id = toIdentifier(e)
    const matchingMod = getSetting("modifiers").split(",").find(
        mod => mod === id || `<${mod}>` === id || id.endsWith(`-${mod}>`))
    if (matchingMod) {
        return
    }
    hadModifier = e.shiftKey || e.ctrlKey
    clearTimeout(timeoutTimer)
    if (getSetting("timeout")) {
        timeoutTimer = setTimeout(async() => {
            const keys = pressedKeys.split(mapStringSplitter).filter(m => m)
            if (pressedKeys) {
                const ac = actionForKeys(pressedKeys)
                pressedKeys = ""
                if (ac && (e.isTrusted || e.bubbles)) {
                    if (e.isTrusted) {
                        await executeMapString(ac.mapping, !ac.noremap, true)
                    } else {
                        await executeMapString(ac.mapping, e.bubbles)
                    }
                    return
                }
                menuClear()
            }
            if (currentMode() === "insert") {
                ipcRenderer.sendSync("insert-mode-blockers", "pass")
                for (const key of keys) {
                    const options = {...fromIdentifier(key), "bubbles": false}
                    await sendKeysToWebview(options, key)
                }
                blockNextInsertKey = false
                repeatCounter = 0
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
            updateKeysOnScreen()
        }, getSetting("timeoutlen"))
    }
    const {"active": menuActive, "clear": menuClear} = require("./contextmenu")
    if ("npv".includes(currentMode()[0]) || menuActive()) {
        const keyNumber = Number(id.replace(/^<k(\d)>/g, (_, digit) => digit))
        const noFutureActions = !hasFutureActions(pressedKeys + id)
        const shouldCount = !actionForKeys(pressedKeys + id) || repeatCounter
        if (!isNaN(keyNumber) && noFutureActions && shouldCount) {
            repeatCounter = Number(String(repeatCounter) + keyNumber)
            if (repeatCounter > getSetting("countlimit")) {
                repeatCounter = getSetting("countlimit")
            }
            updateKeysOnScreen()
            return
        }
        if (id === "<Esc>" || id === "<C-[>") {
            if (repeatCounter !== 0) {
                pressedKeys = ""
                repeatCounter = 0
                updateKeysOnScreen()
                return
            }
        }
    } else {
        repeatCounter = 0
    }
    if (!hasFutureActions(pressedKeys)) {
        pressedKeys = ""
    }
    if (hasFutureActions(pressedKeys + id)) {
        pressedKeys += id
    } else {
        const action = actionForKeys(pressedKeys)
        const existingMapping = actionForKeys(pressedKeys + id)
        if (action && !existingMapping) {
            if (!["<Esc>", "<C-[>"].includes(id)) {
                pressedKeys = ""
                await executeMapString(action.mapping, !action.noremap, true)
            }
        }
        pressedKeys += id
    }
    const action = actionForKeys(pressedKeys)
    const hasMenuAction = menuActive() && action
    if (!hasFutureActions(pressedKeys) || hasMenuAction) {
        clearTimeout(timeoutTimer)
        if (action && (e.isTrusted || e.bubbles)) {
            if (e.isTrusted) {
                await executeMapString(action.mapping, !action.noremap, true)
            } else {
                await executeMapString(action.mapping, e.bubbles)
            }
            return
        }
        menuClear()
        let keys = pressedKeys.split(mapStringSplitter).filter(m => m)
        pressedKeys = ""
        if (keys.length > 1) {
            if (!hasFutureActions(keys.slice(0, -1).join(""))) {
                keys = keys.slice(0, -1)
            }
            if (currentMode() === "insert") {
                ipcRenderer.sendSync("insert-mode-blockers", "pass")
                for (const key of keys) {
                    const options = {...fromIdentifier(key), "bubbles": false}
                    await sendKeysToWebview(options, key)
                }
                blockNextInsertKey = false
                repeatCounter = 0
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
    }
    menuClear()
    updateKeysOnScreen()
    if (currentMode() === "follow") {
        if (e.type === "keydown") {
            const {enterKey} = require("./follow")
            let unshiftedName = String(e.key).toLowerCase()
            if (e.key.toUpperCase() === unshiftedName && hadModifier) {
                try {
                    const map = await navigator.keyboard.getLayoutMap()
                    unshiftedName = map.get(e.code) ?? e.key
                } catch {
                    // Unsupported keyboard layout, fallback to unshifted key
                }
            }
            enterKey(unshiftedName, id, hadModifier)
        }
        return
    }
    ACTIONS.setFocusCorrectly()
}

const keyForOs = (regular, mac, key) => regular.includes(key)
    || process.platform === "darwin" && mac.includes(key)

const updateNavbarScrolling = () => {
    const url = document.getElementById("url")
    const charWidth = getSetting("guifontsize") * 0.60191
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

const typeCharacterIntoNavbar = (character, force = false) => {
    const id = character.replace(/-k(.+)>/, (_, r) => `-${r}>`)
        .replace(/<k([a-zA-Z]+)>/, (_, r) => `<${r}>`)
        .replace(/<k(\d)>/, (_, r) => r)
        .replace("<Plus>", "+").replace("<Minus>", "-").replace("<Point>", ".")
        .replace("<Divide>", "/").replace("<Multiply>", "*")
        .replace("Delete>", "Del>")
    if (!"ces".includes(currentMode()[0]) && !force) {
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
        cutInput()
        return
    }
    if (keyForOs(["<C-c>"], ["<M-c>"], id)) {
        copyInput()
        return
    }
    if (keyForOs(["<C-v>"], ["<M-v>"], id)) {
        pasteInput()
        return
    }
    if (keyForOs(["<C-z>"], ["<M-z>"], id)) {
        if (inputHistoryIndex > 0) {
            inputHistoryIndex -= 1
            const histEntry = inputHistoryList[inputHistoryIndex]
            url.value = histEntry.value
            url.setSelectionRange(histEntry.index, histEntry.index)
            requestSuggestUpdate(false)
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
            requestSuggestUpdate(false)
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
        requestSuggestUpdate()
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
            requestSuggestUpdate()
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
                requestSuggestUpdate()
                updateNavbarScrolling()
                return
            }
        }
        return
    }
    if (id === "<BS>" || id === "<S-BS>") {
        if (url.selectionStart > 0) {
            const cur = Number(url.selectionStart)
            url.value = `${url.value.substr(0, url.selectionStart - 1)}${
                url.value.substr(url.selectionEnd)}`
            url.setSelectionRange(cur - 1, cur - 1)
            requestSuggestUpdate()
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
                requestSuggestUpdate()
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
    if (id === "<Space>" || id === "<S-Space>") {
        url.value = `${url.value.substr(0, url.selectionStart)} ${
            url.value.substr(url.selectionEnd)}`
    }
    if (text !== url.value) {
        url.setSelectionRange(cur + 1, cur + 1)
        requestSuggestUpdate()
        updateNavbarScrolling()
    }
}

const resetInputHistory = () => {
    inputHistoryList = [{"index": 0, "value": ""}]
    inputHistoryIndex = 0
}

const requestSuggestUpdate = (updateHistory = true) => {
    const url = document.getElementById("url")
    const suggestBounceDelay = getSetting("suggestbouncedelay")
    if (updateHistory) {
        inputHistoryList = inputHistoryList.slice(0, inputHistoryIndex + 1)
        inputHistoryIndex = inputHistoryList.length
        inputHistoryList.push({"index": url.selectionStart, "value": url.value})
    }
    if (!suggestionTimer) {
        updateSuggestions()
    }
    if (suggestBounceDelay) {
        clearTimeout(suggestionTimer)
        suggestionTimer = setTimeout(() => {
            suggestionTimer = null
            updateSuggestions()
        }, suggestBounceDelay)
    }
}

const updateSuggestions = () => {
    const val = document.getElementById("url").value
    const mode = currentMode()
    if (mode === "explore") {
        const {suggestExplore} = require("./suggest")
        suggestExplore(val)
    } else if (mode === "command") {
        const {suggestCommand} = require("./suggest")
        suggestCommand(val)
    } else if (mode === "search" && getSetting("incsearch")) {
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
    const mapsuggestcount = getSetting("mapsuggest")
    const mapsuggestElement = document.getElementById("mapsuggest")
    mapsuggestElement.style.display = "none"
    const {active} = require("./contextmenu")
    if (mapsuggestcount > 0) {
        const mapsuggestPosition = getSetting("mapsuggestposition")
        mapsuggestElement.className = mapsuggestPosition
        mapsuggestElement.innerHTML = ""
        if (pressedKeys) {
            const [mode] = currentMode()
            const alreadyDone = document.createElement("span")
            alreadyDone.textContent = pressedKeys
            alreadyDone.className = "success"
            let futureActions = Object.keys(bindings[mode]).filter(
                b => b.startsWith(pressedKeys)).slice(0, mapsuggestcount)
            if (active() && bindings.m[pressedKeys]) {
                futureActions = []
            }
            if (futureActions.length) {
                mapsuggestElement.style.display = "flex"
            }
            futureActions.map(b => ({
                "next": b.replace(pressedKeys, ""),
                "result": bindings[mode][b].mapping
            })).forEach(action => {
                const singleSuggestion = document.createElement("span")
                singleSuggestion.appendChild(alreadyDone.cloneNode(true))
                const nextKeys = document.createElement("span")
                nextKeys.textContent = action.next
                nextKeys.className = "warning"
                singleSuggestion.appendChild(nextKeys)
                const resultAction = document.createElement("span")
                resultAction.textContent = action.result
                resultAction.className = "info"
                singleSuggestion.appendChild(resultAction)
                mapsuggestElement.appendChild(singleSuggestion)
            })
        }
    }
    if (pressedKeys) {
        ipcRenderer.send("insert-mode-blockers", "all")
        return
    }
    let blockedKeys = Object.keys(bindings.i)
    if (active()) {
        blockedKeys = Object.keys(bindings.i).concat(
            Object.keys(bindings.m)).concat("0123456789".split(""))
    }
    ipcRenderer.send("insert-mode-blockers",
        blockedKeys.map(key => fromIdentifier(key.split(
            mapStringSplitter).filter(m => m)[0], false)))
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
    .split(mapStringSplitter).filter(m => m).map(m => {
        if (m === ">") {
            return ">"
        }
        let key = m
        let modifiers = []
        let knownKey = false
        if (allowSpecials) {
            const simpleKey = key.toLowerCase().replace(/(^<|>$)/g, "")
                .replace(/^a(ction)?\./g, "")
                .replace(/^p(ointer)?\./g, "p.")
            for (const action of supportedActions) {
                if (simpleKey === action.toLowerCase()) {
                    knownKey = true
                    key = action.replace(/^p(ointer)?\./g, "p.")
                    key = `<${key.replace(/^a(ction)?\./g, "")}>`
                    break
                }
                if (`a.${simpleKey}` === action.toLowerCase()) {
                    knownKey = true
                    key = `<${action.replace(/^.*\./g, "")}>`
                    break
                }
            }
            if (simpleKey.startsWith(":")) {
                knownKey = true
            }
            if (knownKey) {
                return key
            }
        }
        if (m.length > 1) {
            const splitKeys = m.replace(/(^<|>$)/g, "")
                .split("-").filter(s => s)
            modifiers = splitKeys.slice(0, -1).map(mod => mod.toUpperCase())
            ;[key] = splitKeys.slice(-1)
        }
        for (const name of keyNames) {
            if (name.vim.find(vk => vk.toUpperCase() === key.toUpperCase())) {
                [key] = name.vim
                knownKey = true
                break
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
    copyInput,
    cutInput,
    executeMapString,
    init,
    keyNames,
    listMappingsAsCommandList,
    listSupportedActions,
    mapOrList,
    moveScreenshotFrame,
    pasteInput,
    repeatLastAction,
    requestSuggestUpdate,
    resetInputHistory,
    resetScreenshotDrag,
    sanitiseMapString,
    typeCharacterIntoNavbar,
    uncountableActions,
    unmap,
    updateKeysOnScreen
}
