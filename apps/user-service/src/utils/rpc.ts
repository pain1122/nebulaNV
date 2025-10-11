// apps/user-service/src/utils/rpc.ts
import { Metadata, ServiceError, CallOptions } from '@grpc/grpc-js';

/**
 * Promisify a unary gRPC method.
 * Works with all common signatures:
 *  - (req, cb)
 *  - (req, metadata, cb)
 *  - (req, metadata, options, cb)
 */
export function promisifyUnary<TReq, TRes>(
  fn: (req: TReq, md?: Metadata, opts?: CallOptions, cb?: (err: ServiceError | null, res: TRes) => void) => unknown,
  md?: Metadata,
  opts?: CallOptions,
) {
  return (req: TReq): Promise<TRes> =>
    new Promise<TRes>((resolve, reject) => {
      const cb = (err: ServiceError | null, res: TRes) => {
        if (err) return reject(err);
        resolve(res);
      };

      // Dispatch based on provided args
      if (md && opts) {
        (fn as any)(req, md, opts, cb);
      } else if (md) {
        (fn as any)(req, md, cb);
      } else {
        (fn as any)(req, cb);
      }
    });
}

/** Convenience: create CallOptions with a deadline N milliseconds from now. */
export function withDeadline(ms: number): CallOptions {
  return { deadline: new Date(Date.now() + ms) };
}

/** Convenience: ensure we always pass a Metadata instance when needed. */
export function ensureMetadata(md?: Metadata): Metadata {
  return md ?? new Metadata();
}
