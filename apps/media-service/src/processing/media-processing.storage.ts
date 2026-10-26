import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { Media } from "../../prisma/generated";
import { ProcessingError, processingPolicy } from "./processing-policy";
import type { Readable } from "node:stream";
import {
  UPLOAD_BINDING_METADATA,
  matchesUploadBinding,
} from "./upload-binding";

@Injectable()
export class MediaProcessingStorage implements OnModuleDestroy {
  private client?: S3Client;
  private s3(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        endpoint:
          process.env.MEDIA_S3_INTERNAL_ENDPOINT ??
          process.env.MEDIA_S3_ENDPOINT,
        region: process.env.MEDIA_S3_REGION ?? "us-east-1",
        forcePathStyle: process.env.MEDIA_S3_FORCE_PATH_STYLE !== "false",
        credentials: {
          accessKeyId: process.env.MEDIA_S3_ACCESS_KEY!,
          secretAccessKey: process.env.MEDIA_S3_SECRET_KEY!,
        },
        maxAttempts: 1,
      });
    }
    return this.client;
  }

  async readUpload(
    media: Media,
    expectedUploadBinding: string | null,
  ): Promise<Buffer> {
    const policy = processingPolicy();
    if (media.storage !== "s3")
      throw new ProcessingError("storage_not_supported");
    if (media.sizeBytes <= 0 || media.sizeBytes > policy.maxBytes)
      throw new ProcessingError("upload_size_invalid");
    if (!media.etag) throw new ProcessingError("upload_integrity_missing");
    if (!expectedUploadBinding)
      throw new ProcessingError("upload_authorization_unverified");
    const controller = new AbortController();
    let body: Readable | undefined;
    const deadline = setTimeout(() => {
      controller.abort();
      body?.destroy();
    }, policy.ioTimeoutMs);
    try {
      const object = await this.s3().send(
        new GetObjectCommand({
          Bucket: media.bucket ?? process.env.MEDIA_S3_BUCKET ?? "media",
          Key: media.path,
          IfMatch: `"${media.etag}"`,
        }),
        { abortSignal: controller.signal },
      );
      body = object.Body as Readable | undefined;
      if (
        !matchesUploadBinding(
          object.Metadata?.[UPLOAD_BINDING_METADATA],
          expectedUploadBinding,
        )
      ) {
        throw new ProcessingError("upload_authorization_mismatch");
      }
      if (
        object.ContentLength !== media.sizeBytes ||
        object.ETag?.replaceAll('"', "") !== media.etag
      )
        throw new ProcessingError("upload_changed");
      if (!body || typeof body[Symbol.asyncIterator] !== "function")
        throw new ProcessingError("upload_stream_invalid", true);
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of body) {
        const bytes = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk as Uint8Array);
        size += bytes.length;
        if (size > policy.maxBytes || size > media.sizeBytes)
          throw new ProcessingError("upload_size_invalid");
        chunks.push(bytes);
      }
      if (controller.signal.aborted)
        throw new ProcessingError("storage_timeout", true);
      if (size !== media.sizeBytes)
        throw new ProcessingError("upload_size_mismatch");
      return Buffer.concat(chunks, size);
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      const name = error instanceof Error ? error.name : "";
      if (name === "NoSuchKey" || name === "NotFound")
        throw new ProcessingError("upload_missing");
      if (name === "PreconditionFailed")
        throw new ProcessingError("upload_changed");
      throw new ProcessingError(
        controller.signal.aborted ? "storage_timeout" : "storage_unavailable",
        true,
      );
    } finally {
      clearTimeout(deadline);
      body?.destroy();
    }
  }

  async writeCopy(
    bucket: string,
    path: string,
    bytes: Buffer,
    mimeType: string,
  ) {
    await this.s3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        Body: bytes,
        ContentType: mimeType,
        CacheControl: "private, no-store",
        IfNoneMatch: "*",
      }),
      { abortSignal: AbortSignal.timeout(processingPolicy().ioTimeoutMs) },
    );
  }

  async readVerified(source: {
    bucket: string;
    path: string;
    sha256: string;
    sizeBytes: number;
  }): Promise<Buffer> {
    const policy = processingPolicy();
    if (source.sizeBytes <= 0 || source.sizeBytes > policy.maxBytes)
      throw new ProcessingError("image_source_size_invalid");
    const controller = new AbortController();
    let body: Readable | undefined;
    const deadline = setTimeout(() => {
      controller.abort();
      body?.destroy();
    }, policy.ioTimeoutMs);
    try {
      const object = await this.s3().send(
        new GetObjectCommand({ Bucket: source.bucket, Key: source.path }),
        { abortSignal: controller.signal },
      );
      body = object.Body as Readable | undefined;
      if (!body || typeof body[Symbol.asyncIterator] !== "function")
        throw new ProcessingError("image_source_stream_invalid", true);
      if (object.ContentLength !== source.sizeBytes)
        throw new ProcessingError("image_source_changed");
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of body) {
        const bytes = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk as Uint8Array);
        size += bytes.length;
        if (size > source.sizeBytes || size > policy.maxBytes)
          throw new ProcessingError("image_source_size_invalid");
        chunks.push(bytes);
      }
      if (controller.signal.aborted)
        throw new ProcessingError("storage_timeout", true);
      const bytes = Buffer.concat(chunks, size);
      if (
        size !== source.sizeBytes ||
        createHash("sha256").update(bytes).digest("hex") !== source.sha256
      )
        throw new ProcessingError("image_source_changed");
      return bytes;
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      const name = error instanceof Error ? error.name : "";
      if (name === "NoSuchKey" || name === "NotFound")
        throw new ProcessingError("image_source_missing");
      throw new ProcessingError(
        controller.signal.aborted ? "storage_timeout" : "storage_unavailable",
        true,
      );
    } finally {
      clearTimeout(deadline);
      body?.destroy();
    }
  }

  async removeObject(bucket: string, path: string) {
    await this.s3().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: path }),
      {
        abortSignal: AbortSignal.timeout(processingPolicy().ioTimeoutMs),
      },
    );
  }

  onModuleDestroy() {
    this.client?.destroy();
  }
}
