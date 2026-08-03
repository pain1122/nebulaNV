import {
  ServerInterceptingCall,
  ServerListenerBuilder,
  type Metadata,
  type ServiceDefinition,
  type ServerInterceptor,
} from "@grpc/grpc-js";
import { digestGrpcS2SRequest, type GrpcRequestDefinition } from "./s2s";

export const S2S_SERVER_CONTEXT = Symbol.for(
  "@nebula/grpc-auth/s2s-server-context",
);

export type S2SServerContext = {
  method: "grpc";
  path: string;
  bodySha256?: string;
  requestStream: boolean;
};

export type MetadataWithS2SServerContext = Metadata & {
  [S2S_SERVER_CONTEXT]?: S2SServerContext;
};

export function getS2SServerContext(
  metadata: Metadata | undefined,
): S2SServerContext | undefined {
  return (metadata as MetadataWithS2SServerContext | undefined)?.[
    S2S_SERVER_CONTEXT
  ];
}

/**
 * Capture the actual gRPC route and the digest of the protobuf bytes produced
 * by grpc-js's own server-side serializer. The guard refuses RPC traffic when
 * this trusted context is absent.
 */
export function createS2SServerInterceptor(
  serviceDefinitions: ReadonlyArray<ServiceDefinition>,
): ServerInterceptor {
  const definitions = new Map<string, GrpcRequestDefinition>();
  for (const service of serviceDefinitions) {
    for (const definition of Object.values(service)) {
      definitions.set(definition.path, definition);
    }
  }

  return (definition, call) => {
    let metadata: MetadataWithS2SServerContext | undefined;

    return new ServerInterceptingCall(call, {
      start: (next) => {
        const listener = new ServerListenerBuilder()
          .withOnReceiveMetadata((received, nextMetadata) => {
            metadata = received as MetadataWithS2SServerContext;
            Object.defineProperty(metadata, S2S_SERVER_CONTEXT, {
              configurable: false,
              enumerable: false,
              writable: true,
              value: {
                method: "grpc",
                path: definition.path,
                requestStream: definition.requestStream,
              } satisfies S2SServerContext,
            });
            nextMetadata(received);
          })
          .withOnReceiveMessage((message, nextMessage) => {
            const trusted = metadata?.[S2S_SERVER_CONTEXT];
            const requestDefinition = definitions.get(definition.path);
            if (trusted && requestDefinition) {
              trusted.bodySha256 = digestGrpcS2SRequest(
                requestDefinition,
                message,
              );
            }
            nextMessage(message);
          })
          .build();

        next(listener);
      },
    });
  };
}
