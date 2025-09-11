"use client";

import { useTranslation } from "react-i18next";

type Props = {
  onSubmit: () => void;
  submitting: boolean;
  disabled?: boolean;
};

export default function PoliciesSubmitSection({ onSubmit, submitting, disabled = false }: Props) {
  const { t } = useTranslation("common");
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || submitting}
        className={`px-8 py-2 mt-6 rounded-full font-semibold transition-colors shadow-md flex items-center gap-2
          ${disabled || submitting ? "bg-gray-400 text-white cursor-not-allowed" : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90 cursor-pointer"}
        `}
      >
        {submitting ? t("form.submitting", "Submitting...") : t("form.continue", "Continue")}
      </button>
    </div>
  );
}
