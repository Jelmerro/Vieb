import eslintConfig from "eslint-config"

export default {
    ...eslintConfig,
    "languageOptions": {
        ...eslintConfig.languageOptions,
        "sourceType": "module"
    }
}
