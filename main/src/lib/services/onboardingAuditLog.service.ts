import "server-only";
import type { FilterQuery } from "mongoose";
import { Types, isValidObjectId } from "mongoose";
import connectDB from "@/lib/utils/connectDB";
import OnboardingAuditLog from "@/mongoose/models/OnboardingAuditLog";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { getCompanyById } from "@/constants/companies";
import type { IUser } from "@/types/user.types";
import {
  EOnboardingAuditActorType,
  EOnboardingAuditAction,
  type TOnboardingAuditActor,
  type TOnboardingAuditLogDTO,
  type TOnboardingAuditSnapshot,
} from "@/types/onboardingAuditLog.types";
import type {
  IApplicationFormDoc,
  IApplicationFormPage1,
} from "@/types/applicationForm.types";

export type RecordOnboardingAuditLogInput = {
  onboardingId: string;
  action: EOnboardingAuditAction;
  actor: TOnboardingAuditActor;
  message: string;
  metadata?: Record<string, unknown>;
  /** Merged over auto-resolved snapshot (e.g. last-known driver before hard delete). */
  snapshotOverride?: Partial<TOnboardingAuditSnapshot>;
};

export type AuditLogSearchParams = {
  /** Broad match: onboarding id substring, actor/driver/company fields, message. */
  q?: string;
  onboardingId?: string;
  actorName?: string;
  actorEmail?: string;
  driverName?: string;
  driverEmail?: string;
  /** Single action or comma-separated list of actions. */
  action?: string | string[];
  /** Single company id or comma-separated list of company ids. */
  companyId?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  /** Sort direction by createdAt. Default: "desc" (newest first). */
  sort?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeSerializeMetadata(
  metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  try {
    return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
  } catch {
    return { _serializationNote: "metadata could not be serialized" };
  }
}

export function actorFromAdminUser(user: IUser | null): TOnboardingAuditActor {
  if (!user) {
    return {
      type: EOnboardingAuditActorType.SYSTEM,
      name: "Unknown user",
      email: "unknown@drivedock",
    };
  }
  return {
    type: EOnboardingAuditActorType.ADMIN,
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

export function actorFromDriverPage1(
  page1: Pick<IApplicationFormPage1, "firstName" | "lastName" | "email">,
  trackerId: string,
): TOnboardingAuditActor {
  const first = String(page1.firstName ?? "").trim();
  const last = String(page1.lastName ?? "").trim();
  const name = [first, last].filter(Boolean).join(" ") || "Driver";
  const email = String(page1.email ?? "").trim() || "unknown@driver.local";
  return {
    type: EOnboardingAuditActorType.DRIVER,
    id: trackerId,
    name,
    email,
  };
}

export async function buildDriverActorForTracker(
  trackerId: string,
): Promise<TOnboardingAuditActor> {
  if (!isValidObjectId(trackerId)) {
    return {
      type: EOnboardingAuditActorType.DRIVER,
      id: trackerId,
      name: "Driver",
      email: "unknown@driver.local",
    };
  }
  await connectDB();
  const tracker = await OnboardingTracker.findById(trackerId).lean();
  const appFormId = tracker?.forms?.driverApplication;
  if (!appFormId) {
    return {
      type: EOnboardingAuditActorType.DRIVER,
      id: trackerId,
      name: "Driver",
      email: "unknown@driver.local",
    };
  }
  const app = await ApplicationForm.findById(
    appFormId,
  ).lean<IApplicationFormDoc | null>();
  const page1 = app?.page1 as IApplicationFormPage1 | undefined;
  if (!page1) {
    return {
      type: EOnboardingAuditActorType.DRIVER,
      id: trackerId,
      name: "Driver",
      email: "unknown@driver.local",
    };
  }
  return actorFromDriverPage1(page1, trackerId);
}

export function actorSystem(
  name = "System",
  email = "system@drivedock",
): TOnboardingAuditActor {
  return { type: EOnboardingAuditActorType.SYSTEM, name, email };
}

/**
 * Resolve driver + company labels from the tracker while it still exists.
 * Used to denormalize onto audit rows so global search works after onboarding deletion.
 */
export async function loadOnboardingAuditSnapshot(
  onboardingId: string,
): Promise<TOnboardingAuditSnapshot> {
  if (!isValidObjectId(onboardingId)) return {};
  await connectDB();
  const tracker = await OnboardingTracker.findById(onboardingId).lean();
  if (!tracker) return {};

  const out: TOnboardingAuditSnapshot = {};
  const cid = tracker.companyId ? String(tracker.companyId).trim() : "";
  if (cid) {
    out.companyId = cid;
    const co = getCompanyById(cid);
    out.companyName = co?.name ?? cid;
  }

  const appFormId = tracker.forms?.driverApplication;
  if (appFormId) {
    const app = await ApplicationForm.findById(appFormId)
      .select("page1.firstName page1.lastName page1.email")
      .lean<{
        page1?: { firstName?: string; lastName?: string; email?: string };
      } | null>();
    const p1 = app?.page1;
    if (p1) {
      const fn = String(p1.firstName ?? "").trim();
      const ln = String(p1.lastName ?? "").trim();
      const name = [fn, ln].filter(Boolean).join(" ");
      if (name) out.driverName = name;
      const em = String(p1.email ?? "").trim();
      if (em) out.driverEmail = em;
    }
  }
  return out;
}

function mergeSnapshots(
  base: TOnboardingAuditSnapshot,
  override?: Partial<TOnboardingAuditSnapshot>,
): TOnboardingAuditSnapshot {
  if (!override) return { ...base };
  return { ...base, ...override };
}

function trimOrUndefined(s: string | undefined): string | undefined {
  const t = (s ?? "").trim();
  return t.length ? t : undefined;
}

/**
 * Normalize a query value that may arrive as a single CSV string, an array of
 * strings, or undefined. Returns a deduped, trimmed list of non-empty values.
 */
function collectMulti(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  const out = new Set<string>();
  for (const entry of arr) {
    if (typeof entry !== "string") continue;
    for (const part of entry.split(",")) {
      const t = part.trim();
      if (t.length) out.add(t);
    }
  }
  return Array.from(out);
}

export function mapLeanToAuditLogDTO(
  r: Record<string, unknown>,
): TOnboardingAuditLogDTO {
  return {
    id: String(r._id),
    onboardingId: String(r.onboardingId),
    action: r.action as EOnboardingAuditAction,
    actor: r.actor as TOnboardingAuditActor,
    message: String(r.message ?? ""),
    metadata: r.metadata as Record<string, unknown> | undefined,
    driverName: trimOrUndefined(r.driverName as string | undefined),
    driverEmail: trimOrUndefined(r.driverEmail as string | undefined),
    companyId: trimOrUndefined(r.companyId as string | undefined),
    companyName: trimOrUndefined(r.companyName as string | undefined),
    createdAt: new Date(r.createdAt as Date).toISOString(),
  };
}

/**
 * Persists one audit row. Swallows errors so API handlers are not broken by logging failures.
 * Snapshots driver/company from the tracker when possible; merges snapshotOverride on top.
 */
export async function recordOnboardingAuditLogSafe(
  input: RecordOnboardingAuditLogInput,
): Promise<void> {
  try {
    if (!isValidObjectId(input.onboardingId)) return;
    await connectDB();
    const resolved = mergeSnapshots(
      await loadOnboardingAuditSnapshot(input.onboardingId),
      input.snapshotOverride,
    );

    await OnboardingAuditLog.create({
      onboardingId: new Types.ObjectId(input.onboardingId),
      action: input.action,
      actor: input.actor,
      message: input.message,
      metadata: safeSerializeMetadata(input.metadata),
      driverName: resolved.driverName,
      driverEmail: resolved.driverEmail,
      companyId: resolved.companyId,
      companyName: resolved.companyName,
      createdAt: new Date(),
    });
  } catch (e) {
    console.error("[OnboardingAuditLog] failed to record", e);
  }
}

export type ListOnboardingAuditLogsResult = {
  items: TOnboardingAuditLogDTO[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export async function listOnboardingAuditLogs(
  onboardingId: string,
  page: number,
  pageSize: number,
): Promise<ListOnboardingAuditLogsResult> {
  await connectDB();
  if (!isValidObjectId(onboardingId)) {
    return { items: [], page: 1, pageSize, totalCount: 0, totalPages: 0 };
  }
  const oid = new Types.ObjectId(onboardingId);
  const filter = { onboardingId: oid };
  const totalCount = await OnboardingAuditLog.countDocuments(filter);
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const rows = await OnboardingAuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  // Contract-scoped listing is only reached after the route handler verified
  // the tracker exists, so every row here belongs to a live onboarding.
  const items: TOnboardingAuditLogDTO[] = rows.map((r) => {
    const dto = mapLeanToAuditLogDTO(r as unknown as Record<string, unknown>);
    dto.onboardingExists = true;
    return dto;
  });

  return { items, page, pageSize, totalCount, totalPages };
}

function parsePositiveInt(v: number | undefined, fallback: number): number {
  if (v === undefined || !Number.isFinite(v) || v < 1) return fallback;
  return Math.floor(v);
}

function startOfDayUtc(isoDate: string): Date | null {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDayUtc(isoDate: string): Date | null {
  const d = new Date(`${isoDate}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildBroadClauses(q: string): FilterQuery<unknown>[] {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const rx = new RegExp(escapeRegex(trimmed), "i");
  const clauses: FilterQuery<unknown>[] = [
    { "actor.name": rx },
    { "actor.email": rx },
    { driverName: rx },
    { driverEmail: rx },
    { companyName: rx },
    { companyId: rx },
    { message: rx },
  ];
  if (isValidObjectId(trimmed)) {
    clauses.unshift({ onboardingId: new Types.ObjectId(trimmed) });
  } else {
    clauses.push({
      $expr: {
        $regexMatch: {
          input: { $toString: "$onboardingId" },
          regex: escapeRegex(trimmed),
          options: "i",
        },
      },
    });
  }
  return clauses;
}

/**
 * Global admin search across all audit logs (includes onboardings that were permanently deleted).
 */
export async function searchOnboardingAuditLogs(
  params: AuditLogSearchParams,
): Promise<ListOnboardingAuditLogsResult> {
  await connectDB();
  const pageSize = Math.min(
    100,
    Math.max(1, parsePositiveInt(params.pageSize, 25)),
  );
  const page = parsePositiveInt(params.page, 1);

  const and: FilterQuery<unknown>[] = [];

  const q = trimOrUndefined(params.q);
  if (q) {
    and.push({ $or: buildBroadClauses(q) });
  }

  const oidExact = trimOrUndefined(params.onboardingId);
  if (oidExact) {
    if (isValidObjectId(oidExact)) {
      and.push({ onboardingId: new Types.ObjectId(oidExact) });
    } else {
      and.push({
        $expr: {
          $regexMatch: {
            input: { $toString: "$onboardingId" },
            regex: escapeRegex(oidExact),
            options: "i",
          },
        },
      });
    }
  }

  const actorName = trimOrUndefined(params.actorName);
  if (actorName) {
    and.push({
      "actor.name": new RegExp(escapeRegex(actorName), "i"),
    });
  }
  const actorEmail = trimOrUndefined(params.actorEmail);
  if (actorEmail) {
    and.push({
      "actor.email": new RegExp(escapeRegex(actorEmail), "i"),
    });
  }
  const driverName = trimOrUndefined(params.driverName);
  if (driverName) {
    and.push({ driverName: new RegExp(escapeRegex(driverName), "i") });
  }
  const driverEmail = trimOrUndefined(params.driverEmail);
  if (driverEmail) {
    and.push({
      driverEmail: new RegExp(escapeRegex(driverEmail), "i"),
    });
  }

  const actionValues = collectMulti(params.action).filter((v) =>
    Object.values(EOnboardingAuditAction).includes(v as EOnboardingAuditAction),
  );
  if (actionValues.length === 1) {
    and.push({ action: actionValues[0] });
  } else if (actionValues.length > 1) {
    and.push({ action: { $in: actionValues } });
  }

  const companyValues = collectMulti(params.companyId);
  if (companyValues.length === 1) {
    and.push({ companyId: companyValues[0] });
  } else if (companyValues.length > 1) {
    and.push({ companyId: { $in: companyValues } });
  }

  const from = trimOrUndefined(params.dateFrom);
  const to = trimOrUndefined(params.dateTo);
  const range: { $gte?: Date; $lte?: Date } = {};
  if (from) {
    const d = startOfDayUtc(from);
    if (d) range.$gte = d;
  }
  if (to) {
    const d = endOfDayUtc(to);
    if (d) range.$lte = d;
  }
  if (range.$gte || range.$lte) {
    and.push({ createdAt: range });
  }

  const filter: FilterQuery<unknown> = and.length ? { $and: and } : {};

  const sortDir: 1 | -1 = params.sort === "asc" ? 1 : -1;

  const totalCount = await OnboardingAuditLog.countDocuments(filter);
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const rows = await OnboardingAuditLog.find(filter)
    .sort({ createdAt: sortDir })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  // Resolve which onboardings on this page still exist so the UI can avoid
  // linking to detail pages for permanently-deleted records.
  const distinctOnboardingIds = Array.from(
    new Set(
      rows
        .map((r) => (r as { onboardingId?: unknown }).onboardingId)
        .filter((v): v is Types.ObjectId => v instanceof Types.ObjectId),
    ),
  );
  const existsSet = new Set<string>();
  if (distinctOnboardingIds.length > 0) {
    const existing = await OnboardingTracker.find(
      { _id: { $in: distinctOnboardingIds } },
      { _id: 1 },
    ).lean<Array<{ _id: Types.ObjectId }>>();
    for (const e of existing) existsSet.add(String(e._id));
  }

  const items = rows.map((r) => {
    const dto = mapLeanToAuditLogDTO(r as unknown as Record<string, unknown>);
    dto.onboardingExists = existsSet.has(dto.onboardingId);
    return dto;
  });

  return { items, page, pageSize, totalCount, totalPages };
}
