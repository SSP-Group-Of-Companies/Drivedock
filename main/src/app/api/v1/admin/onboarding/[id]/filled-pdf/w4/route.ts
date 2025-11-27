import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { isValidObjectId } from "mongoose";
import { PDFDocument } from "pdf-lib";

import connectDB from "@/lib/utils/connectDB";
import { guard } from "@/lib/utils/auth/authUtils";
import { errorResponse } from "@/lib/utils/apiResponse";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import PoliciesConsents from "@/mongoose/models/PoliciesConsents";

import { getCompanyById } from "@/constants/companies";

import { buildW4Payload, applyW4PayloadToForm } from "@/lib/pdf/w4/mappers/w4.mapper";
import { EW4FillableFormFields as F } from "@/lib/pdf/w4/mappers/w4.types";

import { drawPdfImage } from "@/lib/pdf/utils/drawPdfImage";
import { loadImageBytesFromAsset } from "@/lib/utils/s3Upload";
import { hasCompletedStep, isInvitationApproved } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";
import { ECountryCode } from "@/types/shared.types";

/* --------------------------------- GET -------------------------------- */

export const GET = async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    // Onboarding tracker
    const onboarding = await OnboardingTracker.findById(onboardingId);
    if (!onboarding) return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(onboarding)) {
      return errorResponse(400, "driver not yet approved for onboarding process");
    }
    if (!hasCompletedStep(onboarding, EStepPath.POLICIES_CONSENTS)) {
      return errorResponse(400, `Step ${EStepPath.POLICIES_CONSENTS} not yet completed`);
    }

    // Company
    const companyId = onboarding.companyId;
    const company = companyId ? getCompanyById(companyId) : null;
    if (!company) return errorResponse(400, "Company not recognized");
    if (company.countryCode !== ECountryCode.US) return errorResponse(400, "W-4 is only for US-based companies");

    // Application form (Page 1 only, but we need the full subdocument so we
    // do NOT use .lean() – this keeps the `sin` virtual available)
    const appId = onboarding.forms?.driverApplication;
    if (!appId || !isValidObjectId(appId)) {
      return errorResponse(404, "Driver application missing");
    }

    const application = await ApplicationForm.findById(appId).select("page1").exec();

    if (!application || !application.page1) {
      return errorResponse(404, "Application form Page 1 not found");
    }

    const page1: any = application.page1;

    const firstName = page1.firstName?.toString().trim();
    const lastName = page1.lastName?.toString().trim();
    const dob = page1.dob as Date | undefined;

    if (!firstName || !lastName || !dob) {
      return errorResponse(400, "Applicant name or DOB missing");
    }

    // SSN: we can reuse the decrypted SIN virtual for US applicants.
    // `page1.sin` is a virtual defined on the schema.
    const ssn = typeof page1.sin === "string" ? page1.sin : undefined;

    // Policies & Consents – for employee signature + date
    const polId = onboarding.forms?.policiesConsents;
    if (!polId || !isValidObjectId(polId)) {
      return errorResponse(404, "Policies & Consents missing");
    }

    const policies = await PoliciesConsents.findById(polId).lean();
    if (!policies?.signature || !policies?.signedAt) {
      return errorResponse(400, "Policies & Consents signature or date missing");
    }

    // First date of employment:
    // - if onboarding is completed → use completionDate
    // - otherwise → use onboarding.createdAt
    const firstDateOfEmployment = (onboarding.status as any)?.completionDate || onboarding.createdAt;

    // Build W-4 payload
    const payload = buildW4Payload({
      firstName,
      lastName,
      // We don't currently collect middle initial; leave blank.
      middleInitial: undefined,
      ssn,
      addresses: page1.addresses as any[],

      // Filing status not yet wired – all checkboxes will be false by default.
      filingStatus: undefined,

      signedAt: policies.signedAt,

      employerName: company.name,
      employerAddressLine: company.location,
      firstDateOfEmployment,

      // EIN intentionally left undefined for now; we keep the field in types
      employerEin: undefined,
    });

    // Load W-4 template (single page)
    const pdfPath = path.join(process.cwd(), "src/lib/pdf/w4/templates/w4-2023-fillable.pdf");
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const [page] = pdfDoc.getPages(); // W-4 is a single page

    // Apply text + checkbox payload
    applyW4PayloadToForm(form, payload);

    // Draw employee signature on Step 5 (same signature as PoliciesConsents)
    try {
      const sigBytes = await loadImageBytesFromAsset(policies.signature);
      const sigWidth = 120;
      const sigHeight = 24;

      await drawPdfImage({
        pdfDoc,
        form,
        page,
        fieldName: F.STEP5_EMPLOYEE_SIGNATURE,
        imageBytes: sigBytes,
        width: sigWidth,
        height: sigHeight,
        yOffset: 0,
      });
    } catch (e) {
      console.warn("W4: employee signature draw failed:", e);
    }

    // Flatten & return
    form.flatten();
    const out = await pdfDoc.save();
    const arrayBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="w4-filled.pdf"',
      },
    });
  } catch (err) {
    console.error("w4/filled-pdf error:", err);
    return errorResponse(err);
  }
};
