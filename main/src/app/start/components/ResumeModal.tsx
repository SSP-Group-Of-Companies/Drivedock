/**
 * Resume Modal Component — DriveDock (with Loading State)
 *
 * Changes:
 * - Introduced "loading" state in status union.
 * - Shows spinner + "Resuming..." feedback while fetching.
 * - Disables input/buttons during loading to prevent double-submits.
 * - Sets "success" only after a successful response.
 */

"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useRef, useState, startTransition } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
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

type Status = "idle" | "loading" | "success" | "error";

export default function ResumeModal({ isOpen, onClose }: ResumeModalProps) {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  const router = useRouter();
  const { setTracker } = useOnboardingTracker();

  const [sin, setSin] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const isLoading = status === "loading";

  const handleSubmit = async () => {
    if (isLoading) return; // guard against double clicks

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
      // cancel any previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("loading");
      setErrorMessage("");

      const res = await fetch(`/api/v1/onboarding/resume/${cleanedSin}`, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      // Try to parse JSON safely
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // If response isn't JSON, force an error path
        if (!res.ok) {
          throw new Error("Invalid response from server");
        }
      }

      if (!res.ok) {
        const serverMsg = data?.message || data?.error || "Could not resume application. Please try again.";
        throw new Error(serverMsg);
      }

      const trackerContext = data?.data?.onboardingContext;
      const currentStep: EStepPath | undefined = trackerContext?.status?.currentStep;

      if (trackerContext && currentStep) {
        setStatus("success");
        startTransition(() => {
          setTracker(trackerContext);
          router.replace(buildOnboardingStepPath(trackerContext));
        });
      } else {
        throw new Error("Resume info missing");
      }
    } catch (err: unknown) {
      // Ignore abort errors
      if ((err as any)?.name === "AbortError") return;

      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Could not resume application. Please try again.");
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
                disabled={isLoading}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setSin(value);
                  setStatus("idle");
                  setErrorMessage("");
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                aria-invalid={status === "error" ? "true" : "false"}
                aria-busy={isLoading ? "true" : "false"}
              />

              {/* Loading message */}
              {status === "loading" && (
                <p className="mt-2 flex items-center text-sm text-blue-700">
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  {t("resume.loading") ?? "Resuming..."}
                </p>
              )}

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
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {t("resume.cancel")}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm rounded-md bg-blue-700 text-white hover:bg-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("resume.loadingCta") ?? "Resuming..."}
                    </>
                  ) : (
                    t("resume.continue")
                  )}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
