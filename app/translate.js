"use strict"

const {
    getAppRootDir,
    isFile,
    isNestedStringObject,
    joinPath,
    listDir,
    readJSONSync
} = require("./util")

/** @type {import("./util").StringOrObject} */
const translations = {}
let selectedLang = "en"

/** Returns a list of languages according to the language files present. */
const validLanguages = () => {
    const files = listDir(joinPath(getAppRootDir(), "translations")) ?? []
    return files.filter(f => f.endsWith(".json"))
        .map(f => f.replace(/\.json$/, ""))
}

/**
 * Update the lang used for translations via func so translate func is faster.
 * @param {string} lang
 */
const updateLang = lang => {
    selectedLang = lang
}

/**
 * Load a translation language from disk.
 * @param {string} lang
 * @throws {Error} When the language key is invalid or its language file broken.
 */
const loadLang = lang => {
    if (translations[lang]) {
        return
    }
    const filePath = joinPath(getAppRootDir(), "translations", `${lang}.json`)
    if (validLanguages().includes(lang) && isFile(filePath)) {
        const tr = readJSONSync(filePath) ?? {}
        if (isNestedStringObject(tr)) {
            translations[lang] = tr
        } else {
            throw new Error(`Language file ${lang} contains errors`)
        }
    } else {
        throw new Error(`Language ${lang} not found`)
    }
}

/**
 * Translate a field.
 * @param {import("../types/i18n").TranslationKeys} id
 * @param {{fields?: string[], customLang?: null|string}} opts
 * @returns {string}
 * @throws {Error} When the English language file is not valid.
 */
const translate = (id, {customLang = null, fields = []} = {}) => {
    if (!translations.en) {
        const filePath = joinPath(getAppRootDir(), "translations/en.json")
        const tr = readJSONSync(filePath) ?? {}
        if (isNestedStringObject(tr)) {
            translations.en = tr
        } else {
            throw new Error("Language file en contains errors")
        }
    }
    const currentLang = customLang ?? selectedLang
    if (!translations[currentLang]) {
        loadLang(currentLang)
    }
    const obj = translations[currentLang]
    const path = id.split(".")
    let translation = obj
    for (const key of path) {
        if (!translation || typeof translation === "string") {
            break
        }
        translation = translation[key]
    }
    if (translation && typeof translation === "string") {
        for (const [key, value] of fields?.entries() ?? []) {
            translation = translation.replace(
                new RegExp(String.raw`\$${key + 1}`, "g"), value)
        }
        return translation
    }
    if (currentLang !== "en") {
        return translate(id, {"customLang": "en", "fields": fields ?? []})
    }
    return id
}

/**
 * Convert an array of arguments to a human-readable list.
 * @param {string[]} args
 * @param {"or"|"and"|"none"} linkWord
 * @param {"single"|"double"|"none"} quotes
 */
const argsAsHumanList = (args, linkWord = "or", quotes = "single") => {
    let readable = ""
    let quotestart = ""
    let quoteend = ""
    const commaspaced = translate("util.commaSpaced")
    if (quotes !== "none") {
        quotestart = translate(`util.${quotes}QuoteStart`)
        quoteend = translate(`util.${quotes}QuoteEnd`)
    }
    for (const arg of args.slice(0, -1)) {
        readable += `${commaspaced}${quotestart}${arg}${quoteend}`
    }
    readable += `${translate(`util.${linkWord}`)}${
        quotestart}${args.at(-1)}${quoteend}`
    return readable.replace(commaspaced, "")
}

module.exports = {
    argsAsHumanList,
    translate,
    updateLang,
    validLanguages
}
