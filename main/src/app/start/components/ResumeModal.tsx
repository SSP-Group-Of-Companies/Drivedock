/**
 * Resume Modal Component — DriveDock
 *
 * Description:
 * A modal dialog that allows drivers to resume an existing onboarding application
 * by entering their SIN. Once validated, the system retrieves their onboarding context
 * and redirects them to their last completed step.
 *
 * Key Components & Hooks:
 * - `useOnboardingTracker`: Zustand store for persisting onboarding tracker context.
 * - `useTranslation`: Loads multilingual strings for the modal UI.
 * - `useRouter`: Handles redirect after successfully resuming.
 * - `@headlessui/react` `Dialog` + `Transition`: Provides accessible modal with animations.
 *
 * Props:
 * - `isOpen` (boolean): Controls modal visibility.
 * - `onClose` (function): Callback to close the modal.
 *
 * Functionality:
 * - Accepts SIN input (digits only, max length 9).
 * - Validates that SIN is present and exactly 9 digits before making the request.
 * - Sends GET request to `/api/v1/onboarding/resume/:sin`.
 * - If successful:
 *   - Updates the onboarding tracker in Zustand.
 *   - Redirects to the returned `redirectUrl`.
 * - If failure:
 *   - Displays a translated error message.
 * - Shows live feedback (success or error) based on request state.
 *
 * Routing:
 * Triggered from the "Resume Application" CTA button on the landing page hero.
 * Successful resume redirects the user to their latest onboarding step.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, startTransition } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";

// Components & hooks
import useMounted from "@/hooks/useMounted";
import { EStepPath } from "@/types/onboardingTracker.types";
import { buildOnboardingStepPath } from "@/lib/utils/onboardingUtils";

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResumeModal({ isOpen, onClose }: ResumeModalProps) {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  const router = useRouter();
  const { setTracker } = useOnboardingTracker();

  const [sin, setSin] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Handle resume request
  const handleSubmit = async () => {
    const cleanedSin = sin.trim();

    // Basic client-side validations
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
      const currentStep: EStepPath = trackerContext?.status?.currentStep;

      if (trackerContext && currentStep) {
        // Wrap in React transition to ensure safe redirect after state update
        startTransition(() => {
          setTracker(trackerContext);
          router.replace(buildOnboardingStepPath(trackerContext));
        });
      } else {
        throw new Error("Resume info missing");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Could not resume application. Please try again.");
    }
  };

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop overlay */}
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        {/* Centered modal */}
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
              {/* Title & description */}
              <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">{t("resume.title")}</Dialog.Title>
              <Dialog.Description className="text-sm text-gray-600 mb-4">{t("resume.description")}</Dialog.Description>

              {/* SIN input field */}
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

              {/* Success message */}
              {status === "success" && (
                <p className="mt-2 flex items-center text-sm text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {t("resume.success")}
                </p>
              )}

              {/* Error message */}
              {status === "error" && (
                <p className="mt-2 flex items-center text-sm text-red-600">
                  <XCircle className="w-4 h-4 mr-1" />
                  {errorMessage || t("resume.error")}
                </p>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition">
                  {t("resume.cancel")}
                </button>
                <button onClick={handleSubmit} className="px-4 py-2 text-sm rounded-md bg-blue-700 text-white hover:bg-blue-800 transition">
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
