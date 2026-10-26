import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";
const { Headers, Response } = globalThis;
import { buildD1Catalog } from "./catalog.mjs";
import { demoPng } from "./png.mjs";
import { emptyState, validateState, withJournal } from "./state.mjs";
import {
  createDemoRunner,
  demoImageRecipes,
  digest,
  verifyDemoPublicPagination,
} from "./runner.mjs";
import {
  connectGateway,
  createDemoRequestLimiter,
  unwrapGatewayResult,
  validateTarget,
} from "./gateway.mjs";

test("profiles are deterministic, bounded and preserve the same showcase definitions", () => {
  const showcase = buildD1Catalog();
  const limits = buildD1Catalog("limits");
  assert.deepEqual(buildD1Catalog(), showcase);
  assert.deepEqual(
    limits.products.slice(0, showcase.products.length),
    showcase.products,
  );
  assert.deepEqual(limits.media.slice(0, 2), showcase.media);
  assert.equal(showcase.products.length, 18);
  assert.equal(limits.products.length, 122);
  assert.equal(limits.media.length, 50);
  assert.equal(
    limits.products.find((item) => item.key === "variant-limits").variants
      .length,
    50,
  );
  assert.equal(
    limits.products.find((item) => item.key === "relation-limits").gallery
      .length,
    50,
  );
  assert.equal(
    limits.products.find((item) => item.key === "relation-limits").tags.length,
    64,
  );
  assert.equal(
    showcase.products.find((item) => item.key === "decorative").body
      .thumbnailAlt,
    "",
  );
  assert.match(
    showcase.products.find((item) => item.key === "unicode").title,
    /کیف/u,
  );
  assert.throws(() => buildD1Catalog("unknown"));
});

