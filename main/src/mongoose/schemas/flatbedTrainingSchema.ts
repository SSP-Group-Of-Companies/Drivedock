import { Schema } from "mongoose";
import { IFlatbedTrainingDoc } from "@/types/flatbedTraining.types";
import { fileSchema } from "./sharedSchemas";

const flatbedTrainingSchema = new Schema<IFlatbedTrainingDoc>(
  {
    flatbedCertificates: {
      type: [fileSchema],
      validate: {
        validator: function (this: IFlatbedTrainingDoc, value: any[]) {
          // Require at least one certificate if completed is true
          if (this.completed) {
            return Array.isArray(value) && value.length > 0;
          }
          return true; // not required if not completed
        },
        message: "At least one flatbed certificate is required when training is completed.",
      },
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
