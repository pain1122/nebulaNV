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
  { ignores: ["eslint.config.mjs", "prisma/generated/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: "commonjs",
      parserOptions: {
        projectService: {
          allowDefaultProject: ["test/*.ts"],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20,
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
