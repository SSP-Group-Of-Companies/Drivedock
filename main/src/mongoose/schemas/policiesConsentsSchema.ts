import { Schema } from "mongoose";
import { fileSchema } from "./sharedSchemas";
import { IPoliciesConsentsDoc } from "@/types/policiesConsents.types";
import { isImageMime } from "@/types/shared.types";

const policiesConsentsSchema = new Schema<IPoliciesConsentsDoc>(
  {
    signature: {
      type: fileSchema,
      required: [true, "Signature is required"],
      validate: {
        validator: (v: any) => v && isImageMime(v?.mimeType),
        message: "Signature must be an image.",
      },
    },
    signedAt: {
      type: Date,
      required: [true, "SignedAt timestamp is required"],
    },
    sendPoliciesByEmail: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default policiesConsentsSchema;
