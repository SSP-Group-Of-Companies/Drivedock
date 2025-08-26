import { Schema } from "mongoose";
import { ICarriersEdgeTrainingDoc } from "@/types/carriersEdgeTraining.types";
import { photoSchema } from "./sharedSchemas";

const carriersEdgeTrainingSchema = new Schema<ICarriersEdgeTrainingDoc>(
  {
    // Email status
    emailSent: {
      type: Boolean,
      default: false,
      required: [true, "emailSent is required"],
    },
    // NEW: who sent the email (admin display name or username)
    emailSentBy: {
      type: String,
      trim: true,
      // Only required when emailSent is true
      validate: {
        validator: function (this: ICarriersEdgeTrainingDoc, v: string | undefined) {
          return !this.emailSent || !!(v && v.trim().length > 0);
        },
        message: "emailSentBy is required when emailSent is true",
      },
    },
    // NEW: when the email was sent
    emailSentAt: {
      type: Date,
      // Only required when emailSent is true
      validate: {
        validator: function (this: ICarriersEdgeTrainingDoc, v: Date | undefined) {
          return !this.emailSent || v instanceof Date;
        },
        message: "emailSentAt is required when emailSent is true",
      },
    },

    // Existing fields
    certificates: {
      type: [photoSchema],
      default: [],
      required: [true, "certificates is required"],
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

// Keep your existing index
carriersEdgeTrainingSchema.index({ emailSent: 1 }, { name: "emailSent" });

// (Optional but handy): fast lookup for "need to send" vs "already sent"
carriersEdgeTrainingSchema.index({ emailSent: 1, emailSentAt: 1 }, { name: "emailSentWithDate" });

export default carriersEdgeTrainingSchema;
