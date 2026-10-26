import { createHmac, timingSafeEqual } from "node:crypto";

export const UPLOAD_BINDING_METADATA = "nebula-upload-binding";
export type UploadBinding = {
  bucket: string;
  path: string;
  actorUserId: string;
  ownerId: string;
  accessClass: string;
  scope: string;
  entityType: string | null;
  entityId: string | null;
  mimeType: string;
  filename: string;
};

export function signUploadBinding(
  fields: UploadBinding,
  secret: string,
): string {
  // Purpose separation permits using the existing required Media HMAC key.
  // Only the MAC is stored, not protected actor/entity/filename facts.
  return createHmac("sha256", secret)
    .update(
      JSON.stringify([
        "nebula-media-upload-binding-v1",
        fields.bucket,
        fields.path,
        fields.actorUserId,
        fields.ownerId,
        fields.accessClass,
        fields.scope,
        fields.entityType,
        fields.entityId,
        fields.mimeType,
        fields.filename,
      ]),
    )
    .digest("hex");
}

export function matchesUploadBinding(
  actual: string | undefined,
  expected: string,
): boolean {
  return (
    !!actual &&
    /^[0-9a-f]{64}$/.test(actual) &&
    timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"))
  );
}
