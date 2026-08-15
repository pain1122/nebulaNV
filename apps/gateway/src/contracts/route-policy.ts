import { AUTH_ROUTES } from "./routes/auth.routes";
import { BLOG_ROUTES } from "./routes/blog.routes";
import { MEDIA_ROUTES } from "./routes/media.routes";
import { ORDER_ROUTES } from "./routes/order.routes";
import { PRODUCT_ROUTES } from "./routes/product.routes";
import {
  validateRouteManifest,
  type GatewayRoutePolicy,
} from "./routes/route-policy.core";
import { SETTINGS_ROUTES } from "./routes/settings.routes";
import { TAXONOMY_ROUTES } from "./routes/taxonomy.routes";
import { USER_ROUTES } from "./routes/user.routes";

export type {
  GatewayActorPolicy,
  GatewayDownstreamTarget,
  GatewayHttpMethod,
  GatewayPaginationProfile,
  GatewayResponseProfile,
  GatewayRetryProfile,
  GatewayRoutePolicy,
} from "./routes/route-policy.core";

const routes: readonly GatewayRoutePolicy[] = [
  ...AUTH_ROUTES,
  ...USER_ROUTES,
  ...SETTINGS_ROUTES,
  ...PRODUCT_ROUTES,
  ...BLOG_ROUTES,
  ...TAXONOMY_ROUTES,
  ...ORDER_ROUTES,
  ...MEDIA_ROUTES,
];

validateRouteManifest(routes);

export const GATEWAY_ROUTE_POLICIES: readonly GatewayRoutePolicy[] =
  Object.freeze(routes);

const ROUTE_POLICY_BY_ID = new Map(
  GATEWAY_ROUTE_POLICIES.map((value) => [value.id, value] as const),
);

export function gatewayRoutePolicy(id: string): GatewayRoutePolicy {
  const policy = ROUTE_POLICY_BY_ID.get(id);
  if (!policy) throw new Error(`gateway_route_policy_unknown:${id}`);
  return policy;
}
