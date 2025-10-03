// src/app/api/v1/admin/onboarding/invitations/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { guard } from "@/lib/utils/auth/authUtils";
import { DashboardInvitationItem } from "@/types/adminDashboard.types";

// ---------- helpers ----------
function toNumber(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function toArray(v: string | null): string[] | undefined {
  if (!v) return undefined;
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function digitsOnly(s: string) {
  return (s.match(/\d/g) || []).join("");
}

// ---------- sort parsing ----------
function buildSort(sortParam: string | null) {
  const fallback = { token: "updatedAt:desc" };
  if (!sortParam) return fallback;

  const token = sortParam.trim().toLowerCase();
  const allowed = new Set(["updatedat:asc", "updatedat:desc", "createdat:asc", "createdat:desc", "name:asc", "name:desc"]);
  if (!allowed.has(token)) return fallback;
  return { token };
}

// ---------- search -> appForm ids ----------
/**
 * Free-text search across:
 *  - Name: first/last + fuzzy "johndoe" → "john...doe"
 *  - Email: partial
 *  - Phone: partial AND digits-only partial for phoneCell/phoneHome
 * (No SIN matching.)
 */
async function findMatchingApplicationFormIds(q: string) {
  const raw = q.trim();
  if (!raw) return [];

  const tokens = raw.split(/[,\s]+/).filter(Boolean);

  // Fuzzy "squashed" name matching — "johndoe" should match "John   Doe"
  const squashed = raw.replace(/[^A-Za-z0-9]/g, "");
  const fuzzyBetween = "[^A-Za-z0-9]*";
  const fuzzyPattern = squashed
    .split("")
    .map((ch) => escapeRegex(ch))
    .join(fuzzyBetween);

  const rxWhole = new RegExp(escapeRegex(raw), "i");
  const emailRx = new RegExp(escapeRegex(raw), "i");
  const phoneRx = new RegExp(escapeRegex(raw), "i");

  // Digits-only matching for phones if query has ≥7 digits
  const queryDigits = digitsOnly(raw);
  const hasPhoneDigits = queryDigits.length >= 7;
  const digitsPattern = hasPhoneDigits ? escapeRegex(queryDigits) : null;

  const andPerToken =
    tokens.length > 0
      ? tokens.map((tok) => {
          const rx = new RegExp(escapeRegex(tok), "i");
          return {
            $or: [{ "page1.firstName": rx }, { "page1.lastName": rx }, { "page1.email": rx }, { "page1.phoneCell": rx }, { "page1.phoneHome": rx }],
          };
        })
      : [];

  const $or: any[] = [
    ...(andPerToken.length ? [{ $and: andPerToken }] : []),

    // Direct contains
    { "page1.firstName": rxWhole },
    { "page1.lastName": rxWhole },
    { "page1.email": emailRx },
    { "page1.phoneCell": phoneRx },
    { "page1.phoneHome": phoneRx },

    // Fuzzy "firstName+lastName"
    {
      $expr: {
        $regexMatch: {
          input: {
            $concat: [{ $ifNull: ["$page1.firstName", ""] }, { $ifNull: ["$page1.lastName", ""] }],
          },
          regex: fuzzyPattern,
          options: "i",
        },
      },
    },
  ];

  // Digits-only phone contains: strip non-digits from both fields before compare
  if (hasPhoneDigits) {
    // Use $replaceAll to remove non-digits (MongoDB 5+)
    const stripNonDigits = (field: string) => ({
      $replaceAll: {
        input: {
          $replaceAll: {
            input: {
              $replaceAll: {
                input: {
                  $replaceAll: {
                    input: { $ifNull: [field as any, ""] },
                    find: "-",
                    replacement: "",
                  },
                },
                find: " ",
                replacement: "",
              },
            },
            find: "(",
            replacement: "",
          },
        },
        find: ")",
        replacement: "",
      },
    });

    // Fallback generic strip using regex via multiple replaces (above handles common chars).
    // Then regexMatch on digits pattern.
    $or.push(
      {
        $expr: {
          $regexMatch: {
            input: stripNonDigits("$page1.phoneCell"),
            regex: digitsPattern!,
          },
        },
      },
      {
        $expr: {
          $regexMatch: {
            input: stripNonDigits("$page1.phoneHome"),
            regex: digitsPattern!,
          },
        },
      }
    );
  }

  const appFormQuery = { $or };
  const appIdsDocs = await ApplicationForm.find(appFormQuery as any, { _id: 1 }).lean();
  return appIdsDocs.map((d: any) => d._id);
}

// ===============================================================
// GET handler
// ===============================================================
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await guard();

    const { searchParams } = new URL(req.url);

    const appFormColl = ApplicationForm.collection.name;

    const page = Math.max(1, toNumber(searchParams.get("page")) ?? 1);
    const limit = Math.max(1, Math.min(200, toNumber(searchParams.get("limit")) ?? 20));
    const skip = (page - 1) * limit;

    // Only *pending approval* (false or missing), and NOT terminated (false or missing)
    const baseMatch: Record<string, any> = {
      $and: [{ $or: [{ invitationApproved: false }, { invitationApproved: { $exists: false } }] }, { $or: [{ terminated: false }, { terminated: { $exists: false } }] }],
    };

    // Optional filters: companyId, applicationType
    const companyIds = toArray(searchParams.get("companyId"));
    if (companyIds?.length) baseMatch["companyId"] = { $in: companyIds };

    const applicationTypes = toArray(searchParams.get("applicationType"));
    if (applicationTypes?.length) baseMatch["applicationType"] = { $in: applicationTypes };

    // Free-text search (name/email/phone only)
    const q = (searchParams.get("q") || searchParams.get("search") || "").trim();
    if (q) {
      const matchedAppIds = await findMatchingApplicationFormIds(q);
      baseMatch.$and!.push({
        $or: [
          { "forms.driverApplication": { $in: matchedAppIds } },
          {
            $expr: {
              $in: [
                {
                  $cond: [
                    { $eq: [{ $type: "$forms.driverApplication" }, "objectId"] },
                    "$forms.driverApplication",
                    {
                      $cond: [{ $eq: [{ $type: "$forms.driverApplication" }, "string"] }, { $toObjectId: "$forms.driverApplication" }, null],
                    },
                  ],
                },
                matchedAppIds,
              ],
            },
          },
        ],
      });
    }

    // Sorting
    const sortParsed = buildSort(searchParams.get("sort"));
    const sortStage =
      sortParsed.token === "name:asc"
        ? { $sort: { driverName: 1 } }
        : sortParsed.token === "name:desc"
        ? { $sort: { driverName: -1 } }
        : sortParsed.token === "createdat:asc"
        ? { $sort: { createdAt: 1 } }
        : sortParsed.token === "createdat:desc"
        ? { $sort: { createdAt: -1 } }
        : sortParsed.token === "updatedat:asc"
        ? { $sort: { updatedAt: 1 } }
        : { $sort: { updatedAt: -1 } }; // default

    // ---------------- pipeline ----------------
    const pipeline: any[] = [
      { $match: baseMatch },

      // Normalize forms.driverApplication → ObjectId (handles legacy strings)
      {
        $addFields: {
          driverApplicationId: {
            $cond: [
              { $eq: [{ $type: "$forms.driverApplication" }, "objectId"] },
              "$forms.driverApplication",
              {
                $cond: [{ $eq: [{ $type: "$forms.driverApplication" }, "string"] }, { $toObjectId: "$forms.driverApplication" }, null],
              },
            ],
          },
        },
      },

      // Lookup ApplicationForm (correct fields per Page1 schema)
      {
        $lookup: {
          from: appFormColl,
          localField: "driverApplicationId",
          foreignField: "_id",
          as: "driverApp",
          pipeline: [
            {
              $project: {
                _id: 1,
                firstName: { $ifNull: ["$page1.firstName", ""] },
                lastName: { $ifNull: ["$page1.lastName", ""] },
                email: "$page1.email",
                // Prefer cell, fallback to home
                phone: {
                  $ifNull: ["$page1.phoneCell", { $ifNull: ["$page1.phoneHome", null] }],
                },
              },
            },
          ],
        },
      },

      { $addFields: { driverAppObj: { $arrayElemAt: ["$driverApp", 0] } } },
      {
        $addFields: {
          driverName: {
            $let: {
              vars: {
                fn: { $ifNull: ["$driverAppObj.firstName", ""] },
                ln: { $ifNull: ["$driverAppObj.lastName", ""] },
              },
              in: { $trim: { input: { $concat: ["$$fn", " ", "$$ln"] } } },
            },
          },
          driverEmail: { $ifNull: ["$driverAppObj.email", null] },
          driverPhone: { $ifNull: ["$driverAppObj.phone", null] },
        },
      },

      sortStage,
      { $skip: skip },
      { $limit: limit },

      {
        $addFields: {
          itemSummary: {
            name: "$driverName",
            email: "$driverEmail",
            phone: "$driverPhone",
          },
        },
      },

      {
        $project: {
          _id: 1,
          companyId: 1,
          applicationType: 1,
          createdAt: 1,
          updatedAt: 1,
          invitationApproved: 1,
          terminated: 1,
          forms: 1,
          preApprovalCountryCode: 1,
          itemSummary: 1,
        },
      },
    ];

    const [rawItems, total] = await Promise.all([OnboardingTracker.aggregate(pipeline).collation({ locale: "en", strength: 2 }).allowDiskUse(true), OnboardingTracker.countDocuments(baseMatch)]);

    const items = rawItems as DashboardInvitationItem[];
    return successResponse(200, "Pending invitations fetched", {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      sort: sortParsed.token,
      count: rawItems.length,
      items,
    });
  } catch (err: any) {
    return errorResponse(err);
  }
}
