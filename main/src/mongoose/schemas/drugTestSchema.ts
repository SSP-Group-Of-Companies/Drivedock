import { Schema } from "mongoose";
import { IDrugTestDoc } from "@/types/drugTest.types";
import { photoSchema } from "./sharedSchemas";

const drugTestSchema = new Schema<IDrugTestDoc>(
  {
    documents: {
      type: [photoSchema],
      default: [],
      required: [true, "documents is required"],
    },
    documentsUploaded: {
      type: Boolean,
      default: false,
      required: [true, "documentsUploaded is required"],
    },

    completed: {
      type: Boolean,
      default: false,
      required: [true, "completed is required"],
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

drugTestSchema.index({ documentsUploaded: 1 }, { name: "documentsUploaded" });

export default drugTestSchema;
