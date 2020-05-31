/* eslint-disable no-console */
"use strict"

const builder = require("electron-builder")
const rimraf = require("rimraf").sync
const builds = {}

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
    console.log(e)
}).catch(e => {
    console.error(e)
})
