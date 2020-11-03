/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2020 Jelmer van Arnhem
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

const {
    app, BrowserWindow, dialog, ipcMain, net, screen, session, webContents
} = require("electron")
const fs = require("fs")
const os = require("os")
const path = require("path")
const isSvg = require("is-svg")
const {ElectronBlocker} = require("@cliqz/adblocker-electron")

const version = process.env.npm_package_version || app.getVersion()
const printUsage = () => {
    console.log("Vieb: Vim Inspired Electron Browser\n")
    console.log("Usage: Vieb [options] <URLs>\n")
    console.log("Options:")
    console.log(" --help             Print this help and exit")
    console.log(" --version          Print program info with version and exit")
    console.log(" --datafolder <dir> Store ALL Vieb data in this folder")
    console.log(
        " --erwic <file>     Open a fixed set of pages in a separate instance")
    console.log("                    See 'Erwic.md' for usage and details")
    console.log(
        " --debug            Open with Chromium and Electron debugging tools")
    console.log(
        " --console          Open with the Vieb console (implied by --debug)")
    console.log("\nAll arguments not starting with - will be opened as a url.")
    printLicense()
}
const printVersion = () => {
    console.log("Vieb: Vim Inspired Electron Browser\n")
    console.log(`This is version ${version} of Vieb.`)
    console.log("Vieb is based on Electron and inspired by Vim.")
    console.log("It can be used to browse the web entirely with the keyboard.")
    console.log(`This release uses Electron ${
        process.versions.electron} and Chromium ${process.versions.chrome}`)
    printLicense()
}
const printLicense = () => {
    console.log("Vieb is created by Jelmer van Arnhem and contributors.")
    console.log("Website: https://vieb.dev OR https://github.com/Jelmerro/Vieb")
    console.log("\nLicense GPLv3+: GNU GPL version 3 or "
        + "later <http://gnu.org/licenses/gpl.html>")
    console.log("This is free software; you are free to change and "
        + "redistribute it.")
    console.log("There is NO WARRANTY, to the extent permitted by law.")
    console.log("See the LICENSE file or the GNU website for details.")
}
const isFile = loc => {
    try {
        return fs.statSync(loc).isFile()
    } catch (e) {
        return false
    }
}
const deleteFile = loc => {
    try {
        fs.unlinkSync(loc)
    } catch (e) {
        // Probably already deleted
    }
}
const readJSON = loc => {
    try {
        return JSON.parse(fs.readFileSync(loc).toString())
    } catch (e) {
        return null
    }
}
const writeJSON = (loc, data) => {
    try {
        fs.writeFileSync(loc, JSON.stringify(data))
        return true
    } catch (e) {
        return false
    }
}
const expandPath = homePath => {
    if (homePath.startsWith("~")) {
        return homePath.replace("~", os.homedir())
    }
    return homePath
}
const applyDevtoolsSettings = prefFile => {
    try {
        fs.mkdirSync(path.dirname(prefFile), {"recursive": true})
    } catch (e) {
        // Directory probably already exists
    }
    const preferences = readJSON(prefFile) || {}
    if (!preferences.electron) {
        preferences.electron = {}
    }
    if (!preferences.electron.devtools) {
        preferences.electron.devtools = {}
    }
    if (!preferences.electron.devtools.preferences) {
        preferences.electron.devtools.preferences = {}
    }
    // Disable source maps as they leak internal structure to the webserver
    preferences.electron.devtools.preferences.cssSourceMapsEnabled = false
    preferences.electron.devtools.preferences.jsSourceMapsEnabled = false
    // Disable release notes, most are not relevant for Vieb
    preferences.electron.devtools.preferences["help.show-release-note"] = false
    // Show timestamps in the console
    preferences.electron.devtools.preferences.consoleTimestampsEnabled = true
    // Enable dark theme
    preferences.electron.devtools.preferences.uiTheme = "\"dark\""
    writeJSON(prefFile, preferences)
}
const useragent = () => session.defaultSession.getUserAgent()
    .replace(/Electron\/\S* /, "").replace(/Vieb\/\S* /, "")
    .replace(RegExp(`${app.getName()}/\\S* `), "")

