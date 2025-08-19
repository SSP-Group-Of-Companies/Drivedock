import { Schema } from "mongoose";
import { photoSchema } from "./sharedSchemas";
import { IPoliciesConsentsDoc } from "@/types/policiesConsents.types";

const policiesConsentsSchema = new Schema<IPoliciesConsentsDoc>(
  {
    signature: {
      type: photoSchema,
      required: true,
    },
    signedAt: {
      type: Date,
      required: true,
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
