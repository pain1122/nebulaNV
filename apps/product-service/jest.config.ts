import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  watchPathIgnorePatterns: ['/dist/', '/node_modules/'],
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  setupFiles: ['dotenv/config', '<rootDir>/test/jest.env.ts'],
  globalSetup: '<rootDir>/test/setup/wait-for-services.ts',
};

export default config;
