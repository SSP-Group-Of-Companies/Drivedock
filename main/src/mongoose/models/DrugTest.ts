import { IDrugTestDoc } from "@/types/drugTest.types";
import { models, model, Model } from "mongoose";
import drugTestSchema from "../schemas/drugTestSchema";

const DrugTest: Model<IDrugTestDoc> =
  models.DrugTest || model<IDrugTestDoc>("DrugTest", drugTestSchema);

export default DrugTest;
