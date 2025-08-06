import { ES3Folder, IPresignRequest, IPresignResponse } from "@/types/aws.types";
import { EImageMimeType, EImageExtension } from "@/types/shared.types";
import { getPresignedPutUrl } from "@/lib/utils/s3Upload";
import {
    DEFAULT_FILE_SIZE_LIMIT_MB,
    DEFAULT_PRESIGN_EXPIRY_SECONDS,
    S3_TEMP_FOLDER,
} from "@/constants/aws";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { AWS_BUCKET_NAME, AWS_REGION } from "@/config/env";

const MAX_FILE_SIZES_MB: Partial<Record<ES3Folder, number>> = {
    [ES3Folder.SIGNATURES]: DEFAULT_FILE_SIZE_LIMIT_MB,
    [ES3Folder.INCORPORATION_PHOTOS]: DEFAULT_FILE_SIZE_LIMIT_MB,
    [ES3Folder.HST_PHOTOS]: DEFAULT_FILE_SIZE_LIMIT_MB,
};

const ALLOWED_IMAGE_MIMETYPES = Object.values(EImageMimeType);

// Mimetype → Extension mapping
const MIME_TO_EXT_MAP: Record<EImageMimeType, EImageExtension> = {
    [EImageMimeType.JPEG]: EImageExtension.JPEG,
    [EImageMimeType.JPG]: EImageExtension.JPEG,
    [EImageMimeType.PNG]: EImageExtension.PNG,

};

export async function POST(req: NextRequest) {
    try {
        const body = await parseJsonBody<IPresignRequest>(req);
        const { folder, mimetype, trackerId, filesize } = body;

        if (!folder || !mimetype) {
            return errorResponse(400, "Missing required fields: folder or mimetype");
        }

        if (!Object.values(ES3Folder).includes(folder)) {
            return errorResponse(400, `Invalid folder. Must be one of: ${Object.values(ES3Folder).join(", ")}`);
        }

        const lowerMime = mimetype.toLowerCase() as EImageMimeType;
        if (!ALLOWED_IMAGE_MIMETYPES.includes(lowerMime as EImageMimeType)) {
            return errorResponse(400, "Only JPEG or PNG image uploads are allowed.");
        }

        const ext = MIME_TO_EXT_MAP[lowerMime];
        if (!ext) {
            return errorResponse(400, `Unsupported mimetype: ${mimetype}`);
        }

        const maxMB = MAX_FILE_SIZES_MB[folder] || DEFAULT_FILE_SIZE_LIMIT_MB;
        if (filesize && filesize > maxMB * 1024 * 1024) {
            return errorResponse(400, `File exceeds ${maxMB}MB limit`);
        }

        const safeTrackerId = trackerId ?? "unknown";
        const folderPrefix = `${S3_TEMP_FOLDER}/${folder}/${safeTrackerId}`;
        const finalFilename = `${Date.now()}-${randomUUID()}.${ext}`;
        const fullKey = `${folderPrefix}/${finalFilename}`;

        const { url } = await getPresignedPutUrl({
            key: fullKey,
            fileType: mimetype,
        });

        const publicUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fullKey}`;

        const result: IPresignResponse = {
            key: fullKey,
            url,
            publicUrl,
            expiresIn: DEFAULT_PRESIGN_EXPIRY_SECONDS,
        };


        return successResponse(200, "Presigned URL generated", result);
    } catch (err) {
        return errorResponse(err);
    }
}
