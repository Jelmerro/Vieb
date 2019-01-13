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
"use strict"

const {app, BrowserWindow, nativeImage} = require("electron")
const path = require("path")
const url = require("url")
let mainWindow

// Set storage location to Vieb regardless of startup method
app.setPath("appData", path.join(app.getPath("appData"), "Vieb"))
app.setPath("userData", app.getPath("appData"))

// When the app is ready to start, open the main window
app.on("ready", () => {
    const windowData = {
        title: "Vieb",
        width: 800,
        height: 600,
        frame: false,
        transparent: true,
        webPreferences: {
            plugins: true,
            nodeIntegration: true,
            webviewTag: true
        }
    }
    const isDev = process.execPath.indexOf("node_modules") !== -1
    if (isDev || process.execPath.indexOf("/app/") !== -1) {
        const image = nativeImage.createFromPath(
            path.join(__dirname, "img/icon.png"))
        windowData.icon = image
    }
    mainWindow = new BrowserWindow(windowData)
    mainWindow.setMenu(null)
    mainWindow.setMinimumSize(400, 400)
    /*mainWindow.on("close", e => {
        e.preventDefault()
    })
    mainWindow.on("closed", () => {
        electron.app.exit(0)
    })*/
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file:",
        slashes: true
    }))
    mainWindow.webContents.on("did-finish-load", () => {
        const args = process.argv.slice(1)
        // TODO parse arguments
    })
    mainWindow.webContents.openDevTools()
})
