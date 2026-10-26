import "reflect-metadata";

import { status } from "@grpc/grpc-js";
import { BadRequestException, type ArgumentMetadata } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { createGrpcValidationPipe } from "@nebula/grpc-auth";
import { createHttpValidationPipe } from "@packages/config";
import { CreateProductDto } from "../src/product/dto/create-product.dto";
import { UpdateProductDto } from "../src/product/dto/update-product.dto";
import {
  CreateProductRequestDto,
  UpdateProductRequestDto,
} from "../src/product/dto/product-input.dto";

type RpcError = {
  code: number;
  message: string;
};

async function captureRpcError(promise: Promise<unknown>): Promise<RpcError> {
  try {
    await promise;
  } catch (error: unknown) {
    if (!(error instanceof RpcException)) throw error;
    return error.getError() as RpcError;
  }

  throw new Error("Expected an RpcException");
}

describe("product HTTP/gRPC validation parity", () => {
  const booleanFields = [
    "model3dLiveView",
    "vrEnabled",
    "noindex",
    "isFeatured",
    "promoActive",
    "discountActive",
  ] as const;

  it.each(["HTTP", "gRPC"])(
    "%s status-only patches preserve omitted booleans",
    async (boundary) => {
      const patch = { status: "ACTIVE" };
      const transformed = (await (boundary === "HTTP"
        ? createHttpValidationPipe().transform(
            { patch, expectedVersion: 1 },
            { type: "body", metatype: UpdateProductRequestDto },
          )
        : createGrpcValidationPipe().transform(
            {
              id: "da59cbd6-cc7e-4b4e-87b6-d1cd39b54498",
              data: patch,
              expectedVersion: 1,
            },
            { type: "body", metatype: UpdateProductDto },
          ))) as UpdateProductRequestDto;
      expect(transformed.patch.status).toBe("ACTIVE");
      for (const field of booleanFields) {
        expect(transformed.patch[field]).toBeUndefined();
      }
    },
  );

  it.each([
    ["HTTP", true],
    ["HTTP", false],
    ["gRPC", true],
    ["gRPC", false],
  ] as const)(
    "%s patches retain explicitly supplied boolean %s",
    async (boundary, value) => {
      const patch = Object.fromEntries(
        booleanFields.map((field) => [field, value]),
      );
      const transformed = (await (boundary === "HTTP"
        ? createHttpValidationPipe().transform(
            { patch, expectedVersion: 1 },
            { type: "body", metatype: UpdateProductRequestDto },
          )
        : createGrpcValidationPipe().transform(
            {
              id: "da59cbd6-cc7e-4b4e-87b6-d1cd39b54498",
              data: patch,
              expectedVersion: 1,
            },
            { type: "body", metatype: UpdateProductDto },
          ))) as UpdateProductRequestDto;
      for (const field of booleanFields) {
        expect(transformed.patch[field]).toBe(value);
      }
    },
  );

  const grpcMetadata: ArgumentMetadata = {
    type: "body",
    metatype: CreateProductDto,
  };
  const httpMetadata: ArgumentMetadata = {
    type: "body",
    metatype: CreateProductRequestDto,
  };

  it("preserves explicit nested transforms in both transports", async () => {
    const input = {
      data: {
        title: "Chair",
        price: "19.95",
      },
    };

    const http: unknown = await createHttpValidationPipe().transform(
      input,
      httpMetadata,
    );
    const grpc: unknown = await createGrpcValidationPipe().transform(
      input,
      grpcMetadata,
    );

    expect(grpc).toMatchObject(http as object);
    expect(grpc).toMatchObject({ data: { price: 19.95 } });
  });

  it("accepts a stock-only gRPC patch with an explicit zero quantity", async () => {
    const updateMetadata: ArgumentMetadata = {
      type: "body",
      metatype: UpdateProductDto,
    };

    const result: unknown = await createGrpcValidationPipe().transform(
      {
        id: "da59cbd6-cc7e-4b4e-87b6-d1cd39b54498",
        data: { stockQuantity: 0 },
        expectedVersion: 1,
      },
      updateMetadata,
    );

    expect(result).toMatchObject({
      id: "da59cbd6-cc7e-4b4e-87b6-d1cd39b54498",
      patch: { stockQuantity: 0 },
      expectedVersion: 1,
    });
  });

  it.each(["model3dUrl", "model3dPosterUrl", "vrPlanImageUrl"])(
    "rejects disabled %s on HTTP and gRPC create and patch",
    async (field) => {
      const data = {
        title: "Chair",
        price: 19.95,
        [field]: "https://provider.test/asset",
      };
      await expect(
        createHttpValidationPipe().transform({ data }, httpMetadata),
      ).rejects.toBeInstanceOf(BadRequestException);
      const createError = await captureRpcError(
        createGrpcValidationPipe().transform({ data }, grpcMetadata),
      );
      expect(createError.code).toBe(status.INVALID_ARGUMENT);
      const patch = { [field]: "https://provider.test/asset" };
      await expect(
        createHttpValidationPipe().transform(
          { patch, expectedVersion: 1 },
          { type: "body", metatype: UpdateProductRequestDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      const patchError = await captureRpcError(
        createGrpcValidationPipe().transform(
          {
            id: "da59cbd6-cc7e-4b4e-87b6-d1cd39b54498",
            data: patch,
            expectedVersion: 1,
          },
          { type: "body", metatype: UpdateProductDto },
        ),
      );
      expect(patchError.code).toBe(status.INVALID_ARGUMENT);
    },
  );

  it.each([
    ["missing wrapper", {}],
    ["missing nested field", { data: { price: 19.95 } }],
    ["unknown nested field", { data: { title: "Chair", role: "root-admin" } }],
  ])("rejects %s with transport-correct errors", async (_case, input) => {
    await expect(
      createHttpValidationPipe().transform(input, httpMetadata),
    ).rejects.toBeInstanceOf(BadRequestException);

    const error = await captureRpcError(
      createGrpcValidationPipe().transform(input, grpcMetadata),
    );
    expect(error.code).toBe(status.INVALID_ARGUMENT);
    expect(error.message).toMatch(/^validation_failed:/);
  });
});
