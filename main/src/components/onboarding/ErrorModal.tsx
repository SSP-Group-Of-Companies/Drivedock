// src/components/onboarding/ErrorModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { AlertTriangle, X, WifiOff } from "lucide-react";
import { ErrorModalData, ErrorModalType } from "@/types/onboardingError.types";

interface ErrorModalProps {
  modal: ErrorModalData | null;
  onClose?: () => void;
}

export default function ErrorModal({ modal, onClose }: ErrorModalProps) {
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null);

  const handleClose = () => {
    if (modal && modal.canClose && onClose) onClose();
  };

  const getIcon = () => {
    switch (modal?.type) {
      case ErrorModalType.NETWORK_ERROR:
        return (
          <WifiOff className="w-12 h-12 text-red-500" aria-hidden="true" />
        );
      case ErrorModalType.SESSION_EXPIRED:
      case ErrorModalType.CONFIRMATION:
        return (
          <AlertTriangle
            className="w-12 h-12 text-amber-500"
            aria-hidden="true"
          />
        );
      default:
        return (
          <AlertTriangle
            className="w-12 h-12 text-red-500"
            aria-hidden="true"
          />
        );
    }
  };

  const getIconBgColor = () => {
    switch (modal?.type) {
      case ErrorModalType.NETWORK_ERROR:
        return "bg-red-100";
      case ErrorModalType.SESSION_EXPIRED:
        return "bg-amber-100";
      default:
        return "bg-red-100";
    }
  };

  // Create a body-level portal container once
  useEffect(() => {
    const el = document.createElement("div") as HTMLDivElement;
    el.setAttribute("data-error-modal-root", "");
    document.body.appendChild(el);
    setPortalEl(el);
    return () => {
      el.remove(); // returns void (TS-safe)
      setPortalEl(null);
    };
  }, []);

  // Lock scroll while modal is open
  useEffect(() => {
    if (!modal) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [modal]);

  // iOS hardening: blur active input, set --vh fallback, focus a safe element
  useEffect(() => {
    if (!modal) return;

    // Drop the iOS keyboard if any input was focused
    (document.activeElement as HTMLElement | null)?.blur?.();

    const setVh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--vh", `${h * 0.01}px`);
    };
    setVh();

    // Resize handlers
    const vv = window.visualViewport;
    vv?.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);

    // Ensure focus is inside dialog to avoid scroll jumps
    setTimeout(() => primaryBtnRef.current?.focus?.(), 0);

    return () => {
      vv?.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
    };
  }, [modal]);

  if (!portalEl || !modal) return null;

  return createPortal(
    <Dialog
      open={true}
      onClose={handleClose}
      className="relative z-50"
      initialFocus={primaryBtnRef}
    >
      {/* Overlay – no blur on mobile; prevent rubber-band nudges */}
      <div
        className="fixed inset-0 bg-black/40"
        aria-hidden="true"
        style={{ touchAction: "none" }}
      />

      {/* Centering against dynamic viewport */}
      <div
        className="fixed inset-0 p-4 overflow-y-auto flex items-center justify-center"
        style={
          {
            minHeight: "100dvh",
            height: "calc(var(--vh, 1vh) * 100)",
            paddingBottom: "env(safe-area-inset-bottom)",
          } as React.CSSProperties
        }
      >
        <DialogPanel className="relative overflow-hidden rounded-2xl bg-white px-4 pb-4 pt-5 text-left shadow-2xl sm:w-full sm:p-6 w-full max-w-lg">
          {/* Close button */}
          {modal.canClose && (
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={handleClose}
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="sm:flex sm:items-start">
            {/* Icon */}
            <div
              className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${getIconBgColor()} sm:mx-0 sm:h-10 sm:w-10`}
            >
              {getIcon()}
            </div>

            {/* Content */}
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
              <DialogTitle
                as="h3"
                className="text-lg font-semibold leading-6 text-gray-900"
              >
                {modal.title}
              </DialogTitle>

              <div className="mt-2">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {modal.message}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
            {/* Primary Action */}
            <button
              ref={primaryBtnRef}
              type="button"
              className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto transition-colors"
              onClick={modal.primaryAction.action}
            >
              {modal.primaryAction.label}
            </button>

            {/* Secondary Action */}
            {modal.secondaryAction && (
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto transition-colors"
                onClick={modal.secondaryAction.action}
              >
                {modal.secondaryAction.label}
              </button>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>,
    portalEl
  );
}
