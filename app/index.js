/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2022 Jelmer van Arnhem
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

const {
    app,
    desktopCapturer,
    BrowserWindow,
    dialog,
    ipcMain,
    net,
    screen,
    session,
    shell,
    webContents
} = require("electron")
const {ElectronBlocker} = require("@cliqz/adblocker-electron")
const isSvg = require("is-svg")
const {
    title,
    specialChars,
    writeJSON,
    readJSON,
    writeFile,
    readFile,
    isDir,
    listDir,
    expandPath,
    deleteFile,
    isFile,
    joinPath,
    makeDir,
    dirname,
    basePath,
    formatSize,
    extractZip,
    isAbsolutePath,
    formatDate,
    domainName,
    defaultUseragent
} = require("./util")
const {"sync": rimrafSync} = require("rimraf")
const rimraf = pattern => {
    try {
        rimrafSync(pattern)
    } catch {
        // Permission errors
    }
}

const version = process.env.npm_package_version || app.getVersion()
const printUsage = (code = 1) => {
    console.info(`Vieb: Vim Inspired Electron Browser

Usage: Vieb [options] <URLs>

Options:
 --help                  Print this help and exit.

 --version               Print program info with versions and exit.

 --debug                 Open with Chromium and Electron debugging tools.
                         They can also be opened later with ':internaldevtools'.

 --datafolder=<dir>      Store ALL Vieb data in this folder.
                         You can also use the ENV var: 'VIEB_DATAFOLDER'.

 --erwic=<file>          file: Location of the JSON file to configure Erwic.
                         Open a fixed set of pages in a separate instance.
                         See 'Erwic.md' or ':h erwic' for usage and details.
                         You can also use the ENV var: 'VIEB_ERWIC'.

 --config-order=<val>    string [USER-FIRST/user-only/
                           datafolder-first/datafolder-only/none]:
                         Configure the viebrc config file parse order.
                         You can choose to load either of the locations first,
                         choose to load only one of the locations or no config.
                         Order arg is ignored if '--config-file' is provided.
                         See ':h viebrc' for viebrc locations and details.
                         You can also use the ENV var: 'VIEB_CONFIG_ORDER'.

 --config-file=<file>    Parse only a single viebrc config file when starting.
                         If a file is provided using this argument,
                         the '--config-order' argument will be set to 'none'.
                         Also see ':h viebrc' for viebrc locations and details.
                         You can also use the ENV var: 'VIEB_CONFIG_FILE'.

 --window-frame=<val>    bool (false): Show the native frame around the window.
                         You can also use the ENV var: 'VIEB_WINDOW_FRAME'.

 --media-keys=<val>      bool (true): Allow the media keys to control playback.
                         You can also use the ENV var: 'VIEB_MEDIA_KEYS'.

 --autoplay-media=<val>  string [USER/always]: Control when media can autoplay.
                         When set to user, the document must be focussed first.
                         You can also use the ENV var: 'VIEB_AUTOPLAY_MEDIA'.

 --acceleration=<val>    string [HARDWARE/software]: Use hardware acceleration.
                         You can also use the ENV var: 'VIEB_ACCELERATION'.

These command-line arguments will overwrite values set by the listed ENV vars.
Command-line startup arguments are parsed as follows by Vieb:
- Args listed above are used by Vieb only and will be checked for validity
- Args starting with '-' not listed above are passed to Chromium/Electron as is
- Args not starting with '-' will be opened as in a new tab if it's a valid url
You can find the full list of Electron args here:
https://www.electronjs.org/docs/latest/api/command-line-switches/
A similar unofficial list for Chromium args is located here:
https://peter.sh/experiments/chromium-command-line-switches/
`)
    printLicense()
    app.exit(code)
}
const printVersion = () => {
    console.info(`Vieb: Vim Inspired Electron Browser
This is version ${version} of Vieb.
Vieb is based on Electron and inspired by Vim.
It can be used to browse the web entirely with the keyboard.
This release uses Electron ${process.versions.electron} and Chromium ${
    process.versions.chrome}`)
    printLicense()
    app.exit(0)
}
const printLicense = () => {
    console.info(`Vieb is created by Jelmer van Arnhem and contributors.
Website: https://vieb.dev OR https://github.com/Jelmerro/Vieb

License: GNU GPL version 3 or later versions <http://gnu.org/licenses/gpl.html>
This is free software; you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
See the LICENSE file or the GNU website for details.`)
}
const applyDevtoolsSettings = prefFile => {
    makeDir(dirname(prefFile))
    const preferences = readJSON(prefFile) || {}
    preferences.electron = preferences.electron || {}
    preferences.electron.devtools = preferences.electron.devtools || {}
    preferences.electron.devtools.preferences
        = preferences.electron.devtools.preferences || {}
    // Disable source maps as they leak internal structure to the webserver
    preferences.electron.devtools.preferences.cssSourceMapsEnabled = false
    preferences.electron.devtools.preferences.jsSourceMapsEnabled = false
    // Disable release notes, most are not relevant for Vieb
    preferences.electron.devtools.preferences["help.show-release-note"] = false
    // Show timestamps in the console
    preferences.electron.devtools.preferences.consoleTimestampsEnabled = true
    // Disable the paused overlay which prevents interaction with other pages
    preferences.electron.devtools.preferences.disablePausedStateOverlay = true
    // Enable dark theme
    preferences.electron.devtools.preferences.uiTheme = `"dark"`
    writeJSON(prefFile, preferences)
}

// Parse arguments
const getArguments = argv => {
    const execFile = basePath(argv[0])
    if (execFile === "electron" || process.defaultApp && execFile !== "vieb") {
        // The array argv is ["electron", "app", ...args]
        return argv.slice(2)
    }
    // The array argv is ["vieb", ...args]
    return argv.slice(1)
}
const isTruthyArg = arg => {
    const argStr = String(arg).trim().toLowerCase()
    return Number(argStr) > 0 || ["y", "yes", "true", "on"].includes(argStr)
}
const args = getArguments(process.argv)
const urls = []
let argDebugMode = false
let argDatafolder = process.env.VIEB_DATAFOLDER?.trim()
    || joinPath(app.getPath("appData"), "Vieb")
let argErwic = process.env.VIEB_ERWIC?.trim() || ""
let argWindowFrame = isTruthyArg(process.env.VIEB_WINDOW_FRAME)
let argConfigOrder = process.env.VIEB_CONFIG_ORDER?.trim().toLowerCase()
    || "user-first"
let argConfigOverride = process.env.VIEB_CONFIG_FILE?.trim().toLowerCase() || ""
let argMediaKeys = isTruthyArg(process.env.VIEB_MEDIA_KEYS)
if (!process.env.VIEB_MEDIA_KEYS) {
    argMediaKeys = true
}
let argAutoplayMedia = process.env.VIEB_AUTOPLAY_MEDIA?.trim().toLowerCase()
    || "user"
let argAcceleration = process.env.VIEB_ACCELERATION?.trim().toLowerCase()
    || "hardware"
