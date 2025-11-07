"use client";

// main/src/app/dashboard/contract/[id]/print/PrintClient.tsx
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Download, Eye, FileText, User, AlertTriangle, Lock } from "lucide-react";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardFormWizard from "../components/DashboardFormWizard";
import { getCompanyPdfList } from "@/lib/pdf/utils/frontendPdfUtils";
import { ESafetyAdminId } from "@/constants/safetyAdmins";
import PrintPdfViewerModal from "./components/PrintPdfViewerModal";
import SafetyAdminPickerModal from "./components/SafetyAdminPickerModal";
import { EStepPath } from "@/types/onboardingTracker.types";
import { hasCompletedStep } from "@/lib/utils/onboardingUtils";

// Helper function to check if truck details exist
function hasTruckDetails(truckDetails?: any): boolean {
  if (!truckDetails) return false;
  const fields = ["vin", "make", "model", "year", "province", "truckUnitNumber", "plateNumber"];
  return fields.some((field) => {
    const value = truckDetails[field];
    return value && typeof value === "string" && value.trim().length > 0;
  });
}

/** Determine if a PDF item belongs to Drive Test set (On-Road, Pre-Trip, Road Test). */
function isDriveTestPdf(item: { label: string; apiUrl: string }) {
  const l = item.label.toLowerCase();
  const url = item.apiUrl.toLowerCase();
  return (
    l.includes("on-road") ||
    l.includes("onroad") ||
    l.includes("pre-trip") ||
    l.includes("pretrip") ||
    l.includes("road test") ||
    url.includes("drive-test") ||
    url.includes("on-road") ||
    url.includes("pre-trip") ||
    url.includes("road-test")
  );
}

function isPrequalPdf(item: { label: string; apiUrl: string }) {
  const l = item.label.toLowerCase();
  const url = item.apiUrl.toLowerCase();
  return l.includes("pre-qualifications") || url.endsWith("/prequalifications");
}

function lockedReason(item: { label: string; apiUrl: string }) {
  return isDriveTestPdf(item) ? "Complete Drive Test" : "Complete Policies & Consents";
}

