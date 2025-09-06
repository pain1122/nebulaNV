import { Metadata } from '@grpc/grpc-js';

/** Build gRPC metadata with an Authorization: Bearer header. */
export function bearer(token?: string | null): Metadata | undefined {
  if (!token) return undefined;
  const md = new Metadata();
  md.set('authorization', `Bearer ${token}`); // grpc-js uses lowercase keys
  return md;
}
