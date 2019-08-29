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

const {app, BrowserWindow, ipcMain, session} = require("electron")
const path = require("path")
const fs = require("fs")
const https = require("https")
const {ElectronBlocker} = require("@cliqz/adblocker-electron")

// Set storage location to Vieb regardless of startup method
app.setPath("appData", path.join(app.getPath("appData"), "Vieb"))
app.setPath("userData", app.getPath("appData"))
let mainWindow = null

// Allow the app to change the login credentials
app.on("login", e => {
    e.preventDefault()
})

// When the app is ready to start, open the main window
app.on("ready", () => {
    // Parse arguments
    let args = process.argv
    if (app.isPackaged) {
        args.unshift("")
    }
    args = args.slice(2)
    const urls = []
    let enableDebugMode = false
    let showInternalConsole = false
    args.forEach(arg => {
        arg = arg.trim()
        if (arg.startsWith("--")) {
            if (arg === "--help") {
                printUsage()
                app.exit(0)
            } else if (arg === "--version") {
                printVersion()
                app.exit(0)
            } else if (arg === "--debug") {
                enableDebugMode = true
            } else if (arg === "--console") {
                showInternalConsole = true
            } else {
                console.log(`Unsupported argument: ${arg}`)
                printUsage()
                app.exit(1)
            }
        } else if (!arg.startsWith("-")) {
            urls.push(arg)
        }
    })
    if (showInternalConsole && enableDebugMode) {
        console.log("the --debug argument always opens the internal console")
    }
    // Request single instance lock and quit if that fails
    if (app.requestSingleInstanceLock()) {
        app.on("second-instance", (event, commandLine) => {
            if (mainWindow.isMinimized()) {
                mainWindow.restore()
            }
            mainWindow.focus()
            if (app.isPackaged) {
                commandLine.unshift("")
            }
            commandLine = commandLine.slice(2)
            mainWindow.webContents.send("urls", commandLine.filter(arg => {
                return !arg.startsWith("-")
            }))
        })
    } else {
        app.quit()
    }
    // Init mainWindow
    const windowData = {
        title: "Vieb",
        width: 800,
        height: 600,
        frame: enableDebugMode,
        transparent: !enableDebugMode,
        show: enableDebugMode,
        webPreferences: {
            plugins: true,
            nodeIntegration: true,
            webviewTag: true
        }
    }
    if (!app.isPackaged) {
        windowData.icon = path.join(__dirname, "img/icons/512x512.png")
    }
    mainWindow = new BrowserWindow(windowData)
    mainWindow.removeMenu()
    mainWindow.setMinimumSize(500, 500)
    mainWindow.on("close", e => {
        e.preventDefault()
    })
    mainWindow.on("closed", () => {
        // Handle download closing here before quiting the app
        cancelAllDownloads()
        writeDownloadsToFile()
        // Actually exit the app
        app.exit(0)
    })
    // Load app and send urls when ready
    mainWindow.loadURL(`file://${path.join(__dirname, "index.html")}`)
    mainWindow.webContents.on("did-finish-load", () => {
        if (enableDebugMode || showInternalConsole) {
            mainWindow.webContents.openDevTools()
        }
        mainWindow.webContents.send("urls", urls)
        mainWindow.webContents.session.on("will-download", handleDownload)
    })
})

const isDir = dir => {
    try {
        return fs.existsSync(dir) && fs.statSync(dir).isDirectory()
    } catch (e) {
        return false
    }
}

const defaultBlocklists = {
    "easylist": "https://easylist.to/easylist/easylist.txt",
    "easyprivacy": "https://easylist.to/easylist/easyprivacy.txt"
}

const loadAdblocker = (event, setting) => {
    const blocklistsFolder = path.join(app.getPath("appData"), "blocklists")
    const shouldCopyEasylist = !isDir(blocklistsFolder)
    // Copy the default and included blocklists to the appdata folder
    if (shouldCopyEasylist) {
        try {
            fs.mkdirSync(blocklistsFolder)
        } catch (e) {
            console.log("Failed to create directory", e)
        }
    }
    if (shouldCopyEasylist || setting === "static") {
        for (const list of Object.keys(defaultBlocklists)) {
            copyBlocklist(list)
        }
    }
    // Apply all local filter lists immediately
    readAndApplyFilterLists()
    // And update default blocklists to the latest version if enabled
    if (setting === "update") {
        for (const list of Object.keys(defaultBlocklists)) {
            console.log(`Updating ${list} to the latest version`)
            const req = https.request(defaultBlocklists[list], res => {
                let body = ""
                res.on("data", chunk => {
                    body += chunk
                })
                res.on("end", () => {
                    try {
                        fs.writeFileSync(
                            path.join(blocklistsFolder, `${list}.txt`), body)
                    } catch (e) {
                        console.log(`Failed to update ${list}`, e)
                    }
                    readAndApplyFilterLists()
                })
            })
            req.on("error", e => {
                console.log(e)
            })
            req.end()
        }
    }
}

