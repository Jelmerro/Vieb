/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2025 Jelmer van Arnhem
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

const {execSync} = require("child_process")
const {
    cpSync, mkdirSync, readdir, readFileSync, rmSync, unlinkSync
} = require("fs")
const {dirname, join} = require("path")
const defaultConfig = {"config": {
    "appId": "com.github.Jelmerro.vieb",
    "copyright": "Copyright @ Jelmer van Arnhem | "
        + "Licensed as free software (GPL-3.0 or later)",
    "deb": {
        "afterInstall": "./after-install.sh",
        "fpm": ["--after-upgrade=./after-install.sh"]
    },
    "fileAssociations": [
        {
            "ext": "html",
            "name": "HyperText Markup File"
        },
        {
            "ext": "xhtml",
            "name": "Extensible HyperText Markup File"
        },
        {
            "ext": "htm",
            "name": "HyperText Markup File"
        },
        {
            "ext": "shtml",
            "name": "HyperText Markup File"
        },
        {
            "ext": "xhtm",
            "name": "Extensible HyperText Markup File"
        }
    ],
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
        "app/translations/*.json",
        {"from": "build/", "to": "app/"},
        {"from": "app/index.html", "to": "app/index.html"},
        "!node_modules",
        "node_modules/@ghostery/adblocker-electron-preload/dist/index.cjs"
    ],
    "linux": {
        "category": "Network;WebBrowser;",
        "executableArgs": ["--ozone-platform-hint=auto"],
        "executableName": "vieb",
        "icon": "app/img/icons",
        "maintainer": "Jelmer van Arnhem",
        "publish": null,
        "target": [
            {"arch": ["arm64", "x64"], "target": "AppImage"},
            {"arch": ["arm64", "x64"], "target": "deb"},
            {"arch": ["arm64", "x64"], "target": "pacman"},
            {"arch": ["arm64", "x64"], "target": "rpm"},
            {"arch": ["x64"], "target": "snap"},
            {"arch": ["arm64", "x64"], "target": "tar.gz"}
        ]
    },
    "mac": {
        "category": "public.app-category.productivity",
        "icon": "app/img/icons",
        "publish": null,
        "target": [
            {"arch": ["arm64", "x64"], "target": "zip"}
        ]
    },
    "nsis": {
        "differentialPackage": false,
        "license": "LICENSE",
        "oneClick": false
    },
    "productName": "Vieb",
    "protocols": [
        {
            "name": "HyperText Transfer Protocol",
            "schemes": ["http", "https"]
        }
    ],
    "rpm": {
        "afterInstall": "./after-install.sh",
        "fpm": [
            "--rpm-rpmbuild-define=_build_id_links none",
            "--after-upgrade=./after-install.sh"
        ]
    },
    "win": {
        "icon": "app/img/icons/512x512.png",
        "legalTrademarks": "Copyright @ Jelmer van Arnhem | "
            + "Licensed as free software (GPL-3.0 or later)",
        "publish": null,
        "target": [
            {"arch": ["x64"], "target": "nsis"},
            {"arch": ["x64"], "target": "portable"},
            {"arch": ["arm64", "x64"], "target": "zip"}
        ]
    }
}}
/** @typedef {{
 *   description: string,
 *   ebuilder?: import("electron-builder").CliOptions,
 *   webpack?: import("webpack").Configuration,
 *   postinstall?: Promise<void>
 * }} ReleaseConfig
/** @type {{[key: string]: ReleaseConfig}} */
const releases = {
    "asar": {
        "description": "Build only an asar file that can be run with Electron",
        "ebuilder": false,
        /** Skip Electron builder and only compress an asar file of the app. */
        "postinstall": async() => {
            rmSync("asar-build/", {"force": true, "recursive": true})
            const {globSync} = require("glob")
            let files = []
            const filePatterns = defaultConfig.config.files
                .filter(f => typeof f !== "object")
            for (const pattern of filePatterns) {
                if (pattern.startsWith("!")) {
                    files = files.filter(f => !f.startsWith(pattern.slice(1)))
                } else {
                    files = [...files, ...globSync(pattern)]
                }
            }
            files = [...files, ...globSync("build/*"), "package.json"]
            const asar = require("@electron/asar")
            for (const file of files) {
                const dest = join("./asar-build", file.replace(/^build/, "app"))
                mkdirSync(dirname(dest), {"recursive": true})
                cpSync(file, dest, {"recursive": true})
            }
            mkdirSync("dist", {"recursive": true})
            await asar.createPackage("asar-build", "dist/vieb.asar")
            rmSync("asar-build/", {"force": true, "recursive": true})
        }
    },
    "debug": {
        "description": "Build debug releases, which do not use webpack.\n"
            + "This makes debugging much easier, as scripts are not minified.",
        "ebuilder": {
            "extraMetadata": {
                "name": "vieb-debug",
                "productName": "Vieb-debug"
            },
            "files": {
                "filter": ["app/**/*.js", "!app/**/*.test.js"].concat(
                    defaultConfig.config.files.filter(
                        f => typeof f !== "object"
                        && !f.includes("node_modules")
                        && !f.includes("popups")))
            },
            "productName": "Vieb-debug"
        },
        "webpack": false
    },
    "drm": {
        "description": "Build DRM enabled releases using Castlabs' Electron",
        "ebuilder": {
            "electronDownload": {
                "mirror": "https://github.com/castlabs/electron-releases/releases/download/v"
            },
            "electronVersion": `${JSON.parse(readFileSync(
                "./package.json")).devDependencies.electron}+wvcus`,
            "extraMetadata": {
                "name": "vieb-drm",
                "productName": "Vieb-drm"
            },
            "linux": {
                ...defaultConfig.config.linux,
                "target": [
                    {"arch": ["x64"], "target": "AppImage"},
                    {"arch": ["x64"], "target": "deb"},
                    {"arch": ["x64"], "target": "pacman"},
                    {"arch": ["x64"], "target": "rpm"},
                    {"arch": ["x64"], "target": "tar.gz"}
                ]
            },
            "mac": {
                ...defaultConfig.config.mac,
                "target": [
                    {"arch": ["arm64", "x64"], "target": "zip"}
                ]
            },
            "productName": "Vieb-drm",
            "win": {
                ...defaultConfig.config.win,
                "target": [
                    {"arch": ["x64"], "target": "nsis"},
                    {"arch": ["x64"], "target": "portable"},
                    {"arch": ["x64"], "target": "zip"}
                ]
            }
        }
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
                defaultConfig.config.afterPack?.(context)
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
                return !f.includes("blocklists") && !f.includes("@ghostery")
            }),
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
The main source is in "app/", along with "build.js" and "webpack.config.js".
Specific platforms require different software to be installed to build,
if a platform is giving you issues, try removing it from "build.js".
By default, regular builds are generated for your platform (win, mac or linux),
but you can override this and other things by passing options.

