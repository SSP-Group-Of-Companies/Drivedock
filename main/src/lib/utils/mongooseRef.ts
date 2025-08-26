// src/lib/utils/mongooseRef.ts
import { Types } from "mongoose";
import type { ObjectId as MongoObjectId } from "mongodb";

/** Runtime guards for both Mongoose and MongoDB ObjectId implementations */
function isMongooseObjectId(v: unknown): v is Types.ObjectId {
  return v instanceof Types.ObjectId;
}
function isMongoDriverObjectId(v: unknown): v is MongoObjectId {
  return (
    !!v &&
    typeof v === "object" &&
    ((v as any).constructor?.name === "ObjectId" || // common
      (v as any)._bsontype === "ObjectID") // legacy
  );
}

/**
 * Read a field from a maybe-populated Mongoose reference.
 *
 * - If populated doc → return the doc (typed as TDoc).
 * - If ObjectId or null/undefined → return null.
 * - Never performs a DB fetch.
 *
 * Accepts `unknown` to avoid TS mismatches between different ObjectId types.
 */
export function readMongooseRefField<TDoc extends object>(ref: unknown): TDoc | null {
  if (!ref) return null;

  // If it's any kind of ObjectId, it's not populated
  if (isMongooseObjectId(ref) || isMongoDriverObjectId(ref)) return null;

  // Otherwise assume it's the populated document
  if (typeof ref === "object") return ref as TDoc;

  return null;
}
