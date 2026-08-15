import {
  adminRoute,
  publicRoute,
  type GatewayRoutePolicy,
} from "./route-policy.core";

function taxonomyRoutes(
  domain: "product" | "blog",
  target: "product-service" | "blog-service",
  facade: "ProductTaxonomyService" | "BlogTaxonomyService",
): readonly GatewayRoutePolicy[] {
  const base = `${domain}-taxonomies`;
  return Object.freeze([
    publicRoute({
      id: `${domain}.taxonomies.list`,
      method: "GET",
      path: `/api/v1/${base}`,
      downstreamTarget: target,
      downstreamRpc: `${facade}.List`,
      input: "taxonomy-list",
      successStatus: 200,
      response: "collection",
      pagination: "page-limit-total",
      retry: "safe",
    }),
    publicRoute({
      id: `${domain}.taxonomies.get`,
      method: "GET",
      path: `/api/v1/${base}/:id`,
      downstreamTarget: target,
      downstreamRpc: `${facade}.Get`,
      input: "uuid-id",
      successStatus: 200,
      response: "item",
      pagination: "none",
      retry: "safe",
    }),
    adminRoute({
      id: `admin.${domain}.taxonomies.create`,
      method: "POST",
      path: `/api/v1/admin/${base}`,
      downstreamTarget: target,
      downstreamRpc: `${facade}.Create`,
      input: "taxonomy-write",
      successStatus: 201,
      response: "item",
      pagination: "none",
      retry: "key",
    }),
    adminRoute({
      id: `admin.${domain}.taxonomies.update`,
      method: "PATCH",
      path: `/api/v1/admin/${base}/:id`,
      downstreamTarget: target,
      downstreamRpc: `${facade}.Update`,
      input: "taxonomy-patch",
      successStatus: 200,
      response: "item",
      pagination: "none",
      retry: "key",
    }),
    adminRoute({
      id: `admin.${domain}.taxonomies.delete`,
      method: "DELETE",
      path: `/api/v1/admin/${base}/:id`,
      downstreamTarget: target,
      downstreamRpc: `${facade}.Delete`,
      input: "uuid-id",
      successStatus: 200,
      response: "action",
      pagination: "none",
      retry: "key",
    }),
  ]);
}

export const TAXONOMY_ROUTES: readonly GatewayRoutePolicy[] = Object.freeze([
  ...taxonomyRoutes("product", "product-service", "ProductTaxonomyService"),
  ...taxonomyRoutes("blog", "blog-service", "BlogTaxonomyService"),
]);
