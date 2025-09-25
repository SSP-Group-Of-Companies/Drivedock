import { IApplicationFormPage5, ICompetencyAnswer } from "@/types/applicationForm.types";
import { Schema } from "mongoose";

export const competencyAnswerSchema = new Schema<ICompetencyAnswer>(
  {
    questionId: {
      type: String,
      required: [true, "Each answer must include a question ID."],
    },
    answerId: {
      type: String,
      required: [true, "Each answer must include an answer ID."],
    },
  }
);

export const applicationFormPage5Schema = new Schema<IApplicationFormPage5>(
  {
    answers: {
      type: [competencyAnswerSchema],
      required: [true, "Answers array is required."],
      validate: {
        validator: (v: ICompetencyAnswer[]) => Array.isArray(v) && v.length > 0,
        message: "At least one competency answer must be provided.",
      },
    },
    score: {
      type: Number,
      required: [true, "A score must be calculated for the competency test."],
      min: [0, "Score cannot be negative."],
    },
  },
  { timestamps: true }
);
