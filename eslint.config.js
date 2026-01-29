"use strict"

const eslintConfig = require("eslint-config").default

eslintConfig[0].languageOptions.sourceType = "commonjs"
eslintConfig[0].rules["n/global-require"] = "off"
eslintConfig[0].rules["unicorn/prefer-module"] = "off"
eslintConfig[0].rules["unicorn/prefer-top-level-await"] = "off"
eslintConfig[0].ignores.push("ViebData/**/*.js")
eslintConfig[1].ignores.push("ViebData/**/*.json", "dist/**/*.json")

module.exports = eslintConfig
