/* The ISC License

This is a sync-only no-glob native-fs reworked rimraf that also works in Windows

- NodeJS forked the code and then broke/removed all the Windows fixes
- rimraf has a hard dependency on glob and async versions which are unnecessary
- Now I have to maintain a separate version of rimraf that just works...

Copyright (C) 2022-2023 Jelmer van Arnhem
Copyright (c) 2011-2022 Isaac Z. Schlueter and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
"use strict"

const fs = require("fs")

/**
 * Check if the exception is a NodeJS Errno Exception.
 * @param {any} e
 * @returns {e is NodeJS.ErrnoException}
 */
const isErrnoException = e => "code" in e

/**
 * Workaround for window EPERM errors, just retry a lot of times till it works.
 * @param {string} p
 * @param {Error|null} er
 * @throws {Error} Filesystem error.
 */
const fixWinEPERMSync = (p, er) => {
    try {
        fs.chmodSync(p, 0o666)
    } catch (er2) {
        if (isErrnoException(er2) && er2.code === "ENOENT") {
            return
        }
        throw er
    }
    let stats = null
    try {
        stats = fs.statSync(p)
    } catch (er3) {
        if (isErrnoException(er3) && er3.code === "ENOENT") {
            return
        }
        throw er
    }
    if (stats.isDirectory()) {
        rmdirSync(p, er)
    } else {
        fs.unlinkSync(p)
    }
}

/**
 * Remove a location using "rm -rf" rimraf module.
 * @param {string} p
 * @throws {Error} Filesystem error.
 */
const rimrafSync = p => {
    let st = null
    try {
        st = fs.lstatSync(p)
    } catch (er) {
        if (isErrnoException(er) && er.code === "ENOENT") {
            return
        }
        if (process.platform === "win32") {
            if (isErrnoException(er) && er.code === "EPERM") {
                fixWinEPERMSync(p, er)
            }
        }
    }
    try {
        if (st?.isDirectory()) {
            rmdirSync(p, null)
        } else {
            fs.unlinkSync(p)
        }
    } catch (er) {
        if (isErrnoException(er) && er.code === "ENOENT") {
            return
        }
        if (isErrnoException(er) && er.code === "EPERM") {
            if (process.platform === "win32") {
                return fixWinEPERMSync(p, er)
            }
            return rmdirSync(p, er)
        }
        if (isErrnoException(er) && er.code === "EISDIR") {
            throw er
        }
        if (er instanceof Error) {
            rmdirSync(p, er)
        }
    }
}

/**
 * Remove a directory sync.
 * @param {string} p
 * @param {Error|null} originalEr
 * @throws {Error} Filesystem error.
 */
const rmdirSync = (p, originalEr) => {
    try {
        fs.rmdirSync(p)
    } catch (er) {
        if (isErrnoException(er) && er.code === "ENOENT") {
            return
        }
        if (isErrnoException(er) && er.code === "ENOTDIR") {
            throw originalEr
        }
        if (isErrnoException(er)
            && ["ENOTEMPTY", "EEXIST", "EPERM"].includes(er.code ?? "")) {
            const {join} = require("path")
            fs.readdirSync(p).forEach(f => rimrafSync(join(p, f)))
            let retries = 1
            if (process.platform === "win32") {
                retries = 100
            }
            let i = 0
            /* eslint-disable-next-line no-unreachable-loop */
            while (i < retries) {
                try {
                    return fs.rmSync(p, {
                        "maxRetries": retries, "recursive": true
                    })
                } finally {
                    i += 1
                }
            }
        }
    }
}


module.exports = rimrafSync
