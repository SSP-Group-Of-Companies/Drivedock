"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardFormWizard from "../components/DashboardFormWizard";
// import { useEditMode } from "../components/EditModeContext";
import PoliciesContent from "./components/PoliciesContent";
import { type PoliciesConsentsResponse } from "@/app/api/v1/admin/onboarding/[id]/policies-consents/types";
import StepNotCompletedMessage from "../components/StepNotCompletedMessage";

// Helper functions for API calls
async function fetchPoliciesConsents(trackerId: string): Promise<PoliciesConsentsResponse> {
  const response = await fetch(`/api/v1/admin/onboarding/${trackerId}/policies-consents`);
  if (!response.ok) {
    // Check if it's a 401 error and include the error message
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `401: ${errorData.message || "Driver hasn't completed this step yet"}`
      );
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export default function PoliciesClient({
  trackerId,
}: {
  trackerId: string;
}) {
  const { data: contractData, isLoading: isContractLoading } =
    useContract(trackerId);
  const { hideLoader } = useDashboardPageLoading();
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
  const [shouldRender, setShouldRender] = useState(false);
  // Edit mode is disabled for policies (read-only)
  // const { isEditMode } = useEditMode();

  // Direct state management instead of hooks
  const [policiesData, setPoliciesData] =
    useState<PoliciesConsentsResponse | null>(null);
  const [isPoliciesLoading, setIsPoliciesLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch policies consents data
  useEffect(() => {
    const loadPoliciesConsents = async () => {
      try {
        setIsPoliciesLoading(true);
        setError(null);
        const data = await fetchPoliciesConsents(trackerId);
        setPoliciesData(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load policies consents'));
      } finally {
        setIsPoliciesLoading(false);
      }
    };

    if (trackerId) {
      loadPoliciesConsents();
    }
  }, [trackerId]);

  // Progressive loading: Show layout first, then content
  useEffect(() => {
    // Show layout as soon as contract data is available
    if (contractData && !isContractLoading) {
      hideLoader();
      setTimeout(() => {
        setShouldRender(true);
      }, 100); // Faster transition for layout
    }
  }, [contractData, isContractLoading, hideLoader]);

  // Check for 401 error (step not completed) - MUST be before loading check
  if (error && error.message.includes("401")) {
    return (
      <StepNotCompletedMessage
        stepName="Policies & Consents"
        stepDescription="This page requires the driver to complete the Policies & Consents step including signing all required documents and providing consent for policy distribution."
      />
    );
  }

  // Don't render anything while dashboard loader is visible or before transition is complete
  if (isDashboardLoaderVisible || !shouldRender) {
    return null;
  }

  // Show loading state for contract data while layout is visible
  if (isContractLoading || !contractData || isPoliciesLoading || !policiesData) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{
          borderColor: "var(--color-outline)",
          background: "var(--color-card)",
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-transparent"
            style={{ 
              borderTopColor: "var(--color-primary)",
              borderWidth: "2px"
            }}
          />
          <span className="text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
            Loading Policies & Consents...
          </span>
        </div>
      </div>
    );
  }

  // Check if we have the required data structure
  if (!policiesData?.data?.policiesConsents) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{
          borderColor: "var(--color-outline)",
          background: "var(--color-card)",
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
            No policies consents data found
          </span>
          <span className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
            This driver may not have completed the policies consents step yet.
          </span>
        </div>
      </div>
    );
  }

  const ctx = contractData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5,
        ease: "easeOut",
        delay: 0.1 // Small delay to ensure smooth transition after loader hides
      }}
      className="space-y-4"
    >
      {/* Form Wizard Progress */}
      <DashboardFormWizard contractContext={ctx} />

      {/* Policies Content */}
      <div className="rounded-xl border p-4 sm:p-6 lg:p-8 shadow-sm dark:shadow-none" style={{
        background: "var(--color-card)",
        borderColor: "var(--color-outline)",
      }}>
        <div className="flex justify-end mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              Edit Mode:
            </span>
            <span className="px-2 py-1 rounded text-xs font-medium" style={{
              background: "var(--color-surface-variant)",
              color: "var(--color-on-surface-variant)",
            }}>
              DISABLED (Read-only policies)
            </span>
          </div>
        </div>
        
        <PoliciesContent
          data={policiesData.data}
        />
      </div>
    </motion.div>
  );
}
