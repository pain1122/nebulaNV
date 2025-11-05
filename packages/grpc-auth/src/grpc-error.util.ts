import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException,
  NotImplementedException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';

export function toRpc(code: status, message: string) {
  return new RpcException({ code, message });
}

export function fromRpcToHttp(err: any): never {
  const code: status | undefined = err?.code;
  const message = err?.details ?? err?.message ?? 'Unknown error';

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
  } catch (err: any) {
    fromRpcToHttp(err);
  }
}
