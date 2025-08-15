/**
 * Terms Modal Component — DriveDock
 *
 * Description:
 * A modal dialog that presents the company's terms and conditions to the user.
 * This modal is typically triggered before allowing the user to check the
 * onboarding consent checkbox.
 *
 * Key Components & Hooks:
 * - `useMounted`: Prevents hydration mismatch by ensuring rendering occurs only after mount.
 * - `@headlessui/react` `Dialog` + `Transition`: Provides accessible, animated modal UI.
 * - `useTranslation`: Loads multilingual strings for the modal content.
 *
 * Props:
 * - `onAgree` (function): Callback when the user clicks the Agree button.
 * - `onCancel` (function): Callback when the user cancels or closes the modal.
 *
 * Functionality:
 * - Renders a scrollable list of terms with bullet points and nested sub-points.
 * - Darkened, blurred backdrop behind the modal to focus attention.
 * - Provides two actions — Cancel (close without agreement) and Agree (proceed).
 * - Content and labels are translation-driven from `common.json`.
 *
 * Routing:
 * - Typically used within `/start` onboarding flow, triggered by the `ConsentCheckbox` component.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

// Components & hooks
import useMounted from "@/hooks/useMounted";

interface TermsModalProps {
  onAgree: () => void;
  onCancel: () => void;
}

export default function TermsModal({ onAgree, onCancel }: TermsModalProps) {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  // Avoid rendering until mounted to prevent hydration mismatch
  if (!mounted) return null;

  return (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onCancel}>
        {/* Backdrop overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto flex items-center justify-center px-4">
          <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white p-6 text-left align-middle shadow-xl transition-all">
            {/* Title */}
            <Dialog.Title className="text-center font-bold mb-4 text-gray-800">
              {t("start.policiesModal.title")}
            </Dialog.Title>

            {/* Title */}
            <p className="text-sm text-gray-700 pb-6 text-left">
              {t("start.policiesModal.sub-title")}
            </p>

            {/* Scrollable terms content */}
            <div className="max-h-80 overflow-y-auto text-sm text-gray-700 space-y-3 pr-2">
              <p className="mt-2 text-gray-600 font-semibold">
                {t("start.policiesModal.section.WhatInfo")}
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  {t("start.policiesModal.section.WhatInfoItems.itemOne")}
                </li>
                <li>
                  {t("start.policiesModal.section.WhatInfoItems.itemTwo")}
                </li>
                <li>
                  {t("start.policiesModal.section.WhatInfoItems.itemThree")}
                </li>
                <li>
                  {t("start.policiesModal.section.WhatInfoItems.itemFour")}
                </li>
              </ul>

              <p className="mt-2 text-gray-600 font-semibold">
                {t("start.policiesModal.section.whyInfo")}
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("start.policiesModal.section.WhyInfoItems.itemOne")}</li>
                <li>{t("start.policiesModal.section.WhyInfoItems.itemTwo")}</li>
                <li>
                  {t("start.policiesModal.section.WhyInfoItems.itemThree")}
                </li>
                <li>
                  {t("start.policiesModal.section.WhyInfoItems.itemFour")}
                </li>
              </ul>

              <p className="mt-2 text-gray-600 font-semibold">
                {t("start.policiesModal.section.whoInfo")}
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("start.policiesModal.section.WhoInfoItems.itemOne")}</li>
                <li>{t("start.policiesModal.section.WhoInfoItems.itemTwo")}</li>
                <li>
                  {t("start.policiesModal.section.WhoInfoItems.itemThree")}
                </li>
              </ul>

              <p className="mt-2 text-gray-600 font-semibold">
                {t("start.policiesModal.section.howLong")}
              </p>
              <p className="mt-2">
                {t("start.policiesModal.section.duration")}
              </p>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {t("start.policiesModal.cancel")}
              </button>
              <button
                onClick={onAgree}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                {t("start.policiesModal.agree")}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
