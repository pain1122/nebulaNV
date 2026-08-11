import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    "^@nebula/grpc-auth$": "<rootDir>/../../packages/grpc-auth/index.ts",
    "^@packages/config$": "<rootDir>/../../packages/config/src/index.ts",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.spec.json" }],
  },
  clearMocks: true,
};

export default config;
