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

const {rmSync, readdir, unlinkSync} = require("fs")
const defaultConfig = {"config": {
    "files": [
        "app/**/*.html",
        "app/**/*.css",
        "app/blocklists/resources",
        "app/blocklists/*.txt",
        "app/blocklists/list.json",
        "app/defaultapp/windows.bat",
        "app/examples/*",
        "app/img/*.*",
        "!app/img/cheatsheet.svg",
        "app/popups/*.js",
        {"from": "build/main/", "to": "app/"},
        {"from": "app/index.html", "to": "app/index.html"},
        {"from": "build/renderer/", "to": "app/renderer/"},
        {"from": "build/preload/", "to": "app/preload/"},
        "!node_modules",
        "node_modules/@cliqz/adblocker-electron-preload/dist/preload.cjs.js"
    ]
}}
/** @typedef {{
 *   description: string,
 *   ebuilder?: import("electron-builder").CliOptions,
 *   webpack?: import("webpack").Configuration
 * }} ReleaseConfig
/** @type {{[key: string]: ReleaseConfig}} */
const releases = {
    "debug": {
        "description": "Build debug releases, which do not use webpack.\n"
            + "This makes debugging much easier, as scripts are not minified.",
        "ebuilder": {
            "extraMetadata": {
                "name": "vieb-debug",
                "productName": "Vieb-debug"
            },
            "files": {
                "filter": ["app/**/*.js", "!app/**/*.test.js"]
                    .concat(defaultConfig.config.files.filter(
                        f => typeof f !== "object"
                        && !f.includes("node_modules")
                        && !f.includes("popups")))
            },
            "linux": {
                "executableName": "vieb-debug"
            },
            "productName": "Vieb-debug"
        },
        "webpack": false
    },
    "lite": {
        "description": "Build lite releases, which exclude locales & "
            + "node_modules.\nThese releases are thus lighter and smaller.\n"
            + "This does mean some features are not included.",
        "ebuilder": {
            /**
             * Remove all locales except English US from the lite release.
             * @param {import("electron-builder").AfterPackContext} context
             */
            "afterPack": context => {
                const localeDir = `${context.appOutDir}/locales/`
                readdir(localeDir, (_err, files) => {
                    files?.filter(f => !f.match(/en-US\.pak/))
                        .forEach(f => unlinkSync(localeDir + f))
                })
            },
            "extraMetadata": {
                "name": "vieb-lite",
                "productName": "Vieb-lite"
            },
            "files": defaultConfig.config.files.filter(f => {
                if (typeof f === "object") {
                    return true
                }
                return !f.includes("blocklists") && !f.includes("@cliqz")
            }),
            "linux": {
                "executableName": "vieb-lite"
            },
            "productName": "Vieb-lite"
        },
        "webpack": {
            "externals": [require("webpack-node-externals")()]
        }
    },
    "regular": {
        "description": "Build the default main Vieb release. Default type."
    }
}
const releaseNames = Object.keys(releases)
rmSync("build/", {"force": true, "recursive": true})
rmSync("dist/", {"force": true, "recursive": true})

/** Print the usage of the build script and exit. */
const printUsage = () => {
    let buildOptionList = releaseNames
        .map(r => {
            const desc = releases[r].description?.replace(
                /\n/g, "\n                  ") || `Also build ${r} releases.`
            return ` --${r.padEnd(14)} ${desc}`
        })
        .join("\n\n")
    buildOptionList += `\n\n${releaseNames.map(r => ` --${`${r}-only`.padEnd(14)
    } ONLY build ${r} releases, no others.`).join("\n\n")}`
    if (buildOptionList.trim()) {
        buildOptionList = `\n\n${buildOptionList}\n`
    }
    console.info(`Vieb-builder

Generate runnable builds of Vieb for your platform, or other ones.
"build.js", "electron-builder.yml" and "webpack.config.js" are used to build,
as well as the main source code in "app/" and packages from "node_modules/".
Specific platforms require different software to be installed to build,
if a platform is giving you issues, try removing it from "electron-builder.yml".
By default, regular builds are generated for your platform (win, mac or linux),
but you can override this and other things by passing options.

Usage: node build [options]

General options:
 --help           Show this help and exit.

Platform options:
 --all            Build for all three major platforms.

 --win            Only build for Windows.

 --linux          Only build for (all) Linux distributions.
                  You can comment out platforms in "electron-builder.yml".

 --mac            Only build for Mac.

Release options:
 --all-types      Build all release types from this list.${buildOptionList}
Later options take priority over earlier ones.
See main program for license and other info.`)
    process.exit(0)
}

let selectedReleases = ["regular"]
for (const a of process.argv.slice(2)) {
    if (a === "--help") {
        printUsage()
    } else if (a === "--all") {
        defaultConfig.linux = []
        defaultConfig.win = []
        defaultConfig.mac = []
    } else if (a === "--all-types") {
        selectedReleases = Object.keys(releases)
    } else if (a === "--linux") {
        defaultConfig.linux = []
    } else if (a === "--win") {
        defaultConfig.win = []
    } else if (a === "--mac") {
        defaultConfig.mac = []
    } else {
        const name = a.replace(/^--/, "")
        const onlyName = name.replace(/-only$/, "")
        if (releaseNames.includes(name)) {
            selectedReleases.push(name)
        } else if (releaseNames.includes(onlyName)) {
            selectedReleases = [onlyName]
        } else {
            console.warn(`Invalid arg: ${a}, see --help for usage`)
            process.exit(1)
        }
    }
}

/**
 * Merge the default webpack config with the custom options.
 * @param {import("webpack").Configuration} overrides
 */
const mergeWPConfig = overrides => {
    const mergedConfig = require("./webpack.config")
    return [{...mergedConfig[0], ...overrides}]
}

/**
 * Merge the default Electron builder config with custom options.
 * @param {import("electron-builder").CliOptions} overrides
 * @returns {import("electron-builder").CliOptions}
 */
const mergeEBConfig = overrides => {
    const mergedConfig = JSON.parse(JSON.stringify(defaultConfig))
    mergedConfig.config.afterPack = defaultConfig.config.afterPack
    return {...mergedConfig, "config": {...mergedConfig.config, ...overrides}}
}

/**
 * Run a webpack build based on the combination of main and provided configs.
 * @param {import("webpack").Configuration} overrides
 */
const webpackBuild = overrides => new Promise((res, rej) => {
    const webpack = require("webpack")
    webpack(mergeWPConfig(overrides)).run((webpackErr, stats) => {
        console.info(stats.toString({"colors": true}))
        if (webpackErr || stats.hasErrors()) {
            return rej(webpackErr)
        }
        res()
    })
})

/**
 * Generate a build for a specific release.
 * @param {ReleaseConfig} release
 */
const generateBuild = async release => {
    rmSync("build/", {"force": true, "recursive": true})
    if (release.webpack !== false) {
        await webpackBuild(release.webpack || {})
    }
    if (release.ebuilder === false) {
        return
    }
    try {
        const builder = require("electron-builder")
        const res = await builder.build(mergeEBConfig(release.ebuilder || {}))
        console.info(res)
    } finally {
        rmSync("build/", {"force": true, "recursive": true})
    }
}

;(async() => {
    const platforms = Object.keys(defaultConfig).filter(p => p !== "config")
    console.info("\n  Vieb-builder\n"
        + `  - Platform: ${platforms.join(", ") || process.platform}\n`
        + `  - Releases: ${selectedReleases.join(", ")}`)
    for (const buildType of selectedReleases) {
        console.info(`\n  = Building ${buildType} release =\n`)
        await generateBuild(releases[buildType])
    }
})()
