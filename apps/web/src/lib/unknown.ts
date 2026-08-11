export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

export function stringField(value: unknown, key: string): string | undefined {
  const field = asRecord(value)[key];
  return typeof field === "string" ? field : undefined;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return stringField(error, "message") ?? fallback;
}

export function parseJsonRecord(text: string): UnknownRecord {
  if (!text) return {};

  try {
    return asRecord(JSON.parse(text) as unknown);
  } catch {
    return {};
  }
}
