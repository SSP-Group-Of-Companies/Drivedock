import mongoose, { Schema } from "mongoose";
import PreQualifications from "../models/Prequalifications";
import { IOnboardingTrackerDoc } from "@/types/onboardingTracker.type";
import ApplicationForm from "../models/applicationForm";

const onboardingTrackerSchema = new Schema<IOnboardingTrackerDoc>(
  {
    sin: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    resumeExpiresAt: {
      type: Date,
      required: true,
    },
    status: {
      currentStep: { type: Number, required: true },
      currentPage: { type: Number, required: true },
      stepsCompleted: [{ type: Number, required: true }],
      completed: { type: Boolean, required: true },
    },
    forms: {
      preQualification: { type: mongoose.Schema.Types.ObjectId, ref: PreQualifications },
      driverApplication: { type: mongoose.Schema.Types.ObjectId, ref: ApplicationForm }, // Use your actual model name
      consents: { type: mongoose.Schema.Types.ObjectId, ref: "PoliciesConsents" },
      carrierEdge: { type: mongoose.Schema.Types.ObjectId, ref: "CarrierEdgeStatus" },
      driveTest: { type: mongoose.Schema.Types.ObjectId, ref: "DriveTest" },
      drugTest: { type: mongoose.Schema.Types.ObjectId, ref: "DrugTest" },
      flatbedTraining: { type: mongoose.Schema.Types.ObjectId, ref: "FlatbedTraining" },
    },
  },
  {
    timestamps: true,
  }
);


// ✅ Post-delete hook for cascading deletion of form documents
onboardingTrackerSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  const { forms } = doc;

  const deletionTasks = [];

  if (forms.preQualification) {
    deletionTasks.push(PreQualifications.deleteOne({ _id: forms.preQualification }));
  }
  if (forms.driverApplication) {
    deletionTasks.push(ApplicationForm.deleteOne({ _id: forms.driverApplication }));
  }
  if (forms.consents) {
    deletionTasks.push(mongoose.model("PoliciesConsents").deleteOne({ _id: forms.consents }));
  }
  if (forms.carrierEdge) {
    deletionTasks.push(mongoose.model("CarrierEdgeStatus").deleteOne({ _id: forms.carrierEdge }));
  }
  if (forms.driveTest) {
    deletionTasks.push(mongoose.model("DriveTest").deleteOne({ _id: forms.driveTest }));
  }
  if (forms.drugTest) {
    deletionTasks.push(mongoose.model("DrugTest").deleteOne({ _id: forms.drugTest }));
  }
  if (forms.flatbedTraining) {
    deletionTasks.push(mongoose.model("FlatbedTraining").deleteOne({ _id: forms.flatbedTraining }));
  }

  await Promise.all(deletionTasks);
});

export default onboardingTrackerSchema;