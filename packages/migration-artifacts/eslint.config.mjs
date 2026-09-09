// @ts-check
import { createRequire } from "node:module";
import eslint from "@eslint/js";
import globals from "globals";

const rootRequire = createRequire(
  new URL("../../package.json", import.meta.url),
);
const prettier = rootRequire("eslint-plugin-prettier/recommended");
const tseslint = rootRequire("typescript-eslint");

export default tseslint.config(
  { ignores: ["dist/**", "dist-test/**", "eslint.config.mjs"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      globals: globals.node,
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
