// src/components/onboarding/ErrorModal.tsx
"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { AlertTriangle, X, WifiOff } from "lucide-react";
// Animations disabled for mobile Safari stability
import { ErrorModalData, ErrorModalType } from "@/types/onboardingError.types";

interface ErrorModalProps {
  modal: ErrorModalData | null;
  onClose?: () => void;
}

export default function ErrorModal({ modal, onClose }: ErrorModalProps) {
  if (!modal) return null;

  const handleClose = () => {
    if (modal.canClose && onClose) {
      onClose();
    }
  };

  const getIcon = () => {
    switch (modal.type) {
      case ErrorModalType.NETWORK_ERROR:
        return <WifiOff className="w-12 h-12 text-red-500" aria-hidden="true" />;
      case ErrorModalType.SESSION_EXPIRED:
        return <AlertTriangle className="w-12 h-12 text-amber-500" aria-hidden="true" />;
      case ErrorModalType.CONFIRMATION:
        return <AlertTriangle className="w-12 h-12 text-amber-500" aria-hidden="true" />;
      default:
        return <AlertTriangle className="w-12 h-12 text-red-500" aria-hidden="true" />;
    }
  };

  const getIconBgColor = () => {
    switch (modal.type) {
      case ErrorModalType.NETWORK_ERROR:
        return "bg-red-100";
      case ErrorModalType.SESSION_EXPIRED:
        return "bg-amber-100";
      default:
        return "bg-red-100";
    }
  };

  return (
    <>
      {modal && (
        <Dialog open={true} onClose={handleClose} className="relative z-50">
          {/* Overlay (no blur on mobile) */}
          <div className="fixed inset-0 bg-black/40 sm:bg-black/30 sm:backdrop-blur-sm" aria-hidden="true" />

          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
              minHeight: "100dvh",
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="w-full max-w-lg ios-modal-fix">
              <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white px-4 pb-4 pt-5 text-left shadow-2xl sm:my-8 sm:w-full sm:p-6">
                {/* Close button - only show if modal can be closed */}
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
                  <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${getIconBgColor()} sm:mx-0 sm:h-10 sm:w-10`}>{getIcon()}</div>

                  {/* Content */}
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                    <DialogTitle as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      {modal.title}
                    </DialogTitle>

                    <div className="mt-2">
                      <p className="text-sm text-gray-600 leading-relaxed">{modal.message}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                  {/* Primary Action */}
                  <button
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
          </div>
        </Dialog>
      )}
    </>
  );
}
