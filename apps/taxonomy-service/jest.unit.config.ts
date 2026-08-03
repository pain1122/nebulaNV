import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: [
    "<rootDir>/test/taxonomy.ensure-system.unit.spec.ts",
    "<rootDir>/test/taxonomy.http-validation.unit.spec.ts",
  ],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  setupFiles: ["dotenv/config", "<rootDir>/test/jest.env.ts"],
  clearMocks: true,
};

export default config;
