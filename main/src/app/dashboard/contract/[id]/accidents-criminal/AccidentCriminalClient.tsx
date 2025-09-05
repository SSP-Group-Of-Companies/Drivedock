"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
      const response = await fetch(
        `/api/v1/admin/onboarding/${trackerId}/application-form/accident-criminal`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(staged),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save data");
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
            onStage={onStageAccidentHistory}
          />
        </div>

        <div className="xl:col-span-6">
          <TrafficConvictionsSection
            data={staged?.trafficConvictions || []}
            onStage={onStageTrafficConvictions}
          />
        </div>

        <div className="xl:col-span-12">
          <CriminalRecordsSection
            data={staged?.criminalRecords || []}
            onStage={onStageCriminalRecords}
          />
        </div>
      </div>
    </div>
  );
}
