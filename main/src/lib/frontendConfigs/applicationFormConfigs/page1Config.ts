"use client";

import { IApplicationFormPage1 } from "@/types/applicationForm.types";
import { IPreQualifications } from "@/types/preQualifications.types";

export const page1Config = {
  validationFields: (values: IApplicationFormPage1) => {
    const fields: string[] = [
      "firstName",
      "lastName",
      "sin",
      "dob",
      "phoneHome",
      "phoneCell",
      "canProvideProofOfAge",
      "email",
      "emergencyContactName",
      "emergencyContactPhone",
      "birthCity",
      "birthCountry",
      "birthStateOrProvince",
      "licenses",
      "addresses",
    ];

    values.licenses?.forEach((_, index) => {
      fields.push(`licenses.${index}.licenseNumber`);
      fields.push(`licenses.${index}.licenseStateOrProvince`);
      fields.push(`licenses.${index}.licenseExpiry`);
      if (index === 0) {
        fields.push(`licenses.${index}.licenseFrontPhoto`);
        fields.push(`licenses.${index}.licenseBackPhoto`);
      }
    });

    values.addresses?.forEach((_, index) => {
      fields.push(`addresses.${index}.address`);
      fields.push(`addresses.${index}.city`);
      fields.push(`addresses.${index}.stateOrProvince`);
      fields.push(`addresses.${index}.postalCode`);
      fields.push(`addresses.${index}.from`);
      fields.push(`addresses.${index}.to`);
    });

    return fields;
  },

  buildFormData: (
    values: IApplicationFormPage1,
    prequalifications: IPreQualifications,
    companyId: string
  ) => {
    const formData = new FormData();

    // Handle license photos (only for the first license)
    const firstLicense = values.licenses?.[0];
    if (firstLicense?.licenseFrontPhoto instanceof File) {
      formData.append("license_0_front", firstLicense.licenseFrontPhoto);
    }
    if (firstLicense?.licenseBackPhoto instanceof File) {
      formData.append("license_0_back", firstLicense.licenseBackPhoto);
    }

    // Clean license payload
    const licensesCleaned = values.licenses.map((license) => {
      const licenseCopy = structuredClone(license) as Partial<typeof license>;
      delete licenseCopy.licenseFrontPhoto;
      delete licenseCopy.licenseBackPhoto;
      return licenseCopy;
    });

    const payload = {
      ...values,
      licenses: licensesCleaned,
      sin: values.sin?.replace(/\D/g, "") || "",
    };

    formData.append("applicationFormPage1", JSON.stringify(payload));
    formData.append("prequalifications", JSON.stringify(prequalifications));
    formData.append("companyId", companyId);

    return formData;
  },

  nextRoute: "/form/application-form/page-2",
};
