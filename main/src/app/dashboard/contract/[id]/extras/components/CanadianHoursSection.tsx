"use client";

import React from "react";
import { ICanadianHoursOfService, ICanadianDailyHours } from "@/types/applicationForm.types";


interface CanadianHoursSectionProps {
  data: ICanadianHoursOfService;
  isEditMode: boolean;
  staged: any;
  onStage: (changes: Record<string, any>) => void;
}

export default function CanadianHoursSection({ data, isEditMode, staged, onStage }: CanadianHoursSectionProps) {
  // Merge staged changes with original data for display (same pattern as other pages)
  const rawFormData = { ...data, ...staged };
  
  // Fix corrupted dailyHours data where all entries might have day: 1
  // This happens when onboarding normalizeArray creates duplicate day numbers
  const correctedDailyHours = rawFormData.dailyHours.map((dh: ICanadianDailyHours, index: number) => ({
    ...dh,
    day: dh.day === 1 && index > 0 ? index + 1 : dh.day // Fix duplicate day: 1 entries
  }));
  
  const formData = {
    ...rawFormData,
    dailyHours: correctedDailyHours
  };
  
  const handleChange = (field: keyof ICanadianHoursOfService, value: string | ICanadianDailyHours[]) => {
    onStage({ [field]: value });
  };

  const updateDailyHours = (dayNumber: number, hours: number) => {
    const existingDayIndex = formData.dailyHours.findIndex((dh: ICanadianDailyHours) => dh.day === dayNumber);
    const updatedDailyHours = [...formData.dailyHours];
    
    if (existingDayIndex >= 0) {
      // Update existing day
      updatedDailyHours[existingDayIndex] = { ...updatedDailyHours[existingDayIndex], hours };
    } else {
      // Add new day
      updatedDailyHours.push({ day: dayNumber, hours });
    }
    
    onStage({ dailyHours: updatedDailyHours });
  };

  const formatInputDate = (date: string | Date) => {
    if (!date) return "";
    const s = String(date);

    // If already plain date (from DB) keep as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // Parse ISO (e.g., 2023-04-09T00:00:00.000Z)
    // Then format using UTC so we don't drift a day in local timezones
    let d: Date;
    try {
      d = new Date(s);
    } catch {
      return "";
    }
    if (isNaN(d.getTime())) return "";

    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const formatDisplayDate = (date: string | Date) => {
    if (!date) return "Not provided";
    const s = String(date);
    
    // If already plain date (yyyy-MM-dd), format directly without timezone conversion
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [year, month, day] = s.split('-');
      return `${year}-${month}-${day}`;
    }
    
    // For ISO strings, use UTC methods to avoid timezone drift
    try {
      const dateObj = new Date(s);
      if (isNaN(dateObj.getTime())) return s;
      
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return s;
    }
  };

  const totalHours = formData.dailyHours.reduce((sum: number, dh: ICanadianDailyHours) => sum + (dh.hours || 0), 0);

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
          Canadian Hours of Service
        </h2>
      </div>

      {/* Day One Date and Daily Hours in Horizontal Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day One Date */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
            Day One Date
          </h3>
          <div className="flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-sm"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-outline)",
            }}>
            <span className="text-sm flex-1 pr-4" style={{ color: "var(--color-on-surface-variant)" }}>
              Start Date
            </span>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <input
                  type="date"
                  value={formatInputDate(formData.dayOneDate)}
                  onChange={(e) => handleChange("dayOneDate", e.target.value)}
                  className="py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
              ) : (
                <div className="py-2 px-3 rounded-md font-medium" style={{
                  background: "var(--color-surface-variant)",
                  color: "var(--color-on-surface)",
                }}>
                  {formatDisplayDate(formData.dayOneDate)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Hours Summary */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
            Daily Hours Summary
          </h3>
          <div className="p-4 rounded-xl border transition-all duration-200 hover:shadow-sm"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-outline)",
            }}>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
                {totalHours}
              </div>
              <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                Total Hours
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
                {formData.dailyHours.length} days recorded
              </div>
            </div>
          </div>
        </div>
      </div>

              {/* Daily Hours - Fixed 14-Day Grid Layout */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
              Daily Hours Breakdown
            </h3>
          </div>

          <div className="space-y-3">
            {/* Header - Fixed 14 days */}
            <div className="grid gap-2 text-xs font-medium pb-2 border-b" style={{ 
              color: "var(--color-on-surface-variant)",
              borderColor: "var(--color-outline)",
              gridTemplateColumns: "repeat(14, minmax(0, 1fr))"
            }}>
              {Array.from({ length: 14 }, (_, i) => (
                <div key={i} className="text-center">
                  <span className="hidden sm:inline">Day </span>{i + 1}
                </div>
              ))}
            </div>

            {/* Hours Row - Fixed 14 days */}
            <div className="grid gap-2" style={{
              gridTemplateColumns: "repeat(14, minmax(0, 1fr))"
            }}>
              {Array.from({ length: 14 }, (_, i) => {
                const dayNumber = i + 1;
                const dayData = formData.dailyHours.find((dh: ICanadianDailyHours) => dh.day === dayNumber);
                return (
                  <div key={i} className="text-center">
                    {isEditMode ? (
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={dayData?.hours || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const parsedValue = parseFloat(value);
                          
                          if (value === "" || value === "0") {
                            // Clear the field if empty or 0
                            updateDailyHours(dayNumber, 0);
                          } else if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 24) {
                            updateDailyHours(dayNumber, parsedValue);
                          }
                        }}
                        className="w-full py-1 px-1 rounded border focus:ring-2 focus:outline-none transition-colors text-center text-sm"
                        style={{
                          background: "var(--color-surface)",
                          borderColor: "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                      />
                    ) : (
                      <div className="py-1 px-1 text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>
                        {dayData?.hours || 0}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      
    </section>
  );
}
