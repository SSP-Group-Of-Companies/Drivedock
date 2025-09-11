import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { ES3Folder, IPresignRequest, IPresignResponse } from "@/types/aws.types";
import { EFileMimeType } from "@/types/shared.types";
import { getPresignedPutUrl } from "@/lib/utils/s3Upload";
import { DEFAULT_FILE_SIZE_LIMIT_MB, DEFAULT_PRESIGN_EXPIRY_SECONDS, S3_TEMP_FOLDER } from "@/constants/aws";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { AWS_BUCKET_NAME, AWS_REGION } from "@/config/env";

/** Allowed mime types per folder */
const IMAGE_ONLY = [EFileMimeType.JPEG, EFileMimeType.JPG, EFileMimeType.PNG] as const;
const IMAGES_AND_DOCS = [EFileMimeType.JPEG, EFileMimeType.JPG, EFileMimeType.PNG, EFileMimeType.PDF, EFileMimeType.DOC, EFileMimeType.DOCX] as const;

const FOLDER_ALLOWED_MIME: Partial<Record<ES3Folder, readonly EFileMimeType[]>> = {
  [ES3Folder.DRUG_TEST_DOCS]: IMAGES_AND_DOCS,
  [ES3Folder.CARRIERS_EDGE_CERTIFICATES]: IMAGES_AND_DOCS,
};

const MAX_FILE_SIZES_MB: Partial<Record<ES3Folder, number>> = {
  [ES3Folder.SIGNATURES]: DEFAULT_FILE_SIZE_LIMIT_MB,
  [ES3Folder.INCORPORATION_PHOTOS]: DEFAULT_FILE_SIZE_LIMIT_MB,
  [ES3Folder.HST_PHOTOS]: DEFAULT_FILE_SIZE_LIMIT_MB,
  [ES3Folder.MEDICAL_CERT_PHOTOS]: DEFAULT_FILE_SIZE_LIMIT_MB,
  [ES3Folder.FAST_CARD_PHOTOS]: DEFAULT_FILE_SIZE_LIMIT_MB,
  [ES3Folder.DRUG_TEST_DOCS]: DEFAULT_FILE_SIZE_LIMIT_MB,
  [ES3Folder.CARRIERS_EDGE_CERTIFICATES]: DEFAULT_FILE_SIZE_LIMIT_MB,
  [ES3Folder.DRIVE_TEST]: DEFAULT_FILE_SIZE_LIMIT_MB,
};

/** Mimetype → extension mapping */
const MIME_TO_EXT_MAP: Record<EFileMimeType, string> = {
  [EFileMimeType.JPEG]: "jpeg",
  [EFileMimeType.JPG]: "jpg",
  [EFileMimeType.PNG]: "png",
  [EFileMimeType.PDF]: "pdf",
  [EFileMimeType.DOC]: "doc",
  [EFileMimeType.DOCX]: "docx",
};

export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody<IPresignRequest>(req);
    const { folder, mimetype, trackerId, filesize } = body || {};

    if (!folder || !mimetype) {
      return errorResponse(400, "Missing required fields: folder or mimetype");
    }

    if (!Object.values(ES3Folder).includes(folder)) {
      return errorResponse(400, `Invalid folder. Must be one of: ${Object.values(ES3Folder).join(", ")}`);
    }

    const allowed = FOLDER_ALLOWED_MIME[folder] ?? IMAGE_ONLY;
    const normalizedMime = (mimetype as string).toLowerCase() as EFileMimeType;

    if (!allowed.includes(normalizedMime)) {
      return errorResponse(400, `Invalid file type for ${folder}. Allowed: ${allowed.join(", ")}`);
    }

    const extFromMime = MIME_TO_EXT_MAP[normalizedMime];
    if (!extFromMime) {
      return errorResponse(400, `Unsupported mimetype: ${mimetype}`);
    }

    const maxMB = MAX_FILE_SIZES_MB[folder] ?? DEFAULT_FILE_SIZE_LIMIT_MB;
    if (filesize && filesize > maxMB * 1024 * 1024) {
      return errorResponse(400, `File exceeds ${maxMB}MB limit`);
    }

    const safeTrackerId = trackerId ?? "unknown";
    const folderPrefix = `${S3_TEMP_FOLDER}/${folder}/${safeTrackerId}`;
    const finalFilename = `${Date.now()}-${randomUUID()}.${extFromMime}`;
    const fullKey = `${folderPrefix}/${finalFilename}`;

    const { url } = await getPresignedPutUrl({
      key: fullKey,
      fileType: normalizedMime, // signed with Content-Type
    });

    const publicUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fullKey}`;

    const result: IPresignResponse = {
      key: fullKey,
      url,
      publicUrl,
      expiresIn: DEFAULT_PRESIGN_EXPIRY_SECONDS,
      mimetype: normalizedMime, // ← include canonical mimetype
    };

    return successResponse(200, "Presigned URL generated", result);
  } catch (err) {
    return errorResponse(err);
  }
}
