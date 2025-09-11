"use client";

import { ContractContext } from "@/lib/dashboard/api/contracts";

interface CompletionSummaryProps {
  contractContext: ContractContext;
}

export default function CompletionSummary({
  contractContext,
}: CompletionSummaryProps) {
  const isCompleted = contractContext.status?.completed;
  const completionDate = (contractContext.status as any)?.completionDate;
  const completionLocation = contractContext.completionLocation;

  // Only show for completed applications
  if (!isCompleted || !completionDate) {
    return null;
  }

  const formatLocation = () => {
    if (
      !completionLocation ||
      !completionLocation.region ||
      !completionLocation.country
    ) {
      return "Location Unknown";
    }
    
    // Format as "City, State/Province, Country" (all in full names)
    const city = completionLocation.city || '';
    const region = completionLocation.region || '';
    const country = completionLocation.country || '';
    
    // Filter out empty parts and join with commas
    const parts = [city, region, country].filter(part => part.trim() !== '');
    return parts.join(', ');
  };

  const formatDateTime = () => {
    try {
      const date = new Date(completionDate);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });
    } catch {
      return "Date Unknown";
    }
  };

  return (
    <div className="text-center mb-4">
      <div className="space-y-1">
        <div>
          <span
            className="text-sm font-medium opacity-30"
            style={{ color: "var(--color-on-surface)" }}
          >
            Driver completed the onboarding process at: {formatLocation()}
          </span>
        </div>

        <div>
          <span
            className="text-sm font-medium opacity-30"
            style={{ color: "var(--color-on-surface)" }}
          >
            Date & Time of application completion: {formatDateTime()}
          </span>
        </div>
      </div>
    </div>
  );
}
