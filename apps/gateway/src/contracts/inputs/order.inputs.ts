import { profile, type GatewayInputProfileGroup } from "./input-profile.core";

export const ORDER_INPUT_PROFILES = Object.freeze({
  "cart-add": profile({
    body: ["productId", "quantity"],
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
    body: ["status"],
    requiredParams: ["id"],
    requiredBody: ["status"],
  }),
} satisfies GatewayInputProfileGroup);
