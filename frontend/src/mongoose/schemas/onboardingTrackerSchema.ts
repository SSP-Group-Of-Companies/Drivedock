import mongoose, { Schema } from 'mongoose';
import { IOnboardingTrackerDoc } from '@/types/onboardingTracker.type';
import PreQualifications from '../models/Prequalifications';
import ApplicationForm from '../models/applicationForm';
import { decryptString, encryptString, hashString } from '@/lib/utils/cryptoUtils';

// Schema definition
const onboardingTrackerSchema = new Schema<IOnboardingTrackerDoc>(
  {
    sinHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sinEncrypted: {
      type: String,
      required: true,
    },

    resumeExpiresAt: {
      type: Date,
      required: true,
    },

    status: {
      currentStep: { type: Number, required: true },
      completedStep: { type: Number, required: true },
      completed: { type: Boolean, required: true },
    },

    forms: {
      preQualification: { type: mongoose.Schema.Types.ObjectId, ref: PreQualifications },
      driverApplication: { type: mongoose.Schema.Types.ObjectId, ref: ApplicationForm },
      consents: { type: mongoose.Schema.Types.ObjectId, ref: 'PoliciesConsents' },
      carrierEdge: { type: mongoose.Schema.Types.ObjectId, ref: 'CarrierEdgeStatus' },
      driveTest: { type: mongoose.Schema.Types.ObjectId, ref: 'DriveTest' },
      drugTest: { type: mongoose.Schema.Types.ObjectId, ref: 'DrugTest' },
      flatbedTraining: { type: mongoose.Schema.Types.ObjectId, ref: 'FlatbedTraining' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//
// ✅ VIRTUAL: decrypted SIN for output
//
onboardingTrackerSchema.virtual('sin').get(function () {
  try {
    return decryptString(this.sinEncrypted);
  } catch {
    return undefined;
  }
});

//
// ✅ HOOKS: Automatically hash + encrypt when `sin` is present
//
function processSinField(this: any) {
  if (this.sin) {
    this.sinHash = hashString(this.sin);
    this.sinEncrypted = encryptString(this.sin);
    delete this.sin;
  }
}

// pre-save (create or save)
onboardingTrackerSchema.pre('save', function (next) {
  processSinField.call(this);
  next();
});

// pre findOneAndUpdate
onboardingTrackerSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;
  const sin = update?.sin ?? update?.$set?.sin;

  if (sin) {
    const hashed = hashString(sin);
    const encrypted = encryptString(sin);

    if (update.$set) {
      Object.assign(update.$set, { sinHash: hashed, sinEncrypted: encrypted });
      delete update.$set.sin;
    } else {
      Object.assign(update, { sinHash: hashed, sinEncrypted: encrypted });
      delete update.sin;
    }
  }

  next();
});

// pre updateOne / updateMany
function handleDirectUpdate(this: any, next: Function) {
  const update = this.getUpdate() as any;
  const sin = update?.sin ?? update?.$set?.sin;

  if (sin) {
    const hashed = hashString(sin);
    const encrypted = encryptString(sin);

    if (update.$set) {
      Object.assign(update.$set, { sinHash: hashed, sinEncrypted: encrypted });
      delete update.$set.sin;
    } else {
      Object.assign(update, { sinHash: hashed, sinEncrypted: encrypted });
      delete update.sin;
    }
  }

  next();
}

onboardingTrackerSchema.pre('updateOne', handleDirectUpdate);
onboardingTrackerSchema.pre('updateMany', handleDirectUpdate);

//
// ✅ Cascade delete forms on tracker deletion
//
onboardingTrackerSchema.post('findOneAndDelete', async function (doc) {
  if (!doc) return;

  const { forms } = doc;
  const tasks = [];

  if (forms.preQualification)
    tasks.push(PreQualifications.deleteOne({ _id: forms.preQualification }));

  if (forms.driverApplication)
    tasks.push(ApplicationForm.deleteOne({ _id: forms.driverApplication }));

  if (forms.consents)
    tasks.push(mongoose.model('PoliciesConsents').deleteOne({ _id: forms.consents }));

  if (forms.carrierEdge)
    tasks.push(mongoose.model('CarrierEdgeStatus').deleteOne({ _id: forms.carrierEdge }));

  if (forms.driveTest)
    tasks.push(mongoose.model('DriveTest').deleteOne({ _id: forms.driveTest }));

  if (forms.drugTest)
    tasks.push(mongoose.model('DrugTest').deleteOne({ _id: forms.drugTest }));

  if (forms.flatbedTraining)
    tasks.push(mongoose.model('FlatbedTraining').deleteOne({ _id: forms.flatbedTraining }));

  await Promise.all(tasks);
});

export default onboardingTrackerSchema;
