import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import process from "node:process";
import { URL } from "node:url";
import { createGatewayClient } from "../dist/index.js";
import { setTimeout as delay } from "node:timers/promises";
import { demoPng } from "../../../scripts/demo/png.mjs";

if (process.env.NODE_ENV === "production") {
  throw new Error("d1_references_live_refused_in_production");
}

const baseUrl =
  process.env.NEBULA_LIVE_GATEWAY_BASE_URL ?? "http://127.0.0.1:3002";
const admin = createGatewayClient({
  baseUrl,
  publicClientId: "admin-web-local",
  applicationOrigin: "http://localhost:3000",
});
const storefront = createGatewayClient({
  baseUrl,
  publicClientId: "storefront-web-local",
  applicationOrigin: "http://localhost:3008",
});
const png = demoPng(0);

function localMediaDatabaseUrl() {
  const value =
    process.env.E2E_MEDIA_DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:15432/nebula_media?schema=public";
  const parsed = new URL(value);
  if (
    parsed.protocol !== "postgresql:" ||
    !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
    parsed.pathname !== "/nebula_media"
  ) {
    throw new Error("d1_media_fixture_requires_local_nebula_media_database");
  }
  return value;
}

function success(label, result) {
  if (!result.ok) {
    const details = String(JSON.stringify(result.error)).slice(0, 300);
    throw new Error(`${label}_http_${result.status}_${details}`);
  }
  return result.data.data;
}

function assertProductResponseMediaIds(product) {
  for (const field of [
    "thumbnailUrl",
    "model3dUrl",
    "model3dPosterUrl",
    "vrPlanImageUrl",
  ]) {
    assert.equal(Object.hasOwn(product, field), false);
  }
}

const loginResponse = await admin.request("auth_login", {
  body: {
    identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
  },
});
const login = success("references_login", loginResponse);
const accessToken = login.accessToken;
const cookie = loginResponse.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("references_browser_cookie_missing");

