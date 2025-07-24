
import { model, models } from "mongoose";
import PreQualificationsSchema from "../schemas/preQualificationsSchema";
import { IPreQualificationsDoc } from "@/types/preQualifications.types";

export const PreQualifications =
  models.PreQualifications || model<IPreQualificationsDoc>('PreQualifications', PreQualificationsSchema);

export default PreQualifications;