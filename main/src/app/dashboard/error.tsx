"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // log once so we have stack/digest in dev tools
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-4">
      <div className="mb-2 text-lg font-semibold">Something went wrong.</div>
      <pre className="mb-3 whitespace-pre-wrap text-sm text-red-700 dark:text-red-300">
        {error.message}
      </pre>

      <div className="flex gap-2">
        <button
          onClick={() => reset()}
          className="rounded border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Try again
        </button>
        <a
          href="/dashboard/home"
          className="rounded border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Go to Home
        </a>
      </div>
    </div>
  );
}
