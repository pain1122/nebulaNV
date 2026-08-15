import { ValidationPipe, type ValidationPipeOptions } from "@nestjs/common";

export type HttpValidationPipeOptions = Readonly<{
  exceptionFactory?: ValidationPipeOptions["exceptionFactory"];
}>;

/**
 * HTTP request validation is strict about unknown fields while allowing only
 * the conversions explicitly declared by DTO decorators.
 */
export function createHttpValidationPipe(
  options: HttpValidationPipeOptions = {},
): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: options.exceptionFactory,
  });
}
