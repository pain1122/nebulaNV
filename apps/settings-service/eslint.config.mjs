// @ts-check
import { createRequire } from "node:module";

import eslint from "@eslint/js";
import globals from "globals";

const authServiceRequire = createRequire(
  new URL("../auth-service/package.json", import.meta.url),
);
const eslintPluginPrettierRecommended = authServiceRequire(
  "eslint-plugin-prettier/recommended",
);
const tseslint = authServiceRequire("typescript-eslint");

export default tseslint.config(
  {
    ignores: ["eslint.config.mjs", "src/generated/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
    },
  },
  {
    files: ["test/**/*.ts"],
    languageOptions: {
      parserOptions: { projectService: false, project: "./tsconfig.test.json" },
    },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-redundant-type-constituents": "warn",
      "@typescript-eslint/unbound-method": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    files: ["prisma.config.ts", "prisma/seed.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./tsconfig.tools.json",
      },
    },
  },
);
