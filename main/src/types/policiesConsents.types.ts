import { Document } from "mongoose";
import { IPhoto } from "./shared.types";

export interface IPoliciesConsents {
  signature: IPhoto;
  signedAt: Date;
  sendPoliciesByEmail?: boolean;
}

export interface IPoliciesConsentsDoc extends IPoliciesConsents, Document { };