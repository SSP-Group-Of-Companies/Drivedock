import { useFormContext } from "react-hook-form";
import { competencyQuestions } from "@/constants/competencyTestQuestions";
import clsx from "clsx";

type Props = {
  disabled?: boolean;
};

export default function CompetencyQuestionList({ disabled }: Props) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext();

  const answers = watch("answers");
  const answerErrors = errors.answers as any[] | undefined;

  return (
    <div className="space-y-10">
      {competencyQuestions.map((question, index) => {
        const inputName = `answers.${index}.answerId` as const;
        const currentAnswerId = answers?.[index]?.answerId || "";
        const errorMessage = answerErrors?.[index]?.answerId?.message as string | undefined;

        return (
          <div key={question.questionId} className="p-4 bg-white shadow rounded-xl" data-field={`answers.${index}.answerId`}>
            <div className="font-medium mb-4">{question.questionText}</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {question.options.map((option) => (
                <label
                  key={option.id}
                  className={clsx("border rounded-md p-3 text-left cursor-pointer transition", currentAnswerId === option.id ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:bg-gray-50")}
                >
                  <input type="radio" value={option.id} {...register(inputName)} className="sr-only" disabled={disabled} />
                  <div className="block">
                    <span className="uppercase font-medium">{option.id}.</span> {option.value}
                  </div>
                </label>
              ))}
            </div>

            {errorMessage && <p className="mt-2 text-sm text-red-600 font-medium">{errorMessage}</p>}

            <input type="hidden" value={question.questionId} {...register(`answers.${index}.questionId`)} />
          </div>
        );
      })}
    </div>
  );
}
