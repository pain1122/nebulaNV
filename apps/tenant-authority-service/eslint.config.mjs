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
    ignores: ["eslint.config.mjs", "prisma/generated/**"],
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
        projectService: {
          allowDefaultProject: ["test/*.ts"],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20,
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
