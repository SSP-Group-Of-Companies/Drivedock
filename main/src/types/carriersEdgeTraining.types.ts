import { Document } from "mongoose";
import { IFileAsset } from "./shared.types";

export interface ICarriersEdgeTraining {
  emailSent: boolean;

  // NEW: who sent the email (admin's name)
  emailSentBy?: string;

  // NEW: when the email was sent
  emailSentAt?: Date;

  certificates: IFileAsset[];
  completed: boolean;
}

export interface ICarriersEdgeTrainingDoc extends Document, ICarriersEdgeTraining {}
