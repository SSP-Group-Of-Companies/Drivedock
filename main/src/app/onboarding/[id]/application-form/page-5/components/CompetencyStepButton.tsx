"use client";

import { useRouter } from "next/navigation";
import { useFormContext } from "react-hook-form";
import { useFormErrorScroll } from "@/hooks/useFormErrorScroll";
import { useState } from "react";
import CompetencyConfirmSubmitModal from "./CompetencyConfirmSubmitModal";
import { useTranslation } from "react-i18next";

type Props = {
  score: number | null;
  setScore: (score: number) => void;
  trackerId: string;
  justSubmitted: boolean;
  setJustSubmitted: (val: boolean) => void;
  checkboxChecked: boolean;
  setHighlightError: (val: boolean) => void;
  /** Let parent capture the final answers for results UI */
  onSuccessfulSubmit: (answers: { questionId: string; answerId: string }[]) => void;
};

export default function CompetencyStepButton({ score, setScore, trackerId, justSubmitted, setJustSubmitted, checkboxChecked, setHighlightError, onSuccessfulSubmit }: Props) {
  const {
    trigger,
    getValues,
    formState: { errors },
  } = useFormContext();
  const { t } = useTranslation("common");
  const router = useRouter();
  const { handleFormError } = useFormErrorScroll();
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nextRoute = `/onboarding/${trackerId}/policies-consents`;

  const handleContinue = () => {
    if (justSubmitted && !checkboxChecked) {
      setHighlightError(true);
      return;
    }
    router.push(nextRoute);
  };

  const handleValidationAndConfirm = async () => {
    const isValid = await trigger();
    if (!isValid) {
      handleFormError(errors);
      return;
    }
    setErrorMessage(null);
    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    const values = getValues();
    setShowConfirmModal(false);
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/onboarding/${trackerId}/application-form/page-5`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: values.answers }),
      });

      const json = await res.json();

      if (!res.ok) {
        const message = json?.message || "Failed to submit. Please try again.";
        setErrorMessage(message);
        return;
      }

      const updatedScore: number | null = json?.data?.page5?.score ?? null;
      const returnedAnswers: { questionId: string; answerId: string }[] | undefined = json?.data?.page5?.answers;

      if (typeof updatedScore === "number") {
        setScore(updatedScore);
        // mark justSubmitted to trigger top scroll + banner in parent
        setJustSubmitted(true);

        // Surface answers for result rendering (fallback to current form if API doesn't echo them)
        onSuccessfulSubmit(returnedAnswers && returnedAnswers.length ? returnedAnswers : values.answers);
      } else {
        setErrorMessage("Something went wrong. No score returned.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {errorMessage && <p className="text-center text-red-600 font-semibold mb-4">{errorMessage}</p>}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={score === null ? handleValidationAndConfirm : handleContinue}
          disabled={loading}
          className={`px-8 py-2 mt-6 rounded-full font-semibold transition-colors shadow-md flex items-center gap-2
            ${loading ? "bg-gray-400 text-white cursor-not-allowed" : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"}
        `}
        >
          {t(loading ? "actions.processing" : score === null ? "actions.submitAnswers" : "form.continue")}
        </button>
      </div>

      <CompetencyConfirmSubmitModal open={showConfirmModal} onCancel={() => setShowConfirmModal(false)} onConfirm={handleSubmit} />
    </>
  );
}
