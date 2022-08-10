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
const {rmSync, readdir, unlinkSync} = require("fs")
const defaultConfig = {
    "config": {
        "afterPack": context => {
            const localeDir = `${context.appOutDir}/locales/`
            readdir(localeDir, (_err, files) => {
                files?.filter(f => !f.match(/en-US\.pak/))
                    .forEach(f => unlinkSync(localeDir + f))
            })
        }
    }
}
let liteBuilds = false

rmSync("dist/", {"force": true, "recursive": true})
process.argv.slice(1).forEach(a => {
    if (a === "--lite") {
        liteBuilds = true
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
const regularBuild = async() => console.info(await builder.build(defaultConfig))
const liteBuild = async() => console.info(await builder.build({
    ...defaultConfig,
    "config": {
        ...defaultConfig.config,
        "extraMetadata": {
            "name": "vieb-lite",
            "productName": "Vieb-lite"
        },
        "files": [
            "app/**/*.js",
            "!app/**/*.test.js",
            "!node_modules",
            "app/**/*.html",
            "app/**/*.css",
            "app/defaultapp/windows.bat",
            "app/examples/*",
            "app/img/*.*",
            "!app/img/cheatsheet.svg"
        ],
        "linux": {
            "executableName": "vieb-lite"
        },
        "productName": "Vieb-lite"
    }
}))
;(async() => {
    await regularBuild()
    if (liteBuilds) {
        await liteBuild()
    }
})()
