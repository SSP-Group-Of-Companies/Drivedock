import { ES3Folder, IPresignRequest, IPresignResponse } from "@/types/aws.types";
import {
    EImageMimeType,
    EImageExtension,
} from "@/types/shared.types";
import { getPresignedPutUrl } from "@/lib/utils/s3Upload";
import {
    DEFAULT_FILE_SIZE_LIMIT_MB,
    DEFAULT_PRESIGN_EXPIRY_SECONDS,
    S3_TEMP_FOLDER,
} from "@/constants/aws";
import {
    successResponse,
    errorResponse,
} from "@/lib/utils/apiResponse";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";

const MAX_FILE_SIZES_MB: Partial<Record<ES3Folder, number>> = {
    [ES3Folder.SIGNATURES]: DEFAULT_FILE_SIZE_LIMIT_MB,
    [ES3Folder.INCORPORATION_PHOTOS]: DEFAULT_FILE_SIZE_LIMIT_MB,
    [ES3Folder.HST_PHOTOS]: DEFAULT_FILE_SIZE_LIMIT_MB,
};

const ALLOWED_IMAGE_MIMETYPES = Object.values(EImageMimeType);
const ALLOWED_IMAGE_EXTENSIONS = Object.values(EImageExtension);

export async function POST(req: NextRequest) {
    try {
        const body = await parseJsonBody<IPresignRequest>(req);
        const { folder, filename, mimetype, trackerId, filesize } = body;

        if (!folder || !filename || !mimetype) {
            return errorResponse(400, "Missing required fields: folder, filename, or mimetype");
        }

        if (!Object.values(ES3Folder).includes(folder)) {
            return errorResponse(400, `Invalid folder. Must be one of: ${Object.values(ES3Folder).join(", ")}`);
        }

        if (!filename || !mimetype) return errorResponse(400, "Missing filename or mimetype")

        if (!ALLOWED_IMAGE_MIMETYPES.includes(mimetype.toLowerCase() as EImageMimeType)) {
            return errorResponse(400, "Only image uploads are allowed");
        }

        const ext = filename.split(".").pop()?.toLowerCase();
        if (!ext || !ALLOWED_IMAGE_EXTENSIONS.includes(ext as EImageExtension)) {
            return errorResponse(
                400,
                `Invalid file extension ".${ext}". Only ${ALLOWED_IMAGE_EXTENSIONS.join(", ")} are allowed.`
            );
        }

        const maxMB = MAX_FILE_SIZES_MB[folder] || DEFAULT_FILE_SIZE_LIMIT_MB;
        if (filesize && filesize > maxMB * 1024 * 1024) {
            return errorResponse(400, `File exceeds ${maxMB}MB limit`);
        }

        const safeTrackerId = trackerId ?? "unknown";
        const folderPrefix = `${S3_TEMP_FOLDER}/${folder}/${safeTrackerId}`;

        const uniqueSuffix = `${Date.now()}-${randomUUID()}`;
        const baseName = filename.replace(/\.[^/.]+$/, "");

        const finalFilename = `${baseName}-${uniqueSuffix}.${ext}`;
        const fullKey = `${folderPrefix}/${finalFilename}`;

        const { url } = await getPresignedPutUrl({
            folder: fullKey,
            fileType: mimetype,
        });

        const result: IPresignResponse = {
            key: fullKey,
            url,
            expiresIn: DEFAULT_PRESIGN_EXPIRY_SECONDS,
        };

        return successResponse(200, "Presigned URL generated", result);
    } catch (err) {
        return errorResponse(err);
    }
}