const readAndApplyFilterLists = () => {
    const blocklistsFolder = path.join(app.getPath("appData"), "blocklists")
    // Read all filter files from the blocklists folder (including user added)
    let filters = ""
    try {
        for (const file of fs.readdirSync(blocklistsFolder)) {
            if (file.endsWith(".txt")) {
                filters += loadBlocklist(file)
            }
        }
    } catch (e) {
        console.log("Failed to read the files from blocklists folder", e)
    }
    // Parse all and inject the succesfully read filter files
    try {
        ElectronBlocker.parse(filters)
            .enableBlockingInSession(session.defaultSession)
    } catch (e) {
        console.log("Failed to initialize adblocker", e)
    }
}

const copyBlocklist = name => {
    const packagedName = path.join(__dirname, `blocklists/${name}.txt`)
    const appdataName = path.join(
        app.getPath("appData"), `blocklists/${name}.txt`)
    try {
        fs.copyFileSync(packagedName, appdataName)
    } catch (e) {
        console.log(`Failed to copy ${name} to blocklists folder`, e)
    }
}

const loadBlocklist = file => {
    const appdataName = path.join(app.getPath("appData"), `blocklists/${file}`)
    try {
        return `${fs.readFileSync(appdataName).toString()}\n`
    } catch (e) {
        return ""
    }
}

ipcMain.on("enable-adblocker", loadAdblocker)

const printUsage = () => {
    console.log("Vieb: Vim Inspired Electron Browser\n")
    console.log("Usage: Vieb [options] <URLs>\n")
    console.log("Options:")
    console.log(" --help     Print this help and exit")
    console.log(" --version  Print program info with version and exit")
    console.log(" --debug    Open with Chromium and Electron debugging tools")
    console.log(" --console  Open with the Vieb console (implied by --debug)")
    console.log("\nAll arguments not starting with - will be opened as a url.")
    console.log("Vieb was created by Jelmer van Arnhem and contributors.")
    printLicense()
}

const printVersion = () => {
    const version = process.env.npm_package_version || app.getVersion()
    console.log("Vieb: Vim Inspired Electron Browser\n")
    console.log(`This is version ${version} of Vieb.`)
    console.log("This program is based on Electron and inspired by Vim.")
    console.log("It can be used to browse the web entirely with the keyboard.")
    console.log("Vieb was created by Jelmer van Arnhem and contributors.")
    printLicense()
}

const printLicense = () => {
    console.log("For more info go here - https://github.com/Jelmerro/Vieb")
    console.log("\nLicense GPLv3+: GNU GPL version 3 or "
        + "later <http://gnu.org/licenses/gpl.html>")
    console.log("This is free software; you are free to change and "
        + "redistribute it.")
    console.log("There is NO WARRANTY, to the extent permitted by law.")
    console.log("See the LICENSE file or the GNU website for details.")
}

// Due to possible race conditions, the download has to be started in main.
// The code below receives events directly from the preload script,
// but also from the regular downloads component.
// It sends the list of downloads back to the preload script via the component.

let downloadSettings = {
    method: "automatic",
    clearOnQuit: false,
    removeCompleted: false
}
let confirmedDownload = ""
let confirmedDownloadName = ""
let downloads = []
let initialDownloadSettingsUpdate = true

const dlsFile = path.join(app.getPath("appData"), "dls")

