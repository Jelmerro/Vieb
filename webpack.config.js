"use strict"

const {join} = require("path")
const TerserPlugin = require("terser-webpack-plugin")

module.exports = [{
    "entry": {
        "index": "./app/index.js",
        "preload": "./app/preload/index.js",
        "renderer": "./app/renderer/index.js",
        "translate": "./app/translate.js"
    },
    "externals": {
        "bufferutil": "commonjs bufferutil",
        "canvas": "{}",
        "electron": "require('electron')",
        "utf-8-validate": "commonjs utf-8-validate"
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
            if (["renderer", "preload"].includes(data.chunk.name)) {
                return `${data.chunk.name}/index.js`
            }
            return `${data.chunk.name}.js`
        },
        "path": join(__dirname, "build")
    },
    "target": "node"
}]
