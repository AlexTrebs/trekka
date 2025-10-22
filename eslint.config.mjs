// eslint.config.mjs
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import prettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Base JS rules
  js.configs.recommended,

  // TypeScript support (.ts, .d.ts)
  {
    files: ["**/*.ts", "**/*.d.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        performance: "readonly",
        setInterval: "readonly",
        fetch: "readonly",
      },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-undef": "off",
    },
  },

  // Svelte component support
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: "@typescript-eslint/parser",
        project: null,
        extraFileExtensions: [".svelte"],
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        Image: "readonly",
        createImageBitmap: "readonly",
        setInterval: "readonly",
        console: "readonly",
      },
    },
    plugins: { svelte },
    rules: {
      ...svelte.configs["flat/recommended"].rules,
      "svelte/no-navigation-without-resolve": "off",
      "no-undef": "off",
    },
  },

  // Ignore build artifacts & config files
  {
    ignores: [
      ".svelte-kit",
      "build",
      "dist",
      "node_modules",
      "vite.config.ts",
      "eslint.config.mjs",
    ],
  },

  // Prettier integration
  prettier,
];
