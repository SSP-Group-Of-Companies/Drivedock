"use client";

import clsx from "clsx";

type Props = {
  showFinish?: boolean;
  showClear?: boolean;
  showBackToPreTrip?: boolean;

  isSubmitting?: boolean;
  onClear?: () => void;
  onBackToPreTrip: () => void;
};

export default function OnRoadFooterActions({ showFinish = false, showClear = false, showBackToPreTrip = false, isSubmitting = false, onClear, onBackToPreTrip }: Props) {
  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          disabled={isSubmitting}
          className={clsx(
            "px-6 py-2 rounded-full font-semibold transition-all shadow-md flex items-center gap-2 active:translate-y-[1px] active:shadow",
            isSubmitting ? "bg-gray-200 text-gray-600 cursor-not-allowed" : "bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50"
          )}
        >
          Clear
        </button>
      )}

      {showFinish && (
        <button
          type="submit"
          disabled={isSubmitting}
          className={clsx(
            "px-8 py-2 rounded-full font-semibold transition-all shadow-md flex items-center gap-2 active:translate-y-[1px] active:shadow",
            isSubmitting ? "bg-gray-400 text-white cursor-not-allowed" : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"
          )}
        >
          {isSubmitting ? "Submitting..." : "Finish Test"}
        </button>
      )}

      {showBackToPreTrip && (
        <button
          type="button"
          onClick={onBackToPreTrip}
          className="px-8 py-2 rounded-full font-semibold transition-all shadow-md flex items-center gap-2 active:translate-y-[1px] active:shadow
                     bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"
        >
          Back to Pre-Trip
        </button>
      )}
    </div>
  );
}