// Parse arguments
let args
if (process.defaultApp) {
    // argv is ["electron", "app", ...args]
    args = process.argv.slice(2)
} else {
    // argv is ["vieb", ...args]
    args = process.argv.slice(1)
}
const urls = []
let enableDebugMode = false
let showInternalConsole = false
let nextArgErwicConfig = false
let nextArgDataFolder = false
let erwic = null
let datafolder = path.join(app.getPath("appData"), "Vieb")
let customIcon = null
args.forEach(arg => {
    arg = arg.trim()
    if (nextArgErwicConfig) {
        erwic = arg
        nextArgErwicConfig = false
    } else if (nextArgDataFolder) {
        datafolder = arg
        nextArgDataFolder = false
    } else if (arg.startsWith("--")) {
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
        } else if (arg === "--erwic") {
            nextArgErwicConfig = true
        } else if (arg === "--datafolder") {
            nextArgDataFolder = true
        } else {
            console.log(`Unsupported argument: ${arg}`)
            printUsage()
            app.exit(1)
        }
    } else if (!arg.startsWith("-")) {
        urls.push(arg)
    }
})
if (nextArgErwicConfig) {
    console.log(`The 'erwic' option requires a file location`)
    printUsage()
    app.exit(1)
}
if (nextArgDataFolder) {
    console.log(`The 'datafolder' option requires a directory location`)
    printUsage()
    app.exit(1)
}
app.setName("Vieb")
datafolder = `${path.resolve(expandPath(datafolder.trim()))}/`
app.setPath("appData", datafolder)
app.setPath("userData", datafolder)
if (showInternalConsole && enableDebugMode) {
    console.log("The --debug argument always opens the internal console")
}
applyDevtoolsSettings(path.join(datafolder, "Preferences"))
if (erwic) {
    let config = null
    try {
        config = JSON.parse(fs.readFileSync(erwic).toString())
    } catch (e) {
        console.log("Erwic config file could not be read")
        printUsage()
        app.exit(1)
    }
    if (config.name) {
        app.setName(config.name)
    }
    if (config.icon) {
        config.icon = expandPath(config.icon)
        if (config.icon !== path.resolve(config.icon)) {
            config.icon = path.join(path.dirname(erwic), config.icon)
        }
        if (!isFile(config.icon)) {
            config.icon = null
        }
        customIcon = config.icon
    }
    fs.writeFileSync(path.join(datafolder, "erwicmode"), "")
    if (!Array.isArray(config.apps)) {
        console.log("Erwic config file requires a list of 'apps'")
        printUsage()
        app.exit(1)
    }
    config.apps = config.apps.map(a => {
        if (a.name && !a.container) {
            // OLD remove fallback checks in 4.x.x
            a.container = a.name
        }
        a.container = a.container?.replace(/[^A-Za-z0-9_]/g, "")
        if (typeof a.script === "string") {
            a.script = expandPath(a.script)
            if (a.script !== path.resolve(a.script)) {
                a.script = path.join(path.dirname(erwic), a.script)
            }
            if (!isFile(a.script)) {
                a.script = null
            }
        } else {
            a.script = null
        }
        return a
    }).filter(a => typeof a.container === "string" && typeof a.url === "string")
    if (config.apps.length === 0) {
        console.log("Erwic config file requires at least one app to be added")
        console.log("Each app must have a 'container' name and a 'url'")
        printUsage()
        app.exit(1)
    }
    urls.push(...config.apps)
}

