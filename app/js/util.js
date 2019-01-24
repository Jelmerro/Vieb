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
/* global SETTINGS */
"use strict"

//This regex will be compiled when the file is loaded, so it's pretty fast
//eslint-disable-next-line max-len
const url = /^(([a-zA-Z-]+\.)+[a-zA-Z]{2,}|localhost|(\d{1,3}\.){3}\d{1,3})(:\d{2,5})?(|\/.*|\?.*|#.*)$/
const protocol = /^[a-z][a-z0-9-+.]+:\/\//

const hasProtocol = location => {
    //Check for a valid protocol at the start
    //This will ALWAYS result in the url being valid
    return protocol.test(location)
}

const isUrl = location => {
    return hasProtocol(location) || url.test(location)
    //Checks if the location starts with one of the following:
    //- Valid domain with 0 or more subdomains
    //- localhost
    //- An ipv4 address
    //After that, an optional port in the form of :22 or up to :22222
    //Lastly, it checks if the location ends with one of the following:
    //- Nothing
    //- Single slash character with anything behind it
    //- Single question mark with anything behind it
    //- Single number sign with anything behind it
}

const notify = (message, type="info") => {
    let properType = "info"
    if (type.startsWith("warn")) {
        properType = "warning"
    }
    if (type.startsWith("err")) {
        properType = "error"
    }
    const image = `img/notifications/${properType}.png`
    if (SETTINGS.get().notification.system) {
        new Notification(`Vieb ${properType}`, {
            "body": message,
            "image": image,
            "icon": image
        })
        return
    }
    const notificationsElement = document.getElementById("notifications")
    notificationsElement.className = SETTINGS.get().notification.position
    const notification = document.createElement("span")
    const iconElement = document.createElement("img")
    iconElement.src = image
    notification.appendChild(iconElement)
    const textElement = document.createElement("span")
    textElement.textContent = message
    notification.appendChild(textElement)
    notificationsElement.appendChild(notification)
    setTimeout(() => {
        notificationsElement.removeChild(notification)
    }, SETTINGS.get().notification.duration)
}

module.exports = {
    hasProtocol,
    isUrl,
    notify
}
