"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "lucide-react";
import useMounted from "@/hooks/useMounted";

interface TermsModalProps {
  onAgree: () => void;
  onCancel: () => void;
}

type ModalStep = "terms" | "policies";

export default function TermsModal({ onAgree, onCancel }: TermsModalProps) {
  const mounted = useMounted();
  const { t } = useTranslation("common");
  const [currentStep, setCurrentStep] = useState<ModalStep>("terms");

  // Step 1 gating (checkbox only)
  const [masterChecked, setMasterChecked] = useState(false);

  if (!mounted) return null;

  const reset = () => {
    setCurrentStep("terms");
    setMasterChecked(false);
  };

  const handleNext = () => setCurrentStep("policies");
  const handleBack = () => setCurrentStep("terms");
  const handleCancel = () => {
    reset();
    onCancel();
  };
  const handleAgree = () => {
    reset();
    onAgree();
  };

  const renderTermsStep = () => (
    <>
      <Dialog.Title
        id="terms-title"
        className="text-center font-semibold mb-3 text-gray-900 text-lg"
      >
        {t("start.termsModal.title")}
      </Dialog.Title>

      <p id="terms-intro" className="text-sm text-gray-700 pb-3">
        {t("start.termsModal.intro")}
      </p>

      {/* Top checklist */}
      <div className="mb-4">
        <ul className="space-y-2">
          {["points.accurateInfo", "points.digitalProcess", "points.laws"].map(
            (key) => (
              <li key={key} className="flex items-start gap-3">
                <CheckCircle
                  aria-hidden="true"
                  className="text-blue-500 mt-1 flex-shrink-0"
                  size={16}
                />
                <span className="text-sm text-gray-700">
                  {t(`start.termsModal.${key}`)}
                </span>
              </li>
            )
          )}
        </ul>
      </div>

      {/* Clean, seamless middle section (soft card look) */}
      <section className="bg-gray-50 rounded-lg p-4 shadow-sm">
        <div className="space-y-3 text-sm text-gray-900">
          <p className="font-medium">
            {t("start.termsModal.points.truthfulInfo")}
          </p>
          <p className="font-medium">
            {t("start.termsModal.points.applicationType")}
          </p>

          <div className="pt-2">
            <p className="font-medium mb-2">
              {t("start.termsModal.points.rulesTitle")}
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-800">
              <li>{t("start.termsModal.points.drugPolicy")}</li>
              <li>{t("start.termsModal.points.dashCam")}</li>
              <li>{t("start.termsModal.points.safetyRules")}</li>
              <li>{t("start.termsModal.points.seals")}</li>
            </ul>
          </div>

          <p className="font-medium">{t("start.termsModal.points.laws")}</p>
        </div>
      </section>

      {/* Consent checkbox */}
      <label className="flex items-start gap-2 mt-4">
        <input
          type="checkbox"
          className="mt-0.5"
          aria-describedby="terms-intro"
          checked={masterChecked}
          onChange={(e) => setMasterChecked(e.target.checked)}
          required
        />
        <span className="text-sm text-gray-800">
          {t("start.termsModal.masterConsent")}
        </span>
      </label>

      {/* Actions */}
      <div className="mt-5 flex justify-between gap-2 pb-6">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
        >
          {t("start.termsModal.cancel")}
        </button>
        <button
          onClick={handleNext}
          disabled={!masterChecked}
          className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          aria-disabled={!masterChecked}
        >
          {t("start.termsModal.next")}
        </button>
      </div>
    </>
  );

  const renderPoliciesStep = () => (
    <>
      <Dialog.Title
        id="policies-title"
        className="text-center font-semibold mb-3 text-gray-900 text-lg"
      >
        {t("start.policiesModal.title")}
      </Dialog.Title>

      <p id="policies-sub" className="text-sm text-gray-700 pb-4">
        {t("start.policiesModal.sub-title")}
      </p>

      <div
        className="text-sm text-gray-800 space-y-3"
        aria-describedby="policies-sub"
      >
        <p className="font-semibold">
          {t("start.policiesModal.section.whatInfo")}
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("start.policiesModal.section.whatInfoItems.itemOne")}</li>
          <li>{t("start.policiesModal.section.whatInfoItems.itemTwo")}</li>
          <li>{t("start.policiesModal.section.whatInfoItems.itemThree")}</li>
          <li>{t("start.policiesModal.section.whatInfoItems.itemFour")}</li>
        </ul>

        <p className="font-semibold mt-2">
          {t("start.policiesModal.section.whyInfo")}
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("start.policiesModal.section.whyInfoItems.itemOne")}</li>
          <li>{t("start.policiesModal.section.whyInfoItems.itemTwo")}</li>
          <li>{t("start.policiesModal.section.whyInfoItems.itemThree")}</li>
          <li>{t("start.policiesModal.section.whyInfoItems.itemFour")}</li>
        </ul>

        <p className="font-semibold mt-2">
          {t("start.policiesModal.section.whoInfo")}
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("start.policiesModal.section.whoInfoItems.itemOne")}</li>
          <li>{t("start.policiesModal.section.whoInfoItems.itemTwo")}</li>
          <li>{t("start.policiesModal.section.whoInfoItems.itemThree")}</li>
        </ul>

        <p className="font-semibold mt-2">
          {t("start.policiesModal.section.howLong")}
        </p>
        <p className="mt-1">{t("start.policiesModal.section.duration")}</p>
      </div>

      <div className="mt-5 flex justify-between gap-2 pb-6">
        <button
          onClick={handleBack}
          className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
        >
          {t("start.policiesModal.back")}
        </button>
        <button
          onClick={handleAgree}
          className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
        >
          {t("start.policiesModal.agree")}
        </button>
      </div>
    </>
  );

  return (
    <Transition appear show as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={handleCancel}
        aria-labelledby={
          currentStep === "terms" ? "terms-title" : "policies-title"
        }
      >
        {/* Backdrop */}
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

        {/* Panel */}
        <div className="fixed inset-0 overflow-y-auto flex items-center justify-center px-4 py-4">
          <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-xl transition-all flex flex-col max-h-[90vh]">
            {/* Step indicator */}
            <div className="flex items-center justify-center p-6 pb-4 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === "terms"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {currentStep === "policies" ? (
                    <span className="text-white font-bold">✓</span>
                  ) : (
                    "1"
                  )}
                </div>
                <div
                  className={`w-12 h-0.5 transition-all duration-500 ease-in-out ${
                    currentStep === "policies" ? "bg-blue-600" : "bg-gray-300"
                  }`}
                />
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === "policies"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  2
                </div>
              </div>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-6">
              {currentStep === "terms"
                ? renderTermsStep()
                : renderPoliciesStep()}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
