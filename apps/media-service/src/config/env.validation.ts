import * as Joi from "joi";
import { imagePresets } from "../processing/image-recipes";
import { s2sEnvSchema } from "@nebula/grpc-auth";
import {
  grpcTargetEnvSchema,
  httpPolicyEnvSchema,
  jwtAccessVerificationEnvSchema,
  runtimeEnvSchema,
  serviceBindEnvSchema,
} from "@packages/config";

const folderRoot = Joi.string()
  .trim()
  .custom((value: string, helpers) => {
    const trimmed = value.replace(/\/+$/g, "");

    if (!trimmed) {
      return helpers.error("any.custom", { message: "folder root is empty" });
    }

    if (
      trimmed.startsWith("/") ||
      trimmed.includes("\\") ||
      trimmed.includes("//")
    ) {
      return helpers.error("any.custom", {
        message: "folder root must be a relative S3 path using forward slashes",
      });
    }

    const segments = trimmed.split("/");
    const validSegment = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    if (
      segments.some(
        (segment) =>
          segment === "." || segment === ".." || !validSegment.test(segment),
      )
    ) {
      return helpers.error("any.custom", {
        message: "folder root contains an unsafe path segment",
      });
    }

    return trimmed;
  });

export const envSchema = Joi.object({
  ...runtimeEnvSchema,
  ...serviceBindEnvSchema("MEDIA"),
  ...grpcTargetEnvSchema("AUTH_GRPC_URL"),
  ...httpPolicyEnvSchema,
  ...s2sEnvSchema("media-service"),
  ...jwtAccessVerificationEnvSchema,
  DATABASE_URL: Joi.string().uri().required(),
  SHADOW_DATABASE_URL: Joi.string().uri().required(),
  MEDIA_STORAGE_DRIVER: Joi.string().valid("s3", "local").default("s3"),
  MEDIA_STORAGE_PROVIDER: Joi.string()
    .valid("minio", "supabase", "aws", "s3")
    .default("minio"),
  MEDIA_S3_ENDPOINT: Joi.string().uri().optional(),
  MEDIA_S3_INTERNAL_ENDPOINT: Joi.string().uri().optional(),
  MEDIA_S3_PUBLIC_ENDPOINT: Joi.string().uri().optional(),
  MEDIA_S3_REGION: Joi.string().default("us-east-1"),
  MEDIA_S3_BUCKET: Joi.string().default("media"),
  MEDIA_S3_ACCESS_KEY: Joi.when("MEDIA_STORAGE_DRIVER", {
    is: "s3",
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  MEDIA_S3_SECRET_KEY: Joi.when("MEDIA_STORAGE_DRIVER", {
    is: "s3",
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  MEDIA_S3_FORCE_PATH_STYLE: Joi.boolean()
    .truthy("true")
    .falsy("false")
    .default(true),
  MEDIA_SIGNED_UPLOAD_TTL_SECONDS: Joi.number().integer().min(1).default(600),
  MEDIA_SIGNED_READ_TTL_SECONDS: Joi.number().integer().min(1).default(300),
  MEDIA_STRICT_READ_TTL_SECONDS: Joi.number().integer().min(1).default(30),
  MEDIA_DELETE_CONFIRM_SECRET: Joi.string().min(32).required(),
  MEDIA_DELETE_CONFIRM_TTL_SECONDS: Joi.number().integer().min(1).default(30),
  MEDIA_SYNC_DELETE_MAX_FILES: Joi.number()
    .integer()
    .min(1)
    .max(10_000)
    .default(500),
  MEDIA_PUBLIC_FOLDER: folderRoot.default("uploads"),
  MEDIA_PRIVATE_FOLDER: folderRoot.default("private/objects"),
  MEDIA_PROCESSING_ENABLED: Joi.boolean()
    .truthy("true")
    .falsy("false")
    .default(true),
  MEDIA_DERIVATIVES_ENABLED: Joi.boolean()
    .truthy("true")
    .falsy("false")
    .default(true),
  MEDIA_IMAGE_PRESETS: Joi.string()
    .max(16384)
    .custom((value: string, helpers) => {
      try {
        imagePresets(value);
        return value;
      } catch {
        return helpers.error("any.custom", {
          message:
            "MEDIA_IMAGE_PRESETS must contain one to four valid image recipes",
        });
      }
    }),
  MEDIA_PROCESSING_POLL_MS: Joi.number()
    .integer()
    .min(100)
    .max(60_000)
    .default(2000),
  MEDIA_PROCESSING_MAX_BYTES: Joi.number()
    .integer()
    .min(1)
    .max(20 * 1024 * 1024)
    .default(20 * 1024 * 1024),
  MEDIA_PROCESSING_MAX_PIXELS: Joi.number()
    .integer()
    .min(1)
    .max(16_000_000)
    .default(16_000_000),
  MEDIA_PROCESSING_IO_TIMEOUT_MS: Joi.number()
    .integer()
    .min(100)
    .max(60_000)
    .default(20_000),
  MEDIA_PROCESSING_IMAGE_TIMEOUT_SECONDS: Joi.number()
    .integer()
    .min(1)
    .max(30)
    .default(15),
  MEDIA_PROCESSING_LEASE_MS: Joi.number()
    .integer()
    .min(1000)
    .max(600_000)
    .default(180_000),
  MEDIA_PROCESSING_MAX_ATTEMPTS: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .default(5),
  MEDIA_PROCESSING_RETRY_MS: Joi.number()
    .integer()
    .min(100)
    .max(300_000)
    .default(10_000),
  MEDIA_SCANNER_HOST: Joi.string().hostname().default("127.0.0.1"),
  MEDIA_SCANNER_PORT: Joi.number().port().default(3310),
  MEDIA_SCANNER_TIMEOUT_MS: Joi.number()
    .integer()
    .min(100)
    .max(60_000)
    .default(30_000),
}).custom((env: Record<string, unknown>, helpers) => {
  const budget =
    Number(env.MEDIA_PROCESSING_IO_TIMEOUT_MS) * 2 +
    Number(env.MEDIA_SCANNER_TIMEOUT_MS) * 2 +
    Number(env.MEDIA_PROCESSING_IMAGE_TIMEOUT_SECONDS) * 1000 +
    30_000;
  if (Number(env.MEDIA_PROCESSING_LEASE_MS) <= budget) {
    return helpers.error("any.custom", {
      message:
        "MEDIA_PROCESSING_LEASE_MS must exceed the bounded processing budget",
    });
  }
  if (
    env.MEDIA_STORAGE_DRIVER === "s3" &&
    !env.MEDIA_S3_ENDPOINT &&
    !env.MEDIA_S3_INTERNAL_ENDPOINT
  ) {
    return helpers.error("any.custom", {
      message:
        "MEDIA_S3_ENDPOINT or MEDIA_S3_INTERNAL_ENDPOINT is required when MEDIA_STORAGE_DRIVER=s3",
    });
  }

  if (
    env.NODE_ENV === "production" &&
    env.MEDIA_STORAGE_DRIVER === "s3" &&
    !env.MEDIA_S3_PUBLIC_ENDPOINT
  ) {
    return helpers.error("any.custom", {
      message:
        "MEDIA_S3_PUBLIC_ENDPOINT is required in production when MEDIA_STORAGE_DRIVER=s3",
    });
  }

  return env;
});
