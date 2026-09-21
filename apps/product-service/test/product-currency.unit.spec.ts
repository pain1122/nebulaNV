import { status } from "@grpc/grpc-js";
import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import type { PrismaService } from "../src/prisma.service";
import { ProductServiceImpl } from "../src/product/product.service";

const previousServiceName = process.env.SVC_NAME;
const previousOutboundKeys = process.env.S2S_OUTBOUND_KEYS;

type CurrencyResolver = {
  resolveProductCurrency(requested: string | undefined): Promise<string>;
};

function client(service: object): ClientGrpc {
  return {
    getService: jest.fn().mockReturnValue(service),
  } as unknown as ClientGrpc;
}

function service(settingsRpc: jest.Mock): ProductServiceImpl {
  const prisma = {} as PrismaService;
  return new ProductServiceImpl(
    prisma,
    client({}),
    client({ GetString: settingsRpc }),
  );
}

function resolver(settingsRpc: jest.Mock): CurrencyResolver {
  return service(settingsRpc) as unknown as CurrencyResolver;
}

describe("product shop-currency authority", () => {
  beforeAll(() => {
    process.env.SVC_NAME = "product-service";
    process.env.S2S_OUTBOUND_KEYS = JSON.stringify({
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

  it("uses the canonical Settings value when the caller omits currency", async () => {
    const getString = jest
      .fn()
      .mockReturnValue(of({ value: " usd ", found: true }));

    await expect(
      resolver(getString).resolveProductCurrency(undefined),
    ).resolves.toBe("USD");
    expect(getString).toHaveBeenCalledWith(
      {
        namespace: "pricing",
        environment: "default",
        key: "default_currency",
      },
      expect.anything(),
    );
  });

  it("accepts a matching caller value and returns its canonical form", async () => {
    const getString = jest
      .fn()
      .mockReturnValue(of({ value: "USD", found: true }));

    await expect(
      resolver(getString).resolveProductCurrency(" usd "),
    ).resolves.toBe("USD");
  });

  it("rejects malformed currency before calling Settings", async () => {
    const getString = jest.fn();

    await expect(
      resolver(getString).resolveProductCurrency("US-1"),
    ).rejects.toEqual(new BadRequestException("currency_invalid"));
    expect(getString).not.toHaveBeenCalled();
  });

  it("rejects a currency that contradicts the configured shop currency", async () => {
    const getString = jest
      .fn()
      .mockReturnValue(of({ value: "USD", found: true }));

    await expect(
      resolver(getString).resolveProductCurrency("EUR"),
    ).rejects.toEqual(new BadRequestException("product_currency_mismatch"));
  });

  it.each([
    { value: "", found: false },
    { value: "US-1", found: true },
  ])(
    "fails closed for a missing or invalid Settings value",
    async (response) => {
      const getString = jest.fn().mockReturnValue(of(response));

      await expect(
        resolver(getString).resolveProductCurrency(undefined),
      ).rejects.toEqual(
        new ServiceUnavailableException("shop_currency_not_configured"),
      );
    },
  );

  it("does not cache a fallback after a transient Settings failure", async () => {
    const getString = jest
      .fn()
      .mockReturnValueOnce(
        throwError(() => ({
          code: status.UNAVAILABLE,
          details: "settings_unavailable",
        })),
      )
      .mockReturnValueOnce(of({ value: "EUR", found: true }));
    const currency = resolver(getString);

    await expect(
      currency.resolveProductCurrency(undefined),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(currency.resolveProductCurrency(undefined)).resolves.toBe(
      "EUR",
    );
    expect(getString).toHaveBeenCalledTimes(2);
  });
});
