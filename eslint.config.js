import html from "eslint-plugin-html";
import globals from "globals";

export default [
  { ignores: ["node_modules", "playwright-report", "test-results", "docs/reference"] },
  {
    files: ["**/*.html"],
    plugins: { html },
    processor: "html/html",
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: { ...globals.browser },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["tests/**/*.js", "playwright.config.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
];
