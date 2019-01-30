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
/* eslint-disable no-console */
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
    //Parse arguments
    let args = process.argv
    if (app.isPackaged) {
        args.unshift("")
    }
    args = args.slice(2)
    const urls = []
    let enableDevTools = false
    args.forEach(arg => {
        arg = arg.trim()
        if (arg.startsWith("--")) {
            if (arg === "--help") {
                printUsage()
                app.exit(0)
            } else if (arg === "--version") {
                printVersion()
                app.exit(0)
            } else if (arg === "--debug" || arg === "--console") {
                enableDevTools = true
            } else {
                console.log(`Unsupported argument: ${arg}`)
                printUsage()
                app.exit(1)
            }
        } else {
            urls.push(arg)
        }
    })
    //Init mainWindow
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
    mainWindow.setMinimumSize(500, 500)
    mainWindow.on("close", e => {
        e.preventDefault()
    })
    mainWindow.on("closed", () => {
        app.exit(0)
    })
    //Load app and send urls when ready
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file:",
        slashes: true
    }))
    mainWindow.webContents.on("did-finish-load", () => {
        if (enableDevTools) {
            mainWindow.webContents.openDevTools()
        }
        mainWindow.webContents.send("urls", urls)
    })
})

const printUsage = () => {
    console.log("Vieb: Vim Inspired Electron Browser\n")
    console.log("Usage: Vieb [options] <URLs>\n")
    console.log("Options:")
    console.log(" --help     Show this help and exit")
    console.log(" --version  Display license and version information and exit")
    console.log(" --debug    Start Vieb with the developer console open")
    console.log(" --console  Same as --debug")
    console.log("\nAll arguments not starting with -- will be opened as a url")
}

const printVersion = () => {
    console.log("Vieb: Vim Inspired Electron Browser\n")
    console.log(`This is version ${process.env.npm_package_version} of Vieb.`)
    console.log("This program is based on Electron and inspired by Vim.")
    console.log("It can be used to browse the web entirely with the keyboard.")
    console.log("Vieb was created by Jelmer van Arnhem & Ian Baremans.")
    console.log("\nSee the following link for more information:")
    console.log(process.env.npm_package_homepage)
    console.log("\nLicense GPLv3+: GNU GPL version 3 or "
        + "later <http://gnu.org/licenses/gpl.html>")
    console.log("This is free software; you are free to change and "
        + "redistribute it.")
    console.log("There is NO WARRANTY, to the extent permitted by law.")
    console.log("See the LICENSE file or the GNU website for details.")
}
