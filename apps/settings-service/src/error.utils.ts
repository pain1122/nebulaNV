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

export function prismaErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;

  const code = error.code;
  return typeof code === "string" ? code : undefined;
}
