import * as Joi from "joi";

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
  SVC_NAME: Joi.string().default("media-service"),
  GATEWAY_SECRET: Joi.string().min(32).required(),
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
  MEDIA_PUBLIC_FOLDER: folderRoot.default("uploads"),
  MEDIA_PRIVATE_FOLDER: folderRoot.default("private/objects"),
  MEDIA_SYSTEM_FOLDER: folderRoot.default("system"),
}).custom((env: Record<string, unknown>, helpers) => {
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

  return env;
});
