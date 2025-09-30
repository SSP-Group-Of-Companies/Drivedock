import {
  EDriverType,
  EHaulPreference,
  ETeamStatus,
  EStatusInCanada,
  IPreQualificationsDoc,
} from "@/types/preQualifications.types";
import { Schema } from "mongoose";

const PreQualificationsSchema: Schema<IPreQualificationsDoc> = new Schema({

  // Eligibility Booleans
  over23Local: {
    type: Boolean,
    required: [true, "Confirmation of being over 23 (local) is required."],
  },
  over25CrossBorder: {
    type: Boolean,
    required: [
      true,
      "Confirmation of being over 25 (cross-border) is required.",
    ],
  },
  canDriveManual: {
    type: Boolean,
    required: [true, "Manual driving ability must be specified."],
  },
  experienceDrivingTractorTrailer: {
    type: Boolean,
    required: [true, "Experience driving tractor-trailers must be specified."],
  },
  faultAccidentIn3Years: {
    type: Boolean,
    required: [true, "Accident history in the past 3 years must be specified."],
  },
  zeroPointsOnAbstract: {
    type: Boolean,
    required: [true, "Abstract must confirm zero points."],
  },
  noUnpardonedCriminalRecord: {
    type: Boolean,
    required: [true, "Unpardoned criminal record status is required."],
  },
  legalRightToWorkCanada: {
    type: Boolean,
    required: [true, "Legal right to work in Canada must be confirmed."],
  },
  canCrossBorderUSA: {
    type: Boolean,
  },
  hasFASTCard: {
    type: Boolean,
  },
  statusInCanada: {
    type: String,
    enum: {
      values: Object.values(EStatusInCanada),
      message: `Status in Canada must be one of: ${Object.values(EStatusInCanada).join(", ")}`,
    },
  },
  eligibleForFASTCard: {
    type: Boolean,
  },

  // Preferences & Profile
  driverType: {
    type: String,
    enum: {
      values: Object.values(EDriverType),
      message: `Driver type must be one of: ${Object.values(EDriverType).join(
        ", "
      )}`,
    },
    required: [true, "Driver type is required."],
  },
  haulPreference: {
    type: String,
    enum: {
      values: Object.values(EHaulPreference),
      message: `Haul preference must be one of: ${Object.values(
        EHaulPreference
      ).join(", ")}`,
    },
    required: [true, "Haul preference is required."],
  },
  teamStatus: {
    type: String,
    enum: {
      values: Object.values(ETeamStatus),
      message: `Team status must be one of: ${Object.values(ETeamStatus).join(
        ", "
      )}`,
    },
    required: [true, "Team status is required."],
  },
  preferLocalDriving: {
    type: Boolean,
    required: [true, "Local driving preference must be specified."],
  },
  preferSwitching: {
    type: Boolean,
    required: [true, "Switching preference must be specified."],
  },
  flatbedExperience: {
    type: Boolean,
    required: [true, "Flatbed experience status must be specified."],
  },
}, {timestamps: true});

export default PreQualificationsSchema;
