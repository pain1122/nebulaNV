import "reflect-metadata";

import {
  BadRequestException,
  type ArgumentMetadata,
  ValidationPipe,
} from "@nestjs/common";
import { createHttpValidationPipe } from "@packages/config";
import {
  AddToCartDto,
  CheckoutDto,
  OrderStatusDto,
  UpdateOrderStatusDto,
  StartDemoPaymentDto,
  ResolveDemoPaymentDto,
} from "../src/order/dto/order.dto";

function createCurrentOrderPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
}

async function transformBoth(
  value: unknown,
  metadata: ArgumentMetadata,
): Promise<{ current: unknown; shared: unknown }> {
  const current: unknown = await createCurrentOrderPipe().transform(
    value,
    metadata,
  );
  const shared: unknown = await createHttpValidationPipe().transform(
    value,
    metadata,
  );
  return { current, shared };
}

async function bothReject(
  value: unknown,
  metadata: ArgumentMetadata,
): Promise<void> {
  await expect(
    createCurrentOrderPipe().transform(value, metadata),
  ).rejects.toBeInstanceOf(BadRequestException);
  await expect(
    createHttpValidationPipe().transform(value, metadata),
  ).rejects.toBeInstanceOf(BadRequestException);
}

describe("order HTTP validation migration", () => {
  it("requires bounded demo versions and an explicit outcome without caller authority", async () => {
    for (const [metatype, maximum, extra] of [
      [StartDemoPaymentDto, 2147483645, {}],
      [ResolveDemoPaymentDto, 2147483646, { outcome: "UNKNOWN" }],
    ] as const) {
      const metadata: ArgumentMetadata = { type: "body", metatype };
      const valid = { ...extra, expectedVersion: maximum };
      expect((await transformBoth(valid, metadata)).shared).toEqual(valid);
      for (const expectedVersion of [
        undefined,
        null,
        0,
        -1,
        "1",
        1.5,
        maximum + 1,
      ])
        await bothReject({ ...extra, expectedVersion }, metadata);
      for (const field of [
        "userId",
        "role",
        "attemptId",
        "idempotencyKey",
        "amount",
        "currency",
        "status",
      ])
        await bothReject({ ...valid, [field]: "forged" }, metadata);
    }
    for (const outcome of [undefined, null, "", "PAID", "succeeded"])
      await bothReject(
        { expectedVersion: 1, outcome },
        { type: "body", metatype: ResolveDemoPaymentDto },
      );
    for (const outcome of ["SUCCEEDED", "FAILED", "CANCELLED", "UNKNOWN"])
      expect(
        (
          await transformBoth(
            { expectedVersion: 1, outcome },
            { type: "body", metatype: ResolveDemoPaymentDto },
          )
        ).shared,
      ).toMatchObject({ outcome });
  });
  it("preserves optional null notes while rejecting body-supplied checkout key/owner", async () => {
    const metadata: ArgumentMetadata = { type: "body", metatype: CheckoutDto };
    expect(await transformBoth({ note: null }, metadata)).toEqual({
      current: { note: null },
      shared: { note: null },
    });
    await bothReject(
      { note: "demo", idempotencyKey: "checkout-key-in-body" },
      metadata,
    );
    await bothReject({ note: "demo", userId: "forged-owner" }, metadata);
  });
  const cartMetadata: ArgumentMetadata = {
    type: "body",
    metatype: AddToCartDto,
  };
  const statusMetadata: ArgumentMetadata = {
    type: "body",
    metatype: UpdateOrderStatusDto,
  };

  it("preserves valid cart input", async () => {
    const result = await transformBoth(
      {
        productId: "451c1290-8074-4fca-b748-4116592e7875",
        quantity: 2,
      },
      cartMetadata,
    );

    expect(result.shared).toEqual(result.current);
    expect(result.shared).toBeInstanceOf(AddToCartDto);
  });

  it("preserves missing and unknown cart-field rejection", async () => {
    await bothReject(
      {
        productId: "451c1290-8074-4fca-b748-4116592e7875",
      },
      cartMetadata,
    );
    await bothReject(
      {
        productId: "451c1290-8074-4fca-b748-4116592e7875",
        quantity: 2,
        role: "root-admin",
      },
      cartMetadata,
    );
  });

  it("accepts variant identity and rejects null, overflow and caller price", async () => {
    const input = {
      productId: "451c1290-8074-4fca-b748-4116592e7875",
      variantId: "8e2df5b8-f116-4fc8-b229-84abdf9a1830",
      quantity: 1,
    };
    const valid = await transformBoth(input, cartMetadata);
    expect(valid.shared).toEqual(valid.current);
    await bothReject({ ...input, variantId: null }, cartMetadata);
    await bothReject({ ...input, quantity: 2147483648 }, cartMetadata);
    await bothReject({ ...input, unitPrice: "0.00" }, cartMetadata);
  });

  it("validates the status through a runtime DTO", async () => {
    const result = await transformBoth(
      { status: OrderStatusDto.PAID, expectedVersion: 1 },
      statusMetadata,
    );

    expect(result.shared).toEqual(result.current);
    expect(result.shared).toBeInstanceOf(UpdateOrderStatusDto);
  });

  it("rejects invalid or unknown status fields", async () => {
    await bothReject(
      { status: "NOT_A_STATUS", expectedVersion: 1 },
      statusMetadata,
    );
    await bothReject(
      {
        status: OrderStatusDto.PAID,
        expectedVersion: 1,
        role: "root-admin",
      },
      statusMetadata,
    );
  });

  it("accepts PAYMENT_PROCESSING while retaining strict enum validation", async () => {
    const result = await transformBoth(
      { status: OrderStatusDto.PAYMENT_PROCESSING, expectedVersion: 1 },
      statusMetadata,
    );
    expect(result.shared).toEqual(result.current);
    expect(result.shared).toMatchObject({ status: "PAYMENT_PROCESSING" });
    await bothReject(
      { status: "IN_PAYMENT_PROCESS", expectedVersion: 1 },
      statusMetadata,
    );
  });
  it.each([undefined, null, 0, -1, "1", 1.5, 2147483647])(
    "rejects invalid or absent status version %j",
    async (expectedVersion) => {
      await bothReject({ status: "PAID", expectedVersion }, statusMetadata);
    },
  );
});
