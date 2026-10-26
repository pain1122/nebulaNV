import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp, { type OutputInfo } from "sharp";
import { detectImageType } from "./image-validation";
import { ProcessingError, processingPolicy } from "./processing-policy";

const views = ["thumbnail", "card", "detail", "mobile"] as const;
export const IMAGE_PROCESSOR_VERSION = JSON.stringify({
  engine: "image-recipe-v1",
  libraries: Object.fromEntries(
    Object.entries(sharp.versions).sort(([a], [b]) => a.localeCompare(b)),
  ),
});
type View = (typeof views)[number];
type Rectangle = { left: number; top: number; width: number; height: number };
type FocalPoint = { x: number; y: number };
type Watermark = {
  kind: "text" | "image";
  text: string | null;
  mediaId: string | null;
  width: number;
  height: number;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  margin: number;
  opacity: number;
};
export type ImageRecipe = {
  view: View;
  width: number;
  height: number;
  fit: "inside" | "cover";
  format: "webp" | "png" | "jpeg";
  quality: number;
  crop: Rectangle | null;
  focalPoint: FocalPoint | null;
  watermark: Watermark | null;
};

// This input is resolved by Media, never accepted as client-supplied approval.
export type VerifiedImage = {
  mediaId: string;
  bytes: Buffer;
  sha256: string;
  width: number;
  height: number;
  status: "READY";
  scanStatus: "CLEAN";
  accessClass: "PUBLIC" | "PROTECTED" | "STRICT";
  visibility: string;
  ownerId: string | null;
  scope: string;
  entityType: string | null;
  entityId: string | null;
};

export type RecipeDependencies = {
  resolveWatermark?: (mediaId: string) => Promise<VerifiedImage>;
  // Operator-selected local font, not a recipe field or a remote URL.
  textFont?: { family: string; file: string; sha256: string };
};

export function assertImageWatermarkContext(
  source: Omit<VerifiedImage, "bytes">,
  image: Omit<VerifiedImage, "bytes">,
) {
  const publicImage =
    image.accessClass === "PUBLIC" &&
    image.visibility === "public" &&
    image.scope === "panel";
  const sameContext =
    source.ownerId !== null &&
    source.ownerId === image.ownerId &&
    source.accessClass === image.accessClass &&
    source.scope === image.scope &&
    source.entityType === image.entityType &&
    source.entityId === image.entityId;
  if (!publicImage && !sameContext) reject("image_watermark_context_denied");
  if (source.accessClass === "PUBLIC" && !publicImage)
    reject("image_watermark_context_denied");
}

const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
const reject = (code: string): never => {
  throw new ProcessingError(code);
};

function record(input: unknown, allowed: string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return reject("image_recipe_object_invalid");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    reject("image_recipe_unknown_field");
  return value;
}
function integer(input: unknown, min: number, max: number): number {
  if (
    typeof input !== "number" ||
    !Number.isInteger(input) ||
    input < min ||
    input > max
  )
    return reject("image_recipe_number_invalid");
  return input;
}
function fraction(input: unknown, min = 0): number {
  if (
    typeof input !== "number" ||
    !Number.isFinite(input) ||
    input < min ||
    input > 1
  )
    return reject("image_recipe_fraction_invalid");
  return input;
}
function choice<T extends string>(input: unknown, options: readonly T[]): T {
  if (typeof input !== "string" || !options.includes(input as T))
    return reject("image_recipe_choice_invalid");
  return input as T;
}

