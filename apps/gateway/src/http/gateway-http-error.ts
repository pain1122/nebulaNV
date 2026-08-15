import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
  type ValidationPipeOptions,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { StructuredLogger } from "@packages/config";
import {
  gatewayErrorEnvelope,
  type GatewayErrorCode,
  type GatewayValidationCode,
  type GatewayValidationDetail,
} from "../contracts/api-envelope";

type ValidationIssueLike = Readonly<{
  property?: unknown;
  constraints?: unknown;
  children?: unknown;
}>;

type GatewayErrorPayload = Readonly<{
  gatewayError: true;
  code: GatewayErrorCode;
  details?: readonly GatewayValidationDetail[];
}>;

type RequestWithId = Request & { requestId?: string };

const STATUS_ERROR: Readonly<
  Record<number, Readonly<{ code: GatewayErrorCode; message: string }>>
> = Object.freeze({
  [HttpStatus.BAD_REQUEST]: {
    code: "BAD_REQUEST",
    message: "Request is invalid",
  },
  [HttpStatus.UNPROCESSABLE_ENTITY]: {
    code: "BAD_REQUEST",
    message: "Request is invalid",
  },
  [HttpStatus.UNAUTHORIZED]: {
    code: "AUTHENTICATION_REQUIRED",
    message: "Authentication is required",
  },
  [HttpStatus.FORBIDDEN]: {
    code: "ACCESS_DENIED",
    message: "Access is denied",
  },
  [HttpStatus.NOT_FOUND]: {
    code: "NOT_FOUND",
    message: "Resource was not found",
  },
  [HttpStatus.CONFLICT]: {
    code: "CONFLICT",
    message: "Request conflicts with current state",
  },
  [HttpStatus.PAYLOAD_TOO_LARGE]: {
    code: "REQUEST_TOO_LARGE",
    message: "Request body is too large",
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    code: "RATE_LIMITED",
    message: "Request rate limit exceeded",
  },
  [HttpStatus.REQUEST_TIMEOUT]: {
    code: "UPSTREAM_TIMEOUT",
    message: "The request timed out",
  },
  [HttpStatus.GATEWAY_TIMEOUT]: {
    code: "UPSTREAM_TIMEOUT",
    message: "The upstream request timed out",
  },
  [HttpStatus.SERVICE_UNAVAILABLE]: {
    code: "UPSTREAM_UNAVAILABLE",
    message: "A required service is unavailable",
  },
  [HttpStatus.BAD_GATEWAY]: {
    code: "UPSTREAM_UNAVAILABLE",
    message: "A required service is unavailable",
  },
  [HttpStatus.NOT_IMPLEMENTED]: {
    code: "NOT_IMPLEMENTED",
    message: "The operation is not implemented",
  },
});

const CONSTRAINT_CODE: Readonly<Record<string, GatewayValidationCode>> =
  Object.freeze({
    whitelistValidation: "unknown_field",
    isDefined: "required_field",
    isNotEmpty: "required_field",
    isNotEmptyObject: "required_field",
    isString: "invalid_type",
    isBoolean: "invalid_type",
    isInt: "invalid_type",
    isNumber: "invalid_type",
    isArray: "invalid_type",
    isObject: "invalid_type",
    isEnum: "invalid_value",
    isIn: "invalid_value",
    isEmail: "invalid_format",
    isUrl: "invalid_format",
    isUUID: "invalid_format",
    matches: "invalid_format",
    min: "out_of_range",
    max: "out_of_range",
    minLength: "out_of_range",
    maxLength: "out_of_range",
    arrayMinSize: "out_of_range",
    arrayMaxSize: "too_many_items",
  });

