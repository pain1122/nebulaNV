import {
  buildGrpcS2SMetadata,
  invokeGrpcUnary,
  mergeSignedMetadata,
  type BuildGrpcS2SMetadataOptions,
  type GrpcRequestDefinition,
  type S2SCallerKind,
  type S2SKey,
  type S2SSignedContext,
} from "@nebula/grpc-auth";
import type { CallOptions, Metadata } from "@grpc/grpc-js";
import type { Observable } from "rxjs";

export type GrpcRequestInput<T> = T extends Uint8Array
  ? T
  : T extends readonly (infer TItem)[]
    ? GrpcRequestInput<TItem>[]
    : T extends object
      ? {
          [TKey in keyof T as TKey extends "$type"
            ? never
            : TKey]: GrpcRequestInput<T[TKey]>;
        }
      : T;

export type RawGrpcUnary<TRequest, TResponse> = (
  request: GrpcRequestInput<TRequest>,
  metadata?: Metadata,
  options?: CallOptions,
) => Observable<TResponse>;

export type SignedGrpcUnary<TRequest, TResponse> = RawGrpcUnary<
  TRequest,
  TResponse
>;

/**
 * Per-request caller authority supplied by an adapter such as the gateway.
 * Target, RPC definition, request body, timestamp, and nonce are deliberately
 * not injectable: each wrapper owns the first three and creates fresh values
 * for the latter two on every invocation.
 */
export type GrpcClientSigningPolicy = Readonly<{
  kind?: S2SCallerKind;
  serviceName?: string;
  key?: S2SKey;
  requestId?: string;
  context?: S2SSignedContext;
}>;

export function buildClientGrpcS2SMetadata<TRequest>(options: {
  policy?: GrpcClientSigningPolicy;
  target: string;
  definition: GrpcRequestDefinition;
  request: TRequest;
}) {
  return buildGrpcS2SMetadata({
    ...options.policy,
    target: options.target,
    definition: options.definition,
    request: options.request,
  });
}

export function createSignedGrpcUnary<TRequest, TResponse>(options: {
  method: RawGrpcUnary<TRequest, TResponse>;
  policy?: GrpcClientSigningPolicy;
  target: string;
  definition: GrpcRequestDefinition;
}): SignedGrpcUnary<TRequest, TResponse> {
  return (request, metadata, callOptions) =>
    invokeGrpcUnary(
      options.method,
      request,
      mergeSignedMetadata(
        metadata,
        buildClientGrpcS2SMetadata({
          policy: options.policy,
          target: options.target,
          definition: options.definition,
          request,
        }),
      ),
      callOptions,
    );
}

/** The package-level entry point for fresh, request-bound gRPC metadata. */
export function getSignedMetadata<TRequest>(
  options: BuildGrpcS2SMetadataOptions<TRequest>,
) {
  return buildGrpcS2SMetadata(options);
}
