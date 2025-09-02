"use client";

import React, { useState } from "react";
import { useEditMode } from "@/app/dashboard/contract/[id]/components/EditModeContext";
import { ICriminalRecordEntry } from "@/types/applicationForm.types";
import { Plus, X } from "lucide-react";

interface CriminalRecordsSectionProps {
  data: ICriminalRecordEntry[];
  onStage: (criminalRecords: ICriminalRecordEntry[]) => void;
}

export default function CriminalRecordsSection({ data, onStage }: CriminalRecordsSectionProps) {
  const { isEditMode } = useEditMode();
  const [localData, setLocalData] = useState<ICriminalRecordEntry[]>(data);

  React.useEffect(() => {
    setLocalData(data);
  }, [data]);

  const addCriminalRecord = () => {
    const newRecord: ICriminalRecordEntry = {
      offense: "",
      dateOfSentence: "",
      courtLocation: "",
    };
    const updated = [...localData, newRecord];
    setLocalData(updated);
    onStage(updated);
  };

  const removeCriminalRecord = (index: number) => {
    const updated = localData.filter((_, i) => i !== index);
    setLocalData(updated);
    onStage(updated);
  };

  const updateCriminalRecord = (index: number, field: keyof ICriminalRecordEntry, value: string) => {
    const updated = localData.map((record, i) => 
      i === index ? { ...record, [field]: value } : record
    );
    setLocalData(updated);
    onStage(updated);
  };

  const formatInputDate = (date: string | Date) => {
    if (!date) return "";
    if (typeof date === "string") {
      // Handle ISO date strings for HTML date input
      try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return "";
        return dateObj.toISOString().split("T")[0];
      } catch {
        return "";
      }
    }
    return date.toISOString().split("T")[0];
  };

  const formatDisplayDate = (date: string | Date) => {
    if (!date) return "";
    if (typeof date === "string") {
      // Handle ISO date strings
      try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return date; // Return original if invalid
        return dateObj.toLocaleDateString("en-CA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      } catch {
        return date; // Return original if parsing fails
      }
    }
    return date.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <section 
      className="space-y-6 border p-6 rounded-2xl shadow-sm"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-outline)",
      }}
    >
      <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: "var(--color-outline)" }}>
        <div 
          className="w-1 h-8 rounded-full"
          style={{ background: "var(--color-error)" }}
        />
        <h2 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>
          Criminal Record Verification
        </h2>
      </div>

      {localData.length === 0 ? (
        <div className="text-center py-8">
          <p style={{ color: "var(--color-on-surface-variant)" }}>
            No criminal records found. {isEditMode && "Click 'Add Criminal Record' to add a new record."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm font-medium pb-2 border-b" style={{ 
            color: "var(--color-on-surface-variant)",
            borderColor: "var(--color-outline)"
          }}>
            <div>Offense</div>
            <div>Date Of Sentence</div>
            <div>Court Location</div>
          </div>

          {localData.map((record, index) => (
            <div key={index} className="grid grid-cols-3 gap-4 items-center relative">
              {isEditMode ? (
                <>
                  <input
                    type="text"
                    value={record.offense}
                    onChange={(e) => updateCriminalRecord(index, "offense", e.target.value)}
                    placeholder="Offense"
                    className="py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-outline)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                  <input
                    type="date"
                    value={formatInputDate(record.dateOfSentence)}
                    onChange={(e) => updateCriminalRecord(index, "dateOfSentence", e.target.value)}
                    className="py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-outline)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                  <input
                    type="text"
                    value={record.courtLocation}
                    onChange={(e) => updateCriminalRecord(index, "courtLocation", e.target.value)}
                    placeholder="Court Location"
                    className="py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-outline)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeCriminalRecord(index)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="py-2 px-3" style={{ color: "var(--color-on-surface)" }}>
                    {record.offense}
                  </div>
                  <div className="py-2 px-3" style={{ color: "var(--color-on-surface)" }}>
                    {formatDisplayDate(record.dateOfSentence)}
                  </div>
                  <div className="py-2 px-3" style={{ color: "var(--color-on-surface)" }}>
                    {record.courtLocation}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {isEditMode && (
        <button
          type="button"
          onClick={addCriminalRecord}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
        >
          <Plus className="h-4 w-4" />
          Add Criminal Record
        </button>
      )}
    </section>
  );
}
