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
const {rmSync} = require("fs")
const builds = {}
let liteBuilds = false

rmSync("dist/", {"force": true, "recursive": true})
process.argv.slice(1).forEach(a => {
    if (a === "--lite") {
        liteBuilds = true
    }
    if (a === "--linux") {
        builds.linux = []
    }
    if (a === "--win") {
        builds.win = []
    }
    if (a === "--mac") {
        builds.mac = []
    }
})
const regularBuild = async() => console.info(await builder.build(builds))
const liteBuild = async() => console.info(await builder.build({
    ...builds,
    "config": {
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
            "app/img/*.*"
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
