"use client";

import React, { useState } from "react";
import { useEditMode } from "@/app/dashboard/contract/[id]/components/EditModeContext";
import { ICriminalRecordEntry } from "@/types/applicationForm.types";
import { Plus, X } from "lucide-react";
import { formatInputDate } from "@/lib/utils/dateUtils";
import { WithCopy } from "@/components/form/WithCopy";

interface CriminalRecordsSectionProps {
  data: ICriminalRecordEntry[];
  initialHas?: boolean | undefined;
  onStage: (criminalRecords: ICriminalRecordEntry[]) => void;
}

export default function CriminalRecordsSection({ data, initialHas, onStage }: CriminalRecordsSectionProps) {
  const { isEditMode } = useEditMode();
  const [localData, setLocalData] = useState<ICriminalRecordEntry[]>(data);
  const [hasCriminalRecords, setHasCriminalRecords] = useState<boolean | undefined>(() =>
    typeof initialHas === "boolean" ? initialHas : data.length > 0 ? true : undefined
  );

  React.useEffect(() => {
    setLocalData(data);
    setHasCriminalRecords((prev) =>
      prev === undefined
        ? (typeof initialHas === "boolean" ? initialHas : data.length > 0 ? true : undefined)
        : prev
    );
  }, [data, initialHas]);

  const addCriminalRecord = () => {
    if (hasCriminalRecords !== true) setHasCriminalRecords(true);
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

  const formatDisplayDate = (date: string | Date) => {
    if (!date) return "Not provided";
    const s = String(date);

    // If already plain date (yyyy-MM-dd), format directly without timezone conversion
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [year, month, day] = s.split("-");
      return `${month}/${day}/${year}`;
    }

    // For ISO strings, use UTC methods to avoid timezone drift
    try {
      const dateObj = new Date(s);
      if (isNaN(dateObj.getTime())) return s;

      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getUTCDate()).padStart(2, "0");
      return `${month}/${day}/${year}`;
    } catch {
      return s;
    }
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

      {/* Boolean gate */}
      {isEditMode && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>Have you ever been convicted of a criminal offense?</span>
          <div className="inline-flex rounded-full border overflow-hidden shrink-0" style={{ borderColor: "var(--color-outline)" }}>
            <button
              type="button"
              className="px-3 py-1 text-sm min-w-[44px]"
              style={{
                background: hasCriminalRecords === true ? "var(--color-primary)" : "var(--color-surface)",
                color: hasCriminalRecords === true ? "var(--color-on-primary)" : "var(--color-on-surface)",
              }}
              onClick={() => {
                if (hasCriminalRecords !== true) {
                  const ensure = localData.length > 0 ? localData : [{
                    offense: "",
                    dateOfSentence: "",
                    courtLocation: "",
                  } as ICriminalRecordEntry];
                  setHasCriminalRecords(true);
                  setLocalData(ensure);
                  onStage(ensure);
                }
              }}
            >
              Yes
            </button>
            <button
              type="button"
              className="px-3 py-1 text-sm border-l min-w-[44px]"
              style={{
                borderColor: "var(--color-outline)",
                background: hasCriminalRecords === false ? "var(--color-primary)" : "var(--color-surface)",
                color: hasCriminalRecords === false ? "var(--color-on-primary)" : "var(--color-on-surface)",
              }}
              onClick={() => { setHasCriminalRecords(false); setLocalData([]); onStage([]); }}
            >
              No
            </button>
          </div>
        </div>
      )}

      {hasCriminalRecords !== true ? (
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
            <div key={index} className="grid grid-cols-3 gap-2 items-center relative">
              {isEditMode ? (
                <>
                  <WithCopy value={record.offense || ""} label="Offense">
                    <input
                      type="text"
                      value={record.offense}
                      onChange={(e) => updateCriminalRecord(index, "offense", e.target.value)}
                      placeholder="Offense"
                      className="w-full py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors pr-10"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </WithCopy>
                  <WithCopy value={formatInputDate(record.dateOfSentence) || ""} label="Date of sentence">
                    <input
                      type="date"
                      value={formatInputDate(record.dateOfSentence)}
                      onChange={(e) => updateCriminalRecord(index, "dateOfSentence", e.target.value)}
                      className="w-full py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors pr-9"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </WithCopy>
                  <WithCopy value={record.courtLocation || ""} label="Court location">
                    <input
                      type="text"
                      value={record.courtLocation}
                      onChange={(e) => updateCriminalRecord(index, "courtLocation", e.target.value)}
                      placeholder="Court Location"
                      className="w-full py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors pr-10"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </WithCopy>
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
                  <WithCopy value={record.offense || ""} label="Offense">
                    <div className="py-2 px-3 pr-10" style={{ color: "var(--color-on-surface)" }}>
                      {record.offense || "Not provided"}
                    </div>
                  </WithCopy>
                  <WithCopy value={formatInputDate(record.dateOfSentence) || ""} label="Date of sentence">
                    <div className="py-2 px-3 pr-10" style={{ color: "var(--color-on-surface)" }}>
                      {formatDisplayDate(record.dateOfSentence)}
                    </div>
                  </WithCopy>
                  <WithCopy value={record.courtLocation || ""} label="Court location">
                    <div className="py-2 px-3 pr-10" style={{ color: "var(--color-on-surface)" }}>
                      {record.courtLocation || "Not provided"}
                    </div>
                  </WithCopy>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {isEditMode && hasCriminalRecords === true && (
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
