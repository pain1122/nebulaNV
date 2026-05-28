// @ts-check
import { createRequire } from 'node:module';

import eslint from '@eslint/js';
import globals from 'globals';

// The workspace already installs this toolchain for Nest apps. Reuse it here so
// package linting works without adding new downloads to the root workspace.
const authServiceRequire = createRequire(
  new URL('./apps/auth-service/package.json', import.meta.url),
);
const tseslint = authServiceRequire('typescript-eslint');

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'apps/web/public/assets/libs/**',
      'eslint.config.mjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
