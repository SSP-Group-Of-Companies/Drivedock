"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useRef, useState, startTransition, useCallback } from "react";
import { Loader2, XCircle, CornerDownRight, IdCard, Mail, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
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

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [sin, setSin] = useState("");
  const [code, setCode] = useState("");

  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [lastSinForCode, setLastSinForCode] = useState<string | null>(null);

  const [resendCooldown, setResendCooldown] = useState<number>(0); // seconds

  const abortRef = useRef<AbortController | null>(null);
  const isLoading = status === "loading";

  // convenience flags
  const normalizedSin = sin.trim();
  const hasCodeForCurrentSin = codeSent && lastSinForCode === normalizedSin;

  const resetErrors = useCallback(() => {
    setStatus("idle");
    setErrorMessage("");
  }, []);

  const validateSin = useCallback((): string | null => {
    if (!normalizedSin) return t("resume.validation.enterSin");
    if (normalizedSin.length !== 9) return t("resume.validation.sinLength");
    return null;
  }, [normalizedSin, t]);

  const validateCode = useCallback((): string | null => {
    const c = code.trim();
    if (!c) return t("resume.validation.codeRequired");
    if (!/^\d{6}$/.test(c)) return t("resume.validation.codeFormat");
    return null;
  }, [code, t]);

  // Cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  // When SIN changes, invalidate any existing code/cooldown bound to the previous SIN
  useEffect(() => {
    if (lastSinForCode && normalizedSin !== lastSinForCode) {
      setCodeSent(false);
      setMaskedEmail(null);
      setResendCooldown(0);
      setCode("");
      // optional tip message
      setStatus("idle");
      setErrorMessage("");
    }
  }, [normalizedSin, lastSinForCode]);

  async function requestSendCode() {
    if (isLoading) return;
    resetErrors();

    const err = validateSin();
    if (err) {
      setStatus("error");
      setErrorMessage(err);
      return;
    }

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("loading");

      const res = await fetch(`/api/v1/onboarding/resume/send-code`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ sin: normalizedSin }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.message || t("resume.errors.generic");
        const retryAfterSeconds = data?.meta?.retryAfterSeconds;
        if (typeof retryAfterSeconds === "number") setResendCooldown(retryAfterSeconds);
        throw new Error(msg);
      }

      setMaskedEmail(data?.data?.maskedEmail ?? null);
      setCodeSent(true);
      setLastSinForCode(normalizedSin);
      setStatus("success");

      const serverCooldown = data?.data?.resendAvailableInSeconds ?? 60;
      setResendCooldown(serverCooldown);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setStatus("error");
      setErrorMessage(err?.message || t("resume.errors.generic"));
    }
  }

  async function requestVerifyCode() {
    if (isLoading) return;
    resetErrors();

    const errSin = validateSin();
    if (errSin) {
      setStatus("error");
      setErrorMessage(errSin);
      return;
    }
    const errCode = validateCode();
    if (errCode) {
      setStatus("error");
      setErrorMessage(errCode);
      return;
    }
    // guard: require code to be for the current SIN
    if (!hasCodeForCurrentSin) {
      setStatus("error");
      setErrorMessage(t("resume.errors.codeForDifferentSin") ?? "Please request a code for the current SIN first.");
      return;
    }

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("loading");

      const res = await fetch(`/api/v1/onboarding/resume/confirm-code`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ sin: normalizedSin, code: code.trim() }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.message || t("resume.errors.generic");
        throw new Error(msg);
      }

      const trackerContext = data?.data?.onboardingContext;
      const currentStep: EStepPath | undefined = trackerContext?.status?.currentStep;

      setStatus("success");
      startTransition(() => {
        if (trackerContext) setTracker(trackerContext);
        if (currentStep) {
          router.replace(buildOnboardingStepPath(trackerContext));
        } else {
          throw new Error(t("resume.errors.resumeInfoMissing"));
        }
      });
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setStatus("error");
      setErrorMessage(err?.message || t("resume.errors.generic"));
    }
  }

  async function handleResend() {
    await requestSendCode();
  }

  if (!mounted) return null;

  const resendLabel =
    resendCooldown > 0 && lastSinForCode === normalizedSin ? t("resume.resendCooldown", { s: resendCooldown }) ?? `Resend code (${resendCooldown}s)` : t("resume.resend") ?? "Resend code";

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
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
            <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-white p-6 shadow-xl transition-all">
              <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">{t("resume.title")}</Dialog.Title>
              <Dialog.Description className="text-sm text-gray-600 mb-4">{t("resume.description_sin_only") ?? t("resume.description")}</Dialog.Description>

              {/* SIN input */}
              <div className="mb-3 flex items-center rounded-md border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
                <div className="pl-3 pr-2 text-gray-500">
                  <IdCard className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder={t("resume.placeholder")}
                  value={sin}
                  maxLength={9}
                  disabled={isLoading}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setSin(value);
                    resetErrors();
                  }}
                  className="w-full px-0 pr-3 py-2 text-sm outline-none bg-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-invalid={status === "error" ? "true" : "false"}
                />
              </div>

              {/* Masked email hint (after send) */}
              {hasCodeForCurrentSin && maskedEmail && (
                <p className="mb-2 flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-1 text-gray-500" />
                  {t("resume.codeSentHint", { email: maskedEmail }) ?? `Verification code sent to: ${maskedEmail}`}
                </p>
              )}

              {/* If user changed SIN after sending, gently instruct to send a new code */}
              {codeSent && !hasCodeForCurrentSin && (
                <p className="mb-2 flex items-center text-sm text-amber-700">
                  <Info className="w-4 h-4 mr-1" />
                  {t("resume.sinChangedNeedsNewCode") ?? "SIN changed — please send a new verification code for this SIN."}
                </p>
              )}

              {/* Code input (only shown when we have sent a code for the current SIN) */}
              {hasCodeForCurrentSin && (
                <div className="mt-2">
                  <label className="block text-xs text-gray-500 mb-1">{t("resume.codeInstruction") ?? "Enter the 6-digit code sent to your email"}</label>
                  <div className="flex items-center gap-2">
                    <CornerDownRight className="w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={t("resume.codePlaceholder") ?? "e.g. 123456"}
                      value={code}
                      maxLength={6}
                      disabled={isLoading}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setCode(v);
                        resetErrors();
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm tracking-widest text-center font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {status === "loading" && (
                <p className="mt-2 flex items-center text-sm text-blue-700">
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  {t("resume.loading") ?? "Processing..."}
                </p>
              )}

              {status === "error" && (
                <p className="mt-2 flex items-center text-sm text-red-600">
                  <XCircle className="w-4 h-4 mr-1" />
                  {errorMessage || t("resume.error")}
                </p>
              )}

              {/* Actions */}
              <div className="mt-6 flex justify-between items-center">
                {hasCodeForCurrentSin ? (
                  <button onClick={handleResend} disabled={isLoading || resendCooldown > 0} className="text-sm text-blue-700 hover:text-blue-800 disabled:opacity-60 disabled:cursor-not-allowed">
                    {resendLabel}
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {t("resume.cancel")}
                  </button>

                  {hasCodeForCurrentSin ? (
                    <button
                      onClick={requestVerifyCode}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm rounded-md bg-blue-700 text-white hover:bg-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t("resume.loadingCtaVerify") ?? "Verifying..."}
                        </>
                      ) : (
                        t("resume.verifyCode") ?? "Verify & Continue"
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={requestSendCode}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm rounded-md bg-blue-700 text-white hover:bg-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t("resume.loadingCtaSend") ?? "Sending..."}
                        </>
                      ) : (
                        t("resume.sendCode") ?? "Send Code"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