let customIcon = null
args.forEach(a => {
    const arg = a.trim()
    if (arg.startsWith("-")) {
        if (arg === "--help") {
            printUsage(0)
        } else if (arg === "--version") {
            printVersion()
        } else if (arg === "--debug") {
            argDebugMode = true
        } else if (arg === "--datafolder") {
            console.warn("The 'datafolder' argument requires a value such as:"
                + " --datafolder=~/.config/Vieb/\n")
            printUsage()
        } else if (arg === "--erwic") {
            console.warn("The 'erwic' argument requires a value such as:"
                + " --erwic=~/.config/Erwic/\n")
            printUsage()
        } else if (arg === "--config-order") {
            console.warn("The 'config-order' argument requires a value such as:"
                + " --config-order=user-first\n")
            printUsage()
        } else if (arg === "--config-file") {
            console.warn("The 'config-file' argument requires a value such as:"
                + " --config-file=./customconf\n")
            printUsage()
        } else if (arg === "--window-frame") {
            console.warn("The 'window-frame' argument requires a value such as:"
                + " --window-frame=false\n")
            printUsage()
        } else if (arg === "--media-keys") {
            console.warn("The 'media-keys' argument requires a value such as:"
                + " --media-keys=true\n")
            printUsage()
        } else if (arg === "--autoplay-media") {
            console.warn("The 'autoplay-media' argument requires a value such "
                + "as: --autoplay-media=user\n")
            printUsage()
        } else if (arg === "--acceleration") {
            console.warn("The 'acceleration' argument requires a value such as:"
                + "\n --acceleration=hardware\n")
            printUsage()
        } else if (arg.startsWith("--datafolder=")) {
            argDatafolder = arg.split("=").slice(1).join("=")
        } else if (arg.startsWith("--erwic=")) {
            argErwic = arg.split("=").slice(1).join("=")
        } else if (arg.startsWith("--config-order=")) {
            argConfigOrder = arg.split("=").slice(1).join("=")
        } else if (arg.startsWith("--config-file=")) {
            argConfigOverride = arg.split("=").slice(1).join("=")
        } else if (arg.startsWith("--window-frame=")) {
            argWindowFrame = isTruthyArg(arg.split("=").slice(1).join("="))
        } else if (arg.startsWith("--media-keys=")) {
            argMediaKeys = isTruthyArg(arg.split("=").slice(1).join("="))
        } else if (arg.startsWith("--autoplay-media=")) {
            argAutoplayMedia = arg.split("=").slice(1).join("=").toLowerCase()
        } else if (arg.startsWith("--acceleration=")) {
            argAcceleration = arg.split("=").slice(1).join("=").toLowerCase()
        } else {
            console.warn(`Arg '${arg}' will be passed to Chromium`)
            app.commandLine.appendArgument(arg)
        }
    } else {
        urls.push(arg)
    }
})
if (argAutoplayMedia !== "user" && argAutoplayMedia !== "always") {
    console.warn("The 'autoplay-media' argument only accepts:\n"
        + "'user' or 'always'\n")
    printUsage()
}
if (argAcceleration !== "hardware" && argAcceleration !== "software") {
    console.warn("The 'acceleration' argument only accepts:\n"
        + "'hardware' or 'software'\n")
    printUsage()
}
if (!argDatafolder.trim()) {
    console.warn("The 'datafolder' argument may not be empty\n")
    printUsage()
}
const validConfigOrders = [
    "none", "user-only", "datafolder-only", "user-first", "datafolder-first"
]
if (!validConfigOrders.includes(argConfigOrder)) {
    console.warn(`The 'config-order' argument only accepts:\n${
        validConfigOrders.slice(0, -1).map(c => `'${c}'`).join(", ")} or '${
        validConfigOrders.slice(-1)[0]}'\n`)
    printUsage()
}
if (argConfigOverride) {
    argConfigOverride = expandPath(argConfigOverride)
    if (!isAbsolutePath(argConfigOverride)) {
        argConfigOverride = joinPath(process.cwd(), argConfigOverride)
    }
    if (!isFile(argConfigOverride)) {
        console.warn("Config file could not be read\n")
        printUsage()
    }
}
// Fix segfault when opening Twitter:
// https://github.com/electron/electron/issues/25469
// https://github.com/electron/electron/issues/30201
app.commandLine.appendSwitch("disable-features",
    "CrossOriginOpenerPolicy,UserAgentClientHint")
if (argAcceleration === "software") {
    app.disableHardwareAcceleration()
}
if (!argMediaKeys) {
    app.commandLine.appendSwitch("disable-features",
        "CrossOriginOpenerPolicy,HardwareMediaKeyHandling,UserAgentClientHint")
}
rimraf("Partitions/temp*")
rimraf("erwicmode")
app.setName("Vieb")
argDatafolder = `${joinPath(expandPath(argDatafolder.trim()))}/`
app.setPath("appData", argDatafolder)
app.setPath("userData", argDatafolder)
applyDevtoolsSettings(joinPath(argDatafolder, "Preferences"))
if (argErwic) {
    argErwic = expandPath(argErwic)
    const config = readJSON(argErwic)
    if (!config) {
        console.warn("Erwic config file could not be read\n")
        printUsage()
    }
    if (config.name) {
        app.setName(title(config.name))
    }
    if (config.icon) {
        config.icon = expandPath(config.icon)
        if (config.icon !== joinPath(config.icon)) {
            config.icon = joinPath(dirname(argErwic), config.icon)
        }
        if (!isFile(config.icon)) {
            config.icon = null
        }
        customIcon = config.icon
    }
    writeFile(joinPath(argDatafolder, "erwicmode"), "")
    if (!Array.isArray(config.apps)) {
        console.warn("Erwic config file requires a list of 'apps'\n")
        printUsage()
    }
    config.apps = config.apps.map(a => {
        const simpleContainerName = a.container.replace(/_/g, "")
        if (simpleContainerName.match(specialChars)) {
            console.warn("Container names are not allowed to have "
                + "special characters besides underscores\n")
            printUsage()
        }
        if (typeof a.script === "string") {
            a.script = expandPath(a.script)
            if (a.script !== joinPath(a.script)) {
                a.script = joinPath(dirname(argErwic), a.script)
            }
        } else {
            a.script = null
        }
        return a
    }).filter(a => typeof a.container === "string" && typeof a.url === "string")
    if (config.apps.length === 0) {
        console.warn("Erwic config file requires at least one app to be added")
        console.warn("Each app must have a 'container' name and a 'url'\n")
        printUsage()
    }
    urls.push(...config.apps)
}

