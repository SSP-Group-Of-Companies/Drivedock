// lib/utils/s3Upload.ts
import { AWS_ACCESS_KEY_ID, AWS_BUCKET_NAME, AWS_REGION, AWS_SECRET_ACCESS_KEY } from "@/config/env";
import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DEFAULT_PRESIGN_EXPIRY_SECONDS, S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { EImageMimeType, IPhoto } from "@/types/shared.types";
import { ES3Folder, IPresignResponse } from "@/types/aws.types";

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

/** ---------- Core upload/delete/move/presign ---------- */

export async function uploadImageToS3({ fileBuffer, fileType, folder }: { fileBuffer: Buffer; fileType: string; folder: string }): Promise<{ url: string; key: string }> {
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

export async function deleteS3Objects(keys: string[]): Promise<void> {
  const deletePromises = keys.map(async (key) => {
    const command = new DeleteObjectCommand({ Bucket: AWS_BUCKET_NAME, Key: key });
    try {
      await s3.send(command);
    } catch (err) {
      console.error(`Failed to delete S3 object: ${key}`, err);
    }
  });

  await Promise.all(deletePromises);
}

export async function moveS3Object({ fromKey, toKey }: { fromKey: string; toKey: string }): Promise<{ url: string; key: string }> {
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

export async function s3ObjectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: AWS_BUCKET_NAME, Key: key }));
    return true;
  } catch (err: any) {
    if (err.name === "NotFound") return false;
    console.error("S3 existence check failed:", err);
    return false;
  }
}

export async function getPresignedPutUrl({ key, fileType, expiresIn = DEFAULT_PRESIGN_EXPIRY_SECONDS }: { key: string; fileType: string; expiresIn?: number }): Promise<{ url: string }> {
  const command = new PutObjectCommand({
    Bucket: AWS_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn });
  return { url };
}

/** ---------- Small helpers to de-duplicate route logic ---------- */

/** True if a key points to the temp area. */
export const isTempKey = (key?: string) => Boolean(key && key.startsWith(`${S3_TEMP_FOLDER}/`));

/** True if a photo is either missing or already in final storage. */
export const isFinalOrEmptyPhoto = (photo?: IPhoto) => !photo?.s3Key || !isTempKey(photo.s3Key);

/** Build a standard final destination for a tracker's assets in a given folder bucket. */
export const buildFinalDest = (trackerId: string, folder: ES3Folder) => `${S3_SUBMISSIONS_FOLDER}/${folder}/${trackerId}`;

/**
 * Finalizes a photo by moving it from temp-files to the final folder.
 * If already finalized or empty, returns the photo unchanged.
 */
export async function finalizePhoto(photo: IPhoto, finalFolder: string): Promise<IPhoto> {
  if (!photo?.s3Key) throw new Error("Missing s3Key in photo");

  if (!isTempKey(photo.s3Key)) {
    // already finalized
    return photo;
  }

  const filename = photo.s3Key.split("/").pop();
  const finalKey = `${finalFolder}/${filename}`;

  const moved = await moveS3Object({ fromKey: photo.s3Key, toKey: finalKey });
  return { s3Key: moved.key, url: moved.url };
}

/**
 * A safe variant: if photo is undefined/null, just return it.
 * Useful when optional fields may be absent.
 */
export async function finalizePhotoSafe(photo: IPhoto | undefined, finalFolder: string): Promise<IPhoto | undefined> {
  if (!photo) return photo;
  return finalizePhoto(photo, finalFolder);
}

/**
 * Finalize an array (vector) of photos. Returns a new array.
 * If the vector is undefined, returns undefined.
 */
export async function finalizeVector(vec: IPhoto[] | undefined, dest: string): Promise<IPhoto[] | undefined> {
  if (!Array.isArray(vec)) return vec;
  const out: IPhoto[] = [];
  for (const p of vec) {
    out.push(isTempKey(p?.s3Key) ? await finalizePhoto(p, dest) : p);
  }
  return out;
}

/** ---------- Client-side presigned upload helper ---------- */

export interface UploadToS3Options {
  file: File;
  folder: ES3Folder;
  trackerId?: string;
}

export interface UploadResult {
  s3Key: string;
  url: string;
  putUrl: string; // optional: useful for debugging
}

export async function uploadToS3Presigned({ file, folder, trackerId = "unknown" }: UploadToS3Options): Promise<UploadResult> {
  const allowedMimeTypes: EImageMimeType[] = [EImageMimeType.JPEG, EImageMimeType.PNG, EImageMimeType.JPG];

  const mimetype = file.type.toLowerCase() as EImageMimeType;
  if (!allowedMimeTypes.includes(mimetype)) {
    throw new Error("Only JPEG or PNG images are allowed.");
  }

  const MAX_SIZE_MB = 10;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File size exceeds ${MAX_SIZE_MB}MB.`);
  }

  const res = await fetch("/api/v1/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, mimetype, filesize: file.size, trackerId }),
  });

  if (!res.ok) {
    const { message } = await res.json();
    throw new Error(message || "Failed to get presigned URL.");
  }

  const { data }: { data: IPresignResponse } = await res.json();

  await fetch(data.url, {
    method: "PUT",
    headers: { "Content-Type": mimetype },
    body: file,
  });

  return {
    s3Key: data.key,
    url: data.publicUrl,
    putUrl: data.url,
  };
}
