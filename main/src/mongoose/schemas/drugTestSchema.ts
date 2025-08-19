import { Schema } from "mongoose";
import { IDrugTestDoc } from "@/types/drugTest.types";

const drugTestSchema = new Schema<IDrugTestDoc>(
  {
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
