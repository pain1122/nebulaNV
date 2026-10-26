import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import console from "node:console";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import {
  buildD1Catalog,
  negativeProductCases,
  DEMO_NAMESPACE,
} from "./catalog.mjs";
import { demoPng } from "./png.mjs";

export const digest = (value) =>
  createHash("sha256")
    .update(
      typeof value === "string" || Buffer.isBuffer(value)
        ? value
        : JSON.stringify(value),
    )
    .digest("hex");
const filename = (item) => `${DEMO_NAMESPACE}-${item.key}.png`;
const folderPath = `/${DEMO_NAMESPACE}`;
const views = ["thumbnail", "card", "detail", "mobile"];
const productSearch = "DEMO-D1-";

export async function verifyDemoPublicPagination(api, visible) {
  const listed = [];
  const pages = Math.ceil(visible.length / 100);
  for (let page = 1; page <= pages + 1; page += 1) {
    const batch = await api.call(
      "products_list",
      {
        query: { q: productSearch, page, limit: 100 },
      },
      "anonymous",
    );
    const expectedCount = Math.max(
      0,
      Math.min(100, visible.length - (page - 1) * 100),
    );
    assert.equal(
      batch.length,
      expectedCount,
      `demo_public_pagination_page_${page}_count`,
    );
    listed.push(...batch.map((row) => row.id));
  }
  assert.equal(
    new Set(listed).size,
    listed.length,
    "demo_public_pagination_duplicate_ids",
  );
  const expected = new Set(visible);
  for (const id of listed)
    assert.ok(expected.has(id), `demo_public_pagination_unexpected_id_${id}`);
}

export function demoImageRecipes(item, mediaState) {
  return item.recipes.map((recipe) => {
    if (recipe.watermark?.kind === "text") {
      return {
        ...recipe,
        watermark: { width: 160, height: 32, ...recipe.watermark },
      };
    }
    if (!recipe.watermark?.mediaKey) return recipe;
    const { mediaKey, ...watermark } = recipe.watermark;
    return {
      ...recipe,
      watermark: { ...watermark, mediaId: mediaState[mediaKey].id },
    };
  });
}

