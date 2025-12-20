import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import "dotenv/config";

const client = new S3Client({
  region: process.env.MEDIA_S3_REGION ?? "local",
  endpoint: process.env.MEDIA_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.MEDIA_S3_ACCESS_KEY,
    secretAccessKey: process.env.MEDIA_S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

const Bucket = process.env.MEDIA_S3_BUCKET;

// change these freely
const Key = `debug/${Date.now()}-hello.txt`;
const ContentType = "text/plain";

async function main() {
  const cmd = new PutObjectCommand({
    Bucket,
    Key,
    ContentType,
  });

  const url = await getSignedUrl(client, cmd, { expiresIn: 600 });
  console.log("KEY=", Key);
  console.log("URL=", url);
}

main().catch((e) => {
  console.error("❌ presign failed:", e?.name ?? e, e?.message ?? "");
  process.exit(1);
});
