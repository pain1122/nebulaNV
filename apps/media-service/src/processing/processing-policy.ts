export class ProcessingError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable = false,
    public readonly infected = false,
  ) {
    super(code);
    this.name = "ProcessingError";
  }
}

export function processingPolicy() {
  const number = (key: string, fallback: number) =>
    Number(process.env[key] ?? fallback);
  return {
    enabled: process.env.MEDIA_PROCESSING_ENABLED !== "false",
    pollMs: number("MEDIA_PROCESSING_POLL_MS", 2000),
    maxBytes: number("MEDIA_PROCESSING_MAX_BYTES", 20 * 1024 * 1024),
    maxPixels: number("MEDIA_PROCESSING_MAX_PIXELS", 16_000_000),
    ioTimeoutMs: number("MEDIA_PROCESSING_IO_TIMEOUT_MS", 20_000),
    scanTimeoutMs: number("MEDIA_SCANNER_TIMEOUT_MS", 30_000),
    imageTimeoutSec: number("MEDIA_PROCESSING_IMAGE_TIMEOUT_SECONDS", 15),
    leaseMs: number("MEDIA_PROCESSING_LEASE_MS", 180_000),
    maxAttempts: number("MEDIA_PROCESSING_MAX_ATTEMPTS", 5),
    retryMs: number("MEDIA_PROCESSING_RETRY_MS", 10_000),
    scannerHost: process.env.MEDIA_SCANNER_HOST ?? "127.0.0.1",
    scannerPort: number("MEDIA_SCANNER_PORT", 3310),
  };
}

export function retryDelay(attempts: number, baseMs: number): number {
  return Math.min(baseMs * 2 ** Math.max(0, attempts - 1), 300_000);
}
