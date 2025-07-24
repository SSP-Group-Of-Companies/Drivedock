import { IApplicationFormDoc } from "@/types/applicationForm.types";
import mongoose, { model, Model, models } from "mongoose";
import applicationFormSchema from "../schemas/applicationForm/applicationFormSchema";

const ApplicationForm =  models.ApplicationForm || model<IApplicationFormDoc>(
    "ApplicationForm",
    applicationFormSchema
  );
  
  export default ApplicationForm;