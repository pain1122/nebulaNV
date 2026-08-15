import { profile, type GatewayInputProfileGroup } from "./input-profile.core";

export const USER_INPUT_PROFILES = Object.freeze({
  "profile-update": profile({
    body: ["email", "newPassword", "currentPassword"],
    rules: [
      {
        kind: "requires",
        location: "body",
        field: "newPassword",
        required: ["currentPassword"],
      },
      {
        kind: "at-least-one",
        location: "body",
        fields: ["email", "newPassword"],
      },
    ],
  }),
} satisfies GatewayInputProfileGroup);
