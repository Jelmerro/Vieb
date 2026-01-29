"use strict"

const {
    getAppRootDir,
    getSetting,
    isFile,
    joinPath,
    listDir,
    readJSON
} = require("./util")

/** @typedef {string|{[property: string]: StringOrObject}} StringOrObject */
/** @type {StringOrObject} */
const translations = {}
const safeElements = new Set([
    "#text",
    "a",
    "body",
    "br",
    "div",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "kbd",
    "li",
    "ol",
    "p",
    "span",
    "ul"
])
const safeAttributes = new Set(["class", "href"])

/** Returns a list of languages according to the language files present. */
const validLanguages = () => {
    const files = listDir(joinPath(getAppRootDir(), "translations")) ?? []
    return files.filter(f => f.endsWith(".json"))
        .map(f => f.replace(/\.json$/, ""))
}

/**
 * Load a translation language from disk.
 * @param {string} lang
 * @throws {Error} When the language key is invalid.
 */
const loadLang = lang => {
    if (translations[lang]) {
        return
    }
    const filePath = joinPath(getAppRootDir(), "translations", `${lang}.json`)
    if (validLanguages().includes(lang) && isFile(filePath)) {
        translations[lang] = readJSON(filePath)
    } else {
        throw new Error(`Language ${lang} not found`)
    }
}

/**
 * Translate a field.
 * @param {import("../types/i18n").TranslationKeys} id
 * @param {{fields?: string[], customLang?: null|string}} opts
 * @returns {string}
 */
const translate = (id, {customLang = null, fields = []} = {}) => {
    if (!translations.en) {
        const filePath = joinPath(getAppRootDir(), "translations/en.json")
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
        if (!translation || typeof translation === "string") {
            break
        }
        translation = translation[key]
    }
    if (translation && typeof translation === "string") {
        for (const [key, value] of fields?.entries() ?? []) {
            translation = translation.replace(
                new RegExp(String.raw`\$${key + 1}`, "g"), String(value))
        }
        return translation
    }
    if (currentLang !== "en") {
        return translate(id, {"customLang": "en", "fields": fields ?? []})
    }
    return id
}

/**
 * Filter bad elements from a node recursively.
 * @param {ChildNode} node
 */
const onlyKeepSafeNodes = node => {
    if (!safeElements.has(node.nodeName.toLowerCase())) {
        console.warn("Removed node from translations:", node)
        node.remove()
        return
    }
    if (node instanceof Element) {
        for (const attr of node.attributes) {
            if (!safeAttributes.has(attr.name)) {
                console.warn(
                    `Removed attribute ${attr.name} from translations:`, node)
                node.removeAttribute(attr.name)
            }
        }
    }
    for (const child of node.childNodes) {
        onlyKeepSafeNodes(child)
    }
}

/**
 * Translate a field, then parse it as HTML and return a list of safe elements.
 * @param {import("../types/i18n").TranslationKeys} id
 * @param {{fields?: string[], customLang?: null|string}} opts
 */
const translateAsHTML = (id, {customLang = null, fields = []} = {}) => {
    const value = translate(id, {customLang, fields})
    const parsed = new DOMParser().parseFromString(value, "text/html")
    const body = parsed.querySelector("body")
    if (!body) {
        return []
    }
    onlyKeepSafeNodes(body)
    return [...body.childNodes]
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
    translateAsHTML,
    validLanguages
}
