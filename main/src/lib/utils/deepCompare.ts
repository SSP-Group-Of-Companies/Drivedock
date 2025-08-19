/**
 * Deep comparison utilities for forms and arbitrary objects.
 *
 * Features:
 * - Normalizes values for stable comparison
 *   - Dates => timestamp tuple
 *   - File-like => comparable tuple
 *   - Removes undefined keys and (optionally) null/"" as undefined
 * - Deep equality check
 * - High-level helper: hasDeepChanges(current, baseline)
 */

export type FileLike = {
  name: string;
  size: number;
  type?: string;
  lastModified?: number;
};

export type NormalizeOptions = {
  /** Treat null like undefined (removed). Default: true */
  nullAsUndefined?: boolean;
  /** Treat empty string like undefined (removed). Default: true */
  emptyStringAsUndefined?: boolean;
};

const DEFAULT_NORMALIZE_OPTS: Required<NormalizeOptions> = {
  nullAsUndefined: true,
  emptyStringAsUndefined: true,
};

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Object.prototype.toString.call(v) === "[object Object]";
}

export function isDate(v: unknown): v is Date | string {
  return v instanceof Date || (typeof v === "string" && !isNaN(Date.parse(v)));
}

export function isFileLike(v: unknown): v is FileLike {
  return !!v && typeof v === "object" && "name" in (v as any) && "size" in (v as any);
}

/**
 * Normalize values for stable comparison:
 * - Convert Date-like values to ["__Date__", timestamp]
 * - Convert File-like to ["__File__", name, size, type, lastModified]
 * - Remove undefined keys
 * - Optionally treat null/"" as undefined (see options)
 */
export function normalizeForCompare<T>(input: T, options?: NormalizeOptions): any {
  const opts = { ...DEFAULT_NORMALIZE_OPTS, ...(options || {}) };
  const seen = new WeakMap<object, any>();

  const toUndefined = (val: unknown) => {
    if (val === undefined) return true;
    if (opts.nullAsUndefined && val === null) return true;
    if (opts.emptyStringAsUndefined && typeof val === "string" && val.trim() === "") return true;
    return false;
  };

  const walk = (val: any): any => {
    if (toUndefined(val)) return undefined;
    if (typeof val !== "object" || val === null) return Number.isNaN(val) ? "__NaN__" : val;

    // Dates
    if (isDate(val)) {
      const d = val instanceof Date ? val : new Date(val);
      return ["__Date__", d.getTime()];
    }

    // File-like (works in browser; safe on server)
    if (isFileLike(val)) {
      const f = val as FileLike;
      return ["__File__", f.name, f.size, f.type ?? "", f.lastModified ?? 0];
    }

    // Cycle handling
    if (seen.has(val)) return seen.get(val);

    if (Array.isArray(val)) {
      const out = val.map(walk).filter((x) => x !== undefined);
      seen.set(val, out);
      return out;
    }

    if (isPlainObject(val)) {
      const out: Record<string, any> = {};
      seen.set(val, out);
      for (const key of Object.keys(val).sort()) {
        const v = walk(val[key]);
        if (v !== undefined) out[key] = v;
      }
      return out;
    }

    // Fallback for Map/Set/etc.
    try {
      return JSON.parse(JSON.stringify(val));
    } catch {
      return String(val);
    }
  };

  return walk(input);
}

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  // NaN equality
  if (typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }

  if (typeof a !== "object" || typeof b !== "object" || a == null || b == null) {
    return false;
  }

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Objects
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

/**
 * Compare current vs baseline using normalization.
 * Returns true if they differ (i.e., changes exist).
 */
export function hasDeepChanges<T>(current: T, baseline?: Partial<T> | null, options?: NormalizeOptions): boolean {
  const normalizedCurrent = normalizeForCompare(current, options);
  const normalizedBaseline = normalizeForCompare(baseline ?? ({} as Partial<T>), options);
  return !deepEqual(normalizedCurrent, normalizedBaseline);
}
