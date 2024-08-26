/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2024 Jelmer van Arnhem
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

import {
    defaultBindings, keyNames, uncountableActions
} from "./inputConstants.js"

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
 *   preventDefault?: () => undefined,
 *   shiftKey: boolean
 *   isComposing?: boolean
 *   which?: string
 *   bubbles?: boolean
 * }} e
 */
const toIdentifier = e => {
    let keyCode = e.key
    if (e.location === 3) {
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
 *   preventDefault?: () => undefined,
 *   shiftKey: boolean
 *   isComposing?: boolean
 *   which?: string
 *   bubbles?: boolean
 * }} e
 */
export const handleKeyboard = async e => {
    const id = toIdentifier(e)
    console.log(id)
    const {getCurrentFrame} = await import("./windows.js")
    if (e.key === "t") {
        getCurrentFrame()?.addPage({"url": "jelmerro.nl"})
    }
}
