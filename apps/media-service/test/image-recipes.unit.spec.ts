import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  generateImageDerivatives,
  imagePresets,
  normalizeImageRecipe,
  type VerifiedImage,
} from "../src/processing/image-recipes";

const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const sourceId = "00000000-0000-4000-8000-000000000001";
const logoId = "00000000-0000-4000-8000-000000000002";

async function approved(
  bytes?: Buffer,
  mediaId = sourceId,
): Promise<VerifiedImage> {
  const image =
    bytes ??
    (await sharp({
      create: { width: 100, height: 60, channels: 4, background: "blue" },
    })
      .png()
      .toBuffer());
  const metadata = await sharp(image).metadata();
  return {
    mediaId,
    bytes: image,
    sha256: sha256(image),
    width: metadata.autoOrient.width,
    height: metadata.autoOrient.height,
    status: "READY",
    scanStatus: "CLEAN",
    accessClass: "PUBLIC",
    visibility: "public",
    ownerId: null,
    scope: "panel",
    entityType: null,
    entityId: null,
  };
}

const recipe = { view: "card", width: 50, height: 50, format: "png" };

describe("bounded image recipes", () => {
  it("preserves source bytes, avoids enlargement and generates reproducible provenance", async () => {
    const source = await approved();
    const before = Buffer.from(source.bytes);
    const [first] = await generateImageDerivatives(source, [
      { ...recipe, width: 500, height: 500 },
    ]);
    const [second] = await generateImageDerivatives(source, [
      {
        height: 500,
        format: "png",
        view: "card",
        width: 500,
        fit: "inside",
        quality: 80,
      },
    ]);
    expect([first.width, first.height]).toEqual([100, 60]);
    expect(first.recipeHash).toBe(second.recipeHash);
    expect(first.sha256).toBe(second.sha256);
    expect(first.bytes.equals(second.bytes)).toBe(true);
    expect(source.bytes.equals(before)).toBe(true);
    expect(first.sourceSha256).toBe(source.sha256);
  });

  it("resizes inside bounds and crops cover to the requested aspect ratio", async () => {
    const source = await approved();
    const [inside] = await generateImageDerivatives(source, [recipe]);
    const [cover] = await generateImageDerivatives(source, [
      { ...recipe, fit: "cover" },
    ]);
    expect([inside.width, inside.height]).toEqual([50, 30]);
    expect([cover.width, cover.height]).toEqual([50, 50]);
    expect(cover.recipeHash).not.toBe(inside.recipeHash);
  });

  it("uses focal points to select actual source pixels", async () => {
    const pixels = Buffer.alloc(100 * 60 * 3);
    for (let y = 0; y < 60; y++)
      for (let x = 0; x < 100; x++)
        pixels[(y * 100 + x) * 3 + (x < 50 ? 0 : 2)] = 255;
    const source = await approved(
      await sharp(pixels, { raw: { width: 100, height: 60, channels: 3 } })
        .png()
        .toBuffer(),
    );
    const means = [];
    for (const x of [0, 1]) {
      const [output] = await generateImageDerivatives(source, [
        {
          ...recipe,
          width: 20,
          height: 60,
          fit: "cover",
          focalPoint: { x, y: 0.5 },
        },
      ]);
      means.push(
        (await sharp(output.bytes).stats()).channels.map(
          (channel) => channel.mean,
        ),
      );
    }
    expect(means[0][0]).toBeGreaterThan(250);
    expect(means[1][2]).toBeGreaterThan(250);
  });

  it.each(["inside", "cover"])(
    "keeps a square square in %s mode instead of stretching its pixels",
    async (fit) => {
      const pixels = Buffer.alloc(100 * 60 * 3);
      for (let y = 0; y < 60; y++)
        for (let x = 0; x < 100; x++)
          pixels[
            (y * 100 + x) * 3 + (x >= 40 && x < 60 && y >= 20 && y < 40 ? 1 : 2)
          ] = 255;
      const source = await approved(
        await sharp(pixels, { raw: { width: 100, height: 60, channels: 3 } })
          .png()
          .toBuffer(),
      );
      const [output] = await generateImageDerivatives(source, [
        { ...recipe, fit },
      ]);
      const { data, info } = await sharp(output.bytes)
        .raw()
        .toBuffer({ resolveWithObject: true });
      const xs: number[] = [];
      const ys: number[] = [];
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++) {
          const offset = (y * info.width + x) * info.channels;
          if (data[offset + 1] > 180 && data[offset + 2] < 50) {
            xs.push(x);
            ys.push(y);
          }
        }
      expect(xs.length).toBeGreaterThan(50);
      const squareWidth = Math.max(...xs) - Math.min(...xs) + 1;
      const squareHeight = Math.max(...ys) - Math.min(...ys) + 1;
      expect(Math.abs(squareWidth - squareHeight)).toBeLessThanOrEqual(1);
      expect([output.width, output.height]).toEqual(
        fit === "cover" ? [50, 50] : [50, 30],
      );
    },
  );

  it("validates crops against orientation-corrected dimensions", async () => {
    const bytes = await sharp({
      create: { width: 80, height: 40, channels: 3, background: "red" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const source = await approved(bytes);
    expect([source.width, source.height]).toEqual([40, 80]);
    const [output] = await generateImageDerivatives(source, [
      { ...recipe, crop: { left: 0, top: 40, width: 40, height: 40 } },
    ]);
    expect([output.width, output.height]).toEqual([40, 40]);
    await expect(
      generateImageDerivatives(source, [
        { ...recipe, crop: { left: 39, top: 0, width: 2, height: 2 } },
      ]),
    ).rejects.toThrow("image_crop_out_of_bounds");
  });

  it.each(["webp", "jpeg", "png"])(
    "encodes %s outputs with matching metadata",
    async (format) => {
      const [output] = await generateImageDerivatives(await approved(), [
        { ...recipe, format },
      ]);
      const metadata = await sharp(output.bytes).metadata();
      expect(metadata.format).toBe(format);
      expect(output.mimeType).toBe(`image/${format}`);
      expect(output.sizeBytes).toBe(output.bytes.length);
      expect(output.sha256).toBe(sha256(output.bytes));
      expect(metadata.orientation).toBeUndefined();
    },
  );

  it("resolves image watermarks by Media ID and blends real pixels", async () => {
    const source = await approved();
    const logo = await approved(
      await sharp({
        create: { width: 10, height: 10, channels: 4, background: "lime" },
      })
        .png()
        .toBuffer(),
      logoId,
    );
    const resolveWatermark = jest.fn(() => Promise.resolve(logo));
    const [output] = await generateImageDerivatives(
      source,
      [
        {
          ...recipe,
          width: 100,
          height: 60,
          watermark: {
            kind: "image",
            mediaId: logoId,
            width: 10,
            height: 10,
            margin: 1,
            opacity: 0.5,
          },
        },
      ],
      { resolveWatermark },
    );
    const decoded = await sharp(output.bytes).ensureAlpha().raw().toBuffer();
    const offset = (58 * 100 + 98) * 4;
    expect(decoded[offset + 1]).toBeGreaterThanOrEqual(126);
    expect(decoded[offset + 1]).toBeLessThanOrEqual(129);
    expect(output.watermarkSha256).toBe(logo.sha256);
    expect(resolveWatermark).toHaveBeenCalledWith(logoId);
  });

  it("denies unapproved/private watermark sources and oversized placements", async () => {
    const source = await approved();
    const mark = {
      kind: "image",
      mediaId: logoId,
      width: 10,
      height: 10,
      margin: 1,
    };
    const logo = await approved(undefined, logoId);
    await expect(
      generateImageDerivatives(source, [{ ...recipe, watermark: mark }], {
        resolveWatermark: () =>
          Promise.resolve({
            ...logo,
            accessClass: "PROTECTED",
            visibility: "private",
          }),
      }),
    ).rejects.toThrow("image_watermark_context_denied");
    await expect(
      generateImageDerivatives(source, [{ ...recipe, watermark: mark }], {
        resolveWatermark: () =>
          Promise.resolve({
            ...logo,
            status: "BLOCKED" as "READY",
          }),
      }),
    ).rejects.toThrow("image_source_not_approved");
    await expect(
      generateImageDerivatives(
        source,
        [{ ...recipe, watermark: { ...mark, width: 100 } }],
        { resolveWatermark: () => Promise.resolve(logo) },
      ),
    ).rejects.toThrow("image_watermark_out_of_bounds");
  });

  it("renders escaped Unicode text with a pinned local font", async () => {
    const file = path.resolve(
      __dirname,
      "../assets/fonts/Vazirmatn-Regular.ttf",
    );
    const font = {
      family: "Vazirmatn",
      file,
      sha256: sha256(await readFile(file)),
    };
    const source = await approved();
    const [output] = await generateImageDerivatives(
      source,
      [
        {
          ...recipe,
          width: 100,
          height: 60,
          watermark: {
            kind: "text",
            text: "<b>سلام & demo</b>",
            width: 80,
            height: 25,
            margin: 2,
            opacity: 1,
          },
        },
      ],
      { textFont: font },
    );
    expect(output.fontSha256).toBe(font.sha256);
    expect(output.fontFamily).toBe(font.family);
    expect(output.watermarkSha256).toBeNull();
    expect((await sharp(output.bytes).stats()).channels[0].max).toBeGreaterThan(
      0,
    );
    await expect(
      generateImageDerivatives(source, [
        {
          ...recipe,
          watermark: {
            kind: "text",
            text: "demo",
            width: 10,
            height: 10,
            margin: 0,
          },
        },
      ]),
    ).rejects.toThrow("image_watermark_font_unconfigured");
  });

  it.each([
    { ...recipe, width: 0 },
    { ...recipe, height: 4097 },
    { ...recipe, width: 4096, height: 4096 },
    { ...recipe, width: "50" },
    { ...recipe, fit: "fill" },
    { ...recipe, quality: 50 },
    { ...recipe, url: "https://example.com/image.png" },
    { ...recipe, crop: { left: -1, top: 0, width: 1, height: 1 } },
    { ...recipe, focalPoint: { x: 0, y: 0 } },
    { ...recipe, fit: "cover", focalPoint: { x: NaN, y: 0 } },
    {
      ...recipe,
      watermark: {
        kind: "image",
        mediaId: "https://example.com/logo",
        width: 1,
        height: 1,
      },
    },
    {
      ...recipe,
      watermark: { kind: "text", text: "x".repeat(161), width: 1, height: 1 },
    },
  ])("rejects invalid recipes before processing (%#)", (input) => {
    expect(() => normalizeImageRecipe(input)).toThrow();
  });

  it("bounds configurable presets and retains deterministic ordering", () => {
    expect(imagePresets().map((r) => r.view)).toEqual([
      "thumbnail",
      "card",
      "detail",
      "mobile",
    ]);
    expect(
      imagePresets(JSON.stringify([{ ...recipe, view: "mobile" }, recipe])).map(
        (r) => r.view,
      ),
    ).toEqual(["card", "mobile"]);
    expect(() => imagePresets(JSON.stringify([recipe, recipe]))).toThrow(
      "image_recipe_duplicate_view",
    );
    expect(() => imagePresets("[]")).toThrow("image_recipe_count_invalid");
    expect(() => imagePresets("bad json")).toThrow("image_presets_invalid");
  });

  it("denies modified source bytes or dimensions before generating outputs", async () => {
    const source = await approved();
    await expect(
      generateImageDerivatives({ ...source, sha256: "0".repeat(64) }, [recipe]),
    ).rejects.toThrow("image_source_checksum_mismatch");
    await expect(
      generateImageDerivatives({ ...source, width: 99 }, [recipe]),
    ).rejects.toThrow("image_source_dimensions_mismatch");
  });
});
