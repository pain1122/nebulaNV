import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  // catch both unit and e2e specs
  testRegex: '(/__tests__/.*|(\\.|/)(e2e-)?spec)\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  globalSetup: '<rootDir>/test/setup/wait-for-services.ts',
  // ✅ Load dotenv and our env defaults before tests
  setupFiles: ['dotenv/config', '<rootDir>/test/jest.env.ts'],
  clearMocks: true,
};

export default config;
