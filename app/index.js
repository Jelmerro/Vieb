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
    webContents,
    nativeTheme
} = require("electron")
const {
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
    isAbsolutePath,
    formatDate,
    domainName,
    defaultUseragent,
    rm,
    watchFile
} = require("./util")

const version = process.env.npm_package_version || app.getVersion()
if (!app.getName().toLowerCase().startsWith("vieb")) {
    app.setName("Vieb")
}

/** Print the license information to the console. */
const printLicense = () => {
    console.info(`Vieb is created by Jelmer van Arnhem and contributors.
Website: https://vieb.dev OR https://github.com/Jelmerro/Vieb

License: GNU GPL version 3 or later versions <http://gnu.org/licenses/gpl.html>
This is free software; you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
See the LICENSE file or the GNU website for details.`)
}

/**
 * Print the help information and usage, then exit with provided code.
 * @param {number} code - The exit code of the application.
 */
const printUsage = (code = 1) => {
    console.info(`Vieb: Vim Inspired Electron Browser

Usage: vieb [options] <URLs>

Options:
 --help                  Print this help and exit.

 --version               Print program info with versions and exit.

 --devtools              Open with Chromium and Electron debugging tools.
                         They can also be opened later with ':internaldevtools'.

 --devtools-theme=<val>  string [DARK/light]: Control the devtools theme.
                         By default, the devtools will be themed dark like Vieb.
                         You can also use the ENV var: 'VIEB_DEVTOOLS_THEME'.

 --datafolder=<dir>      Store ALL Vieb data in this folder.
                         See ':h datafolder' for usage and details.
                         You can also use the ENV var: 'VIEB_DATAFOLDER'.

 --erwic=<file>          file: Location of the JSON file to configure Erwic.
                         Open a fixed set of pages in a separate instance.
                         See 'Erwic.md' or ':h erwic' for usage and details.
                         You can also use the ENV var: 'VIEB_ERWIC'.

 --execute=<command>     command: A command to run inside the existing instance.
                         If Vieb is running inside this datafolder,
                         this command will be run inside that Vieb instance,
                         and the result of the command is returned in the shell.
                         This can for example be used to get the current url,
                         to change settings, to add mappings or to press keys,
                         inside the existing Vieb running in this datafolder.
                         If no datafolder is provided via ENV or argument,
                         the default datafolder is used to execute the command.
                         It will wait for the first notification and return,
                         or exit after 5 seconds of no related notifications.
                         This can be changed with one of the following args:
                         --execute-dur for seconds or --execute-count for count.
                         If either the configured duration or count is reached,
                         the execute will return with the notification results.
                         If running from a script and parsing the output,
                         you probably want to strip the error logging like so:
                         $ vieb --execute="echo <useCurrentUrl>" 2>/dev/null
                         Or if running with NPM, you need to disable that too:
                         $ npm run --silent dev -- --execute=":test" 2>/dev/null
                         On Windows you can replace /dev/null with nul instead.

 --execute-dur=<val>     number (5000): Milliseconds before stopping execute.
                         By default, after 5 seconds the --execute call is quit,
                         possibly without any value, as to prevent blocking.
                         You can either increase this timeout/duration here,
                         or disable it entirely by setting it to 0,
                         meaning the only exit option is via notification count.
                         You can also use the ENV var: 'VIEB_EXECUTE_DUR'.

 --execute-count=<val>   number (1): The number of messages to read before exit.
                         The --execute flag will exit after 1 message,
                         unless this flag is used to increase the limit.
                         Setting high values likely means it will never return,
                         Results are not printed while they are processed,
                         but printed in one go once all notifications are done.
                         You can disable the count exit by setting it to 0,
                         meaning the execute duration is the only exit option.
                         You can also use the ENV var: 'VIEB_EXECUTE_COUNT'.

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

 --interface-scale=<val> number (1.0): Scale the interface to a custom factor.
                         Will scale the entire interface including pages,
                         can be used together with the guifontsize setting.
                         You can also use the ENV var: 'VIEB_INTERFACE_SCALE'.

 --unsafe-multiwin=<val> bool (false): Allow 2+ windows in the same datafolder.
                         This is fundamentally unsafe, but often requested.
                         See the FAQ for more details about multiple windows.
                         You can also use the ENV var: 'VIEB_UNSAFE_MULTIWIN'.

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

/** Print version information and exit the app with exit code 0. */
const printVersion = () => {
    console.info(`Vieb: Vim Inspired Electron Browser
This is version ${version} of ${app.getName()}.
Vieb is based on Electron and inspired by Vim.
It can be used to browse the web entirely with the keyboard.
This release uses Electron ${process.versions.electron} and Chromium ${
    process.versions.chrome}`)
    printLicense()
    app.exit(0)
}

/**
 * Parse the startup arguments.
 * @param {string[]} argv
 */
const getArguments = argv => {
    const execFile = basePath(argv[0])
    if (execFile === "electron" || process.defaultApp && execFile !== "vieb") {
        // The array argv is ["electron", "app", ...args]
        return argv.slice(2)
    }
    // The array argv is ["vieb", ...args]
    return argv.slice(1)
}

/**
 * Check if the provided string argument should be true or false as a boolean.
 * @param {string|null} arg
 */
const isTruthyArg = (arg = null) => {
    const argStr = String(arg).trim().toLowerCase()
    return Number(argStr) > 0 || ["y", "yes", "true", "on"].includes(argStr)
}

const args = getArguments(process.argv)
/** @type {(string|{container?: unknown, url?: unknown, script?: unknown})[]} */
const urls = []
/** @type {Electron.Input[]|"pass"|"all"} */
let blockedInsertMappings = []
let argDebugMode = false
let argDatafolder = process.env.VIEB_DATAFOLDER?.trim()
    || joinPath(app.getPath("appData"), "Vieb")
let argErwic = process.env.VIEB_ERWIC?.trim() || ""
let argExecute = ""
let argExecuteDur = Number(process.env.VIEB_EXECUTE_DUR?.trim() || 5000) || 5000
let argExecuteCount = Number(process.env.VIEB_EXECUTE_COUNT?.trim() || 1) || 1
let argWindowFrame = isTruthyArg(process.env.VIEB_WINDOW_FRAME)
let argConfigOrder = process.env.VIEB_CONFIG_ORDER?.trim().toLowerCase()
    || "user-first"
let argConfigOverride = process.env.VIEB_CONFIG_FILE?.trim() || ""
let argMediaKeys = isTruthyArg(process.env.VIEB_MEDIA_KEYS)
if (!process.env.VIEB_MEDIA_KEYS) {
    argMediaKeys = true
}
let argAutoplayMedia = process.env.VIEB_AUTOPLAY_MEDIA?.trim().toLowerCase()
    || "user"
let argAcceleration = process.env.VIEB_ACCELERATION?.trim().toLowerCase()
    || "hardware"
let argInterfaceScale = Number(
    process.env.VIEB_INTERFACE_SCALE?.trim() || 1.0) || 1.0
let argDevtoolsTheme = process.env.VIEB_DEVTOOLS_THEME?.trim().toLowerCase()
    || "dark"
let argUnsafeMultiwin = isTruthyArg(process.env.VIEB_UNSAFE_MULTIWIN)
/** @type {string|null} */
let customIcon = null
args.forEach(a => {
    const arg = a.trim()
    if (arg.startsWith("-")) {
        if (arg === "--help") {
            printUsage(0)
        } else if (arg === "--version") {
            printVersion()
        } else if (arg === "--devtools") {
            argDebugMode = true
        } else if (arg === "--datafolder") {
            console.warn("The 'datafolder' argument requires a value such as:"
                + " --datafolder=~/.config/Vieb/\n")
            printUsage()
        } else if (arg === "--erwic") {
            console.warn("The 'erwic' argument requires a value such as:"
                + " --erwic=~/.config/Erwic/\n")
            printUsage()
        } else if (arg === "--execute") {
            console.warn("The 'execute' argument requires a value such as:"
                + " --execute=\"echo <useCurrentUrl>\"\n")
            printUsage()
        } else if (arg === "--execute-dur") {
            console.warn("The 'execute-dur' argument requires a value such as:"
                + " --execute-dur=5000\n")
            printUsage()
        } else if (arg === "--execute-count") {
            console.warn(
                "The 'execute-count' argument requires a value such as:"
                + " --execute-count=1\n")
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
        } else if (arg === "--unsafe-multiwin") {
            console.warn("The 'unsafe-multiwin' argument requires a value "
                + "such as:\n --unsafe-multiwin=false\n")
            printUsage()
        } else if (arg.startsWith("--datafolder=")) {
            argDatafolder = arg.split("=").slice(1).join("=")
        } else if (arg.startsWith("--erwic=")) {
            argErwic = arg.split("=").slice(1).join("=")
        } else if (arg.startsWith("--execute=")) {
            argExecute = arg.split("=").slice(1).join("=")
        } else if (arg.startsWith("--execute-dur=")) {
            argExecuteDur = Number(arg.split("=").slice(1).join("="))
        } else if (arg.startsWith("--execute-count=")) {
            argExecuteCount = Number(arg.split("=").slice(1).join("="))
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
        } else if (arg.startsWith("--interface-scale")) {
            argInterfaceScale = Number(arg.split("=").slice(1).join("="))
        } else if (arg.startsWith("--devtools-theme=")) {
            argDevtoolsTheme = arg.split("=").slice(1).join("=").toLowerCase()
        } else if (arg.startsWith("--unsafe-multiwin=")) {
            argUnsafeMultiwin = isTruthyArg(arg.split("=").slice(1).join("="))
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
if (argDevtoolsTheme !== "dark" && argDevtoolsTheme !== "light") {
    console.warn("The 'devtools-theme' argument only accepts:\n"
        + "'dark' or 'light'\n")
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
if (argAcceleration === "software") {
    app.disableHardwareAcceleration()
}
if (isNaN(argInterfaceScale) || argInterfaceScale <= 0) {
    console.warn(
        "The 'interface-scale' argument only accepts positive numbers\n")
    printUsage()
}
if (argInterfaceScale !== 1) {
    app.commandLine.appendSwitch(
        "force-device-scale-factor", `${argInterfaceScale}`)
}
if (isNaN(argExecuteDur) || argExecuteDur < 0) {
    console.warn("The 'execute-dur' argument only accepts positive numbers\n")
    printUsage()
}
if (isNaN(argExecuteCount) || argExecuteCount < 0) {
    console.warn("The 'execute-count' argument only accepts positive numbers\n")
    printUsage()
}
if (argExecuteDur === 0 && argExecuteCount === 0) {
    console.warn(
        "The 'execute-dur' and 'execute-count' arguments cannot both be zero\n")
    printUsage()
}
if (urls.length && argExecute) {
    console.warn(
        "The 'execute' argument cannot be combined with opening urls\n")
    printUsage()
}

/**
 * Apply some basic settings to the chromium devtools.
 * @param {string} prefFile
 * @param {boolean} undock
 */
const applyDevtoolsSettings = (prefFile, undock = true) => {
    makeDir(dirname(prefFile))
    const preferences = readJSON(prefFile) || {}
    preferences.electron ||= {}
    preferences.electron.devtools ||= {}
    preferences.electron.devtools.preferences ||= {}
    // Disable source maps as they leak internal structure to the webserver
    preferences.electron.devtools.preferences.cssSourceMapsEnabled = "false"
    preferences.electron.devtools.preferences.jsSourceMapsEnabled = "false"
    // Undock main process devtools to prevent window size issues
    if (undock) {
        preferences.electron.devtools.preferences.
            currentDockState = `"undocked"`
    }
    // Disable release notes, most are not relevant for Vieb
    preferences.electron.devtools.preferences[
        "help.show-release-note"] = "false"
    // Show timestamps in the console
    preferences.electron.devtools.preferences.consoleTimestampsEnabled = "true"
    // Disable the paused overlay which prevents interaction with other pages
    preferences.electron.devtools.preferences.disablePausedStateOverlay = "true"
    // Style the devtools based on the system theme
    let theme = `"dark"`
    if (argDevtoolsTheme === "light") {
        theme = `"light"`
    }
    preferences.electron.devtools.preferences.uiTheme = theme
    writeJSON(prefFile, preferences)
}

// https://github.com/electron/electron/issues/30201
if (argMediaKeys) {
    app.commandLine.appendSwitch("disable-features", "UserAgentClientHint")
} else {
    app.commandLine.appendSwitch("disable-features",
        "HardwareMediaKeyHandling,UserAgentClientHint")
}
app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer")
argDatafolder = `${joinPath(expandPath(argDatafolder.trim()))}/`
const partitionDir = joinPath(argDatafolder, "Partitions")
listDir(partitionDir, false, true)?.filter(part => part.startsWith("temp"))
    .map(part => joinPath(partitionDir, part)).forEach(part => rm(part))
rm(joinPath(argDatafolder, "erwicmode"))
app.setPath("appData", argDatafolder)
app.setPath("userData", argDatafolder)
applyDevtoolsSettings(joinPath(argDatafolder, "Preferences"))
if (argErwic) {
    argErwic = expandPath(argErwic)
    /** @type {{
     *   name?: unknown, icon?: unknown, apps: {
     *     container?: unknown, script?: unknown, url?: unknown
     *   }[]
     * }} */
    const config = readJSON(argErwic)
    if (!config) {
        console.warn("Erwic config file could not be read\n")
        printUsage()
    }
    if (typeof config.name === "string") {
        app.setName(config.name)
    }
    if (typeof config.icon === "string") {
        config.icon = expandPath(config.icon)
        if (typeof config.icon === "string") {
            if (config.icon !== joinPath(config.icon)) {
                config.icon = joinPath(dirname(argErwic), config.icon)
            }
            if (typeof config.icon !== "string" || !isFile(config.icon)) {
                config.icon = null
            }
            if (typeof config.icon === "string") {
                customIcon = config.icon
            }
        }
    }
    writeFile(joinPath(argDatafolder, "erwicmode"), "")
    if (!Array.isArray(config.apps)) {
        console.warn("Erwic config file requires a list of 'apps'\n")
        printUsage()
    }
    config.apps = config.apps.map(a => {
        if (typeof a.url !== "string" || typeof a.container !== "string") {
            return null
        }
        const simpleContainerName = a.container.replace(/_/g, "")
        if (simpleContainerName.match(specialChars)) {
            console.warn("Container names are not allowed to have "
                + "special characters besides underscores\n")
            printUsage()
        }
        if (typeof a.script === "string") {
            a.script = expandPath(a.script)
            if (typeof a.script === "string") {
                if (a.script !== joinPath(a.script)) {
                    a.script = joinPath(dirname(argErwic), a.script)
                }
            }
        } else {
            a.script = null
        }
        return a
    }).flatMap(a => a ?? [])
    if (config.apps.length === 0) {
        console.warn("Erwic config file requires at least one app to be added")
        console.warn("Each app must have a 'container' name and a 'url'\n")
        printUsage()
    }
    urls.push(...config.apps)
}
// When the app is ready to start, open the main window
/** @type {Electron.BrowserWindow|null} */
let mainWindow = null
/** @type {Electron.BrowserWindow|null} */
let loginWindow = null
/** @type {Electron.BrowserWindow|null} */
let notificationWindow = null
/** @type {Electron.BrowserWindow|null} */
let promptWindow = null

/**
 * Check if an input matches a given key.
 * @param {Electron.Input} key
 */
const currentInputMatches = key => {
    if (blockedInsertMappings === "pass" || blockedInsertMappings === "all") {
        return true
    }
    return blockedInsertMappings.some(mapping => {
        if (!!mapping.alt === key.alt && !!mapping.control === key.control) {
            if (!!mapping.meta === key.meta && !!mapping.shift === key.shift) {
                if (key.location === 3) {
                    return mapping.key === `k${key.key}`
                }
                return mapping.key === key.key
            }
        }
        return false
    })
}

/**
 * Resolve local paths to absolute file protocol paths.
 * @param {(string|{
 *   container?: unknown, url?: unknown, script?: unknown
 * })[]} paths
 * @param {string|null} cwd
 */
const resolveLocalPaths = (paths, cwd = null) => paths.filter(u => u).map(u => {
    let url = ""
    if (typeof u === "string") {
        url = String(u)
    } else if (typeof u === "object") {
        url = String(u.url)
    }
    if (!url) {
        return null
    }
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
    if (typeof u === "object") {
        return {...u, url}
    }
    return {url}
}).filter(u => u)

/** @type {{[domain: string]: string[]}} */
const allowedFingerprints = {}
/** @type {{
 *   [permission: string]: "allow"|"block"|"ask"|"allowkind"|"allowfull"
 * } & {
 *   permissionsallowed?: string[],
 *   permissionsasked?: string[],
 *   permissionsblocked?: string[]
 * }} */
let permissions = {}

/**
 * Main check if a permission should be allowed or declined.
 * @param {Electron.WebContents|null} _
 * @param {string} pm
 * @param {null|((_: any) => void)} callback
 * @param {{
 *   mediaTypes?: string[],
 *   externalURL?: string,
 *   requestingUrl?: string
 *   cert?: Electron.Certificate
 *   error?: string
 * }} details
 */
const permissionHandler = (_, pm, callback, details) => {
    if (!mainWindow) {
        return false
    }
    let permission = pm.toLowerCase().replace("sanitized", "").replace(/-/g, "")
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
        } else if (details.mediaTypes) {
            permission = "displaycapture"
        } else {
            permission = "mediadevices"
        }
    }
    let permissionName = `permission${permission}`
    if (permission === "openexternal" && details.externalURL) {
        if (details.externalURL.startsWith(`${app.getName().toLowerCase()}:`)) {
            mainWindow.webContents.send("navigate-to", details.externalURL)
            return false
        }
    }
    let setting = permissions[permissionName]
    if (!setting) {
        permissionName = "permissionunknown"
        setting = permissions.permissionunknown
    }
    /** @type {"ask"|"block"|"allow"|null} */
    let settingRule = null
    /** @type {("ask"|"block"|"allow")[]} */
    const permissionOverrideTypes = ["ask", "block", "allow"]
    for (const override of permissionOverrideTypes) {
        const permList = permissions[`permissions${override}ed`]
        for (const rule of permList || []) {
            if (!rule.trim() || settingRule) {
                continue
            }
            const [match, ...names] = rule.split("~")
            if (names.some(p => permissionName.endsWith(p))) {
                if (details.requestingUrl?.match(match)) {
                    settingRule = override
                    break
                }
            }
            if (permissionName.includes("mediadevices")) {
                if (details.requestingUrl?.match(match)) {
                    if (names.some(p => p.endsWith("mediadeviceskind"))) {
                        settingRule = "allow"
                        break
                    }
                    if (names.some(p => p.endsWith("mediadevicesfull"))) {
                        settingRule = "allow"
                        break
                    }
                }
            }
        }
    }
    setting = settingRule || setting
    if (!callback) {
        return setting !== "block"
    }
    const domain = domainName(details.requestingUrl ?? "") ?? ""
    if (permission === "certificateerror") {
        if (allowedFingerprints[domain]
            ?.includes(details.cert?.fingerprint ?? "")) {
            mainWindow.webContents.send("notify",
                `Automatic domain caching rule for '${permission}' activated `
                + `at '${details.requestingUrl}' which was allowed, because `
                + `this same certificate was allowed before on this domain`,
                {"src": "user", "type": "perm"})
            callback(true)
            return true
        }
    }
    if (setting === "ask") {
        let url = details.requestingUrl ?? ""
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
        /** @type {string|undefined} */
        /** @type {import("electron").MessageBoxOptions} */
        const dialogOptions = {
            "buttons": ["Allow", "Deny"],
            "cancelId": 1,
            "checkboxLabel": "Remember for this session",
            "defaultId": 0,
            message,
            "title": `Allow this page to access '${permission}'?`,
            "type": "question"
        }
        if (permission === "openexternal") {
            let exturl = details.externalURL ?? ""
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
                + "permission setting afterwards won't change this behavior. "
                + "So while you can deny the same certificate multiple times, "
                + "you only need to allow it once to be able to keep using it."
                + ` For help and more options, see ':h ${permissionName}'.`
                + `\n\npage: ${url}\ndomain: ${domain}\n\n`
                + `ISSUER: ${details.cert?.issuerName}\n`
                + `SELF-SIGNED: ${!details.cert?.issuerCert}\n`
                + `SUBJECT: ${details.cert?.subjectName}\n`
                + `STARTS: ${formatDate(details.cert?.validStart)}\n`
                + `EXPIRES: ${formatDate(details.cert?.validExpiry)}\n`
                + `FINGERPRINT: ${details.cert?.fingerprint}\n\n`
                + "Only allow certificates you have verified and can trust!"
            delete dialogOptions.checkboxLabel
        }
        dialogOptions.message = message
        dialog.showMessageBox(mainWindow, dialogOptions).then(e => {
            if (!mainWindow) {
                return false
            }
            /** @type {"allow"|"block"|"ask"|"allowkind"|"allowfull"} */
            let action = "allow"
            if (e.response !== 0) {
                action = "block"
            }
            if (settingRule) {
                mainWindow.webContents.send("notify",
                    `Ask rule for '${permission}' activated at '`
                    + `${details.requestingUrl}' which was ${action}ed by user`,
                    {"src": "user", "type": "perm"})
            } else {
                mainWindow.webContents.send("notify",
                    `Manually ${action}ed '${permission}' at `
                    + `'${details.requestingUrl}'`,
                    {"src": "user", "type": "perm"})
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
                allowedFingerprints[domain].push(
                    details.cert?.fingerprint ?? "")
            }
            callback(allow)
            return allow
        })
    } else {
        if (settingRule) {
            mainWindow.webContents.send("notify",
                `Automatic rule for '${permission}' activated at `
                + `'${details.requestingUrl}' which was ${setting}ed`,
                {"src": "user", "type": "perm"})
        } else {
            mainWindow.webContents.send("notify",
                `Globally ${setting}ed '${permission}' at `
                + `'${details.requestingUrl}' based on '${permissionName}'`,
                {"src": "user", "type": "perm"})
        }
        const allow = setting === "allow"
        if (permission === "certificateerror" && allow) {
            if (!allowedFingerprints[domain]) {
                allowedFingerprints[domain] = []
            }
            allowedFingerprints[domain].push(details.cert?.fingerprint ?? "")
        }
        callback(allow)
        return allow
    }
    return false
}

