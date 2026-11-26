/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2026 Jelmer van Arnhem
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
"use strict"

const assert = require("node:assert")
const {describe, test} = require("node:test")
const UTIL = require("./common")

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
    for (const urlTest of urlTests) {
        test(`Testing "${urlTest.url}": ${urlTest.reason}`, async() => {
            assert.strictEqual(await UTIL.isUrl(urlTest.url), urlTest.valid)
        })
    }
})
