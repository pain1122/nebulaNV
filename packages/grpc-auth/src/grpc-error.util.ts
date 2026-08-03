import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException,
  NotImplementedException,
} from "@nestjs/common";
import { BaseRpcExceptionFilter, RpcException } from "@nestjs/microservices";
import { status } from "@grpc/grpc-js";
import type { Observable } from "rxjs";

type RpcErrorLike = {
  code?: unknown;
  details?: unknown;
  message?: unknown;
};

type GrpcValidationIssue = {
  property?: string;
  constraints?: Record<string, string>;
  children?: GrpcValidationIssue[];
};

function validationPaths(
  issues: readonly GrpcValidationIssue[],
  parent = "",
): string[] {
  return issues.flatMap((issue) => {
    const property = issue.property?.trim();
    const path = property
      ? parent
        ? `${parent}.${property}`
        : property
      : parent;
    const own = issue.constraints && path ? [path] : [];
    return [...own, ...validationPaths(issue.children ?? [], path)];
  });
}

/** Convert class-validator failures into a safe, correctly typed gRPC error. */
export function grpcValidationException(
  issues: readonly GrpcValidationIssue[],
): RpcException {
  const fields = [...new Set(validationPaths(issues))].sort();
  const message = fields.length
    ? `validation_failed:${fields.join(",")}`
    : "validation_failed";
  return toRpc(status.INVALID_ARGUMENT, message);
}

function asRpcErrorLike(err: unknown): RpcErrorLike {
  return typeof err === "object" && err !== null ? (err as RpcErrorLike) : {};
}

function isGrpcStatus(code: unknown): code is status {
  return typeof code === "number" && code in status;
}

function errorMessage(err: RpcErrorLike): string {
  if (typeof err.details === "string") return err.details;
  if (typeof err.message === "string") return err.message;
  return "internal_error";
}

function httpExceptionMessage(err: HttpException): string {
  const response = err.getResponse();
  if (typeof response === "string") return response;

  const message = (response as { message?: unknown }).message;
  if (typeof message === "string") return message;
  if (
    Array.isArray(message) &&
    message.length > 0 &&
    message.every((item): item is string => typeof item === "string")
  ) {
    return message.join(",");
  }

  return err.message || "internal_error";
}

function httpStatusToGrpc(code: number): status {
  const httpStatus = code as HttpStatus;

  switch (httpStatus) {
    case HttpStatus.BAD_REQUEST:
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return status.INVALID_ARGUMENT;

    case HttpStatus.UNAUTHORIZED:
      return status.UNAUTHENTICATED;

    case HttpStatus.FORBIDDEN:
      return status.PERMISSION_DENIED;

    case HttpStatus.NOT_FOUND:
      return status.NOT_FOUND;

    case HttpStatus.REQUEST_TIMEOUT:
      return status.DEADLINE_EXCEEDED;

    case HttpStatus.CONFLICT:
      return status.ALREADY_EXISTS;

    case HttpStatus.TOO_MANY_REQUESTS:
      return status.RESOURCE_EXHAUSTED;

    case HttpStatus.NOT_IMPLEMENTED:
      return status.UNIMPLEMENTED;

    case HttpStatus.SERVICE_UNAVAILABLE:
      return status.UNAVAILABLE;

    default:
      return status.INTERNAL;
  }
}

export function toRpc(code: status, message: string): RpcException {
  return new RpcException({ code, message });
}

/**
 * Translate errors only at the gRPC transport boundary.
 *
 * Explicit RPC errors from guards, validation, and controllers retain their
 * exact status/message. Domain-owned HTTP exceptions receive the matching
 * transport status. Unknown failures never expose their original message.
 */
export function toGrpcBoundaryException(err: unknown): RpcException {
  if (err instanceof RpcException) return err;

  if (err instanceof HttpException) {
    const code = httpStatusToGrpc(err.getStatus());
    const message =
      code === status.INTERNAL ? "internal_error" : httpExceptionMessage(err);
    return toRpc(code, message);
  }

  return toRpc(status.INTERNAL, "internal_error");
}

@Catch()
export class GrpcErrorFilter extends BaseRpcExceptionFilter<unknown, unknown> {
  private static readonly boundaryLogger = new Logger(GrpcErrorFilter.name);

  override catch(exception: unknown, host: ArgumentsHost): Observable<unknown> {
    if (
      !(exception instanceof RpcException) &&
      !(exception instanceof HttpException)
    ) {
      GrpcErrorFilter.boundaryLogger.error("grpc_boundary_unknown_error");
    }

    return super.catch(toGrpcBoundaryException(exception), host);
  }
}

export function fromRpcToHttp(err: unknown): never {
  const rpcError = asRpcErrorLike(err);
  const code = isGrpcStatus(rpcError.code) ? rpcError.code : undefined;
  const message =
    code === undefined ||
    code === status.UNKNOWN ||
    code === status.INTERNAL ||
    code === status.DATA_LOSS
      ? "internal_error"
      : errorMessage(rpcError);

  switch (code) {
    case status.INVALID_ARGUMENT:
    case status.FAILED_PRECONDITION:
    case status.OUT_OF_RANGE:
      throw new BadRequestException(message);

    case status.ALREADY_EXISTS:
    case status.ABORTED:
      throw new ConflictException(message);

    case status.UNAUTHENTICATED:
      throw new UnauthorizedException(message);

    case status.PERMISSION_DENIED:
      throw new ForbiddenException(message);

    case status.NOT_FOUND:
      throw new NotFoundException(message);

    case status.UNIMPLEMENTED:
      throw new NotImplementedException(message);

    case status.RESOURCE_EXHAUSTED:
      // 429 Too Many Requests
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);

    case status.DEADLINE_EXCEEDED:
    case status.CANCELLED:
      throw new RequestTimeoutException(message);

    case status.UNAVAILABLE:
      throw new ServiceUnavailableException(message);

    case status.UNKNOWN:
    case status.INTERNAL:
    case status.DATA_LOSS:
    default:
      throw new InternalServerErrorException(message);
  }
}

export async function wrapGrpc<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (err: unknown) {
    fromRpcToHttp(err);
  }
}
