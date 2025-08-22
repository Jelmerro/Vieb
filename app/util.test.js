/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2025 Jelmer van Arnhem
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
/* eslint-disable padding-lines/statements, jsdoc/require-jsdoc */

import {strictEqual} from "node:assert"
import {rmdirSync} from "node:fs"
import {tmpdir} from "node:os"
import {basename, dirname, isAbsolute, resolve} from "node:path"
import {describe, test} from "node:test"
import {specialPagePath} from "./preloadutil.js"
import {
    dirname as _dirname,
    appendFile,
    basePath,
    compareVersions,
    deleteFile,
    firefoxUseragent,
    formatDate,
    formatSize,
    isAbsolutePath,
    isDir,
    isFile,
    isUrl,
    joinPath,
    listDir,
    makeDir,
    pathExists,
    readFile,
    readJSON,
    sameDomain,
    userAgentPlatform,
    writeFile,
    writeJSON
} from "./util.js"

describe("Check isUrl", () => {
    const urlTests = [
        {
            "reason": "Valid url without www.",
            "url": "google.com",
            "valid": true
        },
        {
            "reason": "Invalid url even if protocol is present",
            "url": "https://urls with spaces in the hostname are never valid",
            "valid": false
        },
        {
            "reason": "Invalid url, random words are not a url",
            "url": "urls with spaces in the hostname are never valid",
            "valid": false
        },
        {
            "reason": "Valid url due to protocol being present",
            "url": "https://thisisnotalikelyurlbutstillconsideredvalid",
            "valid": true
        },
        {
            "reason": "Invalid even with protocol due to invalid chars",
            "url": "https://!@#$!@#$!@#$",
            "valid": false
        },
        {
            "reason": "Invalid url because of invalid characters",
            "url": "h%^*&TD{yfsd^.com",
            "valid": false
        },
        {
            "reason": "Localhost should always be valid",
            "url": "localhost",
            "valid": true
        },
        {
            "reason": "Localhost with port should also be valid",
            "url": "localhost:555",
            "valid": true
        },
        {
            "reason": "Empty port field is unusual, but actually valid",
            "url": "example.com:",
            "valid": true
        },
        {
            "reason": "Empty port field is unusual, but actually valid",
            "url": "localhost:",
            "valid": true
        },
        {
            "reason": "Ip addresses should be valid",
            "url": "127.0.0.1",
            "valid": true
        },
        {
            "reason": "Addresses with too many numbers per subnet aren't",
            "url": "111.2403.4.4",
            "valid": false
        },
        {
            "reason": "Ip addresses should be valid",
            "url": "34.250.34.34",
            "valid": true
        },
        {
            "reason": "Invalid ip addresses should be detected as such",
            "url": "234.435.0.1",
            "valid": false
        },
        {
            "reason": "Query params are allowed",
            "url": "www.youtube.com/test?id=1&uid=1",
            "valid": true
        },
        {
            "reason": "Correct ip and port",
            "url": "192.168.2.5:25000",
            "valid": true
        },
        {
            "reason": "Incorrect ip should be invalid",
            "url": "30.168.260.26",
            "valid": false
        },
        {
            "reason": "Incorrect ip with correct port still invalid",
            "url": "300.168.2.260:25000",
            "valid": false
        },
        {
            "reason": "Port below the valid range of 11 to 65535",
            "url": "192.168.2.5:0002",
            "valid": false
        },
        {
            "reason": "Port below the valid range of 11 to 65535",
            "url": "192.168.2.5:000",
            "valid": false
        },
        {
            "reason": "Port above the valid range of 11 to 65535",
            "url": "192.168.2.5:66536",
            "valid": false
        },
        {
            "reason": "Port number has too many characters and is too high",
            "url": "192.168.2.5:100003",
            "valid": false
        },
        {
            "reason": "Port number has many characters, but the port is valid",
            "url": "192.168.2.5:000333",
            "valid": true
        },
        {
            "reason":
                "Only one port should be used as : is invalid in domainnames",
            "url": "duckduckgo.com:43434:2348",
            "valid": false
        },
        {
            "reason": "Double dots are never valid in urls before path",
            "url": "duckduckgo..com/search",
            "valid": false
        },
        {
            "reason":
                "A random hostname is considered invalid, could be any word",
            "url": "raspberrypi/test",
            "valid": false
        },
        {
            "reason": "A password in url is allowed, though probably insecure",
            "url": "hello:test@example.com",
            "valid": true
        },
        {
            "reason": "Empty password is allowed, even if unusual",
            "url": "user:@example.com",
            "valid": true
        },
        {
            "reason": "Providing only the username is allowed in urls",
            "url": "user@example.com",
            "valid": true
        },
        {
            "reason": "Double @ sign is all part of the username and valid",
            "url": "hello@test@example.com",
            "valid": true
        },
        {
            "reason": "Spaces in hostname are not valid",
            "url": "hello%20example.com",
            "valid": false
        },
        {
            "reason": "Spaces in username are not valid",
            "url": "hello%20world@example.com",
            "valid": false
        },
        {
            "reason": "Spaces in hostname are never valid even with protocol",
            "url": "https://hello%20example.com",
            "valid": false
        },
        {
            "reason": "Spaces in username are never valid even with protocol",
            "url": "https://hello%20world@example.com",
            "valid": false
        },
        {
            "reason": "Starting dashes are not allowed",
            "url": "-brokendash.com",
            "valid": false
        },
        {
            "reason": "Double dashes are unusual but allowed",
            "url": "hello--dashes.com",
            "valid": true
        },
        {
            "reason": "Magnet links and other data schemes are valid",
            "url": "magnet:?uri=thispartisntchecked",
            "valid": true
        },
        {
            "reason":
                "Not all data schemes are supported, those are searched for",
            "url": "random:scheme",
            "valid": false
        },
        {
            "reason": "Triple dashes are not allowed",
            "url": "hello---dashes.com",
            "valid": false
        },
        {
            "reason": "Valid ipv6 address",
            "url": "[2607:f8b0:4006:80a::2004]",
            "valid": true
        },
        {
            "reason": "Invalid ipv6, has too many brackets",
            "url": "[[2607:f8b0:4006:80a::2004]]",
            "valid": false
        },
        {
            "reason": "Invalid ipv6, has no brackets",
            "url": "2607:f8b0:4006:80a::2004",
            "valid": false
        },
        {
            "reason": "Invalid ipv6, g character is not valid hex",
            "url": "[2607:f8g0:4006:80a::2004]",
            "valid": false
        },
        {
            "reason": "Invalid ipv6, closing bracket inside address",
            "url": "[2607:f8b0:4006:]80a::2004]",
            "valid": false
        },
        {
            "reason": "Invalid ipv6, too many colons",
            "url": "[2607::f8b0::4006::80a::2004]",
            "valid": false
        }
    ]
    urlTests.forEach(urlTest => {
        test(`Testing "${urlTest.url}": ${urlTest.reason}`, () => {
            strictEqual(isUrl(urlTest.url), urlTest.valid)
        })
    })
})

