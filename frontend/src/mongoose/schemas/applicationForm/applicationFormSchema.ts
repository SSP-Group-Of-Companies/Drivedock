import { IApplicationFormDoc } from "@/types/applicationForm.types";
import { Schema } from "mongoose";
import { applicationFormPage1Schema } from "./applicationFormPage1Schema";

const applicationFormSchema = new Schema<IApplicationFormDoc>(
  {
    currentPage: { type: Number, required: true, default: 1 },
    completedPages: { type: [Number], required: true, default: [] },

    page1: { type: applicationFormPage1Schema, required: true },

    page2: { type: Schema.Types.Mixed, default: {} },
    page3: { type: Schema.Types.Mixed, default: {} },
    page4: { type: Schema.Types.Mixed, default: {} },
    page5: { type: Schema.Types.Mixed, default: {} },
    page6: { type: Schema.Types.Mixed, default: {} },
    page7: { type: Schema.Types.Mixed, default: {} },
    page8: { type: Schema.Types.Mixed, default: {} },
    page9: { type: Schema.Types.Mixed, default: {} },
    page10: { type: Schema.Types.Mixed, default: {} },
    page11: { type: Schema.Types.Mixed, default: {} },
    page12: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

export default applicationFormSchema;
