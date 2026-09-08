import { GATEWAY_OUTBOUND_TARGETS } from "@nebula/grpc-auth";

export const TEST_GATEWAY_OUTBOUND_KEYS = JSON.stringify(
  Object.fromEntries(
    GATEWAY_OUTBOUND_TARGETS.map((target, index) => [
      target,
      {
        id: `gateway-${target}-${index}`,
        secret: `test-only-gateway-${target}-${index}-secret-00000001`,
      },
    ]),
  ),
);

export const TEST_APPLICATION_RECORDS = [
  {
    clientId: "storefront-web-local",
    applicationId: "storefront-web-local",
    profile: "storefront-web",
    tenantId: "single-site-tenant",
    siteId: "single-site",
    channelId: "storefront-web",
    enabled: true,
    origins: ["http://localhost:3008"],
    rateLimitProfile: "default",
  },
  {
    clientId: "admin-web-local",
    applicationId: "admin-web-local",
    profile: "admin-web",
    tenantId: "single-site-tenant",
    siteId: "single-site",
    channelId: "admin-web",
    enabled: true,
    origins: ["http://localhost:3000"],
    rateLimitProfile: "default",
  },
  {
    clientId: "mobile-local",
    applicationId: "mobile-local",
    profile: "mobile",
    tenantId: "single-site-tenant",
    siteId: "single-site",
    channelId: "native-mobile",
    enabled: true,
    origins: [],
    rateLimitProfile: "default",
  },
] as const;

export const TEST_APPLICATION_REGISTRY_JSON = JSON.stringify(
  TEST_APPLICATION_RECORDS,
);

export const TEST_GATEWAY_GRPC_TARGETS = Object.freeze({
  AUTH_GRPC_URL: "127.0.0.1:50052",
  USER_GRPC_URL: "127.0.0.1:50051",
  PRODUCT_GRPC_URL: "127.0.0.1:50053",
  SETTINGS_GRPC_URL: "127.0.0.1:50054",
  BLOG_GRPC_URL: "127.0.0.1:50055",
  ORDER_GRPC_URL: "127.0.0.1:50056",
  TAXONOMY_GRPC_URL: "127.0.0.1:50057",
  MEDIA_GRPC_URL: "127.0.0.1:50058",
});

export const TEST_MEDIA_RENDER_HTTP_URL = "http://127.0.0.1:3007";

export const TEST_ADMIN_IDENTITY_HEADERS = {
  Origin: "http://localhost:3000",
  "X-Nebula-Client-ID": "admin-web-local",
} as const;
