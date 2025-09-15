import { Schema } from "mongoose";
import { EStepPath, ETerminationType, IOnboardingTrackerDoc } from "@/types/onboardingTracker.types";
import { ECompanyApplicationType, ECompanyId } from "@/constants/companies";

import PreQualifications from "../models/Prequalifications";
import PoliciesConsents from "../models/PoliciesConsents";
import ApplicationForm from "../models/ApplicationForm";
import CarriersEdgeTraining from "../models/CarriersEdgeTraining";
import DrugTest from "../models/DrugTest";
import FlatbedTraining from "../models/FlatbedTraining";
import DriveTest from "../models/DriveTest";

import { decryptString } from "@/lib/utils/cryptoUtils";

const onboardingTrackerSchema = new Schema<IOnboardingTrackerDoc>(
  {
    sinHash: {
      type: String,
      required: [true, "SIN hash is required."],
      unique: true,
      index: true,
    },
    sinEncrypted: {
      type: String,
      required: [true, "Encrypted SIN is required."],
    },
    resumeExpiresAt: {
      type: Date,
      required: [true, "Resume expiry date is required."],
    },
    applicationType: {
      type: String,
      enum: {
        values: Object.values(ECompanyApplicationType),
        message: `application type can only be one of ${Object.values(ECompanyApplicationType)}`,
      },
    },
    status: {
      currentStep: {
        type: String,
        enum: {
          values: Object.values(EStepPath),
          message: `Current step must be one of: ${Object.values(EStepPath).join(", ")}`,
        },
        required: [true, "Current onboarding step is required."],
      },
      completed: {
        type: Boolean,
        default: false,
        required: [true, "Completion status is required."],
      },
      completionDate: {
        type: Date,
      },
    },
    companyId: {
      type: String,
      required: [true, "Company id is required"],
      enum: {
        values: Object.values(ECompanyId),
        message: `company id can only be one of ${Object.values(ECompanyId)}`,
      },
    },
    forms: {
      preQualification: { type: Schema.Types.ObjectId, ref: PreQualifications },
      driverApplication: { type: Schema.Types.ObjectId, ref: ApplicationForm },
      policiesConsents: { type: Schema.Types.ObjectId, ref: PoliciesConsents },
      carriersEdgeTraining: { type: Schema.Types.ObjectId, ref: CarriersEdgeTraining },
      driveTest: { type: Schema.Types.ObjectId, ref: DriveTest },
      drugTest: { type: Schema.Types.ObjectId, ref: DrugTest },
      flatbedTraining: { type: Schema.Types.ObjectId, ref: FlatbedTraining },
    },
    completionLocation: {
      country: {
        type: String,
      },
      region: {
        type: String, // State/Province
      },
      city: {
        type: String,
      },
      timezone: {
        type: String,
      },
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
    },
    locationPermissionGranted: {
      type: Boolean,
      default: false,
    },
    needsFlatbedTraining: {
      type: Boolean,
      default: false,
      required: [true, "needsFlatbedTraining is required"],
    },
    terminated: {
      type: Boolean,
      default: false,
      required: [true, "Termination status is required."],
    },
    /** conditionally required when terminated = true */
    terminationType: {
      type: String,
      enum: {
        values: Object.values(ETerminationType),
        message: `termination type can only be one of ${Object.values(ETerminationType)}`,
      },
      required: function (this: IOnboardingTrackerDoc) {
        return this.terminated === true;
      },
    },
    terminationDate: {
      type: Date,
      required: function (this: IOnboardingTrackerDoc) {
        return this.terminated === true;
      },
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** VIRTUAL: decrypted SIN for output */
onboardingTrackerSchema.virtual("sin").get(function () {
  try {
    return decryptString(this.sinEncrypted);
  } catch {
    return undefined;
  }
});

/** If a document is saved with terminated = false, drop any stale terminationType */
onboardingTrackerSchema.pre("validate", function (next) {
  if (this.terminated === false && (this as any).terminationType) {
    (this as any).terminationType = undefined;
  }
  next();
});

/** Cascade delete forms on tracker deletion */
onboardingTrackerSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  const { forms } = doc;
  const tasks: Promise<any>[] = [];

  if (forms?.preQualification) tasks.push(PreQualifications.deleteOne({ _id: forms.preQualification }));
  if (forms?.driverApplication) tasks.push(ApplicationForm.deleteOne({ _id: forms.driverApplication }));
  if (forms?.policiesConsents) tasks.push(PoliciesConsents.deleteOne({ _id: forms.policiesConsents }));
  if (forms?.carriersEdgeTraining) tasks.push(CarriersEdgeTraining.deleteOne({ _id: forms.carriersEdgeTraining }));
  if (forms?.driveTest) tasks.push(DriveTest.deleteOne({ _id: forms.driveTest }));
  if (forms?.drugTest) tasks.push(DrugTest.deleteOne({ _id: forms.drugTest }));
  if (forms?.flatbedTraining) tasks.push(FlatbedTraining.deleteOne({ _id: forms.flatbedTraining }));

  await Promise.all(tasks);
});

// ---------------------------------------------------------
// INDEXES (crucial for dashboards / queries)
// ---------------------------------------------------------
onboardingTrackerSchema.index({ terminated: 1, "status.currentStep": 1, updatedAt: -1 }, { name: "terminated_step_updatedAt" });

onboardingTrackerSchema.index({ terminated: 1, companyId: 1, "status.currentStep": 1, updatedAt: -1 }, { name: "terminated_company_step_updatedAt" });

onboardingTrackerSchema.index({ terminated: 1, createdAt: -1 }, { name: "terminated_createdAt" });

onboardingTrackerSchema.index({ terminated: 1, applicationType: 1, updatedAt: -1 }, { name: "terminated_appType_updatedAt" });

export default onboardingTrackerSchema;
