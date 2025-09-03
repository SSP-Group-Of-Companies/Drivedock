import { IAccidentEntry, ITrafficConvictionEntry, ICriminalRecordEntry } from "@/types/applicationForm.types";

export interface AccidentCriminalResponse {
  success: boolean;
  message: string;
  data: {
    onboardingContext: any;
    accidentHistory: IAccidentEntry[];
    trafficConvictions: ITrafficConvictionEntry[];
    criminalRecords: ICriminalRecordEntry[];
  };
}
