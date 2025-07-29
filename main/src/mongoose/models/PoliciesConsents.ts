;import { IPoliciesConsentsDoc } from "@/types/policiesConsents.types";
import { models, model, Model } from "mongoose";
import policiesConsentsSchema from "../schemas/policiesConsentsSchema";

const PoliciesConsents : Model<IPoliciesConsentsDoc> = models.PoliciesConsents || model<IPoliciesConsentsDoc>('PoliciesConsents', policiesConsentsSchema);

export default PoliciesConsents;