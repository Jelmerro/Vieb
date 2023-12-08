"use strict"

const {
    listDir,
    joinPath,
    readJSON,
    isFile,
    getSetting
} = require("./util")

/** @type {{[lang: string]: string}} */
const translations = {}

const validLanguages = () => {
    const files = listDir(joinPath(__dirname, "translations")) ?? []
    return files.filter(f => f.endsWith(".json"))
        .map(f => f.replace(/\.json$/, ""))
}

const loadLang = lang => {
    if (translations[lang]) {
        return
    }
    const filePath = joinPath(__dirname, "translations", `${lang}.json`)
    if (validLanguages().includes(lang) && isFile(filePath)) {
        translations[lang] = readJSON(filePath)
    } else {
        throw new Error(`Language ${lang} not found`)
    }
}

/**
 * Translate a field.
 * @param {string} id
 * @param {(string|number)[]} fields
 * @param {null|string} customLang
 * @returns {string}
 */
const translate = (id, fields = [], customLang = null) => {
    if (!translations.en) {
        const filePath = joinPath(__dirname, "translations/en.json")
        translations.en = readJSON(filePath)
    }
    const currentLang = customLang ?? getSetting("lang")
    if (!translations[currentLang]) {
        loadLang(currentLang)
    }
    const obj = translations[currentLang]
    const path = id.split(".")
    let translation = obj
    for (const key of path) {
        if (!translation) {
            break
        }
        translation = translation[key]
    }
    if (translation) {
        fields.forEach((value, key) => {
            translation = translation.replace(`$${key + 1}`, String(value))
        })
        return translation
    }
    if (currentLang !== "en") {
        return translate(id, fields, "en")
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
    validLanguages
}
