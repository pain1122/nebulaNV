// apps/user-service/src/utils/rpc.ts
import { Metadata, ServiceError, CallOptions } from '@grpc/grpc-js';

type UnaryCallback<TRes> = (err: ServiceError | null, res: TRes) => void;

type UnaryGrpcMethod<TReq, TRes> = {
  (req: TReq, cb: UnaryCallback<TRes>): unknown;
  (req: TReq, md: Metadata, cb: UnaryCallback<TRes>): unknown;
  (
    req: TReq,
    md: Metadata,
    opts: CallOptions,
    cb: UnaryCallback<TRes>,
  ): unknown;
};

export function promisifyUnary<TReq, TRes>(
  fn: UnaryGrpcMethod<TReq, TRes>,
  md?: Metadata,
  opts?: CallOptions,
) {
  return (req: TReq): Promise<TRes> =>
    new Promise<TRes>((resolve, reject) => {
      const cb: UnaryCallback<TRes> = (err, res) => {
        if (err) return reject(err);
        resolve(res);
      };

      if (md && opts) {
        fn(req, md, opts, cb);
      } else if (md) {
        fn(req, md, cb);
      } else {
        fn(req, cb);
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
