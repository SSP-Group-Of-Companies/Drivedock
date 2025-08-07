"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, startTransition } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResumeModal({ isOpen, onClose }: ResumeModalProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { setTracker } = useOnboardingTracker();

  const [sin, setSin] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    const cleanedSin = sin.trim();

    if (!cleanedSin) {
      setStatus("error");
      setErrorMessage("Please enter your SIN");
      return;
    }

    if (cleanedSin.length !== 9) {
      setStatus("error");
      setErrorMessage("SIN must be exactly 9 digits");
      return;
    }

    try {
      setStatus("success");

      const res = await fetch(`/api/v1/onboarding/resume/${cleanedSin}`);
      const data = await res.json();

      const trackerContext = data?.data?.onboardingContext;
      const redirectUrl = data?.data?.redirectUrl;

      if (trackerContext && redirectUrl) {
        //  Wrap in transition for safe reroute after Zustand update
        startTransition(() => {
          setTracker(trackerContext);
          router.replace(redirectUrl);
        });
      } else {
        throw new Error("Resume info missing");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Could not resume application. Please try again.");
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md transform rounded-xl bg-white p-6 shadow-xl transition-all">
              <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
                {t("resume.title")}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-gray-600 mb-4">
                {t("resume.description")}
              </Dialog.Description>

              <input
                type="text"
                placeholder={t("resume.placeholder")}
                value={sin}
                maxLength={9}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setSin(value);
                  setStatus("idle");
                  setErrorMessage("");
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 focus:outline-none focus:border-blue-500"
              />

              {status === "success" && (
                <p className="mt-2 flex items-center text-sm text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {t("resume.success")}
                </p>
              )}
              {status === "error" && (
                <p className="mt-2 flex items-center text-sm text-red-600">
                  <XCircle className="w-4 h-4 mr-1" />
                  {errorMessage || t("resume.error")}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                >
                  {t("resume.cancel")}
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 text-sm rounded-md bg-blue-700 text-white hover:bg-blue-800 transition"
                >
                  {t("resume.continue")}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