app.on("ready", () => {
    app.userAgentFallback = defaultUseragent()
    const executeOut = joinPath(app.getPath("appData"), ".tmp-execute-output")
    deleteFile(executeOut)
    if (!argUnsafeMultiwin) {
        /** @type {{argv?: string[], command?: string}} */
        let secondInstanceArgs = {"argv": args}
        if (argExecute) {
            secondInstanceArgs = {"command": argExecute}
        }
        if (app.requestSingleInstanceLock(secondInstanceArgs)) {
            if (argExecute) {
                console.info("Execute arg only works if Vieb is "
                    + "already running in this datafolder.")
                app.exit(1)
            }
            app.on("second-instance", (_, newArgs, cwd, extra) => {
                if (!mainWindow) {
                    return
                }
                // @ts-expect-error command might be there, if so use it
                if (extra?.command) {
                    mainWindow.webContents.send(
                        // @ts-expect-error command might be there, if so use it
                        "execute-command", extra?.command)
                    return
                }
                if (mainWindow.isMinimized()) {
                    mainWindow.restore()
                }
                mainWindow.focus()
                mainWindow.webContents.send("urls", resolveLocalPaths(
                    // @ts-expect-error argv might be there, if so use it
                    extra?.argv || getArguments(newArgs), cwd))
            })
        } else if (!argExecute) {
            console.info(`Sending urls to existing instance ${argDatafolder}`)
            app.exit(0)
        }
    }
    if (argExecute) {
        if (argExecuteDur) {
            setTimeout(() => {
                const fileContents = readFile(executeOut)
                const parts = fileContents?.split("\t\t\t") ?? []
                if (parts.at(-1) === "") {
                    parts.pop()
                }
                if (fileContents !== null && parts.length) {
                    console.info(parts.join("\n"))
                }
                deleteFile(executeOut)
                process.exit(0)
            }, argExecuteDur)
        }
        watchFile(executeOut, info => {
            if (info.blksize > 0 || info.size > 0) {
                const fileContents = readFile(executeOut)
                const parts = fileContents?.split("\t\t\t") ?? []
                if (parts.at(-1) === "") {
                    parts.pop()
                }
                if (fileContents !== null && argExecuteCount
                    && parts.length >= argExecuteCount) {
                    console.info(parts.join("\n"))
                    deleteFile(executeOut)
                    process.exit(0)
                }
            }
        })
        return
    }
    app.on("open-file", (_, url) => mainWindow?.webContents.send("urls",
        resolveLocalPaths([url])))
    app.on("open-url", (_, url) => mainWindow?.webContents.send("urls",
        resolveLocalPaths([url])))
    if (!app.isPackaged && !customIcon) {
        customIcon = joinPath(__dirname, "img/vieb.svg")
    }
    // Init mainWindow
    /** @type {Electron.BrowserWindowConstructorOptions} */
    const windowData = {
        "closable": false,
        "frame": argWindowFrame,
        "height": 600,
        "show": argDebugMode,
        "title": app.getName(),
        "webPreferences": {
            "contextIsolation": false,
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
    if (customIcon) {
        windowData.icon = customIcon
    }
    mainWindow = new BrowserWindow(windowData)
    mainWindow.removeMenu()
    mainWindow.setMinimumSize(Math.min(500 / argInterfaceScale, 500),
        Math.min(500 / argInterfaceScale, 500))
    mainWindow.on("focus", () => mainWindow?.webContents.send("window-focus"))
    mainWindow.on("blur", () => mainWindow?.webContents.send("window-blur"))
    mainWindow.on("close", e => {
        e.preventDefault()
        mainWindow?.webContents.send("window-close")
    })
    mainWindow.on("closed", () => app.exit(0))
    // Load app and send urls when ready
    mainWindow.loadURL(`file://${joinPath(__dirname, "index.html")}`)
    mainWindow.webContents.once("did-finish-load", () => {
        mainWindow?.webContents.setWindowOpenHandler(() => ({"action": "deny"}))
        mainWindow?.webContents.on("will-navigate", e => e.preventDefault())
        mainWindow?.webContents.on("will-redirect", e => e.preventDefault())
        if (argDebugMode) {
            mainWindow?.webContents.openDevTools({"mode": "detach"})
        }
        mainWindow?.webContents.send("urls", resolveLocalPaths(urls))
    })
    mainWindow.webContents.on("will-attach-webview", (_, prefs) => {
        prefs.preload = joinPath(__dirname, "preload/index.js")
        prefs.sandbox = false
        prefs.contextIsolation = false
    })
    mainWindow.webContents.on("did-attach-webview", (_, contents) => {
        contents.on("will-prevent-unload", e => e.preventDefault())
        contents.on("unresponsive", () => mainWindow?.webContents.send(
            "unresponsive", contents.id))
        contents.on("responsive", () => mainWindow?.webContents.send(
            "responsive", contents.id))
        let navigationUrl = ""
        contents.on("did-start-navigation", (__, url) => {
            navigationUrl = url
        })
        contents.on("did-redirect-navigation", (__, url) => {
            if (navigationUrl !== url) {
                mainWindow?.webContents.send("redirect", navigationUrl, url)
            }
        })
        contents.setWebRTCIPHandlingPolicy("default_public_interface_only")
        contents.on("before-input-event", (e, input) => {
            if (blockedInsertMappings === "pass") {
                return
            }
            if (currentInputMatches(input)) {
                e.preventDefault()
            }
            mainWindow?.webContents.send("insert-mode-input-event", input)
        })
        contents.on("zoom-changed", (__, dir) => {
            mainWindow?.webContents.send("zoom-changed", contents.id, dir)
        })
        contents.on("certificate-error", (e, url, err, cert, fn) => {
            e.preventDefault()
            permissionHandler(null, "certificateerror", fn, {
                cert, "error": err, "requestingUrl": url
            })
        })
        contents.setWindowOpenHandler(e => {
            if (e.disposition === "foreground-tab") {
                mainWindow?.webContents.send("navigate-to", e.url)
            } else {
                mainWindow?.webContents.send("new-tab", e.url)
            }
            return {"action": "deny"}
        })
    })
    // Show a dialog for sites requiring Basic HTTP authentication
    /** @type {Electron.BrowserWindowConstructorOptions} */
    const loginWindowData = {
        "alwaysOnTop": true,
        "frame": false,
        "fullscreenable": false,
        "modal": true,
        "parent": mainWindow,
        "resizable": false,
        "show": false,
        "webPreferences": {
            "partition": "login",
            "preload": joinPath(__dirname, "popups/login.js")
        }
    }
    if (customIcon) {
        loginWindowData.icon = customIcon
    }
    loginWindow = new BrowserWindow(loginWindowData)
    const loginPage = `file:///${joinPath(__dirname, "pages/loginpopup.html")}`
    loginWindow.loadURL(loginPage)
    loginWindow.on("close", e => {
        e.preventDefault()
        loginWindow?.hide()
        mainWindow?.focus()
    })
    ipcMain.on("hide-login-window", () => {
        loginWindow?.hide()
        mainWindow?.focus()
    })
    // Show a dialog for large notifications
    /** @type {Electron.BrowserWindowConstructorOptions} */
    const notificationWindowData = {
        "alwaysOnTop": true,
        "frame": false,
        "fullscreenable": false,
        "modal": true,
        "parent": mainWindow,
        "resizable": false,
        "show": false,
        "webPreferences": {
            "partition": "notification-window",
            "preload": joinPath(__dirname, "popups/notification.js")
        }
    }
    if (customIcon) {
        notificationWindowData.icon = customIcon
    }
    notificationWindow = new BrowserWindow(notificationWindowData)
    const notificationPage = `file:///${joinPath(
        __dirname, "pages/notificationpopup.html")}`
    notificationWindow.loadURL(notificationPage)
    notificationWindow.on("close", e => {
        e.preventDefault()
        notificationWindow?.hide()
        mainWindow?.focus()
    })
    ipcMain.on("hide-notification-window", () => {
        notificationWindow?.hide()
        mainWindow?.focus()
    })
    // Show a sync prompt dialog if requested by any of the pages
    /** @type {Electron.BrowserWindowConstructorOptions} */
    const promptWindowData = {
        "alwaysOnTop": true,
        "frame": false,
        "fullscreenable": false,
        "modal": true,
        "parent": mainWindow,
        "resizable": false,
        "show": false,
        "webPreferences": {
            "partition": "prompt",
            "preload": joinPath(__dirname, "popups/prompt.js")
        }
    }
    if (customIcon) {
        promptWindowData.icon = customIcon
    }
    promptWindow = new BrowserWindow(promptWindowData)
    const promptPage = `file:///${joinPath(__dirname, "pages/promptpopup.html")}`
    promptWindow.loadURL(promptPage)
})
// Handle Basic HTTP login attempts
/** @type {number[]} */
const loginAttempts = []
let fontsize = 14
let customCSS = ""
ipcMain.on("set-custom-styling", (_, newFontSize, newCSS) => {
    fontsize = newFontSize
    customCSS = newCSS
})
app.on("login", (e, contents, _, auth, callback) => {
    if (!mainWindow || !loginWindow || loginWindow.isVisible()) {
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
            loginWindow?.hide()
            mainWindow?.focus()
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
    if (!mainWindow || !notificationWindow) {
        return
    }
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
// Handle prompts in sync from within the webviews
ipcMain.on("show-prompt-dialog", (e, title, defaultText) => {
    if (!mainWindow || !promptWindow) {
        return
    }
    ipcMain.removeAllListeners("prompt-response")
    ipcMain.removeAllListeners("hide-prompt-window")
    promptWindow.removeAllListeners("close")
    const bounds = mainWindow.getBounds()
    const size = Math.round(fontsize * 21)
    promptWindow.setMinimumSize(size, size)
    promptWindow.setSize(size, size)
    promptWindow.setPosition(
        Math.round(bounds.x + bounds.width / 2 - size / 2),
        Math.round(bounds.y + bounds.height / 2 - size / 2))
    promptWindow.resizable = false
    promptWindow.show()
    promptWindow.focus()
    promptWindow.webContents.send(
        "prompt-info", fontsize, customCSS, title, defaultText)
    ipcMain.on("prompt-response", (_, response) => {
        promptWindow?.hide()
        mainWindow?.focus()
        e.returnValue = response
    })
    ipcMain.on("hide-prompt-window", () => {
        promptWindow?.hide()
        mainWindow?.focus()
        e.returnValue = null
    })
    promptWindow.on("close", ev => {
        ev.preventDefault()
        promptWindow?.hide()
        mainWindow?.focus()
        e.returnValue = null
    })
})
// Create and manage sessions, mostly downloads, adblocker and permissions
const dlsFile = joinPath(app.getPath("appData"), "dls")
/** @type {{
 *   downloadmethod?: string,
 *   downloadpath: string,
 *   cleardownloadsonquit?: boolean,
 *   cleardownloadsoncompleted?: boolean,
 *   src?: import("./renderer/common").RunSource
 * }} */
let downloadSettings = {"downloadpath": app.getPath("downloads")}
/** @typedef {{
 *   current: number,
 *   date: Date,
 *   file: string,
 *   name: string,
 *   item: Electron.DownloadItem
 *   state: string,
 *   total: number,
 *   url: string
 * }} downloadItem
 */
/** @type {downloadItem[]} */
let downloads = []
/** @type {string[]} */
let redirects = []
/** @type {import("@cliqz/adblocker-electron").ElectronBlocker|null} */
let blocker = null
/** @type {"view"|"block"|"download"}} */
let pdfbehavior = "view"
/** @type {string[]|null} */
let resourceTypes = null
/** @type {string[]} */
let resourcesAllowed = []
/** @type {string[]} */
let resourcesBlocked = []
/** @type {{[key: string]: string}} */
let requestHeaders = {}
/** @type {string[]} */
const sessionList = []
const adblockerPreload = joinPath(__dirname,
    "../node_modules/@cliqz/adblocker-electron-preload/dist/preload.cjs.js")
const defaultCSS = readFile(joinPath(__dirname, `colors/default.css`))
ipcMain.on("set-redirects", (_, rdr) => {
    redirects = rdr
})

/**
 * Update the request header setting.
 * @param {Electron.IpcMainEvent} _
 * @param {{[key: string]: string}} headers
 */
const updateRequestHeaders = (_, headers) => {
    requestHeaders = headers
}

ipcMain.on("update-request-headers", updateRequestHeaders)
ipcMain.on("open-download", (_, location) => shell.openPath(location))

/**
 * Update download settings.
 * @param {Electron.IpcMainEvent} _
 * @param {{
 *   downloadmethod: string,
 *   downloadpath: string,
 *   cleardownloadsonquit: boolean,
 *   cleardownloadsoncompleted: boolean,
 *   src: import("./renderer/common").RunSource
 * }} settings
 */
const setDownloadSettings = (_, settings) => {
    if (Object.keys(downloadSettings).length === 0) {
        if (settings.cleardownloadsonquit) {
            deleteFile(dlsFile)
        } else if (isFile(dlsFile)) {
            /** @type {downloadItem[]} */
            const downloadsFile = readJSON(dlsFile) ?? []
            downloads = downloadsFile.map(d => {
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
    downloadSettings.downloadpath = expandPath(downloadSettings.downloadpath
        || app.getPath("downloads") || "~/Downloads")
}

/** Write the download info to disk if downloads should be stored after quit. */
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

ipcMain.on("set-download-settings", setDownloadSettings)
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

/**
 * Update the list of spell languages to be used.
 * @param {Electron.IpcMainEvent} _
 * @param {string[]} langs
 */
const setSpelllangs = (_, langs) => {
    if (!langs) {
        return
    }
    const parsedLangs = langs.map(l => {
        let lang = l
        if (lang === "system") {
            lang = app.getLocale()
        }
        const valid = session.defaultSession.availableSpellCheckerLanguages
        if (!valid.includes(lang)) {
            return null
        }
        return lang
    }).flatMap(lang => lang ?? [])
    sessionList.forEach(ses => {
        session.fromPartition(ses).setSpellCheckerLanguages(parsedLangs)
        session.defaultSession.setSpellCheckerLanguages(parsedLangs)
    })
}

ipcMain.on("set-spelllang", setSpelllangs)
ipcMain.on("update-resource-settings", (_, resources, block, allow) => {
    resourceTypes = [
        ...resources, "mainframe", "subframe", "cspreport", "other"
    ]
    resourcesAllowed = allow
    resourcesBlocked = block
})

/** Generate a 403 forbidden response to block the PDF viewer entirely. */
const blockPdf = () => new Response("", {"status": 403})

/**
 * Load a blocklist with extra newline if it has contents.
 * @param {string} file
 */
const loadBlocklist = file => {
    const contents = readFile(file)
    if (contents) {
        return `${contents}\n`
    }
    return ""
}

/** Disable the adblocker completely. */
const disableAdblocker = () => {
    if (!blocker) {
        return
    }
    sessionList.forEach(part => {
        const ses = session.fromPartition(part)
        ses.setPreloads(ses.getPreloads().filter(p => p !== adblockerPreload))
    })
    ipcMain.removeListener("get-cosmetic-filters-first",
        blocker.onGetCosmeticFiltersFirst)
    ipcMain.removeListener("get-cosmetic-filters",
        blocker.onGetCosmeticFiltersUpdated)
    ipcMain.removeListener("is-mutation-observer-enabled",
        blocker.onIsMutationObserverEnabled)
    blocker = null
}

/** Reload the adblocker optionally including the default lists. */
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
    let ElectronBlocker = null
    try {
        ({ElectronBlocker} = require("@cliqz/adblocker-electron"))
    } catch {
        // Adblocker module not present, skipping initialization
    }
    if (!ElectronBlocker || !isFile(adblockerPreload)) {
        mainWindow?.webContents.send("notify",
            "Adblocker module not present, ads will not be blocked!",
            {"src": "user", "type": "err"})
        return
    }
    blocker = ElectronBlocker.parse(filters)
    const resources = readFile(joinPath(__dirname, `./blocklists/resources`))
    if (resources) {
        blocker.updateResources(resources, `${resources.length}`)
    }
    sessionList.forEach(part => {
        const ses = session.fromPartition(part)
        ses.setPreloads(ses.getPreloads().concat([adblockerPreload]))
    })
    ipcMain.on("get-cosmetic-filters-first", blocker.onGetCosmeticFiltersFirst)
    ipcMain.on("get-cosmetic-filters", blocker.onGetCosmeticFiltersUpdated)
    ipcMain.on("is-mutation-observer-enabled",
        blocker.onIsMutationObserverEnabled)
}

/**
 * Enable the adblocker either statically, with updates or custom.
 * @param {"static"|"custom"|"update"} type
 */
const enableAdblocker = type => {
    const blocklistDir = joinPath(app.getPath("appData"), "blocklists")
    const blocklists = readJSON(joinPath(
        __dirname, "blocklists/list.json")) || {}
    makeDir(blocklistDir)
    // Copy the default and included blocklists to the appdata folder
    if (type !== "custom") {
        for (const name of Object.keys(blocklists)) {
            const list = joinPath(__dirname, `blocklists/${name}.txt`)
            writeFile(joinPath(blocklistDir, `${name}.txt`),
                readFile(list) ?? "")
        }
    }
    // And update all blocklists to the latest version if enabled
    if (type === "update") {
        const extraLists = readJSON(joinPath(blocklistDir, "list.json")) || {}
        const allBlocklists = {...blocklists, ...extraLists}
        for (const list of Object.keys(allBlocklists)) {
            const url = allBlocklists[list]
            if (!url) {
                continue
            }
            mainWindow?.webContents.send("notify",
                `Updating ${list} to the latest version`,
                {"src": "user"})
            session.fromPartition("persist:main")
            const request = net.request({"partition": "persist:main", url})
            request.on("response", res => {
                let body = ""
                res.on("end", () => {
                    writeFile(joinPath(blocklistDir, `${list}.txt`), body)
                    reloadAdblocker()
                    mainWindow?.webContents.send("notify",
                        `Updated and reloaded the latest ${list} successfully`,
                        {"src": "user", "type": "suc"})
                })
                res.on("data", chunk => {
                    body += chunk
                })
            })
            request.on("abort", () => mainWindow?.webContents.send("notify",
                `Failed to update ${list}: Request aborted`,
                {"src": "user", "type": "err"}))
            request.on("error", e => mainWindow?.webContents.send("notify",
                `Failed to update ${list}:\n${e.message}`,
                {"src": "user", "type": "err"}))
            request.end()
        }
    } else {
        reloadAdblocker()
    }
}

ipcMain.on("adblock-enable", (_, type) => {
    if (sessionList.length > 0) {
        // Only listen to enable calls after initial init has already happened
        enableAdblocker(type)
    }
})
ipcMain.on("adblock-disable", disableAdblocker)
ipcMain.on("update-pdf-option", (_, newPdfValue) => {
    pdfbehavior = newPdfValue
    sessionList.forEach(ses => {
        const {protocol} = session.fromPartition(ses)
        if (pdfbehavior === "view") {
            if (protocol.isProtocolHandled("chrome-extension")) {
                protocol.unhandle("chrome-extension")
            }
        } else if (!protocol.isProtocolHandled("chrome-extension")) {
            protocol.handle("chrome-extension", blockPdf)
        }
    })
})
ipcMain.on("create-session", (_, name, adblock, cache) => {
    if (sessionList.includes(name)) {
        return
    }
    const sessionDir = joinPath(partitionDir, encodeURIComponent(
        name.split(":")[1] || name))
    applyDevtoolsSettings(joinPath(sessionDir, "Preferences"), false)
    const newSess = session.fromPartition(name, {cache})
    newSess.setPermissionRequestHandler(permissionHandler)
    newSess.setPermissionCheckHandler(
        (__, pm, url, details) => permissionHandler(null, pm, null, {
            ...details, "requestingUrl": details.requestingUrl ?? url
        }))
    newSess.setDevicePermissionHandler(
        details => permissionHandler(null, details.deviceType, () => null, {
            ...details, "requestingUrl": details.origin
        }) ?? false)
    sessionList.push(name)
    if (adblock !== "off") {
        if (blocker) {
            reloadAdblocker()
        } else {
            enableAdblocker(adblock)
        }
    }
    if (pdfbehavior !== "view") {
        newSess.protocol.handle("chrome-extension", blockPdf)
    }
    newSess.webRequest.onBeforeRequest((details, callback) => {
        let url = String(details.url)
        redirects.forEach(r => {
            if (r.trim()) {
                const [match, replace] = r.split("~")
                url = url.replace(RegExp(match), replace)
            }
        })
        if (details.url !== url) {
            return callback({"cancel": false, "redirectURL": url})
        }
        if (resourceTypes && (url.startsWith("http") || url.startsWith("ws"))) {
            let allow = null
            for (const r of resourcesBlocked) {
                const [match, ...names] = r.split("~")
                if (!names?.length || names.includes(details.resourceType)) {
                    if (url.match(match) || details.frame?.url.match(match)) {
                        allow = false
                        break
                    }
                }
            }
            for (const r of resourcesAllowed) {
                const [match, ...names] = r.split("~")
                if (!names?.length || names.includes(details.resourceType)) {
                    if (url.match(match) || details.frame?.url.match(match)) {
                        allow = true
                        break
                    }
                }
            }
            if (typeof allow === "boolean") {
                if (!["mainFrame", "subFrame", "cspReport", "other"]
                    .includes(details.resourceType)) {
                    return callback({"cancel": !allow})
                }
            }
            if (!resourceTypes.includes(details.resourceType.toLowerCase())) {
                return callback({"cancel": true})
            }
        }
        if (!blocker) {
            return callback({"cancel": false})
        }
        blocker.onBeforeRequest(details, callback)
    })
    newSess.webRequest.onHeadersReceived((details, callback) => {
        if (!blocker) {
            return callback({"cancel": false})
        }
        blocker.onHeadersReceived(details, callback)
    })
    newSess.webRequest.onBeforeSendHeaders((details, callback) => {
        const headers = details.requestHeaders
        for (const head of Object.keys(requestHeaders)) {
            if (head.startsWith("-")) {
                delete headers[head.replace(/$-/, "")]
            } else {
                headers[head] = requestHeaders[head]
            }
        }
        return callback({"cancel": false, "requestHeaders": headers})
    })
    newSess.on("will-download", (e, item) => {
        if (downloadSettings.downloadmethod === "block" || !mainWindow) {
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
        const downloadSrc = downloadSettings.src
        if (downloadSrc === "execute") {
            downloadSettings.src = "user"
        }
        mainWindow.webContents.send("notify",
            `Download started:\n${info.name}`, {"src": downloadSrc})
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
                mainWindow?.webContents.send("notify",
                    `Download finished:\n${info.name}`, {
                        "action": {
                            "path": info.file, "type": "download-success"
                        },
                        "src": downloadSrc,
                        "type": "success"
                    })
            } else {
                mainWindow?.webContents.send("notify",
                    `Download failed:\n${info.name}`,
                    {"src": downloadSrc, "type": "warn"})
            }
        })
    })
    newSess.protocol.handle("sourceviewer", req => {
        let loc = req.url.replace(/sourceviewer:\/?\/?/g, "")
        if (process.platform !== "win32" && !loc.startsWith("/")) {
            loc = `/${loc}`
        }
        loc = decodeURI(loc)
        if (isDir(loc)) {
            return new Response(Buffer.from(`<!DOCTPYE html>\n<html><head>
                <style id="default-styling">${defaultCSS}</style>
                <style id="custom-styling">${customCSS}</style>
                <title>${decodeURI(req.url)}</title>
                </head><body>Source viewer does not support folders, only files
                </body></html>`
            ), {"headers": {"content-type": "text/html; charset=utf-8"}})
        }
        /** @type {import("highlight.js").HLJSApi|null} */
        let hljs = null
        try {
            hljs = require("highlight.js").default
        } catch {
            return new Response(Buffer.from(`<!DOCTPYE html>\n<html><head>
                <style id="default-styling">${defaultCSS}</style>
                <style id="custom-styling">${customCSS}</style>
                <title>${decodeURI(req.url)}</title>
                </head><body>Source viewer module not present, can't view source
                </body></html>`
            ), {"headers": {"content-type": "text/html; charset=utf-8"}})
        }
        if (isFile(loc)) {
            const hl = hljs.highlightAuto(readFile(loc) ?? "")
            return new Response(Buffer.from(`<!DOCTPYE html>\n<html><head>
                <style id="default-styling">${defaultCSS}</style>
                <style id="custom-styling">${customCSS}</style>
                <title>${decodeURI(req.url)}</title>
                </head><body id="sourceviewer">
                <pre><code>${hl.value}</code></pre></body></html>`
            ), {"headers": {"content-type": "text/html; charset=utf-8"}})
        }
        const url = `https://${loc}`
        return new Promise(resolve => {
            const request = net.request({"partition": name, url})
            request.on("response", res => {
                let body = ""
                res.on("end", () => {
                    if (!body || !hljs) {
                        resolve(new Response(Buffer.from(
                            `<!DOCTPYE html>\n<html><head>
                            <style id="default-styling">${defaultCSS}</style>
                            <style id="custom-styling">${customCSS}</style>
                            <title>${decodeURI(req.url)}</title>
                            </head><body>
                                Source viewer not supported on this webpage
                            </body></html>`
                        ), {"headers": {
                            "content-type": "text/html; charset=utf-8"
                        }}))
                        return
                    }
                    const hl = hljs.highlightAuto(body)
                    resolve(new Response(Buffer.from(
                        `<!DOCTPYE html>\n<html><head>
                        <style id="default-styling">${defaultCSS}</style>
                        <style id="custom-styling">${customCSS}</style>
                        <title>${decodeURI(req.url)}</title>
                        </head><body id="sourceviewer">
                        <pre><code>${hl.value}</code></pre></body></html>`
                    ), {"headers": {
                        "content-type": "text/html; charset=utf-8"
                    }}))
                })
                res.on("data", chunk => {
                    body += chunk
                })
            })
            request.on("abort", () => new Response(""))
            request.on("error", () => new Response(""))
            request.end()
        })
    })
    let markdownFilesUniqueId = ""
    newSess.protocol.handle("markdownfiles", req => {
        const url = new URL(req.url)
        const id = url.searchParams.get("md-uuid")
        url.search = ""
        if (!markdownFilesUniqueId || !id || markdownFilesUniqueId !== id) {
            return Response.error()
        }
        return net.fetch(url.href.replace(/^markdownfiles:/, "file:"))
    })
    newSess.protocol.handle("markdownviewer", req => {
        const {randomUUID} = require("crypto")
        markdownFilesUniqueId = randomUUID()
        let loc = req.url.replace(/markdownviewer:\/?\/?/g, "")
        if (process.platform !== "win32" && !loc.startsWith("/")) {
            loc = `/${loc}`
        }
        loc = decodeURI(loc)
        if (isDir(loc)) {
            return new Response(Buffer.from(`<!DOCTPYE html>\n<html><head>
                <style id="default-styling">${defaultCSS}</style>
                <style id="custom-styling">${customCSS}</style>
                <title>${decodeURI(req.url)}</title></head>
                <body>Markdown viewer does not support folders, only files
                </body></html>`), {"headers": {
                "content-type": "text/html; charset=utf-8"
            }})
        }
        /** @type {typeof import("marked").Marked|null} */
        let Marked = null
        try {
            ({Marked} = require("marked"))
        } catch {
            return new Response(Buffer.from(`<!DOCTPYE html>\n<html><head>
                <style id="default-styling">${defaultCSS}</style>
                <style id="custom-styling">${customCSS}</style>
                <title>${decodeURI(req.url)}</title></head>
                <body>Markdown viewer module not present, can't view markdown
                </body></html>`), {"headers": {
                "content-type": "text/html; charset=utf-8"
            }})
        }
        let url = `https://${loc}`
        if (isFile(loc)) {
            url = `file://${loc}`
        }
        let markedObj = new Marked()
        try {
            const hljs = require("highlight.js").default
            const {markedHighlight} = require("marked-highlight")
            markedObj = new Marked(markedHighlight({
                /**
                 * Highlight the code using highlight.js in the right language.
                 * @param {string} code
                 * @param {string|undefined} lang
                 */
                "highlight": (code, lang) => {
                    let language = lang ?? "plaintext"
                    if (!hljs.getLanguage(language)) {
                        language = "plaintext"
                    }
                    return hljs.highlight(code, {language}).value || code
                },
                "langPrefix": "hljs language-"
            }))
        } catch {
            // Highlight.js integration is optional.
        }
        const mdRenderer = new markedObj.Renderer()
        const urlFolder = dirname(url)
        /**
         * Resolve relative paths to the dirname/base path of the url.
         * @param {string} text
         */
        mdRenderer.html = text => text.replace(
            / src="\./g, ` src="${urlFolder}/`)
            .replace(/ src="([A-Za-z0-9])]/g, ` src="${urlFolder}/$1`)
        /**
         * Add md-uuid to the url to allow requests to markdownfiles protocol.
         * @param {string} href
         * @param {string|undefined|null} title
         * @param {string} alt
         */
        mdRenderer.image = (href, title, alt) => {
            let safeUrl = href
            try {
                safeUrl = encodeURI(href).replace(/%25/g, "%")
                if (url.startsWith("file:")
                    && href.startsWith("markdownfiles")) {
                    safeUrl += `?md-uuid=${markdownFilesUniqueId}`
                }
            } catch {
                safeUrl = ""
            }
            let output = `<img src="${safeUrl}" alt="${alt}"`
            if (title) {
                output += ` title="${title}"`
            }
            output += ">"
            return output
        }
        markedObj.setOptions({"renderer": mdRenderer, "silent": true})
        try {
            const {baseUrl} = require("marked-base-url")
            if (url.startsWith("file:")) {
                const base = url.replace(/^file:/, "markdownfiles:")
                markedObj.use(baseUrl(base))
            } else {
                markedObj.use(baseUrl(url))
            }
        } catch {
            // Base url handling is optional.
        }
        if (isFile(loc)) {
            const md = markedObj.parse(readFile(loc) ?? "")
            return new Response(Buffer.from(
                `<!DOCTPYE html>\n<html><head>
                <style id="default-styling">${defaultCSS}</style>
                <style id="custom-styling">${customCSS}</style>
                <title>${decodeURI(req.url)}</title>
                </head><body id="markdownviewer">${md}</body></html>`
            ), {"headers": {"content-type": "text/html; charset=utf-8"}})
        }
        const request = net.request({"partition": name, url})
        return new Promise(resolve => {
            request.on("response", res => {
                let body = ""
                res.on("end", () => {
                    if (!body || !markedObj) {
                        resolve(new Response(Buffer.from(
                            `<!DOCTPYE html>\n<html><head>
                            <style id="default-styling">${defaultCSS}</style>
                            <style id="custom-styling">${customCSS}</style>
                            <title>${decodeURI(req.url)}</title></head>
                            <body>Markdown viewer not supported on this webpage
                            </body></html>`
                        ), {"headers": {
                            "content-type": "text/html; charset=utf-8"
                        }}))
                        return
                    }
                    const md = markedObj.parse(body)
                    resolve(new Response(Buffer.from(
                        `<!DOCTPYE html>\n<html><head>
                        <style id="default-styling">${defaultCSS}</style>
                        <style id="custom-styling">${customCSS}</style>
                        <title>${decodeURI(req.url)}</title>
                        </head><body id="markdownviewer">${md}</body></html>`
                    ), {"headers": {
                        "content-type": "text/html; charset=utf-8"
                    }}))
                })
                res.on("data", chunk => {
                    body += chunk
                })
            })
            request.on("abort", () => new Response(""))
            request.on("error", () => new Response(""))
            request.end()
        })
    })
    newSess.protocol.handle("readerview", req => {
        let loc = req.url.replace(/readerview:\/?\/?/g, "")
        if (process.platform !== "win32" && !loc.startsWith("/")) {
            loc = `/${loc}`
        }
        loc = decodeURI(loc)
        if (isFile(loc) || isDir(loc)) {
            return new Response(Buffer.from(`<!DOCTPYE html>\n<html><head>
                <style id="default-styling">${defaultCSS}</style>
                <style id="custom-styling">${customCSS}</style>
                <title>${decodeURI(req.url)}</title>
                </head><body>Reader view not supported for local resources
                </body></html>`
            ), {"headers": {"content-type": "text/html; charset=utf-8"}})
        }
        /** @type {typeof import("@mozilla/readability").Readability|null} */
        let Readability = null
        /** @type {typeof import("jsdom").JSDOM|null} */
        let JSDOM = null
        try {
            ({Readability} = require("@mozilla/readability"))
            ;({JSDOM} = require("jsdom"))
        } catch (e) {
            return new Response(Buffer.from(`<!DOCTPYE html>\n<html><head>
                <style id="default-styling">${defaultCSS}</style>
                <style id="custom-styling">${customCSS}</style>
                <title>${decodeURI(req.url)}</title>
                </head><body>Reader view module not present, can't do readerview
                </body></html>`
            ), {"headers": {"content-type": "text/html; charset=utf-8"}})
        }
        const url = `https://${loc}`
        const request = net.request({"partition": name, url})
        return new Promise(resolve => {
            request.on("response", res => {
                let body = ""
                res.on("end", () => {
                    if (!body || !JSDOM || !Readability) {
                        resolve(new Response(Buffer.from(
                            `<!DOCTPYE html>\n<html><head>
                            <style id="default-styling">${defaultCSS}</style>
                            <style id="custom-styling">${customCSS}</style>
                            <title>${decodeURI(req.url)}</title>
                            </head><body>
                                Reader view not supported on this webpage
                            </body></html>`
                        ), {"headers": {
                            "content-type": "text/html; charset=utf-8"
                        }}))
                        return
                    }
                    const dom = new JSDOM(body, {url})
                    const out = new Readability(
                        dom.window.document).parse()?.content ?? ""
                    resolve(new Response(Buffer.from(
                        `<!DOCTPYE html>\n<html><head>
                        <style id="default-styling">${defaultCSS}</style>
                        <style id="custom-styling">${customCSS}</style>
                        <title>${decodeURI(req.url)}</title>
                        </head><body id="readerview">${out}</body></html>`
                    ), {"headers": {
                        "content-type": "text/html; charset=utf-8"
                    }}))
                })
                res.on("data", chunk => {
                    body += chunk
                })
            })
            request.on("abort", () => new Response(""))
            request.on("error", () => new Response(""))
            request.end()
        })
    })
})

/** Cancel all downloads immediately. */
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

ipcMain.on("download-favicon", (_, options) => {
    const customSession = webContents.fromId(options.webId)?.session
        ?? session.defaultSession
    const request = net.request({"session": customSession, "url": options.fav})
    request.on("response", res => {
        /** @type {Buffer[]} */
        const data = []
        res.on("end", () => {
            if (res.statusCode !== 200) {
                // Failed to download favicon
                return
            }
            const file = Buffer.concat(data)
            const knownExts = [".png", ".ico", ".jpg", ".svg"]
            const hasExtension = knownExts.some(ex => options.fav.endsWith(ex))
            if (!hasExtension && (/<\/svg>/).test(file.toString())) {
                writeFile(`${options.location}.svg`, file)
                mainWindow?.webContents.send("favicon-downloaded",
                    options.linkId, options.url, `${options.fav}.svg`)
            } else {
                writeFile(options.location, file)
                mainWindow?.webContents.send("favicon-downloaded",
                    options.linkId, options.url, options.fav)
            }
        })
        res.on("data", chunk => {
            data.push(Buffer.from(chunk))
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
const windowStateFile = joinPath(app.getPath("appData"), "windowstate")

/**
 * Save the current window state, optionally just the maximization state.
 * @param {boolean} maximizeOnly
 */
const saveWindowState = (maximizeOnly = false) => {
    try {
        mainWindow?.webContents?.send("window-update-gui")
        let state = readJSON(windowStateFile) || {}
        if (!maximizeOnly && mainWindow && !mainWindow.isMaximized()) {
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
        state.maximized = mainWindow?.isMaximized()
        writeJSON(windowStateFile, state)
    } catch {
        // Window already destroyed
    }
}

ipcMain.on("window-state-init", (_, restorePos, restoreSize, restoreMax) => {
    if (!mainWindow) {
        return
    }
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
ipcMain.on("update-native-theme", (_, newTheme) => {
    nativeTheme.themeSource = newTheme
})
ipcMain.handle("save-page", (_, id, loc) => {
    webContents.fromId(id)?.savePage(loc, "HTMLComplete")
})
ipcMain.on("hide-window", () => {
    if (!argDebugMode) {
        mainWindow?.hide()
    }
})
ipcMain.on("add-devtools", (_, pageId, devtoolsId) => {
    const page = webContents.fromId(pageId)
    const devtools = webContents.fromId(devtoolsId)
    if (page && devtools) {
        page.setDevToolsWebContents(devtools)
        page.openDevTools()
        devtools.executeJavaScript("window.location.reload()")
    }
})
ipcMain.on("open-internal-devtools",
    () => mainWindow?.webContents.openDevTools({"mode": "detach"}))
ipcMain.on("destroy-window", () => {
    cancellAllDownloads()
    mainWindow?.destroy()
})
ipcMain.handle("run-isolated-js-head-check", (_, id) => webContents.fromId(id)
    ?.executeJavaScriptInIsolatedWorld(999, [{
        "code": "document.head.innerText"
    }]))
ipcMain.handle("list-spelllangs",
    () => session.defaultSession.availableSpellCheckerLanguages)
ipcMain.handle("toggle-always-on-top", () => {
    mainWindow?.setAlwaysOnTop(!mainWindow?.isAlwaysOnTop())
})
ipcMain.handle("toggle-fullscreen", () => {
    if (mainWindow) {
        mainWindow.fullScreen = !mainWindow.fullScreen
    }
})
ipcMain.on("insert-mode-blockers", (e, blockedMappings) => {
    blockedInsertMappings = blockedMappings
    e.returnValue = null
})
ipcMain.on("set-window-title", (_, t) => {
    if (mainWindow) {
        mainWindow.title = t
    }
})
ipcMain.handle("show-message-dialog", (_, options) => {
    if (mainWindow) {
        dialog.showMessageBox(mainWindow, options)
    }
})
ipcMain.on("sync-message-dialog", (e, options) => {
    if (mainWindow) {
        e.returnValue = dialog.showMessageBoxSync(mainWindow, options)
    } else {
        e.returnValue = null
    }
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
ipcMain.on("app-config", e => {
    e.returnValue = {
        "appdata": app.getPath("appData"),
        "autoplay": argAutoplayMedia,
        "downloads": app.getPath("downloads"),
        "icon": customIcon || undefined,
        "name": app.getName(),
        "order": argConfigOrder,
        "override": argConfigOverride,
        version
    }
})
ipcMain.on("is-fullscreen", e => {
    if (!mainWindow) {
        e.returnValue = false
        return
    }
    const windowBounds = mainWindow.getBounds()
    const screenBounds = screen.getDisplayMatching(windowBounds).bounds
    const osFullscreen = screenBounds.x === windowBounds.x
        && screenBounds.y === windowBounds.y
        && screenBounds.width === windowBounds.width
        && screenBounds.height === windowBounds.height
        && !mainWindow.isMaximized()
    e.returnValue = mainWindow.fullScreen || osFullscreen
})
ipcMain.on("relaunch", () => app.relaunch())
ipcMain.on("mouse-location", e => {
    const windowBounds = mainWindow?.getBounds()
    if (windowBounds) {
        const mousePos = screen.getCursorScreenPoint()
        const x = mousePos.x - windowBounds.x
        const y = mousePos.y - windowBounds.y
        if (x < windowBounds.width && y < windowBounds.height) {
            e.returnValue = {x, y}
            return
        }
    }
    e.returnValue = null
})

// Subframe/iframe related code to send from renderer to frames and vice versa

/**
 * Send an error to main based on a caught error.
 * @param {unknown} exception
 */
const errToMain = exception => {
    if (exception instanceof Error && exception.stack) {
        mainWindow?.webContents.send("main-error", exception.stack)
    }
    if (typeof exception === "string") {
        mainWindow?.webContents.send("main-error", exception)
    }
    return null
}

/** @type {(import("./renderer/follow").FollowLink & {frameId: string})[]} */
let allLinks = []
/**
 * @typedef {{
 *   id?: string
 *   url?: string
 *   x?: number
 *   y?: number
 *   width?: number
 *   height?: number
 *   usableWidth?: number
 *   usableHeight?: number
 *   pagex?: number
 *   pagey?: number
 *   parent?: string
 *   absX?: number
 *   absY?: number
 * }} frameDetails
 */
/** @type {{[frameId: string]: frameDetails}} */
const frameInfo = {}
ipcMain.on("follow-mode-start", (_, id, followTypeFilter, switchTo = false) => {
    try {
        webContents.fromId(id)?.mainFrame.framesInSubtree.forEach(f => {
            try {
                f.send("follow-mode-start", followTypeFilter)
            } catch (ex) {
                errToMain(ex)
            }
        })
        if (switchTo) {
            allLinks = []
        }
    } catch (ex) {
        errToMain(ex)
    }
})
ipcMain.on("follow-mode-stop", e => {
    try {
        e.sender.mainFrame.framesInSubtree.forEach(f => {
            try {
                f.send("follow-mode-stop")
            } catch (ex) {
                errToMain(ex)
            }
        })
    } catch (ex) {
        errToMain(ex)
    }
})

/**
 * Handle incoming frame details by storing their details by id.
 * @param {Electron.IpcMainEvent} e
 * @param {{
 *   height: number
 *   width: number
 *   url: string
 *   pagex: number
 *   pagey: number
 *   subframes: {
 *     height: number
 *     width: number
 *     x: number
 *     y: number
 *     url: string
 *   }[]
 * }} details
 */
const handleFrameDetails = (e, details) => {
    let frameId = ""
    try {
        frameId = `${e.frameId}-${e.processId}`
    } catch (ex) {
        errToMain(ex)
        return
    }
    if (!frameInfo[frameId]) {
        frameInfo[frameId] = {}
    }
    frameInfo[frameId].id = frameId
    frameInfo[frameId].url = details.url
    details.subframes.forEach(subframe => {
        Object.keys(frameInfo).forEach(id => {
            const url = frameInfo[id].url?.replace(/^about:srcdoc$/g, "") ?? ""
            if (url === subframe.url && id !== frameId) {
                frameInfo[id].x = subframe.x
                frameInfo[id].y = subframe.y
                frameInfo[id].width = subframe.width
                frameInfo[id].height = subframe.height
                frameInfo[id].usableWidth = subframe.width
                const overflowW = subframe.x + subframe.width - details.width
                if (overflowW > 0) {
                    frameInfo[id].usableWidth = (frameInfo[id].usableWidth
                        ?? 0) - overflowW
                }
                frameInfo[id].usableHeight = subframe.height
                const overflowH = subframe.y + subframe.height - details.height
                if (overflowH > 0) {
                    frameInfo[id].usableHeight = (frameInfo[id].usableHeight
                        ?? 0) - overflowH
                }
                frameInfo[id].pagex = details.pagex
                frameInfo[id].pagey = details.pagey
                frameInfo[id].parent = frameId
            }
        })
    })
}

ipcMain.on("frame-details", handleFrameDetails)

/**
 * Handle a follow mode response.
 * @param {Electron.IpcMainEvent} e
 * @param {(
 *   import("./renderer/follow").FollowLink & {frameId: string}
 * )[]} rawLinks
 */
const handleFollowResponse = (e, rawLinks) => {
    let frameId = ""
    try {
        frameId = `${e.frameId}-${e.processId}`
    } catch (ex) {
        errToMain(ex)
        return
    }
    const info = frameInfo[frameId]
    let frameX = info?.x || 0
    let frameY = info?.y || 0
    let parent = info?.parent
    /** @type {string[]} */
    const pastParentList = []
    while (parent && !pastParentList.includes(parent)) {
        pastParentList.push(parent)
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
        "frameUsableHeight": info?.usableHeight,
        "frameUsableWidth": info?.usableWidth,
        "frameWidth": info?.width,
        "frameX": info?.x,
        "frameY": info?.y,
        "x": l.x + frameX,
        "xInFrame": l.x,
        "y": l.y + frameY,
        "yInFrame": l.y
    })).filter(l => {
        if (!l.frameUsableHeight || !l.frameUsableWidth) {
            return true
        }
        return l.yInFrame < l.frameUsableHeight
            && l.xInFrame < l.frameUsableWidth
    })
    try {
        const allFramesIds = mainWindow?.webContents.mainFrame
            .framesInSubtree.map(f => {
                try {
                    return `${f.routingId}-${f.processId}`
                } catch {
                    return null
                }
            }).filter(f => f)
        allLinks = allLinks.filter(l => l.frameId !== frameId
            && allFramesIds?.includes(l.frameId))
        allLinks = allLinks.concat(frameLinks)
        mainWindow?.webContents.send("follow-response", allLinks)
    } catch (ex) {
        errToMain(ex)
    }
}

ipcMain.on("follow-response", handleFollowResponse)

/**
 * Find the right subframe for a position in webcontents.
 * @param {Electron.WebContents} wc
 * @param {number} x
 * @param {number} y
 * @returns {(frameDetails & {absY: number, absX: number})|null}
 */
const findRelevantSubFrame = (wc, x, y) => {
    try {
        const absoluteFrames = wc.mainFrame.framesInSubtree.map(f => {
            try {
                const id = `${f.routingId}-${f.processId}`
                const info = frameInfo[id] ?? {}
                info.absX = info.x ?? 0
                info.absY = info.y ?? 0
                if (!info?.parent) {
                    return null
                }
                /** @type {frameDetails|null} */
                let parent = frameInfo[info.parent] ?? null
                /** @type {string[]} */
                const pastParentList = []
                while (parent?.id && !pastParentList.includes(parent?.id)) {
                    pastParentList.push(parent.id)
                    info.absX += parent.x ?? 0
                    info.absY += parent.y ?? 0
                    if (parent.parent) {
                        parent = frameInfo[parent.parent] ?? null
                    } else {
                        parent = null
                    }
                }
                return info
            } catch {
                return null
            }
        })
        /** @type {frameDetails & {absY: number, absX: number}|null} */
        let relevantFrame = null
        absoluteFrames.forEach(info => {
            if (!info || !info.absX || !info.absY) {
                return
            }
            if (info.absX < x && info.absY < y
                && info.width !== undefined && info.height !== undefined) {
                if (info.absX + info.width > x && info.absY + info.height > y) {
                    if (relevantFrame?.width) {
                        if (relevantFrame.width > info.width) {
                            // A smaller frame means a subframe, use it
                            relevantFrame = {
                                ...info, "absX": info.absX, "absY": info.absY
                            }
                        }
                    } else {
                        relevantFrame = {
                            ...info, "absX": info.absX, "absY": info.absY
                        }
                    }
                }
            }
        })
        return relevantFrame
    } catch (ex) {
        return errToMain(ex)
    }
}

ipcMain.on("action", (_, id, actionName, ...opts) => {
    const wc = webContents.fromId(id)
    if (!wc) {
        return
    }
    if (typeof opts[0] === "number" && typeof opts[1] === "number") {
        const subframe = findRelevantSubFrame(wc, opts[0], opts[1])
        if (subframe) {
            try {
                const frameRef = wc.mainFrame.framesInSubtree.find(f => {
                    const frameId = `${f.routingId}-${f.processId}`
                    return frameId === subframe.id
                })
                if (actionName === "selectionRequest") {
                    frameRef?.send("action", actionName,
                        opts[0] - subframe.absX, opts[1] - subframe.absY,
                        opts[2] - subframe.absX, opts[3] - subframe.absY)
                }
                frameRef?.send("action", actionName, opts[0] - subframe.absX,
                    opts[1] - subframe.absY, ...opts.slice(2))
            } catch (ex) {
                errToMain(ex)
            }
            return
        }
    }
    try {
        wc.mainFrame.framesInSubtree.forEach(f => {
            try {
                f.send("action", actionName, ...opts)
            } catch (ex) {
                errToMain(ex)
            }
        })
    } catch (ex) {
        errToMain(ex)
    }
})
ipcMain.on("contextmenu-data", (_, id, info) => {
    const wc = webContents.fromId(id)
    if (!wc) {
        return
    }
    const subframe = findRelevantSubFrame(wc, info.x, info.y)
    if (subframe) {
        try {
            const frameRef = wc.mainFrame.framesInSubtree.find(f => {
                const frameId = `${f.routingId}-${f.processId}`
                return frameId === subframe.id
            })
            frameRef?.send("contextmenu-data", {
                ...info,
                "frameId": `${frameRef.routingId}-${frameRef.processId}`,
                "x": info.x - subframe.absX,
                "y": info.y - subframe.absY
            })
        } catch (ex) {
            errToMain(ex)
        }
        return
    }
    wc.send("contextmenu-data", info)
})
ipcMain.on("contextmenu", (_, id) => {
    try {
        webContents.fromId(id)?.mainFrame.framesInSubtree.forEach(
            f => f.send("contextmenu"))
    } catch (ex) {
        errToMain(ex)
    }
})
ipcMain.on("focus-input", (_, id, location = null) => {
    const wc = webContents.fromId(id)
    if (!wc) {
        return
    }
    if (location) {
        const subframe = findRelevantSubFrame(wc, location.x, location.y)
        if (subframe) {
            try {
                const frameRef = wc.mainFrame.framesInSubtree.find(f => {
                    const frameId = `${f.routingId}-${f.processId}`
                    return frameId === subframe.id
                })
                frameRef?.send("focus-input", {
                    "x": location.x - subframe.absX,
                    "y": location.y - subframe.absY
                })
            } catch (ex) {
                errToMain(ex)
            }
            return
        }
    }
    wc.send("focus-input", location)
})
ipcMain.on("replace-input-field", (_, id, frameId, correction, inputField) => {
    const wc = webContents.fromId(id)
    if (!wc) {
        return
    }
    try {
        if (frameId) {
            const frameRef = wc.mainFrame.framesInSubtree.find(
                f => frameId === `${f.routingId}-${f.processId}`)
            frameRef?.send("replace-input-field", correction, inputField)
            return
        }
        wc.send("replace-input-field", correction, inputField)
    } catch (ex) {
        errToMain(ex)
    }
})

/**
 * Translate a mouse event and send it to the right frame.
 * @param {Electron.IpcMainEvent} e
 * @param {{
 *   frame: string
 *   startX: number
 *   startY: number
 *   endX: number
 *   endY: number
 *   x: number
 *   y: number
 * }|null} clickInfo
 */
const translateMouseEvent = (e, clickInfo = null) => {
    let frameId = ""
    try {
        frameId = `${e.frameId}-${e.processId}`
    } catch (ex) {
        return errToMain(ex)
    }
    const info = frameInfo[frameId]
    let frameX = info?.x ?? 0
    let frameY = info?.y ?? 0
    let parent = info?.parent
    let parentId = frameId
    /** @type {string[]} */
    const pastParentList = []
    while (parent && !pastParentList.includes(parent)) {
        pastParentList.push(parent)
        const parentInfo = frameInfo[parent]
        frameX += parentInfo?.x ?? 0
        frameY += parentInfo?.y ?? 0
        parent = parentInfo?.parent
        parentId = parentInfo?.id || frameId
    }
    let frameUrl = clickInfo?.frame ?? ""
    if (info?.x && info?.url) {
        frameUrl = info.url
    }
    /** @type {number|null} */
    let webviewId = null
    try {
        webviewId = webContents.getAllWebContents().find(wc => {
            try {
                const wcId = `${
                    wc.mainFrame.routingId}-${wc.mainFrame.processId}`
                return wcId === parentId
            } catch {
                return false
            }
        })?.id ?? null
    } catch (ex) {
        errToMain(ex)
    }
    return {
        ...clickInfo,
        "endX": (clickInfo?.endX ?? 0) + frameX || null,
        "endY": (clickInfo?.endY ?? 0) + frameY || null,
        "frame": frameUrl,
        "frameAbsX": frameX,
        "frameAbsY": frameY,
        "frameHeight": info?.height,
        frameId,
        "frameWidth": info?.width,
        "frameX": info?.x,
        "frameY": info?.y,
        "startX": (clickInfo?.startX ?? 0) + frameX || null,
        "startY": (clickInfo?.startY ?? 0) + frameY || null,
        webviewId,
        "x": (clickInfo?.x ?? 0) + frameX,
        "xInFrame": clickInfo?.x ?? 0,
        "y": (clickInfo?.y ?? 0) + frameY,
        "yInFrame": clickInfo?.y ?? 0
    }
}

ipcMain.on("mouse-selection", (e, clickInfo) => mainWindow?.webContents.send(
    "mouse-selection", translateMouseEvent(e, clickInfo)))
ipcMain.on("mouse-down-location", (e, clickInfo) => mainWindow?.webContents
    .send("mouse-down-location", translateMouseEvent(e, clickInfo)))
ipcMain.on("mouse-click-info", (e, clickInfo) => mainWindow?.webContents.send(
    "mouse-click-info", translateMouseEvent(e, clickInfo)))
ipcMain.on("context-click-info", (e, clickInfo) => mainWindow?.webContents.send(
    "context-click-info", translateMouseEvent(e, clickInfo)))
ipcMain.on("send-keyboard-event", (_, id, keyOptions) => {
    // Temporary code as a last resort workaround for:
    // https://github.com/electron/electron/issues/20333
    // Will eventually just use sendInputEvent in the from renderer directly
    try {
        let keyCode = keyOptions.key
        if (keyCode === "Return") {
            keyCode = "\u000d"
        }
        const wc = webContents.fromId(id)
        if (!wc) {
            return
        }
        /** @type {"shift"[]} */
        const modifiers = []
        if (keyOptions.shift) {
            modifiers.push("shift")
        }
        wc.sendInputEvent({keyCode, modifiers, "type": "keyDown"})
        if (keyCode.length === 1) {
            wc.sendInputEvent({keyCode, modifiers, "type": "char"})
        }
        wc.sendInputEvent({keyCode, modifiers, "type": "keyUp"})
        wc.mainFrame.framesInSubtree
            .filter(f => f.routingId !== wc.mainFrame.routingId)
            .forEach(f => f.send("keyboard-type-event", keyOptions))
    } catch (ex) {
        errToMain(ex)
    }
})
ipcMain.on("send-input-event", (_, id, inputInfo) => {
    // Temporary code as a last resort workaround for:
    // https://github.com/electron/electron/issues/20333
    // Will eventually just use sendInputEvent in the from renderer directly
    const X = inputInfo.x
    const Y = inputInfo.y
    const wc = webContents.fromId(id)
    if (!wc) {
        return
    }
    const subframe = findRelevantSubFrame(wc, X, Y)
    if (subframe) {
        try {
            const frameRef = wc.mainFrame.framesInSubtree.find(f => {
                const frameId = `${f.routingId}-${f.processId}`
                return frameId === subframe.id
            })
            if (inputInfo.type === "scroll") {
                frameRef?.send("custom-mouse-event", "mousewheel", {
                    "deltaX": inputInfo.deltaX || 0,
                    "deltaY": inputInfo.deltaY || 0,
                    "x": X - subframe.absX,
                    "y": Y - subframe.absY
                })
                return
            }
            if (inputInfo.type === "click") {
                frameRef?.send("custom-mouse-event", "click", {
                    "button": inputInfo.button || "left",
                    "x": X - subframe.absX,
                    "y": Y - subframe.absY
                })
                return
            }
            if (inputInfo.type === "leave") {
                frameRef?.send("custom-mouse-event", "mouseleave", {
                    "x": X - subframe.absX, "y": Y - subframe.absY
                })
            } else {
                frameRef?.send("custom-mouse-event", "mouseenter", {
                    "x": X - subframe.absX, "y": Y - subframe.absY
                })
            }
        } catch (ex) {
            errToMain(ex)
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
