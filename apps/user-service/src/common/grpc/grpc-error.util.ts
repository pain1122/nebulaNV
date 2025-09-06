import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    GatewayTimeoutException,
    InternalServerErrorException,
    NotFoundException,
    RequestTimeoutException,
    ServiceUnavailableException,
    UnauthorizedException,
  } from '@nestjs/common';
  import { RpcException } from '@nestjs/microservices';
  import { status } from '@grpc/grpc-js';
  
  export function toRpc(code: status, message: string) {
    return new RpcException({ code, message });
  }
  
  export function fromRpcToHttp(err: any): never {
    // ts-proto errors usually look like: { code, details }
    const code: status | undefined = err?.code;
    const message = err?.details ?? err?.message ?? 'Unknown error';
  
    switch (code) {
      case status.INVALID_ARGUMENT:
      case status.FAILED_PRECONDITION:
      case status.OUT_OF_RANGE:
        throw new BadRequestException(message);
      case status.UNAUTHENTICATED:
        throw new UnauthorizedException(message);
      case status.PERMISSION_DENIED:
        throw new ForbiddenException(message);
      case status.NOT_FOUND:
        throw new NotFoundException(message);
      case status.ALREADY_EXISTS:
        throw new ConflictException(message);
      case status.DEADLINE_EXCEEDED:
        throw new RequestTimeoutException(message);
      case status.UNAVAILABLE:
        throw new ServiceUnavailableException(message);
      default:
        throw new InternalServerErrorException(message);
    }
  }
  