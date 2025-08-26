import { Schema } from "mongoose";
import { IDrugTestDoc, EDrugTestStatus } from "@/types/drugTest.types";
import { photoSchema } from "./sharedSchemas";

const allowedStatuses = Object.values(EDrugTestStatus);

const drugTestSchema = new Schema<IDrugTestDoc>(
  {
    documents: {
      type: [photoSchema],
      default: [],
      required: [true, "documents is required"],
    },
    status: {
      type: String,
      enum: {
        values: allowedStatuses,
        message: `Invalid status . Allowed values are: ${allowedStatuses.join(", ")}`,
      },
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

drugTestSchema.index({ status: 1, updatedAt: -1 }, { name: "status_updatedAt" });

export default drugTestSchema;
