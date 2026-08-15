import { AUTH_INPUT_PROFILES } from "./inputs/auth.inputs";
import { BLOG_INPUT_PROFILES } from "./inputs/blog.inputs";
import { COMMON_INPUT_PROFILES } from "./inputs/common.inputs";
import {
  assertUniqueInputProfileNames,
  validateInputProfile,
  type GatewayExternalInput,
  type GatewayInputProfileGroup,
  type GatewayInputIssue,
} from "./inputs/input-profile.core";
import { MEDIA_INPUT_PROFILES } from "./inputs/media.inputs";
import { ORDER_INPUT_PROFILES } from "./inputs/order.inputs";
import { PRODUCT_INPUT_PROFILES } from "./inputs/product.inputs";
import { SETTINGS_INPUT_PROFILES } from "./inputs/settings.inputs";
import { TAXONOMY_INPUT_PROFILES } from "./inputs/taxonomy.inputs";
import { USER_INPUT_PROFILES } from "./inputs/user.inputs";

export type {
  GatewayExternalInput,
  GatewayInputIssue,
  GatewayInputIssueCode,
  GatewayInputLocation,
  GatewayInputProfile,
  GatewayInputRule,
} from "./inputs/input-profile.core";
export {
  ADMIN_SETTING_KEYS,
  PUBLIC_SETTING_KEYS,
} from "./inputs/settings.inputs";

const INPUT_PROFILE_GROUPS = Object.freeze([
  COMMON_INPUT_PROFILES,
  AUTH_INPUT_PROFILES,
  USER_INPUT_PROFILES,
  SETTINGS_INPUT_PROFILES,
  PRODUCT_INPUT_PROFILES,
  BLOG_INPUT_PROFILES,
  TAXONOMY_INPUT_PROFILES,
  ORDER_INPUT_PROFILES,
  MEDIA_INPUT_PROFILES,
] satisfies readonly GatewayInputProfileGroup[]);

assertUniqueInputProfileNames(INPUT_PROFILE_GROUPS);

export const GATEWAY_INPUT_PROFILES = Object.freeze({
  ...COMMON_INPUT_PROFILES,
  ...AUTH_INPUT_PROFILES,
  ...USER_INPUT_PROFILES,
  ...SETTINGS_INPUT_PROFILES,
  ...PRODUCT_INPUT_PROFILES,
  ...BLOG_INPUT_PROFILES,
  ...TAXONOMY_INPUT_PROFILES,
  ...ORDER_INPUT_PROFILES,
  ...MEDIA_INPUT_PROFILES,
});

export type GatewayInputProfileName = keyof typeof GATEWAY_INPUT_PROFILES;

export function validateGatewayInput(
  profileName: GatewayInputProfileName,
  input: GatewayExternalInput,
): readonly GatewayInputIssue[] {
  return validateInputProfile(GATEWAY_INPUT_PROFILES[profileName], input);
}
