"use client";

import React, { useState } from "react";
import { useEditMode } from "@/app/dashboard/contract/[id]/components/EditModeContext";
import { ITrafficConvictionEntry } from "@/types/applicationForm.types";
import { Plus, X } from "lucide-react";
import { formatInputDate } from "@/lib/utils/dateUtils";
import { WithCopy } from "@/components/form/WithCopy";

interface TrafficConvictionsSectionProps {
  data: ITrafficConvictionEntry[];
  initialHas?: boolean | undefined;
  onStage: (trafficConvictions: ITrafficConvictionEntry[]) => void;
}

export default function TrafficConvictionsSection({
  data,
  initialHas,
  onStage,
}: TrafficConvictionsSectionProps) {
  const { isEditMode } = useEditMode();
  const [localData, setLocalData] = useState<ITrafficConvictionEntry[]>(data);
  const [hasTrafficConvictions, setHasTrafficConvictions] = useState<boolean | undefined>(() =>
    typeof initialHas === "boolean" ? initialHas : data.length > 0 ? true : undefined
  );

  React.useEffect(() => {
    setLocalData(data);
    setHasTrafficConvictions((prev) =>
      prev === undefined
        ? (typeof initialHas === "boolean" ? initialHas : data.length > 0 ? true : undefined)
        : prev
    );
  }, [data, initialHas]);

  const addConviction = () => {
    if (hasTrafficConvictions !== true) setHasTrafficConvictions(true);
    const newConviction: ITrafficConvictionEntry = {
      date: "",
      location: "",
      charge: "",
      penalty: "",
    };
    const updated = [...localData, newConviction];
    setLocalData(updated);
    onStage(updated);
  };

  const removeConviction = (index: number) => {
    const updated = localData.filter((_, i) => i !== index);
    setLocalData(updated);
    onStage(updated);
  };

  const updateConviction = (
    index: number,
    field: keyof ITrafficConvictionEntry,
    value: string
  ) => {
    const updated = localData.map((conviction, i) =>
      i === index ? { ...conviction, [field]: value } : conviction
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
      <div
        className="flex items-center gap-3 pb-2 border-b"
        style={{ borderColor: "var(--color-outline)" }}
      >
        <div
          className="w-1 h-8 rounded-full"
          style={{ background: "var(--color-warning)" }}
        />
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--color-on-surface)" }}
        >
          Traffic Convictions
        </h2>
      </div>

      {/* Boolean gate */}
      {isEditMode && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>Have you ever been convicted of a traffic offense?</span>
          <div className="inline-flex rounded-full border overflow-hidden shrink-0" style={{ borderColor: "var(--color-outline)" }}>
            <button
              type="button"
              className="px-3 py-1 text-sm min-w-[44px]"
              style={{
                background: hasTrafficConvictions === true ? "var(--color-primary)" : "var(--color-surface)",
                color: hasTrafficConvictions === true ? "var(--color-on-primary)" : "var(--color-on-surface)",
              }}
              onClick={() => {
                if (hasTrafficConvictions !== true) {
                  const ensure = localData.length > 0 ? localData : [{
                    date: "",
                    location: "",
                    charge: "",
                    penalty: "",
                  } as ITrafficConvictionEntry];
                  setHasTrafficConvictions(true);
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
                background: hasTrafficConvictions === false ? "var(--color-primary)" : "var(--color-surface)",
                color: hasTrafficConvictions === false ? "var(--color-on-primary)" : "var(--color-on-surface)",
              }}
              onClick={() => { setHasTrafficConvictions(false); setLocalData([]); onStage([]); }}
            >
              No
            </button>
          </div>
        </div>
      )}

      {hasTrafficConvictions !== true ? (
        <div className="text-center py-8">
          <p style={{ color: "var(--color-on-surface-variant)" }}>
            No traffic convictions found.{" "}
            {isEditMode && "Click 'Add Conviction' to add a new record."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className="grid grid-cols-4 gap-4 text-sm font-medium pb-2 border-b"
            style={{
              color: "var(--color-on-surface-variant)",
              borderColor: "var(--color-outline)",
            }}
          >
            <div>Date</div>
            <div>Location</div>
            <div>Charge</div>
            <div>Penalty</div>
          </div>

          {localData.map((conviction, index) => (
            <div
              key={index}
              className="grid grid-cols-4 gap-2 items-center relative"
            >
              {isEditMode ? (
                <>
                  <WithCopy value={formatInputDate(conviction.date) || ""} label="Conviction date">
                    <input
                      type="date"
                      value={formatInputDate(conviction.date)}
                      onChange={(e) =>
                        updateConviction(index, "date", e.target.value)
                      }
                      className="w-full py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors pr-9"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </WithCopy>
                  <WithCopy value={conviction.location || ""} label="Location">
                    <input
                      type="text"
                      value={conviction.location}
                      onChange={(e) =>
                        updateConviction(index, "location", e.target.value)
                      }
                      placeholder="Location"
                      className="w-full py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors pr-10"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </WithCopy>
                  <WithCopy value={conviction.charge || ""} label="Charge">
                    <input
                      type="text"
                      value={conviction.charge}
                      onChange={(e) =>
                        updateConviction(index, "charge", e.target.value)
                      }
                      placeholder="Charge"
                      className="w-full py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors pr-10"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </WithCopy>
                  <WithCopy value={conviction.penalty || ""} label="Penalty">
                    <input
                      type="text"
                      value={conviction.penalty}
                      onChange={(e) =>
                        updateConviction(index, "penalty", e.target.value)
                      }
                      placeholder="Penalty"
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
                    onClick={() => removeConviction(index)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <WithCopy value={formatInputDate(conviction.date) || ""} label="Conviction date">
                    <div className="py-2 px-3 pr-10" style={{ color: "var(--color-on-surface)" }}>
                      {formatDisplayDate(conviction.date)}
                    </div>
                  </WithCopy>
                  <WithCopy value={conviction.location || ""} label="Location">
                    <div className="py-2 px-3 pr-10" style={{ color: "var(--color-on-surface)" }}>
                      {conviction.location || "Not provided"}
                    </div>
                  </WithCopy>
                  <WithCopy value={conviction.charge || ""} label="Charge">
                    <div className="py-2 px-3 pr-10" style={{ color: "var(--color-on-surface)" }}>
                      {conviction.charge || "Not provided"}
                    </div>
                  </WithCopy>
                  <WithCopy value={conviction.penalty || ""} label="Penalty">
                    <div className="py-2 px-3 pr-10" style={{ color: "var(--color-on-surface)" }}>
                      {conviction.penalty || "Not provided"}
                    </div>
                  </WithCopy>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {isEditMode && hasTrafficConvictions === true && (
        <button
          type="button"
          onClick={addConviction}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
        >
          <Plus className="h-4 w-4" />
          Add Conviction
        </button>
      )}
    </section>
  );
}
