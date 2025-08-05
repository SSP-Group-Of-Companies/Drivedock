// src/lib/frontendConfigs/applicationFormConfigs/page1Config.ts
"use client";

import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { FormPageConfig } from "@/lib/frontendConfigs/formPageConfig.types";
import { IPreQualifications } from "@/types/preQualifications.types";
import { IOnboardingTracker } from "@/types/onboardingTracker.type"; // ✅ Import Tracker Type

// Extend FormPageConfig to support tracker-aware FormData building
type Page1FormPageConfig = FormPageConfig<ApplicationFormPage1Schema> & {
  buildFormData: (
    values: ApplicationFormPage1Schema,
    prequalifications: IPreQualifications,
    companyId: string,
    tracker?: IOnboardingTracker // ✅ Optional tracker for PATCH
  ) => FormData;
};

export const page1Config: Page1FormPageConfig = {
  validationFields: (values) => {
    const fields: string[] = [
      "firstName",
      "lastName",
      "sin",
      "sinPhoto",
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
    values: ApplicationFormPage1Schema,
    prequalifications: IPreQualifications,
    companyId: string,
    tracker?: IOnboardingTracker // ✅ Optional for PATCH
  ) => {
    const formData = new FormData();

    // Upload SIN photo
    if (values.sinPhoto instanceof File) {
      formData.append("sinPhoto", values.sinPhoto);
    }

    // Upload license 0 photos
    const firstLicense = values.licenses?.[0];
    if (firstLicense?.licenseFrontPhoto instanceof File) {
      formData.append("license_0_front", firstLicense.licenseFrontPhoto);
    }
    if (firstLicense?.licenseBackPhoto instanceof File) {
      formData.append("license_0_back", firstLicense.licenseBackPhoto);
    }

    // Clean license array for JSON
    const licensesCleaned = values.licenses.map((license) => {
      const licenseCopy = structuredClone(license) as Partial<typeof license>;
      delete licenseCopy.licenseFrontPhoto;
      delete licenseCopy.licenseBackPhoto;
      return licenseCopy;
    });

    const cleanedPayload = {
      ...values,
      sin: values.sin?.replace(/\D/g, "") || "",
      licenses: licensesCleaned,
    };

    // Remove sinPhoto from JSON payload since it's handled as file
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sinPhoto, ...payloadWithoutSinPhoto } = cleanedPayload;

    // Append FormData
    formData.append("page1", JSON.stringify(payloadWithoutSinPhoto));
    
    // Only include prequalifications and companyId for initial POST
    if (!tracker) {
      formData.append("prequalifications", JSON.stringify(prequalifications));
      formData.append("companyId", companyId);
    }

    return formData;
  },

  nextRoute: "/onboarding/[id]/application-form/page-2",
};
