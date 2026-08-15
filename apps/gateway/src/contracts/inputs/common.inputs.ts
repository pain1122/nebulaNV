import { profile, type GatewayInputProfileGroup } from "./input-profile.core";

export const COMMON_INPUT_PROFILES = Object.freeze({
  none: profile(),
  "uuid-id": profile({ params: ["id"], requiredParams: ["id"] }),
  slug: profile({ params: ["slug"], requiredParams: ["slug"] }),
} satisfies GatewayInputProfileGroup);
