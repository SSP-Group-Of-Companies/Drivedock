"use client";

import { useFormContext } from "react-hook-form";
import { useProtectedRouter } from "@/hooks/onboarding/useProtectedRouter";
import { useFormErrorScroll } from "@/hooks/useFormErrorScroll";
import { useState } from "react";
import CompetencyConfirmSubmitModal from "./CompetencyConfirmSubmitModal";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/lib/onboarding/apiClient";
import { ErrorManager } from "@/lib/onboarding/errorManager";

type Props = {
  score: number | null;
  setScore: (score: number) => void;
  trackerId: string;
  justSubmitted: boolean;
  setJustSubmitted: (val: boolean) => void;
  checkboxChecked: boolean;
  setHighlightError: (val: boolean) => void;
};

export default function CompetencyStepButton({ score, setScore, trackerId, justSubmitted, setJustSubmitted, checkboxChecked, setHighlightError }: Props) {
  const {
    trigger,
    getValues,
    formState: { errors },
  } = useFormContext();
  const { t } = useTranslation("common");
  const router = useProtectedRouter();
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
      // Set retry callback for error handling
      const errorManager = ErrorManager.getInstance();
      errorManager.setRetryCallback(() => {
        handleSubmit();
      });

      const response = await apiClient.patch(`/api/v1/onboarding/${trackerId}/application-form/page-5`, {
        answers: values.answers
      });

      // Clear retry callback after response
      errorManager.clearRetryCallback();

      if (!response.success) {
        // Error handling is now managed by the API client and ErrorManager
        return;
      }

      const updatedScore = (response.data as any)?.page5?.score;

      if (typeof updatedScore === "number") {
        setScore(updatedScore);
        setJustSubmitted(true);
        setErrorMessage(null); // Clear any previous error
      } else {
        setErrorMessage("Something went wrong. No score returned.");
      }
    } catch (err: any) {
      console.error(err);
      // Error display is now handled by ErrorManager - keep local error for score display
      setErrorMessage("Failed to submit. Please try again.");
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
