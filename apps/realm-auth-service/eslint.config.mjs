// @ts-check
import { createRequire } from "node:module";
import eslint from "@eslint/js";
import globals from "globals";

const realmAuthRequire = createRequire(
  new URL("../auth-service/package.json", import.meta.url),
);
const prettierRecommended = realmAuthRequire(
  "eslint-plugin-prettier/recommended",
);
const tseslint = realmAuthRequire("typescript-eslint");

export default tseslint.config(
  { ignores: ["eslint.config.mjs", "src/generated/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["test/**/*.ts"],
    languageOptions: {
      parserOptions: { projectService: false, project: "./tsconfig.spec.json" },
    },
  },
  {
    files: ["prisma.config.ts", "prisma/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./tsconfig.tools.json",
      },
    },
  },
);
