"use client";

import { Suspense } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";

function NotFoundContent() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-8 transition-colors duration-200"
      style={{
        backgroundColor: "var(--color-background)",
        color: "var(--color-on-background)",
      }}
    >
      {/* Background gradient (matching app theme) */}
      <div
        className="absolute inset-0 z-[-2] bg-gradient-to-br from-white via-blue-100 to-blue-600 opacity-40"
        style={{ backgroundColor: "var(--color-background)" }}
      />

      {/* Main content card */}
      <div
        className="relative z-10 w-full max-w-md transform overflow-hidden rounded-xl shadow-xl transition-all"
        style={{
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-outline)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-center p-6 pb-4"
          style={{ borderBottom: "1px solid var(--color-outline)" }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-error)" }}
          >
            <AlertTriangle className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          <h1
            className="text-center text-2xl font-semibold mb-2"
            style={{ color: "var(--color-on-surface)" }}
          >
            Page Not Found
          </h1>
          <p
            className="text-center text-sm mb-6"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            The page you are looking for does not exist or has been moved.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors cursor-pointer active:scale-95"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "white",
              }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Go Back
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p
          className="text-xs"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          Need help? Contact support at{" "}
          <a
            href="mailto:support@ssptruckline.com"
            className="underline hover:no-underline"
            style={{ color: "var(--color-primary)" }}
          >
            support@ssptruckline.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{
            backgroundColor: "var(--color-background)",
            color: "var(--color-on-background)",
          }}
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
            style={{ borderTopColor: "var(--color-primary)" }}
          />
        </div>
      }
    >
      <NotFoundContent />
    </Suspense>
  );
}
