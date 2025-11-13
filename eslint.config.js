"use strict"

const eslintConfig = require("eslint-config")

eslintConfig[0].ignores.push("ViebData/**/*.js")
eslintConfig[1].ignores.push("ViebData/**/*.json")
eslintConfig[1].ignores.push("dist/**/*.json")

module.exports = eslintConfig
