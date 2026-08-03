import "reflect-metadata";

import {
  BadRequestException,
  type ArgumentMetadata,
  ValidationPipe,
} from "@nestjs/common";
import { createHttpValidationPipe } from "@packages/config";
import {
  AddToCartDto,
  OrderStatusDto,
  UpdateOrderStatusDto,
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

  it("validates the status through a runtime DTO", async () => {
    const result = await transformBoth(
      { status: OrderStatusDto.PAID },
      statusMetadata,
    );

    expect(result.shared).toEqual(result.current);
    expect(result.shared).toBeInstanceOf(UpdateOrderStatusDto);
  });

  it("rejects invalid or unknown status fields", async () => {
    await bothReject({ status: "NOT_A_STATUS" }, statusMetadata);
    await bothReject(
      {
        status: OrderStatusDto.PAID,
        role: "root-admin",
      },
      statusMetadata,
    );
  });
});
