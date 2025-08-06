import { deleteS3Objects } from "@/lib/utils/s3Upload";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { keys } = await req.json();

        if (!Array.isArray(keys) || keys.length === 0 || !keys.every(key => typeof key === "string")) {
            return errorResponse(400, "Invalid or missing 'keys'. Expected: string[]");
        }

        const invalidKeys = keys.filter(key => !key.startsWith("temp-files/"));
        if (invalidKeys.length > 0) {
            return errorResponse(403, `Deletion only allowed for 'temp-files'. Invalid keys: ${invalidKeys.join(", ")}`);
        }

        await deleteS3Objects(keys);

        return successResponse(200, "Temp file(s) deleted");
    } catch (err) {
        console.error("Delete failed:", err);
        return errorResponse(err);
    }
}
