/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020-2021 Jelmer van Arnhem
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
/* global test expect */
"use strict"

const path = require("path")
const {homedir} = require("os")
const UTIL = require("./util")
const urlTests = [
    {
        "url": "google.com",
        "valid": true,
        "reason": "Valid url without www."
    },
    {
        "url": "https://!@#$!@#$!@#$",
        "valid": true,
        "reason": "Valid url due to protocol being present"
    },
    {
        "url": "h%^*&TD{yfsd^.com",
        "valid": false,
        "reason": "Invalid url because of invalid characters"
    },
    {
        "url": "localhost",
        "valid": true,
        "reason": "Localhost should always be valid"
    },
    {
        "url": "localhost:555",
        "valid": true,
        "reason": "Localhost with port should also be valid"
    },
    {
        "url": "localhost:",
        "valid": false,
        "reason": "Empty port field should not be valid"
    },
    {
        "url": "127.0.0.1",
        "valid": true,
        "reason": "Ip addresses should be valid"
    },
    {
        "url": "111.2403.4.4",
        "valid": false,
        "reason": "Addresses with too many numbers per subnet aren't"
    },
    {
        "url": "34.250.34.34",
        "valid": true,
        "reason": "Ip addresses should be valid"
    },
    {
        "url": "234.435.0.1",
        "valid": false,
        "reason": "Invalid ip addresses should be detected as such"
    },
    {
        "url": "www.youtube.com/test?id=1&uid=1",
        "valid": true,
        "reason": "Query params are allowed"
    },
    {
        "url": "192.168.2.5:25000",
        "valid": true,
        "reason": "Correct ip and port"
    },
    {
        "url": "192.168.2.5:0002",
        "valid": false,
        "reason": "Port below the valid range of 11 to 65535"
    },
    {
        "url": "192.168.2.5:000",
        "valid": false,
        "reason": "Port below the valid range of 11 to 65535"
    },
    {
        "url": "192.168.2.5:66536",
        "valid": false,
        "reason": "Port above the valid range of 11 to 65535"
    },
    {
        "url": "192.168.2.5:000333",
        "valid": false,
        "reason": "Port number has too many characters"
    },
    {
        "url": "duckduckgo.com:43434:2348",
        "valid": false,
        "reason": "Only one port should be used, as : is invalid in domainnames"
    },
    {
        "url": "duckduckgo..com/search",
        "valid": false,
        "reason": "Double dots are never valid in urls before path"
    },
    {
        "url": "raspberrypi/test",
        "valid": false,
        "reason": "A hostname without a toplevel domain is considered invalid"
    },
    {
        "url": "hello:test@example.com",
        "valid": false,
        "reason": "A password in url is not allowed"
    },
    {
        "url": "user:@example.com",
        "valid": false,
        "reason": "Invalid due the inclusion of ':' which indicates a password"
    },
    {
        "url": "user@example.com",
        "valid": true,
        "reason": "Providing only the username is allowed in urls"
    },
    {
        "url": "hello@test@example.com",
        "valid": false,
        "reason": "Double @ sign is invalid"
    },
    {
        "url": "hello--dashes.com",
        "valid": true,
        "reason": "Double dashes are unusual but allowed"
    },
    {
        "url": "hello---dashes.com",
        "valid": false,
        "reason": "Triple dashes are not allowed"
    }
]
urlTests.forEach(urlTest => {
    test(`Testing "${urlTest.url}": ${urlTest.reason}`, () => {
        expect(UTIL.isUrl(urlTest.url)).toBe(urlTest.valid)
    })
})


const specialPagesToFilenames = [
    {
        "arguments": ["help"],
        "response": `file://${path.resolve(`${__dirname}/pages/help.html`)}`,
        "reason": "Expect basic conversion to work"
    },
    {
        "arguments": ["test", null, false],
        "response": `file://${path.resolve(`${__dirname}/pages/help.html`)}`,
        "reason": "Expect to give help page"
    },
    {
        "arguments": ["downloads", "#list"],
        "response": `file://${path.resolve(
            `${__dirname}/pages/downloads.html#list`)}`,
        "reason": "Don't prepend hashes if already provided"
    },
    {
        "arguments": ["nonexistent", "test", true],
        "response": `file://${path.resolve(
            `${__dirname}/pages/nonexistent.html#test`)}`,
        "reason": "Skip page existence checks if requested"
    },
    {
        "arguments": ["help", "test"],
        "response": `file://${path.resolve(
            `${__dirname}/pages/help.html#test`)}`,
        "reason": "Expect basic conversion to work"
    }
]
specialPagesToFilenames.forEach(specialPageTest => {
    test(`Testing "${specialPageTest.arguments}":
    ${specialPageTest.reason}`, () => {
        expect(UTIL.specialPagePath(...specialPageTest.arguments))
            .toBe(specialPageTest.response)
    })
})

test(`Title function should capitalize first char and lowercase others`, () => {
    expect(UTIL.title("teSt")).toBe("Test")
    expect(UTIL.title("")).toBe("")
    expect(UTIL.title("multiple WORDS")).toBe("Multiple words")
})

test(`Expand path to resolve homedir and downloads`, () => {
    sessionStorage.setItem("settings", JSON.stringify({
        "downloadpath": `~${path.sep}Downloads${path.sep}`
    }))
    expect(UTIL.downloadPath()).toBe(
        `${homedir()}${path.sep}Downloads${path.sep}`)
    sessionStorage.setItem("settings", JSON.stringify({
        "downloadpath": `Downloads${path.sep}`
    }))
    expect(UTIL.downloadPath()).toBe(`Downloads${path.sep}`)
})

test(`Firefox version should increment by date`, () => {
    const firstMockDate = new Date("2021-03-26T00:00:00.000Z")
    const secondMockDate = new Date("2021-08-26T00:00:00.000Z")
    const sys = window.navigator.platform
    global.Date = class extends Date {
        constructor(...date) {
            if (date?.length) {
                return super(...date)
            }
            return firstMockDate
        }
    }
    let ver = 87
    expect(UTIL.firefoxUseragent()).toBe(
        `Mozilla/5.0 (${sys}; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`)
    global.Date = class extends Date {
        constructor(...date) {
            if (date?.length) {
                return super(...date)
            }
            return secondMockDate
        }
    }
    ver = 93
    expect(UTIL.firefoxUseragent()).toBe(
        `Mozilla/5.0 (${sys}; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`)
})
