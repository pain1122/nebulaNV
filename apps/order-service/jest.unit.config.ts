import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: [
    "<rootDir>/test/demo-payment.unit.spec.ts",
    "<rootDir>/test/order-cancellation.unit.spec.ts",
    "<rootDir>/test/order-status.unit.spec.ts",
    "<rootDir>/test/order-admin-read.unit.spec.ts",
    "<rootDir>/test/resource-authorization.spec.ts",
    "<rootDir>/test/order.http-validation.unit.spec.ts",
    "<rootDir>/test/order.error-translation.unit.spec.ts",
    "<rootDir>/test/cart-contract.unit.spec.ts",
    "<rootDir>/test/cart-mutations.unit.spec.ts",
    "<rootDir>/test/checkout.unit.spec.ts",
    "<rootDir>/test/checkout-coordinator.unit.spec.ts",
    "<rootDir>/test/checkout-recovery.unit.spec.ts",
  ],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  setupFiles: ["dotenv/config", "<rootDir>/test/jest.env.ts"],
  clearMocks: true,
};

export default config;
