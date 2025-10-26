"use strict"

const {join} = require("path")
const TerserPlugin = require("terser-webpack-plugin")

module.exports = [{
    "entry": {
        "main": "./app/index.js",
        "preload": "./app/preload/index.js",
        "renderer": "./app/renderer/index.js"
    },
    "externals": {
        "canvas": "commonjs canvas",
        "electron": "require('electron')"
    },
    "mode": "production",
    "node": {
        "__dirname": false
    },
    "optimization": {
        "minimize": true,
        "minimizer": [
            new TerserPlugin({
                "extractComments": /Copyright/,
                "terserOptions": {
                    "format": {
                        "comments": false
                    }
                }
            })
        ],
        "moduleIds": "named"
    },
    "output": {
        "clean": true,
        /**
         * Translate the chunk name to the right path (subfolder or not).
         * @param {{chunk: {name: string}}} data
         */
        "filename": data => {
            if (data.chunk.name === "main") {
                return "index.js"
            }
            return `${data.chunk.name}/index.js`
        },
        "path": join(__dirname, "build")
    },
    "target": "node"
}]
