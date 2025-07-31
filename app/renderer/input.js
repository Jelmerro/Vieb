/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2025 Jelmer van Arnhem
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
    getSetting, isUrl, matchesQuery, notify, pageOffset, specialChars
} = require("../util")
const ACTIONS = require("./actions")
const {
    currentMode,
    currentPage,
    currentTab,
    getMouseConf,
    getUrl,
    listReadyPages,
    listTabs,
    sendToPageOrSubFrame,
    setTopOfPageWithMouse,
    updateGuiVisibility,
    updateScreenshotHighlight
} = require("./common")
const POINTER = require("./pointer")

/** @type {{[mode: string]: {
 *   [key: string]: {mapping: string, noremap?: boolean}
 * }}} */
const defaultBindings = {
    "c": {
        "<C-[>": {"mapping": "<toNormalMode>"},
        "<C-i>": {"mapping": "<editWithVim>"},
        "<C-j>": {"mapping": "<nextSuggestion>"},
        "<C-k>": {"mapping": "<prevSuggestion>"},
        "<C-n>": {"mapping": "<commandHistoryNext>"},
        "<C-p>": {"mapping": "<commandHistoryPrevious>"},
        "<CR>": {"mapping": "<useEnteredData>"},
        "<Down>": {"mapping": "<nextSuggestion>"},
        "<Esc>": {"mapping": "<toNormalMode>"},
        "<F2>": {"mapping": "<toNormalMode>"},
        "<kClear>": {"mapping": "<useEnteredData>"},
        "<kDown>": {"mapping": "<nextSuggestion>"},
        "<kEnter>": {"mapping": "<useEnteredData>"},
        "<kUp>": {"mapping": "<prevSuggestion>"},
        "<S-Tab>": {"mapping": "<prevSuggestion>"},
        "<Tab>": {"mapping": "<nextSuggestion>"},
        "<Up>": {"mapping": "<prevSuggestion>"}
    },
    "e": {
        "<C-[>": {"mapping": "<toNormalMode>"},
        "<C-Down>": {"mapping": "<nextSuggestionSection>"},
        "<C-i>": {"mapping": "<editWithVim>"},
        "<C-j>": {"mapping": "<nextSuggestion>"},
        "<C-k>": {"mapping": "<prevSuggestion>"},
        "<C-kDown>": {"mapping": "<nextSuggestionSection>"},
        "<C-kUp>": {"mapping": "<prevSuggestionSection>"},
        "<C-n>": {"mapping": "<exploreHistoryNext>"},
        "<C-p>": {"mapping": "<exploreHistoryPrevious>"},
        "<C-Up>": {"mapping": "<prevSuggestionSection>"},
        "<CR>": {"mapping": "<useEnteredData>"},
        "<Down>": {"mapping": "<nextSuggestion>"},
        "<Esc>": {"mapping": "<toNormalMode>"},
        "<F6>": {"mapping": "<toNormalMode>"},
        "<kClear>": {"mapping": "<useEnteredData>"},
        "<kDown>": {"mapping": "<nextSuggestion>"},
        "<kEnter>": {"mapping": "<useEnteredData>"},
        "<kPageDown>": {"mapping": "<nextSuggestionSection>"},
        "<kPageUp>": {"mapping": "<prevSuggestionSection>"},
        "<kUp>": {"mapping": "<prevSuggestion>"},
        "<PageDown>": {"mapping": "<nextSuggestionSection>"},
        "<PageUp>": {"mapping": "<prevSuggestionSection>"},
        "<S-Tab>": {"mapping": "<prevSuggestion>"},
        "<Tab>": {"mapping": "<nextSuggestion>"},
        "<Up>": {"mapping": "<prevSuggestion>"}
    },
    "f": {
        "<C-[>": {"mapping": "<stopFollowMode>"},
        "<Esc>": {"mapping": "<stopFollowMode>"},
        "<F4>": {"mapping": "<stopFollowMode>"},
        "<Tab>": {"mapping": "<reorderFollowLinks>"},
        "`": {"mapping": "<:set followlabelposition!>"}
    },
    "i": {
        "<C-[>": {"mapping": "<toNormalMode>"},
        "<C-i>": {"mapping": "<editWithVim>"},
        "<CapsLock>": {"mapping": "<nop>"},
        "<Esc>": {"mapping": "<toNormalMode>"},
        "<NumLock>": {"mapping": "<nop>"},
        "<ScrollLock>": {"mapping": "<nop>"}
    },
    "m": {
        ".": {"mapping": "<repeatLastAction>"},
        "<C-[>": {"mapping": "<menuClose>"},
        "<C-Down>": {"mapping": "<menuSectionDown>"},
        "<C-kDown>": {"mapping": "<menuSectionDown>"},
        "<C-kUp>": {"mapping": "<menuSectionUp>"},
        "<C-n>": {"mapping": "<menuDown>"},
        "<C-p>": {"mapping": "<menuUp>"},
        "<C-Up>": {"mapping": "<menuSectionUp>"},
        "<CR>": {"mapping": "<menuSelect>"},
        "<Down>": {"mapping": "<menuDown>"},
        "<End>": {"mapping": "<menuBottom>"},
        "<Esc>": {"mapping": "<menuClose>"},
        "<Home>": {"mapping": "<menuTop>"},
        "<kClear>": {"mapping": "<menuSelect>"},
        "<kDown>": {"mapping": "<menuDown>"},
        "<kEnd>": {"mapping": "<menuBottom>"},
        "<kEnter>": {"mapping": "<menuSelect>"},
        "<kHome>": {"mapping": "<menuTop>"},
        "<kPageDown>": {"mapping": "<menuSectionDown>"},
        "<kPageUp>": {"mapping": "<menuSectionUp>"},
        "<kUp>": {"mapping": "<menuUp>"},
        "<PageDown>": {"mapping": "<menuSectionDown>"},
        "<PageUp>": {"mapping": "<menuSectionUp>"},
        "<S-Tab>": {"mapping": "<menuSectionUp>"},
        "<Tab>": {"mapping": "<menuSectionDown>"},
        "<Up>": {"mapping": "<menuUp>"},
        "H": {"mapping": "<menuTop>"},
        "L": {"mapping": "<menuBottom>"}
    },
    "n": {
        "0": {"mapping": "<scrollLeftMax>"},
        "\"<Any>": {"mapping": "<restoreMark>"},
        "$": {"mapping": "<scrollRightMax>"},
        "'<Any>": {"mapping": "<restoreScrollPos>"},
        "+": {"mapping": "<zoomIn>"},
        "-": {"mapping": "<zoomOut>"},
        ".": {"mapping": "<repeatLastAction>"},
        "/": {"mapping": "<toSearchMode>"},
        ":": {"mapping": "<toCommandMode>"},
        ";": {"mapping": "<toCommandMode>"},
        "<BS>": {"mapping": "<emptySearch>"},
        "<C-[>": {"mapping": "<stopLoadingPage>"},
        "<C-a>": {"mapping": "<increasePageNumber>"},
        "<C-b>": {"mapping": "<scrollPageUp>"},
        "<C-c>": {"mapping": "<p.copyText>"},
        "<C-d>": {"mapping": "<scrollPageDownHalf>"},
        "<C-e>": {"mapping": "<scrollDown>"},
        "<C-f>": {"mapping": "<scrollPageDown>"},
        "<C-i>": {"mapping": "<forwardInHistory>"},
        "<C-j>": {"mapping": "<moveTabForward>"},
        "<C-k>": {"mapping": "<moveTabBackward>"},
        "<C-kPageDown>": {"mapping": "<nextTab>"},
        "<C-kPageUp>": {"mapping": "<previousTab>"},
        "<C-l>": {"mapping": "<toExploreMode>"},
        "<C-Left>": {"mapping": "<backInHistory>"},
        "<C-n>": {"mapping": "<nextTab>"},
        "<C-o>": {"mapping": "<backInHistory>"},
        "<C-p>": {"mapping": "<previousTab>"},
        "<C-Right>": {"mapping": "<forwardInHistory>"},
        "<C-t>": {"mapping": "<:set tabnewposition=end>"
            + "<:tabnew><:set tabnewposition=right>"},
        "<C-u>": {"mapping": "<scrollPageUpHalf>"},
        "<C-w>+": {"mapping": "<increaseHeightSplitWindow>"},
        "<C-w>-": {"mapping": "<decreaseHeightSplitWindow>"},
        "<C-w><C-=>": {"mapping": "<distrubuteSpaceSplitWindow>"},
        "<C-w><C->>": {"mapping": "<increaseWidthSplitWindow>"},
        "<C-w><C-b>": {"mapping": "<toLastSplitWindow>"},
        "<C-w><C-c>": {"mapping": "<:close>"},
        "<C-w><C-H>": {"mapping": "<leftHalfSplitWindow>"},
        "<C-w><C-h>": {"mapping": "<toLeftSplitWindow>"},
        "<C-w><C-J>": {"mapping": "<bottomHalfSplitWindow>"},
        "<C-w><C-j>": {"mapping": "<toBottomSplitWindow>"},
        "<C-w><C-K>": {"mapping": "<topHalfSplitWindow>"},
        "<C-w><C-k>": {"mapping": "<toTopSplitWindow>"},
        "<C-w><C-L>": {"mapping": "<rightHalfSplitWindow>"},
        "<C-w><C-l>": {"mapping": "<toRightSplitWindow>"},
        "<C-w><C-lt>": {"mapping": "<decreaseWidthSplitWindow>"},
        "<C-w><C-n>": {"mapping": "<:split>"},
        "<C-w><C-o>": {"mapping": "<:only>"},
        "<C-w><C-p>": {"mapping": "<:buffer #>"},
        "<C-w><C-q>": {"mapping": "<:quit>"},
        "<C-w><C-R>": {"mapping": "<rotateSplitWindowBackward>"},
        "<C-w><C-r>": {"mapping": "<rotateSplitWindowForward>"},
        "<C-w><C-s>": {"mapping": "<:split>"},
        "<C-w><C-t>": {"mapping": "<toFirstSplitWindow>"},
        "<C-w><C-v>": {"mapping": "<:vsplit>"},
        "<C-w><C-W>": {"mapping": "<toPreviousSplitWindow>"},
        "<C-w><C-w>": {"mapping": "<toNextSplitWindow>"},
        "<C-w><C-x>": {"mapping": "<exchangeSplitWindow>"},
        "<C-w><lt>": {"mapping": "<decreaseWidthSplitWindow>"},
        "<C-w>=": {"mapping": "<distrubuteSpaceSplitWindow>"},
        "<C-w>>": {"mapping": "<increaseWidthSplitWindow>"},
        "<C-w>b": {"mapping": "<toLastSplitWindow>"},
        "<C-w>c": {"mapping": "<:close>"},
        "<C-w>H": {"mapping": "<leftHalfSplitWindow>"},
        "<C-w>h": {"mapping": "<toLeftSplitWindow>"},
        "<C-w>J": {"mapping": "<bottomHalfSplitWindow>"},
        "<C-w>j": {"mapping": "<toBottomSplitWindow>"},
        "<C-w>K": {"mapping": "<topHalfSplitWindow>"},
        "<C-w>k": {"mapping": "<toTopSplitWindow>"},
        "<C-w>L": {"mapping": "<rightHalfSplitWindow>"},
        "<C-w>l": {"mapping": "<toRightSplitWindow>"},
        "<C-w>n": {"mapping": "<:split>"},
        "<C-w>o": {"mapping": "<:only>"},
        "<C-w>p": {"mapping": "<:buffer #>"},
        "<C-w>q": {"mapping": "<:quit>"},
        "<C-w>R": {"mapping": "<rotateSplitWindowBackward>"},
        "<C-w>r": {"mapping": "<rotateSplitWindowForward>"},
        "<C-w>s": {"mapping": "<:split>"},
        "<C-w>t": {"mapping": "<toFirstSplitWindow>"},
        "<C-w>v": {"mapping": "<:vsplit>"},
        "<C-w>W": {"mapping": "<toPreviousSplitWindow>"},
        "<C-w>w": {"mapping": "<toNextSplitWindow>"},
        "<C-w>x": {"mapping": "<exchangeSplitWindow>"},
        "<C-x>": {"mapping": "<decreasePageNumber>"},
        "<C-y>": {"mapping": "<scrollUp>"},
        "<CR>": {"mapping": "<clickOnSearch>"},
        "<Down>": {"mapping": "<scrollDown>"},
        "<End>": {"mapping": "<scrollBottom>"},
        "<Esc>": {"mapping": "<stopLoadingPage>"},
        "<Home>": {"mapping": "<scrollTop>"},
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
        "<Left>": {"mapping": "<scrollLeft>"},
        "<PageDown>": {"mapping": "<scrollPageDown>"},
        "<PageUp>": {"mapping": "<scrollPageUp>"},
        "<Right>": {"mapping": "<scrollRight>"},
        "<Up>": {"mapping": "<scrollUp>"},
        "=": {"mapping": "<zoomIn>"},
        "?": {"mapping": "<toSearchMode>"},
        "@:": {"mapping": "<toCommandMode><commandHistoryPrevious>"
            + "<useEnteredData>"},
        "@<Any>": {"mapping": "<runRecording>"},
        "[": {"mapping": "<previousPage>"},
        "]": {"mapping": "<nextPage>"},
        "^": {"mapping": "<scrollLeftMax>"},
        "_": {"mapping": "<zoomOut>"},
        "b": {"mapping": "<previousTab>"},
        "BB": {"mapping": "<:buffer #>"},
        "BD": {"mapping": "<:close #>"},
        "BH": {"mapping": "<:hide #>"},
        "BS": {"mapping": "<:Sexplore #>"},
        "BV": {"mapping": "<:Vexplore #>"},
        "BZ": {"mapping": "<:suspend #>"},
        "c": {"mapping": "<p.start>"},
        "D": {"mapping": "<downloadLink>"},
        "d": {"mapping": "<:close>"},
        "E": {"mapping": "<:tabnew><toExploreMode>"},
        "e": {"mapping": "<toExploreMode>"},
        "F": {"mapping": "<startFollowNewTab>"},
        "f": {"mapping": "<startFollowCurrentTab>"},
        "G": {"mapping": "<scrollBottom>"},
        "g<C-a>": {"mapping": "<increasePortNumber>"},
        "g<C-x>": {"mapping": "<decreasePortNumber>"},
        "gc": {"mapping": "<toggleTOC>"},
        "gF": {"mapping": "<toggleSourceViewerNewTab>"},
        "gf": {"mapping": "<toggleSourceViewer>"},
        "gg": {"mapping": "<scrollTop>"},
        "gi": {"mapping": "<insertAtFirstInput>"},
        "gM": {"mapping": "<toggleMarkdownViewerNewTab>"},
        "gm": {"mapping": "<toggleMarkdownViewer>"},
        "gR": {"mapping": "<toggleReaderViewNewTab>"},
        "gr": {"mapping": "<toggleReaderView>"},
        "gS": {"mapping": "<toRootSubdomain>"},
        "gs": {"mapping": "<toParentSubdomain>"},
        "gT": {"mapping": "<previousTab>"},
        "gt": {"mapping": "<nextTab>"},
        "gU": {"mapping": "<toRootUrl>"},
        "gu": {"mapping": "<toParentUrl>"},
        "gv": {"mapping": "<p.restoreSelection>"},
        "H": {"mapping": "<backInHistory>"},
        "h": {"mapping": "<scrollLeft>"},
        "I": {"mapping": "<moveTabStart>"},
        "i": {"mapping": "<toInsertMode>"},
        "J": {"mapping": "<nextTab>"},
        "j": {"mapping": "<scrollDown>"},
        "K": {"mapping": "<previousTab>"},
        "k": {"mapping": "<scrollUp>"},
        "L": {"mapping": "<forwardInHistory>"},
        "l": {"mapping": "<scrollRight>"},
        "M<Any>": {"mapping": "<makeMark>"},
        "m<Any>": {"mapping": "<storeScrollPos>"},
        "N": {"mapping": "<previousSearchMatch>"},
        "n": {"mapping": "<nextSearchMatch>"},
        "O": {"mapping": "<moveTabEnd>"},
        "P": {"mapping": "<:tabnew><openFromClipboard>"},
        "p": {"mapping": "<openFromClipboard>"},
        "q": {"mapping": "<stopRecording><:nmap q<Any> <:nunmap q<Any>>"
            + "<:punmap q<Any>><:vunmap q<Any>><:nunmap q<C-[>><:punmap q<C-[>>"
            + "<:vunmap q<C-[>><:nunmap q<Esc>><:punmap q<Esc>><:vunmap q<Esc>>"
            + "<startRecording>><:pmap q<Any> <:nunmap q<Any>>"
            + "<:punmap q<Any>><:vunmap q<Any>><:nunmap q<C-[>><:punmap q<C-[>>"
            + "<:vunmap q<C-[>><:nunmap q<Esc>><:punmap q<Esc>><:vunmap q<Esc>>"
            + "<startRecording>><:vmap q<Any> <:nunmap q<Any>>"
            + "<:punmap q<Any>><:vunmap q<Any>><:nunmap q<C-[>><:punmap q<C-[>>"
            + "<:vunmap q<C-[>><:nunmap q<Esc>><:punmap q<Esc>><:vunmap q<Esc>>"
            + "<startRecording>>"
            + "<:nmap q<C-[> <nop>><:pmap q<C-[> <nop>><:vmap q<C-[> <nop>>"
            + "<:nmap q<Esc> <nop>><:pmap q<Esc> <nop>><:vmap q<Esc> <nop>>"},
        "q<Any>": {"mapping": "<:nunmap q<Any>><:punmap q<Any>>"
            + "<:vunmap q<Any>><:nunmap q<C-[>><:punmap q<C-[>>"
            + "<:vunmap q<C-[>><:nunmap q<Esc>><:punmap q<Esc>>"
            + "<:vunmap q<Esc>><startRecording>"},
        "q<C-[>": {"mapping": "<nop>"},
        "q<Esc>": {"mapping": "<nop>"},
        "R": {"mapping": "<refreshTabWithoutCache>"},
        "r": {"mapping": "<refreshTab>"},
        "S": {"mapping": "<startFollowNewSplit>"},
        "s": {"mapping": "<p.moveToMouse>"},
        "T": {"mapping": "<openNewTabWithCurrentUrl>"},
        "t": {"mapping": "<:tabnew>"},
        "u": {"mapping": "<reopenTab>"},
        "V": {"mapping": "<startFollowNewVerSplit>"},
        "v": {"mapping": "<p.start>"},
        "w": {"mapping": "<nextTab>"},
        "x": {"mapping": "<openLinkExternal>"},
        "ye": {"mapping": "<pageToClipboardEmacs>"},
        "yf": {"mapping": "<startFollowCopyLink>"},
        "yh": {"mapping": "<pageToClipboardHTML>"},
        "ym": {"mapping": "<pageToClipboardMarkdown>"},
        "yr": {"mapping": "<pageToClipboardRST>"},
        "yR<Any>": {"mapping": "<pageRSSLinkToClipboard>"},
        "yRL": {"mapping": "<pageRSSLinksList>"},
        "ys": {"mapping": "<p.copyText>"},
        "yt": {"mapping": "<pageTitleToClipboard>"},
        "yy": {"mapping": "<pageToClipboard>"},
        "zH": {"mapping": "<scrollPageLeft>"},
        "zh": {"mapping": "<scrollLeft>"},
        "zL": {"mapping": "<scrollPageRight>"},
        "zl": {"mapping": "<scrollRight>"},
        "zm": {"mapping": "<:mute>"},
        "zp": {"mapping": "<:pin>"},
        "ZZ": {"mapping": "<:quit>"},
        "{": {"mapping": "<previousPageNewTab>"},
        "}": {"mapping": "<nextPageNewTab>"}
    },
    "p": {
        "0": {"mapping": "<p.moveLeftMax>"},
        "\"<Any>": {"mapping": "<p.restorePos>"},
        "$": {"mapping": "<p.moveRightMax>"},
        "'<Any>": {"mapping": "<p.restorePos>"},
        "*": {"mapping": "<p.vsplitLink>"},
        ".": {"mapping": "<repeatLastAction>"},
        "<C-[>": {"mapping": "<toNormalMode>"},
        "<C-b>": {"mapping": "<scrollPageUp>"},
        "<C-c>": {"mapping": "<p.copyText>"},
        "<C-d>": {"mapping": "<p.moveFastDown>"},
        "<C-End>": {"mapping": "<p.endOfPage>"},
        "<C-f>": {"mapping": "<scrollPageDown>"},
        "<C-h>": {"mapping": "<p.moveSlowLeft>"},
        "<C-Home>": {"mapping": "<p.startOfPage>"},
        "<C-j>": {"mapping": "<p.moveSlowDown>"},
        "<C-k>": {"mapping": "<p.moveSlowUp>"},
        "<C-kEnd>": {"mapping": "<p.endOfPage>"},
        "<C-kHome>": {"mapping": "<p.startOfPage>"},
        "<C-kLeft>": {"mapping": "<p.moveFastLeft>"},
        "<C-kRight>": {"mapping": "<p.moveFastRight>"},
        "<C-l>": {"mapping": "<p.moveSlowRight>"},
        "<C-Left>": {"mapping": "<p.moveFastLeft>"},
        "<C-Right>": {"mapping": "<p.moveFastRight>"},
        "<C-u>": {"mapping": "<p.moveFastUp>"},
        "<CR>": {"mapping": "<p.leftClick>"},
        "<Down>": {"mapping": "<p.moveDown>"},
        "<End>": {"mapping": "<p.moveRightMax>"},
        "<Esc>": {"mapping": "<toNormalMode>"},
        "<F7>": {"mapping": "<toNormalMode>"},
        "<Home>": {"mapping": "<p.moveLeftMax>"},
        "<k0>": {"mapping": "<p.moveLeftMax>"},
        "<kClear>": {"mapping": "<p.leftClick>"},
        "<kDown>": {"mapping": "<p.moveDown>"},
        "<kEnd>": {"mapping": "<p.moveRightMax>"},
        "<kEnter>": {"mapping": "<p.leftClick>"},
        "<kHome>": {"mapping": "<p.moveLeftMax>"},
        "<kLeft>": {"mapping": "<p.moveLeft>"},
        "<kRight>": {"mapping": "<p.moveRight>"},
        "<kUp>": {"mapping": "<p.moveUp>"},
        "<Left>": {"mapping": "<p.moveLeft>"},
        "<lt>": {"mapping": "<p.scrollLeft>"},
        "<Right>": {"mapping": "<p.moveRight>"},
        "<S-CR>": {"mapping": "<p.newtabLink>"},
        "<S-kClear>": {"mapping": "<p.newtabLink>"},
        "<S-kEnter>": {"mapping": "<p.newtabLink>"},
        "<Up>": {"mapping": "<p.moveUp>"},
        ">": {"mapping": "<p.scrollRight>"},
        "@<Any>": {"mapping": "<runRecording>"},
        "[": {"mapping": "<p.scrollUp>"},
        "]": {"mapping": "<p.scrollDown>"},
        "^": {"mapping": "<p.moveLeftMax>"},
        "a<Any>": {"mapping": "<p.storePos>"},
        "B": {"mapping": "<p.moveFastLeft>"},
        "b": {"mapping": "<p.moveFastLeft>"},
        "D": {"mapping": "<p.downloadLink>"},
        "da": {"mapping": "<p.downloadAudio>"},
        "dd": {"mapping": "<p.downloadLink>"},
        "df": {"mapping": "<p.downloadFrame>"},
        "di": {"mapping": "<p.downloadImage>"},
        "dl": {"mapping": "<p.downloadLink>"},
        "dv": {"mapping": "<p.downloadVideo>"},
        "e": {"mapping": "<p.inspectElement>"},
        "f": {"mapping": "<startFollowCurrentTab>"},
        "G": {"mapping": "<p.endOfPage>"},
        "gg": {"mapping": "<p.startOfPage>"},
        "gv": {"mapping": "<p.restoreSelection>"},
        "H": {"mapping": "<p.startOfView>"},
        "h": {"mapping": "<p.moveLeft>"},
        "i": {"mapping": "<p.insertAtPosition>"},
        "J": {"mapping": "<p.scrollDown>"},
        "j": {"mapping": "<p.moveDown>"},
        "K": {"mapping": "<p.scrollUp>"},
        "k": {"mapping": "<p.moveUp>"},
        "L": {"mapping": "<p.endOfView>"},
        "l": {"mapping": "<p.moveRight>"},
        "M": {"mapping": "<p.centerOfView>"},
        "mc": {"mapping": "<p.toggleMediaControls>"},
        "md": {"mapping": "<p.mediaDown>"},
        "mf": {"mapping": "<p.mediaFaster>"},
        "ml": {"mapping": "<p.toggleMediaLoop>"},
        "mm": {"mapping": "<p.toggleMediaMute>"},
        "mp": {"mapping": "<p.toggleMediaPlay>"},
        "ms": {"mapping": "<p.mediaSlower>"},
        "mu": {"mapping": "<p.mediaUp>"},
        "N": {"mapping": "<previousSearchMatch>"},
        "n": {"mapping": "<nextSearchMatch>"},
        "oa": {"mapping": "<p.openAudio>"},
        "of": {"mapping": "<p.openFrame>"},
        "oi": {"mapping": "<p.openImage>"},
        "ol": {"mapping": "<p.openLink>"},
        "oo": {"mapping": "<p.openLink>"},
        "ov": {"mapping": "<p.openVideo>"},
        "q": {"mapping": "<stopRecording><:nmap q<Any> <:nunmap q<Any>>"
            + "<:punmap q<Any>><:vunmap q<Any>><:nunmap q<C-[>><:punmap q<C-[>>"
            + "<:vunmap q<C-[>><:nunmap q<Esc>><:punmap q<Esc>><:vunmap q<Esc>>"
            + "<startRecording>><:pmap q<Any> <:nunmap q<Any>>"
            + "<:punmap q<Any>><:vunmap q<Any>><:nunmap q<C-[>><:punmap q<C-[>>"
            + "<:vunmap q<C-[>><:nunmap q<Esc>><:punmap q<Esc>><:vunmap q<Esc>>"
            + "<startRecording>><:vmap q<Any> <:nunmap q<Any>>"
            + "<:punmap q<Any>><:vunmap q<Any>><:nunmap q<C-[>><:punmap q<C-[>>"
            + "<:vunmap q<C-[>><:nunmap q<Esc>><:punmap q<Esc>><:vunmap q<Esc>>"
            + "<startRecording>>"
            + "<:nmap q<C-[> <nop>><:pmap q<C-[> <nop>><:vmap q<C-[> <nop>>"
            + "<:nmap q<Esc> <nop>><:pmap q<Esc> <nop>><:vmap q<Esc> <nop>>"},
        "q<Any>": {"mapping": "<:nunmap q<Any>><:punmap q<Any>>"
            + "<:vunmap q<Any>><:nunmap q<C-[>><:punmap q<C-[>>"
            + "<:vunmap q<C-[>><:nunmap q<Esc>><:punmap q<Esc>>"
            + "<:vunmap q<Esc>><startRecording>"},
        "q<C-[>": {"mapping": "<nop>"},
        "q<Esc>": {"mapping": "<nop>"},
        "r": {"mapping": "<p.rightClick>"},
        "s": {"mapping": "<p.moveToMouse>"},
        "SA": {"mapping": "<p.splitAudio>"},
        "Sa": {"mapping": "<p.splitAudio>"},
        "SF": {"mapping": "<p.splitFrame>"},
        "Sf": {"mapping": "<p.splitFrame>"},
        "SI": {"mapping": "<p.splitImage>"},
        "Si": {"mapping": "<p.splitImage>"},
        "SL": {"mapping": "<p.splitLink>"},
        "Sl": {"mapping": "<p.splitLink>"},
        "SS": {"mapping": "<p.splitLink>"},
        "Ss": {"mapping": "<p.splitLink>"},
        "SV": {"mapping": "<p.splitVideo>"},
        "Sv": {"mapping": "<p.splitVideo>"},
        "ta": {"mapping": "<p.newtabAudio>"},
        "tf": {"mapping": "<p.newtabFrame>"},
        "ti": {"mapping": "<p.newtabImage>"},
        "tl": {"mapping": "<p.newtabLink>"},
        "tn": {"mapping": "<p.newtabLink>"},
        "tv": {"mapping": "<p.newtabVideo>"},
        "v": {"mapping": "<p.startVisualSelect>"},
        "VA": {"mapping": "<p.vsplitAudio>"},
        "Va": {"mapping": "<p.vsplitAudio>"},
        "VF": {"mapping": "<p.vsplitFrame>"},
        "Vf": {"mapping": "<p.vsplitFrame>"},
        "VI": {"mapping": "<p.vsplitImage>"},
        "Vi": {"mapping": "<p.vsplitImage>"},
        "VL": {"mapping": "<p.vsplitLink>"},
        "Vl": {"mapping": "<p.vsplitLink>"},
        "VS": {"mapping": "<p.vsplitLink>"},
        "Vs": {"mapping": "<p.vsplitLink>"},
        "VV": {"mapping": "<p.vsplitVideo>"},
        "Vv": {"mapping": "<p.vsplitVideo>"},
        "W": {"mapping": "<p.moveFastRight>"},
        "w": {"mapping": "<p.moveFastRight>"},
        "xa": {"mapping": "<p.externalAudio>"},
        "xf": {"mapping": "<p.externalFrame>"},
        "xi": {"mapping": "<p.externalImage>"},
        "xl": {"mapping": "<p.externalLink>"},
        "xv": {"mapping": "<p.externalVideo>"},
        "xx": {"mapping": "<p.externalLink>"},
        "ya": {"mapping": "<p.copyAudio>"},
        "yf": {"mapping": "<p.copyFrame>"},
        "yI": {"mapping": "<p.copyImageBuffer>"},
        "yi": {"mapping": "<p.copyImage>"},
        "yl": {"mapping": "<p.copyLink>"},
        "yT": {"mapping": "<p.copyPageTitle>"},
        "yt": {"mapping": "<p.copyTitleAttr>"},
        "yv": {"mapping": "<p.copyVideo>"},
        "yy": {"mapping": "<p.copyLink>"},
        "zH": {"mapping": "<scrollPageLeft>"},
        "zh": {"mapping": "<scrollLeft>"},
        "zL": {"mapping": "<scrollPageRight>"},
        "zl": {"mapping": "<scrollRight>"}
    },
    "s": {
        "<C-[>": {"mapping": "<toNormalMode>"},
        "<C-i>": {"mapping": "<editWithVim>"},
        "<C-j>": {"mapping": "<nextSuggestion>"},
        "<C-k>": {"mapping": "<prevSuggestion>"},
        "<CR>": {"mapping": "<useEnteredData>"},
        "<Esc>": {"mapping": "<toNormalMode>"},
        "<F3>": {"mapping": "<toNormalMode>"},
        "<kClear>": {"mapping": "<useEnteredData>"},
        "<kEnter>": {"mapping": "<useEnteredData>"}
    },
    "v": {
        "0": {"mapping": "<p.moveLeftMax>"},
        "\"<Any>": {"mapping": "<p.restorePos>"},
        "$": {"mapping": "<p.moveRightMax>"},
        "'<Any>": {"mapping": "<p.restorePos>"},
        "*": {"mapping": "<p.searchText><toNormalMode>"},
        ".": {"mapping": "<repeatLastAction>"},
        "<C-[>": {"mapping": "<toNormalMode>"},
        "<C-b>": {"mapping": "<scrollPageUp>"},
        "<C-c>": {"mapping": "<p.copyText>"},
        "<C-d>": {"mapping": "<p.moveFastDown>"},
        "<C-End>": {"mapping": "<p.endOfPage>"},
        "<C-f>": {"mapping": "<scrollPageDown>"},
        "<C-h>": {"mapping": "<p.moveSlowLeft>"},
        "<C-Home>": {"mapping": "<p.startOfPage>"},
        "<C-j>": {"mapping": "<p.moveSlowDown>"},
        "<C-k>": {"mapping": "<p.moveSlowUp>"},
        "<C-kEnd>": {"mapping": "<p.endOfPage>"},
        "<C-kHome>": {"mapping": "<p.startOfPage>"},
        "<C-kLeft>": {"mapping": "<p.moveFastLeft>"},
        "<C-kRight>": {"mapping": "<p.moveFastRight>"},
        "<C-l>": {"mapping": "<p.moveSlowRight>"},
        "<C-Left>": {"mapping": "<p.moveFastLeft>"},
        "<C-Right>": {"mapping": "<p.moveFastRight>"},
        "<C-u>": {"mapping": "<p.moveFastUp>"},
        "<Down>": {"mapping": "<p.moveDown>"},
        "<End>": {"mapping": "<p.moveRightMax>"},
        "<Esc>": {"mapping": "<toNormalMode>"},
        "<F7>": {"mapping": "<toNormalMode>"},
        "<Home>": {"mapping": "<p.moveLeftMax>"},
        "<k0>": {"mapping": "<p.moveLeftMax>"},
        "<kDown>": {"mapping": "<p.moveDown>"},
        "<kEnd>": {"mapping": "<p.moveRightMax>"},
        "<kHome>": {"mapping": "<p.moveLeftMax>"},
        "<kLeft>": {"mapping": "<p.moveLeft>"},
        "<kMultiply>": {"mapping": "<p.searchText><toNormalMode>"},
        "<kRight>": {"mapping": "<p.moveRight>"},
        "<kUp>": {"mapping": "<p.moveUp>"},
        "<Left>": {"mapping": "<p.moveLeft>"},
        "<lt>": {"mapping": "<p.scrollLeft>"},
        "<Right>": {"mapping": "<p.moveRight>"},
        "<Up>": {"mapping": "<p.moveUp>"},
        ">": {"mapping": "<p.scrollRight>"},
        "@<Any>": {"mapping": "<runRecording>"},
        "[": {"mapping": "<p.scrollUp>"},
        "]": {"mapping": "<p.scrollDown>"},
        "^": {"mapping": "<p.moveLeftMax>"},
        "a<Any>": {"mapping": "<p.storePos>"},
        "B": {"mapping": "<p.moveFastLeft>"},
        "b": {"mapping": "<p.moveFastLeft>"},
        "c": {"mapping": "<toNormalMode><p.start>"},
        "f": {"mapping": "<startFollowCurrentTab>"},
        "G": {"mapping": "<p.endOfPage>"},
        "gg": {"mapping": "<p.startOfPage>"},
        "H": {"mapping": "<p.startOfView>"},
        "h": {"mapping": "<p.moveLeft>"},
        "J": {"mapping": "<p.scrollDown>"},
        "j": {"mapping": "<p.moveDown>"},
        "K": {"mapping": "<p.scrollUp>"},
        "k": {"mapping": "<p.moveUp>"},
        "L": {"mapping": "<p.endOfView>"},
        "l": {"mapping": "<p.moveRight>"},
        "M": {"mapping": "<p.centerOfView>"},
        "o": {"mapping": "<p.swapPosition>"},
        "q": {"mapping": "<stopRecording><:nmap q<Any> <:nunmap q<Any>>"
            + "<:punmap q<Any>><:vunmap q<Any>><:nunmap q<C-[>><:punmap q<C-[>>"
            + "<:vunmap q<C-[>><:nunmap q<Esc>><:punmap q<Esc>><:vunmap q<Esc>>"
            + "<startRecording>><:pmap q<Any> <:nunmap q<Any>>"
            + "<:punmap q<Any>><:vunmap q<Any>><:nunmap q<C-[>><:punmap q<C-[>>"
            + "<:vunmap q<C-[>><:nunmap q<Esc>><:punmap q<Esc>><:vunmap q<Esc>>"
            + "<startRecording>><:vmap q<Any> <:nunmap q<Any>>"
            + "<:punmap q<Any>><:vunmap q<Any>><:nunmap q<C-[>><:punmap q<C-[>>"
            + "<:vunmap q<C-[>><:nunmap q<Esc>><:punmap q<Esc>><:vunmap q<Esc>>"
            + "<startRecording>>"
            + "<:nmap q<C-[> <nop>><:pmap q<C-[> <nop>><:vmap q<C-[> <nop>>"
            + "<:nmap q<Esc> <nop>><:pmap q<Esc> <nop>><:vmap q<Esc> <nop>>"},
        "q<Any>": {"mapping": "<:nunmap q<Any>><:punmap q<Any>>"
            + "<:vunmap q<Any>><:nunmap q<C-[>><:punmap q<C-[>>"
            + "<:vunmap q<C-[>><:nunmap q<Esc>><:punmap q<Esc>>"
            + "<:vunmap q<Esc>><startRecording>"},
        "q<C-[>": {"mapping": "<nop>"},
        "q<Esc>": {"mapping": "<nop>"},
        "r": {"mapping": "<p.rightClick>"},
        "s": {"mapping": "<p.moveToMouse>"},
        "td": {"mapping": "<p.downloadText><toNormalMode>"},
        "tn": {"mapping": "<p.newtabText>"},
        "to": {"mapping": "<p.openText><toNormalMode>"},
        "tS": {"mapping": "<p.splitText>"},
        "ts": {"mapping": "<p.searchText><toNormalMode>"},
        "tV": {"mapping": "<p.vsplitText>"},
        "tx": {"mapping": "<p.externalText><toNormalMode>"},
        "ty": {"mapping": "<p.copyText><toNormalMode>"},
        "W": {"mapping": "<p.moveFastRight>"},
        "w": {"mapping": "<p.moveFastRight>"},
        "y": {"mapping": "<p.copyText><toNormalMode>"},
        "zH": {"mapping": "<scrollPageLeft>"},
        "zh": {"mapping": "<scrollLeft>"},
        "zL": {"mapping": "<scrollPageRight>"},
        "zl": {"mapping": "<scrollRight>"}
    }
}
const globalDefaultMappings = {
    "<A-0>": {"mapping": "<:buffer -1>"},
    "<A-1>": {"mapping": "<:buffer 0>"},
    "<A-2>": {"mapping": "<:buffer 1>"},
    "<A-3>": {"mapping": "<:buffer 2>"},
    "<A-4>": {"mapping": "<:buffer 3>"},
    "<A-5>": {"mapping": "<:buffer 4>"},
    "<A-6>": {"mapping": "<:buffer 5>"},
    "<A-7>": {"mapping": "<:buffer 6>"},
    "<A-8>": {"mapping": "<:buffer 7>"},
    "<A-9>": {"mapping": "<:buffer 8>"},
    "<A-F4>": {"mapping": "<:quitall>"},
    "<A-Left>": {"mapping": "<backInHistory>"},
    "<A-m>": {"mapping": "<:mute>"},
    "<A-p>": {"mapping": "<:pin>"},
    "<A-Right>": {"mapping": "<forwardInHistory>"},
    "<C-0>": {"mapping": "<zoomReset>"},
    "<C-+>": {"mapping": "<zoomIn>"},
    "<C-->": {"mapping": "<zoomOut>"},
    "<C-=>": {"mapping": "<zoomIn>"},
    "<C-_>": {"mapping": "<zoomOut>"},
    "<C-F4>": {"mapping": "<:close>"},
    "<C-F5>": {"mapping": "<refreshTabWithoutCache>"},
    "<C-H>": {"mapping": "<:history>"},
    "<C-I>": {"mapping": "<:devtools>"},
    "<C-J>": {"mapping": "<:downloads>"},
    "<C-k0>": {"mapping": "<zoomReset>"},
    "<C-m>": {"mapping": "<menuOpen>"},
    "<C-PageDown>": {"mapping": "<nextTab>"},
    "<C-PageUp>": {"mapping": "<previousTab>"},
    "<C-q>": {"mapping": "<:quit>"},
    "<C-S-End>": {"mapping": "<moveTabEnd>"},
    "<C-S-Home>": {"mapping": "<moveTabStart>"},
    "<C-S-kPageDown>": {"mapping": "<moveTabForward>"},
    "<C-S-kPageUp>": {"mapping": "<moveTabBackward>"},
    "<C-S-PageDown>": {"mapping": "<moveTabForward>"},
    "<C-S-PageUp>": {"mapping": "<moveTabBackward>"},
    "<C-S-Tab>": {"mapping": "<previousTab>"},
    "<C-T>": {"mapping": "<reopenTab>"},
    "<C-Tab>": {"mapping": "<nextTab>"},
    "<C-Y>": {"mapping": "<:downloads>"},
    "<ContextMenu>": {"mapping": "<menuOpen>"},
    "<F1>": {"mapping": "<:help>"},
    "<F2>": {"mapping": "<toCommandMode>"},
    "<F3>": {"mapping": "<toSearchMode>"},
    "<F4>": {"mapping": "<startFollowCurrentTab>"},
    "<F5>": {"mapping": "<refreshTab>"},
    "<F6>": {"mapping": "<toExploreMode>"},
    "<F7>": {"mapping": "<p.start>"},
    "<F8>": {"mapping": "<:internaldevtools>"},
    "<F9>": {"mapping": "<nop>"},
    "<F10>": {"mapping": "<toggleAlwaysOnTop>"},
    "<F11>": {"mapping": "<toggleFullscreen>"},
    "<F12>": {"mapping": "<:devtools>"}
}
Object.keys(defaultBindings).forEach(mode => {
    Object.keys(globalDefaultMappings).forEach(key => {
        if (!defaultBindings[mode][key]) {
            defaultBindings[mode][key] = globalDefaultMappings[key]
        }
    })
})
let repeatCounter = 0
let recursiveCounter = 0
let pressedKeys = ""
/** @type {import("./common").RunSource} */
let keyboardEventSource = "user"
/** @type {typeof defaultBindings} */
let bindings = JSON.parse(JSON.stringify(defaultBindings))
/** @type {string[]} */
let supportedActions = []
/** @type {number|null} */
let timeoutTimer = null
let blockNextInsertKey = false
let inputHistoryList = [{"index": 0, "value": ""}]
let inputHistoryIndex = 0
/** @type {string|null} */
let lastActionInMapping = null
/** @type {{mapStr: string, recursive: boolean}|null} */
let lastExecutedMapstring = null
/** @type {false|"position"|"size"} */
let draggingScreenshotFrame = false
let lastScreenshotX = 0
let lastScreenshotY = 0
/** @type {number|null} */
let suggestionTimer = null
let hadModifier = false
/** @type {string|null} */
let recordingName = null
let recordingString = ""
const keyNames = [
    {"js": ["<"], "vim": ["lt"]},
    {"js": ["Backspace"], "vim": ["BS"]},
    {
        "electron": "Return",
        "js": ["Enter", "\u000d"],
        "vim": ["CR", "NL", "Return", "Enter"]
    },
    {"js": ["|"], "vim": ["Bar"]},
    {"js": ["\\"], "vim": ["Bslash"]},
    {"electron": "Left", "js": ["ArrowLeft"], "vim": ["Left"]},
    {"electron": "Right", "js": ["ArrowRight"], "vim": ["Right"]},
    {"electron": "Up", "js": ["ArrowUp"], "vim": ["Up"]},
    {"electron": "Down", "js": ["ArrowDown"], "vim": ["Down"]},
    {"js": ["Escape", "Esc"], "vim": ["Esc"]},
    {"electron": "Space", "js": [" "], "vim": ["Space", " "]},
    {"js": ["Delete", "\u0000"], "vim": ["Del"]},
    {"js": ["PrintScreen"], "vim": ["PrintScreen", "PrtScr"]},
    {"js": ["Control"], "vim": ["Ctrl"]},
    {"electron": "Numlock", "js": ["NumLock"], "vim": ["NumLock"]},
    {"electron": "Capslock", "js": ["CapsLock"], "vim": ["CapsLock"]},
    {"electron": "Scrollock", "js": ["ScrollLock"], "vim": ["ScrollLock"]},
    {"electron": "Contextmenu", "js": ["ContextMenu"], "vim": ["ContextMenu"]},
    // Numpad keys
    {"electron": "Left", "js": ["kArrowLeft"], "vim": ["kLeft"]},
    {"electron": "Right", "js": ["kArrowRight"], "vim": ["kRight"]},
    {"electron": "Up", "js": ["kArrowUp"], "vim": ["kUp"]},
    {"electron": "Down", "js": ["kArrowDown"], "vim": ["kDown"]},
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
    // Fictional keys with custom implementation
    {"js": ["Any"], "vim": ["Any"]}
]
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
    "pageRSSLinkToClipboard",
    "pageRSSLinksList",
    "pageToClipboard",
    "pageTitleToClipboard",
    "pageToClipboardEmacs",
    "pageToClipboardHTML",
    "pageToClipboardMarkdown",
    "pageToClipboardRST",
    "pasteText",
    "openFromClipboard",
    "openLinkExternal",
    "downloadLink",
    "toggleAlwaysOnTop",
    "toggleFullscreen",
    "makeMark",
    "restoreMark",
    "storeScrollPos",
    "restoreScrollPos",
    "startRecording",
    "stopRecording",
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
    "p.copyTitleAttr",
    "p.copyPageTitle",
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