export function normalizeImageRecipe(input: unknown): ImageRecipe {
  const value = record(input, [
    "view",
    "width",
    "height",
    "fit",
    "format",
    "quality",
    "crop",
    "focalPoint",
    "watermark",
  ]);
  const width = integer(value.width, 1, 4096);
  const height = integer(value.height, 1, 4096);
  if (width * height > 8_000_000) reject("image_recipe_pixels_exceeded");
  const fit = choice(value.fit ?? "inside", ["inside", "cover"]);
  const format = choice(value.format ?? "webp", ["webp", "png", "jpeg"]);
  const quality = integer(value.quality ?? 80, 1, 100);
  // PNG is lossless with fixed compression; quality applies to JPEG/WebP.
  if (format === "png" && quality !== 80)
    reject("image_recipe_png_quality_not_supported");
  let crop: Rectangle | null = null;
  if (value.crop != null) {
    const r = record(value.crop, ["left", "top", "width", "height"]);
    crop = {
      left: integer(r.left, 0, 100_000),
      top: integer(r.top, 0, 100_000),
      width: integer(r.width, 1, 100_000),
      height: integer(r.height, 1, 100_000),
    };
  }
  let focalPoint: FocalPoint | null = null;
  if (value.focalPoint != null) {
    const f = record(value.focalPoint, ["x", "y"]);
    focalPoint = { x: fraction(f.x), y: fraction(f.y) };
    if (crop || fit !== "cover")
      reject("image_recipe_crop_combination_invalid");
  }
  let watermark: Watermark | null = null;
  if (value.watermark != null) {
    const w = record(value.watermark, [
      "kind",
      "text",
      "mediaId",
      "width",
      "height",
      "position",
      "margin",
      "opacity",
    ]);
    const kind = choice(w.kind, ["text", "image"]);
    const text = kind === "text" ? w.text : null;
    const mediaId = kind === "image" ? w.mediaId : null;
    if (
      kind === "text" &&
      (typeof text !== "string" ||
        !text.trim() ||
        [...text].length > 160 ||
        [...text].some(
          (character) =>
            character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
        ))
    )
      reject("image_watermark_text_invalid");
    if (
      kind === "image" &&
      (typeof mediaId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          mediaId,
        ))
    )
      reject("image_watermark_id_invalid");
    if (
      (kind === "text" && w.mediaId != null) ||
      (kind === "image" && w.text != null)
    )
      reject("image_watermark_combination_invalid");
    watermark = {
      kind,
      text: text as string | null,
      mediaId: mediaId as string | null,
      width: integer(w.width, 1, 1024),
      height: integer(w.height, 1, 256),
      position: choice(w.position ?? "bottom-right", [
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
      ]),
      margin: integer(w.margin ?? 8, 0, 256),
      opacity: fraction(w.opacity ?? 0.6, 0.01),
    };
  }
  return {
    view: choice(value.view, views),
    width,
    height,
    fit,
    format,
    quality,
    crop,
    focalPoint,
    watermark,
  };
}

export const DEFAULT_IMAGE_PRESETS: ReadonlyArray<ImageRecipe> = [
  { view: "thumbnail", width: 240, height: 240, fit: "cover" },
  { view: "card", width: 640, height: 480, fit: "cover" },
  { view: "detail", width: 1600, height: 1600, fit: "inside" },
  { view: "mobile", width: 800, height: 1000, fit: "inside" },
].map((recipe) => normalizeImageRecipe(recipe));

export function imagePresets(configuration?: string): ImageRecipe[] {
  let input: unknown = DEFAULT_IMAGE_PRESETS;
  if (configuration !== undefined) {
    if (configuration.length > 16_384) reject("image_presets_invalid");
    try {
      input = JSON.parse(configuration) as unknown;
    } catch {
      reject("image_presets_invalid");
    }
  }
  return normalizeRecipeList(input);
}

function normalizeRecipeList(input: unknown): ImageRecipe[] {
  if (!Array.isArray(input) || !input.length || input.length > 4)
    return reject("image_recipe_count_invalid");
  const recipes = input.map(normalizeImageRecipe);
  if (new Set(recipes.map((r) => r.view)).size !== recipes.length)
    reject("image_recipe_duplicate_view");
  return recipes.sort((a, b) => views.indexOf(a.view) - views.indexOf(b.view));
}

