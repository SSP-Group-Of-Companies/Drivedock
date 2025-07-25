import { Document } from "mongoose";

export enum EDriverType {
    Company = 'Company',
    OwnerOperator = 'Owner Operator',
    OwnerDriver = 'Owner Driver',
  }
  
  export enum EHaulPreference {
    ShortHaul = 'Short Haul',
    LongHaul = 'Long Haul',
  }
  
  export enum ETeamStatus {
    Team = 'Team',
    Single = 'Single',
  }
  
  export interface IPreQualifications {
    // Pre-Qualification Questions
    over23Local: boolean;
    over25CrossBorder: boolean;
    canDriveManual: boolean;
    experienceDrivingTractorTrailer: boolean;
    faultAccidentIn3Years: boolean;
    zeroPointsOnAbstract: boolean;
    noUnpardonedCriminalRecord: boolean;
    legalRightToWorkCanada: boolean;
    canCrossBorderUSA: boolean;
    hasFASTCard: boolean;
  
    // Categories
    driverType: EDriverType;
    haulPreference: EHaulPreference;
    teamStatus: ETeamStatus;
    preferLocalDriving: boolean;
    preferSwitching: boolean;
  
    // Confirmation
    infoAnsweredTruthfully: boolean;
    completed: boolean;
    flatbedExperience: boolean; 
  }
  
  export interface IPreQualificationsDoc extends IPreQualifications, Document {};