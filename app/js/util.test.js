/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2020 Jelmer van Arnhem
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
const UTIL = require("./util")
const urlTests = [
    {
        "url": "google.com",
        "valid": true,
        "reason": "Valid url without www."
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
        "url": "127.0.0.1",
        "valid": true,
        "reason": "Ip addresses should be valid"
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
        "url": "raspberrypi/test",
        "valid": false,
        "reason": "A hostname without a toplevel domain is considered invalid"
    },
    {
        "url": "hoi:test@hoi.com",
        "valid": false,
        "reason": "A password in url is not allowed"
    },
    {
        "url": "user:@lol.com",
        "valid": false,
        "reason": "Invalid due the inclusion of ':' which indicates a password"
    },
    {
        "url": "user@lol.com",
        "valid": true,
        "reason": "Providing only the username is allowed in urls"
    },
    {
        "url": "hello@test@hoi.com",
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
        "response": `file://${path.resolve(`${
            __dirname}/../pages/help.html`)}`,
        "reason": "Expect basic conversion to work"
    },
    {
        "arguments": ["test", null, false],
        "response": `file://${path.resolve(`${
            __dirname}/../pages/help.html`)}`,
        "reason": "Expect to give help page"
    },
    {
        "arguments": ["downloads"],
        "response": `file://${path.resolve(`${
            __dirname}/../pages/downloads.html`)}`,
        "reason": "another filename"
    },
    {
        "arguments": ["help", "test", true],
        "response": `file://${path.resolve(`${
            __dirname}/../pages/help.html#test`)}`,
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
