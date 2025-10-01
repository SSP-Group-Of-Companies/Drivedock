"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEditMode } from "@/app/dashboard/contract/[id]/components/EditModeContext";
import UpdateSubmitBar from "@/app/dashboard/contract/[id]/safety-processing/components/UpdateSubmitBar";
import AccidentReportSection from "./components/AccidentReportSection";
import TrafficConvictionsSection from "./components/TrafficConvictionsSection";
import CriminalRecordsSection from "./components/CriminalRecordsSection";
import { AccidentCriminalResponse } from "@/app/api/v1/admin/onboarding/[id]/application-form/accident-criminal/types";
import {
  IAccidentEntry,
  ITrafficConvictionEntry,
  ICriminalRecordEntry,
} from "@/types/applicationForm.types";
import StepNotCompletedMessage from "../components/StepNotCompletedMessage";


export default function AccidentCriminalClient() {
  const { id: trackerId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [data, setData] = useState<AccidentCriminalResponse["data"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staged, setStaged] = useState<{
    accidentHistory: IAccidentEntry[];
    trafficConvictions: ITrafficConvictionEntry[];
    criminalRecords: ICriminalRecordEntry[];
  } | null>(null);
  // unified submit bar will display errors; no page-level banner

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/admin/onboarding/${trackerId}/application-form/accident-criminal`
      );
      if (!response.ok) {
        // Check if it's a 401 error and include the error message
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`401: ${errorData.message || 'Driver hasn\'t completed this step yet'}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: AccidentCriminalResponse = await response.json();
      setData(result.data);
      setStaged({
        accidentHistory: result.data.accidentHistory || [],
        trafficConvictions: result.data.trafficConvictions || [],
        criminalRecords: result.data.criminalRecords || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [trackerId]);

  useEffect(() => {
    if (trackerId) {
      fetchData();
    }
  }, [trackerId, fetchData]);

  const handleSave = async () => {
    if (!staged) return;

    try {
      // --------- Client-side pruning + validation to avoid server errors ---------
      const isBlank = (s?: string) => !s || s.trim() === "";

      const pruneAccidentRows = (rows: IAccidentEntry[] | undefined) => {
        if (!Array.isArray(rows)) return [] as IAccidentEntry[];
        return rows
          .filter((r: any) => {
            const dateEmpty = isBlank(r?.date as any);
            const natureEmpty = isBlank(r?.natureOfAccident);
            const fatalitiesMissing = !(typeof r?.fatalities === "number");
            const injuriesMissing = !(typeof r?.injuries === "number");
            return !(dateEmpty && natureEmpty && fatalitiesMissing && injuriesMissing);
          })
          .map((r: any) => ({
            ...r,
            date: isBlank(r?.date as any) ? undefined : (r.date as any),
            natureOfAccident: isBlank(r?.natureOfAccident) ? undefined : r.natureOfAccident.trim(),
          })) as IAccidentEntry[];
      };

      const pruneConvictionRows = (rows: ITrafficConvictionEntry[] | undefined) => {
        if (!Array.isArray(rows)) return [] as ITrafficConvictionEntry[];
        return rows
          .filter((r) => !(isBlank(r?.date as any) && isBlank(r?.location) && isBlank(r?.charge) && isBlank(r?.penalty)))
          .map((r) => ({
            ...r,
            date: isBlank(r.date as any) ? undefined : (r.date as any),
            location: isBlank(r.location) ? undefined : r.location.trim(),
            charge: isBlank(r.charge) ? undefined : r.charge.trim(),
            penalty: isBlank(r.penalty) ? undefined : r.penalty.trim(),
          })) as ITrafficConvictionEntry[];
      };

      const pruneCriminalRows = (rows: ICriminalRecordEntry[] | undefined) => {
        if (!Array.isArray(rows)) return [] as ICriminalRecordEntry[];
        return rows
          .filter((r) => !(isBlank(r?.offense) && isBlank(r?.dateOfSentence as any) && isBlank(r?.courtLocation)))
          .map((r) => ({
            ...r,
            offense: isBlank(r.offense) ? undefined : r.offense.trim(),
            dateOfSentence: isBlank(r.dateOfSentence as any) ? undefined : (r.dateOfSentence as any),
            courtLocation: isBlank(r.courtLocation) ? undefined : r.courtLocation.trim(),
          })) as ICriminalRecordEntry[];
      };

      const isEmptyAccident = (a: any) => !a?.date && (!a?.natureOfAccident || a.natureOfAccident.trim() === "") && !(typeof a?.fatalities === "number") && !(typeof a?.injuries === "number");
      const isEmptyConviction = (c: any) => (!c?.date) && (!c?.location || c.location.trim() === "") && (!c?.charge || c.charge.trim() === "") && (!c?.penalty || c.penalty.trim() === "");
      const isEmptyCriminal = (r: any) => (!r?.offense || r.offense.trim() === "") && (!r?.dateOfSentence) && (!r?.courtLocation || r.courtLocation.trim() === "");

      const validateAllOrNothing = () => {
        // Accidents
        for (const [i, a] of (staged.accidentHistory || []).entries()) {
          if (isEmptyAccident(a)) {
            return `Accident row ${i + 1}: row is empty. Remove it or complete all fields`;
          }
          const any = !!(a as any)?.date || (!!(a as any)?.natureOfAccident && (a as any).natureOfAccident.trim() !== "") || typeof (a as any)?.fatalities === "number" || typeof (a as any)?.injuries === "number";
          if (any) {
            if (!(a as any)?.date || isBlank((a as any)?.natureOfAccident) || (a as any)?.fatalities == null || (a as any)?.injuries == null) {
              return `Accident row ${i + 1}: complete all fields`;
            }
          }
        }
        // Traffic
        for (const [i, c] of (staged.trafficConvictions || []).entries()) {
          if (isEmptyConviction(c)) {
            return `Traffic conviction row ${i + 1}: row is empty. Remove it or complete all fields`;
          }
          const any = !!c.date || (!!c.location && c.location.trim() !== "") || (!!c.charge && c.charge.trim() !== "") || (!!c.penalty && c.penalty.trim() !== "");
          if (any) {
            if (!c.date || isBlank(c.location) || isBlank(c.charge) || isBlank(c.penalty)) {
              return `Traffic conviction row ${i + 1}: complete all fields`;
            }
          }
        }
        // Criminal
        for (const [i, r] of (staged.criminalRecords || []).entries()) {
          if (isEmptyCriminal(r)) {
            return `Criminal record row ${i + 1}: row is empty. Remove it or complete all fields`;
          }
          const any = isBlank(r.offense) === false || !!r.dateOfSentence || (isBlank(r.courtLocation) === false);
          if (any) {
            if (isBlank(r.offense) || !r.dateOfSentence || isBlank(r.courtLocation)) {
              return `Criminal record row ${i + 1}: complete all fields`;
            }
          }
        }
        return null;
      };

      const validationError = validateAllOrNothing();
      if (validationError) {
        throw new Error(validationError);
      }

      const payload = {
        accidentHistory: pruneAccidentRows(staged.accidentHistory),
        trafficConvictions: pruneConvictionRows(staged.trafficConvictions),
        criminalRecords: pruneCriminalRows(staged.criminalRecords),
      };

      const response = await fetch(
        `/api/v1/admin/onboarding/${trackerId}/application-form/accident-criminal`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        // Check if it's a 401 error and include the error message
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`401: ${errorData.message || 'Driver hasn\'t completed this step yet'}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh data after successful save
      await fetchData();

      // Invalidate contract context to update progress bar
      queryClient.invalidateQueries({ queryKey: ["contract-context", trackerId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save data";
      // For any error, let the submit bar surface the message
      const isRowValidation = /row\s+\d+\s*:/i.test(msg);
      if (!isRowValidation) {
        setError(msg);
      }
      // Re-throw so UpdateSubmitBar catches it and prevents reload
      throw err instanceof Error ? err : new Error(msg);
    }
  };

  const handleDiscard = () => {
    if (data) {
      setStaged({
        accidentHistory: data.accidentHistory || [],
        trafficConvictions: data.trafficConvictions || [],
        criminalRecords: data.criminalRecords || [],
      });
    }
  };

  const isDirty = !!(
    staged &&
    data &&
    (JSON.stringify(staged.accidentHistory) !==
      JSON.stringify(data.accidentHistory) ||
      JSON.stringify(staged.trafficConvictions) !==
        JSON.stringify(data.trafficConvictions) ||
      JSON.stringify(staged.criminalRecords) !==
        JSON.stringify(data.criminalRecords))
  );

  if (loading) {
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
          <span
            className="text-xs font-medium"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Loading Accident & Criminal Records...
          </span>
        </div>
      </div>
    );
  }



  if (error) {
    // Check if it's a 401 error (step not completed)
    if (error.includes("401")) {
      return (
        <StepNotCompletedMessage 
          stepName="Application Form Page 4"
          stepDescription="This page requires the driver to complete the criminal records section and other required information from the application form."
        />
      );
    }
    
    // For other errors, show the error message
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">No data available</div>
      </div>
    );
  }



  return (
    <AccidentCriminalContent
      data={data}
      staged={staged}
      isDirty={isDirty}
      onSave={handleSave}
      onDiscard={handleDiscard}
      onStageAccidentHistory={(accidentHistory) =>
        setStaged((prev) => (prev ? { ...prev, accidentHistory } : null))
      }
      onStageTrafficConvictions={(trafficConvictions) =>
        setStaged((prev) => (prev ? { ...prev, trafficConvictions } : null))
      }
      onStageCriminalRecords={(criminalRecords) =>
        setStaged((prev) => (prev ? { ...prev, criminalRecords } : null))
      }
    />
  );
}

function AccidentCriminalContent({
  data: _data,
  staged,
  isDirty,
  onSave,
  onDiscard,
  onStageAccidentHistory,
  onStageTrafficConvictions,
  onStageCriminalRecords,
}: {
  data: AccidentCriminalResponse["data"] | null;
  staged: {
    accidentHistory: IAccidentEntry[];
    trafficConvictions: ITrafficConvictionEntry[];
    criminalRecords: ICriminalRecordEntry[];
  } | null;
  isDirty: boolean;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  onStageAccidentHistory: (accidentHistory: IAccidentEntry[]) => void;
  onStageTrafficConvictions: (
    trafficConvictions: ITrafficConvictionEntry[]
  ) => void;
  onStageCriminalRecords: (criminalRecords: ICriminalRecordEntry[]) => void;
}) {
  const { isEditMode } = useEditMode();

  return (
    <div className="space-y-6">
      <UpdateSubmitBar
        dirty={isDirty}
        onSubmit={onSave}
        onDiscard={onDiscard}
      />

      {/* Edit Mode Status - Right Aligned */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2">
          <span
            className="text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Edit Mode:
          </span>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              isEditMode
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
            }`}
          >
            {isEditMode ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-6">
          <AccidentReportSection
            data={staged?.accidentHistory || []}
            initialHas={_data?.hasAccidentHistory}
            onStage={onStageAccidentHistory}
          />
        </div>

        <div className="xl:col-span-6">
          <TrafficConvictionsSection
            data={staged?.trafficConvictions || []}
            initialHas={_data?.hasTrafficConvictions}
            onStage={onStageTrafficConvictions}
          />
        </div>

        <div className="xl:col-span-12">
          <CriminalRecordsSection
            data={staged?.criminalRecords || []}
            initialHas={_data?.hasCriminalRecords}
            onStage={onStageCriminalRecords}
          />
        </div>
      </div>
    </div>
  );
}
