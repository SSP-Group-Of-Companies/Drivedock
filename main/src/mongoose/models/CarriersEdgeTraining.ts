import { ICarriersEdgeTrainingDoc } from "@/types/carriersEdgeTraining.types";
import { models, model, Model } from "mongoose";
import carriersEdgeTrainingSchema from "../schemas/carriersEdgeTrainingSchema";

const CarriersEdgeTraining: Model<ICarriersEdgeTrainingDoc> =
  models.CarriersEdgeTraining ||
  model<ICarriersEdgeTrainingDoc>(
    "CarriersEdgeTraining",
    carriersEdgeTrainingSchema
  );

export default CarriersEdgeTraining;
