import { ValidationPipe } from "@nestjs/common";

/**
 * HTTP request validation is strict about unknown fields while allowing only
 * the conversions explicitly declared by DTO decorators.
 */
export function createHttpValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  });
}