// When the app is ready to start, open the main window
let mainWindow = null
let loginWindow = null
let notificationWindow = null
app.on("ready", () => {
    app.userAgentFallback = useragent()
    // Request single instance lock and quit if that fails
    if (app.requestSingleInstanceLock()) {
        app.on("second-instance", (_, newArgs) => {
            if (mainWindow.isMinimized()) {
                mainWindow.restore()
            }
            mainWindow.focus()
            newArgs = newArgs.slice(1)
            if (newArgs[0] === "app" || newArgs[0] === app.getAppPath()) {
                newArgs = newArgs.slice(1)
            }
            const newUrls = []
            let ignoreNextArg = false
            newArgs.forEach(arg => {
                if (arg === "--erwic" || arg === "--datafolder") {
                    ignoreNextArg = true
                } else if (ignoreNextArg) {
                    ignoreNextArg = false
                } else if (!arg.startsWith("-")) {
                    newUrls.push(arg)
                }
            })
            mainWindow.webContents.send("urls", newUrls)
        })
    } else {
        console.log(`Sending urls to existing instance in ${datafolder}`)
        app.exit(0)
    }
    // Init mainWindow
    const windowData = {
        "title": app.getName(),
        "width": 800,
        "height": 600,
        "frame": enableDebugMode,
        "show": enableDebugMode,
        "closable": false,
        "icon": customIcon || undefined,
        "webPreferences": {
            "preload": path.join(__dirname, "apploader.js"),
            "sandbox": false,
            "contextIsolation": false,
            "disableBlinkFeatures": "Auxclick",
            "nodeIntegration": false,
            "enableRemoteModule": false,
            "webviewTag": true
        }
    }
    if (!app.isPackaged && !customIcon) {
        windowData.icon = path.join(__dirname, "img/icons/512x512.png")
    }
    mainWindow = new BrowserWindow(windowData)
    if (!enableDebugMode) {
        mainWindow.removeMenu()
    }
    mainWindow.setMinimumSize(500, 500)
    mainWindow.on("close", e => {
        e.preventDefault()
        mainWindow.webContents.send("window-close")
    })
    mainWindow.on("closed", () => {
        app.exit(0)
    })
    mainWindow.on("app-command", (e, cmd) => {
        mainWindow.webContents.send("app-command", cmd)
        e.preventDefault()
    })
    // Load app and send urls when ready
    mainWindow.loadURL(`file://${path.join(__dirname, "index.html")}`)
    mainWindow.webContents.once("did-finish-load", () => {
        mainWindow.webContents.on("new-window", e => e.preventDefault())
        mainWindow.webContents.on("will-navigate", e => e.preventDefault())
        mainWindow.webContents.on("will-redirect", e => e.preventDefault())
        mainWindow.webContents.on("will-attach-webview", (_, prefs) => {
            delete prefs.preloadURL
            prefs.preload = path.join(__dirname, "js/preload.js")
            prefs.nodeIntegration = false
            prefs.enableRemoteModule = false
        })
        if (enableDebugMode || showInternalConsole) {
            mainWindow.webContents.openDevTools()
        }
        mainWindow.webContents.send("urls", urls)
    })
    // Show a dialog for sites requiring Basic HTTP authentication
    const loginWindowData = {
        "backgroundColor": "#333333",
        "fullscreenable": false,
        "modal": true,
        "frame": false,
        "show": false,
        "parent": mainWindow,
        "alwaysOnTop": true,
        "resizable": false,
        "icon": customIcon || undefined,
        "webPreferences": {
            "preload": path.join(__dirname, "js/preloads/login.js"),
            "sandbox": true,
            "contextIsolation": true,
            "disableBlinkFeatures": "Auxclick",
            "nodeIntegration": false,
            "enableRemoteModule": false,
            "partition": "login"
        }
    }
    loginWindow = new BrowserWindow(loginWindowData)
    const loginPage = `file:///${path.join(__dirname, "pages/login.html")}`
    loginWindow.loadURL(loginPage)
    loginWindow.on("close", e => {
        e.preventDefault()
        loginWindow.hide()
    })
    ipcMain.on("hide-login-window", () => {
        loginWindow.hide()
    })
    // Show a dialog for large notifications
    const notificationWindowData = {
        "backgroundColor": "#333333",
        "fullscreenable": false,
        "modal": true,
        "frame": false,
        "show": false,
        "parent": mainWindow,
        "alwaysOnTop": true,
        "resizable": false,
        "icon": customIcon || undefined,
        "webPreferences": {
            "preload": path.join(__dirname,
                "js/preloads/notificationmessage.js"),
            "sandbox": true,
            "contextIsolation": true,
            "disableBlinkFeatures": "Auxclick",
            "nodeIntegration": false,
            "enableRemoteModule": false,
            "partition": "notification-window"
        }
    }
    notificationWindow = new BrowserWindow(notificationWindowData)
    const notificationPage = `file:///${path.join(
        __dirname, "pages/notificationmessage.html")}`
    notificationWindow.loadURL(notificationPage)
    notificationWindow.on("close", e => {
        e.preventDefault()
        notificationWindow.hide()
    })
    ipcMain.on("hide-notification-window", () => {
        notificationWindow.hide()
    })
})

