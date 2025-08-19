import { Document } from "mongoose";

export interface IDrugTest {
  documentsUploaded: boolean;
  completed: boolean;
}

export interface IDrugTestDoc extends Document, IDrugTest {}