describe("Special pages", () => {
    const specialPagesToFilenames = [
        {
            "arguments": ["help"],
            "reason": "Expect basic conversion to work",
            "response": `file://${resolve(`${import.meta.dirname}/pages/help.html`)}`
        },
        {
            "arguments": ["test", null, false],
            "reason": "Expect to give help page",
            "response": `file://${resolve(`${import.meta.dirname}/pages/help.html`)}`
        },
        {
            "arguments": ["downloads", "#list"],
            "reason": "Don't prepend hashes if already provided",
            "response": `file://${resolve(
                `${import.meta.dirname}/pages/downloads.html#list`)}`
        },
        {
            "arguments": ["nonexistent", "test", true],
            "reason": "Skip page existence checks if requested",
            "response": `file://${resolve(
                `${import.meta.dirname}/pages/nonexistent.html#test`)}`
        },
        {
            "arguments": ["help", "test"],
            "reason": "Expect basic conversion to work",
            "response": `file://${resolve(
                `${import.meta.dirname}/pages/help.html#test`)}`
        }
    ]
    specialPagesToFilenames.forEach(specialPageTest => {
        test(`Testing "${specialPageTest.arguments}":
    ${specialPageTest.reason}`, () => {
            strictEqual(
                specialPagePath(...specialPageTest.arguments),
                specialPageTest.response)
        })
    })
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
    versions.forEach(v => {
        test(`Testing '${v.ref}' vs '${v.new}': ${v.reason}`, () => {
            strictEqual(compareVersions(v.new, v.ref), v.result)
        })
    })
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
    sizes.forEach(s => {
        test(`Testing that ${s.number} becomes ${s.output}`, () => {
            strictEqual(formatSize(s.number), s.output)
        })
    })
})

