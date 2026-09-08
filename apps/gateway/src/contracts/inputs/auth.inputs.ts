import { profile, type GatewayInputProfileGroup } from "./input-profile.core";

export const AUTH_INPUT_PROFILES = Object.freeze({
  "auth-register": profile({
    body: ["email", "password"],
    requiredBody: ["email", "password"],
  }),
  "auth-login": profile({
    body: ["identifier", "password"],
    requiredBody: ["identifier", "password"],
  }),
  "auth-refresh": profile({
    body: ["refreshToken"],
    rules: [
      {
        kind: "application-only-fields",
        location: "body",
        applications: ["mobile"],
        fields: ["refreshToken"],
      },
      {
        kind: "application-at-least-one",
        location: "body",
        applications: ["mobile"],
        fields: ["refreshToken"],
      },
    ],
  }),
  "auth-logout": profile({
    body: ["allDevices", "refreshToken"],
    rules: [
      {
        kind: "application-only-fields",
        location: "body",
        applications: ["mobile"],
        fields: ["refreshToken"],
      },
      {
        kind: "application-at-least-one",
        location: "body",
        applications: ["mobile"],
        fields: ["refreshToken", "allDevices"],
      },
    ],
  }),
} satisfies GatewayInputProfileGroup);
