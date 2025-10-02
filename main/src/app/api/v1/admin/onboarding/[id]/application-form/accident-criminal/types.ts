import { IAccidentEntry, ITrafficConvictionEntry, ICriminalRecordEntry } from "@/types/applicationForm.types";

export interface AccidentCriminalResponse {
  success: boolean;
  message: string;
  data: {
    onboardingContext: any;
    hasAccidentHistory?: boolean;
    accidentHistory: IAccidentEntry[];
    hasTrafficConvictions?: boolean;
    trafficConvictions: ITrafficConvictionEntry[];
    hasCriminalRecords?: boolean;
    criminalRecords: ICriminalRecordEntry[];
  };
}
