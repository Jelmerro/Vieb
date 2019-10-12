/* eslint-disable no-console */
"use strict"

const builder = require("electron-builder")

builder.build({
    "win": [],
    "mac": [],
    "linux": []
}).then(e => {
    console.log(e)
}).catch(e => {
    console.error(e)
})
