import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/redis'],
  testMatch: [
    '<rootDir>/test/redis/access-token-validation.service.spec.ts',
    '<rootDir>/test/redis/auth.service.security.spec.ts',
    '<rootDir>/test/redis/jwt-auth.guard.security.spec.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }] },
  setupFiles: ['dotenv/config', '<rootDir>/test/jest.env.ts'],
  clearMocks: true,
};

export default config;
