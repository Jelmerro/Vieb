"use strict"

const {"default": eslintConfig, JS} = require("eslint-config")

eslintConfig[JS].languageOptions.sourceType = "commonjs"
eslintConfig[JS].rules["n/global-require"] = "off"
eslintConfig[JS].rules["unicorn/prefer-module"] = "off"
eslintConfig[JS].rules["unicorn/prefer-top-level-await"] = "off"

module.exports = eslintConfig
