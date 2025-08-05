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
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DEFAULT_PRESIGN_EXPIRY_SECONDS } from "@/constants/aws";
import { IPhoto } from "@/types/shared.types";

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

/**
 * Moves an object from one key to another (e.g., from temp-uploads to final folder).
 * Returns the new key and URL.
 */
export async function moveS3Object({
  fromKey,
  toKey,
}: {
  fromKey: string;
  toKey: string;
}): Promise<{ url: string; key: string }> {
  const Bucket = AWS_BUCKET_NAME;

  await s3.send(
    new CopyObjectCommand({
      Bucket,
      CopySource: `${Bucket}/${fromKey}`,
      Key: toKey,
    })
  );

  await s3.send(new DeleteObjectCommand({ Bucket, Key: fromKey }));

  return {
    url: `https://${Bucket}.s3.${AWS_REGION}.amazonaws.com/${toKey}`,
    key: toKey,
  };
}

/**
 * Checks if an object exists in S3.
 * Returns true if found, false otherwise.
 */
export async function s3ObjectExists(key: string): Promise<boolean> {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (err: any) {
    if (err.name === "NotFound") return false;
    console.error("S3 existence check failed:", err);
    return false;
  }
}

/**
 * Generates a presigned PUT URL for direct upload from the browser.
 */
export async function getPresignedPutUrl({
  folder,
  fileType,
  expiresIn = DEFAULT_PRESIGN_EXPIRY_SECONDS,
}: {
  folder: string;
  fileType: string;
  expiresIn?: number;
}): Promise<{ url: string; key: string }> {
  const extension = fileType.split("/")[1] || "jpg";
  const key = `${folder}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: AWS_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn });

  return { url, key };
}

/**
 * Finalizes a photo by moving it from temp-files to the final folder.
 * Returns the updated photo object with the new S3 key.
 */
export async function finalizePhoto(
  photo: IPhoto,
  finalFolder: string
): Promise<IPhoto> {
  if (!photo?.s3Key) throw new Error("Missing s3Key in photo");

  if (!photo.s3Key.startsWith("temp-files/")) {
    // already finalized
    return photo;
  }

  const filename = photo.s3Key.split("/").pop();
  const finalKey = `${finalFolder}/${filename}`;

  const moved = await moveS3Object({ fromKey: photo.s3Key, toKey: finalKey });
  return {
    s3Key: moved.key,
    url: moved.url,
  };
}