// main/src/app/api/v1/presign/route.ts
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { ES3Folder, IPresignRequest, IPresignResponse } from "@/types/aws.types";
import { EFileMimeType } from "@/types/shared.types";
import { getPresignedPutUrl } from "@/lib/utils/s3Upload";
import { DEFAULT_FILE_SIZE_LIMIT_MB, DEFAULT_PRESIGN_EXPIRY_SECONDS, S3_TEMP_FOLDER } from "@/constants/aws";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { AWS_BUCKET_NAME, AWS_REGION } from "@/config/env";

/** Allowed mimeTypes per folder */
const IMAGE_ONLY = [EFileMimeType.JPEG, EFileMimeType.JPG, EFileMimeType.PNG] as const;

const IMAGES_AND_DOCS = [EFileMimeType.JPEG, EFileMimeType.JPG, EFileMimeType.PNG, EFileMimeType.PDF, EFileMimeType.DOC, EFileMimeType.DOCX] as const;

const PDF_ONLY = [EFileMimeType.PDF] as const;

/**
 * Folder → allowed mimetypes mapping
 *
 * - CARRIERS_EDGE_CERTIFICATES, DRUG_TEST_DOCS, FLATBED_TRAINING_CERTIFICATES: images + docs
 * - SIGNATURES: images only
 * - All others: pdf only
 */
const FOLDER_ALLOWED_MIME: Record<ES3Folder, readonly EFileMimeType[]> = {
  [ES3Folder.CARRIERS_EDGE_CERTIFICATES]: IMAGES_AND_DOCS,
  [ES3Folder.DRUG_TEST_DOCS]: IMAGES_AND_DOCS,
  [ES3Folder.FLATBED_TRAINING_CERTIFICATES]: IMAGES_AND_DOCS,

  [ES3Folder.SIGNATURES]: IMAGE_ONLY,

  [ES3Folder.LICENSES]: PDF_ONLY,
  [ES3Folder.HEALTH_CARD_PHOTOS]: PDF_ONLY,
  [ES3Folder.PASSPORT_PHOTOS]: PDF_ONLY,
  [ES3Folder.PR_CITIZENSHIP_PHOTOS]: PDF_ONLY,
  [ES3Folder.INCORPORATION_PHOTOS]: PDF_ONLY,
  [ES3Folder.HST_PHOTOS]: PDF_ONLY,
  [ES3Folder.BANKING_INFO_PHOTOS]: PDF_ONLY,
  [ES3Folder.US_VISA_PHOTOS]: PDF_ONLY,
  [ES3Folder.SIN_PHOTOS]: PDF_ONLY,
  [ES3Folder.MEDICAL_CERT_PHOTOS]: PDF_ONLY,
  [ES3Folder.FAST_CARD_PHOTOS]: PDF_ONLY,
  [ES3Folder.DRIVE_TEST]: PDF_ONLY,
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
    const { folder, mimeType, trackerId, filesize } = body || {};

    if (!folder || !mimeType) {
      return errorResponse(400, "Missing required fields: folder or mimeType");
    }

    if (!Object.values(ES3Folder).includes(folder)) {
      return errorResponse(400, `Invalid folder. Must be one of: ${Object.values(ES3Folder).join(", ")}`);
    }

    const normalizedMime = (mimeType as string).toLowerCase() as EFileMimeType;

    const allowed = FOLDER_ALLOWED_MIME[folder];
    if (!allowed.includes(normalizedMime)) {
      return errorResponse(400, `Invalid file type for ${folder}. Allowed: ${allowed.join(", ")}`);
    }

    const extFromMime = MIME_TO_EXT_MAP[normalizedMime];
    if (!extFromMime) {
      return errorResponse(400, `Unsupported mimeType: ${mimeType}`);
    }

    const maxMB = DEFAULT_FILE_SIZE_LIMIT_MB;
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
      mimeType: normalizedMime, // canonical mimeType
    };

    return successResponse(200, "Presigned URL generated", result);
  } catch (err) {
    return errorResponse(err);
  }
}
