import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "./config";
import { nanoid } from "nanoid";

const s3Client = config.s3.enabled && config.s3.bucket
  ? new S3Client({
      region: config.s3.region,
      endpoint: config.s3.endpoint,
      credentials: config.s3.accessKeyId && config.s3.secretAccessKey ? {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey
      } : undefined,
      forcePathStyle: !!config.s3.endpoint
    })
  : null;

export async function uploadHighlightImage(buffer: Buffer, slug: string) {
  const filename = `${slug}.png`;
  if (s3Client && config.s3.bucket) {
    const key = `highlights/${filename}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000, immutable"
    }));
    if (config.s3.publicUrl) {
      return `${config.s3.publicUrl.replace(/\/$/, "")}/${key}`;
    }
    if (config.s3.endpoint) {
      return `${config.s3.endpoint.replace(/\/$/, "")}/${config.s3.bucket}/${key}`;
    }
    return `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;
  }

  const localDir = path.resolve(config.localStoragePath, "highlights");
  await fs.promises.mkdir(localDir, { recursive: true });
  const filePath = path.join(localDir, filename);
  await fs.promises.writeFile(filePath, buffer);
  return `${config.apiBaseUrl.replace(/\/$/, "")}/storage/highlights/${filename}?v=${nanoid(6)}`;
}
