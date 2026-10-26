import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

export async function runImageDerivatives({
  admin,
  storefront,
  accessToken,
  mediaId,
  sourceBytes,
  success,
}) {
  const path = { id: mediaId };
  const get = async () =>
    success(
      "derivatives_get",
      await admin.request("admin_media_derivatives_get", {
        accessToken,
        path,
        signal: globalThis.AbortSignal.timeout(10_000),
      }),
    );
  const request = async (body) =>
    success(
      "derivatives_regenerate",
      await admin.request("admin_media_derivatives_regenerate", {
        accessToken,
        path,
        body,
        idempotencyKey: randomUUID(),
        signal: globalThis.AbortSignal.timeout(10_000),
      }),
    );
  async function wait(id) {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      const result = await get();
      if (id && result.desiredGenerationId !== id)
        throw new Error("derivatives_generation_changed");
      if (
        result.status === "COMPLETED" &&
        result.approvedGenerationId === result.desiredGenerationId
      )
        return result;
      if (["FAILED", "CANCELLED"].includes(result.status))
        throw new Error(`derivatives_failed_${result.lastError}`);
      await delay(500);
    }
    throw new Error("derivatives_processing_timeout");
  }
  const defaults = await wait();
  assert.deepEqual(defaults.outputs.map((o) => o.view).sort(), [
    "card",
    "detail",
    "mobile",
    "thumbnail",
  ]);
  for (const output of defaults.outputs) {
    assert.ok(
      output.width <= 64 && output.height <= 64,
      "derivatives_must_not_enlarge",
    );
    const rendered = await storefront.request("media_render", {
      path,
      query: { variant: output.view },
    });
    assert.equal(rendered.ok, true);
    assert.equal(
      createHash("sha256").update(Buffer.from(rendered.data)).digest("hex"),
      output.sha256,
    );
  }
  process.stdout.write("[media-derivatives-live] automatic-saved-presets=ok\n");
  const recipes = [
    {
      view: "card",
      width: 24,
      height: 16,
      fit: "cover",
      format: "png",
      crop: { left: 8, top: 8, width: 48, height: 32 },
    },
    { view: "detail", width: 32, height: 16, fit: "inside", format: "png" },
    {
      view: "mobile",
      width: 32,
      height: 32,
      fit: "cover",
      format: "png",
      watermark: {
        kind: "image",
        mediaId,
        width: 8,
        height: 8,
        margin: 1,
        opacity: 0.5,
      },
    },
    {
      view: "thumbnail",
      width: 32,
      height: 32,
      fit: "cover",
      format: "png",
      watermark: {
        kind: "text",
        text: "Demo <&>",
        width: 24,
        height: 8,
        margin: 1,
        opacity: 0.6,
      },
    },
  ];
  const queued = await request({ recipes });
  assert.ok(queued.desiredGenerationId);
  if (queued.status !== "COMPLETED")
    assert.equal(queued.approvedGenerationId, defaults.approvedGenerationId);
  const repeated = await request({ recipes });
  assert.equal(
    repeated.desiredGenerationId,
    queued.desiredGenerationId,
    "identical_recipes_must_deduplicate",
  );
  const saved = await wait(queued.desiredGenerationId);
  assert.notEqual(saved.approvedGenerationId, defaults.approvedGenerationId);
  assert.equal(saved.outputs.length, 4);
  for (const output of saved.outputs) {
    const rendered = await storefront.request("media_render", {
      path,
      query: { variant: output.view },
    });
    assert.equal(rendered.ok, true);
    const bytes = Buffer.from(rendered.data);
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.deepEqual(
      [bytes.readUInt32BE(16), bytes.readUInt32BE(20)],
      [output.width, output.height],
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      output.sha256,
    );
    assert.equal(output.generationId, saved.approvedGenerationId);
    assert.equal(
      output.renderPath,
      `/api/v1/media/render/${mediaId}?variant=${output.view}`,
    );
    assert.ok(
      !("bucket" in output) && !("path" in output) && !("url" in output),
      "saved_size_must_not_expose_storage",
    );
  }
  const dimensions = Object.fromEntries(
    saved.outputs.map((o) => [o.view, [o.width, o.height]]),
  );
  assert.deepEqual(dimensions.card, [24, 16]);
  assert.deepEqual(dimensions.detail, [16, 16]);
  process.stdout.write(
    "[media-derivatives-live] crop-aspect-ratio-watermarks-checksums=ok\n",
  );
  for (const invalid of [
    { recipes: [{ ...recipes[0], fit: "fill" }] },
    {
      recipes: [
        { ...recipes[0], crop: { left: 60, top: 0, width: 16, height: 16 } },
      ],
    },
    {
      recipes: [
        {
          ...recipes[0],
          watermark: {
            kind: "image",
            mediaId,
            url: "http://attacker.test/image",
          },
        },
      ],
    },
    { recipes: [recipes[0], recipes[0]] },
  ]) {
    const denied = await admin.request("admin_media_derivatives_regenerate", {
      accessToken,
      path,
      body: invalid,
      idempotencyKey: randomUUID(),
    });
    assert.equal(denied.status, 400, "invalid_recipe_must_be_denied");
    assert.equal(
      (await get()).approvedGenerationId,
      saved.approvedGenerationId,
    );
  }
  const original = await storefront.request("media_render", {
    path,
    query: { variant: "web" },
  });
  assert.equal(original.ok, true);
  assert.deepEqual(Buffer.from(original.data), sourceBytes);
  process.stdout.write(
    "[media-derivatives-live] invalid-recipes-denied-original-preserved=ok\n",
  );
}
