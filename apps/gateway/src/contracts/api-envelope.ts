export const GATEWAY_ERROR_CODES = [
  "BAD_REQUEST",
  "VALIDATION_FAILED",
  "CLIENT_ID_REQUIRED",
  "APPLICATION_NOT_ALLOWED",
  "AUTHENTICATION_REQUIRED",
  "ACCESS_DENIED",
  "NOT_FOUND",
  "CONFLICT",
  "REQUEST_TOO_LARGE",
  "RATE_LIMITED",
  "UPSTREAM_TIMEOUT",
  "UPSTREAM_UNAVAILABLE",
  "NOT_IMPLEMENTED",
  "IDEMPOTENCY_KEY_REQUIRED",
  "IDEMPOTENCY_KEY_INVALID",
  "IDEMPOTENCY_NOT_SUPPORTED",
  "IDEMPOTENCY_CONFLICT",
  "IDEMPOTENCY_IN_PROGRESS",
  "IDEMPOTENCY_STORE_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export type GatewayErrorCode = (typeof GATEWAY_ERROR_CODES)[number];

export const GATEWAY_VALIDATION_CODES = [
  "unknown_field",
  "required_field",
  "invalid_type",
  "invalid_format",
  "invalid_value",
  "out_of_range",
  "unsupported_combination",
  "too_many_items",
] as const;

export type GatewayValidationCode = (typeof GATEWAY_VALIDATION_CODES)[number];

export type GatewayValidationDetail = Readonly<{
  field: string;
  code: GatewayValidationCode;
}>;

export type GatewayErrorEnvelope = Readonly<{
  error: Readonly<{
    code: GatewayErrorCode;
    message: string;
    details?: readonly GatewayValidationDetail[];
  }>;
  requestId: string;
}>;

export type GatewayItemEnvelope<T> = Readonly<{
  data: T;
  requestId: string;
}>;

export type PageLimitTotalPagination = Readonly<{
  profile: "page-limit-total";
  page: number;
  limit: number;
  total: number;
}>;

export type TotalOnlyPagination = Readonly<{
  profile: "total-only";
  total: number;
}>;

export type OffsetTakePagination = Readonly<{
  profile: "offset-take";
  skip: number;
  take: number;
}>;

export type UnpaginatedPagination = Readonly<{
  profile: "unpaginated";
}>;

export type GatewayPagination =
  | PageLimitTotalPagination
  | TotalOnlyPagination
  | OffsetTakePagination
  | UnpaginatedPagination;

export type GatewayCollectionEnvelope<T> = Readonly<{
  data: readonly T[];
  meta: Readonly<{ pagination: GatewayPagination }>;
  requestId: string;
}>;

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function nonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function validatedPagination(value: GatewayPagination): GatewayPagination {
  if (
    value.profile === "page-limit-total" &&
    exactKeys(value, ["profile", "page", "limit", "total"]) &&
    Number.isInteger(value.page) &&
    value.page >= 1 &&
    Number.isInteger(value.limit) &&
    value.limit >= 1 &&
    nonNegativeInteger(value.total)
  ) {
    return Object.freeze({ ...value });
  }
  if (
    value.profile === "total-only" &&
    exactKeys(value, ["profile", "total"]) &&
    nonNegativeInteger(value.total)
  ) {
    return Object.freeze({ ...value });
  }
  if (
    value.profile === "offset-take" &&
    exactKeys(value, ["profile", "skip", "take"]) &&
    nonNegativeInteger(value.skip) &&
    Number.isInteger(value.take) &&
    value.take >= 1
  ) {
    return Object.freeze({ ...value });
  }
  if (value.profile === "unpaginated" && exactKeys(value, ["profile"])) {
    return Object.freeze({ profile: "unpaginated" });
  }
  throw new Error("gateway_pagination_invalid");
}

function requireRequestId(requestId: string): string {
  const value = requestId.trim();
  if (!value) throw new Error("gateway_response_request_id_missing");
  return value;
}

export function gatewayItemEnvelope<T>(
  data: T,
  requestId: string,
): GatewayItemEnvelope<T> {
  return Object.freeze({ data, requestId: requireRequestId(requestId) });
}

export const gatewayActionEnvelope = gatewayItemEnvelope;

export function gatewayCollectionEnvelope<T>(
  data: readonly T[],
  pagination: GatewayPagination,
  requestId: string,
): GatewayCollectionEnvelope<T> {
  return Object.freeze({
    data: Object.freeze([...data]),
    meta: Object.freeze({ pagination: validatedPagination(pagination) }),
    requestId: requireRequestId(requestId),
  });
}

export function gatewayErrorEnvelope(
  code: GatewayErrorCode,
  message: string,
  requestId: string,
  details?: readonly GatewayValidationDetail[],
): GatewayErrorEnvelope {
  const error = Object.freeze({
    code,
    message,
    ...(details && details.length > 0
      ? { details: Object.freeze([...details]) }
      : {}),
  });
  return Object.freeze({ error, requestId: requireRequestId(requestId) });
}