/** Reset the screenshot drag state after a small timeout. */
const resetScreenshotDrag = () => setTimeout(() => {
    draggingScreenshotFrame = false
}, 10)

/** Update the suggestions depending on current mode. */
const updateSuggestions = () => {
    const url = getUrl()
    if (!url) {
        return
    }
    const mode = currentMode()
    if (mode === "explore") {
        const {suggestExplore} = require("./suggest")
        suggestExplore(url.value)
    } else if (mode === "command") {
        const {suggestCommand} = require("./suggest")
        suggestCommand(url.value)
    } else if (mode === "search" && getSetting("incsearch")) {
        ACTIONS.incrementalSearch({"src": "other"})
    }
}

/**
 * Request an update to the suggestions with debounce and input history.
 * @param {boolean} updateHistory
 */
const requestSuggestUpdate = (updateHistory = true) => {
    const url = getUrl()
    const suggestBounceDelay = getSetting("suggestbouncedelay")
    if (updateHistory) {
        if (url?.value !== inputHistoryList[inputHistoryIndex]?.value) {
            inputHistoryList = inputHistoryList.slice(0, inputHistoryIndex + 1)
            inputHistoryIndex = inputHistoryList.length
            const start = Number(url?.selectionStart)
            inputHistoryList.push({"index": start, "value": url?.value ?? ""})
        }
    }
    if (!suggestionTimer) {
        updateSuggestions()
    }
    if (suggestBounceDelay) {
        window.clearTimeout(suggestionTimer ?? undefined)
        suggestionTimer = window.setTimeout(() => {
            suggestionTimer = null
            updateSuggestions()
        }, suggestBounceDelay)
    }
}