export function createDemoRunner({
  api,
  state,
  save,
  profile = "showcase",
  sleep = delay,
  now = Date.now,
  log = console.log,
}) {
  const plan = buildD1Catalog(profile);
  const all = buildD1Catalog("limits");
  if (state.target && api.baseUrl)
    assert.equal(state.target, api.baseUrl, "demo_journal_target_mismatch");
  if (api.baseUrl && !state.target) state.target = api.baseUrl;
  const productGet = (id) => api.call("admin_products_get", { path: { id } });
  const mediaGet = (id) => api.call("admin_media_get", { path: { id } });
  const galleryGet = (id) =>
    api.call("admin_products_gallery_list", {
      path: { id },
      query: { includeDeleted: true },
    });
  const derivativeGet = (id) =>
    api.call("admin_media_derivatives_get", { path: { id } });

  async function waitFor(read, check, label) {
    const deadline = now() + 180_000;
    do {
      const value = await read();
      if (check(value)) return value;
      if (["BLOCKED", "FAILED", "DELETED"].includes(value.status))
        throw new Error(`demo_${label}_failed`);
      await sleep(1000);
    } while (now() < deadline);
    throw new Error(`demo_${label}_timeout`);
  }

  async function currency() {
    const setting = await api.call("settings_get", {
      path: { ns: "pricing", key: "default_currency" },
    });
    assert.equal(setting.found, true, "demo_shop_currency_missing");
    assert.match(setting.value, /^[A-Z]{3,8}$/u, "demo_shop_currency_invalid");
    if (state.currency)
      assert.equal(
        state.currency,
        setting.value,
        "demo_shop_currency_changed_reset_required",
      );
    else {
      state.currency = setting.value;
      await save();
    }
    return setting.value;
  }

  async function listProducts(q = productSearch) {
    const rows = [];
    for (let page = 1; page <= 100; page += 1) {
      const batch = await api.call("admin_products_list", {
        query: { ...(q ? { q } : {}), includeDeleted: true, page, limit: 100 },
      });
      rows.push(...batch);
      if (batch.length < 100) return rows;
    }
    throw new Error("demo_product_lookup_page_bound");
  }

  function checkDefinition(entry, item) {
    assert.equal(
      entry.definitionHash,
      digest(item),
      `demo_definition_changed_${item.key}_reset_required`,
    );
  }
  function ownProduct(product, item) {
    assert.equal(
      product.slug,
      item.body.slug,
      "demo_product_ownership_mismatch",
    );
    assert.equal(product.sku, item.body.sku, "demo_product_ownership_mismatch");
  }
  function ownMedia(media, item) {
    assert.equal(
      media.displayName,
      filename(item),
      "demo_media_ownership_mismatch",
    );
    assert.equal(media.folderPath, folderPath, "demo_media_ownership_mismatch");
    assert.equal(media.scope, "panel", "demo_media_ownership_mismatch");
  }
  function ownTaxonomy(row, item) {
    assert.equal(row.slug, item.slug, "demo_taxonomy_ownership_mismatch");
    assert.equal(row.kind, item.kind, "demo_taxonomy_ownership_mismatch");
    assert.equal(
      row.description,
      item.description,
      "demo_taxonomy_ownership_mismatch",
    );
    assert.equal(row.isSystem, false, "demo_system_taxonomy_refused");
  }

  async function sourceChecksum(id, item) {
    const checksum = digest(await api.render(id, "web"));
    assert.equal(
      checksum,
      digest(demoPng(item.index, item)),
      "demo_source_checksum_mismatch",
    );
    return checksum;
  }

  const mediaFacts = (row, generation, checksum) => ({
    title: row.title,
    defaultAlt: row.defaultAlt,
    metadataVersion: row.metadataVersion,
    sha256: checksum,
    width: row.width,
    height: row.height,
    generationId: generation.approvedGenerationId,
    outputs: generation.outputs.map(
      ({ view, sha256, width, height, recipeHash }) => ({
        view,
        sha256,
        width,
        height,
        recipeHash,
      }),
    ),
  });
  const productFacts = (row, gallery) => ({
    version: row.version,
    deletedAt: row.deletedAt,
    variants: row.variants,
    gallery,
  });

  async function seedTaxonomies() {
    for (const item of plan.taxonomies) {
      const existing = state.taxonomies[item.key];
      if (existing) {
        checkDefinition(existing, item);
        const row = await api.call("product_taxonomies_get", {
          path: { id: existing.id },
        });
        ownTaxonomy(row, item);
        assert.equal(row.title, item.title, "demo_taxonomy_drift");
        assert.equal(row.isHidden, item.isHidden, "demo_taxonomy_drift");
        assert.equal(row.sortOrder, item.sortOrder, "demo_taxonomy_drift");
        assert.equal(
          row.parentId || "",
          item.parent ? state.taxonomies[item.parent].id : "",
          "demo_taxonomy_drift",
        );
        continue;
      }
      const rows = await api.call("product_taxonomies_list", {
        query: { kind: item.kind, q: item.slug, limit: 100 },
      });
      assert.equal(
        rows.some((row) => row.slug === item.slug),
        false,
        "demo_unjournaled_taxonomy_collision",
      );
      const { key, parent, ...body } = item;
      const row = await api.call("admin_product_taxonomies_create", {
        body: {
          ...body,
          ...(parent ? { parentId: state.taxonomies[parent].id } : {}),
        },
      });
      state.taxonomies[key] = { id: row.id, definitionHash: digest(item) };
      await save();
    }
  }

  async function seedMedia() {
    for (const item of plan.media) {
      let entry = state.media[item.key];
      if (entry) checkDefinition(entry, item);
      else {
        const rows = await api.call("admin_media_public_list", {
          query: { folderPath, q: filename(item), scope: "panel", take: 100 },
        });
        assert.equal(
          rows.some((row) => row.displayName === filename(item)),
          false,
          "demo_unjournaled_media_collision",
        );
        const presign = await api.call("admin_media_public_presign", {
          body: {
            filename: filename(item),
            displayName: filename(item),
            folderPath,
            scope: "panel",
            mimeType: "image/png",
          },
        });
        await api.upload(presign.uploadUrl, demoPng(item.index, item));
        const row = await api.call("admin_media_public_finalize", {
          body: {
            storage: presign.storage,
            bucket: presign.bucket,
            path: presign.path,
            filename: presign.filename,
            mimeType: presign.mimeType,
            folderPath: presign.folderPath,
            displayName: presign.displayName,
            originalFilename: presign.originalFilename,
            scope: presign.scope,
          },
        });
        entry = state.media[item.key] = {
          id: row.id,
          definitionHash: digest(item),
        };
        await save();
      }
      const row = await waitFor(
        () => mediaGet(entry.id),
        (value) => value.status === "READY" && value.scanStatus === "CLEAN",
        "media_approval",
      );
      ownMedia(row, item);
      const checksum = await sourceChecksum(entry.id, item);
      if (
        !entry.facts &&
        (row.title !== item.title || row.defaultAlt !== item.defaultAlt)
      ) {
        await api.call("admin_media_metadata_update", {
          path: { id: entry.id },
          body: {
            expectedVersion: row.metadataVersion,
            title: item.title,
            defaultAlt: item.defaultAlt,
          },
        });
      }
      const generation = await waitFor(
        () => derivativeGet(entry.id),
        (value) =>
          value.status === "COMPLETED" &&
          value.approvedGenerationId === value.desiredGenerationId &&
          value.outputs.length === 4,
        "saved_sizes",
      );
      if (entry.facts)
        assert.deepEqual(
          mediaFacts(await mediaGet(entry.id), generation, checksum),
          entry.facts,
          "demo_media_drift_reset_required",
        );
    }
    for (const item of plan.media) {
      const entry = state.media[item.key];
      if (item.recipes && !entry.recipesApplied) {
        const recipes = demoImageRecipes(item, state.media);
        await api.call("admin_media_derivatives_regenerate", {
          path: { id: entry.id },
          body: { recipes },
        });
        await waitFor(
          () => derivativeGet(entry.id),
          (value) =>
            value.status === "COMPLETED" &&
            value.approvedGenerationId === value.desiredGenerationId,
          "custom_recipes",
        );
        entry.recipesApplied = true;
      }
      if (!entry.facts) {
        entry.facts = mediaFacts(
          await mediaGet(entry.id),
          await derivativeGet(entry.id),
          await sourceChecksum(entry.id, item),
        );
        await save();
      }
    }
  }

  function bodyFor(item) {
    return {
      ...item.body,
      currency: state.currency,
      categoryId: state.taxonomies[item.category].id,
      brandId: state.taxonomies[item.brand].id,
      tagIds: item.tags.map((key) => state.taxonomies[key].id).sort(),
      ...(item.thumbnail
        ? { thumbnailMediaId: state.media[item.thumbnail].id }
        : {}),
    };
  }

  async function seedProducts() {
    const existing = await listProducts();
    for (const item of plan.products) {
      let entry = state.products[item.key];
      if (entry) {
        checkDefinition(entry, item);
        ownProduct(await productGet(entry.id), item);
      } else {
        assert.equal(
          existing.some(
            (row) => row.slug === item.body.slug || row.sku === item.body.sku,
          ),
          false,
          "demo_unjournaled_product_collision",
        );
        const row = await api.call("admin_products_create", {
          body: { ...bodyFor(item), status: "DRAFT" },
        });
        entry = state.products[item.key] = {
          id: row.id,
          definitionHash: digest(item),
        };
        await save();
      }
      let row = await productGet(entry.id);
      if (entry.facts) {
        assert.deepEqual(
          productFacts(row, await galleryGet(entry.id)),
          entry.facts,
          "demo_product_drift_reset_required",
        );
        continue;
      }
      if (!item.softDeleted)
        assert.equal(row.deletedAt || "", "", "demo_partial_product_deleted");
      for (const variant of item.variants) {
        let current = row.variants.find((value) => value.sku === variant.sku);
        if (!current) {
          const body = { ...variant };
          delete body.key;
          delete body.softDeleted;
          row = await api.call("admin_products_variants_create", {
            path: { id: entry.id },
            body: { ...body, expectedVersion: row.version },
          });
          current = row.variants.find((value) => value.sku === variant.sku);
        }
        if (variant.softDeleted && !current.deletedAt)
          row = await api.call("admin_products_variants_delete", {
            path: { id: entry.id, variantId: current.id },
            query: { expectedVersion: row.version },
          });
      }
      const gallery = await galleryGet(entry.id);
      assert.ok(
        gallery.length <= item.gallery.length,
        "demo_partial_gallery_drift",
      );
      for (let index = 0; index < item.gallery.length; index += 1) {
        const image = gallery[index];
        const mediaId = state.media[item.gallery[index]].id;
        if (image) {
          assert.equal(image.mediaId, mediaId, "demo_partial_gallery_drift");
          assert.equal(image.sort, index, "demo_partial_gallery_drift");
        } else {
          await api.call("admin_products_gallery_add", {
            path: { id: entry.id },
            body: {
              images: [
                { mediaId, sort: index, ...(item.galleryText?.[index] ?? {}) },
              ],
            },
          });
        }
      }
      row = await productGet(entry.id);
      if (row.status !== item.body.status)
        row = await api.call("admin_products_update", {
          path: { id: entry.id },
          body: { status: item.body.status, expectedVersion: row.version },
        });
      if (item.softDeleted && !row.deletedAt)
        row = await api.call("admin_products_delete", {
          path: { id: entry.id },
        });
      entry.facts = productFacts(row, await galleryGet(entry.id));
      await save();
    }
  }

  async function verifyMedia(item) {
    const entry = state.media[item.key];
    assert.ok(entry?.facts, `demo_media_incomplete_${item.key}`);
    const row = await mediaGet(entry.id);
    ownMedia(row, item);
    assert.equal(row.status, "READY");
    assert.equal(row.scanStatus, "CLEAN");
    const generation = await derivativeGet(entry.id);
    assert.equal(generation.status, "COMPLETED");
    assert.equal(
      generation.approvedGenerationId,
      generation.desiredGenerationId,
    );
    assert.deepEqual(
      mediaFacts(row, generation, await sourceChecksum(entry.id, item)),
      entry.facts,
      "demo_media_drift",
    );
    assert.deepEqual(
      generation.outputs.map((output) => output.view).sort(),
      [...views].sort(),
    );
    assert.equal(row.title, item.title);
    assert.equal(row.defaultAlt, item.defaultAlt);
    for (const output of generation.outputs) {
      assert.equal(
        digest(await api.render(entry.id, output.view)),
        output.sha256,
      );
      const recipe = item.recipes?.find((value) => value.view === output.view);
      if (recipe?.fit === "cover") {
        assert.equal(output.width, recipe.width);
        assert.equal(output.height, recipe.height);
      }
    }
  }

  async function verifyProduct(item) {
    const entry = state.products[item.key];
    assert.ok(entry?.facts, `demo_product_incomplete_${item.key}`);
    checkDefinition(entry, item);
    const row = await productGet(entry.id);
    ownProduct(row, item);
    assert.deepEqual(
      productFacts(row, await galleryGet(entry.id)),
      entry.facts,
      "demo_product_drift",
    );
    for (const [key, value] of Object.entries(bodyFor(item))) {
      if (key === "thumbnailTitle" || key === "thumbnailAlt")
        assert.equal(row[`${key}Override`], value);
      else
        assert.deepEqual(
          row[key === "content" ? "description" : key],
          value,
          `demo_product_field_${item.key}_${key}`,
        );
    }
    assert.equal(
      Boolean(row.deletedAt),
      Boolean(item.softDeleted),
      `demo_lifecycle_${item.key}`,
    );
    assert.equal(
      row.effectivePrice,
      item.expectedEffectivePrice,
      `demo_effective_price_${item.key}`,
    );
    for (const variant of item.variants) {
      const actual = row.variants.find((value) => value.sku === variant.sku);
      const label = `demo_variant_${item.key}_${variant.key}`;
      assert.ok(actual, `${label}_missing`);
      assert.deepEqual(actual.options, variant.options, `${label}_options`);
      assert.equal(
        actual.priceOverride,
        variant.priceOverride ?? null,
        `${label}_price_override`,
      );
      for (const key of ["active", "stockQuantity", "sortOrder"])
        assert.equal(
          actual[key],
          key === "active" && variant.softDeleted ? false : variant[key],
          `${label}_${key}`,
        );
      assert.equal(
        Boolean(actual.deletedAt),
        Boolean(variant.softDeleted),
        `${label}_deleted`,
      );
      assert.equal(
        actual.availability,
        !variant.active ||
          variant.softDeleted ||
          (item.body.trackInventory && variant.stockQuantity === 0)
          ? "OUT_OF_STOCK"
          : "AVAILABLE",
        `${label}_availability`,
      );
    }
    const response = await api.result(
      "products_get",
      { path: { id: entry.id } },
      "anonymous",
    );
    assert.equal(
      response.status,
      item.expectedPublic ? 200 : 404,
      `demo_visibility_${item.key}`,
    );
    if (item.expectedPublic) {
      const publicRow = response.data.data;
      assert.ok(!Object.hasOwn(publicRow, "thumbnailAltOverride"));
      assert.deepEqual(
        publicRow.variants.map((variant) => variant.sku),
        item.variants
          .filter((variant) => variant.active && !variant.softDeleted)
          .map((variant) => variant.sku),
        `demo_public_variant_membership_${item.key}`,
      );
      for (const actual of publicRow.variants) {
        const expected = item.variants.find(
          (variant) => variant.sku === actual.sku,
        );
        assert.equal(
          actual.availability,
          item.body.trackInventory && expected.stockQuantity === 0
            ? "OUT_OF_STOCK"
            : "AVAILABLE",
          `demo_public_variant_${item.key}_${expected.key}_availability`,
        );
      }
      if (item.thumbnail) {
        const media = plan.media.find((value) => value.key === item.thumbnail);
        assert.equal(
          publicRow.thumbnailAlt,
          item.body.thumbnailAlt ?? media.defaultAlt,
        );
        assert.equal(
          publicRow.thumbnailTitle,
          item.body.thumbnailTitle ?? media.title,
        );
      }
      const gallery = await api.call(
        "products_gallery_list",
        { path: { id: entry.id } },
        "anonymous",
      );
      assert.equal(gallery.length, item.gallery.length);
      gallery.forEach((image, index) => {
        const media = plan.media.find(
          (value) => value.key === item.gallery[index],
        );
        const text = item.galleryText?.[index] ?? {};
        assert.equal(image.mediaId, state.media[media.key].id);
        assert.equal(image.sort, index);
        assert.equal(image.alt, text.alt ?? media.defaultAlt);
        assert.equal(image.title, text.title ?? media.title);
      });
    }
  }

  async function verify({ negative = true } = {}) {
    await currency();
    for (const item of plan.taxonomies) {
      const entry = state.taxonomies[item.key];
      assert.ok(entry, `demo_taxonomy_missing_${item.key}`);
      checkDefinition(entry, item);
      const row = await api.call("product_taxonomies_get", {
        path: { id: entry.id },
      });
      ownTaxonomy(row, item);
      assert.equal(row.title, item.title);
      assert.equal(row.isHidden, item.isHidden);
      assert.equal(
        row.parentId || "",
        item.parent ? state.taxonomies[item.parent].id : "",
      );
    }
    for (const item of plan.media) await verifyMedia(item);
    for (const item of plan.products) await verifyProduct(item);
    if (negative) {
      const fixture = bodyFor(plan.products[0]);
      for (const denied of negativeProductCases(state.currency)) {
        const response = await api.result("admin_products_create", {
          body: {
            ...fixture,
            slug: `${DEMO_NAMESPACE}-deny-${denied.key}`,
            sku: `DEMO-D1-DENY-${denied.key}`,
            ...denied.body,
          },
        });
        if (response.ok)
          await api.call("admin_products_hard_delete", {
            path: { id: response.data.data.id },
          });
        assert.equal(
          response.status,
          denied.status,
          `demo_negative_${denied.key}`,
        );
      }
      const id = state.products.classic.id;
      assert.equal(
        (await api.result("admin_products_get", { path: { id } }, "user"))
          .status,
        403,
        "demo_user_admin_denial",
      );
      assert.equal(
        await api.anonymousWrite(fixture),
        401,
        "demo_anonymous_write_denial",
      );
      assert.equal(
        (
          await api.result("admin_products_create", {
            body: { ...fixture, slug: `${DEMO_NAMESPACE}-sku-collision` },
          })
        ).status,
        409,
        "demo_sku_collision_denial",
      );
      const tooManyImages = Array.from({ length: 51 }, () => ({
        mediaId: state.media.front.id,
      }));
      assert.equal(
        (
          await api.result("admin_products_gallery_add", {
            path: { id },
            body: { images: tooManyImages },
          })
        ).status,
        400,
        "demo_gallery_request_limit",
      );
      if (profile === "limits") {
        const boundary = await productGet(state.products["variant-limits"].id);
        assert.equal(
          (
            await api.result("admin_products_variants_create", {
              path: { id: boundary.id },
              body: {
                expectedVersion: boundary.version,
                sku: "DEMO-D1-LIMIT-51",
                options: { Extra: "51" },
                stockQuantity: 1,
              },
            })
          ).status,
          400,
          "demo_variant_capacity_limit",
        );
        const visible = plan.products
          .filter((item) => item.expectedPublic)
          .map((item) => state.products[item.key].id)
          .sort();
        await verifyDemoPublicPagination(api, visible);
      }
    }
    log(
      `[demo-d1] verified profile=${profile} products=${plan.products.length} media=${plan.media.length} taxonomies=${plan.taxonomies.length}`,
    );
  }

  async function seed() {
    await currency();
    await seedTaxonomies();
    await seedMedia();
    await seedProducts();
    await verify();
    state.profiles[profile] = digest(plan);
    await save();
    log(
      `[demo-d1] seed complete; reruns verify existing records without rewriting them`,
    );
  }

  async function reset() {
    // Preflight every journalled owner before the first deletion.
    const present = { products: [], media: [], taxonomies: [] };
    for (const kind of Object.keys(present)) {
      for (const [key, entry] of Object.entries(state[kind])) {
        const item = all[kind].find((value) => value.key === key);
        const operation =
          kind === "products"
            ? "admin_products_get"
            : kind === "media"
              ? "admin_media_get"
              : "product_taxonomies_get";
        const result = await api.result(operation, { path: { id: entry.id } });
        if (
          result.status === 404 ||
          (kind === "media" &&
            result.ok &&
            result.data.data.status === "DELETED")
        )
          continue;
        assert.ok(result.ok, `demo_reset_preflight_${kind}_${result.status}`);
        ({ products: ownProduct, media: ownMedia, taxonomies: ownTaxonomy })[
          kind
        ](result.data.data, item);
        present[kind].push([key, entry]);
      }
    }
    const ownedProducts = new Set(
      Object.values(state.products).map((entry) => entry.id),
    );
    const ownedTaxonomies = new Set(
      Object.values(state.taxonomies).map((entry) => entry.id),
    );
    if (ownedTaxonomies.size) {
      for (const product of await listProducts(null)) {
        if (ownedProducts.has(product.id)) continue;
        assert.equal(
          [product.categoryId, product.brandId, ...product.tagIds].some((id) =>
            ownedTaxonomies.has(id),
          ),
          false,
          "demo_reset_external_taxonomy_reference",
        );
      }
    }
    for (const [key, entry] of present.products) {
      for (const image of await galleryGet(entry.id))
        await api.call("admin_products_gallery_remove", {
          path: { id: entry.id, imageId: image.id },
          query: { hardDelete: true },
        });
      await api.call("admin_products_hard_delete", { path: { id: entry.id } });
      delete state.products[key];
      await save();
    }
    // Media service evaluates references and authorizes each exact file plan.
    for (const [key, entry] of present.media) {
      const items = [{ type: "file", id: entry.id }];
      const preview = await api.call("admin_media_public_delete_preview", {
        body: { items, scope: "panel" },
      });
      const deleted = await api.call("admin_media_public_delete_confirm", {
        body: { items, scope: "panel", confirmToken: preview.confirmToken },
      });
      assert.equal(deleted.deleted, true, "demo_media_reset_failed");
      delete state.media[key];
      await save();
    }
    for (const [key, entry] of present.taxonomies.reverse()) {
      await api.call("admin_product_taxonomies_delete", {
        path: { id: entry.id },
      });
      delete state.taxonomies[key];
      await save();
    }
    state.products = {};
    state.media = {};
    state.taxonomies = {};
    state.profiles = {};
    state.currency = null;
    await save();
    log("[demo-d1] reset complete; only journalled demo records were targeted");
  }
  return { seed, verify, reset, plan };
}
