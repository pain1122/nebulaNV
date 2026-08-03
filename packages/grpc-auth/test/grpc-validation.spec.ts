import "reflect-metadata";

import { status } from "@grpc/grpc-js";
import { Type } from "class-transformer";
import { IsInt, IsString } from "class-validator";
import { RpcException } from "@nestjs/microservices";
import { createGrpcValidationPipe } from "../src/grpc-validation";

type RpcError = {
  code: number;
  message: string;
};

class ValidatedGrpcRequest {
  @IsString()
  title!: string;

  @Type(() => Number)
  @IsInt()
  page!: number;
}

class NoImplicitTransformRequest {
  @IsInt()
  count!: number;
}

async function captureRpcError(promise: Promise<unknown>): Promise<RpcError> {
  try {
    await promise;
  } catch (error: unknown) {
    if (!(error instanceof RpcException)) throw error;
    return error.getError() as RpcError;
  }

  throw new Error("Expected an RpcException");
}

describe("createGrpcValidationPipe", () => {
  it("accepts a valid typed proto request", async () => {
    const result = await createGrpcValidationPipe().transform(
      { title: "example", page: 2 },
      { type: "body", metatype: ValidatedGrpcRequest },
    );

    expect(result).toBeInstanceOf(ValidatedGrpcRequest);
    expect(result).toEqual({ title: "example", page: 2 });
  });

  it("maps a missing required field to INVALID_ARGUMENT", async () => {
    const error = await captureRpcError(
      createGrpcValidationPipe().transform(
        { page: 2 },
        { type: "body", metatype: ValidatedGrpcRequest },
      ),
    );

    expect(error).toEqual({
      code: status.INVALID_ARGUMENT,
      message: "validation_failed:title",
    });
  });

  it("maps an unknown field to INVALID_ARGUMENT", async () => {
    const error = await captureRpcError(
      createGrpcValidationPipe().transform(
        { title: "example", page: 2, extra: "not-allowed" },
        { type: "body", metatype: ValidatedGrpcRequest },
      ),
    );

    expect(error).toEqual({
      code: status.INVALID_ARGUMENT,
      message: "validation_failed:extra",
    });
  });

  it("does not infer conversions for proto request values", async () => {
    const error = await captureRpcError(
      createGrpcValidationPipe().transform(
        { count: "2" },
        { type: "body", metatype: NoImplicitTransformRequest },
      ),
    );

    expect(error).toEqual({
      code: status.INVALID_ARGUMENT,
      message: "validation_failed:count",
    });
  });

  it("does not pretend generated TypeScript interfaces have runtime validation", async () => {
    const request = {
      id: "generated-interface-id",
      extra: "not-runtime-validatable",
    };

    const result = await createGrpcValidationPipe().transform(request, {
      type: "body",
      metatype: Object,
    });

    expect(result).toBe(request);
  });
});