// When the app is ready to start, open the main window
let mainWindow = null
let loginWindow = null
let notificationWindow = null
const resolveLocalPaths = (paths, cwd = null) => paths.filter(u => u).map(u => {
    const url = u.url || u
    let fileLocation = expandPath(url.replace(/^file:\/+/g, "/"))
    if (process.platform === "win32") {
        fileLocation = expandPath(url.replace(/^file:\/+/g, ""))
    }
    if (!isAbsolutePath(fileLocation)) {
        fileLocation = joinPath(cwd || process.cwd(), url)
    }
    if (isFile(fileLocation)) {
        return `file:///${fileLocation.replace(/^\//g, "")}`
    }
    if (url.startsWith("-")) {
        return null
    }
    return {...u, url}
}).filter(u => u)
app.on("ready", () => {
    app.userAgentFallback = defaultUseragent()
    if (app.requestSingleInstanceLock()) {
        app.on("second-instance", (_, newArgs, cwd) => {
            if (mainWindow.isMinimized()) {
                mainWindow.restore()
            }
            mainWindow.focus()
            mainWindow.webContents.send("urls", resolveLocalPaths(
                getArguments(newArgs), cwd))
        })
    } else {
        console.info(`Sending urls to existing instance in ${argDatafolder}`)
        app.exit(0)
    }
    app.on("open-file", (_, url) => mainWindow.webContents.send("urls",
        resolveLocalPaths([url])))
    app.on("open-url", (_, url) => mainWindow.webContents.send("urls",
        resolveLocalPaths([url])))
    if (!app.isPackaged && !customIcon) {
        customIcon = joinPath(__dirname, "img/vieb.svg")
    }
    // Init mainWindow
    const windowData = {
        "closable": false,
        "frame": argWindowFrame,
        "height": 600,
        "icon": customIcon,
        "show": argDebugMode,
        "title": app.getName(),
        "webPreferences": {
            "allowpopups": true,
            "contextIsolation": false,
            "disableBlinkFeatures": "Auxclick",
            // Info on nodeIntegrationInSubFrames and nodeIntegrationInWorker:
            // https://github.com/electron/electron/issues/22582
            // https://github.com/electron/electron/issues/28620
            "nodeIntegrationInSubFrames": true,
            "nodeIntegrationInWorker": true,
            "preload": joinPath(__dirname, "renderer/index.js"),
            "sandbox": false,
            "webviewTag": true
        },
        "width": 800
    }
    mainWindow = new BrowserWindow(windowData)
    mainWindow.removeMenu()
    mainWindow.setMinimumSize(500, 500)
    mainWindow.on("focus", () => mainWindow.webContents.send("window-focus"))
    mainWindow.on("blur", () => mainWindow.webContents.send("window-blur"))
    mainWindow.on("close", e => {
        e.preventDefault()
        mainWindow.webContents.send("window-close")
    })
    mainWindow.on("closed", () => app.exit(0))
    // Load app and send urls when ready
    mainWindow.loadURL(`file://${joinPath(__dirname, "index.html")}`)
    mainWindow.webContents.once("did-finish-load", () => {
        mainWindow.webContents.on("new-window", e => e.preventDefault())
        mainWindow.webContents.on("will-navigate", e => e.preventDefault())
        mainWindow.webContents.on("will-redirect", e => e.preventDefault())
        if (argDebugMode) {
            mainWindow.webContents.openDevTools({"mode": "detach"})
        }
        mainWindow.webContents.send("urls", resolveLocalPaths(urls))
    })
    mainWindow.webContents.on("will-attach-webview", (_, prefs) => {
        delete prefs.preloadURL
        prefs.preload = joinPath(__dirname, "preload/index.js")
        prefs.sandbox = false
        prefs.contextIsolation = false
    })
    mainWindow.webContents.on("did-attach-webview", (_, contents) => {
        let navigationUrl = null
        contents.on("did-start-navigation", (__, url) => {
            navigationUrl = url
        })
        contents.on("did-redirect-navigation", (__, url) => {
            if (navigationUrl !== url) {
                mainWindow.webContents.send("redirect", navigationUrl, url)
            }
        })
        contents.setWebRTCIPHandlingPolicy("default_public_interface_only")
        contents.on("before-input-event", (e, input) => {
            if (blockedInsertMappings === "pass") {
                return
            }
            if (blockedInsertMappings === "all") {
                e.preventDefault()
            } else if (currentInputMatches(input)) {
                e.preventDefault()
            }
            mainWindow.webContents.send("insert-mode-input-event", input)
        })
        contents.on("zoom-changed", (__, dir) => {
            mainWindow.webContents.send("zoom-changed", contents.id, dir)
        })
        contents.on("certificate-error", (e, url, err, cert, fn) => {
            e.preventDefault()
            permissionHandler(null, "certificateerror", fn, {
                cert, "error": err, "requestingUrl": url
            })
        })
        contents.setWindowOpenHandler(e => {
            if (e.disposition === "foreground-tab") {
                mainWindow.webContents.send("navigate-to", e.url)
            } else {
                mainWindow.webContents.send("new-tab", e.url)
            }
            return {"action": "deny"}
        })
    })
    // Show a dialog for sites requiring Basic HTTP authentication
    const loginWindowData = {
        "alwaysOnTop": true,
        "frame": false,
        "fullscreenable": false,
        "icon": customIcon,
        "modal": true,
        "parent": mainWindow,
        "resizable": false,
        "show": false,
        "webPreferences": {
            "disableBlinkFeatures": "Auxclick",
            "partition": "login",
            "preload": joinPath(__dirname, "preload/loginpopup.js")
        }
    }
    loginWindow = new BrowserWindow(loginWindowData)
    const loginPage = `file:///${joinPath(__dirname, "pages/loginpopup.html")}`
    loginWindow.loadURL(loginPage)
    loginWindow.on("close", e => {
        e.preventDefault()
        loginWindow.hide()
        mainWindow.focus()
    })
    ipcMain.on("hide-login-window", () => {
        loginWindow.hide()
        mainWindow.focus()
    })
    // Show a dialog for large notifications
    const notificationWindowData = {
        "alwaysOnTop": true,
        "frame": false,
        "fullscreenable": false,
        "icon": customIcon,
        "modal": true,
        "parent": mainWindow,
        "resizable": false,
        "show": false,
        "webPreferences": {
            "disableBlinkFeatures": "Auxclick",
            "partition": "notification-window",
            "preload": joinPath(__dirname, "preload/notificationpopup.js")
        }
    }
    notificationWindow = new BrowserWindow(notificationWindowData)
    const notificationPage = `file:///${joinPath(
        __dirname, "pages/notificationpopup.html")}`
    notificationWindow.loadURL(notificationPage)
    notificationWindow.on("close", e => {
        e.preventDefault()
        notificationWindow.hide()
        mainWindow.focus()
    })
    ipcMain.on("hide-notification-window", () => {
        notificationWindow.hide()
        mainWindow.focus()
    })
})

// THIS ENDS THE MAIN SETUP, ACTIONS BELOW MUST BE IN MAIN FOR VARIOUS REASONS

