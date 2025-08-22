import {join} from "path"
import TerserPlugin from "terser-webpack-plugin"

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
    "module": {
        "parser": {
            "javascript": {
                "dynamicImportMode": "eager"
            }
        }
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
        ]
    },
    "output": {
        "chunkFormat": "module",
        "chunkLoading": "import",
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
    "target": "node"
}]
