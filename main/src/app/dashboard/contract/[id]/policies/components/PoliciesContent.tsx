import React from "react";
import { PoliciesConsentsData } from "@/app/api/v1/admin/onboarding/[id]/policies-consents/types";
import PoliciesPdfGrid from "./PoliciesPdfGrid";
import SignatureSection from "./SignatureSection";

interface PoliciesContentProps {
  data: PoliciesConsentsData;
}

export default function PoliciesContent({ data }: PoliciesContentProps) {
  const { policiesConsents, onboardingContext } = data;

  return (
    <div className="space-y-6">
      {/* Policies Section Header */}
      <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: "var(--color-outline)" }}>
        <div 
          className="w-1 h-8 rounded-full"
          style={{ background: "var(--color-info)" }}
        />
        <h2 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>
          Policies & Consents
        </h2>
      </div>

      {/* Policies PDF Grid */}
      {onboardingContext.companyId ? (
        <PoliciesPdfGrid 
          companyId={onboardingContext.companyId}
        />
      ) : null}

      {/* Disclaimer */}
      <div className="rounded-lg p-4" style={{
        background: "var(--color-surface-variant)",
        borderColor: "var(--color-outline)",
      }}>
        <p className="text-sm text-center" style={{ color: "var(--color-on-surface-variant)" }}>
          By signing below, you agree to all the contract here and future contracts. Please read all documents carefully. Your provided information will automatically prefill required fields.
        </p>
      </div>

      {/* Signature Section */}
      <SignatureSection 
        signature={policiesConsents.signature}
        signedAt={policiesConsents.signedAt}
        sendPoliciesByEmail={policiesConsents.sendPoliciesByEmail}
      />
    </div>
  );
}
