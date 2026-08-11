import {
  ApplicationRegistryConfigurationError,
  StaticApplicationRegistry,
} from "../src/application/application-registry";
import {
  TEST_APPLICATION_RECORDS,
  TEST_APPLICATION_REGISTRY_JSON,
} from "./application-fixture";

type MutableRecord = Record<string, unknown>;

function records(): MutableRecord[] {
  return JSON.parse(TEST_APPLICATION_REGISTRY_JSON) as MutableRecord[];
}

function expectInvalid(
  mutate: (value: MutableRecord[]) => void,
  nodeEnv = "test",
): void {
  const value = records();
  mutate(value);
  expect(() =>
    StaticApplicationRegistry.fromJson(JSON.stringify(value), { nodeEnv }),
  ).toThrow(ApplicationRegistryConfigurationError);
}

describe("static application registry", () => {
  it("resolves the configured BFF pair and mobile ID to fixed records", async () => {
    const registry = StaticApplicationRegistry.fromJson(
      TEST_APPLICATION_REGISTRY_JSON,
      { nodeEnv: "test" },
    );

    await expect(
      registry.resolve({
        clientId: "admin-web-local",
        origin: "http://localhost:3000",
      }),
    ).resolves.toMatchObject({
      applicationId: "admin-web-local",
      profile: "admin-web",
      tenantId: "single-site-tenant",
      siteId: "single-site",
      channelId: "admin-web",
    });
    await expect(
      registry.resolve({ clientId: "mobile-local" }),
    ).resolves.toMatchObject({
      applicationId: "mobile-local",
      profile: "mobile",
    });
  });

  it("denies copied IDs when their fixed profile/origin rules do not match", async () => {
    const registry = StaticApplicationRegistry.fromJson(
      TEST_APPLICATION_REGISTRY_JSON,
      { nodeEnv: "test" },
    );

    await expect(
      registry.resolve({
        clientId: "admin-web-local",
        origin: "http://localhost:3008",
      }),
    ).resolves.toBeNull();
    await expect(
      registry.resolve({ clientId: "admin-web-local" }),
    ).resolves.toBeNull();
    await expect(
      registry.resolve({
        clientId: "mobile-local",
        origin: "http://localhost:3000",
      }),
    ).resolves.toBeNull();
    await expect(
      registry.resolve({ clientId: "unknown-public-client" }),
    ).resolves.toBeNull();
  });

  it("returns isolated deeply frozen records and origin indexes", async () => {
    const registry = StaticApplicationRegistry.fromJson(
      TEST_APPLICATION_REGISTRY_JSON,
      { nodeEnv: "test" },
    );
    const admin = await registry.resolve({
      clientId: "admin-web-local",
      origin: "http://localhost:3000",
    });
    const storefront = await registry.resolve({
      clientId: "storefront-web-local",
      origin: "http://localhost:3008",
    });
    const origins = await registry.allowedBrowserOrigins();

    expect(Object.isFrozen(admin)).toBe(true);
    expect(Object.isFrozen(admin?.origins)).toBe(true);
    expect(Object.isFrozen(storefront)).toBe(true);
    expect(Object.isFrozen(origins)).toBe(true);
    expect(admin).not.toBe(storefront);
    expect(origins).toEqual(["http://localhost:3008", "http://localhost:3000"]);
    await expect(registry.readiness()).resolves.toBeUndefined();
  });

  it("normalizes a browser default port against an explicit registry port", async () => {
    const productionRecords = records();
    (productionRecords[0].origins as string[]) = [
      "https://storefront.example.test:443",
    ];
    (productionRecords[1].origins as string[]) = [
      "https://admin.example.test:443",
    ];
    const registry = StaticApplicationRegistry.fromJson(
      JSON.stringify(productionRecords),
      { nodeEnv: "production" },
    );

    await expect(
      registry.resolve({
        clientId: "admin-web-local",
        origin: "https://admin.example.test",
      }),
    ).resolves.toMatchObject({ applicationId: "admin-web-local" });
  });

  it("rejects malformed JSON and unknown record fields", () => {
    expect(() =>
      StaticApplicationRegistry.fromJson("not-json", { nodeEnv: "test" }),
    ).toThrow(ApplicationRegistryConfigurationError);
    expectInvalid((value) => {
      value[0].authoritativeTenantFromRequest = true;
    });
  });

  it("rejects duplicates, ambiguous origins, and cross-site records", () => {
    expectInvalid((value) => {
      value[1].clientId = value[0].clientId;
    });
    expectInvalid((value) => {
      value[1].applicationId = value[0].applicationId;
    });
    expectInvalid((value) => {
      value[1].origins = value[0].origins;
    });
    expectInvalid((value) => {
      value[1].siteId = "another-site";
    });
  });

  it("rejects missing/disabled required profiles and unknown rate profiles", () => {
    expectInvalid((value) => {
      value.pop();
    });
    expectInvalid((value) => {
      value[2].enabled = false;
    });
    expectInvalid((value) => {
      value[0].rateLimitProfile = "unconfigured";
    });
  });

  it("rejects unsafe IDs and invalid web/mobile origin shapes", () => {
    expectInvalid((value) => {
      value[0].tenantId = "unsafe tenant";
    });
    expectInvalid((value) => {
      value[0].origins = [];
    });
    expectInvalid((value) => {
      value[2].origins = ["http://localhost:3011"];
    });
    expectInvalid((value) => {
      value[0].origins = ["http://localhost:3008/"];
    });
  });

  it("fails closed on production fallback and non-HTTPS origins", () => {
    expectInvalid(() => undefined, "production");
    expect(TEST_APPLICATION_RECORDS).toHaveLength(3);
  });
});
