import { S3Client, HeadBucketCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import "dotenv/config";

const client = new S3Client({
  region: process.env.MEDIA_S3_REGION ?? "local",
  endpoint: process.env.MEDIA_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.MEDIA_S3_ACCESS_KEY,
    secretAccessKey: process.env.MEDIA_S3_SECRET_KEY,
  },
  forcePathStyle: true, // IMPORTANT for Supabase S3 endpoint
});

const Bucket = process.env.MEDIA_S3_BUCKET;

async function main() {
  console.log("Endpoint:", process.env.MEDIA_S3_ENDPOINT);
  console.log("Bucket:", Bucket);

  // 1) bucket exists?
  await client.send(new HeadBucketCommand({ Bucket }));
  console.log("✅ HeadBucket OK");

  // 2) list objects (should be empty right now)
  const res = await client.send(new ListObjectsV2Command({ Bucket, MaxKeys: 5 }));
  console.log("✅ ListObjects OK. keys:", (res.Contents ?? []).map(x => x.Key));
}

main().catch((e) => {
  console.error("❌ S3 smoke failed:", e?.name ?? e, e?.message ?? "");
  process.exit(1);
});
