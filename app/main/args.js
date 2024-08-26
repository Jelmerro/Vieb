/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2024 Jelmer van Arnhem
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

import {app} from "electron"
import {
    specialChars,
    writeJSON,
    readJSON,
    writeFile,
    listDir,
    expandPath,
    isFile,
    joinPath,
    makeDir,
    dirname,
    basePath,
    isAbsolutePath,
    rm
} from "../util.js"

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

export const getArgs = () => {
    const args = getArguments(process.argv)
    /** @type {(string|{container?: unknown, url?: unknown, script?: unknown})[]} */
    const urls = []
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
    if (!app.isPackaged && !customIcon) {
        customIcon = joinPath(import.meta.dirname, "img/vieb.svg")
    }

    return {
        argErwic,
        argDebugMode,
        argDatafolder,
        argExecute,
        argExecuteDur,
        argExecuteCount,
        argWindowFrame,
        argConfigOrder,
        argConfigOverride,
        argMediaKeys,
        argAcceleration,
        argInterfaceScale,
        argDevtoolsTheme,
        customIcon
    }
}
