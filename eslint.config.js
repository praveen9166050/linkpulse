// ESLint flat config. Run: npm run lint
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default defineConfig(
  { ignores: ["node_modules/", "dist/", "coverage/"] },

  js.configs.recommended,

  // Type-aware rules: they read the TypeScript types, so they catch things
  // like a forgotten `await` (no-floating-promises) or awaiting a non-promise.
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Rules that flag the anti-patterns in the learning plan
  {
    rules: {
      complexity: ["warn", 10], // god functions
      "max-depth": ["warn", 3], // deeply nested code
      "max-params": ["warn", 4], // too many arguments: pass an object
      "no-console": "warn", // use the structured logger (Phase 10)
      eqeqeq: "error", // always === and !==
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
    },
  },

  // Config files are plain JS, outside the TypeScript project
  { files: ["*.js"], ...tseslint.configs.disableTypeChecked },

  // Must be last: turns off rules that would fight Prettier
  prettier,
);
