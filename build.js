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

const builder = require("electron-builder")
const webpack = require("webpack")
const {rmSync, readdir, unlinkSync} = require("fs")
const webpackConfig = require("./webpack.config")

const defaultConfig = {"config": {
    "afterPack": context => {
        const localeDir = `${context.appOutDir}/locales/`
        readdir(localeDir, (_err, files) => {
            files?.filter(f => !f.match(/en-US\.pak/))
                .forEach(f => unlinkSync(localeDir + f))
        })
    },
    "files": [
        "app/**/*.html",
        "app/**/*.css",
        "app/blocklists/resources",
        "app/blocklists/*.txt",
        "app/defaultapp/windows.bat",
        "app/examples/*",
        "app/img/*.*",
        "!app/img/cheatsheet.svg",
        "app/popups/*.js",
        {"filter": "**/*.js", "from": "build/main/", "to": "app/"},
        {"from": "app/index.html", "to": "app/index.html"},
        {"from": "build/renderer/", "to": "app/renderer/"},
        {"from": "build/preload/", "to": "app/preload/"},
        "!node_modules",
        "node_modules/@cliqz/adblocker-electron-preload/dist/preload.cjs.js"
    ]
}}
let regularBuilds = true
let liteBuilds = false
let debugBuilds = false

rmSync("build/", {"force": true, "recursive": true})
rmSync("dist/", {"force": true, "recursive": true})
process.argv.slice(1).forEach(a => {
    if (a === "--lite") {
        liteBuilds = true
    }
    if (a === "--lite-only") {
        regularBuilds = false
        liteBuilds = true
    }
    if (a === "--debug") {
        debugBuilds = true
    }
    if (a === "--debug-only") {
        regularBuilds = false
        liteBuilds = false
        debugBuilds = true
    }
    if (a === "--linux") {
        defaultConfig.linux = []
    }
    if (a === "--win") {
        defaultConfig.win = []
    }
    if (a === "--mac") {
        defaultConfig.mac = []
    }
})
const mergeConfig = overrides => {
    const mergedConfig = JSON.parse(JSON.stringify(defaultConfig))
    mergedConfig.config.afterPack = defaultConfig.config.afterPack
    return {
        ...mergedConfig,
        ...overrides,
        "config": {
            ...mergedConfig.config, ...overrides.config
        }
    }
}
const regularBuild = () => new Promise((res, rej) => {
    rmSync("build/", {"force": true, "recursive": true})
    webpack(webpackConfig).run((webpackErr, stats) => {
        console.info(stats.toString({"colors": true}))
        if (webpackErr || stats.hasErrors()) {
            return rej(webpackErr)
        }
        builder.build(mergeConfig({})).then(files => {
            console.info(files)
            rmSync("build/", {"force": true, "recursive": true})
            res()
        }).catch(buildErr => {
            rmSync("build/", {"force": true, "recursive": true})
            rej(buildErr)
        })
    })
})
const liteBuild = () => new Promise((res, rej) => {
    rmSync("build/", {"force": true, "recursive": true})
    webpackConfig[0].externals = [require("webpack-node-externals")()]
    webpack(webpackConfig).run((webpackErr, stats) => {
        console.info(stats.toString({"colors": true}))
        if (webpackErr || stats.hasErrors()) {
            return rej(webpackErr)
        }
        const liteFiles = defaultConfig.config.files.filter(f => {
            if (typeof f === "object") {
                return true
            }
            return !f.includes("blocklists") && !f.includes("@cliqz")
        })
        builder.build(mergeConfig({
            "config": {
                "extraMetadata": {
                    "name": "vieb-lite",
                    "productName": "Vieb-lite"
                },
                "files": liteFiles,
                "linux": {
                    "executableName": "vieb-lite"
                },
                "productName": "Vieb-lite"
            }
        })).then(files => {
            console.info(files)
            rmSync("build/", {"force": true, "recursive": true})
            res()
        }).catch(buildErr => {
            rmSync("build/", {"force": true, "recursive": true})
            rej(buildErr)
        })
    })
})
const debugBuild = () => new Promise((res, rej) => {
    rmSync("build/", {"force": true, "recursive": true})
    const debugFiles = ["app/**/*.js", "!app/**/*.test.js"]
        .concat(defaultConfig.config.files.filter(f => typeof f !== "object"
            && !f.includes("node_modules") && !f.includes("popups")))
    builder.build(mergeConfig({
        "config": {
            "extraMetadata": {
                "name": "vieb-debug",
                "productName": "Vieb-debug"
            },
            "files": {
                "filter": debugFiles
            },
            "linux": {
                "executableName": "vieb-debug"
            },
            "productName": "Vieb-debug"
        }
    })).then(files => {
        console.info(files)
        rmSync("build/", {"force": true, "recursive": true})
        res()
    }).catch(buildErr => {
        rmSync("build/", {"force": true, "recursive": true})
        rej(buildErr)
    })
})
;(async() => {
    if (regularBuilds) {
        await regularBuild()
    }
    if (liteBuilds) {
        await liteBuild()
    }
    if (debugBuilds) {
        await debugBuild()
    }
})()