async function verify(source: VerifiedImage) {
  const limits = processingPolicy();
  if (source.status !== "READY" || source.scanStatus !== "CLEAN")
    reject("image_source_not_approved");
  if (!source.bytes.length || source.bytes.length > limits.maxBytes)
    reject("image_source_size_invalid");
  if (hash(source.bytes) !== source.sha256)
    reject("image_source_checksum_mismatch");
  detectImageType(source.bytes);
  const metadata = await sharp(source.bytes, {
    failOn: "warning",
    limitInputPixels: limits.maxPixels,
  }).metadata();
  if ((metadata.pages ?? 1) !== 1) reject("image_animation_not_supported");
  if (
    metadata.autoOrient.width !== source.width ||
    metadata.autoOrient.height !== source.height
  )
    reject("image_source_dimensions_mismatch");
}

export function imageRecipeRegion(
  source: Pick<VerifiedImage, "width" | "height">,
  recipe: ImageRecipe,
): Rectangle {
  let r = recipe.crop ?? {
    left: 0,
    top: 0,
    width: source.width,
    height: source.height,
  };
  if (r.left + r.width > source.width || r.top + r.height > source.height)
    reject("image_crop_out_of_bounds");
  if (recipe.fit === "cover") {
    const ratio = recipe.width / recipe.height;
    const width = Math.min(r.width, Math.max(1, Math.floor(r.height * ratio)));
    const height = Math.min(r.height, Math.max(1, Math.floor(r.width / ratio)));
    const x = recipe.focalPoint?.x ?? 0.5;
    const y = recipe.focalPoint?.y ?? 0.5;
    r = {
      left:
        r.left +
        Math.max(
          0,
          Math.min(r.width - width, Math.round(x * r.width - width / 2)),
        ),
      top:
        r.top +
        Math.max(
          0,
          Math.min(r.height - height, Math.round(y * r.height - height / 2)),
        ),
      width,
      height,
    };
  }
  return r;
}

const escapeMarkup = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );

