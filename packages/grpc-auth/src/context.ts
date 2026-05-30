import type { Metadata, MetadataValue } from "@grpc/grpc-js";

export type ContextUser = {
  userId: string | null;
  role?: string;
  email?: string;
};

export type ContextCarrier = {
  user?: ContextUser;
  svc?: string;
};

export type HeaderMap = Record<string, string | string[] | undefined>;

export type HttpRequestWithContext = ContextCarrier & {
  headers?: HeaderMap;
};

export type RpcContextWithContext = ContextCarrier;
export type MetadataWithContext = Metadata & ContextCarrier;

export function firstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") return value;
  return value?.[0];
}

export function metadataValueToString(
  value: MetadataValue | undefined,
): string | undefined {
  if (typeof value === "string") return value;
  return value?.toString("utf8");
}

export function firstMetadataValue(
  meta: Metadata | undefined,
  key: string,
): string | undefined {
  return metadataValueToString(meta?.get(key)?.[0]);
}

export function getContextUser(
  carrier: ContextCarrier | undefined,
): ContextUser | undefined {
  return carrier?.user;
}

export function getContextService(
  carrier: ContextCarrier | undefined,
): string | null {
  return carrier?.svc ? String(carrier.svc) : null;
}
