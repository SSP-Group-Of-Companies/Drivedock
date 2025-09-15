// src/mongoose/models/DrugTest.ts
import { Schema } from "mongoose";
import { IDrugTestDoc, EDrugTestStatus } from "@/types/drugTest.types";
import { fileSchema } from "./sharedSchemas";

const allowedStatuses = Object.values(EDrugTestStatus);

const drugTestSchema = new Schema<IDrugTestDoc>(
  {
    // documents can be image/pdf/doc/docx
    adminDocuments: {
      type: [fileSchema],
      default: [],
      required: [true, "documents is required"],
      minlength: [1, "At least one admin document is required"],
    },
    driverDocuments: {
      type: [fileSchema],
      default: [],
      required: [true, "documents is required"],
    },
    status: {
      type: String,
      enum: {
        values: allowedStatuses,
        message: `Invalid status. Allowed values are: ${allowedStatuses.join(", ")}`,
      },
      required: [true, "status is required"],
      default: EDrugTestStatus.NOT_UPLOADED, // or your desired default
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

drugTestSchema.index({ status: 1, updatedAt: -1 }, { name: "status_updatedAt" });

export default drugTestSchema;
