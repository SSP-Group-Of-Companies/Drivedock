import { Document } from "mongoose";
import { IFileAsset } from "./shared.types";

export interface IPoliciesConsents {
  signature: IFileAsset;
  signedAt: Date;
  sendPoliciesByEmail?: boolean;
}

export interface IPoliciesConsentsDoc extends IPoliciesConsents, Document {}
