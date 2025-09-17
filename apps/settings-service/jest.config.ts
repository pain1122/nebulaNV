import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Look for tests under this service only
  roots: ['<rootDir>/test'],
  testMatch: ['**/?(*.)+(spec|test).ts'],

  moduleFileExtensions: ['ts', 'js', 'json'],

  // Map "@/..." -> "src/..." if you ever use that alias
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.spec.ts',
  ],

  // ts-jest options
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    },
  },

  // Keep noise low / speed up watch mode
  watchPathIgnorePatterns: ['/dist/', '/node_modules/'],
};
export default config;
