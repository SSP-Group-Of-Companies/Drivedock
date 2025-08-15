import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import mongoose from "mongoose";
import ApplicationForm from "@/mongoose/models/ApplicationForms";

// -------------------------
// Helper
// -------------------------
const { Types } = mongoose;

function toBool(v: string | null): boolean | undefined {
  if (v == null) return undefined;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

function toNumber(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toDate(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function toArray(v: string | null): string[] | undefined {
  if (!v) return undefined;
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isValidObjectId(id: string): boolean {
  // Using mongoose's validation covers both 24-hex and ObjectId construction edge cases
  return Types.ObjectId.isValid(id);
}

function toObjectIdArray(ids: string[] | undefined): mongoose.Types.ObjectId[] | undefined {
  if (!ids || !ids.length) return undefined;
  const filtered = ids.filter(isValidObjectId);
  return filtered.map((s) => new Types.ObjectId(s));
}

function buildSort(sortParam: string | null): Record<string, 1 | -1> {
  if (!sortParam) return { createdAt: -1 };
  // e.g. "createdAt:-1,updatedAt:1,status.currentStep:-1"
  const sort: Record<string, 1 | -1> = {};
  sortParam.split(",").forEach((entry) => {
    const [field, dirRaw] = entry.split(":").map((x) => x.trim());
    if (!field) return;
    const dir = dirRaw === "-1" || dirRaw?.toLowerCase() === "desc" ? -1 : 1;
    sort[field] = dir;
  });
  return Object.keys(sort).length ? sort : { createdAt: -1 };
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * For population, allow:
 *   populate=driverApplication,preQualification,policiesConsents
 *   populateSelect[driverApplication]=page1,licenses
 *   populateSelect[preQualification]=field1,field2
 *   populateSelect[policiesConsents]=signatureUrl,consents
 */
function buildPopulateOptions(searchParams: URLSearchParams) {
  const populateRaw = toArray(searchParams.get("populate")); // list of form refs
  if (!populateRaw?.length) return [];

  type Pop = {
    path: string;
    select?: string;
  };

  const map: Record<string, string> = {
    driverApplication: "forms.driverApplication",
    preQualification: "forms.preQualification",
    policiesConsents: "forms.policiesConsents",
  };

  const pops: Pop[] = [];

  for (const token of populateRaw) {
    const path = map[token];
    if (!path) continue;

    // populateSelect[driverApplication]=page1,licenses
    const selectKey = `populateSelect[${token}]`;
    const selectList = toArray(searchParams.get(selectKey));
    pops.push({
      path,
      select: selectList?.join(" "),
    });
  }

  return pops;
}

/**
 * Build a flexible filter object for Mongoose `find`.
 * Accepts both exact values and arrays, plus date ranges.
 *
 * Supported keys (examples):
 * - ids=... (comma list of _id)
 * - sinHash=... (exact) or sinHashRegex=... (regex)
 * - companyId=CANADA_SSP (exact or list: companyId=ID1,ID2)
 * - applicationType=..., status.currentStep=..., status.completedStep=...
 * - forms.preQualification=..., forms.driverApplication=..., forms.policiesConsents=...
 * - createdAtFrom=ISO, createdAtTo=ISO
 * - updatedAtFrom=ISO, updatedAtTo=ISO
 * - resumeExpiresFrom=ISO, resumeExpiresTo=ISO
 * - isExpired=true|false (shortcut using resumeExpiresAt vs now)
 * - q (generic text: will try sinHash AND name search if provided)
 *
 * Plus: driverName=... OR driverFirst=... & driverLast=...
 */
async function buildFilter(searchParams: URLSearchParams) {
  const filter: Record<string, any> = {};

  // Generic ID filter
  const ids = toArray(searchParams.get("ids"));
  const idsObj = toObjectIdArray(ids);
  if (ids && !ids.length) {
    // no ids provided -> nothing
  } else if (ids && ids.length && (!idsObj || idsObj.length === 0)) {
    // only invalid ids were provided -> ensure no match
    filter._id = { $in: [] };
  } else if (idsObj && idsObj.length) {
    filter._id = { $in: idsObj };
  }

  // SIN hash filters
  const sinHash = searchParams.get("sinHash");
  if (sinHash) {
    filter.sinHash = sinHash.trim();
  }
  const sinHashRegex = searchParams.get("sinHashRegex");
  if (sinHashRegex) {
    filter.sinHash = { $regex: escapeRegex(sinHashRegex.trim()), $options: "i" };
  }

  // Company / type
  const companyIds = toArray(searchParams.get("companyId"));
  if (companyIds?.length) {
    filter.companyId = { $in: companyIds };
  }
  const applicationTypes = toArray(searchParams.get("applicationType"));
  if (applicationTypes?.length) {
    filter.applicationType = { $in: applicationTypes };
  }

  // Status fields
  const currentStep = searchParams.get("status.currentStep");
  if (currentStep) filter["status.currentStep"] = currentStep;
  const completedStep = searchParams.get("status.completedStep");
  if (completedStep) filter["status.completedStep"] = completedStep;
  const statusState = searchParams.get("status.state");
  if (statusState) filter["status.state"] = statusState;

  // Forms by ObjectId (sanitize!)
  const preQ = toArray(searchParams.get("forms.preQualification"));
  const preQObj = toObjectIdArray(preQ);
  if (preQ && preQ.length && (!preQObj || preQObj.length === 0)) {
    filter["forms.preQualification"] = { $in: [] };
  } else if (preQObj && preQObj.length) {
    filter["forms.preQualification"] = { $in: preQObj };
  }

  const driverApp = toArray(searchParams.get("forms.driverApplication"));
  const driverAppObj = toObjectIdArray(driverApp);
  if (driverApp && driverApp.length && (!driverAppObj || driverAppObj.length === 0)) {
    filter["forms.driverApplication"] = { $in: [] };
  } else if (driverAppObj && driverAppObj.length) {
    filter["forms.driverApplication"] = { $in: driverAppObj };
  }

  const polCon = toArray(searchParams.get("forms.policiesConsents"));
  const polConObj = toObjectIdArray(polCon);
  if (polCon && polCon.length && (!polConObj || polConObj.length === 0)) {
    filter["forms.policiesConsents"] = { $in: [] };
  } else if (polConObj && polConObj.length) {
    filter["forms.policiesConsents"] = { $in: polConObj };
  }

  // Date ranges
  const createdAtFrom = toDate(searchParams.get("createdAtFrom"));
  const createdAtTo = toDate(searchParams.get("createdAtTo"));
  if (createdAtFrom || createdAtTo) {
    filter.createdAt = {};
    if (createdAtFrom) filter.createdAt.$gte = createdAtFrom;
    if (createdAtTo) filter.createdAt.$lte = createdAtTo;
  }

  const updatedAtFrom = toDate(searchParams.get("updatedAtFrom"));
  const updatedAtTo = toDate(searchParams.get("updatedAtTo"));
  if (updatedAtFrom || updatedAtTo) {
    filter.updatedAt = {};
    if (updatedAtFrom) filter.updatedAt.$gte = updatedAtFrom;
    if (updatedAtTo) filter.updatedAt.$lte = updatedAtTo;
  }

  const resumeFrom = toDate(searchParams.get("resumeExpiresFrom"));
  const resumeTo = toDate(searchParams.get("resumeExpiresTo"));
  if (resumeFrom || resumeTo) {
    filter.resumeExpiresAt = {};
    if (resumeFrom) filter.resumeExpiresAt.$gte = resumeFrom;
    if (resumeTo) filter.resumeExpiresAt.$lte = resumeTo;
  }

  // isExpired shortcut (based on resumeExpiresAt)
  const isExpired = toBool(searchParams.get("isExpired"));
  if (typeof isExpired === "boolean") {
    const now = new Date();
    filter.resumeExpiresAt = filter.resumeExpiresAt || {};
    if (isExpired) {
      filter.resumeExpiresAt.$lt = now;
    } else {
      filter.resumeExpiresAt.$gte = now;
    }
  }

  // Generic q: try sinHash regex
  const q = searchParams.get("q");
  if (q && !filter.sinHash) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = (filter.$or || []).concat([{ sinHash: rx }]);
  }

  // Driver name search (firstname/lastname) OR driverName param
  const driverName = searchParams.get("driverName") || undefined;
  const driverFirst = searchParams.get("driverFirst") || undefined;
  const driverLast = searchParams.get("driverLast") || undefined;

  let mustSearchName = false;
  const nameOrs: any[] = [];
  if (driverName) {
    mustSearchName = true;
    const rx = new RegExp(escapeRegex(driverName.trim()), "i");
    nameOrs.push({ "page1.firstName": rx }, { "page1.lastName": rx }, { "page1.fullName": rx });
  } else {
    if (driverFirst) {
      mustSearchName = true;
      nameOrs.push({ "page1.firstName": new RegExp(escapeRegex(driverFirst.trim()), "i") });
    }
    if (driverLast) {
      mustSearchName = true;
      nameOrs.push({ "page1.lastName": new RegExp(escapeRegex(driverLast.trim()), "i") });
    }
  }

  if (mustSearchName) {
    const appIds = await ApplicationForm.find({ $or: nameOrs }, { _id: 1 }).lean();

    const idList = appIds.map((d: any) => d._id as mongoose.Types.ObjectId);

    // If user also passed forms.driverApplication filter, intersect them
    if (filter["forms.driverApplication"]?.$in) {
      const existing: mongoose.Types.ObjectId[] = filter["forms.driverApplication"].$in;
      const set = new Set(existing.map(String));
      const intersect = idList.filter((x) => set.has(String(x)));
      filter["forms.driverApplication"] = { $in: intersect }; // if empty -> matches nothing
      if (intersect.length === 0) {
        // Explicitly force no matches without causing cast errors
        filter["forms.driverApplication"] = { $in: [] };
      }
    } else {
      // No prior filter; constrain by name result
      filter["forms.driverApplication"] = { $in: idList };
      if (idList.length === 0) {
        filter["forms.driverApplication"] = { $in: [] };
      }
    }
  }

  return filter;
}

// -------------------------
// GET handler
// -------------------------
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    // Pagination
    const page = Math.max(1, toNumber(searchParams.get("page")) ?? 1);
    const limit = Math.max(1, Math.min(200, toNumber(searchParams.get("limit")) ?? 20));
    const skip = (page - 1) * limit;

    // Fields projection
    // e.g. select="_id,companyId,status.currentStep,createdAt"
    const selectList = toArray(searchParams.get("select"));
    const select = selectList?.length ? selectList.join(" ") : undefined;

    // Sorting
    const sort = buildSort(searchParams.get("sort"));

    // Populate
    const populateOptions = buildPopulateOptions(searchParams);

    // Count only?
    const countOnly = toBool(searchParams.get("countOnly")) === true;

    // Build filter (includes optional driver name expansion)
    const filter = await buildFilter(searchParams);

    // Count first (so sort/skip/limit isn't applied to counting)
    const totalPromise = OnboardingTracker.countDocuments(filter);

    if (countOnly) {
      const total = await totalPromise;
      return successResponse(200, "Onboarding trackers count", {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        filterUsed: filter,
      });
    }

    // Query chain (no reassign -> avoids TS generic mismatch)
    const q = OnboardingTracker.find(filter).sort(sort).skip(skip).limit(limit).lean();

    if (select) q.select(select);
    if (populateOptions.length) q.populate(populateOptions as any);

    const [items, total] = await Promise.all([q.exec(), totalPromise]);

    return successResponse(200, "Onboarding documents fetched", {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      sort,
      count: items.length,
      items,
    });
  } catch (err: any) {
    return errorResponse(500, "Failed to fetch onboarding trackers", { error: err?.message ?? String(err) });
  }
}