// THIS ENDS THE MAIN SETUP, ACTIONS BELOW MUST BE IN MAIN FOR VARIOUS REASONS

// Handle Basic HTTP login attempts
const loginAttempts = []
let fontsize = 14
ipcMain.on("set-fontsize", (_, size) => {
    fontsize = size
})
app.on("login", (e, contents, _, auth, callback) => {
    if (loginWindow.isVisible()) {
        return
    }
    if (loginAttempts.includes(contents.id)) {
        loginAttempts.splice(loginAttempts.indexOf(contents.id), 1)
        return
    }
    e.preventDefault()
    loginAttempts.push(contents.id)
    loginWindow.removeAllListeners("hide")
    loginWindow.once("hide", () => {
        try {
            callback("", "")
        } catch (err) {
            // Window was already closed
        }
    })
    ipcMain.removeAllListeners("login-credentials")
    ipcMain.once("login-credentials", (__, credentials) => {
        try {
            callback(credentials[0], credentials[1])
            loginWindow.hide()
        } catch (err) {
            // Window is already being closed
        }
    })
    const bounds = mainWindow.getBounds()
    const size = Math.round(fontsize * 21)
    loginWindow.setMinimumSize(size, size)
    loginWindow.setSize(size, size)
    loginWindow.setPosition(
        Math.round(bounds.x + bounds.width / 2 - size / 2),
        Math.round(bounds.y + bounds.height / 2 - size / 2))
    loginWindow.resizable = false
    loginWindow.show()
    loginWindow.webContents.send("login-information",
        fontsize, `${auth.host}: ${auth.realm}`)
})

// Show a scrollable notification popup for long notifications
ipcMain.on("show-notification", (_, escapedMessage, properType) => {
    const bounds = mainWindow.getBounds()
    const width = Math.round(bounds.width * .9)
    let height = Math.round(bounds.height * .9)
    height -= height % fontsize
    notificationWindow.setMinimumSize(width, height)
    notificationWindow.setSize(width, height)
    notificationWindow.setPosition(
        Math.round(bounds.x + bounds.width / 2 - width / 2),
        Math.round(bounds.y + bounds.height / 2 - height / 2))
    notificationWindow.webContents.send("notification-details",
        escapedMessage, fontsize, properType)
    notificationWindow.show()
})