// Handle Basic HTTP login attempts
const loginAttempts = []
let fontsize = 14
let customCSS = ""
ipcMain.on("set-custom-styling", (_, newFontSize, newCSS) => {
    fontsize = newFontSize
    customCSS = newCSS
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
        } catch {
            // Window was already closed
        }
    })
    ipcMain.removeAllListeners("login-credentials")
    ipcMain.once("login-credentials", (__, credentials) => {
        try {
            callback(credentials[0], credentials[1])
            loginWindow.hide()
            mainWindow.focus()
        } catch {
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
    loginWindow.focus()
    loginWindow.webContents.send("login-information",
        fontsize, customCSS, `${auth.host}: ${auth.realm}`)
})

// Show a scrollable notification popup for long notifications
ipcMain.on("show-notification", (_, escapedMessage, properType) => {
    const bounds = mainWindow.getBounds()
    const width = Math.round(bounds.width * 0.9)
    let height = Math.round(bounds.height * 0.9)
    height -= Math.round(height % fontsize + fontsize * 0.75)
    notificationWindow.setMinimumSize(width, height)
    notificationWindow.setSize(width, height)
    notificationWindow.setPosition(
        Math.round(bounds.x + bounds.width / 2 - width / 2),
        Math.round(bounds.y + bounds.height / 2 - height / 2))
    notificationWindow.webContents.send("notification-details",
        escapedMessage, fontsize, customCSS, properType)
    notificationWindow.show()
    notificationWindow.focus()
})

// Create and manage sessions, mostly downloads, adblocker and permissions
const dlsFile = joinPath(app.getPath("appData"), "dls")
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
ipcMain.on("open-download", (_, location) => shell.openPath(location))
ipcMain.on("set-download-settings", (_, settings) => {
    if (Object.keys(downloadSettings).length === 0) {
        if (settings.cleardownloadsonquit) {
            deleteFile(dlsFile)
        } else if (isFile(dlsFile)) {
            downloads = readJSON(dlsFile)?.map(d => {
                if (d.state !== "completed") {
                    d.state = "cancelled"
                }
                return d
            }) || []
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
            } catch {
                // Download was already removed or is already done
            }
        })
        downloads = []
    }
    if (action === "pause") {
        try {
            downloads[downloadId].item.pause()
        } catch {
            // Download just finished or some other silly reason
        }
    }
    if (action === "resume") {
        try {
            downloads[downloadId].item.resume()
        } catch {
            // Download can't be resumed
        }
    }
    if (action === "remove") {
        try {
            downloads[downloadId].state = "removed"
            downloads[downloadId].item.cancel()
        } catch {
            // Download was already removed from the list or something
        }
        try {
            downloads.splice(downloadId, 1)
        } catch {
            // Download was already removed from the list or something
        }
    }
    writeDownloadsToFile()
    e.sender.send("download-list", JSON.stringify(downloads))
})
ipcMain.on("set-permissions", (_, permissionObject) => {
    permissions = permissionObject
})
ipcMain.on("set-spelllang", (_, langs) => {
    if (!langs) {
        return
    }
    const parsedLangs = langs.split(",").map(l => {
        let lang = l
        if (lang === "system") {
            lang = app.getLocale()
        }
        const valid = session.defaultSession.availableSpellCheckerLanguages
        if (!valid.includes(lang)) {
            return null
        }
        return lang
    }).filter(lang => lang)
    sessionList.forEach(ses => {
        session.fromPartition(ses).setSpellCheckerLanguages(parsedLangs)
        session.defaultSession.setSpellCheckerLanguages(parsedLangs)
    })
})
ipcMain.on("create-session", (_, name, adblock, cache) => {
    if (sessionList.includes(name)) {
        return
    }
    const partitionDir = joinPath(app.getPath("appData"), "Partitions")
    const sessionDir = joinPath(partitionDir, encodeURIComponent(
        name.split(":")[1] || name))
    applyDevtoolsSettings(joinPath(sessionDir, "Preferences"))
    const newSession = session.fromPartition(name, {cache})
    newSession.setPermissionRequestHandler(permissionHandler)
    newSession.setPermissionCheckHandler(() => true)
    newSession.setDevicePermissionHandler(
        details => permissionHandler(null, details.deviceType, null, {
            ...details, "requestingUrl": details.origin
        }))
    sessionList.push(name)
    if (adblock !== "off") {
        if (blocker) {
            reloadAdblocker()
        } else {
            enableAdblocker(adblock)
        }
    }
    listDir(joinPath(argDatafolder, "extensions"), true, true)?.forEach(loc => {
        newSession.loadExtension(loc, {"allowFileAccess": true})
    })
    newSession.webRequest.onBeforeRequest((details, callback) => {
        let url = String(details.url)
        redirects.split(",").forEach(r => {
            if (r.trim()) {
                const [match, replace] = r.split("~")
                url = url.replace(RegExp(match), replace)
            }
        })
        if (details.url !== url) {
            return callback({"cancel": false, "redirectURL": url})
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
        let save = joinPath(downloadSettings.downloadpath, filename)
        let duplicateNumber = 0
        let newFilename = item.getFilename()
        while (isFile(save)) {
            duplicateNumber += 1
            let extStart = filename.lastIndexOf(".tar.")
            if (extStart === -1) {
                extStart = filename.lastIndexOf(".")
            }
            if (extStart === -1) {
                newFilename = `${filename} (${duplicateNumber})`
            } else {
                newFilename = `${filename.substring(0, extStart)} (${
                    duplicateNumber}).${filename.substring(extStart + 1)}`
            }
            save = joinPath(downloadSettings.downloadpath, newFilename)
        }
        if (downloadSettings.downloadmethod !== "ask") {
            item.setSavePath(save)
        }
        if (downloadSettings.downloadmethod === "confirm") {
            let wrappedFileName = filename.replace(/.{50}/g, "$&\n")
            if (wrappedFileName.length > 1000) {
                wrappedFileName = `${wrappedFileName.split("")
                    .slice(0, 1000).join("")}...`
            }
            let wrappedUrl = item.getURL()
            try {
                wrappedUrl = decodeURI(wrappedUrl)
            } catch {
                // Invalid url
            }
            wrappedUrl = wrappedUrl.replace(/.{50}/g, "$&\n")
            if (wrappedUrl.length > 1000) {
                wrappedUrl = `${wrappedUrl.split("")
                    .slice(0, 1000).join("")}...`
            }
            const button = dialog.showMessageBoxSync(mainWindow, {
                "buttons": ["Allow", "Deny"],
                "cancelId": 1,
                "defaultId": 0,
                "message": `Do you want to download the following file?\n\n${
                    wrappedFileName}\n\n${item.getMimeType()} - ${
                    formatSize(item.getTotalBytes())}\n\n${wrappedUrl}`,
                "title": "Download request from the website",
                "type": "question"
            })
            if (button === 1) {
                e.preventDefault()
                return
            }
        }
        const info = {
            "current": 0,
            "date": new Date(),
            "file": item.getSavePath(),
            item,
            "name": filename,
            "state": "waiting_to_start",
            "total": item.getTotalBytes(),
            "url": item.getURL()
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
            } catch {
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
                    `Download finished:\n${info.name}`, "success", {
                        "path": info.file, "type": "download-success"
                    })
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
        } catch {
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
        } catch {
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
const allowedFingerprints = {}
const permissionHandler = (_, perm, callback, details) => {
    let permission = perm.toLowerCase().replace(/-/g, "")
    if (permission === "mediakeysystem") {
        // Block any access to DRM, there is no Electron support for it anyway
        callback?.(false)
        return false
    }
    if (permission === "media") {
        if (details.mediaTypes?.includes("video")) {
            permission = "camera"
        } else if (details.mediaTypes?.includes("audio")) {
            permission = "microphone"
        } else {
            permission = "displaycapture"
        }
    }
    let permissionName = `permission${permission}`
    if (permission === "openexternal" && details.externalURL) {
        if (details.externalURL.startsWith(`${app.getName().toLowerCase()}:`)) {
            mainWindow.webContents.send("navigate-to", details.externalURL)
            return
        }
    }
    let setting = permissions[permissionName]
    if (!setting) {
        permissionName = "permissionunknown"
        setting = permissions.permissionunknown
    }
    let settingRule = ""
    for (const override of ["asked", "blocked", "allowed"]) {
        const permList = permissions[`permissions${override}`]?.split(",")
        for (const rule of permList || []) {
            if (!rule.trim() || settingRule) {
                continue
            }
            const [match, ...names] = rule.split("~")
            if (names.find(p => permissionName.endsWith(p))) {
                if (details.requestingUrl.match(match)) {
                    settingRule = override.replace("ed", "")
                }
            }
        }
    }
    const domain = domainName(details.requestingUrl)
    if (permission === "certificateerror") {
        if (allowedFingerprints[domain]?.includes(details.cert.fingerprint)) {
            mainWindow.webContents.send("notify",
                `Automatic domain caching rule for '${permission}' activated `
                + `at '${details.requestingUrl}' which was allowed, because `
                + `this same certificate was allowed before on this domain`,
                "perm")
            callback?.(true)
            return true
        }
    }
    setting = settingRule || setting
    if (setting === "ask") {
        let url = details.requestingUrl
        if (url.length > 100) {
            url = url.replace(/.{50}/g, "$&\n")
        }
        if (url.length > 1000) {
            url = `${url.split("").slice(0, 1000).join("")}...`
        }
        let message = "The page has requested access to the permission "
            + `'${permission}'. You can allow or deny this below, and choose if`
            + " you want to make this the default for the current session when "
            + "sites ask for this permission. For help and more options, see "
            + `':h ${permissionName}', ':h permissionsallowed', ':h permissions`
            + `asked' and ':h permissionsblocked'.\n\npage:\n${url}`
        let checkboxLabel = "Remember for this session"
        if (permission === "openexternal") {
            let exturl = details.externalURL
            if (exturl.length > 100) {
                exturl = exturl.replace(/.{50}/g, "$&\n")
            }
            if (exturl.length > 1000) {
                exturl = `${exturl.split("").slice(0, 1000).join("")}...`
            }
            message = "The page has requested to open an external application."
                + " You can allow or deny this below, and choose if you want to"
                + " make this the default for the current session when sites "
                + "ask to open urls in external programs. For help and more "
                + "options, see ':h permissionopenexternal', ':h permissionsall"
                + "owed', ':h permissionsasked' and ':h permissionsblocked'."
                + `\n\npage:\n${url}\n\nexternal:\n${exturl}`
        }
        if (permission === "certificateerror") {
            message = "The page has a certificate error listed below. You can "
                + "choose if you still want to continue visiting. Please do "
                + "this after reviewing the certificate details. Because of the"
                + " nature of certificates, any allowed certs will keep being "
                + "trusted per domain until you restart Vieb. Changing the "
                + "permission setting afterwards won't change this behavior."
                + "So while you can deny the same certificate multiple times, "
                + "you only need to allow it once to be able to keep using it."
                + ` For help and more options, see ':h ${permissionName}'.`
                + `\n\npage: ${url}\ndomain: ${domain}\n\n`
                + `ISSUER: ${details.cert.issuerName}\n`
                + `SELF-SIGNED: ${!details.cert.issuerCert}\n`
                + `SUBJECT: ${details.cert.subjectName}\n`
                + `STARTS: ${formatDate(details.cert.validStart)}\n`
                + `EXPIRES: ${formatDate(details.cert.validExpiry)}\n`
                + `FINGERPRINT: ${details.cert.fingerprint}\n\n`
                + "Only allow certificates you have verified and can trust!"
            checkboxLabel = undefined
        }
        dialog.showMessageBox(mainWindow, {
            "buttons": ["Allow", "Deny"],
            "cancelId": 1,
            checkboxLabel,
            "defaultId": 0,
            message,
            "title": `Allow this page to access '${permission}'?`,
            "type": "question"
        }).then(e => {
            let action = "allow"
            if (e.response !== 0) {
                action = "block"
            }
            if (settingRule) {
                mainWindow.webContents.send("notify",
                    `Ask rule for '${permission}' activated at '`
                    + `${details.requestingUrl}' which was ${action}ed by user`,
                    "perm")
            } else {
                mainWindow.webContents.send("notify",
                    `Manually ${action}ed '${permission}' at `
                    + `'${details.requestingUrl}'`, "perm")
            }
            const allow = action === "allow"
            const canSave = !allow || permission !== "displaycapture"
            if (e.checkboxChecked && canSave) {
                mainWindow.webContents.send(
                    "set-permission", permissionName, action)
                permissions[permissionName] = action
            }
            if (permission === "certificateerror" && allow) {
                if (!allowedFingerprints[domain]) {
                    allowedFingerprints[domain] = []
                }
                allowedFingerprints[domain].push(details.cert.fingerprint)
            }
            callback?.(allow)
            return allow
        })
    } else {
        if (settingRule) {
            mainWindow.webContents.send("notify",
                `Automatic rule for '${permission}' activated at `
                + `'${details.requestingUrl}' which was ${setting}ed`,
                "perm")
        } else {
            mainWindow.webContents.send("notify",
                `Globally ${setting}ed '${permission}' at `
                + `'${details.requestingUrl}' based on '${permissionName}'`,
                "perm")
        }
        const allow = setting === "allow"
        if (permission === "certificateerror" && allow) {
            if (!allowedFingerprints[domain]) {
                allowedFingerprints[domain] = []
            }
            allowedFingerprints[domain].push(details.cert.fingerprint)
        }
        callback?.(allow)
        return allow
    }
}
const blocklistDir = joinPath(app.getPath("appData"), "blocklists")
const defaultBlocklists = {
    "easylist": "https://easylist.to/easylist/easylist.txt",
    "easyprivacy": "https://easylist.to/easylist/easyprivacy.txt"
}
const enableAdblocker = type => {
    makeDir(blocklistDir)
    // Copy the default and included blocklists to the appdata folder
    if (type !== "custom") {
        for (const name of Object.keys(defaultBlocklists)) {
            const list = joinPath(__dirname, `./blocklists/${name}.txt`)
            writeFile(joinPath(blocklistDir, `${name}.txt`), readFile(list))
        }
    }
    // And update default blocklists to the latest version if enabled
    if (type === "update") {
        for (const list of Object.keys(defaultBlocklists)) {
            mainWindow.webContents.send("notify",
                `Updating ${list} to the latest version`)
            session.fromPartition("persist:main")
            const request = net.request(
                {"partition": "persist:main", "url": defaultBlocklists[list]})
            request.on("response", res => {
                let body = ""
                res.on("end", () => {
                    writeFile(joinPath(blocklistDir, `${list}.txt`), body)
                    reloadAdblocker()
                    mainWindow.webContents.send("notify",
                        `Updated and reloaded the latest ${list} successfully`,
                        "suc")
                })
                res.on("data", chunk => {
                    body += chunk
                })
            })
            request.on("abort", e => mainWindow.webContents.send("notify",
                `Failed to update ${list}:\n${e.message}`, "err"))
            request.on("error", e => mainWindow.webContents.send("notify",
                `Failed to update ${list}:\n${e.message}`, "err"))
            request.end()
        }
    } else {
        reloadAdblocker()
    }
}
const reloadAdblocker = () => {
    if (blocker) {
        disableAdblocker()
    }
    const blocklistsFolders = [
        joinPath(app.getPath("appData"), "blocklists"),
        expandPath("~/.vieb/blocklists")
    ]
    let filters = ""
    for (const blocklistsFolder of blocklistsFolders) {
        listDir(blocklistsFolder, true)?.forEach(file => {
            if (file.endsWith(".txt")) {
                filters += loadBlocklist(file)
            }
        })
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
ipcMain.on("adblock-enable", (_, type) => {
    if (sessionList.length > 0) {
        // Only listen to enable calls after initial init has already happened
        enableAdblocker(type)
    }
})
ipcMain.on("adblock-disable", disableAdblocker)
const loadBlocklist = file => {
    const contents = readFile(file)
    if (contents) {
        return `${contents}\n`
    }
    return ""
}

// Manage installed browser extensions
ipcMain.on("install-extension", (_, url, extension, extType) => {
    const zipLoc = joinPath(argDatafolder, "extensions", extension)
    if (isDir(`${zipLoc}/`)) {
        mainWindow.webContents.send("notify",
            `Extension already installed: ${extension}`)
        return
    }
    makeDir(`${zipLoc}/`)
    mainWindow.webContents.send("notify",
        `Installing ${extType} extension: ${extension}`)
    const request = net.request({"partition": "persist:main", url})
    request.on("response", res => {
        const data = []
        res.on("end", () => {
            if (res.statusCode !== 200) {
                mainWindow.webContents.send("notify",
                    `Failed to install extension due to network error`, "err")
                console.warn(res)
                return
            }
            const file = Buffer.concat(data)
            writeFile(`${zipLoc}.${extType}`, file)
            extractZip([
                "x", "-aoa", "-tzip", `${zipLoc}.${extType}`, `-o${zipLoc}/`
            ], () => {
                rimraf(`${zipLoc}/_metadata/`)
                sessionList.forEach(ses => {
                    session.fromPartition(ses).loadExtension(zipLoc, {
                        "allowFileAccess": true
                    }).then(() => {
                        if (sessionList.indexOf(ses) === 0) {
                            mainWindow.webContents.send("notify",
                                `Extension successfully installed`, "suc")
                        }
                    }).catch(e => {
                        if (sessionList.indexOf(ses) === 0) {
                            mainWindow.webContents.send("notify",
                                `Failed to install extension, unsupported type`,
                                "err")
                            console.warn(e)
                            rimraf(`${zipLoc}*`)
                        }
                    })
                })
            })
        })
        res.on("data", chunk => {
            data.push(Buffer.from(chunk, "binary"))
        })
    })
    request.on("abort", e => {
        mainWindow.webContents.send("notify",
            `Failed to install extension due to network error`, "err")
        console.warn(e)
        rimraf(`${zipLoc}*`)
    })
    request.on("error", e => {
        mainWindow.webContents.send("notify",
            `Failed to install extension due to network error`, "err")
        console.warn(e)
        rimraf(`${zipLoc}*`)
    })
    request.end()
})
ipcMain.on("list-extensions", e => {
    e.returnValue = session.fromPartition("persist:main").getAllExtensions()
        .map(ex => ({
            "icon": ex.manifest.icons?.[Object.keys(ex.manifest.icons).pop()],
            "id": ex.id,
            "name": ex.name,
            "path": ex.path,
            "version": ex.version
        }))
})
ipcMain.on("remove-extension", (_, extensionId) => {
    const extLoc = joinPath(argDatafolder, `extensions/${extensionId}`)
    const extension = session.fromPartition("persist:main").getAllExtensions()
        .find(ext => ext.path.replace(/(\/|\\)$/g, "").endsWith(extensionId))
    if (isDir(`${extLoc}/`) && extension) {
        mainWindow.webContents.send("notify",
            `Removing extension: ${extensionId}`)
        sessionList.forEach(ses => {
            session.fromPartition(ses).removeExtension(extension.id)
        })
        rimraf(`${extLoc}*`)
        mainWindow.webContents.send("notify",
            `Extension successfully removed`, "suc")
    } else {
        mainWindow.webContents.send("notify", "Could not find extension with "
            + `id: ${extensionId}`, "warn")
    }
})

// Download favicons for websites
ipcMain.on("download-favicon", (_, options) => {
    const request = net.request({
        "session": webContents.fromId(options.webId).session, "url": options.fav
    })
    request.on("response", res => {
        const data = []
        res.on("end", () => {
            if (res.statusCode !== 200) {
                // Failed to download favicon
                return
            }
            const file = Buffer.concat(data)
            if (isSvg(file)) {
                writeFile(`${options.location}.svg`, file)
                mainWindow.webContents.send("favicon-downloaded",
                    options.linkId, options.url, `${options.fav}.svg`)
            } else {
                writeFile(options.location, file)
                mainWindow.webContents.send("favicon-downloaded",
                    options.linkId, options.url, options.fav)
            }
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
const windowStateFile = joinPath(app.getPath("appData"), "windowstate")
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
    mainWindow.focus()
    // Save the window state when resizing or maximizing.
    // Move and resize state are saved and checked to detect window snapping.
    let justMoved = false
    let justResized = false
    mainWindow.on("maximize", saveWindowState)
    mainWindow.on("unmaximize", saveWindowState)
    mainWindow.on("resize", () => {
        justResized = true
        setTimeout(() => {
            if (!justMoved) {
                saveWindowState()
            }
        }, 10)
        setTimeout(() => {
            justResized = false
            saveWindowState()
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
            saveWindowState()
        }, 30)
    })
})
const saveWindowState = (maximizeOnly = false) => {
    let state = readJSON(windowStateFile) || {}
    if (!maximizeOnly && !mainWindow.isMaximized()) {
        const newBounds = mainWindow.getBounds()
        const currentScreen = screen.getDisplayMatching(newBounds).workArea
        const sameW = newBounds.width === currentScreen.width
        const sameH = newBounds.height === currentScreen.height
        const halfW = newBounds.width === currentScreen.width / 2
        const halfH = newBounds.height === currentScreen.height / 2
        const halfX = newBounds.x === currentScreen.x / 2
        const halfY = newBounds.y === currentScreen.y / 2
        if (!sameW && !sameH && !halfW && !halfH && !halfX && !halfY) {
            state = newBounds
        }
    }
    state.maximized = mainWindow.isMaximized()
    writeJSON(windowStateFile, state)
}

// Miscellaneous tasks
ipcMain.handle("save-page", (_, id, loc) => {
    webContents.fromId(id).savePage(loc, "HTMLComplete")
})
ipcMain.on("hide-window", () => {
    if (!argDebugMode) {
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
ipcMain.on("open-internal-devtools",
    () => mainWindow.webContents.openDevTools({"mode": "detach"}))
ipcMain.on("destroy-window", () => {
    cancellAllDownloads()
    mainWindow.destroy()
})
ipcMain.handle("list-spelllangs",
    () => session.defaultSession.availableSpellCheckerLanguages)
ipcMain.handle("toggle-always-on-top", () => {
    mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop())
})
ipcMain.handle("toggle-fullscreen", () => {
    mainWindow.fullScreen = !mainWindow.fullScreen
})
let blockedInsertMappings = []
ipcMain.on("insert-mode-blockers", (e, blockedMappings) => {
    blockedInsertMappings = blockedMappings
    e.returnValue = null
})
const currentInputMatches = input => blockedInsertMappings.find(mapping => {
    if (!!mapping.alt === input.alt && !!mapping.control === input.control) {
        if (!!mapping.meta === input.meta && !!mapping.shift === input.shift) {
            if (input.location === 3) {
                return mapping.key === `k${input.key}`
            }
            return mapping.key === input.key
        }
    }
    return false
})
ipcMain.on("set-window-title", (_, t) => {
    mainWindow.title = t
})
ipcMain.handle("show-message-dialog", (_, options) => dialog.showMessageBox(
    mainWindow, options))
ipcMain.on("sync-message-dialog", (e, options) => {
    e.returnValue = dialog.showMessageBoxSync(mainWindow, options)
})
ipcMain.handle("list-cookies", e => e.sender.session.cookies.get({}))
ipcMain.handle("remove-cookie",
    (e, url, name) => e.sender.session.cookies.remove(url, name))
ipcMain.handle("make-default-app", () => {
    app.setAsDefaultProtocolClient("http")
    app.setAsDefaultProtocolClient("https")
})
ipcMain.handle("desktop-capturer-sources", () => desktopCapturer.getSources({
    "fetchWindowIcons": true, "types": ["screen", "window"]
}))
// Operations below are sync
ipcMain.on("override-global-useragent", (e, globalUseragent) => {
    app.userAgentFallback = globalUseragent || defaultUseragent()
    e.returnValue = null
})
ipcMain.on("rimraf", (e, folder) => {
    e.returnValue = rimraf(folder)
})
ipcMain.on("app-config", e => {
    e.returnValue = {
        "appdata": app.getPath("appData"),
        "autoplay": argAutoplayMedia,
        "icon": customIcon || undefined,
        "name": app.getName(),
        "order": argConfigOrder,
        "override": argConfigOverride,
        version
    }
})
ipcMain.on("is-fullscreen", e => {
    e.returnValue = mainWindow.fullScreen
})
ipcMain.on("relaunch", () => app.relaunch())
ipcMain.on("mouse-location", e => {
    const windowBounds = mainWindow.getBounds()
    const mousePos = screen.getCursorScreenPoint()
    const x = mousePos.x - windowBounds.x
    const y = mousePos.y - windowBounds.y
    if (x < windowBounds.width && y < windowBounds.height) {
        e.returnValue = {x, y}
        return
    }
    e.returnValue = null
})
ipcMain.on("follow-mode-start", (_, id, switchTo = false) => {
    webContents.fromId(id).mainFrame.framesInSubtree.forEach(
        f => f.send("follow-mode-start"))
    if (switchTo) {
        allLinks = []
    }
})
ipcMain.on("follow-mode-stop", e => {
    e.sender.mainFrame.framesInSubtree.forEach(f => f.send("follow-mode-stop"))
})
let allLinks = []
const frameInfo = {}
ipcMain.on("frame-details", (e, details) => {
    const frameId = `${e.frameId}-${e.processId}`
    if (!frameInfo[frameId]) {
        frameInfo[frameId] = {}
    }
    frameInfo[frameId].id = frameId
    frameInfo[frameId].url = details.url
    details.subframes.forEach(subframe => {
        Object.keys(frameInfo).forEach(id => {
            if (frameInfo[id].url === subframe.url && id !== frameId) {
                frameInfo[id].x = subframe.x
                frameInfo[id].y = subframe.y
                frameInfo[id].width = subframe.width
                frameInfo[id].height = subframe.height
                frameInfo[id].pagex = details.pagex
                frameInfo[id].pagey = details.pagey
                frameInfo[id].parent = frameId
            }
        })
    })
})
ipcMain.on("follow-response", (e, rawLinks) => {
    const frameId = `${e.frameId}-${e.processId}`
    const info = frameInfo[frameId]
    let frameX = info?.x || 0
    let frameY = info?.y || 0
    let parent = info?.parent
    while (parent) {
        const parentInfo = frameInfo[parent]
        frameX += parentInfo?.x || 0
        frameY += parentInfo?.y || 0
        parent = parentInfo?.parent
    }
    const frameLinks = rawLinks.map(l => ({
        ...l,
        "frameAbsX": frameX,
        "frameAbsY": frameY,
        "frameHeight": info?.height,
        frameId,
        "frameWidth": info?.width,
        "frameX": info?.x,
        "frameY": info?.y,
        "x": l.x + frameX,
        "xInFrame": l.x,
        "y": l.y + frameY,
        "yInFrame": l.y
    })).filter(l => (!info?.height || l.y < info?.height)
        && (!info?.width || l.x < info?.width))
    const allFramesIds = mainWindow.webContents.mainFrame
        .framesInSubtree.map(f => `${f.routingId}-${f.processId}`)
    allLinks = allLinks.filter(l => l.frameId !== frameId
        && allFramesIds.includes(l.frameId))
    allLinks = allLinks.concat(frameLinks)
    mainWindow.webContents.send("follow-response", allLinks)
})
const findRelevantSubFrame = (wc, x, y) => {
    const absoluteFrames = wc.mainFrame.framesInSubtree.map(f => {
        const id = `${f.routingId}-${f.processId}`
        const info = frameInfo[id]
        if (!info?.parent) {
            return null
        }
        info.absX = info.x
        info.absY = info.y
        let parent = frameInfo[info.parent]
        while (parent) {
            info.absX += parent.x || 0
            info.absY += parent.y || 0
            parent = frameInfo[parent]
        }
        return info
    }).filter(f => f)
    let relevantFrame = null
    absoluteFrames.forEach(info => {
        if (info.absX < x && info.absY < y) {
            if (info.absX + info.width > x && info.absY + info.height > y) {
                if (relevantFrame) {
                    if (relevantFrame.width > info.width) {
                        // A smaller frame means a subframe, use that instead
                        relevantFrame = info
                    }
                } else {
                    relevantFrame = info
                }
            }
        }
    })
    return relevantFrame
}
ipcMain.on("action", (_, id, actionName, ...opts) => {
    const wc = webContents.fromId(id)
    if (typeof opts[0] === "number" && typeof opts[1] === "number") {
        const subframe = findRelevantSubFrame(wc, opts[0], opts[1])
        if (subframe) {
            const frameRef = wc.mainFrame.framesInSubtree.find(f => {
                const frameId = `${f.routingId}-${f.processId}`
                return frameId === subframe.id
            })
            if (actionName === "selectionRequest") {
                frameRef.send("action", actionName,
                    opts[0] - subframe.absX, opts[1] - subframe.absY,
                    opts[2] - subframe.absX, opts[3] - subframe.absY)
            }
            frameRef.send("action", actionName, opts[0] - subframe.absX,
                opts[1] - subframe.absY, ...opts.slice(2))
            return
        }
    }
    wc.mainFrame.framesInSubtree.forEach(
        f => f.send("action", actionName, ...opts))
})
ipcMain.on("contextmenu-data", (_, id, info) => {
    const wc = webContents.fromId(id)
    const subframe = findRelevantSubFrame(wc, info.x, info.y)
    if (subframe) {
        const frameRef = wc.mainFrame.framesInSubtree.find(f => {
            const frameId = `${f.routingId}-${f.processId}`
            return frameId === subframe.id
        })
        frameRef.send("contextmenu-data", {
            ...info, "x": info.x - subframe.absX, "y": info.y - subframe.absY
        })
    } else {
        wc.send("contextmenu-data", info)
    }
})
ipcMain.on("contextmenu", (_, id) => {
    webContents.fromId(id).mainFrame.framesInSubtree.forEach(
        f => f.send("contextmenu"))
})
ipcMain.on("focus-input", (_, id, location = null) => {
    const wc = webContents.fromId(id)
    if (location) {
        const subframe = findRelevantSubFrame(wc, location.x, location.y)
        if (subframe) {
            const frameRef = wc.mainFrame.framesInSubtree.find(f => {
                const frameId = `${f.routingId}-${f.processId}`
                return frameId === subframe.id
            })
            frameRef.send("focus-input", {
                "x": location.x - subframe.absX, "y": location.y - subframe.absY
            })
            return
        }
    }
    wc.send("focus-input", location)
})
ipcMain.on("replace-input-field", (_, id, frameId, correction, inputField) => {
    const wc = webContents.fromId(id)
    if (frameId) {
        const frameRef = wc.mainFrame.framesInSubtree.find(
            f => frameId === `${f.routingId}-${f.processId}`)
        frameRef.send("replace-input-field", correction, inputField)
        return
    }
    wc.send("replace-input-field", correction, inputField)
})
ipcMain.on("context-click-info", (e, clickInfo) => {
    const frameId = `${e.frameId}-${e.processId}`
    const info = frameInfo[frameId]
    let frameX = info?.x || 0
    let frameY = info?.y || 0
    let parent = info?.parent
    let parentId = frameId
    while (parent) {
        const parentInfo = frameInfo[parent]
        frameX += parentInfo?.x || 0
        frameY += parentInfo?.y || 0
        parent = parentInfo?.parent
        parentId = parentInfo?.id || frameId
    }
    let frameUrl = clickInfo.frame
    if (info?.x && info?.url) {
        frameUrl = info.url
    }
    const webviewId = webContents.getAllWebContents().find(wc => {
        const wcId = `${wc.mainFrame.routingId}-${wc.mainFrame.processId}`
        return wcId === parentId
    })?.id
    mainWindow.webContents.send("context-click-info", {
        ...clickInfo,
        "frame": frameUrl,
        "frameAbsX": frameX,
        "frameAbsY": frameY,
        "frameHeight": info?.height,
        frameId,
        "frameWidth": info?.width,
        "frameX": info?.x,
        "frameY": info?.y,
        webviewId,
        "x": clickInfo.x + frameX,
        "xInFrame": clickInfo.x,
        "y": clickInfo.y + frameY,
        "yInFrame": clickInfo.y
    })
})
ipcMain.on("send-input-event", (_, id, inputInfo) => {
    const X = inputInfo.x
    const Y = inputInfo.y
    const wc = webContents.fromId(id)
    const subframe = findRelevantSubFrame(wc, X, Y)
    if (subframe) {
        const frameRef = wc.mainFrame.framesInSubtree.find(f => {
            const frameId = `${f.routingId}-${f.processId}`
            return frameId === subframe.id
        })
        // TODO actually respond to these inside iframes
        if (inputInfo.type === "scroll") {
            frameRef.send("scroll-at-location", {
                "x": X - subframe.absX, "y": Y - subframe.absY
            })
            return
        }
        frameRef.send("enter-hover-location", {
            "x": X - subframe.absX, "y": Y - subframe.absY
        })
        if (inputInfo.type === "click") {
            frameRef.send("click-at-location", {
                "button": inputInfo.button,
                "x": X - subframe.absX,
                "y": Y - subframe.absY
            })
        }
        if (["click", "leave"].includes(inputInfo.type)) {
            frameRef.send("leave-hover-location", {
                "x": X - subframe.absX, "y": Y - subframe.absY
            })
        }
        return
    }
    if (inputInfo.type === "scroll") {
        wc.sendInputEvent({
            "deltaX": inputInfo.deltaX || 0,
            "deltaY": inputInfo.deltaY || 0,
            "type": "mouseWheel",
            "x": X,
            "y": Y
        })
        return
    }
    wc.sendInputEvent({"type": "mouseEnter", "x": X, "y": Y})
    wc.sendInputEvent({"type": "mouseMove", "x": X, "y": Y})
    if (inputInfo.type === "click") {
        wc.sendInputEvent({
            "button": inputInfo.button || "left",
            "clickCount": 1,
            "type": "mouseDown",
            "x": X,
            "y": Y
        })
        wc.sendInputEvent({
            "button": inputInfo.button || "left",
            "type": "mouseUp",
            "x": X,
            "y": Y
        })
    }
    if (["click", "leave"].includes(inputInfo.type)) {
        wc.sendInputEvent({"type": "mouseLeave", "x": X, "y": Y})
    }
})
