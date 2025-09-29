"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import { type PrequalificationsResponse } from "@/app/api/v1/admin/onboarding/[id]/prequalifications/types";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardFormWizard from "../components/DashboardFormWizard";
import { OptionalsSection, MandatorySection, CategoriesSection } from "./components";
import StepNotCompletedMessage from "../components/StepNotCompletedMessage";
import { getCompanyById } from "@/constants/companies";


// Helper function for API calls
async function fetchPrequalifications(trackerId: string): Promise<PrequalificationsResponse> {
  const response = await fetch(`/api/v1/admin/onboarding/${trackerId}/prequalifications`);
  if (!response.ok) {
    // Check if it's a 401 error and include the error message
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`401: ${errorData.message || 'Driver hasn\'t completed this step yet'}`);
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export default function PrequalificationClient({ trackerId }: { trackerId: string }) {
  const { data: contractData, isLoading: isContractLoading } = useContract(trackerId);
  const { hideLoader } = useDashboardPageLoading();
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
    const [shouldRender, setShouldRender] = useState(false);
  
  // Direct state management instead of hooks
  const [prequalData, setPrequalData] = useState<PrequalificationsResponse | null>(null);
  const [isPrequalLoading, setIsPrequalLoading] = useState(true);
  const [prequalError, setPrequalError] = useState<Error | null>(null);
  
  // Fetch prequalification data
  useEffect(() => {
    const loadPrequalifications = async () => {
      try {
        setIsPrequalLoading(true);
        setPrequalError(null);
        const data = await fetchPrequalifications(trackerId);
        setPrequalData(data);
      } catch (err) {
        setPrequalError(err instanceof Error ? err : new Error('Failed to load prequalifications'));
      } finally {
        setIsPrequalLoading(false);
      }
    };

    if (trackerId) {
      loadPrequalifications();
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
  if (prequalError && prequalError.message.includes("401")) {
    return (
      <StepNotCompletedMessage 
        stepName="Prequalifications"
        stepDescription="This page requires the driver to complete the prequalification questions including optionals, mandatory, and category selections."
      />
    );
  }

  // Don't render anything while dashboard loader is visible or before transition is complete
  if (isDashboardLoaderVisible || !shouldRender) {
    return null;
  }

  // Show loading state for contract data while layout is visible
  if (isContractLoading || !contractData || isPrequalLoading || !prequalData) {
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
            Loading Prequalification...
          </span>
        </div>
      </div>
    );
  }

  // Check if driver has completed the required step (Prequalifications)
  if (!prequalData?.data?.preQualifications || 
      Object.keys(prequalData.data.preQualifications).length === 0) {
    return (
      <StepNotCompletedMessage 
        stepName="Prequalifications"
        stepDescription="This page requires the driver to complete the prequalification questions including optionals, mandatory, and category selections."
      />
    );
  }

  const ctx = contractData;
  
  // Get company information for filtering
  const company = contractData?.companyId ? getCompanyById(contractData.companyId) : null;

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



      {/* Prequalification Content */}
      <div className="rounded-xl border p-8 shadow-sm dark:shadow-none" style={{
        background: "var(--color-card)",
        borderColor: "var(--color-outline)",
      }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-on-surface)" }}>Prequalification</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              Edit Mode:
            </span>
            <span className="px-2 py-1 rounded text-xs font-medium" style={{
              background: "var(--color-surface-variant)",
              color: "var(--color-on-surface-variant)",
            }}>
              DISABLED (Read-only driver answers)
            </span>
          </div>
        </div>
        
        {/* Improved Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* Optionals Section - Wider for more questions */}
          <div className="lg:col-span-1 xl:col-span-4">
            <OptionalsSection 
              data={prequalData?.data?.preQualifications || {}} 
              company={company}
            />
          </div>
          
          {/* Mandatory Section - Standard width */}
          <div className="lg:col-span-1 xl:col-span-3">
            <MandatorySection 
              data={prequalData?.data?.preQualifications || {}} 
              company={company}
            />
          </div>
          
          {/* Categories Section - Wider for choice options */}
          <div className="lg:col-span-2 xl:col-span-5">
            <CategoriesSection data={prequalData?.data?.preQualifications || {}} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