// Create and manage sessions, mostly downloads, adblocker and permissions
const dlsFile = path.join(app.getPath("appData"), "dls")
let downloadSettings = {}
let downloads = []
let redirects = ""
let blocker = null
let permissions = {}
const sessionList = []
const adblockerPreload = require.resolve("@cliqz/adblocker-electron-preload")
ipcMain.on("set-redirects", (_, rdr) => {
    redirects = rdr
})
ipcMain.on("set-download-settings", (_, settings) => {
    if (Object.keys(downloadSettings).length === 0) {
        if (settings.cleardownloadsonquit) {
            deleteFile(dlsFile)
        } else if (isFile(dlsFile)) {
            const parsed = readJSON(dlsFile)
            for (const download of parsed) {
                if (download.state === "completed") {
                    if (!settings.cleardownloadsoncompleted) {
                        downloads.push(download)
                    }
                } else {
                    download.state = "cancelled"
                    downloads.push(download)
                }
            }
        }
    }
    downloadSettings = settings
    if (downloadSettings.cleardownloadsoncompleted) {
        downloads = downloads.filter(d => d.state !== "completed")
    }
    downloadSettings.downloadpath = expandPath(downloadSettings.downloadpath)
})
ipcMain.on("download-list-request", (e, action, downloadId) => {
    if (action === "removeall") {
        downloads.forEach(download => {
            try {
                download.item.cancel()
            } catch (_) {
                // Download was already removed or is already done
            }
        })
        downloads = []
    }
    if (action === "pause") {
        try {
            downloads[downloadId].item.pause()
        } catch (_) {
            // Download just finished or some other silly reason
        }
    }
    if (action === "resume") {
        try {
            downloads[downloadId].item.resume()
        } catch (_) {
            // Download can't be resumed
        }
    }
    if (action === "remove") {
        try {
            downloads[downloadId].state = "removed"
            downloads[downloadId].item.cancel()
        } catch (_) {
            // Download was already removed from the list or something
        }
        try {
            downloads.splice(downloadId, 1)
        } catch (_) {
            // Download was already removed from the list or something
        }
    }
    writeDownloadsToFile()
    e.sender.send("download-list", JSON.stringify(downloads))
})
ipcMain.on("set-permissions", (_, permissionObject) => {
    permissions = permissionObject
})
ipcMain.on("set-spelllang", (_, lang) => {
    sessionList.forEach(ses => {
        if (lang === "system") {
            session.fromPartition(ses).setSpellCheckerLanguages([])
        } else {
            session.fromPartition(ses).setSpellCheckerLanguages([lang])
        }
    })
})
ipcMain.on("create-session", (_, name, adblock, cache) => {
    if (sessionList.includes(name)) {
        return
    }
    const partitionDir = path.join(app.getPath("appData"), "Partitions")
    const sessionDir = path.join(partitionDir, name.split(":")[1] || name)
    applyDevtoolsSettings(path.join(sessionDir, "Preferences"))
    const newSession = session.fromPartition(name, {cache})
    newSession.setPermissionRequestHandler(permissionHandler)
    sessionList.push(name)
    if (adblock !== "off") {
        enableAdblocker()
    }
    newSession.webRequest.onBeforeRequest((details, callback) => {
        let url = String(details.url)
        redirects.split(",").forEach(r => {
            if (r.trim()) {
                const [match, replace] = r.split("~")
                url = url.replace(RegExp(match), replace)
            }
        })
        if (details.url !== url) {
            return callback({
                "cancel": false, "redirectURL": url
            })
        }
        if (!blocker) {
            return callback({"cancel": false})
        }
        blocker.onBeforeRequest(details, callback)
    })
    newSession.webRequest.onHeadersReceived((details, callback) => {
        if (!blocker) {
            return callback({"cancel": false})
        }
        blocker.onHeadersReceived(details, callback)
    })
    newSession.on("will-download", (e, item) => {
        if (downloadSettings.downloadmethod === "block") {
            e.preventDefault()
            return
        }
        const filename = item.getFilename()
        let save = path.join(downloadSettings.downloadpath, filename)
        let duplicateNumber = 1
        let newFilename = item.getFilename()
        while (fs.existsSync(save) && fs.statSync(save).isFile()) {
            duplicateNumber += 1
            const extStart = filename.lastIndexOf(".")
            if (extStart === -1) {
                newFilename = `${filename} (${duplicateNumber})`
            } else {
                newFilename = `${filename.substring(0, extStart)} (${
                    duplicateNumber}).${filename.substring(extStart + 1)}`
            }
            save = path.join(downloadSettings.downloadpath, newFilename)
        }
        if (downloadSettings.downloadmethod !== "ask") {
            item.setSavePath(save)
        }
        if (downloadSettings.downloadmethod === "confirm") {
            const wrappedFileName = filename.replace(/.{50}/g, "$&\n")
            const wrappedUrl = decodeURIComponent(item.getURL())
                .replace(/.{50}/g, "$&\n")
            const button = dialog.showMessageBoxSync(mainWindow, {
                "type": "question",
                "buttons": ["Allow", "Deny"],
                "defaultId": 0,
                "cancelId": 1,
                "title": "Download request from the website",
                "message": `Do you want to download the following file?\n\n${
                    wrappedFileName}\n\n${item.getMimeType()} - ${
                    item.getTotalBytes()}\n\n${wrappedUrl}`
            })
            if (button === 1) {
                e.preventDefault()
                return
            }
        }
        const info = {
            "name": filename,
            "url": item.getURL(),
            "total": item.getTotalBytes(),
            "file": item.getSavePath(),
            "item": item,
            "state": "waiting_to_start",
            "current": 0,
            "date": new Date()
        }
        downloads.push(info)
        mainWindow.webContents.send("notify", `Download started:\n${info.name}`)
        item.on("updated", (__, state) => {
            try {
                info.current = item.getReceivedBytes()
                info.file = item.getSavePath()
                info.total = item.getTotalBytes()
                if (state === "progressing" && !item.isPaused()) {
                    info.state = "downloading"
                } else {
                    info.state = "paused"
                }
            } catch (___) {
                // When a download is finished before the event is detected,
                // the item will throw an error for all the mapped functions.
            }
            writeDownloadsToFile()
        })
        item.once("done", (__, state) => {
            if (state === "completed") {
                info.state = "completed"
                if (downloadSettings.cleardownloadsoncompleted) {
                    downloads = downloads.filter(d => d.state !== "completed")
                }
            } else if (info.state !== "removed") {
                info.state = "cancelled"
            }
            if (info.state === "completed") {
                mainWindow.webContents.send("notify",
                    `Download finished:\n${info.name}`)
            } else {
                mainWindow.webContents.send("notify",
                    `Download failed:\n${info.name}`, "warn")
            }
        })
    })
})
const cancellAllDownloads = () => {
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
    writeDownloadsToFile()
}
const writeDownloadsToFile = () => {
    downloads.forEach(d => {
        // Update downloads that are stuck on waiting to start,
        // but have already been destroyed by electron.
        try {
            d.item.getFilename()
        } catch (e) {
            if (d.state === "waiting_to_start") {
                d.state = "completed"
            }
        }
    })
    if (downloadSettings.cleardownloadsonquit || downloads.length === 0) {
        deleteFile(dlsFile)
    } else {
        writeJSON(dlsFile, downloads)
    }
}
const permissionHandler = (_, permission, callback, details) => {
    if (permission === "media") {
        if (details.mediaTypes?.includes("video")) {
            permission = "camera"
        } else if (details.mediaTypes?.includes("audio")) {
            permission = "microphone"
        } else {
            permission = "mediadevices"
        }
    }
    const permissionName = `permission${permission.toLowerCase()}`
    for (const override of ["permissionsblocked", "permissionsallowed"]) {
        for (const rule of permissions[override].split(",")) {
            if (!rule.trim()) {
                continue
            }
            const [match, ...names] = rule.split("~")
            if (names.find(p => permissionName.endsWith(p))) {
                if (details.requestingUrl.match(match)) {
                    mainWindow.webContents.send("notify",
                        `Automatic rule for ${permission} activated at `
                        + `${details.requestingUrl} which was `
                        + `${override.replace("permissions", "")}`, "perm")
                    return callback(override.includes("allow"))
                }
            }
        }
    }
    const setting = permissions[permissionName]
    if (setting === "ask") {
        let url = details.requestingUrl
        if (url.length > 100) {
            url = url.replace(/.{50}/g, "$&\n")
        }
        let message = "The page has requested access to the permission "
            + `'${permission}'. You can allow or deny this below, and choose if`
            + " you want to make this the default for the current session when "
            + "sites ask for this permission. For help and more options, see "
            + `':h ${permissionName}', ':h permissionsallowed' and `
            + `':h permissionsblocked'.\n\npage:\n${url}`
        if (permission === "openExternal") {
            let exturl = details.externalURL
            if (exturl.length > 100) {
                exturl = exturl.replace(/.{50}/g, "$&\n")
            }
            message = "The page has requested to open an external application."
                + " You can allow or deny this below, and choose if you want to"
                + " make this the default for the current session when sites "
                + "ask to open urls in external programs. For help and more "
                + "options, see ':h permissionopenexternal', "
                + "':h permissionsallowed' and ':h permissionsblocked'.\n\n"
                + `page:\n${details.requestingUrl}\n\nexternal:\n${exturl}`
        }
        dialog.showMessageBox(mainWindow, {
            "type": "question",
            "buttons": ["Allow", "Deny"],
            "defaultId": 0,
            "cancelId": 1,
            "checkboxLabel": "Remember for this session",
            "title": `Allow this page to access '${permission}'?`,
            "message": message
        }).then(e => {
            let action = "allow"
            if (e.response !== 0) {
                action = "block"
            }
            mainWindow.webContents.send("notify",
                `Manually ${action}ed ${permission} at `
                + `${details.requestingUrl}`, "perm")
            callback(action === "allow")
            if (e.checkboxChecked) {
                mainWindow.webContents.send(
                    "set-permission", permissionName, action)
                permissions[permissionName] = action
            }
        })
    } else {
        mainWindow.webContents.send("notify",
            `Globally ${setting}ed ${permission} at `
            + `${details.requestingUrl}`, "perm")
        callback(setting === "allow")
    }
}
const enableAdblocker = () => {
    if (blocker) {
        disableAdblocker()
    }
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
    blocker = ElectronBlocker.parse(filters)
    ipcMain.on("get-cosmetic-filters", blocker.onGetCosmeticFilters)
    ipcMain.on("is-mutation-observer-enabled",
        blocker.onIsMutationObserverEnabled)
    sessionList.forEach(part => {
        const ses = session.fromPartition(part)
        ses.setPreloads(ses.getPreloads().concat([adblockerPreload]))
    })
}
const disableAdblocker = () => {
    if (!blocker) {
        return
    }
    ipcMain.removeListener("get-cosmetic-filters", blocker.onGetCosmeticFilters)
    ipcMain.removeListener("is-mutation-observer-enabled",
        blocker.onIsMutationObserverEnabled)
    blocker = null
    sessionList.forEach(part => {
        const ses = session.fromPartition(part)
        ses.setPreloads(ses.getPreloads().filter(p => p !== adblockerPreload))
    })
}
ipcMain.on("adblock-enable", enableAdblocker)
ipcMain.on("adblock-disable", disableAdblocker)
const loadBlocklist = file => {
    const appdataName = path.join(app.getPath("appData"), `blocklists/${file}`)
    try {
        return `${fs.readFileSync(appdataName).toString()}\n`
    } catch (e) {
        return ""
    }
}

