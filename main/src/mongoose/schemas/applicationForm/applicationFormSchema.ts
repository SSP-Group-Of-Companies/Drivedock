import { IApplicationFormDoc } from "@/types/applicationForm.types";
import { Schema } from "mongoose";
import { applicationFormPage1Schema } from "./applicationFormPage1Schema";
import { applicationFormPage2Schema } from "./applicationFormPage2Schema";
import { applicationFormPage3Schema } from "./applicationFormPage3Schema";
import { applicationFormPage4Schema } from "./applicationFormPage4Schema";
import { applicationFormPage5Schema } from "./applicationFormPage5Schema";

const applicationFormSchema = new Schema<IApplicationFormDoc>(
  {
    page1: {
      type: applicationFormPage1Schema,
      required: [true, "Page 1 data is required."],
    },
    page2: {
      type: applicationFormPage2Schema,
      default: undefined,
    },
    page3: {
      type: applicationFormPage3Schema,
      default: undefined,
    },
    page4: {
      type: applicationFormPage4Schema,
      default: undefined,
    },

    // Placeholder for future pages
    page5: { type: applicationFormPage5Schema, default: undefined },
  },
  {
    timestamps: true,
  }
);

export default applicationFormSchema;
