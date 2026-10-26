import { profile, type GatewayInputProfileGroup } from "./input-profile.core";

export const ORDER_INPUT_PROFILES = Object.freeze({
  "demo-payment-start": profile({
    params: ["id"],
    requiredParams: ["id"],
    body: ["expectedVersion"],
    requiredBody: ["expectedVersion"],
  }),
  "demo-payment-outcome": profile({
    params: ["id", "attemptId"],
    requiredParams: ["id", "attemptId"],
    body: ["expectedVersion", "outcome"],
    requiredBody: ["expectedVersion", "outcome"],
  }),
  "order-admin-list": profile({ query: ["status", "userId", "page", "limit"] }),
  "cart-add": profile({
    body: ["productId", "variantId", "quantity"],
    requiredBody: ["productId", "quantity"],
  }),
  "cart-update": profile({
    params: ["id"],
    body: ["quantity"],
    requiredParams: ["id"],
    requiredBody: ["quantity"],
  }),
  checkout: profile({ body: ["note"] }),
  "order-list": profile({ query: ["status"] }),
  "order-status": profile({
    params: ["id"],
    body: ["status", "expectedVersion"],
    requiredParams: ["id"],
    requiredBody: ["status", "expectedVersion"],
  }),
} satisfies GatewayInputProfileGroup);
