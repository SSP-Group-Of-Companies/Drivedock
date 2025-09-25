"use client";

import React from "react";
import { Calendar, CheckCircle, Mail, User } from "lucide-react";
import { IFileAsset } from "@/types/shared.types";
import Image from "next/image";

interface SignatureSectionProps {
  signature: IFileAsset;
  signedAt: Date;
  sendPoliciesByEmail?: boolean;
}

export default function SignatureSection({ signature, signedAt, sendPoliciesByEmail }: SignatureSectionProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
        Driver Signature
      </h2>

      {/* Signature Display */}
      <div className="space-y-4">
        <div
          className="rounded-lg border p-4"
          style={{
            background: "var(--color-surface-variant)",
            borderColor: "var(--color-outline)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <User className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>
              Digital Signature
            </span>
          </div>

          {signature?.url ? (
            <div
              className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg"
              style={{
                borderColor: "var(--color-outline)",
                background: "var(--color-surface)",
              }}
            >
              <Image 
                src={signature.url} 
                alt="Driver signature" 
                width={400}
                height={128}
                className="max-h-32 max-w-full object-contain" 
                style={{ filter: "invert(0.1)" }} 
              />
            </div>
          ) : (
            <div
              className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg"
              style={{
                borderColor: "var(--color-outline)",
                background: "var(--color-surface)",
              }}
            >
              <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                No signature available
              </span>
            </div>
          )}
        </div>

        {/* Signature Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Signed Date */}
          <div
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{
              background: "var(--color-surface-variant)",
            }}
          >
            <Calendar className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            <div>
              <div className="text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                Signed Date
              </div>
              <div className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                {formatDate(signedAt)}
              </div>
            </div>
          </div>

          {/* Email Consent */}
          <div
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{
              background: "var(--color-surface-variant)",
            }}
          >
            <Mail className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            <div>
              <div className="text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                Email Consent
              </div>
              <div className="flex items-center gap-2">
                {sendPoliciesByEmail ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Agreed to receive policies by email</span>
                  </>
                ) : (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-gray-400" />
                    <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                      No email consent provided
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Note */}
      <div
        className="rounded-lg p-4"
        style={{
          background: "var(--color-info-container)",
          borderColor: "var(--color-info)",
        }}
      >
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "var(--color-info)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-on-info-container)" }}>
              Signature Verified
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-on-info-container)" }}>
              This signature has been digitally captured and verified as part of the driver&apos;s onboarding process.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
