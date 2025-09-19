"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Eye, FileText, User, AlertTriangle } from "lucide-react";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardFormWizard from "../components/DashboardFormWizard";
import { getCompanyPdfList } from "@/lib/pdf/utils/frontendPdfUtils";
import { ESafetyAdminId } from "@/constants/safetyAdmins";
import PrintPdfViewerModal from "./components/PrintPdfViewerModal";
import SafetyAdminPickerModal from "./components/SafetyAdminPickerModal";

// Helper function to check if truck details exist
function hasTruckDetails(truckDetails?: any): boolean {
  if (!truckDetails) return false;

  // Check if any truck detail field has meaningful data
  const fields = ["vin", "make", "model", "year", "province", "truckUnitNumber", "plateNumber"];
  return fields.some((field) => {
    const value = truckDetails[field];
    return value && typeof value === "string" && value.trim().length > 0;
  });
}

export default function PrintClient({ trackerId }: { trackerId: string }) {
  const { data: contractData, isLoading: isContractLoading } = useContract(trackerId);
  const { hideLoader } = useDashboardPageLoading();
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
  const [shouldRender, setShouldRender] = useState(false);

  // PDF list state
  const [pdfList, setPdfList] = useState<Array<{
    label: string;
    apiUrl: string;
    needsSafetyAdminId: boolean;
  }> | null>(null);

  // Modal states
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [safetyAdminPickerOpen, setSafetyAdminPickerOpen] = useState(false);
  const [pendingPdfAction, setPendingPdfAction] = useState<{
    apiUrl: string;
    action: "preview" | "download";
  } | null>(null);

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

  // Generate PDF list when contract data is available
  useEffect(() => {
    if (contractData?.companyId && trackerId) {
      const { companyId } = contractData;
      const list = getCompanyPdfList(companyId as any, trackerId);
      setPdfList(list);
    }
  }, [contractData, trackerId]);

  // Don't render anything while dashboard loader is visible or before transition is complete
  if (isDashboardLoaderVisible || !shouldRender) {
    return null;
  }

  // Show loading state for contract data while layout is visible
  if (isContractLoading || !contractData || !pdfList) {
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
              borderWidth: "2px",
            }}
          />
          <span className="text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
            Loading Print Documents...
          </span>
        </div>
      </div>
    );
  }

  const ctx = contractData;

  const handlePdfAction = (item: { apiUrl: string; needsSafetyAdminId: boolean }, action: "preview" | "download") => {
    if (!item.needsSafetyAdminId) {
      // Direct action - no safety admin required
      if (action === "preview") {
        setPreviewModalUrl(item.apiUrl);
      } else {
        window.open(item.apiUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }

    // Safety admin required - show picker
    setPendingPdfAction({ apiUrl: item.apiUrl, action });
    setSafetyAdminPickerOpen(true);
  };

  const handleSafetyAdminSelected = (adminId: ESafetyAdminId) => {
    if (!pendingPdfAction) return;

    const url = `${pendingPdfAction.apiUrl}?safetyAdminId=${adminId}`;

    if (pendingPdfAction.action === "preview") {
      setPreviewModalUrl(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }

    // Reset state
    setPendingPdfAction(null);
    setSafetyAdminPickerOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: "easeOut",
        delay: 0.1, // Small delay to ensure smooth transition after loader hides
      }}
      className="space-y-4"
    >
      {/* Form Wizard Progress */}
      <DashboardFormWizard contractContext={ctx} />

      {/* Print Documents Content */}
      <div
        className="rounded-xl border p-4 sm:p-6 lg:p-8 shadow-sm dark:shadow-none"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-outline)",
        }}
      >
        <div className="flex justify-end mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              Mode:
            </span>
            <span
              className="px-2 py-1 rounded text-xs font-medium"
              style={{
                background: "var(--color-surface-variant)",
                color: "var(--color-on-surface-variant)",
              }}
            >
              PRINT & DOWNLOAD
            </span>
          </div>
        </div>

        {/* Print Documents Section Header */}
        <div className="flex items-center gap-3 pb-4 border-b mb-6" style={{ borderColor: "var(--color-outline)" }}>
          <div className="w-1 h-8 rounded-full" style={{ background: "var(--color-primary)" }} />
          <h2 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>
            Print Documents
          </h2>
        </div>

        {/* Truck Details Warning */}
        {contractData?.forms?.identifications?.truckDetails && !hasTruckDetails(contractData.forms.identifications.truckDetails) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg border p-4 mb-6"
            style={{
              background: "var(--color-warning-container)",
              borderColor: "var(--color-warning)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-1 rounded" style={{ background: "var(--color-warning)" }}>
                <AlertTriangle className="h-4 w-4" style={{ color: "var(--color-on-warning)" }} />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1" style={{ color: "var(--color-on-warning-container)" }}>
                  Missing Truck Details
                </h4>
                <p className="text-xs" style={{ color: "var(--color-on-warning-container)" }}>
                  Truck details are missing. Company Policy PDF will have empty truck detail fields. Please ensure truck details are completed in the Identifications section.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* PDF List Grid */}
        {!contractData.status?.completed ? (
          <div className="">Printing is available when onboarding is completed</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pdfList.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border p-4 hover:shadow-md transition-shadow"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline-variant)",
                }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: "var(--color-primary-container)" }}>
                    <FileText className="h-5 w-5" style={{ color: "var(--color-on-primary-container)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm" style={{ color: "var(--color-on-surface)" }}>
                      {item.label}
                    </h3>
                    {item.needsSafetyAdminId && (
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" style={{ color: "var(--color-on-surface-variant)" }} />
                        <span className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                          Requires Safety Admin
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePdfAction(item, "preview")}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: "var(--color-secondary-container)",
                      color: "var(--color-on-secondary-container)",
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </button>
                  <button
                    onClick={() => handlePdfAction(item, "download")}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: "var(--color-primary)",
                      color: "var(--color-on-primary)",
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Info Section */}
        {contractData.status?.completed && (
          <div
            className="mt-6 rounded-lg p-4"
            style={{
              background: "var(--color-surface-variant)",
              borderColor: "var(--color-outline)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-1 rounded" style={{ background: "var(--color-info-container)" }}>
                <FileText className="h-4 w-4" style={{ color: "var(--color-on-info-container)" }} />
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1" style={{ color: "var(--color-on-surface)" }}>
                  Document Information
                </h4>
                <p className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                  Some documents require a Safety Admin signature. When you select these documents, you will be prompted to choose a Safety Admin before previewing or downloading.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      <PrintPdfViewerModal modalUrl={previewModalUrl} strategy="fetch" onClose={() => setPreviewModalUrl(null)} />

      {/* Safety Admin Picker Modal */}
      <SafetyAdminPickerModal
        isOpen={safetyAdminPickerOpen}
        onClose={() => {
          setSafetyAdminPickerOpen(false);
          setPendingPdfAction(null);
        }}
        onSelect={handleSafetyAdminSelected}
      />
    </motion.div>
  );
}
