// main/src/types/drugTest.types.ts

import { Document } from "mongoose";
import { IFileAsset } from "./shared.types";

export enum EDrugTestStatus {
  NOT_UPLOADED = "NOT_UPLOADED",
  AWAITING_REVIEW = "AWAITING_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface IDrugTest {
  adminDocuments: IFileAsset[]; // admin uploaded drug test documents (e.g. from 3rd party)
  driverDocuments: IFileAsset[]; // driver uploaded drug test documents
  status: EDrugTestStatus; // workflow status
}

export interface IDrugTestDoc extends Document, IDrugTest {}
