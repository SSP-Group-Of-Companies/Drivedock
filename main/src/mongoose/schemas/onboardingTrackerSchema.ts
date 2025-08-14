import mongoose, { Schema } from "mongoose";
import { EStepPath, IOnboardingTrackerDoc } from "@/types/onboardingTracker.type";
import { ECompanyApplicationType } from "@/hooks/frontendHooks/useCompanySelection";
import PreQualifications from "../models/Prequalifications";
import ApplicationForm from "../models/ApplicationForms";
import { decryptString } from "@/lib/utils/cryptoUtils";
import PoliciesConsents from "../models/PoliciesConsents";
import { ECompanyId } from "@/constants/companies";

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
      completedStep: {
        type: String,
        enum: {
          values: Object.values(EStepPath),
          message: `Completed step must be one of: ${Object.values(EStepPath).join(", ")}`,
        },
        required: [true, "Completed onboarding step is required."],
      },
      completed: {
        type: Boolean,
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
      carrierEdge: {
        type: Schema.Types.ObjectId,
        ref: "CarrierEdgeStatus",
      },
      driveTest: {
        type: Schema.Types.ObjectId,
        ref: "DriveTest",
      },
      drugTest: {
        type: Schema.Types.ObjectId,
        ref: "DrugTest",
      },
      flatbedTraining: {
        type: Schema.Types.ObjectId,
        ref: "FlatbedTraining",
      },
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

  if (forms.consents) tasks.push(PoliciesConsents.deleteOne({ _id: forms.consents }));

  if (forms.carrierEdge) tasks.push(mongoose.model("CarrierEdgeStatus").deleteOne({ _id: forms.carrierEdge }));

  if (forms.driveTest) tasks.push(mongoose.model("DriveTest").deleteOne({ _id: forms.driveTest }));

  if (forms.drugTest) tasks.push(mongoose.model("DrugTest").deleteOne({ _id: forms.drugTest }));

  if (forms.flatbedTraining) tasks.push(mongoose.model("FlatbedTraining").deleteOne({ _id: forms.flatbedTraining }));

  await Promise.all(tasks);
});

export default onboardingTrackerSchema;
