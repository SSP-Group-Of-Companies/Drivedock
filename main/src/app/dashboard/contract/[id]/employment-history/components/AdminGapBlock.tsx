"use client";

import { useState } from "react";
import { AlertCircle, Info } from "lucide-react";

interface Props {
  index: number;
  days: number;
  gapExplanation: string;
  isEditMode: boolean;
  onUpdate: (explanation: string) => void;
}

export default function AdminGapBlock({ 
  index, 
  days, 
  gapExplanation, 
  isEditMode, 
  onUpdate 
}: Props) {
  const [localValue, setLocalValue] = useState(gapExplanation || "");

  const handleChange = (value: string) => {
    setLocalValue(value);
    onUpdate(value);
  };

  return (
    <div 
      className="my-6 p-4 rounded-xl border"
      style={{
        background: "var(--color-error-container)",
        borderColor: "var(--color-error)",
        opacity: 0.9
      }}
    >
      <div className="flex items-start gap-3">
        <AlertCircle 
          className="w-5 h-5 mt-0.5 flex-shrink-0"
          style={{ color: "var(--color-error)" }}
        />
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p 
                className="text-sm font-semibold"
                style={{ color: "var(--color-error)" }}
              >
                Employment Gap Detected
              </p>
              <p 
                className="text-xs"
                style={{ color: "var(--color-on-error-container)" }}
              >
                {days} days gap between employments
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Info className="w-4 h-4" style={{ color: "var(--color-error)" }} />
              <span 
                className="text-xs font-medium"
                style={{ color: "var(--color-error)" }}
              >
                Gap #{index}
              </span>
            </div>
          </div>

          {isEditMode ? (
            <div className="space-y-2">
              <label 
                className="block text-xs font-medium"
                style={{ color: "var(--color-on-error-container)" }}
              >
                Gap Explanation:
              </label>
              <textarea
                value={localValue}
                onChange={(e) => handleChange(e.target.value)}
                rows={2}
                className="block w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:shadow-md"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                  color: "var(--color-on-surface)",
                }}
                placeholder="Please explain the gap in employment history..."
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p 
                className="text-xs font-medium"
                style={{ color: "var(--color-on-error-container)" }}
              >
                Explanation:
              </p>
              <div 
                className="p-3 rounded-md text-sm"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                  color: "var(--color-on-surface)",
                }}
              >
                {gapExplanation || (
                  <span 
                    className="italic"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    No explanation provided
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