const handleDownload = (e, item) => {
    // Prevent overwriting existing files
    let filename = item.getFilename()
    if (confirmedDownloadName && downloadSettings.method === "confirm") {
        filename = confirmedDownloadName
    }
    let save = path.join(app.getPath("downloads"), filename)
    let duplicateNumber = 1
    let newFilename = filename
    while (fs.existsSync(save) && fs.statSync(save).isFile()) {
        duplicateNumber += 1
        const extStart = filename.lastIndexOf(".")
        if (extStart === -1) {
            newFilename = `${filename} (${duplicateNumber})`
        } else {
            newFilename = `${filename.substring(0, extStart)
            } (${duplicateNumber}).${
                filename.substring(extStart + 1)}`
        }
        save = path.join(app.getPath("downloads"), newFilename)
    }
    filename = newFilename
    if (downloadSettings.method === "confirm") {
        item.setSavePath(path.join(
            app.getPath("downloads"), filename))
        if (item.getURL() === confirmedDownload) {
            confirmedDownload = ""
            confirmedDownloadName = ""
        } else {
            const info = {
                url: item.getURL(),
                name: filename
            }
            e.preventDefault()
            mainWindow.webContents.send("prevented-download", info)
            return
        }
    } else if (downloadSettings.method === "automatic") {
        item.setSavePath(path.join(app.getPath("downloads"), filename))
    }
    // The "ask" behaviour is the default if no save path is set
    // Initiate download object and send it mainWindow on updates
    const info = {
        item: item,
        state: "waiting_to_start",
        url: item.getURL(),
        total: item.getTotalBytes(),
        current: 0,
        file: item.getSavePath(),
        name: filename,
        date: new Date()
    }
    downloads.push(info)
    mainWindow.webContents.send("started-download", info.name)
    item.on("updated", (_event, state) => {
        try {
            info.current = item.getReceivedBytes()
            if (state === "progressing" && !item.isPaused()) {
                info.state = "downloading"
            } else {
                info.state = "paused"
            }
        } catch (_e) {
            // Download is done and the item is destroyed automatically
            info.state = "cancelled"
        }
        writeDownloadsToFile()
    })
    item.once("done", (_event, state) => {
        if (state === "completed") {
            info.state = "completed"
            if (downloadSettings.removeCompleted) {
                downloads = downloads.filter(d => d.state !== "completed")
            }
        } else if (info.state !== "removed") {
            info.state = "cancelled"
        }
        mainWindow.webContents.send("finish-download", info.name, info.state)
    })
}

ipcMain.on("download-settings-change", (_e, newDownloadSettings) => {
    downloadSettings = newDownloadSettings
    if (downloadSettings.removeCompleted) {
        downloads = downloads.filter(d => d.state !== "completed")
    }
    if (initialDownloadSettingsUpdate) {
        if (downloadSettings.clearOnQuit) {
            try {
                fs.unlinkSync(dlsFile)
            } catch (e) {
                // Failed to delete, might not exist
            }
        } else if (fs.existsSync(dlsFile) && fs.statSync(dlsFile).isFile()) {
            try {
                const contents = fs.readFileSync(dlsFile).toString()
                const parsed = JSON.parse(contents)
                for (const download of parsed) {
                    if (download.state === "completed") {
                        if (!downloadSettings.removeCompleted) {
                            downloads.push(download)
                        }
                    } else {
                        download.state = "cancelled"
                        downloads.push(download)
                    }
                }
            } catch (e) {
                // No downloads file yet
            }
        }
        initialDownloadSettingsUpdate = false
    }
})

ipcMain.on("download-confirm", (e, name, url) => {
    confirmedDownloadName = name
    confirmedDownload = url
})

ipcMain.on("download-list-request", (_e, action, downloadId) => {
    if (action === "removeall") {
        downloads.forEach(download => {
            try {
                download.item.cancel()
            } catch (e) {
                // Download was already removed or is already done
            }
        })
        downloads = []
    }
    if (action === "pause") {
        try {
            downloads[downloadId].item.pause()
        } catch (e) {
            // Download just finished or some other silly reason
        }
    }
    if (action === "resume") {
        try {
            downloads[downloadId].item.resume()
        } catch (e) {
            // Download can't be resumed
        }
    }
    if (action === "remove") {
        try {
            downloads[downloadId].state = "removed"
            downloads[downloadId].item.cancel()
        } catch (e) {
            // Download was already removed from the list or something
        }
        try {
            downloads.splice(downloadId, 1)
        } catch (e) {
            // Download was already removed from the list or something
        }
    }
    mainWindow.webContents.send("download-list", downloads)
    writeDownloadsToFile()
})

const writeDownloadsToFile = () => {
    if (downloadSettings.clearOnQuit) {
        try {
            fs.unlinkSync(dlsFile)
        } catch (e) {
            //Failed to delete, might not exist
        }
    } else {
        try {
            fs.writeFileSync(dlsFile, JSON.stringify(downloads))
        } catch (e) {
            //Failed to write, try again later
        }
    }
}

const cancelAllDownloads = () => {
    downloads.forEach(download => {
        try {
            if (download.state !== "completed") {
                download.state = "cancelled"
            }
            download.item.cancel()
        } catch (e) {
            // Download was already removed or is already done
        }
    })
}
