import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "examples/*/test-results/**",
      "examples/*/.candidate/**",
      "examples/*/candidate/**",
      "examples/.sfhs-grad-*/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error"
    }
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        URL: "readonly",
        console: "readonly",
        process: "readonly"
      }
    }
  },
  {
    files: ["examples/ueye/src/**/*.js"],
    languageOptions: {
      globals: {
        Blob: "readonly",
        CustomEvent: "readonly",
        EventTarget: "readonly",
        FileReader: "readonly",
        URL: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        document: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        location: "readonly",
        requestAnimationFrame: "readonly",
        setTimeout: "readonly",
        window: "readonly"
      }
    }
  }
);
