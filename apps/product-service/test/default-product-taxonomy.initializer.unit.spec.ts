import { Metadata } from "@grpc/grpc-js";
import { Logger } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import { DefaultProductTaxonomyInitializer } from "../src/default-product-taxonomy.initializer";

const previousServiceName = process.env.SVC_NAME;
const previousOutboundKeys = process.env.S2S_OUTBOUND_KEYS;

describe("DefaultProductTaxonomyInitializer", () => {
  let taxonomyRpc: jest.Mock;
  let settingsRpc: jest.Mock;
  let initializer: DefaultProductTaxonomyInitializer;
  let loggerError: jest.SpyInstance;
  let loggerWarn: jest.SpyInstance;

  beforeAll(() => {
    process.env.SVC_NAME = "product-service";
    process.env.S2S_OUTBOUND_KEYS = JSON.stringify({
      "taxonomy-service": {
        id: "product-taxonomy-test-v1",
        secret: "test-product-to-taxonomy-key-000000000001",
      },
      "settings-service": {
        id: "product-settings-test-v1",
        secret: "test-product-to-settings-key-000000000001",
      },
    });
  });

  afterAll(() => {
    if (previousServiceName === undefined) {
      delete process.env.SVC_NAME;
    } else {
      process.env.SVC_NAME = previousServiceName;
    }

    if (previousOutboundKeys === undefined) {
      delete process.env.S2S_OUTBOUND_KEYS;
    } else {
      process.env.S2S_OUTBOUND_KEYS = previousOutboundKeys;
    }
  });

  beforeEach(() => {
    taxonomyRpc = jest.fn().mockReturnValue(
      of({
        data: { id: "category-id" },
      }),
    );

    settingsRpc = jest.fn().mockReturnValue(
      of({
        value: "category-id",
      }),
    );

    const taxonomyClient = {
      getService: jest.fn().mockReturnValue({
        EnsureSystemTaxonomy: taxonomyRpc,
      }),
    } as unknown as ClientGrpc;

    const settingsClient = {
      getService: jest.fn().mockReturnValue({
        EnsureBootstrapString: settingsRpc,
      }),
    } as unknown as ClientGrpc;

    jest.spyOn(Logger.prototype, "log").mockImplementation();
    loggerError = jest.spyOn(Logger.prototype, "error").mockImplementation();
    loggerWarn = jest.spyOn(Logger.prototype, "warn").mockImplementation();

    initializer = new DefaultProductTaxonomyInitializer(
      taxonomyClient,
      settingsClient,
    );
  });

  afterEach(() => {
    initializer.onModuleDestroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("uses the real typed adapters in the correct order", async () => {
    await initializer.onModuleInit();

    expect(taxonomyRpc).toHaveBeenCalledWith(
      {
        scope: "product",
        kind: "category.default",
        slug: "uncategorized",
        title: expect.any(String),
        description: expect.any(String),
      },
      expect.any(Metadata),
    );

    expect(settingsRpc).toHaveBeenCalledWith(
      {
        namespace: "product",
        environment: "default",
        key: "default_product_category",
        value: "category-id",
      },
      expect.any(Metadata),
    );

    expect(taxonomyRpc.mock.invocationCallOrder[0]).toBeLessThan(
      settingsRpc.mock.invocationCallOrder[0],
    );
    expect(loggerError).not.toHaveBeenCalled();
    expect(loggerWarn).not.toHaveBeenCalled();
    expect(() => initializer.checkReadiness()).not.toThrow();
  });

  it("degrades readiness and schedules a sanitized retry after failure", async () => {
    jest.useFakeTimers();
    settingsRpc.mockReturnValue(
      throwError(() => new Error("settings_password_canary")),
    );

    await expect(initializer.onModuleInit()).resolves.toBeUndefined();

    expect(() => initializer.checkReadiness()).toThrow(
      "default_product_taxonomy_not_ready",
    );
    expect(loggerWarn).toHaveBeenCalledWith(
      "default_product_taxonomy_initialization_deferred attempt=1 retryInMs=1000 cause=Error",
    );
    expect(loggerWarn.mock.calls.flat().join(" ")).not.toContain(
      "settings_password_canary",
    );
    expect(jest.getTimerCount()).toBe(1);
    expect(loggerError).not.toHaveBeenCalled();
  });

  it("recovers after a dependency becomes available", async () => {
    jest.useFakeTimers();
    settingsRpc
      .mockReturnValueOnce(
        throwError(() => new Error("settings temporarily unavailable")),
      )
      .mockReturnValue(
        of({
          value: "category-id",
        }),
      );

    await initializer.onModuleInit();
    expect(() => initializer.checkReadiness()).toThrow();

    await jest.advanceTimersByTimeAsync(1_000);

    expect(taxonomyRpc).toHaveBeenCalledTimes(2);
    expect(settingsRpc).toHaveBeenCalledTimes(2);
    expect(() => initializer.checkReadiness()).not.toThrow();
    expect(loggerError).not.toHaveBeenCalled();
  });

  it("does not duplicate concurrent initialization work", async () => {
    await Promise.all([
      initializer.onModuleInit(),
      initializer.onModuleInit(),
      initializer.onModuleInit(),
    ]);

    expect(taxonomyRpc).toHaveBeenCalledTimes(1);
    expect(settingsRpc).toHaveBeenCalledTimes(1);
  });
});
