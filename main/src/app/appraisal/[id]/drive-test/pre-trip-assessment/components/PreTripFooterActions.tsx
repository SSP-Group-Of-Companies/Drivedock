"use client";

import clsx from "clsx";

type Props = {
  // Which buttons to show
  showFinish?: boolean;
  showClear?: boolean;
  showGoToOnRoad?: boolean;

  // Behaviors
  isSubmitting?: boolean;
  onClear?: () => void;
  onGoToOnRoad: () => void;
};

export default function PreTripFooterActions({ showFinish = false, showClear = false, showGoToOnRoad = false, isSubmitting = false, onClear, onGoToOnRoad }: Props) {
  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      {/* Clear (left) — only if shown */}
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

      {/* Finish Test — only if shown */}
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

      {/* Go to On Road — only if shown */}
      {showGoToOnRoad && (
        <button
          type="button"
          onClick={onGoToOnRoad}
          className="px-8 py-2 rounded-full font-semibold transition-all shadow-md flex items-center gap-2 active:translate-y-[1px] active:shadow
                     bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"
        >
          Go to On Road
        </button>
      )}
    </div>
  );
}
