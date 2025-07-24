import { Schema } from "mongoose";

export const applicationFormPage1Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    postalCode: { type: String, required: true },
    sin: { type: String, required: true },
    dob: { type: String, required: true },
    gender: { type: String, required: true },
    maritalStatus: { type: String, required: true },
    numberOfDependents: { type: Number, required: true },
    emergencyContactName: { type: String, required: true },
    emergencyContactPhone: { type: String, required: true },
    emergencyContactRelationship: { type: String, required: true },
  },
  { _id: false } // Prevents separate _id for subdocument
);
