/* eslint-disable no-console */
"use strict"

const builder = require("electron-builder")
const rimraf = require("rimraf").sync
const archiver = require("archiver")
const fs = require("fs")
const version = JSON.parse(fs.readFileSync("package.json").toString()).version
const builds = {}

const isDir = loc => {
    try {
        return fs.statSync(loc).isDirectory()
    } catch (e) {
        console.log(e)
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
    if (isDir("dist/mac/Vieb.app/")) {
        rimraf("dist/Vieb-*-mac.zip")
        const stream = fs.createWriteStream(`dist/Vieb-${version}-mac.zip`)
        const archive = archiver("zip", {"zlib": {"level": 9}})
        archive.pipe(stream)
        archive.directory("dist/mac/Vieb.app/", "Vieb.app")
        archive.file("README.md", {"name": "README.md"})
        archive.file("LICENSE", {"name": "LICENSE"})
        archive.finalize()
    }
    console.log(e)
}).catch(e => {
    console.error(e)
})
