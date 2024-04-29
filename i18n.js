/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2023-2024 Jelmer van Arnhem
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
/* eslint-disable max-depth */

const {
    listDir, joinPath, readJSON, writeJSON, writeFile
} = require("./app/util")

const files = listDir(joinPath(__dirname, "app/translations"))
    .filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/, "")) ?? []
const translations = {}
for (const f of files) {
    const contents = readJSON(joinPath(__dirname, `app/translations/${f}.json`))
    translations[f] = contents
}

const listKeys = (obj, folder = "") => {
    const keys = []
    for (const l of Object.keys(obj)) {
        let path = l
        if (folder) {
            path = `${folder}.${l}`
        }
        if (typeof obj[l] === "object") {
            keys.push(...listKeys(obj[l], path))
        } else {
            keys.push(path)
        }
    }
    return keys
}

const getVal = (lang, key) => {
    const obj = translations[lang]
    const path = key.split(".")
    let translation = obj
    for (const id of path) {
        translation = translation[id]
        if (!translation) {
            break
        }
    }
    return translation
}

const numberOfFields = (lang, key) => {
    const enValue = getVal(lang, key)
    for (let i = 1; i < 100; i++) {
        if (enValue === undefined || !enValue.includes(`$${i}`)) {
            return i - 1
        }
    }
}

const types = () => {
    const keyList = listKeys(translations.en).map(k => `    | "${k}"`)
    const output = `export type TranslationKeys =\n${keyList.join("\n")}\n`
    writeFile("types/i18n.d.ts", output)
}

const writeTranslations = () => {
    for (const lang of Object.keys(translations)) {
        const filePath = joinPath(__dirname, `app/translations/${lang}.json`)
        writeJSON(filePath, translations[lang], {
            "indent": 4,
            /**
             * Re-create object values so that the order is alphabetic.
             * @param {string} _key
             * @param {string} value
             */
            "replacer": (_key, value) => {
                if (typeof value !== "object" || Array.isArray(value)) {
                    return value
                }
                return Object.keys(value).sort().reduce((sorted, k) => {
                    sorted[k] = value[k]
                    return sorted
                }, {})
            }
        })
    }
    types()
}

let args = process.argv.slice(1)
if (args[0].endsWith("i18n") || args[0].endsWith("i18n.js")) {
    args = args.slice(1)
}
if (args[0] === "types") {
    types()
}
if (args[0] === "lint") {
    const enKeys = listKeys(translations.en)
    let returnCode = 0
    for (const lang of Object.keys(translations).filter(k => k !== "en")) {
        const langKeys = listKeys(translations[lang])
        for (const key of enKeys.filter(k => !langKeys.includes(k))) {
            console.warn(`Missing key ${key} in lang file ${lang}`)
            returnCode = 1
        }
    }
    for (const lang of Object.keys(translations)) {
        for (const key of listKeys(translations[lang])) {
            const val = getVal(lang, key)
            if (!val) {
                if (getVal("en", key)) {
                    console.warn(`Empty value for ${key} in lang file ${lang}`)
                } else if (key !== "util.none") {
                    console.warn(`Extra key ${key} in lang file ${lang}`)
                }
                returnCode = 1
            }
            if (numberOfFields("en", key) !== numberOfFields(lang, key)) {
                console.warn(`Incorrect number of template fields for ${
                    key} in lang file ${lang}`)
                returnCode = 1
            }
        }
    }
    process.exit(returnCode)
}
if (args[0] === "addlang") {
    if (args.length !== 2) {
        console.warn("Addlang command requires a single language argument.")
        process.exit(1)
    }
    const [, lang] = args
    if (translations[lang]) {
        console.warn("Language already exists.")
        process.exit(1)
    }
    const filePath = joinPath(__dirname, `app/translations/${lang}.json`)
    writeJSON(filePath, translations.en, {
        "indent": 4,
        /**
         * Replace string values with empty keys.
         * @param {string} _key
         * @param {string} value
         */
        "replacer": (_key, value) => {
            if (typeof value === "string") {
                return ""
            }
            return value
        }
    })
}
if (args[0] === "addkey") {
    if (args.length !== 3 && args.length !== 2) {
        console.warn("Addkey command requires at least 1 argument, at most 2.")
        console.warn("The first for the key, the second for the english text.")
        process.exit(1)
    }
    const [, key = "", english = ""] = args
    for (const lang of Object.keys(translations)) {
        let obj = translations[lang]
        for (const id of key.split(".").slice(0, -1)) {
            if (!obj[id]) {
                obj[id] = {}
            }
            obj = obj[id]
        }
        if (obj[key.split(".").at(-1)] !== undefined) {
            console.warn(`Key '${key}' already exists!`)
            process.exit(1)
        }
        if (english && lang === "en") {
            obj[key.split(".").at(-1)] = english
        } else {
            obj[key.split(".").at(-1)] = ""
        }
    }
    writeTranslations()
}
if (args[0] === "removekey") {
    if (args.length !== 2) {
        console.warn("Removekey command requires exactly 1 key name argument")
        process.exit(1)
    }
    const [, key = ""] = args
    for (const lang of Object.keys(translations)) {
        let obj = translations[lang]
        for (const id of key.split(".").slice(0, -1)) {
            if (!obj[id]) {
                return
            }
            obj = obj[id]
        }
        delete obj[key.split(".").at(-1)]
    }
    writeTranslations()
}
if (args[0] === "renamekey") {
    if (args.length !== 3) {
        console.warn("Renamekey command requires exactly 2 key name arguments")
        process.exit(1)
    }
    const [, oldKey = "", newKey = ""] = args
    const oldValues = {}
    for (const lang of Object.keys(translations)) {
        let obj = translations[lang]
        for (const id of oldKey.split(".").slice(0, -1)) {
            if (!obj[id]) {
                return
            }
            obj = obj[id]
        }
        oldValues[lang] = obj[oldKey.split(".").at(-1)]
        if (oldValues[lang] === undefined) {
            console.warn(`Key '${oldKey}' not found in '${lang}.json'`)
            process.exit(1)
        }
        delete obj[oldKey.split(".").at(-1)]
    }
    for (const lang of Object.keys(translations)) {
        let obj = translations[lang]
        for (const id of newKey.split(".").slice(0, -1)) {
            if (!obj[id]) {
                obj[id] = {}
            }
            obj = obj[id]
        }
        if (obj[newKey.split(".").at(-1)] !== undefined) {
            console.warn(`Key '${newKey}' already exists!`)
            process.exit(1)
        }
        obj[newKey.split(".").at(-1)] = oldValues[lang]
    }
    writeTranslations()
}
if (!args[0]) {
    console.info("Please use one of the following subcommands:")
    console.info(" lint - check for missing translations or invalid templates")
    console.info(" types - generate the types")
    console.info(" addlang - add a new language")
    console.info(" addkey - add a new translation key, optionally with en text")
    console.info(" removekey - remove a translation key")
    console.info(" renamekey - rename a translation key to a new key")
}
