import { Document } from "mongoose";

export interface IFlatbedTraining {
  completed: boolean;
}

export interface IFlatbedTrainingDoc extends Document, IFlatbedTraining {}
