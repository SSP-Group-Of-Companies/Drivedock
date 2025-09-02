"use client";

import { Check } from "lucide-react";

interface CategoriesSectionProps {
  data: {
    driverType: string;
    haulPreference: string;
    teamStatus: string;
    preferLocalDriving: boolean;
    preferSwitching: boolean;
    flatbedExperience: boolean;
  };
}

export default function CategoriesSection({ data }: CategoriesSectionProps) {
  const questions = [
    {
      key: "driverType",
      label: "Which Driver are you?",
      type: "choice" as const,
      options: ["Company", "Owner Operator", "Owner Driver"],
      value: data.driverType,
    },
    {
      key: "haulPreference",
      label: "Which do you prefer?",
      type: "choice" as const,
      options: ["Short Haul", "Long Haul"],
      value: data.haulPreference,
    },
    {
      key: "teamStatus",
      label: "Are you part of a Team or No?",
      type: "choice" as const,
      options: ["Team", "Single"],
      value: data.teamStatus,
    },
    {
      key: "preferLocalDriving",
      label: "Do you prefer driving local?",
      type: "boolean" as const,
      value: data.preferLocalDriving,
    },
    {
      key: "preferSwitching",
      label: "Do you prefer Switching?",
      type: "boolean" as const,
      value: data.preferSwitching,
    },
    {
      key: "flatbedExperience",
      label: "Do you have flatbed Experience?",
      type: "boolean" as const,
      value: data.flatbedExperience,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: "var(--color-outline-variant)" }}>
        <div className="w-2 h-8 rounded-full" style={{ background: "var(--color-success)" }}></div>
        <h3 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>Categories</h3>
      </div>
      <div className="space-y-3">
                 {questions.map((question) => (
          <div
            key={question.key}
            className="p-4 rounded-xl border transition-all duration-200 hover:shadow-sm"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-outline)",
            }}
          >
            <div className="mb-2">
              <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                {question.label}
              </span>
            </div>
            
                         {question.type === "choice" ? (
               <div className="flex flex-wrap gap-3">
                 {question.options.map((option) => (
                   <div
                     key={option}
                     className="px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 cursor-pointer"
                     style={{
                       background: question.value === option 
                         ? "var(--color-success)" 
                         : "var(--color-surface-variant)",
                       color: question.value === option 
                         ? "white" 
                         : "var(--color-on-surface-variant)",
                       borderColor: question.value === option 
                         ? "var(--color-success)" 
                         : "var(--color-outline-variant)",
                     }}
                   >
                     {option}
                   </div>
                 ))}
               </div>
            ) : (
                             <div className="flex items-center gap-2">
                 <div className="flex items-center justify-center w-6 h-6 rounded border-2" style={{
                   borderColor: question.value === true 
                     ? "var(--color-success)" 
                     : "var(--color-error)",
                   background: question.value === true 
                     ? "var(--color-success)" 
                     : "var(--color-error)",
                 }}>
                   {question.value === true && (
                     <Check className="w-4 h-4 text-white" />
                   )}
                   {question.value === false && (
                     <span className="w-2 h-2 bg-white rounded-full" />
                   )}
                 </div>
                 <span className="text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>
                   {question.value === true ? 'Yes' : 'No'}
                 </span>
               </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
