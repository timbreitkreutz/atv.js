import pluginJs from "@eslint/js";


/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  {
    rules: {
        "no-useless-escape": "off"
    }
  }
];
