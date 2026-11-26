/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2026 Jelmer van Arnhem
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
/* eslint-disable jsdoc/require-jsdoc,
 n/no-path-concat,
 unicorn/no-global-object-property-assignment,
 unicorn/consistent-class-member-order
*/
"use strict"

const assert = require("node:assert")
const path = require("node:path")
const {describe, test} = require("node:test")
const UTIL = require("./util")

describe("Special pages", () => {
    const specialPagesToFilenames = [
        {
            "arguments": ["help"],
            "reason": "Expect basic conversion to work",
            "response": `file://${path.resolve(`${__dirname}/pages/help.html`)}`
        },
        {
            "arguments": ["test", null, false],
            "reason": "Expect to give help page",
            "response": `file://${path.resolve(`${__dirname}/pages/help.html`)}`
        },
        {
            "arguments": ["downloads", "#list"],
            "reason": "Don't prepend hashes if already provided",
            "response": `file://${path.resolve(
                `${__dirname}/pages/downloads.html#list`)}`
        },
        {
            "arguments": ["nonexistent", "test", true],
            "reason": "Skip page existence checks if requested",
            "response": `file://${path.resolve(
                `${__dirname}/pages/nonexistent.html#test`)}`
        },
        {
            "arguments": ["help", "test"],
            "reason": "Expect basic conversion to work",
            "response": `file://${path.resolve(
                `${__dirname}/pages/help.html#test`)}`
        }
    ]
    for (const specialPageTest of specialPagesToFilenames) {
        test(`Testing "${specialPageTest.arguments}":
    ${specialPageTest.reason}`, () => {
            assert.strictEqual(
                UTIL.specialPagePath(...specialPageTest.arguments),
                specialPageTest.response)
        })
    }
})

describe("Versions", () => {
    const versions = [
        {
            "new": "1.0.0",
            "reason": "Expect the same semantic version to be equal",
            "ref": "1.0.0",
            "result": "even"
        },
        {
            "new": "2.0.0",
            "reason": "Expect a new major upgrade to be newer",
            "ref": "1.0.0",
            "result": "newer"
        },
        {
            "new": "1.1.0",
            "reason": "Expect a new minor upgrade to be newer",
            "ref": "1.0.0",
            "result": "newer"
        },
        {
            "new": "1.0.1",
            "reason": "Expect a new patch upgrade to be newer",
            "ref": "1.0.0",
            "result": "newer"
        },
        {
            "new": "1.0.0",
            "reason": "Expect a version without a prerelease suffix to be newer"
            + " than the same version without the suffix",
            "ref": "1.0.0-whatever",
            "result": "newer"
        },
        {
            "new": "3.0.0-beta",
            "reason":
                "Beta releases are also older than the same version proper",
            "ref": "3.0.0",
            "result": "older"
        },
        {
            "new": "1.0.0",
            "reason":
                "Expect the suffix to be unused if the numbers are different",
            "ref": "1.1.0-beta",
            "result": "older"
        },
        {
            "new": "2.0.0-beta",
            "reason": "Expect same version to be equal, even with suffix",
            "ref": "2.0.0-beta",
            "result": "even"
        },
        {
            "new": "2.0.0-onetime",
            "reason": "Expect unknown suffixes to be equal",
            "ref": "2.0.0-testthisone",
            "result": "even"
        },
        {
            "new": "3.0.0",
            "reason": "Expect no result if it's not a valid number",
            "ref": "notvalid",
            "result": "unknown"
        },
        {
            "new": "2.0.0-beta",
            "reason": "Expect beta versions to be newer than dev versions",
            "ref": "2.0.0-dev",
            "result": "newer"
        },
        {
            "new": "2.0.0-alpha",
            "reason": "Expect alpha versions to be older than beta versions",
            "ref": "2.0.0-beta",
            "result": "older"
        },
        {
            "new": "2.0.0-alpha",
            "reason":
                "Expect alpha versions to be older than prerelease versions",
            "ref": "2.0.0-prerelease",
            "result": "older"
        },
        {
            "new": "2.0.0-prerelease",
            "reason":
                "Expect prerelease versions to be newer than beta versions",
            "ref": "2.0.0-beta",
            "result": "newer"
        }
    ]
    for (const v of versions) {
        test(`Testing '${v.ref}' vs '${v.new}': ${v.reason}`, () => {
            assert.strictEqual(UTIL.compareVersions(v.new, v.ref), v.result)
        })
    }
})

