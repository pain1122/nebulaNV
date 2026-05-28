type ErrorRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ErrorRecord {
  return typeof value === 'object' && value !== null;
}

function stringField(value: ErrorRecord, key: string): string | null {
  const field = value[key];
  return typeof field === 'string' && field.length > 0 ? field : null;
}

export function errorMessage(error: unknown, fallback = 'unknown'): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  if (!isRecord(error)) return fallback;

  return (
    stringField(error, 'message') ?? stringField(error, 'details') ?? fallback
  );
}

export function errorCode(error: unknown, fallback = '?'): string | number {
  if (!isRecord(error)) return fallback;

  const code = error.code;
  return typeof code === 'string' || typeof code === 'number' ? code : fallback;
}

export function errorName(error: unknown, fallback = 'unknown'): string {
  if (error instanceof Error) return error.constructor.name;
  if (!isRecord(error)) return fallback;

  const ctor = error.constructor;
  if (typeof ctor !== 'function') return fallback;

  return ctor.name || fallback;
}
