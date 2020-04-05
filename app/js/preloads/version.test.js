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

const VERSION = require("./version")

const versions = [
    {
        "ref": "1.0.0",
        "new": "1.0.0",
        "reason": "Expect the same semantic version to be equal",
        "result": "even"
    },
    {
        "ref": "1.0.0",
        "new": "2.0.0",
        "reason": "Expect a new major upgrade to be newer",
        "result": "newer"
    },
    {
        "ref": "1.0.0",
        "new": "1.1.0",
        "reason": "Expect a new minor upgrade to be newer",
        "result": "newer"
    },
    {
        "ref": "1.0.0",
        "new": "1.0.1",
        "reason": "Expect a new patch upgrade to be newer",
        "result": "newer"
    },
    {
        "ref": "1.0.0-beta",
        "new": "1.0.0",
        "reason": "Expect a version without a prerelease suffix to be newer"
            + " than the same version without the suffix",
        "result": "newer"
    },
    {
        "ref": "1.1.0-beta",
        "new": "1.0.0",
        "reason": "Expect the suffix to be unused if the numbers are different",
        "result": "older"
    },
    {
        "ref": "2.0.0-beta",
        "new": "2.0.0-beta",
        "reason": "Expect same version to be equal, even with suffix",
        "result": "even"
    },
    {
        "ref": "2.0.0-dev",
        "new": "2.0.0-beta",
        "reason": "Expect beta versions to be newer than dev versions",
        "result": "newer"
    },
    {
        "ref": "2.0.0-beta",
        "new": "2.0.0-alpha",
        "reason": "Expect alpha versions to be older than beta versions",
        "result": "older"
    },
    {
        "ref": "2.0.0-prerelease",
        "new": "2.0.0-alpha",
        "reason": "Expect alpha versions to be older than prerelease versions",
        "result": "older"
    },
    {
        "ref": "2.0.0-beta",
        "new": "2.0.0-prerelease",
        "reason": "Expect prerelease versions to be newer than beta versions",
        "result": "newer"
    }
]

versions.forEach(v => {
    test(`Testing '${v.ref}' vs '${v.new}': ${v.reason}`, () => {
        expect(VERSION.compareVersions(v.new, v.ref)).toBe(v.result)
    })
})
