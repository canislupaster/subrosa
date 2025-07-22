import pluginJs from "@eslint/js";
import preact from "eslint-config-preact";
import globals from "globals";
import tseslint from "typescript-eslint";

const commonRules = {
	"@typescript-eslint/ban-ts-comment": "off",
	"@typescript-eslint/strict-boolean-expressions": "warn",
	"no-useless-constructor": "off",
	"@typescript-eslint/no-unused-vars": ["warn", {
		argsIgnorePattern: "^_[^_].*$|^_$",
		varsIgnorePattern: "^_[^_].*$|^_$",
		caughtErrorsIgnorePattern: "^_[^_].*$|^_$",
	}],
};

const common = { rules: commonRules };

export default [
	...tseslint.config({
		files: ["src/**/*.{ts,tsx,js,jsx,d.ts}", "shared/**/*.ts"],
		extends: [
			pluginJs.configs.recommended,
			...preact,
			...tseslint.configs.recommendedTypeChecked,
			common,
		],
		settings: {},
		rules: { "@typescript-eslint/require-array-sort-compare": "warn" },
		languageOptions: { globals: { ...globals.browser }, parserOptions: { projectService: true } },
	}, { ignores: ["dist"] }),
];
