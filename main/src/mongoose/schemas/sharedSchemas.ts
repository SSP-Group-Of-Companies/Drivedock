import { IPhoto } from "@/types/shared.types";
import { Schema } from "mongoose";

export const photoSchema = new Schema<IPhoto>(
  {
    url: {
      type: String,
      required: [true, "Photo URL is required."],
    },
    s3Key: {
      type: String,
      required: [true, "S3 storage key is required."],
    },
  },
  { _id: false, timestamps: true }
);
