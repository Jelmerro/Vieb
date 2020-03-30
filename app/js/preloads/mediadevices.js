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
"use strict"

const enumerate = window.navigator.mediaDevices.enumerateDevices
const constraints = window.navigator.mediaDevices.getSupportedConstraints
const usermedia = window.navigator.mediaDevices.getUserMedia
const ondevicechange = window.navigator.mediaDevices.ondevicechange

window.navigator.mediaDevices.enumerateDevices = async () => {
    const devices = await enumerate.call(window.navigator.mediaDevices)
    return devices.map(({deviceId, groupId, kind}) => (
        {deviceId, groupId, kind, "label": ""}))
}
window.navigator.mediaDevices.getDisplayMedia = () => new Promise(() => {
    throw new DOMException("Permission denied", "NotAllowedError")
})
window.navigator.mediaDevices.getSupportedConstraints = constraints
window.navigator.mediaDevices.getUserMedia = usermedia
window.navigator.mediaDevices.ondevicechange = ondevicechange
