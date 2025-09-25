import { z } from "zod";
import { competencyQuestions } from "@/constants/competencyTestQuestions";

const TOTAL_QUESTIONS = competencyQuestions.length;
const VALID_QUESTION_IDS = competencyQuestions.map((q) => q.questionId);

// Zod schema for ICompetencyAnswer
export const competencyAnswerSchema = z
  .object({
    questionId: z.string().min(1, "Question is required."),
    answerId: z.string().min(1, "Answer is required."),
  })
  .refine((answer) => VALID_QUESTION_IDS.includes(answer.questionId), { message: "Invalid questionId", path: ["questionId"] })
  .refine(
    (answer) => {
      const question = competencyQuestions.find((q) => q.questionId === answer.questionId);
      return question?.options.some((opt) => opt.id === answer.answerId);
    },
    { message: "Invalid answerId for the given questionId", path: ["answerId"] }
  );

// Zod schema for IApplicationFormPage5 (without score)
export const applicationFormPage5Schema = z.object({
  answers: z
    .array(competencyAnswerSchema)
    .length(TOTAL_QUESTIONS, `Exactly ${TOTAL_QUESTIONS} answers are required.`)
    .refine(
      (answers) => {
        const uniqueIds = new Set(answers.map((ans) => ans.questionId));
        return uniqueIds.size === answers.length;
      },
      { message: "Duplicate questionId entries found in answers array." }
    ),
});

export type ApplicationFormPage5Input = z.infer<typeof applicationFormPage5Schema>;
export type ApplicationFormPage5Schema = z.infer<typeof applicationFormPage5Schema>;
