import {
  buildGrpcS2SMetadata,
  type BuildGrpcS2SMetadataOptions,
} from "@nebula/grpc-auth";

/** The package-level entry point for fresh, request-bound gRPC metadata. */
export function getSignedMetadata<TRequest>(
  options: BuildGrpcS2SMetadataOptions<TRequest>,
) {
  return buildGrpcS2SMetadata(options);
}
