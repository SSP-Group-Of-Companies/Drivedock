import {
  AWS_ACCESS_KEY_ID,
  AWS_BUCKET_NAME,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
} from "@/config/env";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a file buffer to S3 under the specified folder.
 * Returns the full URL and S3 key for tracking/rollback.
 */
export async function uploadImageToS3({
  fileBuffer,
  fileType,
  folder,
}: {
  fileBuffer: Buffer;
  fileType: string;
  folder: string;
}): Promise<{ url: string; key: string }> {
  const extension = fileType.split("/")[1] || "jpg";
  const key = `${folder}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: AWS_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: fileType,
  });

  await s3.send(command);

  return {
    url: `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`,
    key,
  };
}

/**
 * Deletes one or more objects from S3 based on their keys.
 * Used for rollback if DB write fails after upload.
 */
export async function deleteS3Objects(keys: string[]): Promise<void> {
  const deletePromises = keys.map(async (key) => {
    const command = new DeleteObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: key,
    });
    try {
      await s3.send(command);
    } catch (err) {
      console.error(`Failed to delete S3 object: ${key}`, err);
    }
  });

  await Promise.all(deletePromises);
}
