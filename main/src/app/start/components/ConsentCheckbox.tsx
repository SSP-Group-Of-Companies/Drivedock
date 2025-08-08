/**
 * Consent Checkbox Component — DriveDock
 *
 * Description:
 * This component is used to capture the user's agreement to the terms and conditions
 * before they can proceed in the onboarding process. Instead of checking the box directly,
 * clicking on it opens a `TermsModal` where the user can read and agree to the terms.
 *
 * Key Components & Hooks:
 * - `useMounted`: Prevents hydration mismatches by rendering only after client mount.
 * - `TermsModal`: Modal displaying the terms and conditions with Agree/Cancel options.
 * - `useTranslation`: Provides multilingual label text from `common.json`.
 *
 * Props:
 * - `agreed` (boolean): Whether the user has already agreed to the terms.
 * - `setAgreed` (function): Setter to update the `agreed` state in the parent component.
 *
 * Functionality:
 * - If the user has not yet agreed, clicking the checkbox or label opens the `TermsModal`.
 * - The modal contains an Agree button which sets `agreed` to true and closes the modal.
 * - Prevents direct manual checking of the box without modal confirmation.
 *
 * Routing:
 * This component is typically used on onboarding start pages (e.g., `/start`) before allowing progression.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

// Components & hooks
import useMounted from "@/hooks/useMounted";
import TermsModal from "./TermsModal";

interface ConsentCheckboxProps {
  agreed: boolean;
  setAgreed: (value: boolean) => void;
}

export default function ConsentCheckbox({
  agreed,
  setAgreed,
}: ConsentCheckboxProps) {
  const [showModal, setShowModal] = useState(false);

  const mounted = useMounted();
  const { t } = useTranslation("common");

  // Opens the modal if terms are not yet agreed to
  const handleOpen = () => {
    if (!agreed) setShowModal(true);
  };

  // Sets agreement to true and closes the modal
  const handleAgree = () => {
    setAgreed(true);
    setShowModal(false);
  };

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;

  return (
    <div className="flex items-start mt-4">
      {/* Checkbox (readOnly) that opens the terms modal instead of toggling directly */}
      <input
        type="checkbox"
        checked={agreed}
        readOnly
        onClick={handleOpen}
        className="h-5 w-5 text-blue-600 border-gray-300 rounded cursor-pointer"
      />

      {/* Label text with same click-to-open behavior */}
      <label
        onClick={handleOpen}
        className="ml-2 text-sm text-gray-700 cursor-pointer select-none"
      >
        {t("start.agreeToTerms")}
      </label>

      {/* Terms and Conditions Modal */}
      {showModal && (
        <TermsModal
          onAgree={handleAgree}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