describe("Format sizes work correctly", () => {
    const sizes = [
        {"number": 0, "output": "0 B"},
        {"number": 45, "output": "45 B"},
        {"number": 999, "output": "999 B"},
        {"number": 1023, "output": "1023 B"},
        {"number": 1024, "output": "1 KB"},
        {"number": 1048575, "output": "1024 KB"},
        {"number": 1048576, "output": "1 MB"},
        {"number": 45345237, "output": "43.24 MB"},
        {"number": 92445237293, "output": "86.1 GB"},
        {"number": 1099511627776, "output": "1 TB"},
        {"number": 9999999999999, "output": "9.09 TB"},
        {"number": 1.1111111111111111e+35, "output": "87651.21 QB"}
    ]
    for (const s of sizes) {
        test(`Testing that ${s.number} becomes ${s.output}`, () => {
            assert.strictEqual(UTIL.formatSize(s.number), s.output)
        })
    }
})

test("Filesystem helpers should work as expected", async() => {
    const {rmdirSync} = require("node:fs")
    const {tmpdir} = require("node:os")
    const {basename, dirname, isAbsolute} = require("node:path")
    const file = UTIL.joinPath(tmpdir(), "vieb-test")
    // Clean old test files
    UTIL.deleteFile(file)
    try {
        rmdirSync(file)
    } catch {
        // Probably does not exist
    }
    // Test simple path checks, make a dir and try to make files at the same loc
    assert.strictEqual(UTIL.pathExists(file), false)
    assert.strictEqual(UTIL.isFile(file), false)
    assert.strictEqual(UTIL.isDir(file), false)
    assert.deepStrictEqual(await UTIL.listDir(file), [])
    assert.strictEqual(UTIL.makeDir(file), true)
    assert.deepStrictEqual(await UTIL.listDir(file), [])
    assert.strictEqual(UTIL.isFile(file), false)
    assert.strictEqual(UTIL.isDir(file), true)
    assert.strictEqual(UTIL.pathExists(file), true)
    assert.strictEqual(
        await UTIL.writeJSON(file, {"test": "test"}, {"indent": 4}), false)
    assert.strictEqual(await UTIL.writeFile(file, "test"), false)
    assert.strictEqual(await UTIL.appendFile(file, "hello"), false)
    // Remove dir, write file to same location and read it again
    try {
        rmdirSync(file)
    } catch {
        // If this fails, the next expect statement will error out
    }
    assert.strictEqual(UTIL.isDir(file), false)
    assert.strictEqual(UTIL.pathExists(file), false)
    assert.strictEqual(
        await UTIL.writeJSON(file, {"test": "test"}, {"indent": 4}), true)
    const output = await UTIL.readJSON(file)
    assert.strictEqual(Object.keys(output).length, 1)
    assert.strictEqual(Object.keys(output)[0], "test")
    assert.strictEqual(output.test, "test")
    assert.strictEqual(await UTIL.readFile(file), `{\n    "test": "test"\n}`)
    assert.strictEqual(await UTIL.appendFile(file, "hello"), true)
    assert.strictEqual(await UTIL.readJSON(file), null)
    assert.strictEqual(await UTIL.readFile(file),
        `{\n    "test": "test"\n}hello`)
    assert.strictEqual(await UTIL.writeFile(file, "test"), true)
    assert.strictEqual(await UTIL.readJSON(file), null)
    assert.strictEqual(await UTIL.readFile(file), "test")
    assert.strictEqual(UTIL.isFile(file), true)
    assert.strictEqual(UTIL.isDir(file), false)
    assert.strictEqual(UTIL.pathExists(file), true)
    assert.strictEqual(UTIL.makeDir(file), false)
    // Delete file and confirm simple checks succeed
    UTIL.deleteFile(file)
    assert.strictEqual(UTIL.isFile(file), false)
    assert.strictEqual(await UTIL.readFile(file), null)
    assert.strictEqual(UTIL.isDir(file), false)
    assert.strictEqual(UTIL.pathExists(file), false)
    let fileList = await UTIL.listDir(
        UTIL.joinPath(__dirname, "./img"), false, true)
    assert.strictEqual(fileList.length, 1)
    assert.strictEqual(fileList[0], "icons")
    fileList = await UTIL.listDir(UTIL.joinPath(__dirname, "./img"), true, true)
    assert.strictEqual(fileList.length, 1)
    assert.strictEqual(fileList[0], UTIL.joinPath(__dirname, "img", "icons"))
    assert.strictEqual(UTIL.dirname("/home/test/"), dirname("/home/test/"))
    assert.strictEqual(UTIL.basePath("/home/test/"), basename("/home/test/"))
    assert.strictEqual(
        UTIL.isAbsolutePath("/home/test/"), isAbsolute("/home/test/"))
})

