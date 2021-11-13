/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2021 Jelmer van Arnhem
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
const rimraf = require("rimraf").sync
const archiver = require("archiver")
const {readFileSync, statSync, createWriteStream} = require("fs")
const {version} = JSON.parse(readFileSync("package.json").toString())
const builds = {}

const isDir = loc => {
    try {
        return statSync(loc).isDirectory()
    } catch {
        return false
    }
}

rimraf("dist/")
process.argv.slice(1).forEach(a => {
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
builder.build(builds).then(e => {
    rimraf("dist/Vieb-*-mac.zip")
    for (const os of ["mac", "mac-arm64"]) {
        if (isDir(`dist/${os}/Vieb.app/`)) {
            const zip = createWriteStream(`dist/Vieb-${version}-${os}.zip`)
            const archive = archiver("zip", {"zlib": {"level": 9}})
            archive.pipe(zip)
            archive.directory(`dist/${os}/Vieb.app/`, "Vieb.app")
            archive.file("README.md", {"name": "README.md"})
            archive.file("LICENSE", {"name": "LICENSE"})
            archive.finalize()
        }
    }
    console.info(e)
}).catch(e => {
    console.error(e)
})