const createdTaxonomyIds = [];
let productId = "";
let mediaId = "";
let mediaPrisma;
try {
  const suffix = randomUUID();
  const createTaxonomy = async (kind) => {
    const item = success(
      `references_${kind}_create`,
      await admin.request("admin_product_taxonomies_create", {
        accessToken,
        idempotencyKey: randomUUID(),
        body: {
          kind,
          slug: `d1-reference-${kind}-${suffix}`,
          title: `D1 reference ${kind} ${suffix}`,
        },
      }),
    );
    createdTaxonomyIds.push(item.id);
    return item.id;
  };
  const brandId = await createTaxonomy("brand");
  const tagId = await createTaxonomy("tag");

  const created = success(
    "references_product_create",
    await admin.request("admin_products_create", {
      accessToken,
      idempotencyKey: randomUUID(),
      body: {
        title: `D1 reference proof ${suffix}`,
        slug: `d1-reference-proof-${suffix}`,
        sku: `D1-REFERENCE-${suffix}`,
        price: 25,
        status: "ACTIVE",
        brandId,
        tagIds: [tagId],
      },
    }),
  );
  productId = created.id;
  assertProductResponseMediaIds(created);
  assert.equal(created.brandId, brandId);
  assert.deepEqual(created.tagIds, [tagId]);
  const publicProduct = success(
    "references_public_product",
    await storefront.request("products_get", { path: { id: productId } }),
  );
  assert.equal(publicProduct.brandId, brandId);
  assert.deepEqual(publicProduct.tagIds, [tagId]);
  assert.deepEqual(publicProduct.tags, []);
  assertProductResponseMediaIds(publicProduct);
  process.stdout.write("[d1-references-live] taxonomy-binding=ok\n");

  for (const field of ["model3dUrl", "model3dPosterUrl", "vrPlanImageUrl"]) {
    const rejectedCreate = await admin.request("admin_products_create", {
      accessToken,
      idempotencyKey: randomUUID(),
      body: {
        title: created.title,
        slug: created.slug,
        sku: created.sku,
        price: created.price,
        [field]: "https://provider.test/disabled-asset",
      },
    });
    assert.equal(rejectedCreate.status, 400);
    const rejectedPatch = await admin.request("admin_products_update", {
      accessToken,
      idempotencyKey: randomUUID(),
      path: { id: productId },
      body: {
        expectedVersion: created.version,
        [field]: "https://provider.test/disabled-asset",
      },
    });
    assert.equal(rejectedPatch.status, 400);
  }
  process.stdout.write("[d1-references-live] deferred-url-inputs-denied=ok\n");

  const wrongKind = await admin.request("admin_products_update", {
    accessToken,
    idempotencyKey: randomUUID(),
    path: { id: productId },
    body: { tagIds: [brandId], expectedVersion: created.version },
  });
  assert.equal(wrongKind.ok, false);
  assert.equal(wrongKind.status, 400);
  process.stdout.write("[d1-references-live] wrong-kind-denied=ok\n");

  const missingMedia = await admin.request("admin_products_update", {
    accessToken,
    idempotencyKey: randomUUID(),
    path: { id: productId },
    body: { thumbnailMediaId: randomUUID(), expectedVersion: created.version },
  });
  assert.equal(missingMedia.ok, false);
  assert.equal(missingMedia.status, 404);
  process.stdout.write("[d1-references-live] missing-media-denied=ok\n");

  const rawGallery = await admin.request("admin_products_gallery_add", {
    accessToken,
    idempotencyKey: randomUUID(),
    path: { id: productId },
    body: { images: [{ url: "https://legacy.example/image.jpg" }] },
  });
  assert.equal(rawGallery.ok, false);
  assert.equal(rawGallery.status, 400);
  process.stdout.write("[d1-references-live] raw-gallery-url-denied=ok\n");

  if (process.env.D1_READY_MEDIA_FIXTURE === "1") {
    const require = createRequire(import.meta.url);
    const {
      PrismaClient,
    } = require("../../../apps/media-service/prisma/generated");
    mediaPrisma = new PrismaClient({ datasourceUrl: localMediaDatabaseUrl() });
    const filename = `d1-reference-${suffix}.png`;
    const presigned = success(
      "references_media_presign",
      await admin.request("admin_media_public_presign", {
        accessToken,
        idempotencyKey: randomUUID(),
        body: {
          filename,
          mimeType: "image/png",
          folderPath: "/d1-reference-proof",
          displayName: filename,
          scope: "panel",
        },
      }),
    );
    const upload = await globalThis.fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: png,
    });
    assert.ok([200, 204].includes(upload.status), "references_media_upload");
    const media = success(
      "references_media_finalize",
      await admin.request("admin_media_public_finalize", {
        accessToken,
        idempotencyKey: randomUUID(),
        body: {
          storage: presigned.storage,
          bucket: presigned.bucket,
          path: presigned.path,
          filename: presigned.filename,
          mimeType: presigned.mimeType,
          folderPath: presigned.folderPath,
          displayName: presigned.displayName,
          originalFilename: presigned.originalFilename,
          scope: presigned.scope,
        },
      }),
    );
    mediaId = media.id;
    assert.equal(media.status, "PENDING");
    const readyDeadline = Date.now() + 60_000;
    let ready = false;
    while (Date.now() < readyDeadline) {
      const current = success(
        "references_media_processing",
        await admin.request("admin_media_get", {
          accessToken,
          path: { id: mediaId },
        }),
      );
      if (current.status === "READY" && current.scanStatus === "CLEAN") {
        ready = true;
        break;
      }
      if (current.status === "BLOCKED")
        throw new Error(
          `references_media_processing_failed_${current.quarantineReason}`,
        );
      await delay(500);
    }
    assert.equal(ready, true, "references_media_processing_timeout");

    const linked = success(
      "references_product_thumbnail",
      await admin.request("admin_products_update", {
        accessToken,
        idempotencyKey: randomUUID(),
        path: { id: productId },
        body: { thumbnailMediaId: mediaId, expectedVersion: created.version },
      }),
    );
    assert.equal(linked.thumbnailMediaId, mediaId);
    success(
      "references_product_gallery",
      await admin.request("admin_products_gallery_add", {
        accessToken,
        idempotencyKey: randomUUID(),
        path: { id: productId },
        body: { images: [{ mediaId, alt: "D1 reference proof" }] },
      }),
    );
    const publicLinked = success(
      "references_public_linked_product",
      await storefront.request("products_get", { path: { id: productId } }),
    );
    assert.equal(publicLinked.thumbnailMediaId, mediaId);
    assertProductResponseMediaIds(publicLinked);
    const adminLinked = success(
      "references_admin_linked_product",
      await admin.request("admin_products_get", {
        accessToken,
        path: { id: productId },
      }),
    );
    assert.equal(adminLinked.thumbnailMediaId, mediaId);
    assertProductResponseMediaIds(adminLinked);
    const gallery = success(
      "references_public_gallery",
      await storefront.request("products_gallery_list", {
        path: { id: productId },
      }),
    );
    assert.equal(gallery.length, 1);
    assert.equal(gallery[0].mediaId, mediaId);
    assert.equal(Object.hasOwn(gallery[0], "url"), false);
    const adminGallery = success(
      "references_admin_gallery",
      await admin.request("admin_products_gallery_list", {
        accessToken,
        path: { id: productId },
      }),
    );
    assert.equal(adminGallery[0].mediaId, mediaId);
    assert.equal(Object.hasOwn(adminGallery[0], "url"), false);
    const rendered = await storefront.request("media_render", {
      path: { id: mediaId },
      query: { variant: "web" },
    });
    assert.equal(rendered.ok, true);
    assert.deepEqual(Buffer.from(rendered.data), png);
    process.stdout.write("[d1-references-live] ready-media-bind-render=ok\n");

    await mediaPrisma.media.update({
      where: { id: mediaId },
      data: { status: "BLOCKED", scanStatus: "FAILED" },
    });
    const blockedRender = await storefront.request("media_render", {
      path: { id: mediaId },
      query: { variant: "web" },
    });
    assert.equal(blockedRender.ok, false);
    assert.equal(blockedRender.status, 403);
    const blockedProduct = await storefront.request("products_get", {
      path: { id: productId },
    });
    assert.equal(blockedProduct.ok, false);
    assert.equal(blockedProduct.status, 503);
    const blockedGallery = await storefront.request("products_gallery_list", {
      path: { id: productId },
    });
    assert.equal(blockedGallery.ok, false);
    assert.equal(blockedGallery.status, 503);
    const blockedPublication = await admin.request("admin_products_update", {
      accessToken,
      idempotencyKey: randomUUID(),
      path: { id: productId },
      body: { status: "ACTIVE", expectedVersion: linked.version },
    });
    assert.equal(blockedPublication.ok, false);
    assert.equal(blockedPublication.status, 403);
    await mediaPrisma.media.update({
      where: { id: mediaId },
      data: { status: "READY", scanStatus: "CLEAN" },
    });
    success(
      "references_republish_after_media_restore",
      await admin.request("admin_products_update", {
        accessToken,
        idempotencyKey: randomUUID(),
        path: { id: productId },
        body: { status: "ACTIVE", expectedVersion: linked.version },
      }),
    );
    success(
      "references_public_after_media_restore",
      await storefront.request("products_get", { path: { id: productId } }),
    );
    process.stdout.write("[d1-references-live] blocked-media-denial=ok\n");
  }
} finally {
  if (productId) {
    const gallery = success(
      "references_gallery_cleanup_list",
      await admin.request("admin_products_gallery_list", {
        accessToken,
        path: { id: productId },
      }),
    );
    for (const image of gallery) {
      success(
        "references_gallery_cleanup_remove",
        await admin.request("admin_products_gallery_remove", {
          accessToken,
          idempotencyKey: randomUUID(),
          path: { id: productId, imageId: image.id },
          query: { hardDelete: true },
        }),
      );
    }
    success(
      "references_product_cleanup",
      await admin.request("admin_products_hard_delete", {
        accessToken,
        idempotencyKey: randomUUID(),
        path: { id: productId },
      }),
    );
  }
  for (const id of createdTaxonomyIds.reverse()) {
    success(
      "references_taxonomy_cleanup",
      await admin.request("admin_product_taxonomies_delete", {
        accessToken,
        idempotencyKey: randomUUID(),
        path: { id },
      }),
    );
  }
  if (mediaId) {
    const items = [{ type: "file", id: mediaId }];
    const preview = success(
      "references_media_delete_preview",
      await admin.request("admin_media_public_delete_preview", {
        accessToken,
        idempotencyKey: randomUUID(),
        body: { items, scope: "panel" },
      }),
    );
    assert.equal(preview.canDelete, true);
    const deleted = success(
      "references_media_delete_confirm",
      await admin.request("admin_media_public_delete_confirm", {
        accessToken,
        idempotencyKey: randomUUID(),
        body: { items, scope: "panel", confirmToken: preview.confirmToken },
      }),
    );
    assert.equal(deleted.deleted, true);
  }
  await mediaPrisma?.$disconnect();
  success(
    "references_logout",
    await admin.request("auth_logout", {
      accessToken,
      browserCookie: cookie,
      idempotencyKey: randomUUID(),
      body: {},
    }),
  );
}

process.stdout.write("[d1-references-live] cleanup=ok\n");
