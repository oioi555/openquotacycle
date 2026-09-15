import { defineConfig } from "eslint/config";
import eslintPluginTailwindcss from "eslint-plugin-tailwindcss";
import svelteParser from "svelte-eslint-parser";
import tsParser from "@typescript-eslint/parser";

const tailwindSettings = {
  tailwindcss: {
    cssConfigPath: "./src/index.css",
  },
};

const tailwindRules = {
  "tailwindcss/no-unnecessary-arbitrary-value": "error",
};

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "aur/**",
      "src-tauri/target/**",
      "src-tauri/resources/bundled_plugins/**",
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    files: ["**/*.svelte"],
    plugins: {
      tailwindcss: eslintPluginTailwindcss,
    },
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
      },
    },
    settings: tailwindSettings,
    rules: tailwindRules,
  },
  {
    files: ["**/*.{ts,js}"],
    plugins: {
      tailwindcss: eslintPluginTailwindcss,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    settings: tailwindSettings,
    rules: tailwindRules,
  },
]);
