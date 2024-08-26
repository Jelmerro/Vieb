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
import {defaultUseragent, joinPath, stringToUrl} from "../util.js"

/** @type {Frame[]} */
const frameList = []
/** @type {Frame|null} */
let currentFrame = null

export const getAllFrames = () => frameList

export const getCurrentFrame = () => currentFrame
    ?? frameList.find(f => f.base.isFocused())

export const getAllPages = () => {
    const pages = []
    for (const f of frameList) {
        pages.push(...f.pages)
    }
    return pages
}

export const getCurrentPage = () => {
    const f = getCurrentFrame()
    if (!f) {
        return null
    }
    return f.pages.sort((a, b) => a.lastInteraction.getTime()
        - b.lastInteraction.getTime())[0]
}
/** Represents a single webpage, visible or not. */
class Page {
    constructor(opts) {
        let {url} = opts
        url = stringToUrl(url)
        // This.url = url
        this.lastInteraction = new Date()
        this.webview = new WebContentsView({
            "webPreferences": {}
        })
        this.webview.webContents.setWindowOpenHandler(e => {
            if (e.disposition === "foreground-tab") {
                this.webview.webContents.loadURL(e.url)
            } else {
                console.log(e)
            }
        })
        this.webview.webContents.loadURL(url)
    }
}
/** Base frame class representing a single frame.
 *
 * Renders the Vieb interface and the pages inside of it.
 * By default a single Frame is used for most things, unless a 2nd one is added.
 */
class Frame {
    /**
     * Construct a new Frame.
     * @param {boolean} frame
     * @param {boolean} debug
     * @param {string|null} icon
     * @param {number} scale
     */
    constructor(frame, debug, icon, scale) {
        frameList.push(this)
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
        this.base.on("focus", () => {
            this.core.webContents.send("window-focus")
            currentFrame = this
        })
        this.base.on("blur", () => this.core.webContents.send("window-blur"))
        this.base.on("close", e => {
            // TODO
            // e.preventDefault()
        })
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
        /** @type {Page[]} */
        this.pages = []
        this.mode = "normal"
    }

    /**
     * Add a new page to this frame, by default switch the current page to it.
     *
     * @param {{
     *   background?: boolean
     *   url?: string
     * }} opts
     */
    addPage(opts) {
        const page = new Page(opts)
        this.pages.push(page)
        if (!opts.background) {
            this.base.contentView.addChildView(page.webview)
            page.webview.webContents.openDevTools()
            page.webview.setBounds({
                "height": this.base.getBounds().height - 56,
                "width": this.base.getBounds().width,
                "x": 0,
                "y": 56
            })
        }
    }
}

export const init = args => {
    app.whenReady().then(async() => {
        app.userAgentFallback = defaultUseragent()
        new Frame(args.argWindowFrame, args.argDebugMode,
            args.customIcon, args.argInterfaceScale)
    })
}
