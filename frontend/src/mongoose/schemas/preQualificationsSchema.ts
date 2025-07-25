import {
  EDriverType,
  EHaulPreference,
  ETeamStatus,
  IPreQualificationsDoc,
} from "@/types/preQualifications.types";
import { Schema } from "mongoose";

const PreQualificationsSchema: Schema<IPreQualificationsDoc> = new Schema({
  completed: {
    type: Boolean,
    required: [true, "completed is required"]
  },

  over23Local: { type: Boolean, required: [true, "over23Local is required"] },
  over25CrossBorder: {
    type: Boolean,
    required: [true, "over25CrossBorder is required"],
  },
  canDriveManual: {
    type: Boolean,
    required: [true, "canDriveManual is required"],
  },
  experienceDrivingTractorTrailer: {
    type: Boolean,
    required: [true, "experienceDrivingTractorTrailer is required"],
  },
  faultAccidentIn3Years: {
    type: Boolean,
    required: [true, "faultAccidentIn3Years is required"],
  },
  zeroPointsOnAbstract: {
    type: Boolean,
    required: [true, "zeroPointsOnAbstract is required"],
  },
  noUnpardonedCriminalRecord: {
    type: Boolean,
    required: [true, "noUnpardonedCriminalRecord is required"],
  },
  legalRightToWorkCanada: {
    type: Boolean,
    required: [true, "legalRightToWorkCanada is required"],
  },
  canCrossBorderUSA: {
    type: Boolean,
    required: [true, "canCrossBorderUSA is required"],
  },
  hasFASTCard: { type: Boolean, required: [true, "hasFASTCard is required"] },
  driverType: {
    type: String,
    enum: {
      values: Object.values(EDriverType),
      message:
        "driverType must be one of: " + Object.values(EDriverType).join(", "),
    },
    required: [true, "driverType is required"],
  },
  haulPreference: {
    type: String,
    enum: {
      values: Object.values(EHaulPreference),
      message:
        "haulPreference must be one of: " +
        Object.values(EHaulPreference).join(", "),
    },
    required: [true, "haulPreference is required"],
  },
  teamStatus: {
    type: String,
    enum: {
      values: Object.values(ETeamStatus),
      message:
        "teamStatus must be one of: " + Object.values(ETeamStatus).join(", "),
    },
    required: [true, "teamStatus is required"],
  },
  preferLocalDriving: {
    type: Boolean,
    required: [true, "preferLocalDriving is required"],
  },
  preferSwitching: {
    type: Boolean,
    required: [true, "preferSwitching is required"],
  },
  infoAnsweredTruthfully: {
    type: Boolean,
    required: [true, "infoAnsweredTruthfully is required"],
  },

});

export default PreQualificationsSchema;
