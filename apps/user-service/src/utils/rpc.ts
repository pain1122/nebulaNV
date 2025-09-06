import { Metadata, ServiceError } from '@grpc/grpc-js';

export function promisifyRpc<TReq, TRes>(
  fn: (req: TReq, md: Metadata, cb: (err: ServiceError | null, res: TRes) => void) => unknown,
  metadata: Metadata,
) {
  return (req: TReq): Promise<TRes> =>
    new Promise<TRes>((resolve, reject) => {
      fn(req, metadata, (err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
}
