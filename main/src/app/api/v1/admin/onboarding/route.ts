import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import CarriersEdgeTraining from "@/mongoose/models/CarriersEdgeTraining";
import DrugTest from "@/mongoose/models/DrugTest";
import { EStepPath } from "@/types/onboardingTracker.types";
import type { DashboardOnboardingItem } from "@/types/adminDashboard.types";
import { guard } from "@/lib/auth/authUtils";
import { getOnboardingStepFlow } from "@/lib/utils/onboardingUtils";

// ---------- helpers ----------
function toBool(v: string | null): boolean | undefined {
  if (v == null) return undefined;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}
function toNumber(v: string | null): number | undefined {
  if (!v) return undefined;
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
function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------- sort parsing ----------
function buildSort(sortParam: string | null) {
  if (!sortParam) return { spec: { updatedAt: -1 } };
  const token = sortParam.trim();

  if (["driverNameAsc", "driverNameDesc", "progress:asc", "progress:desc"].includes(token)) {
    return { token };
  }

  const spec: Record<string, 1 | -1> = {};
  for (const entry of token.split(",")) {
    const [field, dirRaw] = entry.split(":").map((x) => x.trim());
    if (!field) continue;
    const dir = dirRaw === "-1" || dirRaw?.toLowerCase() === "desc" ? -1 : 1;
    spec[field] = dir;
  }
  return Object.keys(spec).length ? { spec } : { spec: { updatedAt: -1 } };
}

// ---------- base filter ----------
async function buildBaseFilter(searchParams: URLSearchParams) {
  const filter: Record<string, any> = {};

  const companyIds = toArray(searchParams.get("companyId"));
  if (companyIds?.length) filter.companyId = { $in: companyIds };

  const applicationTypes = toArray(searchParams.get("applicationType"));
  if (applicationTypes?.length) filter.applicationType = { $in: applicationTypes };

  const completed = toBool(searchParams.get("completed"));
  if (typeof completed === "boolean") filter["status.completed"] = completed;

  // terminated=true  -> only true
  // terminated=false or absent -> false OR missing
  const terminated = toBool(searchParams.get("terminated"));
  if (terminated === true) {
    filter.terminated = true;
  } else {
    filter.$or = [{ terminated: false }, { terminated: { $exists: false } }];
  }

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

  // Robust name search:
  // Supports: "john", "doe", "john doe", "johndoe", "john, doe", and wild spacing.
  const driverNameInput = searchParams.get("driverName") || "";
  const driverNameRaw = driverNameInput.trim();

  if (driverNameRaw) {
    // 1) tokens from commas/whitespace
    const tokens = driverNameRaw.split(/[,\s]+/).filter(Boolean);

    // 2) a "squashed" query (strip non-alphanumerics)
    const squashedQuery = driverNameRaw.replace(/[^A-Za-z0-9]/g, "");
    // Build a regex string that allows any non-alphanumerics between characters:
    // "johndoe" -> "j[^A-Za-z0-9]*o[^A-Za-z0-9]*h...e"
    const fuzzyBetween = "[^A-Za-z0-9]*";
    const fuzzyPattern = squashedQuery
      .split("")
      .map((ch) => escapeRegex(ch))
      .join(fuzzyBetween);

    // JS regex for first/last direct matches (used in a normal .find query)
    const rxWhole = new RegExp(escapeRegex(driverNameRaw), "i");

    // Tokenized constraints (each token must appear in first OR last)
    const andPerToken =
      tokens.length > 0
        ? tokens.map((tok) => {
            const rx = new RegExp(escapeRegex(tok), "i");
            return {
              $or: [{ "page1.firstName": rx }, { "page1.lastName": rx }],
            };
          })
        : [];

    // Compose the ApplicationForm name query (no $regexReplace needed)
    const appFormNameQuery: any = {
      $or: [
        ...(andPerToken.length ? [{ $and: andPerToken }] : []),
        { "page1.firstName": rxWhole },
        { "page1.lastName": rxWhole },
        {
          // "johndoe" matches "john....doe" (any punctuation/spaces between chars)
          $expr: {
            $regexMatch: {
              input: {
                $concat: [{ $ifNull: ["$page1.firstName", ""] }, { $ifNull: ["$page1.lastName", ""] }],
              },
              regex: fuzzyPattern, // <- string pattern, not $regexReplace
              options: "i",
            },
          },
        },
      ],
    };

    const appIdsDocs = await ApplicationForm.find(appFormNameQuery, {
      _id: 1,
    }).lean();

    const objIds = appIdsDocs.map((d: any) => d._id);
    const strIds = objIds.map((id: any) => id.toString());

    // Constrain trackers by driverApplication (ObjectId or legacy string)
    const driverAppConstraint = {
      $or: [{ "forms.driverApplication": { $in: objIds } }, { "forms.driverApplication": { $in: strIds } }],
    };

    if (filter.$and) filter.$and.push(driverAppConstraint);
    else filter.$and = [driverAppConstraint];
  }

  return filter;
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
    const ceColl = CarriersEdgeTraining.collection.name;
    const dtColl = DrugTest.collection.name;

    const page = Math.max(1, toNumber(searchParams.get("page")) ?? 1);
    const limit = Math.max(1, Math.min(200, toNumber(searchParams.get("limit")) ?? 20));
    const skip = (page - 1) * limit;

    const sortParsed = buildSort(searchParams.get("sort") || "updatedAt:desc");
    const baseFilter = await buildBaseFilter(searchParams);

    const currentStep = (searchParams.get("currentStep") || searchParams.get("status.currentStep")) as EStepPath | undefined;

    const ceEmailSent = toBool(searchParams.get("carriersEdgeTrainingEmailSent"));
    const dtDocsUploaded = toBool(searchParams.get("drugTestDocumentsUploaded"));

    // ---------------- pipeline ----------------
    const matchBase: Record<string, any> = { ...baseFilter };
    const matchItems: Record<string, any> = { ...baseFilter };

    if (currentStep) matchItems["status.currentStep"] = currentStep;
    if (typeof ceEmailSent === "boolean" && !currentStep) {
      matchItems["status.currentStep"] = EStepPath.CARRIERS_EDGE_TRAINING;
    }
    if (typeof dtDocsUploaded === "boolean" && !currentStep) {
      matchItems["status.currentStep"] = EStepPath.DRUG_TEST;
    }

    const sortStage =
      (sortParsed as any).token === "driverNameAsc"
        ? { $sort: { driverName: 1 } }
        : (sortParsed as any).token === "driverNameDesc"
        ? { $sort: { driverName: -1 } }
        : (sortParsed as any).token === "progress:asc"
        ? { $sort: { progressStepIndex: 1 } }
        : (sortParsed as any).token === "progress:desc"
        ? { $sort: { progressStepIndex: -1 } }
        : { $sort: (sortParsed as any).spec };

    const pipeline: any[] = [
      { $match: matchItems },

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

      // --- lookups ---
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
                driverName: {
                  $let: {
                    vars: {
                      fn: { $ifNull: ["$page1.firstName", ""] },
                      ln: { $ifNull: ["$page1.lastName", ""] },
                    },
                    in: {
                      $trim: { input: { $concat: ["$$fn", " ", "$$ln"] } },
                    },
                  },
                },
                email: "$page1.email",
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: ceColl,
          localField: "forms.carriersEdgeTraining",
          foreignField: "_id",
          as: "ce",
          pipeline: [{ $project: { _id: 1, emailSent: 1 } }],
        },
      },
      {
        $lookup: {
          from: dtColl,
          localField: "forms.drugTest",
          foreignField: "_id",
          as: "dt",
          pipeline: [{ $project: { _id: 1, documentsUploaded: 1 } }],
        },
      },

      // --- derive fields used for sorting/matching and summary ---
      { $addFields: { driverAppObj: { $arrayElemAt: ["$driverApp", 0] } } },
      {
        $addFields: {
          driverName: { $ifNull: ["$driverAppObj.driverName", null] },
          driverEmail: { $ifNull: ["$driverAppObj.email", null] },
          ceEmailSent: { $ifNull: [{ $first: "$ce.emailSent" }, false] },
          dtDocumentsUploaded: { $ifNull: [{ $first: "$dt.documentsUploaded" }, false] },
          progressStepIndex: { $indexOfArray: [getOnboardingStepFlow({ needsFlatbedTraining: true }), "$status.currentStep"] },
        },
      },

      ...(typeof ceEmailSent === "boolean"
        ? [
            {
              $match: {
                "status.currentStep": EStepPath.CARRIERS_EDGE_TRAINING,
                ceEmailSent,
              },
            },
          ]
        : []),
      ...(typeof dtDocsUploaded === "boolean"
        ? [
            {
              $match: {
                "status.currentStep": EStepPath.DRUG_TEST,
                dtDocumentsUploaded: dtDocsUploaded,
              },
            },
          ]
        : []),

      sortStage,
      { $skip: skip },
      { $limit: limit },

      {
        $addFields: {
          itemSummary: {
            driverName: "$driverName",
            driverEmail: "$driverEmail",
            carrierEdgeTraining: { emailSent: "$ceEmailSent" },
            drugTest: { documentsUploaded: "$dtDocumentsUploaded" },
          },
        },
      },

      {
        $project: {
          _id: 1,
          status: 1,
          companyId: 1,
          applicationType: 1,
          createdAt: 1,
          updatedAt: 1,
          terminated: 1,
          resumeExpiresAt: 1,
          forms: 1,
          itemSummary: 1,
        },
      },
    ];

    const [rawItems, total, counts] = await Promise.all([
      OnboardingTracker.aggregate(pipeline).collation({ locale: "en", strength: 2 }).allowDiskUse(true),
      OnboardingTracker.countDocuments(matchItems),
      (async () => {
        const [all, driveTest, ce, dt] = await Promise.all([
          OnboardingTracker.countDocuments({ ...matchBase }),
          OnboardingTracker.countDocuments({
            ...matchBase,
            "status.currentStep": EStepPath.DRIVE_TEST,
          }),
          OnboardingTracker.countDocuments({
            ...matchBase,
            "status.currentStep": EStepPath.CARRIERS_EDGE_TRAINING,
            ...(typeof ceEmailSent === "boolean" ? { "forms.carriersEdgeTraining": { $exists: true } } : {}),
          }),
          OnboardingTracker.countDocuments({
            ...matchBase,
            "status.currentStep": EStepPath.DRUG_TEST,
            ...(typeof dtDocsUploaded === "boolean" ? { "forms.drugTest": { $exists: true } } : {}),
          }),
        ]);
        return { all, driveTest, carriersEdgeTraining: ce, drugTest: dt };
      })(),
    ]);

    const items = rawItems as DashboardOnboardingItem[];

    return successResponse(200, "Onboarding documents fetched", {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      sort: (sortParsed as any).token || (sortParsed as any).spec,
      count: items.length,
      counts,
      items,
    });
  } catch (err: any) {
    return errorResponse(err);
  }
}
