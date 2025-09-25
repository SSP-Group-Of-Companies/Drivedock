// src/mongoose/models/sharedSchemas.ts
import { Schema } from "mongoose";
import type { IFileAsset } from "@/types/shared.types";

/**
 * Generic file asset schema (images, PDFs, docs, etc.)
 * - Strict: mimeType is REQUIRED for reliability across the app.
 * - Optional metadata: sizeBytes, originalName.
 *
 * BREAKING: This replaces photoSchema. There is no photoSchema export anymore.
 */
export const fileSchema = new Schema<IFileAsset>(
  {
    url: { type: String, required: [true, "File URL is required."] },
    s3Key: { type: String, required: [true, "S3 storage key is required."] },
    mimeType: { type: String, required: [true, "mimeType is required."] },
    sizeBytes: { type: Number },
    originalName: { type: String },
  },
  { timestamps: true }
);
