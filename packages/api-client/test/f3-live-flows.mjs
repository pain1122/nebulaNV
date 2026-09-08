import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { createGatewayClient } from "../dist/index.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("f3_live_client_flow_refused_in_production");
}

const baseUrl =
  process.env.NEBULA_LIVE_GATEWAY_BASE_URL ?? "http://127.0.0.1:3002";
const userIdentifier = process.env.SEED_USER_EMAIL ?? "user@example.com";
const userPassword = process.env.SEED_USER_PASS ?? "User123!";
const adminIdentifier = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const adminPassword = process.env.SEED_ADMIN_PASS ?? "Admin123!";

function client(publicClientId, applicationOrigin) {
  return createGatewayClient({
    baseUrl,
    publicClientId,
    ...(applicationOrigin ? { applicationOrigin } : {}),
  });
}

function success(label, result) {
  if (!result.ok) throw new Error(`${label}_http_${result.status}`);
  return result;
}

function browserCookie(result) {
  const setCookie = result.headers.get("set-cookie");
  if (!setCookie) throw new Error("f3_live_browser_cookie_missing");
  return setCookie.split(";", 1)[0];
}

async function login(api, identifier, password) {
  return success(
    "f3_live_login",
    await api.request("auth_login", {
      body: { identifier, password },
    }),
  );
}

async function logoutBrowser(api, accessToken, cookie) {
  return success(
    "f3_live_browser_logout",
    await api.request("auth_logout", {
      accessToken,
      browserCookie: cookie,
      idempotencyKey: randomUUID(),
      body: {},
    }),
  );
}

const readiness = await globalThis.fetch(`${baseUrl}/health/ready`);
if (!readiness.ok) {
  throw new Error(`f3_live_gateway_readiness_http_${readiness.status}`);
}
process.stdout.write("[f3-live] gateway-readiness=ok\n");

const storefront = client("storefront-web-local", "http://localhost:3008");
const anonymousProducts = success(
  "f3_live_anonymous_storefront",
  await storefront.request("products_list", { query: { page: 1, limit: 20 } }),
);
assert.ok(Array.isArray(anonymousProducts.data.data));
process.stdout.write("[f3-live] anonymous-storefront=ok\n");

const storefrontLogin = await login(storefront, userIdentifier, userPassword);
const storefrontAccess = storefrontLogin.data.data.accessToken;
const storefrontCookie = browserCookie(storefrontLogin);
const storefrontProfile = success(
  "f3_live_authenticated_storefront",
  await storefront.request("auth_me", { accessToken: storefrontAccess }),
);
assert.equal(storefrontProfile.data.data.role, "user");
await logoutBrowser(storefront, storefrontAccess, storefrontCookie);
process.stdout.write("[f3-live] authenticated-storefront=ok\n");

const admin = client("admin-web-local", "http://localhost:3000");
const adminLogin = await login(admin, adminIdentifier, adminPassword);
const adminAccess = adminLogin.data.data.accessToken;
const adminCookie = browserCookie(adminLogin);
const users = success(
  "f3_live_authorized_admin",
  await admin.request("admin_users_list", { accessToken: adminAccess }),
);
assert.ok(Array.isArray(users.data.data));
await logoutBrowser(admin, adminAccess, adminCookie);
process.stdout.write("[f3-live] authorized-admin=ok\n");

const mobile = client("mobile-local");
const mobileLogin = await login(mobile, userIdentifier, userPassword);
const mobileAccess = mobileLogin.data.data.accessToken;
const mobileRefresh = mobileLogin.data.data.refreshToken;
assert.equal(typeof mobileRefresh, "string");
const mobileProfile = success(
  "f3_live_registered_mobile",
  await mobile.request("auth_me", { accessToken: mobileAccess }),
);
assert.equal(mobileProfile.data.data.role, "user");
success(
  "f3_live_mobile_logout",
  await mobile.request("auth_logout", {
    accessToken: mobileAccess,
    idempotencyKey: randomUUID(),
    body: { refreshToken: mobileRefresh },
  }),
);
process.stdout.write("[f3-live] registered-mobile=ok\n");

const reservedPartner = client("partner-local");
const partnerResult = await reservedPartner.request("products_list", {
  query: { page: 1, limit: 20 },
});
assert.equal(partnerResult.ok, false);
assert.ok([400, 403].includes(partnerResult.status));
process.stdout.write("[f3-live] partner-execution-disabled=ok\n");
