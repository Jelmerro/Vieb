import {join} from "path"
import TerserPlugin from "terser-webpack-plugin"
import webpack from "webpack"

export default [{
    "entry": {
        "main": "./app/index.js",
        "preload": "./app/preload/index.mjs",
        "renderer": "./app/renderer/index.mjs"
    },
    "experiments": {
        "outputModule": true
    },
    "externals": {
        "electron": "electron"
    },
    "externalsType": "module",
    "mode": "production",
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
        "chunkFormat": "module",
        "clean": true,
        /**
         * Translate the chunk name to the right path (subfolder or not).
         * @param {{chunk: {name: string}}} data
         */
        "filename": data => {
            if (data.chunk.name === "main") {
                return "index.js"
            }
            return `${data.chunk.name}/index.mjs`
        },
        "module": true,
        "path": join(import.meta.dirname, "build")
    },
    "plugins": [
        new webpack.optimize.LimitChunkCountPlugin({
            "maxChunks": 1
        })
    ],
    "target": "node"
}]