// Download favicons for websites
ipcMain.on("download-favicon", (_, fav, location, webId, linkId, url) => {
    const request = net.request({
        "url": fav, "session": webContents.fromId(webId).session
    })
    request.on("response", res => {
        const data = []
        res.on("end", () => {
            const file = Buffer.concat(data)
            if (isSvg(file)) {
                location += ".svg"
                fav += ".svg"
            }
            fs.writeFileSync(location, file)
            mainWindow.webContents.send("favicon-downloaded", linkId, url, fav)
        })
        res.on("data", chunk => {
            data.push(Buffer.from(chunk, "binary"))
        })
    })
    request.on("abort", () => {
        // Failed to download favicon
    })
    request.on("error", () => {
        // Failed to download favicon
    })
    request.end()
})

// Window state save and restore
const windowStateFile = path.join(app.getPath("appData"), "windowstate")
ipcMain.on("window-state-init", (_, restorePos, restoreSize, restoreMax) => {
    const bounds = {}
    const parsed = readJSON(windowStateFile)
    if (parsed) {
        bounds.x = Number(parsed.x)
        bounds.y = Number(parsed.y)
        bounds.width = Number(parsed.width)
        bounds.height = Number(parsed.height)
        bounds.maximized = !!parsed.maximized
    }
    if (restorePos) {
        if (bounds.x > 0 && bounds.y > 0) {
            mainWindow.setPosition(bounds.x, bounds.y)
        }
    }
    if (restoreSize) {
        if (bounds.width > 500 && bounds.height > 500) {
            mainWindow.setSize(bounds.width, bounds.height)
        }
    }
    if (bounds.maximized && restoreMax) {
        mainWindow.maximize()
    }
    mainWindow.show()
    // Save the window state when resizing or maximizing.
    // Move and resize state are saved and checked to detect window snapping.
    let justMoved = false
    let justResized = false
    mainWindow.on("maximize", saveWindowState)
    mainWindow.on("unmaximize", () => {
        saveWindowState(true)
    })
    mainWindow.on("resize", () => {
        justResized = true
        setTimeout(() => {
            if (!justMoved) {
                saveWindowState()
            }
        }, 10)
        setTimeout(() => {
            justResized = false
        }, 30)
    })
    mainWindow.on("move", () => {
        justMoved = true
        setTimeout(() => {
            if (!justResized) {
                saveWindowState()
            }
        }, 10)
        setTimeout(() => {
            justMoved = false
        }, 30)
    })
})
const saveWindowState = (maximizeOnly = false) => {
    let state = readJSON(windowStateFile) || {}
    if (!maximizeOnly && !mainWindow.isMaximized()) {
        const newBounds = mainWindow.getBounds()
        const currentScreen = screen.getDisplayMatching(newBounds).bounds
        if (newBounds.width !== currentScreen.width) {
            if (newBounds.height !== currentScreen.height) {
                if (newBounds.width !== currentScreen.width / 2) {
                    if (newBounds.height !== currentScreen.height / 2) {
                        if (newBounds.x !== currentScreen.x / 2) {
                            if (newBounds.y !== currentScreen.y / 2) {
                                state = newBounds
                            }
                        }
                    }
                }
            }
        }
    }
    state.maximized = mainWindow.isMaximized()
    writeJSON(windowStateFile, state)
}

