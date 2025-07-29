import { Document } from "mongoose";
import { IPhoto } from "./shared.types";

export interface IPoliciesConsents {
    signature: IPhoto;
    signedAt: Date;
  }

export interface IPoliciesConsentsDoc extends IPoliciesConsents, Document {};