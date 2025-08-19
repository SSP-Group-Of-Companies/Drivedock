import { Document } from "mongoose";

export interface IFlatbedTraining {
  trainingWeeks: number;
  completed: boolean;
}

export interface IFlatbedTrainingDoc extends Document, IFlatbedTraining {}
