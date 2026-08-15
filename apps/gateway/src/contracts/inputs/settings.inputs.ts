import { profile, type GatewayInputProfileGroup } from "./input-profile.core";

export const PUBLIC_SETTING_KEYS = Object.freeze([
  "pricing/default_currency",
] as const);
export const ADMIN_SETTING_KEYS = Object.freeze([
  ...PUBLIC_SETTING_KEYS,
  "order/cart_ttl_minutes",
  "product/default_product_category",
  "blog/default_blog_category",
] as const);

export const SETTINGS_INPUT_PROFILES = Object.freeze({
  "setting-public-key": profile({
    params: ["ns", "key"],
    requiredParams: ["ns", "key"],
    rules: [{ kind: "setting-allowlist", allowed: PUBLIC_SETTING_KEYS }],
  }),
  "setting-admin-key": profile({
    params: ["ns", "key"],
    requiredParams: ["ns", "key"],
    rules: [{ kind: "setting-allowlist", allowed: ADMIN_SETTING_KEYS }],
  }),
  "setting-admin-write": profile({
    params: ["ns", "key"],
    body: ["value"],
    requiredParams: ["ns", "key"],
    requiredBody: ["value"],
    rules: [{ kind: "setting-allowlist", allowed: ADMIN_SETTING_KEYS }],
  }),
} satisfies GatewayInputProfileGroup);