test("every catalogue input passes the actual Gateway DTO boundary", () => {
  const require = createRequire(
    new URL("../../apps/gateway/package.json", import.meta.url),
  );
  require("ts-node").register({
    project: fileURLToPath(
      new URL("../../apps/gateway/tsconfig.json", import.meta.url),
    ),
    transpileOnly: true,
  });
  const { plainToInstance } = require("class-transformer");
  const { validateSync } = require("class-validator");
  const product = require(
    fileURLToPath(
      new URL(
        "../../apps/gateway/src/product/product-api.dto.ts",
        import.meta.url,
      ),
    ),
  );
  const { GatewayTaxonomyWriteDto } = require(
    fileURLToPath(
      new URL(
        "../../apps/gateway/src/taxonomy/taxonomy-api.dto.ts",
        import.meta.url,
      ),
    ),
  );
  const { GatewayImageRegenerationDto } = require(
    fileURLToPath(
      new URL(
        "../../apps/gateway/src/media/media-derivatives-api.dto.ts",
        import.meta.url,
      ),
    ),
  );
  const check = (type, value, label) =>
    assert.deepEqual(
      validateSync(plainToInstance(type, value), {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
      [],
      label,
    );
  for (const item of buildD1Catalog("limits").products) {
    check(product.GatewayProductWriteDto, item.body, item.key);
    for (const variant of item.variants) {
      const body = { ...variant };
      delete body.key;
      delete body.softDeleted;
      check(
        product.GatewayVariantWriteDto,
        { ...body, expectedVersion: 1 },
        variant.key,
      );
    }
  }
  for (const item of buildD1Catalog("limits").taxonomies) {
    const body = { ...item };
    delete body.key;
    delete body.parent;
    check(GatewayTaxonomyWriteDto, body, item.key);
  }
  const recipes = demoImageRecipes(buildD1Catalog().media[0], {
    detail: { id: randomUUID() },
  });
  check(GatewayImageRegenerationDto, { recipes }, "image recipes");
});

test("resolved demo recipes pass the owning Media validator for both profiles", () => {
  const require = createRequire(
    new URL("../../apps/media-service/package.json", import.meta.url),
  );
  require("ts-node").register({
    project: fileURLToPath(
      new URL("../../apps/media-service/tsconfig.json", import.meta.url),
    ),
    transpileOnly: true,
  });
  const {
    imagePresets,
    imageRecipeRegion,
  } = require("./src/processing/image-recipes.ts");
  for (const profile of ["showcase", "limits"]) {
    const item = buildD1Catalog(profile).media[0];
    const original = globalThis.structuredClone(item);
    const watermarkId = randomUUID();
    const recipes = demoImageRecipes(item, { detail: { id: watermarkId } });
    const normalized = imagePresets(JSON.stringify(recipes));
    for (const recipe of normalized) imageRecipeRegion(item, recipe);
    assert.equal(normalized.length, 4);
    assert.deepEqual(
      [normalized[1].watermark.width, normalized[1].watermark.height],
      [160, 32],
    );
    assert.equal(normalized[2].watermark.mediaId, watermarkId);
    assert.deepEqual(
      item,
      original,
      "journal definition must remain unchanged",
    );
    const missingSize = globalThis.structuredClone(recipes);
    delete missingSize[1].watermark.width;
    assert.throws(
      () => imagePresets(JSON.stringify(missingSize)),
      /image_recipe_number_invalid/u,
    );
  }
});

test("Gateway failure diagnostics retain nested error details and request ID", () => {
  assert.throws(
    () =>
      unwrapGatewayResult("regenerate", {
        ok: false,
        status: 400,
        error: {
          error: {
            code: "VALIDATION_FAILED",
            message: "Request validation failed",
            details: [
              { field: "body.recipes", code: "image_recipe_number_invalid" },
            ],
          },
          requestId: "demo-request-123",
        },
      }),
    (error) => {
      assert.match(
        error.message,
        /demo_regenerate_http_400_VALIDATION_FAILED/u,
      );
      assert.match(error.message, /image_recipe_number_invalid/u);
      assert.match(error.message, /demo-request-123/u);
      return true;
    },
  );
  assert.deepEqual(
    unwrapGatewayResult("read", {
      ok: true,
      data: { data: { id: "same-id" } },
    }),
    { id: "same-id" },
  );
});

function throttleHarness() {
  let time = 0;
  const waits = [];
  const limit = createDemoRequestLimiter({
    now: () => time,
    sleep: async (ms) => {
      waits.push(ms);
      time += ms;
    },
    log: () => {},
  });
  return { limit, waits };
}
function limitedResponse(seconds = "1") {
  return {
    status: 429,
    error: { error: { code: "RATE_LIMITED" } },
    headers: new Headers(
      seconds === null ? {} : { "Retry-After-gateway": seconds },
    ),
  };
}

test("rate limiting honors the named retry header with bounded wait chunks", async () => {
  const h = throttleHarness();
  let calls = 0;
  const success = { status: 200, headers: new Headers() };
  assert.equal(
    await h.limit(async () =>
      ++calls === 1 ? limitedResponse("60") : success,
    ),
    success,
  );
  assert.equal(calls, 2);
  assert.equal(
    h.waits.reduce((sum, ms) => sum + ms, 0),
    60_250,
  );
  assert.ok(h.waits.every((ms) => ms <= 10_000));
});

test("exhausted advertised quota pauses the next request before sending it", async () => {
  const h = throttleHarness();
  await h.limit(async () => ({
    status: 200,
    headers: new Headers({
      "X-RateLimit-Remaining-gateway": "0",
      "X-RateLimit-Reset-gateway": "2",
    }),
  }));
  assert.deepEqual(h.waits, []);
  await h.limit(async () => {
    assert.deepEqual(h.waits, [2250]);
    return { status: 200 };
  });
});

test("rate-limit retries are bounded and missing or oversized retry headers fail immediately", async () => {
  const h = throttleHarness();
  let calls = 0;
  const failure = limitedResponse();
  assert.equal(
    await h.limit(async () => {
      calls += 1;
      return failure;
    }),
    failure,
  );
  assert.equal(calls, 4);
  for (const header of [null, "181", "invalid"]) {
    const fresh = throttleHarness();
    const result = limitedResponse(header);
    assert.equal(await fresh.limit(async () => result), result);
    assert.deepEqual(fresh.waits, []);
  }
});

test("network and non-rate-limit responses are never retried", async () => {
  for (const status of [400, 401, 403, 409, 503, 429]) {
    const h = throttleHarness();
    let calls = 0;
    const response = {
      status,
      error: { error: { code: "OTHER" } },
      headers: new Headers(),
    };
    assert.equal(
      await h.limit(async () => {
        calls += 1;
        return response;
      }),
      response,
    );
    assert.equal(calls, 1);
    assert.deepEqual(h.waits, []);
  }
  const h = throttleHarness();
  await assert.rejects(
    h.limit(async () => {
      throw new Error("network_failure");
    }),
    /network_failure/u,
  );
  assert.deepEqual(h.waits, []);
});

test("Gateway mutation retries keep their idempotency key and renew request timeouts", async () => {
  const originalFetch = globalThis.fetch;
  const patches = [];
  const h = throttleHarness();
  let api;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith("/auth/login"))
      return new Response(
        JSON.stringify({ data: { accessToken: "test-token" } }),
        {
          status: 200,
          headers: { "Set-Cookie": "demo_session=test; HttpOnly" },
        },
      );
    if (init.method === "PATCH") {
      patches.push(init);
      if (patches.length === 1)
        return new Response(
          JSON.stringify({ error: { code: "RATE_LIMITED" } }),
          { status: 429, headers: { "Retry-After-gateway": "1" } },
        );
    }
    return new Response(JSON.stringify({ data: { success: true } }), {
      status: 200,
    });
  };
  try {
    api = await connectGateway({}, { limitRequest: h.limit });
    const result = await api.result("admin_media_metadata_update", {
      path: { id: randomUUID() },
      body: { expectedVersion: 1, title: "Demo" },
    });
    assert.equal(result.ok, true);
    assert.equal(patches.length, 2);
    const key = (request) =>
      Object.entries(request.headers).find(
        ([name]) => name.toLowerCase() === "idempotency-key",
      )?.[1];
    assert.ok(key(patches[0]));
    assert.equal(key(patches[0]), key(patches[1]));
    assert.notEqual(patches[0].signal, patches[1].signal);
    assert.deepEqual(h.waits, [1250]);
  } finally {
    try {
      if (api) await api.close();
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});

test("PNG generation preserves the original default and supports landscape fixtures without invalid sizes", () => {
  assert.deepEqual(demoPng(1), demoPng(1, { width: 64, height: 64 }));
  const png = demoPng(1, { width: 640, height: 480 });
  assert.equal(png.readUInt32BE(16), 640);
  assert.equal(png.readUInt32BE(20), 480);
  assert.throws(() => demoPng(1, { width: 4096, height: 4096 }));
  assert.throws(() => demoPng(1, { width: 0 }));
});

test("target guard rejects production, remote hosts and embedded credentials", () => {
  assert.equal(validateTarget({}), "http://127.0.0.1:3002");
  for (const env of [
    { NODE_ENV: " Production " },
    { NEBULA_LIVE_GATEWAY_BASE_URL: "http://example.com" },
    { NEBULA_LIVE_GATEWAY_BASE_URL: "http://user:secret@localhost:3002" },
    { NEBULA_LIVE_GATEWAY_BASE_URL: "http://localhost:3002/subpath" },
  ])
    assert.throws(() => validateTarget(env));
});

test("ownership journal refuses unknown fixtures, foreign namespaces and invalid IDs", () => {
  for (const state of [
    { ...emptyState(), namespace: "foreign" },
    { ...emptyState(), products: { foreign: { id: randomUUID() } } },
    { ...emptyState(), media: { front: { id: "invalid" } } },
  ])
    assert.throws(() => validateState(state));
});

test("journal persists IDs and serializes concurrent runs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nebula-demo-test-"));
  try {
    await withJournal(directory, async ({ state, save }) => {
      state.products.classic = { id: randomUUID(), definitionHash: "test" };
      await save();
      await assert.rejects(
        withJournal(directory, async () => {}),
        /already_locked/u,
      );
    });
    const bytes = await readFile(join(directory, "d1.json"), "utf8");
    assert.equal(JSON.parse(bytes).namespace, emptyState().namespace);
    await withJournal(directory, async ({ state }) =>
      assert.ok(state.products.classic.id),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function harness(profile = "showcase") {
  const state = emptyState();
  const calls = [];
  const plan = buildD1Catalog(profile);
  const rows = { products: {}, media: {}, taxonomies: {}, galleries: {} };
  const projectProduct = (row) => {
    const definition = plan.products.find(
      (item) => item.body.slug === row.slug,
    );
    const media = rows.media[row.thumbnailMediaId];
    return globalThis.structuredClone({
      ...row,
      variants: (row.variants ?? []).map((variant) => ({
        ...variant,
        availability:
          !variant.active ||
          variant.deletedAt ||
          (row.trackInventory && variant.stockQuantity === 0)
            ? "OUT_OF_STOCK"
            : "AVAILABLE",
      })),
      effectivePrice: definition?.expectedEffectivePrice ?? row.price,
      thumbnailAltOverride: row.thumbnailAlt ?? null,
      thumbnailTitleOverride: row.thumbnailTitle ?? null,
      thumbnailAlt: row.thumbnailAlt ?? media?.defaultAlt ?? "",
      thumbnailTitle: row.thumbnailTitle ?? media?.title ?? "",
    });
  };
  const projectGallery = (id) =>
    globalThis.structuredClone(
      rows.galleries[id].map((image) => ({
        ...image,
        alt: image.alt ?? rows.media[image.mediaId].defaultAlt,
        title: image.title ?? rows.media[image.mediaId].title,
      })),
    );
  const visible = (row) =>
    !row.deletedAt &&
    row.status === "ACTIVE" &&
    (row.selectionMode === "VARIANT"
      ? row.variants.some(
          (variant) =>
            variant.active &&
            !variant.deletedAt &&
            (!row.trackInventory || variant.stockQuantity > 0),
        )
      : !row.trackInventory || row.stockQuantity > 0);
  const publicProduct = (row) => {
    const result = projectProduct(row);
    delete result.thumbnailAltOverride;
    delete result.thumbnailTitleOverride;
    result.variants = result.variants.filter(
      (variant) => variant.active && !variant.deletedAt,
    );
    return result;
  };
  const productList = (input, publicOnly) => {
    const query = input.query ?? {};
    const search = (query.q ?? "").toLowerCase();
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    return Object.values(rows.products)
      .filter((row) => !publicOnly || visible(row))
      .filter(
        (row) =>
          !search ||
          (row.title ?? "").toLowerCase().includes(search) ||
          (row.sku ?? "").toLowerCase().includes(search),
      )
      .slice((page - 1) * limit, page * limit)
      .map(publicOnly ? publicProduct : projectProduct);
  };
  const ready = (id) => ({
    status: "COMPLETED",
    approvedGenerationId: id,
    desiredGenerationId: id,
    outputs: ["thumbnail", "card", "detail", "mobile"].map((view) => ({
      view,
      sha256: digest(view),
      width:
        plan.media[0].recipes.find((recipe) => recipe.view === view)?.width ??
        96,
      height:
        plan.media[0].recipes.find((recipe) => recipe.view === view)?.height ??
        96,
      recipeHash: digest(view),
    })),
  });
  let failOnce;
  const api = {
    async call(operation, input = {}) {
      calls.push({ operation, input });
      if (failOnce === operation) {
        failOnce = undefined;
        throw new Error("simulated_outage");
      }
      if (operation === "settings_get") return { found: true, value: "USD" };
      if (operation === "admin_products_list") return productList(input, false);
      if (operation === "products_list") return productList(input, true);
      if (
        operation === "product_taxonomies_list" ||
        operation === "admin_media_public_list"
      )
        return [];
      if (operation === "admin_product_taxonomies_create") {
        const row = {
          id: randomUUID(),
          parentId: "",
          isSystem: false,
          ...input.body,
        };
        rows.taxonomies[row.id] = row;
        return row;
      }
      if (operation === "product_taxonomies_get")
        return rows.taxonomies[input.path.id];
      if (operation === "admin_products_get")
        return projectProduct(rows.products[input.path.id]);
      if (operation === "admin_media_get")
        return globalThis.structuredClone(rows.media[input.path.id]);
      if (operation === "admin_media_derivatives_get")
        return ready(input.path.id);
      if (operation === "admin_media_public_presign")
        return {
          ...input.body,
          uploadUrl: "http://localhost/upload",
          storage: "s3",
          bucket: "test",
          path: "test",
          originalFilename: input.body.filename,
        };
      if (operation === "admin_media_public_finalize") {
        const definition = plan.media.find((item) =>
          input.body.displayName.endsWith(`-${item.key}.png`),
        );
        const row = {
          id: randomUUID(),
          ...input.body,
          status: "READY",
          scanStatus: "CLEAN",
          // New uploads keep the legacy hash empty; verified bytes are separate.
          sha256: "",
          width: definition.width,
          height: definition.height,
          metadataVersion: 1,
          title: null,
          defaultAlt: null,
        };
        rows.media[row.id] = row;
        return row;
      }
      if (operation === "admin_media_metadata_update") {
        Object.assign(rows.media[input.path.id], input.body);
        rows.media[input.path.id].metadataVersion += 1;
        return rows.media[input.path.id];
      }
      if (operation === "admin_media_derivatives_regenerate")
        return ready(input.path.id);
      if (operation === "admin_products_create") {
        const row = {
          id: randomUUID(),
          ...input.body,
          description: input.body.content,
          version: 1,
          deletedAt: "",
          variants: [],
        };
        rows.products[row.id] = row;
        rows.galleries[row.id] = [];
        return projectProduct(row);
      }
      if (operation === "admin_products_variants_create") {
        const row = rows.products[input.path.id];
        row.version += 1;
        row.variants.push({
          id: randomUUID(),
          ...input.body,
          priceOverride: input.body.priceOverride ?? null,
          deletedAt: "",
        });
        return projectProduct(row);
      }
      if (operation === "admin_products_variants_delete") {
        const row = rows.products[input.path.id];
        row.version += 1;
        const variant = row.variants.find(
          (variant) => variant.id === input.path.variantId,
        );
        variant.deletedAt = "deleted";
        variant.active = false;
        return projectProduct(row);
      }
      if (
        operation === "admin_products_gallery_list" ||
        operation === "products_gallery_list"
      )
        return projectGallery(input.path.id);
      if (operation === "admin_products_gallery_add") {
        rows.galleries[input.path.id].push(
          ...input.body.images.map((image) => ({ id: randomUUID(), ...image })),
        );
        return rows.galleries[input.path.id];
      }
      if (operation === "admin_products_update") {
        const row = rows.products[input.path.id];
        Object.assign(row, input.body);
        row.version += 1;
        return projectProduct(row);
      }
      if (operation === "admin_products_delete") {
        rows.products[input.path.id].deletedAt = "deleted";
        return globalThis.structuredClone(rows.products[input.path.id]);
      }
      if (operation === "admin_products_gallery_remove") {
        rows.galleries[input.path.id] = rows.galleries[input.path.id].filter(
          (image) => image.id !== input.path.imageId,
        );
        return [];
      }
      if (operation === "admin_products_hard_delete") {
        delete rows.products[input.path.id];
        return {};
      }
      if (operation === "admin_media_public_delete_preview")
        return { confirmToken: "test-token" };
      if (operation === "admin_media_public_delete_confirm") {
        delete rows.media[input.body.items[0].id];
        return { deleted: true };
      }
      if (operation === "admin_product_taxonomies_delete") {
        delete rows.taxonomies[input.path.id];
        return { deleted: true };
      }
      throw new Error(`unexpected_simulated_operation_${operation}`);
    },
    async result(operation, input, identity) {
      if (identity === "user") return { ok: false, status: 403 };
      if (
        operation === "admin_products_create" &&
        input.body.slug.endsWith("-sku-collision")
      )
        return { ok: false, status: 409 };
      if (
        operation === "admin_products_create" &&
        input.body.slug.includes("-deny-")
      )
        return { ok: false, status: 400 };
      if (
        operation === "admin_products_gallery_add" &&
        input.body.images.length === 51
      )
        return { ok: false, status: 400 };
      if (
        operation === "admin_products_variants_create" &&
        rows.products[input.path.id].variants.length >= 50
      )
        return { ok: false, status: 400 };
      if (operation === "products_get") {
        const row = rows.products[input.path.id];
        if (!visible(row)) return { ok: false, status: 404 };
        return { ok: true, status: 200, data: { data: publicProduct(row) } };
      }
      const kind = {
        admin_products_get: "products",
        admin_media_get: "media",
        product_taxonomies_get: "taxonomies",
      }[operation];
      if (!kind) throw new Error(`unexpected_simulated_result_${operation}`);
      const row = rows[kind][input.path.id];
      return row
        ? {
            ok: true,
            status: 200,
            data: { data: globalThis.structuredClone(row) },
          }
        : { ok: false, status: 404 };
    },
    async upload() {},
    async render(id, view) {
      if (view !== "web") return Buffer.from(view);
      const item = plan.media.find((definition) =>
        rows.media[id].displayName.endsWith(`-${definition.key}.png`),
      );
      return demoPng(item.index, item);
    },
    async anonymousWrite() {
      return 401;
    },
  };
  const runner = createDemoRunner({
    api,
    state,
    profile,
    save: async () => {},
    log: () => {},
  });
  return {
    state,
    calls,
    rows,
    api,
    runner,
    fail: (operation) => {
      failOnce = operation;
    },
  };
}

test("partial seed journals created records before later failure", async () => {
  const h = harness();
  h.fail("admin_media_metadata_update");
  await assert.rejects(h.runner.seed(), /simulated_outage/u);
  assert.equal(Object.keys(h.state.taxonomies).length, 7);
  assert.ok(h.state.media.front.id);
  assert.equal(Object.keys(h.state.products).length, 0);
  assert.equal(
    h.calls.filter((call) => call.operation === "admin_media_public_finalize")
      .length,
    1,
  );
});

test("seed resumes an outage, reuses IDs on rerun and performs no fixture rewrites", async () => {
  const h = harness();
  h.fail("admin_media_metadata_update");
  await assert.rejects(h.runner.seed(), /simulated_outage/u);
  const firstMediaId = h.state.media.front.id;
  await h.runner.seed();
  assert.equal(h.state.media.front.id, firstMediaId);
  assert.equal(
    h.calls.filter((call) => call.operation === "admin_media_public_finalize")
      .length,
    2,
  );
  const snapshot = globalThis.structuredClone(h.state);
  const offset = h.calls.length;
  await h.runner.seed();
  assert.deepEqual(h.state, snapshot);
  assert.equal(
    h.calls
      .slice(offset)
      .some((call) =>
        /create|finalize|update|regenerate|delete|gallery_add/u.test(
          call.operation,
        ),
      ),
    false,
  );
});

test("seed and verify hash delivered originals with empty legacy checksums", async () => {
  const h = harness();
  await h.runner.seed();
  const entry = h.state.media.front;
  assert.equal(h.rows.media[entry.id].sha256, "");
  assert.equal(entry.facts.sha256, digest(await h.api.render(entry.id, "web")));
  await h.runner.verify();
});

test("corrupt delivered originals are rejected and the journal resumes without duplicate uploads", async () => {
  const h = harness();
  const render = h.api.render.bind(h.api);
  h.api.render = async (id, view) =>
    view === "web" ? Buffer.from("corrupt original") : render(id, view);
  await assert.rejects(h.runner.seed(), /demo_source_checksum_mismatch/u);
  const id = h.state.media.front.id;
  assert.equal(h.state.media.front.facts, undefined);
  assert.equal(Object.keys(h.state.products).length, 0);

  h.api.render = render;
  await h.runner.seed();
  assert.equal(h.state.media.front.id, id);
  assert.equal(
    h.calls.filter((call) => call.operation === "admin_media_public_finalize")
      .length,
    2,
  );
  h.api.render = async (mediaId, view) =>
    view === "web" ? Buffer.from("corrupt original") : render(mediaId, view);
  await assert.rejects(h.runner.verify(), /demo_source_checksum_mismatch/u);
});

test("deleted variants become inactive while public out-of-stock variants remain visible", async () => {
  const h = harness();
  await h.runner.seed();
  const id = h.state.products.variants.id;
  const admin = await h.api.call("admin_products_get", { path: { id } });
  const deleted = admin.variants.find((variant) =>
    variant.sku.endsWith("OLD-XL"),
  );
  assert.equal(deleted.active, false);
  assert.ok(deleted.deletedAt);
  const response = await h.api.result(
    "products_get",
    { path: { id } },
    "anonymous",
  );
  assert.deepEqual(
    response.data.data.variants.map((variant) => [
      variant.sku,
      variant.availability,
    ]),
    [
      ["DEMO-D1-SHIRT-BLUE-M", "AVAILABLE"],
      ["DEMO-D1-SHIRT-RED-S", "OUT_OF_STOCK"],
    ],
  );
});

test("incorrect deleted activation is rejected with a fixture-specific assertion", async () => {
  const h = harness();
  const call = h.api.call.bind(h.api);
  h.api.call = async (operation, input) => {
    const result = await call(operation, input);
    if (operation === "admin_products_variants_delete") {
      h.rows.products[input.path.id].variants.find(
        (variant) => variant.id === input.path.variantId,
      ).active = true;
    }
    return result;
  };
  await assert.rejects(h.runner.seed(), /demo_variant_variants_old-xl_active/u);
});

test("public out-of-stock variants must retain their availability declaration", async () => {
  const h = harness();
  await h.runner.seed();
  const result = h.api.result.bind(h.api);
  h.api.result = async (operation, input, identity) => {
    const response = await result(operation, input, identity);
    if (
      operation === "products_get" &&
      response.ok &&
      input.path.id === h.state.products.variants.id
    ) {
      response.data.data.variants.find((variant) =>
        variant.sku.endsWith("RED-S"),
      ).availability = "AVAILABLE";
    }
    return response;
  };
  await assert.rejects(
    h.runner.verify({ negative: false }),
    /demo_public_variant_variants_red-s_availability/u,
  );
});

test("limits seed and rerun exercise actual search fields and three public pagination pages", async () => {
  const h = harness("limits");
  await h.runner.seed();
  assert.equal(Object.keys(h.state.products).length, 122);
  assert.equal(Object.keys(h.state.media).length, 50);
  assert.equal(Object.keys(h.state.taxonomies).length, 71);
  assert.ok(h.state.profiles.limits);
  assert.equal(
    (
      await h.api.call("products_list", {
        query: { q: "nebula-demo-d1-v1", page: 1, limit: 100 },
      })
    ).length,
    0,
  );
  const queries = h.calls.filter(
    (call) =>
      call.operation === "products_list" && call.input.query.q === "DEMO-D1-",
  );
  assert.deepEqual(
    queries.map((call) => call.input.query.page),
    [1, 2, 3],
  );
  const snapshot = globalThis.structuredClone(h.state);
  const offset = h.calls.length;
  await h.runner.seed();
  assert.deepEqual(h.state, snapshot);
  assert.equal(
    h.calls
      .slice(offset)
      .some((call) =>
        /create|finalize|update|regenerate|delete|gallery_add/u.test(
          call.operation,
        ),
      ),
    false,
  );
});

test("SKU search detects an unjournaled demo Product before any duplicate creation", async () => {
  const h = harness();
  await h.runner.seed();
  const id = h.state.products.classic.id;
  delete h.state.products.classic;
  const offset = h.calls.length;
  await assert.rejects(h.runner.seed(), /demo_unjournaled_product_collision/u);
  assert.ok(h.rows.products[id]);
  assert.equal(
    h.calls
      .slice(offset)
      .some((call) => call.operation === "admin_products_create"),
    false,
  );
});

test("public pagination rejects missing, duplicate, unowned and trailing rows", async () => {
  const ids = Array.from({ length: 118 }, () => randomUUID());
  const pages = [ids.slice(0, 100), ids.slice(100), []].map((page) =>
    page.map((id) => ({ id })),
  );
  const variants = [
    { mutate: (p) => p[1].pop(), error: /page_2_count/u },
    {
      mutate: (p) => {
        p[1][0] = p[0][0];
      },
      error: /duplicate_ids/u,
    },
    {
      mutate: (p) => {
        p[1][0] = { id: randomUUID() };
      },
      error: /unexpected_id/u,
    },
    { mutate: (p) => p[2].push({ id: randomUUID() }), error: /page_3_count/u },
  ];
  for (const variant of variants) {
    const changed = globalThis.structuredClone(pages);
    variant.mutate(changed);
    await assert.rejects(
      verifyDemoPublicPagination(
        { call: async (_operation, input) => changed[input.query.page - 1] },
        ids,
      ),
      variant.error,
    );
  }
});

test("completed fixture drift is refused rather than overwritten", async () => {
  const h = harness();
  await h.runner.seed();
  h.rows.products[h.state.products.classic.id].version += 1;
  await assert.rejects(h.runner.seed(), /drift_reset_required/u);
});

test("reset removes the owned graph in dependency order and a fresh seed recreates it", async () => {
  const h = harness();
  await h.runner.seed();
  const previous = h.state.products.classic.id;
  const offset = h.calls.length;
  await h.runner.reset();
  const operations = h.calls.slice(offset).map((call) => call.operation);
  assert.ok(
    operations.indexOf("admin_products_gallery_remove") <
      operations.indexOf("admin_products_hard_delete"),
  );
  assert.ok(
    operations.lastIndexOf("admin_products_hard_delete") <
      operations.indexOf("admin_media_public_delete_confirm"),
  );
  assert.ok(
    operations.lastIndexOf("admin_media_public_delete_confirm") <
      operations.indexOf("admin_product_taxonomies_delete"),
  );
  assert.equal(Object.keys(h.state.products).length, 0);
  await h.runner.seed();
  assert.notEqual(h.state.products.classic.id, previous);
});

test("reset preflights every owner before deleting anything", async () => {
  const h = harness();
  const item = buildD1Catalog().products[0];
  const id = randomUUID();
  h.state.products.classic = { id, definitionHash: digest(item) };
  h.rows.products[id] = {
    id,
    slug: "someone-elses-product",
    sku: item.body.sku,
  };
  await assert.rejects(h.runner.reset(), /ownership_mismatch/u);
  assert.equal(
    h.calls.some((call) => /delete|remove/u.test(call.operation)),
    false,
  );
});

test("reset refuses taxonomy references from an unowned Product", async () => {
  const h = harness();
  const item = buildD1Catalog().taxonomies[0];
  const id = randomUUID();
  h.state.taxonomies.collection = { id, definitionHash: digest(item) };
  h.rows.taxonomies[id] = { ...item, id, isSystem: false };
  h.rows.products.external = {
    id: randomUUID(),
    categoryId: id,
    brandId: "",
    tagIds: [],
  };
  await assert.rejects(h.runner.reset(), /external_taxonomy_reference/u);
  assert.equal(
    h.calls.some((call) => /delete|remove/u.test(call.operation)),
    false,
  );
});

test("reset handles already removed records and leaves external records intact", async () => {
  const h = harness();
  h.state.products.classic = {
    id: randomUUID(),
    definitionHash: digest(buildD1Catalog().products[0]),
  };
  h.rows.products.external = {
    id: randomUUID(),
    slug: "external",
    sku: "external",
  };
  await h.runner.reset();
  assert.equal(Object.keys(h.state.products).length, 0);
  assert.ok(h.rows.products.external);
});
