import TerserPlugin from "terser-webpack-plugin"
import {join} from "path"

export default [{
    "entry": {
        "main": "./app/index.js",
        "preload": "./app/preload/index.js",
        "renderer": "./app/renderer/index.js"
    },
    "externals": {
        "bufferutil": "commonjs bufferutil",
        "canvas": "{}",
        "electron": "import('electron')",
        "utf-8-validate": "commonjs utf-8-validate"
    },
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
        "path": join(import.meta.dirname, "build")
    },
    "target": "node"
}]
