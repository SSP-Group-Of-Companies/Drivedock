import { Document } from "mongoose";
import { IFileAsset } from "./shared.types";

export interface IFlatbedTraining {
  flatbedCertificates?: IFileAsset[];
  completed: boolean;
}

export interface IFlatbedTrainingDoc extends Document, IFlatbedTraining {}
