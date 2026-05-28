export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function errorMessage(
  error: unknown,
  fallback = "Unknown error",
): string {
  if (error instanceof Error) return error.message;

  if (isRecord(error)) {
    const message = error.message;
    if (typeof message === "string") return message;
  }

  return fallback;
}

export function grpcErrorMessage(
  error: unknown,
  fallback = "gRPC error",
): string {
  if (isRecord(error)) {
    const details = error.details;
    if (typeof details === "string") return details;

    const message = error.message;
    if (typeof message === "string") return message;
  }

  return errorMessage(error, fallback);
}
