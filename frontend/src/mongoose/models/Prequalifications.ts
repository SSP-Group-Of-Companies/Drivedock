
import { Model, model, models } from "mongoose";
import PreQualificationsSchema from "../schemas/preQualificationsSchema";
import { IPreQualificationsDoc } from "@/types/preQualifications.types";

export const PreQualifications : Model<IPreQualificationsDoc> =
  models.PreQualifications || model<IPreQualificationsDoc>('PreQualifications', PreQualificationsSchema);

export default PreQualifications;