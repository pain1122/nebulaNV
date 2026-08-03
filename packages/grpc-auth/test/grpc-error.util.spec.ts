import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  NotImplementedException,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { status } from "@grpc/grpc-js";
import { RpcException } from "@nestjs/microservices";
import {
  fromRpcToHttp,
  toGrpcBoundaryException,
  toRpc,
} from "../src/grpc-error.util";

type RpcError = {
  code: status;
  message: string;
};

function rpcError(exception: RpcException): RpcError {
  return exception.getError() as RpcError;
}

describe("gRPC error translation", () => {
  it("preserves explicit RpcException values", () => {
    const original = toRpc(status.PERMISSION_DENIED, "scope_not_allowed");

    expect(toGrpcBoundaryException(original)).toBe(original);
  });

  it.each([
    {
      label: "bad request",
      exception: new BadRequestException("invalid_input"),
      code: status.INVALID_ARGUMENT,
    },
    {
      label: "unauthorized",
      exception: new UnauthorizedException("token_required"),
      code: status.UNAUTHENTICATED,
    },
    {
      label: "forbidden",
      exception: new ForbiddenException("scope_not_allowed"),
      code: status.PERMISSION_DENIED,
    },
    {
      label: "not found",
      exception: new NotFoundException("taxonomy_not_found"),
      code: status.NOT_FOUND,
    },
    {
      label: "request timeout",
      exception: new RequestTimeoutException("request_timed_out"),
      code: status.DEADLINE_EXCEEDED,
    },
    {
      label: "conflict",
      exception: new ConflictException("duplicate_slug"),
      code: status.ALREADY_EXISTS,
    },
    {
      label: "rate limit",
      exception: new HttpException(
        "rate_limited",
        HttpStatus.TOO_MANY_REQUESTS,
      ),
      code: status.RESOURCE_EXHAUSTED,
    },
    {
      label: "not implemented",
      exception: new NotImplementedException("not_implemented"),
      code: status.UNIMPLEMENTED,
    },
    {
      label: "service unavailable",
      exception: new ServiceUnavailableException("dependency_down"),
      code: status.UNAVAILABLE,
    },
  ])("maps $label to its canonical gRPC status", ({ exception, code }) => {
    expect(rpcError(toGrpcBoundaryException(exception))).toEqual({
      code,
      message: exception.message,
    });
  });

  it("does not expose unexpected error messages", () => {
    expect(
      rpcError(
        toGrpcBoundaryException(new Error("database connection secret")),
      ),
    ).toEqual({
      code: status.INTERNAL,
      message: "internal_error",
    });
  });

  it("does not expose explicit internal HTTP error messages", () => {
    expect(
      rpcError(
        toGrpcBoundaryException(
          new InternalServerErrorException("database connection secret"),
        ),
      ),
    ).toEqual({
      code: status.INTERNAL,
      message: "internal_error",
    });
  });

  it.each([
    [status.INVALID_ARGUMENT, HttpStatus.BAD_REQUEST],
    [status.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED],
    [status.PERMISSION_DENIED, HttpStatus.FORBIDDEN],
    [status.NOT_FOUND, HttpStatus.NOT_FOUND],
    [status.DEADLINE_EXCEEDED, HttpStatus.REQUEST_TIMEOUT],
    [status.ALREADY_EXISTS, HttpStatus.CONFLICT],
    [status.RESOURCE_EXHAUSTED, HttpStatus.TOO_MANY_REQUESTS],
    [status.UNIMPLEMENTED, HttpStatus.NOT_IMPLEMENTED],
    [status.UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE],
    [status.INTERNAL, HttpStatus.INTERNAL_SERVER_ERROR],
  ])("maps gRPC status %s back to HTTP status %s", (code, httpStatus) => {
    try {
      fromRpcToHttp({
        code,
        details:
          code === status.INTERNAL
            ? "database connection secret"
            : "public_error",
      });
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(httpStatus);
      expect((error as HttpException).message).toBe(
        code === status.INTERNAL ? "internal_error" : "public_error",
      );
      return;
    }

    throw new Error("Expected an HttpException");
  });
});
