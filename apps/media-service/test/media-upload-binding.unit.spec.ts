import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "node:crypto";
import { MediaService } from "../src/media.service";
import type { PrismaService } from "../src/prisma.service";
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

  it("signs the opaque upload proof as a required header without leaking actor context", async () => {
    const client = new S3Client({
      region: "us-east-1",
      endpoint: "http://127.0.0.1:9000",
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
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
        {
          expiresIn: 600,
          unhoistableHeaders: new Set([
            `x-amz-meta-${UPLOAD_BINDING_METADATA}`,
          ]),
        },
      );
      const url = new URL(signed);
      expect(
        url.searchParams.get(`x-amz-meta-${UPLOAD_BINDING_METADATA}`),
      ).toBeNull();
      expect(url.searchParams.get("X-Amz-SignedHeaders")?.split(";")).toContain(
        `x-amz-meta-${UPLOAD_BINDING_METADATA}`,
      );
      expect(url.searchParams.has("X-Amz-Signature")).toBe(true);
      expect(url.search).not.toContain(input.actorUserId);
      expect(url.search).not.toContain(input.entityId!);
    } finally {
      client.destroy();
    }
  });
});

describe("MediaService upload URL payload checksums", () => {
  const originalEnv = process.env;
  let service: MediaService;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MEDIA_STORAGE_DRIVER: "s3",
      MEDIA_S3_PUBLIC_ENDPOINT: "http://127.0.0.1:19333",
      MEDIA_S3_REGION: "us-east-1",
      MEDIA_S3_BUCKET: "fixture-media",
      MEDIA_S3_ACCESS_KEY: "fixture-only-key",
      MEDIA_S3_SECRET_KEY: "fixture-only-secret",
      MEDIA_S3_FORCE_PATH_STYLE: "true",
      MEDIA_PUBLIC_FOLDER: "uploads",
      MEDIA_PRIVATE_FOLDER: "private/objects",
      MEDIA_DELETE_CONFIRM_SECRET: secret,
      AWS_REQUEST_CHECKSUM_CALCULATION: "WHEN_SUPPORTED",
    };
    const prisma = { media: { findFirst: jest.fn().mockResolvedValue(null) } };
    service = new MediaService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    service.onModuleDestroy();
    process.env = originalEnv;
  });

  it.each(["PUBLIC", "PROTECTED", "STRICT"] as const)(
    "%s signs an unknown upload body without fixing its checksum to an empty file",
    async (accessClass) => {
      const request = {
        filename: "example.png",
        mimeType: "image/png",
        actorUserId: "00000000-0000-4000-8000-000000000001",
        actorRole: "admin",
        scope: "product-media",
        entityType: "product",
        entityId: "product-one",
      };
      const result =
        accessClass === "PUBLIC"
          ? await service.presignUpload(request)
          : accessClass === "PROTECTED"
            ? await service.presignProtectedLibraryUpload(request)
            : await service.presignStrictLibraryUpload(request);
      const url = new URL(result.uploadUrl);
      expect(url.searchParams.has("X-Amz-Signature")).toBe(true);
      expect(
        url.searchParams.get(`x-amz-meta-${UPLOAD_BINDING_METADATA}`),
      ).toBeNull();
      expect(result.uploadHeaders["content-type"]).toBe(request.mimeType);
      expect(
        result.uploadHeaders[`x-amz-meta-${UPLOAD_BINDING_METADATA}`],
      ).toMatch(/^[a-f0-9]{64}$/);
      expect(url.searchParams.get("X-Amz-SignedHeaders")?.split(";")).toContain(
        `x-amz-meta-${UPLOAD_BINDING_METADATA}`,
      );
      expect(
        [...url.searchParams.keys()].filter((name) =>
          name.toLowerCase().startsWith("x-amz-checksum-"),
        ),
      ).toEqual([]);
      expect(decodeURIComponent(url.pathname)).toBe(
        `/fixture-media/${result.path}`,
      );
    },
  );

  it("preserves an explicitly supplied checksum for a body that is known", async () => {
    const body = Buffer.from("known upload bytes");
    const checksum = createHash("sha256").update(body).digest("base64");
    const client = new S3Client({
      region: "us-east-1",
      endpoint: "http://127.0.0.1:19333",
      forcePathStyle: true,
      credentials: {
        accessKeyId: "fixture-only-key",
        secretAccessKey: "fixture-only-secret",
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
    try {
      const url = new URL(
        await getSignedUrl(
          client,
          new PutObjectCommand({
            Bucket: "fixture-media",
            Key: "known.png",
            Body: body,
            ChecksumSHA256: checksum,
          }),
          { expiresIn: 60 },
        ),
      );
      expect(url.searchParams.get("x-amz-checksum-sha256")).toBe(checksum);
      expect(url.searchParams.has("X-Amz-Signature")).toBe(true);
    } finally {
      client.destroy();
    }
  });
});
