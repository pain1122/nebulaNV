import "reflect-metadata";

import { status } from "@grpc/grpc-js";
import { BadRequestException, type ArgumentMetadata } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { createGrpcValidationPipe } from "@nebula/grpc-auth";
import { createHttpValidationPipe } from "@packages/config";
import {
  CreatePostDto,
  CreatePostRequestDto,
  UpdatePostDto,
  UpdatePostGrpcRequestDto,
} from "../src/blog/dto/post.dto";

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

describe("blog HTTP/gRPC validation parity", () => {
  const createMetadata: ArgumentMetadata = {
    type: "body",
    metatype: CreatePostRequestDto,
  };

  it("materializes the existing nested DTO for both transports", async () => {
    const input = {
      data: {
        title: "Release notes",
        body: "The release is ready.",
      },
    };

    const http = (await createHttpValidationPipe().transform(
      input,
      createMetadata,
    )) as CreatePostRequestDto;
    const grpc = (await createGrpcValidationPipe().transform(
      input,
      createMetadata,
    )) as CreatePostRequestDto;

    expect(http.data).toBeInstanceOf(CreatePostDto);
    expect(grpc.data).toBeInstanceOf(CreatePostDto);
    expect(grpc).toEqual(http);
  });

  it.each([
    ["missing wrapper", {}],
    ["missing nested field", { data: { title: "Release notes" } }],
    [
      "unknown nested field",
      {
        data: {
          title: "Release notes",
          body: "The release is ready.",
          role: "root-admin",
        },
      },
    ],
  ])("rejects %s with transport-correct errors", async (_case, input) => {
    await expect(
      createHttpValidationPipe().transform(input, createMetadata),
    ).rejects.toBeInstanceOf(BadRequestException);

    const error = await captureRpcError(
      createGrpcValidationPipe().transform(input, createMetadata),
    );
    expect(error.code).toBe(status.INVALID_ARGUMENT);
    expect(error.message).toMatch(/^validation_failed:/);
  });

  it("validates the gRPC update id and nested patch", async () => {
    const metadata: ArgumentMetadata = {
      type: "body",
      metatype: UpdatePostGrpcRequestDto,
    };
    const valid = (await createGrpcValidationPipe().transform(
      {
        id: "451c1290-8074-4fca-b748-4116592e7875",
        patch: { title: "Updated title" },
      },
      metadata,
    )) as UpdatePostGrpcRequestDto;

    expect(valid.patch).toBeInstanceOf(UpdatePostDto);

    const error = await captureRpcError(
      createGrpcValidationPipe().transform(
        {
          id: "not-a-uuid",
          patch: {
            title: "Updated title",
            role: "root-admin",
          },
        },
        metadata,
      ),
    );
    expect(error).toEqual({
      code: status.INVALID_ARGUMENT,
      message: "validation_failed:id,patch.role",
    });
  });
});
