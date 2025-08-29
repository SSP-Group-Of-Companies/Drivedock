"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { useAuth } from "@/app/providers/authProvider";

type Props = {
  /** Entire notes field coming from server (newline-separated lines) */
  notes: string;
  /** Persist full notes back as newline-separated lines */
  onSave: (notes: string) => Promise<any> | any;
};

type NoteItem = {
  id: string;
  text: string;
  author?: string;
  createdAt?: string; // ISO
  editing?: boolean;
};

/* ---------- Parse/Serialize as JSON-per-line (backward compatible) ---------- */

function parseNotes(src: string | undefined | null): NoteItem[] {
  const lines = (src ?? "").split(/\r?\n/).filter((s) => s.trim().length > 0);
  const out: NoteItem[] = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj.text === "string") {
        out.push({
          id:
            obj.id ||
            crypto.randomUUID?.() ||
            String(Date.now() + Math.random()),
          text: obj.text,
          author: typeof obj.author === "string" ? obj.author : undefined,
          createdAt:
            typeof obj.createdAt === "string" ? obj.createdAt : undefined,
        });
        continue;
      }
    } catch {
      // fall through to treat as plain text line
    }
    out.push({
      id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
      text: line.trim(),
    });
  }
  return out;
}

function serializeNotes(items: NoteItem[]): string {
  return items
    .map((n) =>
      JSON.stringify({
        id: n.id,
        text: n.text.trim(),
        author: n.author,
        createdAt: n.createdAt,
      })
    )
    .join("\n");
}

/* -------------------------------- Component ------------------------------- */

export default function NotesCard({ notes, onSave }: Props) {
  const user = useAuth();
  const [items, setItems] = useState<NoteItem[]>(() => parseNotes(notes));
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const debRef = useRef<number | null>(null);

  // Sync from server if we don't have local unsaved edits
  useEffect(() => {
    if (!dirty) setItems(parseNotes(notes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const saveDebounced = (nextItems: NoteItem[]) => {
    if (debRef.current) window.clearTimeout(debRef.current);
    setDirty(true);
    debRef.current = window.setTimeout(async () => {
      setBusy(true);
      try {
        await onSave(serializeNotes(nextItems));
        setDirty(false);
      } finally {
        setBusy(false);
      }
    }, 500);
  };

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    const author = user?.name || "Admin";
    const item: NoteItem = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      text,
      author,
      createdAt: new Date().toISOString(),
    };
    const next = [...items, item];
    setItems(next);
    setDraft("");
    saveDebounced(next);
  };

  const deleteNote = (id: string) => {
    const next = items.filter((n) => n.id !== id);
    setItems(next);
    saveDebounced(next);
  };

  const startEdit = (id: string) =>
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, editing: true } : n))
    );

  const cancelEdit = (id: string) =>
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, editing: false } : n))
    );

  const commitEdit = (id: string, text: string) => {
    const trimmed = text.trim();
    let next: NoteItem[];
    if (!trimmed) {
      next = items.filter((n) => n.id !== id);
    } else {
      next = items.map((n) =>
        n.id === id ? { ...n, text: trimmed, editing: false } : n
      );
    }
    setItems(next);
    saveDebounced(next);
  };

  const hasNotes = useMemo(() => items.length > 0, [items.length]);

  return (
    <section
      className="rounded-xl border p-4 flex flex-col max-h-[20rem]"
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-outline)",
      }}
    >
      <header className="mb-3 flex items-center justify-between flex-shrink-0">
        <h2 className="text-base font-semibold">Notes</h2>
        <span className="text-xs opacity-70" role="status" aria-live="polite">
          {busy ? "Saving…" : " "}
        </span>
      </header>

      {/* Add new note */}
      <div className="mb-3 flex gap-2 flex-shrink-0">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addNote();
          }}
          placeholder="Add a note and press Enter…"
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-outline)",
          }}
        />
        <button
          type="button"
          onClick={addNote}
          className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
          disabled={!draft.trim()}
          style={{ background: "var(--color-primary)", color: "white" }}
        >
          Add
        </button>
      </div>

      {/* Notes list (scrollable content area) */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {!hasNotes && (
          <div
            className="rounded-lg border px-3 py-2 text-sm"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-outline-variant)",
              color: "var(--color-on-surface-variant)",
            }}
          >
            No notes yet — add the first one above.
          </div>
        )}

        {items.slice().reverse().map((n) => (
          <div
            key={n.id}
            className="group rounded-lg border px-3 py-2"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-outline-variant)",
            }}
            onDoubleClick={() => startEdit(n.id)}
          >
            {/* Text / editor */}
            {n.editing ? (
              <div className="flex items-start gap-2">
                <input
                  autoFocus
                  defaultValue={n.text}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitEdit(n.id, (e.target as HTMLInputElement).value);
                    } else if (e.key === "Escape") {
                      cancelEdit(n.id);
                    }
                  }}
                  onBlur={(e) => commitEdit(n.id, e.currentTarget.value)}
                  className="min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
                  style={{
                    background: "var(--color-card)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
                <button
                  type="button"
                  className="rounded-md p-1"
                  title="Cancel"
                  onClick={() => cancelEdit(n.id)}
                  aria-label="Cancel editing"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-md p-1"
                  title="Save"
                  onClick={(e) => {
                    const el = (
                      e.currentTarget.parentElement
                        ?.previousSibling as HTMLDivElement
                    )?.querySelector("input") as HTMLInputElement | null;
                    commitEdit(n.id, el?.value ?? n.text);
                  }}
                  aria-label="Save note"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-sm"
                    style={{ color: "var(--color-on-surface)" }}
                  >
                    {n.text}
                  </div>
                  <div
                    className="mt-0.5 text-[11px]"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    {n.author ? `by ${n.author}` : "by Admin"}{" "}
                    {n.createdAt
                      ? `• ${new Date(n.createdAt).toLocaleString()}`
                      : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    className="rounded-md p-1"
                    title="Edit"
                    onClick={() => startEdit(n.id)}
                    aria-label="Edit note"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1"
                    title="Delete"
                    onClick={() => deleteNote(n.id)}
                    aria-label="Delete note"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
