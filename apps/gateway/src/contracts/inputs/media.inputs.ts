import { profile, type GatewayInputProfileGroup } from "./input-profile.core";

const MEDIA_LIST_FIELDS = Object.freeze([
  "q",
  "search",
  "path",
  "take",
  "skip",
  "scope",
  "entityType",
  "entityId",
  "folderPath",
  "mimeType",
  "mediaType",
  "sortBy",
  "order",
  "status",
  "scanStatus",
] as const);

export const MEDIA_INPUT_PROFILES = Object.freeze({
  "media-public-list": profile({ query: MEDIA_LIST_FIELDS }),
  "media-admin-list": profile({ query: [...MEDIA_LIST_FIELDS, "ownerId"] }),
  "media-owned-list": profile({ query: MEDIA_LIST_FIELDS }),
  "media-presign": profile({
    body: [
      "filename",
      "mimeType",
      "folderPath",
      "displayName",
      "ownerId",
      "scope",
      "entityType",
      "entityId",
    ],
    requiredBody: ["filename", "mimeType"],
    rules: [
      {
        kind: "requires",
        location: "body",
        field: "entityType",
        required: ["entityId"],
      },
      {
        kind: "requires",
        location: "body",
        field: "entityId",
        required: ["entityType"],
      },
    ],
  }),
  "media-finalize": profile({
    body: [
      "storage",
      "path",
      "folderPath",
      "displayName",
      "originalFilename",
      "bucket",
      "filename",
      "mimeType",
      "ownerId",
      "scope",
      "entityType",
      "entityId",
      "sha256",
    ],
    requiredBody: ["storage", "path"],
    rules: [
      {
        kind: "requires",
        location: "body",
        field: "entityType",
        required: ["entityId"],
      },
      {
        kind: "requires",
        location: "body",
        field: "entityId",
        required: ["entityType"],
      },
    ],
  }),
  "media-read-url": profile({
    params: ["id"],
    query: ["download"],
    requiredParams: ["id"],
  }),
  "media-owned-read-url": profile({
    params: ["id"],
    query: ["scope", "entityType", "entityId", "download"],
    requiredParams: ["id"],
    requiredQuery: ["scope", "entityType", "entityId"],
  }),
  "media-delete-preview": profile({
    body: ["items", "recursive", "scope"],
    requiredBody: ["items"],
  }),
  "media-delete-confirm": profile({
    body: ["items", "recursive", "scope", "confirmToken"],
    requiredBody: ["items", "confirmToken"],
  }),
  "media-render": profile({
    params: ["id"],
    query: ["variant"],
    requiredParams: ["id"],
  }),
} satisfies GatewayInputProfileGroup);