Usage: node build [options]

General options:
 --help           Show this help and exit.

Platform options:
 --all            Build for all three major platforms.

 --win            Only build for Windows.

 --linux          Only build for (all) Linux distributions.
                  You can comment out platforms in "build.js".

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
 * Apply new buildroot argument to electron-builder's internal outdated fpm.
 * @param {import("electron-builder").CliOptions} config
 */
const fixBuildrootRpmArgumentInFpm = async config => {
    const rpmConf = config.config.linux?.target?.find(t => t.target === "rpm")
    if (!rpmConf) {
        // Not building an rpm target, skipping workaround.
        return
    }
    try {
        console.info(">> PATCH buildroot arg missing in electron-builder's fpm")
        execSync(
            `sed -i -e 's/args = \\["rpmbuild", "-bb"\\]/args = \\["rpmbuild", `
            + `"-bb", "--buildroot", "#{build_path}\\/BUILD"\\]/g' ~/.cache/ele`
            + `ctron-builder/fpm/fpm*/lib/app/lib/fpm/package/rpm.rb`)
        console.info(">> PATCH done")
        return
    } catch {
        console.warn(">> PATCH failed, running dummy build to fetch fpm")
    }
    const builder = require("electron-builder")
    try {
        // Running dummy build that will fail due to incorrect outdated args.
        await builder.build(mergeEBConfig({
            "files": releases.debug.ebuilder.files,
            "linux": {
                ...defaultConfig.config.linux,
                "target": {"arch": ["x64"], "target": "rpm"}
            }
        }))
    } catch {
        // Applying fix again when dummy build fails.
        execSync(
            `sed -i -e 's/args = \\["rpmbuild", "-bb"\\]/args = \\["rpmbuild", `
            + `"-bb", "--buildroot", "#{build_path}\\/BUILD"\\]/g' ~/.cache/ele`
            + `ctron-builder/fpm/fpm*/lib/app/lib/fpm/package/rpm.rb`)
        console.info(">> PATCH done")
    } finally {
        rmSync("dist/", {"force": true, "recursive": true})
    }
}

/**
 * Generate a build for a specific release.
 * @param {ReleaseConfig} release
 */
const generateBuild = async release => {
    rmSync("build/", {"force": true, "recursive": true})
    if (release.webpack !== false) {
        await webpackBuild(release.webpack || {})
    }
    try {
        if (release.ebuilder !== false) {
            const builder = require("electron-builder")
            const config = mergeEBConfig(release.ebuilder || {})
            await fixBuildrootRpmArgumentInFpm(config)
            const res = await builder.build(config)
            console.info(res)
        }
        await release.postinstall?.()
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