async function overlay(
  source: VerifiedImage,
  recipe: ImageRecipe,
  width: number,
  height: number,
  dependencies: RecipeDependencies,
) {
  const mark = recipe.watermark!;
  if (
    mark.width + mark.margin * 2 > width ||
    mark.height + mark.margin * 2 > height
  )
    reject("image_watermark_out_of_bounds");
  const seconds = processingPolicy().imageTimeoutSec;
  let pixels: Buffer;
  let info: OutputInfo;
  let provenance: string;
  if (mark.kind === "text") {
    const font = dependencies.textFont;
    if (!font || !/^[a-zA-Z0-9 -]{1,64}$/.test(font.family))
      return reject("image_watermark_font_unconfigured");
    const bytes = await readFile(font.file);
    if (bytes.length > 5_000_000 || hash(bytes) !== font.sha256)
      reject("image_watermark_font_changed");
    provenance = font.sha256;
    ({ data: pixels, info } = await sharp({
      text: {
        text: `<span foreground="white">${escapeMarkup(mark.text!)}</span>`,
        font: font.family,
        fontfile: font.file,
        width: mark.width,
        height: mark.height,
        rgba: true,
        wrap: "word-char",
      },
    })
      .timeout({ seconds })
      .raw()
      .toBuffer({ resolveWithObject: true }));
  } else {
    if (!dependencies.resolveWatermark)
      return reject("image_watermark_resolver_unconfigured");
    const image = await dependencies.resolveWatermark(mark.mediaId!);
    if (image.mediaId !== mark.mediaId) reject("image_watermark_id_mismatch");
    assertImageWatermarkContext(source, image);
    await verify(image);
    provenance = image.sha256;
    ({ data: pixels, info } = await sharp(image.bytes, {
      failOn: "warning",
      limitInputPixels: processingPolicy().maxPixels,
    })
      .autoOrient()
      .resize(mark.width, mark.height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .ensureAlpha()
      .timeout({ seconds })
      .raw()
      .toBuffer({ resolveWithObject: true }));
  }
  if (
    info.channels !== 4 ||
    info.width > mark.width ||
    info.height > mark.height
  )
    reject("image_watermark_output_invalid");
  for (let offset = 3; offset < pixels.length; offset += 4)
    pixels[offset] = Math.round(pixels[offset] * mark.opacity);
  return {
    watermarkSha256: mark.kind === "image" ? provenance : null,
    fontSha256: mark.kind === "text" ? provenance : null,
    fontFamily: mark.kind === "text" ? dependencies.textFont!.family : null,
    composite: {
      input: pixels,
      raw: { width: info.width, height: info.height, channels: 4 as const },
      left: mark.position.endsWith("right")
        ? width - info.width - mark.margin
        : mark.margin,
      top: mark.position.startsWith("bottom")
        ? height - info.height - mark.margin
        : mark.margin,
    },
  };
}

export async function generateImageDerivatives(
  source: VerifiedImage,
  inputs: unknown[],
  dependencies: RecipeDependencies = {},
) {
  // One bounded source and at most four sequential outputs; no unbounded map.
  const recipes = normalizeRecipeList(inputs);
  try {
    await verify(source);
    const outputs = [];
    for (const recipe of recipes) {
      const cropped = imageRecipeRegion(source, recipe);
      const base = await sharp(source.bytes, {
        failOn: "warning",
        limitInputPixels: processingPolicy().maxPixels,
      })
        .autoOrient()
        .extract(cropped)
        .resize(recipe.width, recipe.height, {
          fit: recipe.fit,
          withoutEnlargement: true,
        })
        .ensureAlpha()
        .timeout({ seconds: processingPolicy().imageTimeoutSec })
        .raw()
        .toBuffer({ resolveWithObject: true });
      const mark = recipe.watermark
        ? await overlay(
            source,
            recipe,
            base.info.width,
            base.info.height,
            dependencies,
          )
        : null;
      let image = sharp(base.data, {
        raw: {
          width: base.info.width,
          height: base.info.height,
          channels: base.info.channels,
        },
      });
      if (mark) image = image.composite([mark.composite]);
      if (recipe.format === "jpeg")
        image = image
          .flatten({ background: "white" })
          .jpeg({ quality: recipe.quality });
      else if (recipe.format === "png")
        image = image.png({ compressionLevel: 9 });
      else image = image.webp({ quality: recipe.quality });
      const output = await image
        .timeout({ seconds: processingPolicy().imageTimeoutSec })
        .toBuffer({ resolveWithObject: true });
      if (output.data.length > processingPolicy().maxBytes)
        reject("image_output_size_exceeded");
      const processorVersion = IMAGE_PROCESSOR_VERSION;
      const recipeHash = hash(
        JSON.stringify({
          sourceSha256: source.sha256,
          watermarkSha256: mark?.watermarkSha256 ?? null,
          fontSha256: mark?.fontSha256 ?? null,
          fontFamily: mark?.fontFamily ?? null,
          processorVersion,
          recipe,
        }),
      );
      outputs.push({
        view: recipe.view,
        recipe,
        recipeHash,
        processorVersion,
        sourceSha256: source.sha256,
        watermarkSha256: mark?.watermarkSha256 ?? null,
        fontSha256: mark?.fontSha256 ?? null,
        fontFamily: mark?.fontFamily ?? null,
        bytes: output.data,
        sha256: hash(output.data),
        width: output.info.width,
        height: output.info.height,
        sizeBytes: output.data.length,
        mimeType: `image/${recipe.format === "jpeg" ? "jpeg" : recipe.format}`,
      });
    }
    return outputs;
  } catch (error) {
    if (error instanceof ProcessingError) throw error;
    throw new ProcessingError("image_derivative_processing_failed");
  }
}