test("formatDate helper to show dates in proper standard format", () => {
    process.env.TZ = "UTC"
    assert.strictEqual(new Date().getTimezoneOffset(), 0)
    assert.strictEqual(UTIL.formatDate("03-03-2021"), "2021-03-03 00:00:00")
    assert.strictEqual(
        UTIL.formatDate("12/24/2021 4:15 PM"), "2021-12-24 16:15:00")
    assert.strictEqual(UTIL.formatDate(0), "1970-01-01 00:00:00")
    assert.strictEqual(UTIL.formatDate(1630281600), "2021-08-30 00:00:00")
    assert.strictEqual(
        UTIL.formatDate(new Date("2021-04-04")), "2021-04-04 00:00:00")
})

test("sameDomain function should match urls that have the same domain", () => {
    // Basics
    assert.strictEqual(UTIL.sameDomain(
        "https://duckduckgo.com", "https://google.com/"), false)
    assert.strictEqual(UTIL.sameDomain(
        "https://google.com", "https://google.com/"), true)
    assert.strictEqual(UTIL.sameDomain(null, null), false)
    // Strip subdomains, path, search, hash and query
    assert.strictEqual(UTIL.sameDomain(
        "https://google.com/test", "http://www.google.com/search"), true)
    assert.strictEqual(UTIL.sameDomain(
        "https://www.accounts.google.com/", "http://google.com?q=0"), true)
    assert.strictEqual(UTIL.sameDomain(
        "https://new.accounts.google.com/", "http://www.google.com"), true)
    assert.strictEqual(UTIL.sameDomain(
        "https://test.test.com/", "http://test.google.com"), false)
    // Localhost and IPs will not be stripped of subdomains
    assert.strictEqual(UTIL.sameDomain(
        "https://localhost/", "http://localhost#extra"), true)
    assert.strictEqual(UTIL.sameDomain(
        "https://localhost/", "http://test.localhost"), false)
    assert.strictEqual(UTIL.sameDomain(
        "https://localhost:8080/", "http://localhost:3000/test"), true)
    assert.strictEqual(UTIL.sameDomain(
        "https://127.0.0.1/", "http://10.0.0.1"), false)
})

test(`Firefox version should increment by date`, async() => {
    const firstMockDate = new Date("2023-06-05")
    const secondMockDate = new Date("2023-06-06")
    const thirdMockDate = new Date("2023-07-04")
    const sys = await UTIL.userAgentPlatform()
    global.Date = class extends Date {
        constructor(...date) {
            if (date?.length) {
                return super(...date)
            }
            return firstMockDate
        }

        static now() {
            return firstMockDate
        }
    }
    let ver = 113
    assert.strictEqual(await UTIL.firefoxUseragent(),
        `Mozilla/5.0 (${sys}; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`)
    global.Date = class extends Date {
        constructor(...date) {
            if (date?.length) {
                return super(...date)
            }
            return secondMockDate
        }

        static now() {
            return secondMockDate
        }
    }
    ver = 114
    assert.strictEqual(await UTIL.firefoxUseragent(),
        `Mozilla/5.0 (${sys}; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`)
    global.Date = class extends Date {
        constructor(...date) {
            if (date?.length) {
                return super(...date)
            }
            return thirdMockDate
        }

        static now() {
            return thirdMockDate
        }
    }
    ver = 115
    assert.strictEqual(await UTIL.firefoxUseragent(),
        `Mozilla/5.0 (${sys}; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`)
})