test("Filesystem helpers should work as expected", () => {
    const file = joinPath(tmpdir(), "vieb-test")
    // Clean old test files
    deleteFile(file)
    try {
        rmdirSync(file)
    } catch {
        // Probably does not exist
    }
    // Test simple path checks, make a dir and try to make files at the same loc
    strictEqual(pathExists(file), false)
    strictEqual(isFile(file), false)
    strictEqual(isDir(file), false)
    strictEqual(listDir(file), null)
    strictEqual(makeDir(file), true)
    strictEqual(listDir(file).length, 0)
    strictEqual(isFile(file), false)
    strictEqual(isDir(file), true)
    strictEqual(pathExists(file), true)
    strictEqual(
        writeJSON(file, {"test": "test"}, {"indent": 4}), false)
    strictEqual(writeFile(file, "test"), false)
    strictEqual(appendFile(file, "hello"), false)
    // Remove dir, write file to same location and read it again
    try {
        rmdirSync(file)
    } catch {
        // If this fails, the next expect statement will error out
    }
    strictEqual(isDir(file), false)
    strictEqual(pathExists(file), false)
    strictEqual(
        writeJSON(file, {"test": "test"}, {"indent": 4}), true)
    const output = readJSON(file)
    strictEqual(Object.keys(output).length, 1)
    strictEqual(Object.keys(output)[0], "test")
    strictEqual(output.test, "test")
    strictEqual(readFile(file), `{\n    "test": "test"\n}`)
    strictEqual(appendFile(file, "hello"), true)
    strictEqual(readJSON(file), null)
    strictEqual(readFile(file), `{\n    "test": "test"\n}hello`)
    strictEqual(writeFile(file, "test"), true)
    strictEqual(readJSON(file), null)
    strictEqual(readFile(file), "test")
    strictEqual(isFile(file), true)
    strictEqual(isDir(file), false)
    strictEqual(pathExists(file), true)
    strictEqual(makeDir(file), false)
    // Delete file and confirm simple checks succeed
    deleteFile(file)
    strictEqual(isFile(file), false)
    strictEqual(readFile(file), null)
    strictEqual(isDir(file), false)
    strictEqual(pathExists(file), false)
    let fileList = listDir(
        joinPath(import.meta.dirname, "./img"), false, true)
    strictEqual(fileList.length, 1)
    strictEqual(fileList[0], "icons")
    fileList = listDir(joinPath(import.meta.dirname, "./img"), true, true)
    strictEqual(fileList.length, 1)
    strictEqual(fileList[0], joinPath(import.meta.dirname, "img", "icons"))
    strictEqual(_dirname("/home/test/"), dirname("/home/test/"))
    strictEqual(basePath("/home/test/"), basename("/home/test/"))
    strictEqual(
        isAbsolutePath("/home/test/"), isAbsolute("/home/test/"))
})

test("formatDate helper to show dates in proper standard format", () => {
    process.env.TZ = "UTC"
    strictEqual(new Date().getTimezoneOffset(), 0)
    strictEqual(formatDate("03-03-2021"), "2021-03-03 00:00:00")
    strictEqual(
        formatDate("12/24/2021 4:15 PM"), "2021-12-24 16:15:00")
    strictEqual(formatDate(0), "1970-01-01 00:00:00")
    strictEqual(formatDate(1630281600), "2021-08-30 00:00:00")
    strictEqual(
        formatDate(new Date("2021-04-04")), "2021-04-04 00:00:00")
})

test("sameDomain function should match urls that have the same domain", () => {
    // Basics
    strictEqual(sameDomain(
        "https://duckduckgo.com", "https://google.com/"), false)
    strictEqual(sameDomain(
        "https://google.com", "https://google.com/"), true)
    strictEqual(sameDomain(null, null), false)
    // Strip subdomains, path, search, hash and query
    strictEqual(sameDomain(
        "https://google.com/test", "http://www.google.com/search"), true)
    strictEqual(sameDomain(
        "https://www.accounts.google.com/", "http://google.com?q=0"), true)
    strictEqual(sameDomain(
        "https://new.accounts.google.com/", "http://www.google.com"), true)
    strictEqual(sameDomain(
        "https://test.test.com/", "http://test.google.com"), false)
    // Localhost and IPs will not be stripped of subdomains
    strictEqual(sameDomain(
        "https://localhost/", "http://localhost#extra"), true)
    strictEqual(sameDomain(
        "https://localhost/", "http://test.localhost"), false)
    strictEqual(sameDomain(
        "https://localhost:8080/", "http://localhost:3000/test"), true)
    strictEqual(sameDomain(
        "https://127.0.0.1/", "http://10.0.0.1"), false)
})

test(`Firefox version should increment by date`, () => {
    const firstMockDate = new Date("2023-06-05")
    const secondMockDate = new Date("2023-06-06")
    const thirdMockDate = new Date("2023-07-04")
    const sys = userAgentPlatform()
    global.Date = class extends Date {
        constructor(...date) {
            if (date?.length) {
                return super(...date)
            }
            return firstMockDate
        }
    }
    let ver = 113
    strictEqual(firefoxUseragent(),
        `Mozilla/5.0 (${sys}; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`)
    global.Date = class extends Date {
        constructor(...date) {
            if (date?.length) {
                return super(...date)
            }
            return secondMockDate
        }
    }
    ver = 114
    strictEqual(firefoxUseragent(),
        `Mozilla/5.0 (${sys}; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`)
    global.Date = class extends Date {
        constructor(...date) {
            if (date?.length) {
                return super(...date)
            }
            return thirdMockDate
        }
    }
    ver = 115
    strictEqual(firefoxUseragent(),
        `Mozilla/5.0 (${sys}; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`)
})