function safeRequestId(request: RequestWithId): string {
  return request.requestId?.trim() || "unavailable";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationDetails(
  values: readonly ValidationIssueLike[],
  parent = "",
): GatewayValidationDetail[] {
  const details: GatewayValidationDetail[] = [];
  for (const value of values) {
    const property =
      typeof value.property === "string" ? value.property.trim() : "";
    const field = property
      ? parent
        ? `${parent}.${property}`
        : property
      : parent;
    if (field && isRecord(value.constraints)) {
      for (const constraint of Object.keys(value.constraints)) {
        details.push({
          field,
          code: CONSTRAINT_CODE[constraint] ?? "invalid_value",
        });
      }
    }
    if (Array.isArray(value.children)) {
      details.push(
        ...validationDetails(value.children as ValidationIssueLike[], field),
      );
    }
  }
  return details
    .sort((left, right) =>
      `${left.field}:${left.code}`.localeCompare(
        `${right.field}:${right.code}`,
      ),
    )
    .filter(
      (detail, index, all) =>
        index === 0 ||
        detail.field !== all[index - 1]?.field ||
        detail.code !== all[index - 1]?.code,
    );
}

export const gatewayValidationExceptionFactory: NonNullable<
  ValidationPipeOptions["exceptionFactory"]
> = (errors) =>
  new GatewayApiException(
    HttpStatus.BAD_REQUEST,
    "VALIDATION_FAILED",
    validationDetails(errors),
  );

export class GatewayApiException extends HttpException {
  constructor(
    status: HttpStatus,
    code: GatewayErrorCode,
    details?: readonly GatewayValidationDetail[],
  ) {
    const payload: GatewayErrorPayload = Object.freeze({
      gatewayError: true,
      code,
      ...(details && details.length > 0
        ? { details: Object.freeze([...details]) }
        : {}),
    });
    super(payload, status);
  }
}

function gatewayPayload(exception: HttpException): GatewayErrorPayload | null {
  const response = exception.getResponse();
  if (!isRecord(response) || response.gatewayError !== true) return null;
  if (typeof response.code !== "string") return null;
  return response as GatewayErrorPayload;
}

function errorForStatus(status: number): {
  code: GatewayErrorCode;
  message: string;
} {
  return (
    STATUS_ERROR[status] ?? {
      code: "INTERNAL_ERROR",
      message: "An internal error occurred",
    }
  );
}

function exceptionStatus(exception: unknown): number {
  if (exception instanceof HttpException) return exception.getStatus();
  if (isRecord(exception)) {
    const candidate =
      typeof exception.status === "number"
        ? exception.status
        : exception.statusCode;
    if (
      typeof candidate === "number" &&
      Number.isInteger(candidate) &&
      candidate >= 400 &&
      candidate <= 599
    ) {
      return candidate;
    }
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

const CUSTOM_ERROR_MESSAGES: Partial<Record<GatewayErrorCode, string>> = {
  VALIDATION_FAILED: "Request validation failed",
  CLIENT_ID_REQUIRED: "A valid client identifier is required",
  APPLICATION_NOT_ALLOWED: "Application identity was not accepted",
  IDEMPOTENCY_KEY_REQUIRED: "An Idempotency-Key header is required",
  IDEMPOTENCY_KEY_INVALID: "The Idempotency-Key header is invalid",
  IDEMPOTENCY_NOT_SUPPORTED: "Idempotency-Key is not supported for this route",
  IDEMPOTENCY_CONFLICT: "The idempotency key was used for a different request",
  IDEMPOTENCY_IN_PROGRESS: "A matching request is still in progress",
  IDEMPOTENCY_STORE_UNAVAILABLE: "Idempotency state is unavailable",
};

@Catch()
export class GatewayHttpErrorFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();
    const status = exceptionStatus(exception);
    const fallback = errorForStatus(status);
    const payload =
      exception instanceof HttpException ? gatewayPayload(exception) : null;
    const code = payload?.code ?? fallback.code;
    const message = CUSTOM_ERROR_MESSAGES[code] ?? fallback.message;
    const requestId = safeRequestId(request);

    if (status >= 500) {
      this.logger.error("gateway_http_boundary_error", {
        requestId,
        status,
        code,
      });
    }

    response
      .status(status)
      .json(gatewayErrorEnvelope(code, message, requestId, payload?.details));
  }
}
