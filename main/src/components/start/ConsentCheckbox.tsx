"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import TermsModal from "./TermsModal";

interface ConsentCheckboxProps {
  agreed: boolean;
  setAgreed: (value: boolean) => void;
}

export default function ConsentCheckbox({ agreed, setAgreed }: ConsentCheckboxProps) {
  const [showModal, setShowModal] = useState(false);
  const { t } = useTranslation("common");

  const handleOpen = () => {
    if (!agreed) setShowModal(true);
  };

  const handleAgree = () => {
    setAgreed(true);
    setShowModal(false);
  };

  return (
    <div className="flex items-start mt-4">
      <input
        type="checkbox"
        checked={agreed}
        readOnly
        onClick={handleOpen}
        className="h-5 w-5 text-blue-600 border-gray-300 rounded cursor-pointer"
      />
      <label
        onClick={handleOpen}
        className="ml-2 text-sm text-gray-700 cursor-pointer select-none"
      >
        {t("start.agreeToTerms")}
      </label>

      {showModal && (
        <TermsModal
          onAgree={handleAgree}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
