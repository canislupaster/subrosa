import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
  recommendedConfig: pluginJs.configs.recommended
});

const commonRules = {
  "@typescript-eslint/ban-ts-comment": "off",
  "no-useless-constructor": "off",
  "@typescript-eslint/no-unused-vars": [
    "warn",
    {
      "argsIgnorePattern": "^_[^_].*$|^_$",
      "varsIgnorePattern": "^_[^_].*$|^_$",
      "caughtErrorsIgnorePattern": "^_[^_].*$|^_$"
    }
  ]
};

const common = {rules: commonRules};

export default [
  ...tseslint.config({
    files: ["src/**/*.{ts,tsx,js,jsx,d.ts}"],
    extends: [
      pluginJs.configs.recommended,
      ...compat.extends("preact"),
      ...tseslint.configs.recommendedTypeChecked,
      common
    ],
    settings: { },
    languageOptions: {
      globals: {...globals.browser},
      parserOptions: { projectService: true },
    }
  }, {
    ignores: ["dist"]
  })
];