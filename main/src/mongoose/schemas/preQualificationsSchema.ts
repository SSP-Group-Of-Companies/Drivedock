import {
  EDriverType,
  EHaulPreference,
  ETeamStatus,
  IPreQualificationsDoc,
} from "@/types/preQualifications.types";
import { Schema } from "mongoose";

const PreQualificationsSchema: Schema<IPreQualificationsDoc> = new Schema({
  completed: { type: Boolean, required: true },

  over23Local: { type: Boolean, required: true },
  over25CrossBorder: { type: Boolean, required: true },
  canDriveManual: { type: Boolean, required: true },
  experienceDrivingTractorTrailer: { type: Boolean, required: true },
  faultAccidentIn3Years: { type: Boolean, required: true },
  zeroPointsOnAbstract: { type: Boolean, required: true },
  noUnpardonedCriminalRecord: { type: Boolean, required: true },
  legalRightToWorkCanada: { type: Boolean, required: true },
  canCrossBorderUSA: { type: Boolean, required: true },
  hasFASTCard: { type: Boolean, required: true },

  driverType: {
    type: String,
    enum: {
      values: Object.values(EDriverType),
      message:
        "driverType must be one of: " + Object.values(EDriverType).join(", "),
    },
    required: true,
  },
  haulPreference: {
    type: String,
    enum: {
      values: Object.values(EHaulPreference),
      message:
        "haulPreference must be one of: " +
        Object.values(EHaulPreference).join(", "),
    },
    required: true,
  },
  teamStatus: {
    type: String,
    enum: {
      values: Object.values(ETeamStatus),
      message:
        "teamStatus must be one of: " + Object.values(ETeamStatus).join(", "),
    },
    required: true,
  },
  preferLocalDriving: {
    type: Boolean,
    required: [true, "preferLocalDriving is required"],
  },
  preferSwitching: {
    type: Boolean,
    required: [true, "preferSwitching is required"],
  },
  flatbedExperience: {
    type: Boolean,
    required: [true, "flatbedExperience is required"],
  },
});

export default PreQualificationsSchema;
