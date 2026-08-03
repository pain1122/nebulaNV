import { ValidationPipe } from "@nestjs/common";
import { grpcValidationException } from "./grpc-error.util";

/**
 * gRPC DTO validation stays separate from HTTP validation so transport-specific
 * error mapping and coercion decisions cannot drift together accidentally.
 */
export function createGrpcValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: grpcValidationException,
  });
}
