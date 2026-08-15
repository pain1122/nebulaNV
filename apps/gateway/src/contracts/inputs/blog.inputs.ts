import { profile, type GatewayInputProfileGroup } from "./input-profile.core";

export const BLOG_INPUT_PROFILES = Object.freeze({
  "blog-list": profile({
    query: ["q", "tag", "category", "page", "limit"],
  }),
  "blog-write": profile({
    body: [
      "title",
      "slug",
      "body",
      "excerpt",
      "coverImageUrl",
      "status",
      "tags",
      "categories",
      "metaTitle",
      "metaDescription",
      "metaKeywords",
    ],
  }),
  "blog-patch": profile({
    params: ["id"],
    body: [
      "title",
      "body",
      "excerpt",
      "coverImageUrl",
      "status",
      "tags",
      "categories",
      "metaTitle",
      "metaDescription",
      "metaKeywords",
    ],
    requiredParams: ["id"],
  }),
} satisfies GatewayInputProfileGroup);
