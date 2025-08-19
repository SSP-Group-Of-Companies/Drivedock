import { Document } from "mongoose";

export interface ICarriersEdgeTraining {
  emailSent: boolean;
  completed: boolean;
}

export interface ICarriersEdgeTrainingDoc extends Document, ICarriersEdgeTraining {}