/**
 * Move the screenshot frame to a new position.
 * @param {number} x
 * @param {number} y
 */
const moveScreenshotFrame = (x, y) => {
    const deltaX = x - lastScreenshotX
    const deltaY = y - lastScreenshotY
    if (getMouseConf("screenshotframe") && draggingScreenshotFrame) {
        const url = getUrl()
        const dims = url?.value.split(" ").find(
            arg => arg?.match(/^[0-9,]+$/g))
        const dimsIndex = url?.value.split(" ").indexOf(dims ?? "") ?? 1
        if (currentMode() !== "command" || !currentPage()) {
            return
        }
        const pageHeight = Number(currentPage()?.style.height.split(/[.px]/g)[0])
        const pageWidth = Number(currentPage()?.style.width.split(/[.px]/g)[0])
        const rect = {
            "height": Number(dims?.split(",")[1] ?? pageHeight),
            "width": Number(dims?.split(",")[0] ?? pageWidth),
            "x": Number(dims?.split(",")[2] ?? 0),
            "y": Number(dims?.split(",")[3] ?? 0)
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
        if (rect.x > pageWidth) {
            rect.x = pageWidth
        }
        if (rect.y > pageHeight) {
            rect.y = pageHeight
        }
        if (rect.width === 0 || rect.width > pageWidth - rect.x) {
            rect.width = pageWidth - rect.x
        }
        if (rect.height === 0 || rect.height > pageHeight - rect.y) {
            rect.height = pageHeight - rect.y
        }
        const newDims = `${rect.width},${rect.height},${rect.x},${rect.y}`
        if (dims && url) {
            url.value = url.value.split(" ").map((v, i) => {
                if (i === dimsIndex) {
                    return newDims
                }
                return v
            }).join(" ")
        } else if (url) {
            url.value = `${url.value.split(" ").slice(0, 2)
                .filter(t => t).join(" ")} ${newDims}`
        }
        updateScreenshotHighlight()
        requestSuggestUpdate()
    }
    lastScreenshotX = x
    lastScreenshotY = y
}

/** Update the scroll position in the navbar while typing. */
const updateNavbarScrolling = () => {
    const url = getUrl()
    if (!url) {
        return
    }
    const charWidth = getSetting("guifontsize") * 0.60191
    const end = (url.selectionStart ?? 0) * charWidth - charWidth
    const start = (url.selectionEnd ?? 0) * charWidth
        - url.clientWidth + charWidth + 2
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

/**
 * Execute the cut clipboard action on the url.
 * @param {Event|null} event
 */
const cutInput = (event = null) => {
    event?.preventDefault()
    let selection = document.getSelection()?.toString() ?? ""
    if (currentMode() === "explore" && isUrl(selection)) {
        selection = selection.replace(/ /g, "%20")
    }
    const {clipboard} = require("electron")
    clipboard.writeText(selection)
    const url = getUrl()
    if (!url) {
        return
    }
    const cur = Number(url.selectionStart)
    const end = Number(url.selectionEnd)
    url.value = url.value.slice(0, cur) + url.value.slice(end)
    url.setSelectionRange(cur, cur)
    requestSuggestUpdate()
    updateNavbarScrolling()
}

/**
 * Execute the copy clipboard action on the url.
 * @param {Event|null} event
 */
const copyInput = (event = null) => {
    event?.preventDefault()
    let selection = document.getSelection()?.toString() ?? ""
    if (currentMode() === "explore" && isUrl(selection)) {
        selection = selection.replace(/ /g, "%20")
    }
    const {clipboard} = require("electron")
    clipboard.writeText(selection)
}

/**
 * Execute the paste clipboard action on the url.
 * @param {Event|null} event
 */
const pasteInput = (event = null) => {
    event?.preventDefault()
    const url = getUrl()
    if (!url) {
        return
    }
    const cur = Number(url.selectionStart)
    const end = Number(url.selectionEnd)
    const {clipboard} = require("electron")
    const pastedText = clipboard.readText()
    url.value = url.value.slice(0, cur) + pastedText + url.value.slice(end)
    url.setSelectionRange(cur + pastedText.length, cur + pastedText.length)
    requestSuggestUpdate()
    updateNavbarScrolling()
}

/**
 * Convert a keyboard event to a Vieb key name.
 * @param {(KeyboardEvent  & {passedOnFromInsert?: false})|{
 *   altKey: boolean
 *   ctrlKey: boolean,
 *   isTrusted: boolean,
 *   key: string,
 *   location: string,
 *   metaKey: boolean,
 *   passedOnFromInsert: true,
 *   preventDefault: () => undefined,
 *   shiftKey: boolean
 *   isComposing?: boolean
 *   which?: string
 *   bubbles?: boolean
 * }} e
 */
const toIdentifier = e => {
    let keyCode = e.key
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
    const needsShift = keyCode.length > 1 && !["Bar", "lt"].includes(keyCode)
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

/**
 * Split the mapstring by key.
 * @param {string} mapStr
 */
const splitMapString = mapStr => {
    const maps = []
    let bracketCounter = 0
    let temp = ""
    for (const char of mapStr.split("")) {
        if (char === "<") {
            bracketCounter += 1
        }
        if (char === ">") {
            const isKey = temp.startsWith("<") && !temp.startsWith("<:")
            const isNotMinus = temp.endsWith("-") && !temp.endsWith("--")
            if ((!isKey || !isNotMinus) && bracketCounter > 0) {
                bracketCounter -= 1
            }
        }
        if (bracketCounter) {
            temp += char
        } else {
            maps.push(temp + char)
            temp = ""
        }
    }
    return {"leftover": temp, maps, "valid": bracketCounter === 0 && !temp}
}

/**
 * Get JS (or optionally Electron) name for a Vim mapped key.
 * @param {string} identifier
 * @param {boolean} electronNames
 */
const fromIdentifier = (identifier, electronNames = true) => {
    let id = splitMapString(identifier).maps[0] ?? identifier
    /** @type {{
     * modifiers: string[],
     * ctrlKey?: boolean, control?: boolean,
     * metaKey?: boolean, meta?: boolean,
     * altKey?: boolean, alt?: boolean,
     * shiftKey?: boolean, shift?: boolean,
     * }}
     */
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
        options.shift = true
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
    return {...options, "key": id}
}

/**
 * Find suitable mappings for a set of keys.
 * @param {string} actionKeys
 * @param {string} mode
 * @param {boolean} future
 */
const findMaps = (actionKeys, mode, future = false) => {
    const keys = splitMapString(actionKeys).maps
    return Object.keys(bindings[mode[0]]).filter(m => {
        const mapKeys = splitMapString(m).maps
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
    }).sort((a, b) => splitMapString(a).maps.indexOf("<Any>")
        - splitMapString(b).maps.indexOf("<Any>"))
}

/**
 * Check if there are future actions in the current mode for a set of keys.
 * @param {string} keys
 */
const hasFutureActions = keys => findMaps(keys, currentMode(), true).length

/** Update the keys listed on screen, mapsuggest, repeater and recordings. */
const updateKeysOnScreen = () => {
    const repeatCounterEl = document.getElementById("repeat-counter")
    const pressedKeysEl = document.getElementById("pressed-keys")
    const recordNameEl = document.getElementById("record-name")
    if (!repeatCounterEl || !pressedKeysEl || !recordNameEl) {
        return
    }
    repeatCounterEl.textContent = `${repeatCounter}`
    pressedKeysEl.textContent = pressedKeys
    recordNameEl.textContent = `recording @${recordingName}`
    if (repeatCounter && getSetting("showcmd")) {
        repeatCounterEl.style.display = "flex"
    } else {
        repeatCounterEl.style.display = "none"
    }
    if (pressedKeys && getSetting("showcmd")) {
        pressedKeysEl.style.display = "flex"
    } else {
        pressedKeysEl.style.display = "none"
    }
    if (recordingName && getSetting("showcmd")) {
        recordNameEl.style.display = "flex"
    } else {
        recordNameEl.style.display = "none"
    }
    const mapsuggestcount = getSetting("mapsuggest")
    const mapsuggestElement = document.getElementById("mapsuggest")
    if (mapsuggestElement) {
        mapsuggestElement.style.display = "none"
    }
    const {active} = require("./contextmenu")
    if (mapsuggestcount > 0 && mapsuggestElement) {
        const mapsuggestPosition = getSetting("mapsuggestposition")
        mapsuggestElement.className = mapsuggestPosition
        mapsuggestElement.textContent = ""
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
                singleSuggestion.append(alreadyDone.cloneNode(true))
                const nextKeys = document.createElement("span")
                nextKeys.textContent = action.next
                nextKeys.className = "warning"
                singleSuggestion.append(nextKeys)
                const resultAction = document.createElement("span")
                resultAction.textContent = action.result
                resultAction.className = "info"
                singleSuggestion.append(resultAction)
                mapsuggestElement.append(singleSuggestion)
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
        blockedKeys.map(key => fromIdentifier(
            splitMapString(key).maps[0], false)))
}

/**
 * Find the right action for a set of keys in the current mode.
 * @param {string} keys
 */
const actionForKeys = keys => {
    const {active} = require("./contextmenu")
    const allMenu = findMaps(keys, "menu")
    const menuAction = bindings.m[allMenu[0]]
    if (active() && menuAction) {
        return menuAction
    }
    const allCurrent = findMaps(keys, currentMode())
    return bindings[currentMode()[0]][allCurrent[0]]
}

/**
 * Send an input key to the webview.
 * @param {{
 *   modifiers: string[], bubbles?: boolean,
 *   ctrlKey?: boolean, control?: boolean,
 *   metaKey?: boolean, meta?: boolean,
 *   altKey?: boolean, alt?: boolean,
 *   shiftKey?: boolean, shift?: boolean,
 *   key: string
 * }} options
 * @param {string} mapStr
 * @param {import("./common").RunSource} src
 */
const sendKeysToWebview = async(options, mapStr, src) => {
    if (recordingName) {
        recordingString += mapStr
    }
    blockNextInsertKey = true
    sendToPageOrSubFrame("send-keyboard-event", options)
    if (options.bubbles) {
        const action = actionForKeys(mapStr)
        if (action) {
            /* eslint-disable-next-line no-use-before-define */
            await executeMapString(action.mapping, !action.noremap, {src})
        }
    }
    await new Promise(r => {
        setTimeout(r, 3)
    })
}

/**
 * Execute a action by action name, optionally multiple times.
 * @param {string} actionName
 * @param {{
 *   givenCount?: number,
 *   key?: string|undefined,
 *   src: import("./common").RunSource
 * }} opts
 */
const doAction = async(actionName, opts) => {
    let actionCount = opts.givenCount || 1
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
            // @ts-expect-error funcName is plenty checked before being called
            await POINTER[funcName]({
                hadModifier, "key": opts.key, "src": opts.src
            })
        } else {
            // @ts-expect-error funcName is plenty checked before being called
            await ACTIONS[funcName]({
                hadModifier, "key": opts.key, "src": opts.src
            })
        }
    }
    if (!funcName.startsWith("menu") && funcName !== "nop") {
        const {clear} = require("./contextmenu")
        clear()
    }
    repeatCounter = 0
}

/**
 * Execute a provided mapstring as if it was pressed.
 * @param {string} mapStr
 * @param {boolean} recursive
 * @param {{
 *   initial?: boolean,
 *   src: import("./common").RunSource
 * }} opts
 */
const executeMapString = async(mapStr, recursive, opts) => {
    const actionCallKey = splitMapString(pressedKeys).maps.at(-1)
    if (opts.initial) {
        keyboardEventSource = opts.src
        if (recordingName) {
            if (repeatCounter > 1) {
                recordingString += repeatCounter
            }
            recordingString += mapStr
        }
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
    if (opts.initial && repeatCounter) {
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
        for (const key of splitMapString(mapStr).maps) {
            if (recursiveCounter > getSetting("maxmapdepth")) {
                break
            }
            if (supportedActions.includes(key.replace(/(^<|>$)/g, ""))) {
                const count = Number(repeatCounter)
                repeatCounter = 0
                await doAction(key.replace(/(^<|>$)/g, ""), {
                    "givenCount": count, "key": actionCallKey, "src": opts.src
                })
                await new Promise(r => {
                    setTimeout(r, 3)
                })
                continue
            } else if (key.startsWith("<:")) {
                const {execute} = require("./command")
                execute(key.replace(/^<:|>$/g, ""), {"src": opts.src})
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
                await sendKeysToWebview(options, key, opts.src)
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
        await new Promise(r => {
            setTimeout(r, 3)
        })
    }
    if (opts.initial) {
        setTimeout(() => {
            blockNextInsertKey = false
        }, 100)
        recursiveCounter = 0
        keyboardEventSource = "user"
        repeatCounter = 0
        pressedKeys = ""
        lastActionInMapping = null
        updateKeysOnScreen()
    }
}

/**
 * Repeat the last run action.
 * @param {import("./common").RunSource} src
 */
const repeatLastAction = src => {
    if (lastExecutedMapstring) {
        executeMapString(lastExecutedMapstring.mapStr,
            lastExecutedMapstring.recursive, {"initial": true, src})
    }
}

/**
 * Check an addition key if using mac and get the right one.
 * @param {string[]} regular
 * @param {string[]} mac
 * @param {string} key
 */
const keyForOs = (regular, mac, key) => regular.includes(key)
    || process.platform === "darwin" && mac.includes(key)

/** Reset the input history to the default no history state. */
const resetInputHistory = () => {
    inputHistoryList = [{"index": 0, "value": ""}]
    inputHistoryIndex = 0
}

/**
 * Type any character into the navbar as if typed.
 * @param {string} character
 * @param {boolean} force
 */
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
    if (recordingName) {
        recordingString += id
    }
    const url = getUrl()
    if (!url) {
        return
    }
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
        if (url.selectionEnd !== null
            && url.selectionEnd < url.value.length) {
            url.selectionEnd += 1
        }
        url.selectionStart = url.selectionEnd
        updateNavbarScrolling()
        return
    }
    if (id === "<S-Right>") {
        if (url.selectionStart === url.selectionEnd
            && url.selectionStart !== null && url.selectionEnd !== null) {
            url.setSelectionRange(url.selectionStart, url.selectionEnd + 1)
        } else if (url.selectionDirection !== "backward") {
            if (url.selectionEnd !== null
                && url.selectionEnd < url.value.length) {
                url.selectionEnd += 1
            }
        } else if (url.selectionStart !== null
            && url.selectionStart < url.value.length) {
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
        if (url.selectionStart !== null && url.selectionStart > 0) {
            url.selectionStart -= 1
        }
        url.selectionEnd = url.selectionStart
        updateNavbarScrolling()
        return
    }
    if (id === "<S-Left>") {
        if (url.selectionStart === url.selectionEnd
            && url.selectionStart !== null && url.selectionEnd !== null) {
            url.setSelectionRange(url.selectionStart - 1,
                url.selectionEnd, "backward")
        } else if (url.selectionDirection === "backward") {
            if (url.selectionStart !== null && url.selectionStart > 0) {
                url.selectionStart -= 1
            }
        } else if (url.selectionEnd !== null && url.selectionEnd > 0) {
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
                } else if (url.selectionStart !== null) {
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
    if (keyForOs(["<C-x>", "<S-Del>"], ["<M-x>"], id)) {
        cutInput()
        return
    }
    if (keyForOs(["<C-c>", "<C-Insert>"], ["<M-c>"], id)) {
        copyInput()
        return
    }
    if (keyForOs(["<C-v>", "<S-Insert>"], ["<M-v>"], id)) {
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
    if (url.selectionStart !== url.selectionEnd
        && url.selectionStart !== null && url.selectionEnd !== null) {
        if (!["<Bar>", "<Bslash>", "<lt>", "<Space>"].includes(id)) {
            if (id.length !== 1) {
                if (id !== "<Del>" && !id.endsWith("-Del>")) {
                    if (id !== "<BS>" && !id.endsWith("-BS>")) {
                        return
                    }
                }
            }
        }
        const cur = Number(url.selectionStart)
        url.value = url.value.substring(0, url.selectionStart)
            + url.value.substring(url.selectionEnd)
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
        if (url.selectionStart !== null && url.selectionEnd !== null) {
            if (url.selectionEnd < url.value.length) {
                const cur = Number(url.selectionStart)
                url.value = `${url.value.substring(0, url.selectionStart)}${
                    url.value.substring(url.selectionEnd + 1)}`
                url.setSelectionRange(cur, cur)
                requestSuggestUpdate()
                updateNavbarScrolling()
            }
        }
        return
    }
    if (keyForOs(["<C-Del>", "<C-S-Del>"], [], id)) {
        let wordPosition = 0
        for (const word of words) {
            wordPosition += word.length
            if (url.selectionStart !== null
                && wordPosition > url.selectionStart) {
                const cur = Number(url.selectionStart)
                url.value = `${url.value.substring(0, url.selectionStart)}${
                    url.value.substring(wordPosition)}`
                url.setSelectionRange(cur, cur)
                requestSuggestUpdate()
                updateNavbarScrolling()
                return
            }
        }
        return
    }
    if (id === "<BS>" || id === "<S-BS>") {
        if (url.selectionStart !== null && url.selectionEnd !== null
            && url.selectionStart > 0) {
            const cur = Number(url.selectionStart)
            url.value = `${url.value.substring(0, url.selectionStart - 1)}${
                url.value.substring(url.selectionEnd)}`
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
            if (url.selectionStart !== null
                && wordPosition < url.selectionStart) {
                url.value = `${url.value.substring(0, wordPosition)}${
                    url.value.substring(url.selectionStart)}`
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
    if (id.length === 1
        && url.selectionStart !== null && url.selectionEnd !== null) {
        url.value = `${url.value.substring(0, url.selectionStart)}${id}${
            url.value.substring(url.selectionEnd)}`
    }
    if (id === "<lt>"
        && url.selectionStart !== null && url.selectionEnd !== null) {
        url.value = `${url.value.substring(0, url.selectionStart)}<${
            url.value.substring(url.selectionEnd)}`
    }
    if (id === "<Bar>"
        && url.selectionStart !== null && url.selectionEnd !== null) {
        url.value = `${url.value.substring(0, url.selectionStart)}|${
            url.value.substring(url.selectionEnd)}`
    }
    if (id === "<Bslash>"
        && url.selectionStart !== null && url.selectionEnd !== null) {
        url.value = `${url.value.substring(0, url.selectionStart)}\\${
            url.value.substring(url.selectionEnd)}`
    }
    if ((id === "<Space>" || id === "<S-Space>")
        && url.selectionStart !== null && url.selectionEnd !== null) {
        url.value = `${url.value.substring(0, url.selectionStart)} ${
            url.value.substring(url.selectionEnd)}`
    }
    if (text !== url.value) {
        url.setSelectionRange(cur + 1, cur + 1)
        requestSuggestUpdate()
        updateNavbarScrolling()
    }
}

/**
 * Fast check if an object is empty or not.
 * @param {object} obj
 */
const isEmptyObject = obj => {
    // This is the fastest way, but not very elegant sadly
    // eslint-disable-next-line
    for (const _ in obj) {
        return false
    }
    return true
}

/**
 * Sanitize any mapstring to the shortest valid version.
 * @param {import("./common").RunSource} src
 * @param {string} mapString
 * @param {boolean} allowSpecials
 */
const sanitiseMapString = (src, mapString, allowSpecials = false) => {
    const {leftover, maps, valid} = splitMapString(mapString)
    if (!valid) {
        notify({
            "fields": [mapString, leftover],
            "id": "mappings.errors.unmatched",
            src,
            "type": "warning"
        })
        return ""
    }
    return maps.map(m => {
        if (m === ">") {
            return ">"
        }
        let key = m
        /** @type {string[]} */
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
            if (name.vim.some(vk => vk.toUpperCase() === key.toUpperCase())) {
                [key] = name.vim
                knownKey = true
                break
            }
        }
        if (!knownKey && key.length > 1) {
            notify({
                "fields": [key],
                "id": "mappings.errors.unsupported",
                src,
                "type": "warning"
            })
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
}

/**
 * Handle all keyboard input.
 * @param {(KeyboardEvent  & {passedOnFromInsert?: false})|{
 *   altKey: boolean
 *   ctrlKey: boolean,
 *   isTrusted: boolean,
 *   key: string,
 *   location: string,
 *   metaKey: boolean,
 *   passedOnFromInsert: true,
 *   preventDefault: () => undefined,
 *   shiftKey: boolean
 *   isComposing?: boolean
 *   which?: string
 *   bubbles?: boolean
 * }} e
 */
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
    const matchingMod = getSetting("modifiers").some(
        mod => mod === id || id.endsWith(`-${mod.slice(1, -1)}>`))
    if (matchingMod) {
        return
    }
    const passthroughkeys = getSetting("passthroughkeys")
    if (currentMode() === "normal" && !isEmptyObject(passthroughkeys)) {
        const url = currentPage()?.src ?? ""
        const matchedUrl = Object.keys(passthroughkeys).find(k => url.match(k))
        if (matchedUrl) {
            const keys = splitMapString(passthroughkeys[matchedUrl]).maps
                .map(k => sanitiseMapString(keyboardEventSource, k))
            if (keys.includes(id)) {
                ipcRenderer.sendSync("insert-mode-blockers", "pass")
                const options = {...fromIdentifier(id), "bubbles": false}
                await sendKeysToWebview(options, id, keyboardEventSource)
                blockNextInsertKey = false
                repeatCounter = 0
                updateKeysOnScreen()
                return
            }
        }
    }
    const src = keyboardEventSource
    hadModifier = e.shiftKey || e.ctrlKey
    window.clearTimeout(timeoutTimer ?? undefined)
    const {active, clear} = require("./contextmenu")
    if (getSetting("timeout")) {
        timeoutTimer = window.setTimeout(async() => {
            const keys = splitMapString(pressedKeys).maps
            if (pressedKeys) {
                const ac = actionForKeys(pressedKeys)
                pressedKeys = ""
                if (ac && (e.isTrusted || e.bubbles)) {
                    if (e.isTrusted) {
                        await executeMapString(ac.mapping, !ac.noremap, {
                            "initial": true, src
                        })
                    } else {
                        await executeMapString(ac.mapping, e.bubbles ?? false, {
                            src
                        })
                    }
                    return
                }
                clear()
            }
            if (currentMode() === "insert") {
                ipcRenderer.sendSync("insert-mode-blockers", "pass")
                for (const key of keys) {
                    const options = {...fromIdentifier(key), "bubbles": false}
                    await sendKeysToWebview(options, key, src)
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
    if ("npv".includes(currentMode()[0]) || active()) {
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
            if (!["<C-[>", "<Esc>"].includes(id)) {
                pressedKeys = ""
                await executeMapString(action.mapping, !action.noremap, {
                    "initial": true, src
                })
            }
        }
        pressedKeys += id
    }
    const action = actionForKeys(pressedKeys)
    const hasMenuAction = active() && action
    if (!hasFutureActions(pressedKeys) || hasMenuAction) {
        window.clearTimeout(timeoutTimer ?? undefined)
        if (action && (e.isTrusted || e.bubbles)) {
            if (e.isTrusted) {
                await executeMapString(action.mapping, !action.noremap, {
                    "initial": true, src
                })
            } else {
                await executeMapString(action.mapping, e.bubbles ?? false, {
                    src
                })
            }
            return
        }
        clear()
        let keys = splitMapString(pressedKeys).maps
        pressedKeys = ""
        if (keys.length > 1) {
            if (!hasFutureActions(keys.slice(0, -1).join(""))) {
                keys = keys.slice(0, -1)
            }
            if (currentMode() === "insert") {
                ipcRenderer.sendSync("insert-mode-blockers", "pass")
                for (const key of keys) {
                    const options = {...fromIdentifier(key), "bubbles": false}
                    await sendKeysToWebview(options, key, src)
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
    clear()
    updateKeysOnScreen()
    if (currentMode() === "follow") {
        if (e instanceof KeyboardEvent && e.type === "keydown") {
            const {enterKey} = require("./follow")
            let unshiftedName = String(e.key).toLowerCase()
            if (e.key.toUpperCase() === unshiftedName && hadModifier) {
                const map = await window.navigator.keyboard?.getLayoutMap()
                unshiftedName = map?.get(e.code) ?? unshiftedName
            }
            enterKey(src, unshiftedName, id, hadModifier)
        }
        return
    }
    ACTIONS.setFocusCorrectly()
}

/** List all the supported actions. */
const listSupportedActions = () => supportedActions

/**
 * Check if mapping has been modified compared to the defaults.
 * @param {string} mode
 * @param {string} mapping
 */
const mappingModified = (mode, mapping) => {
    const current = bindings[mode][mapping]
    const original = defaultBindings[mode][mapping]
    if (!current && !original) {
        return false
    }
    if (current && original) {
        if (current.mapping === original.mapping) {
            if (Boolean(current.noremap) === Boolean(original.noremap)) {
                return false
            }
        }
    }
    return true
}

/**
 * List a mapping as if set via a command.
 * @param {import("./common").RunSource} src
 * @param {string} mode
 * @param {boolean} includeDefault
 * @param {string} rawKey
 */
const listMapping = (src, mode, includeDefault, rawKey) => {
    const key = sanitiseMapString(src, rawKey)
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

/**
 * List mappings as a list of map commands.
 * @param {import("./common").RunSource} src
 * @param {string|null} oneMode
 * @param {boolean} includeDefault
 * @param {string[]|null} customKeys
 */
const listMappingsAsCommandList = (
    src, oneMode = null, includeDefault = false, customKeys = null
) => {
    /** @type {string[]} */
    let mappings = []
    let modes = Object.keys(defaultBindings)
    if (oneMode) {
        modes = [oneMode]
    }
    modes.forEach(bindMode => {
        const keys = customKeys
            ?? [...new Set(Object.keys(defaultBindings[bindMode])
                .concat(Object.keys(bindings[bindMode])))]
        for (const key of keys) {
            mappings.push(listMapping(src, bindMode, includeDefault, key))
        }
    })
    if (!oneMode) {
        // Mappings that can be added with a global "map" instead of 1 per mode
        /** @type {string[]} */
        const globalMappings = []
        mappings.filter(m => m.match(/^n(noremap|map|unmap) /g))
            .filter(m => !modes.some(mode => !mappings.includes(
                `${mode}${m.slice(1)}`)))
            .forEach(m => {
                globalMappings.push(m.slice(1))
                mappings = mappings.filter(map => map.slice(1) !== m.slice(1))
            })
        mappings = [...globalMappings, ...mappings]
    }
    return mappings.join("\n").replace(/[\r\n]+/g, "\n").trim()
}

/**
 * Map a single key.
 * @param {import("./common").RunSource} src
 * @param {string|null} mode
 * @param {string[]} args
 * @param {boolean} noremap
 */
const mapSingle = (src, mode, args, noremap) => {
    const mapping = sanitiseMapString(src, args.shift() ?? "")
    const actions = sanitiseMapString(src, args.join(" "), true)
    if (!mapping || !actions) {
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
    updateHelpPage(src)
}

/**
 * Handle the map command, so either list a mapping or set it.
 * @param {import("./common").RunSource} src
 * @param {string|null} mode
 * @param {string[]} args
 * @param {boolean} noremap
 * @param {boolean} includeDefault
 */
const mapOrList = (
    src, mode, args, noremap = false, includeDefault = false
) => {
    if (includeDefault && args.length > 1) {
        notify({"id": "mappings.errors.overwritten", src, "type": "warning"})
        return
    }
    if (args.length === 0) {
        const mappings = listMappingsAsCommandList(src, mode, includeDefault)
        if (mappings) {
            notify({"fields": [mappings], "id": "mappings.list", src})
        } else if (includeDefault) {
            notify({"id": "mappings.noMappings", src})
        } else {
            notify({"id": "mappings.defaultMapping", src})
        }
        return
    }
    if (args.length === 1) {
        if (mode) {
            const mapping = listMappingsAsCommandList(
                src, mode, includeDefault, [args[0]]).trim()
            if (mapping) {
                notify({"fields": [mapping], "id": "mappings.list", src})
            } else if (includeDefault) {
                notify({
                    "fields": [args[0]], "id": "mappings.noMappingsForKey", src
                })
            } else {
                notify({
                    "fields": [args[0]],
                    "id": "mappings.defaultMappingForKey",
                    src
                })
            }
        } else {
            let mappings = listMappingsAsCommandList(
                src, null, includeDefault, [args[0]])
            mappings = mappings.replace(/[\r\n]+/g, "\n").trim()
            if (mappings) {
                notify({"fields": [mappings], "id": "mappings.list", src})
            } else if (includeDefault) {
                notify({
                    "fields": [args[0]], "id": "mappings.noMappingsForKey", src
                })
            } else {
                notify({
                    "fields": [args[0]],
                    "id": "mappings.defaultMappingForKey",
                    src
                })
            }
        }
        return
    }
    mapSingle(src, mode, args, noremap)
}

/**
 * Unmap a specific key.
 * @param {import("./common").RunSource} src
 * @param {string|null} mode
 * @param {string[]} args
 * @param {boolean} anyAsWildcard
 */
const unmap = (src, mode, args, anyAsWildcard) => {
    if (args.length !== 1) {
        notify({
            "fields": [mode ?? ""],
            "id": "mappings.errors.unmapArgCount",
            src,
            "type": "warning"
        })
        return
    }
    const mapStr = sanitiseMapString(src, args[0])
    if (!mapStr) {
        return
    }
    const keys = splitMapString(mapStr).maps
    Object.keys(bindings).forEach(bindMode => {
        if (mode && mode !== bindMode) {
            return
        }
        if (anyAsWildcard) {
            Object.keys(bindings[bindMode]).forEach(map => {
                const mapKeys = splitMapString(map).maps
                const sameKeys = mapKeys.every((key, index) => key
                    === keys[index] || keys[index] === "<Any>")
                const sameKeyLen = mapKeys.length === keys.length
                if (sameKeys && sameKeyLen) {
                    delete bindings[bindMode][map]
                }
            })
        } else {
            delete bindings[bindMode][mapStr]
        }
    })
    const {updateHelpPage} = require("./settings")
    updateHelpPage(src)
}

/**
 * Clear all mappings to default or wipe them completely, optionally per mode.
 * @param {import("./common").RunSource} src
 * @param {string|null} mode
 * @param {boolean} removeDefaults
 */
const clearmap = (src, mode, removeDefaults = false) => {
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
    updateHelpPage(src)
}

/**
 * Start a macro recording by key name.
 * @param {string} name
 * @param {import("./common").RunSource} src
 */
const startRecording = (name, src) => {
    if (recordingName) {
        notify({"id": "actions.alreadyRecording", src, "type": "warning"})
        return
    }
    recordingName = name
    recordingString = ""
}

/**
 * Stop the current macro recording.
 */
const stopRecording = () => {
    if (!recordingName) {
        return
    }
    let stoppedRecording = false
    const record = {
        "name": recordingName,
        "string": splitMapString(recordingString).maps.filter(k => {
            if (k === "<stopRecording>" || stoppedRecording) {
                stoppedRecording = true
                return false
            }
            return k !== "<startRecording>"
        }).join("")
    }
    recordingName = null
    if (!record.string) {
        return
    }
    return record
}

/** Setup all input listeners for both keyboard and mouse across the app. */
const init = () => {
    window.addEventListener("keydown", handleKeyboard)
    window.addEventListener("keypress", e => e.preventDefault())
    window.addEventListener("keyup", e => e.preventDefault())
    window.addEventListener("mousedown", e => {
        if (currentMode() === "insert" && getMouseConf("leaveinsert")) {
            if (!e.composedPath().some(n => matchesQuery(n, "#context-menu"))) {
                ACTIONS.toNormalMode()
            }
        }
        if (e.button === 3) {
            if (getMouseConf("history")) {
                ACTIONS.backInHistory({"src": "user"})
            }
            e.preventDefault()
            return
        }
        if (e.button === 4) {
            if (getMouseConf("history")) {
                ACTIONS.forwardInHistory({"src": "user"})
            }
            e.preventDefault()
            return
        }
        if (e.button === 1) {
            e.preventDefault()
        }
        const selector = "#screenshot-highlight"
        if (e.composedPath().some(n => matchesQuery(n, selector))) {
            if (getMouseConf("screenshotframe")) {
                if (e.button === 0) {
                    draggingScreenshotFrame = "position"
                } else {
                    draggingScreenshotFrame = "size"
                }
                e.preventDefault()
            }
        }
        if (e.target === getUrl()) {
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
    document.getElementById("tabs")?.addEventListener("dblclick", e => {
        if (getMouseConf("newtab")) {
            const {addTab} = require("./tabs")
            addTab({"src": "user"})
        } else {
            e.preventDefault()
        }
        ACTIONS.setFocusCorrectly()
    })
    window.addEventListener("wheel", ev => {
        if (ev.composedPath().some(e => matchesQuery(e, "#tabs"))) {
            if (getMouseConf("scrolltabs")) {
                // Make both directions of scrolling move the tabs horizontally
                document.getElementById("tabs")?.scrollBy(
                    ev.deltaX + ev.deltaY, ev.deltaX + ev.deltaY)
            }
        }
        const overPageElements = "#follow, #screenshot-highlight, #pointer, "
            + "#url-hover, #loading-progress"
        if (ev.composedPath().some(e => matchesQuery(e, overPageElements))) {
            const page = currentPage()
            if (getMouseConf("pageoutsideinsert") && page) {
                const {left, top} = pageOffset(page)
                sendToPageOrSubFrame("send-input-event", {
                    "deltaX": -ev.deltaX,
                    "deltaY": -ev.deltaY,
                    "type": "scroll",
                    "x": ev.x - left,
                    "y": ev.y - top
                })
            }
        }
        if (ev.composedPath().some(e => matchesQuery(e, "#suggest-dropdown"))) {
            if (!getMouseConf("scrollsuggest")) {
                ev.preventDefault()
            }
        }
    }, {"passive": false})
    window.addEventListener("drop", e => {
        const {followFiltering} = require("./follow")
        const typing = "sec".includes(currentMode()[0]) || followFiltering()
        if (e.target === getUrl()) {
            if (typing) {
                if (getMouseConf("url")) {
                    setTimeout(() => requestSuggestUpdate(), 1)
                } else {
                    e.preventDefault()
                }
            }
            if (getMouseConf("toexplore") && !typing) {
                ACTIONS.toExploreMode()
            }
        } else {
            if (!typing) {
                getUrl()?.setSelectionRange(0, 0)
                window.getSelection()?.removeAllRanges()
            }
            e.preventDefault()
        }
    })
    window.addEventListener("mouseup", e => {
        if (draggingScreenshotFrame) {
            setTimeout(() => {
                draggingScreenshotFrame = false
            }, 10)
            e.preventDefault()
            return
        }
        const {followFiltering} = require("./follow")
        const typing = "sec".includes(currentMode()[0]) || followFiltering()
        if (e.target === getUrl()) {
            if (typing) {
                if (getMouseConf("url")) {
                    setTimeout(() => requestSuggestUpdate(), 1)
                } else {
                    e.preventDefault()
                }
            }
            if (getMouseConf("toexplore")) {
                if (!typing) {
                    ACTIONS.toExploreMode()
                }
                return
            }
        } else {
            if (!typing) {
                getUrl()?.setSelectionRange(0, 0)
                window.getSelection()?.removeAllRanges()
            }
            e.preventDefault()
        }
        if (e.button === 1 && getMouseConf("closetab")) {
            const tab = e.composedPath().find(n => {
                if (n instanceof HTMLElement) {
                    return listTabs().includes(n)
                }
                return false
            })
            if (tab instanceof HTMLElement) {
                const {closeTab} = require("./tabs")
                closeTab("user", listTabs().indexOf(tab))
            }
            const {clear} = require("./contextmenu")
            clear()
        }
        ACTIONS.setFocusCorrectly()
    })
    window.addEventListener("cut", cutInput)
    window.addEventListener("copy", copyInput)
    window.addEventListener("paste", pasteInput)
    window.addEventListener("click", e => {
        if (e.composedPath().some(n => matchesQuery(n, "#context-menu"))) {
            return
        }
        if (draggingScreenshotFrame && getMouseConf("screenshotframe")) {
            e.preventDefault()
            return
        }
        const {clear} = require("./contextmenu")
        clear()
        if (!(e.target instanceof HTMLElement)) {
            return
        }
        if (e.target.classList.contains("no-focus-reset")) {
            return
        }
        e.preventDefault()

        /**
         * Find the url box or the suggest dropdown in the list of targets.
         * @param {MouseEvent} ev
         */
        const urlOrSuggest = ev => ev.composedPath().find(
            n => matchesQuery(n, "#url, #suggest-dropdown"))

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
        }
        if (getMouseConf("switchtab")) {
            const tab = e.composedPath().find(n => {
                if (n instanceof HTMLSpanElement) {
                    return listTabs().includes(n)
                }
                return false
            })
            if (tab instanceof HTMLSpanElement) {
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
            document.elementsFromPoint(e.x, e.y).forEach(n => {
                if (matchesQuery(n, tabSelector)) {
                    const tab = listTabs().find(t => t.getAttribute(
                        "link-id") === n.getAttribute("link-id"))
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

            /**
             * Find the url box or the suggest dropdown in the list of targets.
             * @param {MouseEvent} ev
             */
            const urlOrSuggest = ev => ev.composedPath().find(n => matchesQuery(
                n, "#url, #suggest-dropdown, #screenshot-highlight"))

            if (typing && !urlOrSuggest(e)) {
                ACTIONS.toNormalMode()
            }
        }
        if (getMouseConf("menuvieb")) {
            const {viebMenu} = require("./contextmenu")
            viebMenu("user", e)
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
    window.addEventListener("blur", () => {
        setTimeout(ACTIONS.setFocusCorrectly, 5)
    })
    ipcRenderer.on("zoom-changed", (_, ctxId, direction) => {
        const page = listReadyPages().find(p => p.getWebContentsId() === ctxId)
        if (!page || !getMouseConf("scrollzoom")) {
            return
        }
        if (direction === "in") {
            ACTIONS.zoomIn({"customPage": page, "src": "user"})
        }
        if (direction === "out") {
            ACTIONS.zoomOut({"customPage": page, "src": "user"})
        }
    })
    ipcRenderer.on("insert-mode-input-event", (_, input) => {
        if (input.key === "Tab") {
            currentPage()?.focus()
        }
        // Check if fullscreen should be disabled
        if (document.body.classList.contains("fullscreen")) {
            const noMods = !input.shift && !input.meta && !input.alt
            const ctrl = input.control
            const escapeKey = input.key === "Escape" && noMods && !ctrl
            const ctrlBrack = input.key === "[" && noMods && ctrl
            if (escapeKey || ctrlBrack) {
                currentPage()?.send("action", "exitFullscreen")
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
            /** Emulated key event doesn't matter if it's prevented. */
            "preventDefault": () => undefined,
            "shiftKey": input.shift
        })
    })
    ipcRenderer.on("window-close", () => executeMapString("<A-F4>", true, {
        "initial": true, "src": "user"
    }))
    ipcRenderer.on("window-focus", () => {
        document.body.classList.add("focus")
        ACTIONS.setFocusCorrectly()
    })
    ipcRenderer.on("window-blur", () => {
        document.body.classList.remove("focus")
        ACTIONS.setFocusCorrectly()
    })
    ipcRenderer.on("execute-command", (_, command) => {
        const {execute} = require("./command")
        execute(command, {"src": "execute"})
    })
    ipcRenderer.on("window-update-gui", () => updateGuiVisibility())
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
    updateKeysOnScreen()
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
    splitMapString,
    startRecording,
    stopRecording,
    typeCharacterIntoNavbar,
    uncountableActions,
    unmap,
    updateKeysOnScreen
}
