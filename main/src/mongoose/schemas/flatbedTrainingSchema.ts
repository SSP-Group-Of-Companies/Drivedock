import { Schema } from "mongoose";
import { IFlatbedTrainingDoc } from "@/types/flatbedTraining.types";

const flatbedTrainingSchema = new Schema<IFlatbedTrainingDoc>(
  {
    trainingWeeks: {
      type: Number,
      enum: [1, 2], // only allow 1 or 2
      default: 1, // default value is 1
      required: [true, "trainingWeeks is required"],
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

export default flatbedTrainingSchema;
