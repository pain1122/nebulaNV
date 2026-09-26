import "reflect-metadata";

import { status } from "@grpc/grpc-js";
import { BadRequestException, type ArgumentMetadata } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { createGrpcValidationPipe } from "@nebula/grpc-auth";
import { createHttpValidationPipe } from "@packages/config";
import { CreateProductDto } from "../src/product/dto/create-product.dto";
import { UpdateProductDto } from "../src/product/dto/update-product.dto";
import { CreateProductRequestDto } from "../src/product/dto/product-input.dto";

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