export default function PrintClient({ trackerId }: Readonly<{ trackerId: string }>) {
  const { data: contractData, isLoading: isContractLoading } = useContract(trackerId);
  const { hideLoader } = useDashboardPageLoading();
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
  const [shouldRender, setShouldRender] = useState(false);

  const [pdfList, setPdfList] = useState<Array<{
    label: string;
    apiUrl: string;
    needsSafetyAdminId: boolean;
  }> | null>(null);

  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [safetyAdminPickerOpen, setSafetyAdminPickerOpen] = useState(false);
  const [pendingPdfAction, setPendingPdfAction] = useState<{
    apiUrl: string;
    action: "preview" | "download";
  } | null>(null);

  useEffect(() => {
    if (contractData && !isContractLoading) {
      hideLoader();
      setTimeout(() => setShouldRender(true), 100);
    }
  }, [contractData, isContractLoading, hideLoader]);

  useEffect(() => {
    if (contractData?.companyId && trackerId) {
      const list = getCompanyPdfList(contractData.companyId as any, trackerId);
      setPdfList(list);
    }
  }, [contractData, trackerId]);

  const trackerAdapter = useMemo(
    () =>
      contractData
        ? ({
            needsFlatbedTraining: Boolean(contractData.needsFlatbedTraining),
            status: contractData.status ?? {
              currentStep: EStepPath.PRE_QUALIFICATIONS,
              completed: false,
            },
          } as any)
        : null,
    [contractData]
  );

  const isStepCompleted = (step: EStepPath) => (trackerAdapter ? hasCompletedStep(trackerAdapter, step) : false);

  const isItemUnlocked = (item: { label: string; apiUrl: string }) => {
    if (isPrequalPdf(item)) return isStepCompleted(EStepPath.APPLICATION_PAGE_1);
    if (isDriveTestPdf(item)) return isStepCompleted(EStepPath.DRIVE_TEST);
    return isStepCompleted(EStepPath.POLICIES_CONSENTS);
  };

  if (isDashboardLoaderVisible || !shouldRender) return null;

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

  const handlePdfAction = (item: { apiUrl: string; needsSafetyAdminId: boolean; label: string }, action: "preview" | "download") => {
    if (!isItemUnlocked(item)) return;

    if (!item.needsSafetyAdminId) {
      if (action === "preview") setPreviewModalUrl(item.apiUrl);
      else window.open(item.apiUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setPendingPdfAction({ apiUrl: item.apiUrl, action });
    setSafetyAdminPickerOpen(true);
  };

  const handleSafetyAdminSelected = (adminId: ESafetyAdminId) => {
    if (!pendingPdfAction) return;
    const url = `${pendingPdfAction.apiUrl}?safetyAdminId=${adminId}`;
    if (pendingPdfAction.action === "preview") setPreviewModalUrl(url);
    else window.open(url, "_blank", "noopener,noreferrer");
    setPendingPdfAction(null);
    setSafetyAdminPickerOpen(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }} className="space-y-4">
      <DashboardFormWizard contractContext={ctx} />

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
        <div className="flex items-center gap-3 pb-4 border-b mb-6" style={{ borderColor: "var(--color-outline)" }}>
          <div className="w-1 h-8 rounded-full" style={{ background: "var(--color-primary)" }} />
          <h2 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>
            Print Documents
          </h2>
        </div>
        {contractData?.forms?.identifications?.truckDetails &&
          !hasTruckDetails(contractData.forms.identifications.truckDetails) &&
          (contractData.status?.currentStep === EStepPath.APPLICATION_PAGE_4 ||
            contractData.status?.currentStep === EStepPath.APPLICATION_PAGE_5 ||
            contractData.status?.currentStep === EStepPath.POLICIES_CONSENTS ||
            contractData.status?.currentStep === EStepPath.DRIVE_TEST ||
            contractData.status?.currentStep === EStepPath.CARRIERS_EDGE_TRAINING ||
            contractData.status?.currentStep === EStepPath.DRUG_TEST ||
            contractData.status?.currentStep === EStepPath.FLATBED_TRAINING) && (
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
        <div
          className="mb-6 rounded-lg p-3 text-xs flex items-center gap-2"
          style={{
            background: "var(--color-surface-variant)",
            color: "var(--color-on-surface-variant)",
          }}
        >
          <Lock className="h-4 w-4" />
          <span>
            <span className="font-medium">Note:</span> <span className="font-medium">Pre-Qualifications</span> unlock after <span className="font-medium">Application Page 1</span>. On-Road / Pre-Trip
            / Road Test unlock after <span className="font-medium">Drive Test</span>. Others unlock after <span className="font-medium">Policies & Consents</span>.
          </span>
        </div>
        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pdfList.map((item, index) => {
            const unlocked = isItemUnlocked(item);
            const requiresAdmin = item.needsSafetyAdminId;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="relative rounded-lg border p-4 hover:shadow-md transition-shadow"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline-variant)",
                  filter: unlocked ? undefined : "grayscale(0.2)",
                  opacity: unlocked ? 1 : 0.9,
                }}
              >
                {/* subtle glass overlay only when locked (no text here to avoid overlap) */}
                {!unlocked && <div className="pointer-events-none absolute inset-0 rounded-lg" style={{ background: "rgba(0,0,0,0.03)" }} />}

                {/* Header row with wrapping lock badge (prevents overlap on small screens) */}
                <div className="mb-4">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg shrink-0" style={{ background: "var(--color-primary-container)" }}>
                        <FileText className="h-5 w-5" style={{ color: "var(--color-on-primary-container)" }} />
                      </div>
                      <h3 className="font-medium text-sm truncate" style={{ color: "var(--color-on-surface)" }} title={item.label}>
                        {item.label}
                      </h3>
                    </div>

                    {!unlocked && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold tracking-wide"
                        style={{
                          background: "var(--color-error-container)",
                          color: "var(--color-on-error-container)",
                        }}
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Locked — {lockedReason(item)}
                      </span>
                    )}
                  </div>

                  {requiresAdmin && (
                    <div className="flex items-center gap-1 mt-2">
                      <User className="h-3 w-3" style={{ color: "var(--color-on-surface-variant)" }} />
                      <span className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                        Requires Safety Admin
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => unlocked && handlePdfAction(item as any, "preview")}
                    disabled={!unlocked}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                    style={{
                      background: unlocked ? "var(--color-secondary-container)" : "var(--color-surface-variant)",
                      color: unlocked ? "var(--color-on-secondary-container)" : "var(--color-on-surface-variant)",
                      border: "1px solid var(--color-outline-variant)",
                    }}
                    aria-disabled={!unlocked}
                    title={unlocked ? "Preview" : lockedReason(item)}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </button>

                  <button
                    onClick={() => unlocked && handlePdfAction(item as any, "download")}
                    disabled={!unlocked}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                    style={{
                      background: unlocked ? "var(--color-primary)" : "var(--color-surface-variant)",
                      color: unlocked ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
                      border: "1px solid var(--color-outline-variant)",
                    }}
                    aria-disabled={!unlocked}
                    title={unlocked ? "Download" : lockedReason(item)}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
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

      <PrintPdfViewerModal modalUrl={previewModalUrl} strategy="fetch" onClose={() => setPreviewModalUrl(null)} />

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
