import { Document } from "mongoose";
import { IPhoto } from "./shared.types";

export interface IDrugTest {
  documents: IPhoto[]; // uploaded drug test documents
  documentsUploaded: boolean;
  completed: boolean;
}

export interface IDrugTestDoc extends Document, IDrugTest {}
