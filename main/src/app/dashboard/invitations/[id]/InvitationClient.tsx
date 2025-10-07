// src/app/dashboard/invitations/[id]/InvitationClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ApproveRejectBar from "./components/ApproveRejectBar";
import PrequalificationCard from "./components/PrequalificationCard";
import PersonalDetailsCard from "./components/PersonalDetailsCard";

type InvitationApiData = {
  onboardingContext: {
    companyId?: string;
    preApprovalCountryCode?: string;
  };
  preQualifications: any;
  personalDetails: any;
};

type InvitationApiResponse = {
  success: boolean;
  message: string;
  data: InvitationApiData;
};

async function fetchInvitation(id: string): Promise<InvitationApiResponse> {
  const res = await fetch(`/api/v1/admin/onboarding/${id}/invitation`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export default function InvitationClient({ trackerId }: { trackerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<InvitationApiData | null>(null);

  // Load invitation review data (prequal + personal details)
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchInvitation(trackerId)
      .then((resp) => {
        if (!mounted) return;
        setPayload(resp.data);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [trackerId]);

  const companyId = useMemo(() => payload?.onboardingContext?.companyId, [payload]);
  const preApprovalCountryCode = useMemo(() => payload?.onboardingContext?.preApprovalCountryCode, [payload]);

  const approve = async ({ companyId, applicationType }: { companyId: string; applicationType?: string }) => {
    setBusy("approve");
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/onboarding/${trackerId}/invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, applicationType }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to approve invitation");
      // success -> go back to invitations list
      router.replace(`/dashboard/contract/${trackerId}/safety-processing`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to approve invitation");
    } finally {
      setBusy(null);
    }
  };

  const reject = async (reason?: string) => {
    setBusy("reject");
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/onboarding/${trackerId}/invitation`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason ?? "" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to reject invitation");
      // success -> go back to invitations list
      router.replace("/dashboard/invitations");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to reject invitation");
    } finally {
      setBusy(null);
    }
  };

  // ---- UI states
  if (loading) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--color-outline)", background: "var(--color-card)" }}>
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--color-primary)", borderWidth: "2px" }} />
          <span className="text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
            Loading invitation…
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    const isNotPending = /not pending approval/i.test(error);
    return (
      <div className="rounded-xl border p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-outline)" }}>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
            {isNotPending ? "Already Processed" : "Error"}
          </h2>
          <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            {isNotPending ? "This application is not pending approval. It might have been approved or rejected already." : error}
          </p>
          <div className="pt-1">
            <button onClick={() => router.push("/dashboard/invitations")} className="rounded-lg px-3 py-1.5 text-sm text-white" style={{ background: "var(--color-primary)" }}>
              Back to Invitations
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!payload) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="space-y-6">
      <ApproveRejectBar busy={busy} onApprove={approve} onReject={reject} countryCode={preApprovalCountryCode as any} />

      {/* Prequalification (read-only) */}
      <PrequalificationCard prequal={payload.preQualifications} companyId={companyId} preApprovalCountryCode={preApprovalCountryCode as any} />

      {/* Personal Details (read-only) */}
      <PersonalDetailsCard personal={payload.personalDetails} prequal={payload.preQualifications} />
    </motion.div>
  );
}
