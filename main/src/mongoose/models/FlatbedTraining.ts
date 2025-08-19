import { IFlatbedTrainingDoc } from "@/types/flatbedTraining.types";
import { models, model, Model } from "mongoose";
import flatbedTrainingSchema from "../schemas/flatbedTrainingSchema";

const FlatbedTraining: Model<IFlatbedTrainingDoc> = models.FlatbedTraining || model<IFlatbedTrainingDoc>("FlatbedTraining", flatbedTrainingSchema);

export default FlatbedTraining;
