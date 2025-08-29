import { Schema } from "mongoose";
import { IFlatbedTrainingDoc } from "@/types/flatbedTraining.types";

const flatbedTrainingSchema = new Schema<IFlatbedTrainingDoc>(
  {
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

export default flatbedTrainingSchema;
