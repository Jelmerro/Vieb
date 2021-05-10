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

const VERSION = require("./version")

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
        "reason": "Beta releases are also older than the same version proper",
        "ref": "3.0.0",
        "result": "older"
    },
    {
        "new": "1.0.0",
        "reason": "Expect the suffix to be unused if the numbers are different",
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
        "reason": "Expect alpha versions to be older than prerelease versions",
        "ref": "2.0.0-prerelease",
        "result": "older"
    },
    {
        "new": "2.0.0-prerelease",
        "reason": "Expect prerelease versions to be newer than beta versions",
        "ref": "2.0.0-beta",
        "result": "newer"
    }
]

versions.forEach(v => {
    test(`Testing '${v.ref}' vs '${v.new}': ${v.reason}`, () => {
        expect(VERSION.compareVersions(v.new, v.ref)).toBe(v.result)
    })
})
