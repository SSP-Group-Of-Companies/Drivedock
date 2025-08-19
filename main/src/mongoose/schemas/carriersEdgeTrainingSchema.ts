import { Schema } from "mongoose";
import { ICarriersEdgeTrainingDoc } from "@/types/carriersEdgeTraining.types";

const carriersEdgeTrainingSchema = new Schema<ICarriersEdgeTrainingDoc>(
  {
    emailSent: {
      type: Boolean,
      default: false,
      required: [true, "emailSent is required"],
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

carriersEdgeTrainingSchema.index({ emailSent: 1 }, { name: "emailSent" });

export default carriersEdgeTrainingSchema;
