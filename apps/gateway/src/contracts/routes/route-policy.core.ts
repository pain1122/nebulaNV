import type { PublicApplicationProfile } from "../../application/application.contracts";
import type { GatewayInputProfileName } from "../input-profiles";

export type GatewayHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type GatewayActorPolicy =
  | "anonymous"
  | "optional"
  | "session"
  | "authenticated"
  | "admin";

export type GatewayRetryProfile = "safe" | "key" | "session" | "stream";
export type GatewayResponseProfile =
  | "item"
  | "collection"
  | "action"
  | "stream";
export type GatewayPaginationProfile =
  | "none"
  | "page-limit-total"
  | "total-only"
  | "offset-take"
  | "unpaginated";

export type GatewayDownstreamTarget =
  | "auth-service"
  | "user-service"
  | "settings-service"
  | "product-service"
  | "blog-service"
  | "order-service"
  | "media-service"
  | "media-render-http";

export type GatewayRoutePolicy = Readonly<{
  id: string;
  method: GatewayHttpMethod;
  path: string;
  applications: readonly PublicApplicationProfile[];
  actor: GatewayActorPolicy;
  downstreamTarget: GatewayDownstreamTarget;
  downstreamRpc: string;
  input: GatewayInputProfileName;
  successStatus: number;
  response: GatewayResponseProfile;
  pagination: GatewayPaginationProfile;
  retry: GatewayRetryProfile;
}>;

export const ALL_APPLICATIONS = Object.freeze([
  "storefront-web",
  "admin-web",
  "mobile",
] as const satisfies readonly PublicApplicationProfile[]);
export const CONSUMER_APPLICATIONS = Object.freeze([
  "storefront-web",
  "mobile",
] as const satisfies readonly PublicApplicationProfile[]);
export const ADMIN_APPLICATION = Object.freeze([
  "admin-web",
] as const satisfies readonly PublicApplicationProfile[]);

type RouteInput = Omit<GatewayRoutePolicy, "applications"> & {
  applications: readonly PublicApplicationProfile[];
};

export function route(input: RouteInput): GatewayRoutePolicy {
  return Object.freeze({
    ...input,
    applications: Object.freeze([...input.applications]),
  });
}

export function consumerRoute(
  input: Omit<RouteInput, "applications">,
): GatewayRoutePolicy {
  return route({ ...input, applications: CONSUMER_APPLICATIONS });
}

export function adminRoute(
  input: Omit<RouteInput, "applications" | "actor">,
): GatewayRoutePolicy {
  return route({ ...input, applications: ADMIN_APPLICATION, actor: "admin" });
}

export function publicRoute(
  input: Omit<RouteInput, "applications" | "actor">,
): GatewayRoutePolicy {
  return route({ ...input, applications: ALL_APPLICATIONS, actor: "optional" });
}

export function validateRouteManifest(
  values: readonly GatewayRoutePolicy[],
): void {
  const ids = new Set<string>();
  const endpoints = new Set<string>();
  for (const value of values) {
    if (!value.path.startsWith("/api/v1/")) {
      throw new Error(`gateway_route_path_unversioned:${value.id}`);
    }
    if (ids.has(value.id)) {
      throw new Error(`gateway_route_id_duplicate:${value.id}`);
    }
    ids.add(value.id);
    const endpoint = `${value.method} ${value.path}`;
    if (endpoints.has(endpoint)) {
      throw new Error(`gateway_route_endpoint_duplicate:${endpoint}`);
    }
    endpoints.add(endpoint);
    if (value.response !== "collection" && value.pagination !== "none") {
      throw new Error(`gateway_route_pagination_invalid:${value.id}`);
    }
    if (value.retry === "key" && value.method === "GET") {
      throw new Error(`gateway_route_retry_invalid:${value.id}`);
    }
    if (value.response === "stream" && value.retry !== "stream") {
      throw new Error(`gateway_route_stream_retry_invalid:${value.id}`);
    }
  }
}
