import { createHash } from "node:crypto";
import { extname } from "node:path";
import sharp from "sharp";
import { ProcessingError, processingPolicy } from "./processing-policy";

const formats = {
  "image/png": { format: "png", extensions: [".png"] },
  "image/jpeg": { format: "jpeg", extensions: [".jpg", ".jpeg"] },
  "image/webp": { format: "webp", extensions: [".webp"] },
  "image/gif": { format: "gif", extensions: [".gif"] },
};

export function detectImageType(bytes: Buffer): keyof typeof formats {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  if (["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6)))
    return "image/gif";
  throw new ProcessingError("image_type_not_supported");
}

export async function validateImage(
  bytes: Buffer,
  declaredMime: string,
  filename: string,
  expectedSha256: string | null,
) {
  const policy = processingPolicy();
  if (!bytes.length || bytes.length > policy.maxBytes)
    throw new ProcessingError("upload_size_invalid");
  const mimeType = detectImageType(bytes);
  if (mimeType !== declaredMime)
    throw new ProcessingError("image_mime_mismatch");
  if (!formats[mimeType].extensions.includes(extname(filename).toLowerCase()))
    throw new ProcessingError("image_extension_mismatch");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (expectedSha256 && expectedSha256 !== sha256)
    throw new ProcessingError("image_checksum_mismatch");
  try {
    const image = sharp(bytes, {
      failOn: "warning",
      limitInputPixels: policy.maxPixels,
    });
    const metadata = await image.metadata();
    if (metadata.format !== formats[mimeType].format)
      throw new ProcessingError("image_mime_mismatch");
    if ((metadata.pages ?? 1) > 1)
      throw new ProcessingError("image_animation_not_supported");
    // Decode pixels as well as headers; truncated/corrupt content cannot pass
    // solely by advertising valid dimensions. Do not persist the decoded buffer.
    const decoded = await image
      .rotate()
      .timeout({ seconds: policy.imageTimeoutSec })
      .raw()
      .toBuffer({ resolveWithObject: true });
    return {
      mimeType,
      sha256,
      sizeBytes: bytes.length,
      width: decoded.info.width,
      height: decoded.info.height,
    };
  } catch (error) {
    if (error instanceof ProcessingError) throw error;
    throw new ProcessingError("image_decode_failed");
  }
}
