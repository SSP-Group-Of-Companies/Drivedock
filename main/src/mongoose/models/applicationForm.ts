import { IApplicationFormDoc } from "@/types/applicationForm.types";
import { Model, model, models } from "mongoose";
import applicationFormSchema from "../schemas/applicationForm/applicationFormSchema";

// test
const ApplicationForm: Model<IApplicationFormDoc> = models.ApplicationForm || model<IApplicationFormDoc>("ApplicationForm", applicationFormSchema);

export default ApplicationForm;
