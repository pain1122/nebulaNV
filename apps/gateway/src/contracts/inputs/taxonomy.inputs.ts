import { profile, type GatewayInputProfileGroup } from "./input-profile.core";

export const TAXONOMY_INPUT_PROFILES = Object.freeze({
  "taxonomy-list": profile({
    query: ["kind", "q", "page", "limit", "parentId"],
    requiredQuery: ["kind"],
  }),
  "taxonomy-write": profile({
    body: [
      "kind",
      "slug",
      "title",
      "description",
      "parentId",
      "isHidden",
      "sortOrder",
    ],
    requiredBody: ["kind", "slug", "title"],
  }),
  "taxonomy-patch": profile({
    params: ["id"],
    body: ["slug", "title", "description", "parentId", "isHidden", "sortOrder"],
    requiredParams: ["id"],
  }),
} satisfies GatewayInputProfileGroup);
