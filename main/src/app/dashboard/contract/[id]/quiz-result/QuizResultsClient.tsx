"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { QuizResultsResponse } from "@/app/api/v1/admin/onboarding/[id]/quiz-results/types";
import StepNotCompletedMessage from "../components/StepNotCompletedMessage";
import { QuizResultsContent } from "./components";

export default function QuizResultsClient() {
  const { id: trackerId } = useParams<{ id: string }>();

  const [data, setData] = useState<QuizResultsResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/admin/onboarding/${trackerId}/quiz-results`
      );
      if (!response.ok) {
        // Check if it's a 401 error and include the error message
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`401: ${errorData.message || 'Driver hasn\'t completed this step yet'}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: QuizResultsResponse = await response.json();
      setData(result.data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

    if (error) {
    // Check if it's a 401 error (step not completed)
    if (error.includes("401")) {
      return (
        <StepNotCompletedMessage 
          stepName="Application Form Page 5"
          stepDescription="This page requires the driver to complete the competency quiz and achieve a passing score."
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
    <div className="space-y-4">
      {/* Quiz Results Content */}
      <div className="rounded-xl border p-4 sm:p-6 lg:p-8 shadow-sm dark:shadow-none" style={{
        background: "var(--color-card)",
        borderColor: "var(--color-outline)",
      }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6">
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: "var(--color-on-surface)" }}>Quiz Results</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              Edit Mode:
            </span>
            <span className="px-2 py-1 rounded text-xs font-medium" style={{
              background: "var(--color-surface-variant)",
              color: "var(--color-on-surface-variant)",
            }}>
              DISABLED (Read-only quiz results)
            </span>
          </div>
        </div>
        
        <QuizResultsContent
          data={data}
          onRefresh={fetchData}
        />
      </div>
    </div>
  );
}
