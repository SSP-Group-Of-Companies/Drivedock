"use client";

import React, { useState } from "react";
import { useEditMode } from "@/app/dashboard/contract/[id]/components/EditModeContext";
import { IAccidentEntry } from "@/types/applicationForm.types";
import { Plus, X } from "lucide-react";
import { formatInputDate } from "@/lib/utils/dateUtils";
import { WithCopy } from "@/components/form/WithCopy";

interface AccidentReportSectionProps {
  data: IAccidentEntry[];
  initialHas?: boolean | undefined;
  onStage: (accidentHistory: IAccidentEntry[]) => void;
}

export default function AccidentReportSection({ data, initialHas, onStage }: AccidentReportSectionProps) {
  const { isEditMode } = useEditMode();
  const [localData, setLocalData] = useState<IAccidentEntry[]>(data);
  const [hasAccidentHistory, setHasAccidentHistory] = useState<boolean | undefined>(() =>
    typeof initialHas === "boolean" ? initialHas : data.length > 0 ? true : undefined
  );

  React.useEffect(() => {
    setLocalData(data);
    setHasAccidentHistory((prev) =>
      prev === undefined
        ? (typeof initialHas === "boolean" ? initialHas : data.length > 0 ? true : undefined)
        : prev
    );
  }, [data, initialHas]);

  const addAccident = () => {
    if (hasAccidentHistory !== true) setHasAccidentHistory(true);
    const newAccident = {
      date: "",
      natureOfAccident: "",
      // Leave numbers undefined until user enters them (aligns with onboarding validation)
      fatalities: undefined,
      injuries: undefined,
    } as unknown as IAccidentEntry;
    const updated = [...localData, newAccident];
    setLocalData(updated);
    onStage(updated);
  };

  const removeAccident = (index: number) => {
    const updated = localData.filter((_, i) => i !== index);
    setLocalData(updated);
    onStage(updated);
  };

  const updateAccident = (index: number, field: keyof IAccidentEntry, value: string | number) => {
    const updated = localData.map((accident, i) => 
      i === index ? { ...accident, [field]: value } : accident
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
          style={{ background: "var(--color-info)" }}
        />
        <h2 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>
          Nature Of Accident
        </h2>
        <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
          (Head-On, Rear end, upset, NAF, etc...)
        </span>
      </div>

      {/* Boolean gate */}
      {isEditMode && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>Have you ever been involved in an accident?</span>
          <div className="inline-flex rounded-full border overflow-hidden shrink-0" style={{ borderColor: "var(--color-outline)" }}>
            <button
              type="button"
              className="px-3 py-1 text-sm min-w-[44px]"
              style={{
                background: hasAccidentHistory === true ? "var(--color-primary)" : "var(--color-surface)",
                color: hasAccidentHistory === true ? "var(--color-on-primary)" : "var(--color-on-surface)",
              }}
              onClick={() => {
                if (hasAccidentHistory !== true) {
                  // Flip to YES and ensure at least one starter row exists
                  const ensure = localData.length > 0 ? localData : [
                    {
                      date: "",
                      natureOfAccident: "",
                      fatalities: undefined as unknown as number,
                      injuries: undefined as unknown as number,
                    } as unknown as IAccidentEntry,
                  ];
                  setHasAccidentHistory(true);
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
                background: hasAccidentHistory === false ? "var(--color-primary)" : "var(--color-surface)",
                color: hasAccidentHistory === false ? "var(--color-on-primary)" : "var(--color-on-surface)",
              }}
              onClick={() => {
                setHasAccidentHistory(false);
                setLocalData([]);
                onStage([]);
              }}
            >
              No
            </button>
          </div>
        </div>
      )}

      {hasAccidentHistory !== true ? (
        <div className="text-center py-8">
          <p style={{ color: "var(--color-on-surface-variant)" }}>
            No accident records found. {isEditMode && "Click 'Add Accident' to add a new record."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 text-sm font-medium pb-2 border-b" style={{ 
            color: "var(--color-on-surface-variant)",
            borderColor: "var(--color-outline)"
          }}>
            <div>Date</div>
            <div>Nature Of Accident</div>
            <div>Fatalities</div>
            <div>Injuries</div>
          </div>

          {localData.map((accident, index) => (
            <div key={index} className="grid grid-cols-4 gap-2 items-center relative">
              {isEditMode ? (
                <>
                  <WithCopy value={formatInputDate(accident.date) || ""} label="Accident date">
                    <input
                      type="date"
                      value={formatInputDate(accident.date)}
                      onChange={(e) => updateAccident(index, "date", e.target.value)}
                      className="w-full py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors pr-9"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </WithCopy>
                  <WithCopy value={accident.natureOfAccident || ""} label="Nature of accident">
                    <input
                      type="text"
                      value={accident.natureOfAccident}
                      onChange={(e) => updateAccident(index, "natureOfAccident", e.target.value)}
                      placeholder="e.g., Rear end, Head-On"
                      className="w-full py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors pr-10"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </WithCopy>
                  <WithCopy value={(accident as any).fatalities !== undefined ? String((accident as any).fatalities) : ""} label="Fatalities">
                    <input
                      type="number"
                      value={(accident as any).fatalities ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateAccident(index, "fatalities", val === "" ? (undefined as unknown as number) : Math.max(0, Number(val)));
                      }}
                      min="0"
                      placeholder="Fatalities"
                      className="w-full py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors pr-10"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </WithCopy>
                  <WithCopy value={(accident as any).injuries !== undefined ? String((accident as any).injuries) : ""} label="Injuries">
                    <input
                      type="number"
                      value={(accident as any).injuries ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateAccident(index, "injuries", val === "" ? (undefined as unknown as number) : Math.max(0, Number(val)));
                      }}
                      min="0"
                      placeholder="Injuries"
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
                    onClick={() => removeAccident(index)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <WithCopy value={formatInputDate(accident.date) || ""} label="Accident date">
                    <div className="py-2 px-3 pr-10" style={{ color: "var(--color-on-surface)" }}>
                      {formatDisplayDate(accident.date)}
                    </div>
                  </WithCopy>
                  <WithCopy value={accident.natureOfAccident || ""} label="Nature of accident">
                    <div className="py-2 px-3 pr-10" style={{ color: "var(--color-on-surface)" }}>
                      {accident.natureOfAccident || "Not provided"}
                    </div>
                  </WithCopy>
                  <WithCopy value={(accident as any).fatalities !== undefined ? String((accident as any).fatalities) : ""} label="Fatalities">
                    <div className="py-2 px-3 pr-10" style={{ color: "var(--color-on-surface)" }}>
                      {(accident as any).fatalities !== undefined ? (accident as any).fatalities : "Not provided"}
                    </div>
                  </WithCopy>
                  <WithCopy value={(accident as any).injuries !== undefined ? String((accident as any).injuries) : ""} label="Injuries">
                    <div className="py-2 px-3 pr-10" style={{ color: "var(--color-on-surface)" }}>
                      {(accident as any).injuries !== undefined ? (accident as any).injuries : "Not provided"}
                    </div>
                  </WithCopy>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {isEditMode && hasAccidentHistory === true && (
        <button
          type="button"
          onClick={addAccident}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
        >
          <Plus className="h-4 w-4" />
          Add Accident
        </button>
      )}
    </section>
  );
}
