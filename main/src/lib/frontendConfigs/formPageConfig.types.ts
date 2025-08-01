// src/lib/frontendConfigs/formPageConfig.types.ts
import { FieldValues } from "react-hook-form";
import { IPreQualifications } from "@/types/preQualifications.types";

export interface FormPageConfig<T extends FieldValues> {
  validationFields: (values: T) => string[];

  buildFormData:
    | ((values: T) => FormData)
    | ((
        values: T,
        prequalification: IPreQualifications,
        companyId: string
      ) => FormData);

  nextRoute: string;

  //  Optional business rule validator (only used when defined) - Page 2
  validateBusinessRules?: (values: T) => string | null;
}
