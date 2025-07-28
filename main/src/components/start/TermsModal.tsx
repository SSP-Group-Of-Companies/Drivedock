"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

interface TermsModalProps {
  onAgree: () => void;
  onCancel: () => void;
}

export default function TermsModal({ onAgree, onCancel }: TermsModalProps) {
  const { t } = useTranslation("common");

  return (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onCancel}>
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

        <div className="fixed inset-0 overflow-y-auto flex items-center justify-center px-4">
          <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white p-6 text-left align-middle shadow-xl transition-all">
            <Dialog.Title className="text-lg font-semibold mb-4 text-gray-800">
              {t("start.termsModal.title")}
            </Dialog.Title>

            <div className="max-h-80 overflow-y-auto text-sm text-gray-700 space-y-3 pr-2">
              <p>{t("start.termsModal.intro")}</p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("start.termsModal.items.subcontractor")}</li>
                <li>{t("start.termsModal.items.truthfulInfo")}</li>
                <li>{t("start.termsModal.items.backgroundChecks")}</li>
                <li>
                  {t("start.termsModal.items.companyRules.title")}
                  <ul className="list-[circle] ml-6 mt-1 space-y-1">
                    <li>{t("start.termsModal.items.companyRules.drugPolicy")}</li>
                    <li>{t("start.termsModal.items.companyRules.dashCam")}</li>
                    <li>{t("start.termsModal.items.companyRules.safetyRules")}</li>
                    <li>{t("start.termsModal.items.companyRules.seals")}</li>
                  </ul>
                </li>
                <li>{t("start.termsModal.items.discipline")}</li>
                <li>{t("start.termsModal.items.laws")}</li>
              </ul>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {t("start.termsModal.cancel")}
              </button>
              <button
                onClick={onAgree}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                {t("start.termsModal.agree")}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