// Miscellaneous tasks
ipcMain.on("disable-localrtc", (_, id) => {
    webContents.fromId(id).setWebRTCIPHandlingPolicy(
        "default_public_interface_only")
})
ipcMain.handle("save-page", (_, id, loc) => {
    webContents.fromId(id).savePage(loc, "HTMLComplete")
})
ipcMain.on("hide-window", () => {
    if (!enableDebugMode) {
        mainWindow.hide()
    }
})
ipcMain.on("add-devtools", (_, pageId, devtoolsId) => {
    const page = webContents.fromId(pageId)
    const devtools = webContents.fromId(devtoolsId)
    page.setDevToolsWebContents(devtools)
    page.openDevTools()
    devtools.executeJavaScript("window.location.reload()")
})
ipcMain.on("destroy-window", () => {
    cancellAllDownloads()
    mainWindow.destroy()
})
ipcMain.handle("list-spelllangs",
    () => session.defaultSession.availableSpellCheckerLanguages)
ipcMain.handle("toggle-fullscreen", () => {
    mainWindow.fullScreen = !mainWindow.fullScreen
})
ipcMain.on("insert-mode-listener", (_, id) => {
    webContents.fromId(id).on("before-input-event", (__, input) => {
        mainWindow.webContents.send("insert-mode-input-event", input)
    })
})
ipcMain.on("set-window-title", (_, title) => {
    mainWindow.title = title
})
ipcMain.handle("show-message-dialog", (_, options) => dialog.showMessageBox(
    mainWindow, options))
ipcMain.handle("list-cookies", e => e.sender.session.cookies.get({}))
ipcMain.handle("remove-cookie",
    (e, url, name) => e.sender.session.cookies.remove(url, name))
// Operations below are sync
ipcMain.on("override-global-useragent", (e, globalUseragent) => {
    app.userAgentFallback = globalUseragent || useragent()
    e.returnValue = null
})
ipcMain.on("app-version", e => {
    e.returnValue = version
})
ipcMain.on("appdata-path", e => {
    e.returnValue = app.getPath("appData")
})
ipcMain.on("custom-icon", e => {
    e.returnValue = customIcon || undefined
})
ipcMain.on("app-name", e => {
    e.returnValue = app.getName()
})
ipcMain.on("is-fullscreen", e => {
    e.returnValue = mainWindow.fullScreen
})
ipcMain.on("relaunch", () => {
    app.relaunch()
})
