/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2024 Jelmer van Arnhem
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

import {BaseWindow, WebContentsView, app} from "electron"
import {defaultUseragent, joinPath} from "../util.js"

class Page {
    constructor(opts) {
        const {url} = opts
    }
}
class Frame {
    /**
     * Construct a new Frame.
     * @param {boolean} frame
     * @param {boolean} debug
     * @param {string|null} icon
     * @param {number} scale
     */
    constructor(frame, debug, icon, scale) {
        /** @type {Electron.BaseWindowConstructorOptions} */
        const windowData = {
            "closable": false,
            frame,
            "height": 600,
            "show": debug,
            "title": app.getName(),
            "width": 800
        }
        if (icon) {
            windowData.icon = icon
        }
        this.base = new BaseWindow(windowData)
        this.base.removeMenu()
        this.base.setMinimumSize(Math.min(500 / scale, 500),
            Math.min(500 / scale, 500))
        this.base.on("focus", () => this.core.webContents.send("window-focus"))
        this.base.on("blur", () => this.core.webContents.send("window-blur"))
        // This.base.on("close", e => {
        //     e.preventDefault()
        //     this.core.webContents.send("window-close")
        // })
        this.base.on("closed", () => app.exit(0))
        this.core = new WebContentsView({"webPreferences": {
            "nodeIntegrationInSubFrames": true,
            "nodeIntegrationInWorker": true,
            "preload": joinPath(import.meta.dirname, "../frame/index.mjs"),
            "sandbox": false
        }})
        const url = joinPath(import.meta.dirname, "../index.html")
        this.core.webContents.loadURL(`file://${url}`)
        this.core.setBounds({"height": 600, "width": 800, "x": 0, "y": 0})
        this.base.on("resize", () => this.core.setBounds({
            ...this.base.getBounds(), "x": 0, "y": 0
        }))
        this.base.contentView.addChildView(this.core)
        this.core.webContents.once("did-finish-load", () => {
            this.core.webContents.setWindowOpenHandler(
                () => ({"action": "deny"}))
            this.core.webContents.on("will-navigate", e => e.preventDefault())
            this.core.webContents.on("will-redirect", e => e.preventDefault())
            if (debug) {
                this.core.webContents.openDevTools({"mode": "detach"})
            }
            // This.core.webContents.send("urls", resolveLocalPaths(urls))
            this.base.show()
        })
        this.core.webContents.ipc.addListener("keydown", async(_, key) => {
            const {handleKeyboard} = await import("./input.js")
            handleKeyboard(key)
        })
        // This.core.webContents.on("before-input-event", (e, key) => {
        //     e.preventDefault()
        //     console.log(e, key)
        // })
        this.pages = []
        this.mode = "normal"
    }

    addPage(opts) {
        const page = new Page(opts)
        this.pages.push(page)
        // This.core.addChildView(page)
    }
}

export const init = args => {
    app.whenReady().then(async() => {
        app.userAgentFallback = defaultUseragent()
        new Frame(args.argWindowFrame, args.argDebugMode,
            args.customIcon, args.argInterfaceScale)
    })
}
