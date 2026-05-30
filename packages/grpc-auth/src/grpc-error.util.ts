import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException,
  NotImplementedException,
} from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { status } from "@grpc/grpc-js";

type RpcErrorLike = {
  code?: unknown;
  details?: unknown;
  message?: unknown;
};

function asRpcErrorLike(err: unknown): RpcErrorLike {
  return typeof err === "object" && err !== null ? (err as RpcErrorLike) : {};
}

function isGrpcStatus(code: unknown): code is status {
  return typeof code === "number" && code in status;
}

function errorMessage(err: RpcErrorLike): string {
  if (typeof err.details === "string") return err.details;
  if (typeof err.message === "string") return err.message;
  return "Unknown error";
}

export function toRpc(code: status, message: string): RpcException {
  return new RpcException({ code, message });
}

export function fromRpcToHttp(err: unknown): never {
  const rpcError = asRpcErrorLike(err);
  const code = isGrpcStatus(rpcError.code) ? rpcError.code : undefined;
  const message = errorMessage(rpcError);

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
