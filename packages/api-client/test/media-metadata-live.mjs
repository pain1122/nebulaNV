import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

export async function runMediaMetadata({
  admin,
  storefront,
  accessToken,
  mediaId,
  sourceBytes,
  success,
}) {
  const request = (operation, input = {}) =>
    admin.request(operation, {
      accessToken,
      signal: globalThis.AbortSignal.timeout(10_000),
      ...input,
    });
  const read = async () =>
    success(
      "metadata_get",
      await request("admin_media_get", { path: { id: mediaId } }),
    );
  const patch = async (body) =>
    success(
      "metadata_update",
      await request("admin_media_metadata_update", {
        path: { id: mediaId },
        body,
        idempotencyKey: randomUUID(),
      }),
    );
  const derivatives = async () =>
    success(
      "metadata_derivatives",
      await request("admin_media_derivatives_get", { path: { id: mediaId } }),
    );
  const deadline = Date.now() + 120_000;
  let approved;
  while (Date.now() < deadline) {
    approved = await derivatives();
    if (approved.status === "COMPLETED" && approved.outputs.length === 4) break;
    if (approved.status === "FAILED")
      throw new Error("metadata_saved_presets_failed");
    await delay(500);
  }
  assert.equal(approved.status, "COMPLETED", "metadata_presets_timeout");
  const original = await read();
  const imageFacts = (value) =>
    Object.fromEntries(
      [
        "path",
        "filename",
        "displayName",
        "sha256",
        "width",
        "height",
        "status",
        "scanStatus",
        "etag",
        "promotedAt",
      ].map((key) => [key, value[key]]),
    );
  let productId, userToken, userCookie, failure;
  const cleanupFailures = [];
  try {
    let metadata = await patch({
      expectedVersion: original.metadataVersion,
      title: "لیوان آبی",
      defaultAlt: "Blue mug",
    });
    assert.deepEqual(
      [metadata.title, metadata.defaultAlt],
      ["لیوان آبی", "Blue mug"],
    );
    const suffix = randomUUID().slice(0, 8);
    let product = success(
      "metadata_product_create",
      await request("admin_products_create", {
        idempotencyKey: randomUUID(),
        body: {
          title: `Metadata proof ${suffix}`,
          sku: `META-${suffix}`,
          slug: `metadata-${suffix}`,
          price: 25,
          status: "ACTIVE",
          thumbnailMediaId: mediaId,
        },
      }),
    );
    productId = product.id;
    assert.equal(product.thumbnailAlt, "Blue mug");
    const gallery = success(
      "metadata_gallery_add",
      await request("admin_products_gallery_add", {
        path: { id: productId },
        idempotencyKey: randomUUID(),
        body: {
          images: [{ mediaId }, { mediaId, alt: "", title: "Product view" }],
        },
      }),
    );
    const inherited = gallery.find((row) => row.altOverride === null);
    const decorative = gallery.find((row) => row.altOverride === "");
    assert.ok(inherited && decorative);
    assert.equal(inherited.alt, "Blue mug");
    assert.equal(decorative.alt, "");
    assert.equal(decorative.title, "Product view");

    metadata = await patch({
      expectedVersion: metadata.metadataVersion,
      defaultAlt: "Updated default",
    });
    assert.equal(metadata.title, "لیوان آبی", "omitted_title_changed");
    product = success(
      "metadata_public_product",
      await storefront.request("products_get", {
        path: { id: productId },
        signal: globalThis.AbortSignal.timeout(10_000),
      }),
    );
    assert.equal(product.thumbnailAlt, "Updated default");
    assert.equal(Object.hasOwn(product, "thumbnailAltOverride"), false);
    const publicGallery = success(
      "metadata_public_gallery",
      await storefront.request("products_gallery_list", {
        path: { id: productId },
        signal: globalThis.AbortSignal.timeout(10_000),
      }),
    );
    assert.equal(
      publicGallery.find((row) => row.id === inherited.id).alt,
      "Updated default",
    );
    assert.equal(publicGallery.find((row) => row.id === decorative.id).alt, "");
    process.stdout.write(
      "[media-metadata-live] Unicode-defaults-inheritance-decorative-alt=ok\n",
    );

    product = success(
      "metadata_thumbnail_override",
      await request("admin_products_update", {
        path: { id: productId },
        idempotencyKey: randomUUID(),
        body: {
          expectedVersion: product.version,
          thumbnailAlt: "",
          thumbnailTitle: "Product thumbnail",
        },
      }),
    );
    assert.equal(product.thumbnailAlt, "");
    product = success(
      "metadata_thumbnail_reset",
      await request("admin_products_update", {
        path: { id: productId },
        idempotencyKey: randomUUID(),
        body: {
          expectedVersion: product.version,
          thumbnailAlt: null,
          thumbnailTitle: null,
        },
      }),
    );
    assert.equal(product.thumbnailAlt, "Updated default");
    assert.equal(product.thumbnailTitle, "لیوان آبی");
    const resetGallery = success(
      "metadata_gallery_reset",
      await request("admin_products_gallery_metadata_update", {
        path: { id: productId, imageId: decorative.id },
        idempotencyKey: randomUUID(),
        body: {
          expectedVersion: decorative.metadataVersion,
          alt: null,
          title: null,
        },
      }),
    );
    assert.equal(
      resetGallery.find((row) => row.id === decorative.id).alt,
      "Updated default",
    );
    const staleGallery = await request(
      "admin_products_gallery_metadata_update",
      {
        path: { id: productId, imageId: decorative.id },
        idempotencyKey: randomUUID(),
        body: { expectedVersion: decorative.metadataVersion, alt: "stale" },
      },
    );
    assert.equal(staleGallery.status, 409);
    process.stdout.write(
      "[media-metadata-live] contextual-edits-reset-stale-gallery-denial=ok\n",
    );

    const revision = metadata.metadataVersion;
    const races = await Promise.all(
      ["Race one", "Race two"].map((defaultAlt) =>
        request("admin_media_metadata_update", {
          path: { id: mediaId },
          idempotencyKey: randomUUID(),
          body: { expectedVersion: revision, defaultAlt },
        }),
      ),
    );
    assert.deepEqual(races.map((result) => result.status).sort(), [200, 409]);
    metadata = await read();
    assert.equal(metadata.metadataVersion, revision + 1);
    assert.ok(["Race one", "Race two"].includes(metadata.defaultAlt));
    metadata = await patch({
      expectedVersion: metadata.metadataVersion,
      title: null,
      defaultAlt: "",
    });
    assert.equal(metadata.title, null);
    assert.equal(metadata.defaultAlt, "");
    process.stdout.write(
      "[media-metadata-live] concurrent-edit-single-winner-null-empty-preserved=ok\n",
    );

    for (const body of [
      { expectedVersion: metadata.metadataVersion },
      { expectedVersion: metadata.metadataVersion, title: "x".repeat(201) },
      {
        expectedVersion: metadata.metadataVersion,
        defaultAlt: "x".repeat(181),
      },
      {
        expectedVersion: metadata.metadataVersion,
        title: "x",
        ownerId: randomUUID(),
      },
    ]) {
      assert.equal(
        (
          await request("admin_media_metadata_update", {
            path: { id: mediaId },
            idempotencyKey: randomUUID(),
            body,
          })
        ).status,
        400,
      );
    }
    const login = await admin.request("auth_login", {
      body: {
        identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
        password: process.env.SEED_USER_PASS ?? "User123!",
      },
    });
    userToken = success("metadata_user_login", login).accessToken;
    userCookie = login.headers.get("set-cookie")?.split(";", 1)[0];
    assert.equal(
      (
        await request("admin_media_metadata_update", {
          accessToken: userToken,
          path: { id: mediaId },
          idempotencyKey: randomUUID(),
          body: { expectedVersion: metadata.metadataVersion, title: "denied" },
        })
      ).status,
      403,
    );
    assert.equal((await read()).metadataVersion, metadata.metadataVersion);
    process.stdout.write(
      "[media-metadata-live] invalid-input-user-writes-denied=ok\n",
    );

    assert.deepEqual(imageFacts(await read()), imageFacts(original));
    assert.deepEqual(
      await derivatives(),
      approved,
      "metadata_changed_saved_generation",
    );
    for (const output of approved.outputs) {
      const render = await storefront.request("media_render", {
        path: { id: mediaId },
        query: { variant: output.view },
        signal: globalThis.AbortSignal.timeout(10_000),
      });
      assert.equal(render.ok, true);
      assert.equal(
        createHash("sha256").update(Buffer.from(render.data)).digest("hex"),
        output.sha256,
      );
    }
    const source = await storefront.request("media_render", {
      path: { id: mediaId },
      query: { variant: "web" },
      signal: globalThis.AbortSignal.timeout(10_000),
    });
    assert.equal(source.ok, true);
    assert.deepEqual(Buffer.from(source.data), sourceBytes);
    process.stdout.write(
      "[media-metadata-live] original-saved-bytes-generation-unchanged=ok\n",
    );
  } catch (error) {
    failure = error;
  } finally {
    if (productId) {
      try {
        const rows = success(
          "metadata_cleanup_gallery",
          await request("admin_products_gallery_list", {
            path: { id: productId },
          }),
        );
        for (const image of rows)
          success(
            "metadata_cleanup_image",
            await request("admin_products_gallery_remove", {
              path: { id: productId, imageId: image.id },
              query: { hardDelete: true },
              idempotencyKey: randomUUID(),
            }),
          );
        success(
          "metadata_cleanup_product",
          await request("admin_products_hard_delete", {
            path: { id: productId },
            idempotencyKey: randomUUID(),
          }),
        );
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    if (userToken && userCookie) {
      try {
        success(
          "metadata_user_logout",
          await request("auth_logout", {
            accessToken: userToken,
            cookie: userCookie,
            idempotencyKey: randomUUID(),
          }),
        );
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
  }
  if (failure || cleanupFailures.length)
    throw new AggregateError(
      [...(failure ? [failure] : []), ...cleanupFailures],
      "media_metadata_proof_failed",
    );
  process.stdout.write("[media-metadata-live] product-fixture-cleanup=ok\n");
}
