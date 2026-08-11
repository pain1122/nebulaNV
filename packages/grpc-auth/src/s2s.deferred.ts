import { Metadata } from "@grpc/grpc-js";
import {
  buildGrpcS2SMetadata,
  mergeSignedMetadata,
  type GrpcRequestDefinition,
} from "./s2s";
import type { S2SCallerKind } from "./s2s.crypto";
import type { S2SSignedContext } from "./s2s-context";
import type { S2SKey } from "./tokens";

const S2S_SIGNING_INTENT = Symbol.for("@nebula/grpc-auth/s2s-signing-intent");

type MetadataWithSigningIntent = Metadata & {
  [S2S_SIGNING_INTENT]?: S2SSigningIntent;
};

type RegisteredClient = {
  target: string;
  definitions: Record<string, GrpcRequestDefinition>;
};

const registeredClients = new WeakMap<object, RegisteredClient>();

export type S2SSigningIdentity = {
  kind: S2SCallerKind;
  serviceName: string;
  key: S2SKey;
  requestId?: string;
  context?: S2SSignedContext;
};

export type S2SSigningIntent = S2SSigningIdentity & {
  targets?: Record<string, S2SSigningIdentity>;
};

/**
 * Mark application metadata for signing immediately before an RPC is sent.
 * Deferring this step gives the signer the actual method definition and body.
 */
export function markS2SMetadata(
  metadata: Metadata,
  intent: S2SSigningIntent,
): Metadata {
  Object.defineProperty(metadata, S2S_SIGNING_INTENT, {
    configurable: true,
    enumerable: false,
    writable: true,
    value: intent,
  });
  return metadata;
}

export function copyS2SSigningIntent(source: Metadata, target: Metadata): void {
  const intent = (source as MetadataWithSigningIntent)[S2S_SIGNING_INTENT];
  if (intent) markS2SMetadata(target, intent);
}

export function finalizeS2SMetadata<TRequest>(opts: {
  metadata: Metadata | undefined;
  target: string;
  definition: GrpcRequestDefinition;
  request: TRequest;
}): Metadata {
  const metadata = opts.metadata ?? new Metadata();
  const intent = (metadata as MetadataWithSigningIntent)[S2S_SIGNING_INTENT];
  if (!intent) return metadata;
  const identity = intent.targets?.[opts.target] ?? intent;

  return mergeSignedMetadata(
    metadata,
    buildGrpcS2SMetadata({
      target: opts.target,
      definition: opts.definition,
      request: opts.request,
      kind: identity.kind,
      serviceName: identity.serviceName,
      key: identity.key,
      requestId: identity.requestId,
      context: identity.context,
    }),
  );
}

export function registerS2SClientDefinition(
  client: object,
  definitions: Record<string, GrpcRequestDefinition>,
  target?: string,
): void {
  const first = Object.values(definitions)[0];
  const packageName = /^\/([A-Za-z0-9_-]+)\./.exec(first?.path ?? "")?.[1];
  const resolvedTarget =
    target ?? (packageName ? `${packageName}-service` : "");
  if (!resolvedTarget) throw new Error("s2s_client_target_missing");
  registeredClients.set(client, { target: resolvedTarget, definitions });
}

export function finalizeS2SClientMetadata<TRequest>(opts: {
  client: object;
  method: string;
  request: TRequest;
  metadata?: Metadata;
}): Metadata {
  const registered = registeredClients.get(opts.client);
  if (!registered) throw new Error("s2s_client_definition_not_registered");

  const entry = Object.entries(registered.definitions).find(
    ([name, definition]) =>
      name.toLowerCase() === opts.method.toLowerCase() ||
      definition.path.split("/").pop()?.toLowerCase() ===
        opts.method.toLowerCase(),
  );
  if (!entry) throw new Error(`s2s_rpc_definition_missing_${opts.method}`);

  return finalizeS2SMetadata({
    metadata: opts.metadata,
    target: registered.target,
    definition: entry[1],
    request: opts.request,
  });
}
