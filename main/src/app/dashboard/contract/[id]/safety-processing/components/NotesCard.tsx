"use client";

import { useEffect, useRef, useState } from "react";

type Props = { notes: string; onSave: (notes: string) => void };

export default function NotesCard({ notes, onSave }: Props) {
  const [val, setVal] = useState(notes ?? "");
  const [busy, setBusy] = useState(false);
  const tRef = useRef<number | null>(null);

  useEffect(() => setVal(notes ?? ""), [notes]);

  function enqueueSave(next: string) {
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(async () => {
      setBusy(true);
      try {
        await onSave(next);
      } finally {
        setBusy(false);
      }
    }, 700);
  }

  return (
    <section
      className="rounded-xl border p-4"
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-outline)",
      }}
    >
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Notes</h2>
        <span className="text-xs opacity-70">{busy ? "Saving…" : " "}</span>
      </header>

      <textarea
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          enqueueSave(e.target.value);
        }}
        className="min-h-[140px] w-full rounded-lg border p-2 text-sm"
        placeholder="Type notes for the safety team…"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-outline)",
        }}
      />
      <div className="mt-1 text-xs opacity-70">
        Notes are stored as a single string on the tracker.
      </div>
    </section>
  );
}
