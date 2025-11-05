import { Metadata, ServiceError } from '@grpc/grpc-js';

/** Merge two Metadata objects into a new one (later wins on duplicate keys). */
function mergeMetadata(a?: Metadata, b?: Metadata): Metadata {
  const out = new Metadata();
  const add = (m?: Metadata) => {
    if (!m) return;
    // getMap() flattens to first value per key — fine for our auth headers
    const map = m.getMap();
    for (const k of Object.keys(map)) {
      const v = map[k];
      // preserve multi-value behavior by always using add (string | Buffer)
      out.add(k, v as any);
    }
  };
  add(a);
  add(b);
  return out;
}

/**
 * Promisify a unary RPC that has the common `(req, md, cb)` signature.
 * - `baseMd` is your default metadata (e.g., S2S signature).
 * - Each call can pass `extraMd` (e.g., Bearer + x-user-id).
 */
export function promisifyRpc<TReq, TRes>(
  fn: (req: TReq, md: Metadata, cb: (err: ServiceError | null, res: TRes) => void) => unknown,
  baseMd?: Metadata,
) {
  return (req: TReq, extraMd?: Metadata): Promise<TRes> =>
    new Promise<TRes>((resolve, reject) => {
      const md = mergeMetadata(baseMd, extraMd);
      fn(req, md, (err, res) => {
        if (err) {
          // Preserve useful details for logging while keeping a normal Error shape
          const e = new Error(err.details || err.message || 'gRPC error') as Error & Partial<ServiceError>;
          e.code = err.code;
          e.metadata = err.metadata;
          return reject(e);
        }
        resolve(res);
      });
    });
}
