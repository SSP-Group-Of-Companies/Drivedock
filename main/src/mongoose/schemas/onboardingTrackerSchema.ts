import mongoose, { Schema } from "mongoose";
import { EStepPath, IOnboardingTrackerDoc } from "@/types/onboardingTracker.types";
import { ECompanyApplicationType } from "@/constants/companies";
import PreQualifications from "../models/Prequalifications";
import { decryptString } from "@/lib/utils/cryptoUtils";
import PoliciesConsents from "../models/PoliciesConsents";
import { ECompanyId } from "@/constants/companies";
import ApplicationForm from "../models/ApplicationForm";
import CarriersEdgeTraining from "../models/CarriersEdgeTraining";
import DrugTest from "../models/DrugTest";
import FlatbedTraining from "../models/FlatbedTraining";
import DriveTest from "../models/DriveTest";

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
    },
    companyId: {
      type: String,
      required: [true, "Company id is requried"],
      enum: {
        values: Object.values(ECompanyId),
        message: `company id can only be one of ${Object.values(ECompanyId)}`,
      },
    },
    forms: {
      preQualification: {
        type: Schema.Types.ObjectId,
        ref: PreQualifications,
      },
      driverApplication: {
        type: Schema.Types.ObjectId,
        ref: ApplicationForm,
      },
      policiesConsents: {
        type: Schema.Types.ObjectId,
        ref: PoliciesConsents,
      },
      carriersEdgeTraining: {
        type: Schema.Types.ObjectId,
        ref: CarriersEdgeTraining,
      },
      driveTest: {
        type: Schema.Types.ObjectId,
        ref: DriveTest,
      },
      drugTest: {
        type: Schema.Types.ObjectId,
        ref: DrugTest,
      },
      flatbedTraining: {
        type: Schema.Types.ObjectId,
        ref: FlatbedTraining,
      },
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

//
// VIRTUAL: decrypted SIN for output
//
onboardingTrackerSchema.virtual("sin").get(function () {
  try {
    return decryptString(this.sinEncrypted);
  } catch {
    return undefined;
  }
});

//
// Cascade delete forms on tracker deletion
//
onboardingTrackerSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  const { forms } = doc;
  const tasks = [];

  if (forms.preQualification) tasks.push(PreQualifications.deleteOne({ _id: forms.preQualification }));

  if (forms.driverApplication) tasks.push(ApplicationForm.deleteOne({ _id: forms.driverApplication }));

  if (forms.policiesConsents) tasks.push(PoliciesConsents.deleteOne({ _id: forms.consents }));

  if (forms.carriersEdgeTraining) tasks.push(mongoose.model("CarrierEdgeStatus").deleteOne({ _id: forms.carrierEdge }));

  if (forms.driveTest) tasks.push(mongoose.model("DriveTest").deleteOne({ _id: forms.driveTest }));

  if (forms.drugTest) tasks.push(mongoose.model("DrugTest").deleteOne({ _id: forms.drugTest }));

  if (forms.flatbedTraining) tasks.push(mongoose.model("FlatbedTraining").deleteOne({ _id: forms.flatbedTraining }));

  await Promise.all(tasks);
});

// ---------------------------------------------------------
// INDEXES (crucial for dashboards / queries)
// ---------------------------------------------------------
onboardingTrackerSchema.index(
  { terminated: 1, "status.currentStep": 1, updatedAt: -1 }, // dashboard default
  { name: "terminated_step_updatedAt" }
);

onboardingTrackerSchema.index(
  { terminated: 1, companyId: 1, "status.currentStep": 1, updatedAt: -1 }, // per-company
  { name: "terminated_company_step_updatedAt" }
);

onboardingTrackerSchema.index(
  { terminated: 1, createdAt: -1 }, // recent trackers
  { name: "terminated_createdAt" }
);

onboardingTrackerSchema.index(
  { terminated: 1, applicationType: 1, updatedAt: -1 }, // optional, if filtered often
  { name: "terminated_appType_updatedAt" }
);

export default onboardingTrackerSchema;
