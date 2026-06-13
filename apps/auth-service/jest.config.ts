export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: [
    '<rootDir>/test/**/*.spec.ts',
    '!<rootDir>/test/**/*.e2e.spec.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  setupFiles: ['dotenv/config', '<rootDir>/test/jest.env.ts'],
};
