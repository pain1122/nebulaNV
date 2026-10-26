import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  signUploadBinding,
  matchesUploadBinding,
  UPLOAD_BINDING_METADATA,
  type UploadBinding,
} from "../src/processing/upload-binding";

const input: UploadBinding = {
  bucket: "media",
  path: "private/objects/opaque-key",
  actorUserId: "actor-one",
  ownerId: "owner-one",
  accessClass: "PROTECTED",
  scope: "product-media",
  entityType: "product",
  entityId: "product-one",
  mimeType: "image/png",
  filename: "file.png",
};
const secret = "test-only-upload-binding-secret-000001";

describe("Media upload intent binding", () => {
  it.each(Object.keys(input) as Array<keyof UploadBinding>)(
    "binds the actual %s against finalization substitution",
    (field) => {
      const original = signUploadBinding(input, secret);
      expect(
        matchesUploadBinding(
          original,
          signUploadBinding({ ...input, [field]: "changed" }, secret),
        ),
      ).toBe(false);
      expect(
        matchesUploadBinding(original, signUploadBinding(input, secret)),
      ).toBe(true);
    },
  );

  it("rejects missing, malformed and tampered proofs", () => {
    const expected = signUploadBinding(input, secret);
    expect(matchesUploadBinding(undefined, expected)).toBe(false);
    expect(matchesUploadBinding("bad-proof", expected)).toBe(false);
    expect(matchesUploadBinding("0".repeat(64), expected)).toBe(false);
  });

  it("carries only the opaque proof in the signed upload URL without adding client headers", async () => {
    const client = new S3Client({
      region: "us-east-1",
      endpoint: "http://127.0.0.1:9000",
      forcePathStyle: true,
      credentials: {
        accessKeyId: "test-only-key",
        secretAccessKey: "test-only-secret",
      },
    });
    try {
      const proof = signUploadBinding(input, secret);
      const signed = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: input.bucket,
          Key: input.path,
          ContentType: input.mimeType,
          Metadata: { [UPLOAD_BINDING_METADATA]: proof },
        }),
        { expiresIn: 600 },
      );
      const url = new URL(signed);
      expect(
        url.searchParams.get(`x-amz-meta-${UPLOAD_BINDING_METADATA}`),
      ).toBe(proof);
      expect(url.searchParams.has("X-Amz-Signature")).toBe(true);
      expect(url.search).not.toContain(input.actorUserId);
      expect(url.search).not.toContain(input.entityId!);
    } finally {
      client.destroy();
    }
  });
});
