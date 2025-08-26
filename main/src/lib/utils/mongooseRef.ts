// src/lib/utils/mongooseRef.ts
import { Types } from "mongoose";

/** A union for a reference that might be an ObjectId, a populated doc, or nullish. */
export type MaybeMongooseRef<TDoc> = Types.ObjectId | TDoc | null | undefined;

/**
 * Read a field from a maybe-populated Mongoose reference.
 *
 * - If populated doc → run `pick` and return its value.
 * - If ObjectId or null/undefined → return `fallback`.
 * - Never performs a DB fetch.
 */
export function readMongooseRefField<TDoc extends object, TValue>(ref: MaybeMongooseRef<TDoc>, pick: (doc: TDoc) => TValue, fallback?: TValue): TValue | undefined {
  if (!ref) return fallback;

  if (typeof ref === "object" && !(ref instanceof Types.ObjectId)) {
    try {
      return pick(ref as TDoc);
    } catch {
      return fallback;
    }
  }

  // Not populated (still ObjectId) → skip, return fallback
  return fallback;
}
