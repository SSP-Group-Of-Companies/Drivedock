// src/mongoose/models/CarriersEdgeTraining.ts
import { Schema } from "mongoose";
import { ICarriersEdgeTrainingDoc } from "@/types/carriersEdgeTraining.types";
import { fileSchema } from "./sharedSchemas";

const carriersEdgeTrainingSchema = new Schema<ICarriersEdgeTrainingDoc>(
  {
    // Email status
    emailSent: { type: Boolean, default: false, required: [true, "emailSent is required"] },
    emailSentBy: {
      type: String,
      trim: true,
      validate: {
        validator: function (this: ICarriersEdgeTrainingDoc, v: string | undefined) {
          return !this.emailSent || !!(v && v.trim().length > 0);
        },
        message: "emailSentBy is required when emailSent is true",
      },
    },
    emailSentAt: {
      type: Date,
      validate: {
        validator: function (this: ICarriersEdgeTrainingDoc, v: Date | undefined) {
          return !this.emailSent || v instanceof Date;
        },
        message: "emailSentAt is required when emailSent is true",
      },
    },

    // Certificates can be image/pdf/doc/docx
    certificates: {
      type: [fileSchema],
      default: [],
      required: [true, "certificates is required"],
    },

    completed: { type: Boolean, default: false, required: [true, "completed is required"] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

carriersEdgeTrainingSchema.index({ emailSent: 1 }, { name: "emailSent" });
carriersEdgeTrainingSchema.index({ emailSent: 1, emailSentAt: 1 }, { name: "emailSentWithDate" });

export default carriersEdgeTrainingSchema;
