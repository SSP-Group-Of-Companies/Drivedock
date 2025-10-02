// src/app/api/v1/admin/onboarding/[id]/filled-pdf/personal-consent-cfroi/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { isValidObjectId } from "mongoose";
import { PDFDocument } from "pdf-lib";

import connectDB from "@/lib/utils/connectDB";
import { guard } from "@/lib/utils/auth/authUtils";
import { errorResponse } from "@/lib/utils/apiResponse";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import PoliciesConsents from "@/mongoose/models/PoliciesConsents";

import { getCompanyById } from "@/constants/companies";

import { buildPersonalConsentCfroiPayload, applyPersonalConsentCfroiPayloadToForm } from "@/lib/pdf/personal-consent-cfroi/mappers/personal-consent-cfroi.mapper";
import { EPersonalConsentCfroiFillableFormFields as F } from "@/lib/pdf/personal-consent-cfroi/mappers/personal-consent-cfroi.types";

import { drawPdfImage } from "@/lib/pdf/utils/drawPdfImage";
import { loadImageBytesFromAsset } from "@/lib/utils/s3Upload";
import { isInvitationApproved } from "@/lib/utils/onboardingUtils";

export const GET = async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId).lean();
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(onboardingDoc)) return errorResponse(400, "driver not yet approved for onboarding process");
    if (!onboardingDoc.status?.completed) return errorResponse(400, "Onboarding is not completed yet");

    // ----- Company
    const companyName = getCompanyById(onboardingDoc.companyId)?.name;
    if (!companyName) return errorResponse(400, "Company not recognized");

    // ----- ApplicationForm (page1) → names + DOB
    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId || !isValidObjectId(appFormId)) return errorResponse(400, "Driver application not found");

    const appForm = await ApplicationForm.findById(appFormId).select("page1.firstName page1.lastName page1.dob").lean();

    const firstName = (appForm as any)?.page1?.firstName?.toString().trim();
    const lastName = (appForm as any)?.page1?.lastName?.toString().trim();
    const dob = (appForm as any)?.page1?.dob as Date | undefined;

    if (!firstName || !lastName || !dob) {
      return errorResponse(400, "Applicant name or date of birth is missing");
    }

    const applicantFullName = [firstName, lastName].filter(Boolean).join(" ");

    // ----- Policies & Consents → signature + signedAt
    const policiesId = onboardingDoc.forms?.policiesConsents;
    if (!policiesId || !isValidObjectId(policiesId)) {
      return errorResponse(400, "Policies & Consents not found");
    }

    const policiesDoc = await PoliciesConsents.findById(policiesId).lean();
    const signedAt = policiesDoc?.signedAt;
    const signaturePhoto = policiesDoc?.signature;

    if (!signedAt || !signaturePhoto) {
      return errorResponse(400, "Signature or signed date missing in Policies & Consents");
    }

    // ----- Load fillable template
    const pdfPath = path.join(process.cwd(), "src/lib/pdf/personal-consent-cfroi/templates/personal-consent-cfroi-fillable.pdf");
    const pdfBytes = await readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const page = pdfDoc.getPages()[0]; // single page

    // ----- Build + apply payload
    const payload = buildPersonalConsentCfroiPayload({
      applicantFullName,
      companyName,
      applicantFirstName: firstName,
      applicantLastName: lastName,
      applicantDob: dob,
      footerDate: signedAt,
    });

    applyPersonalConsentCfroiPayloadToForm(form, payload);

    // ----- Draw Applicant Signature
    try {
      const sigBytes = await loadImageBytesFromAsset(signaturePhoto);
      await drawPdfImage({
        pdfDoc,
        form,
        page,
        fieldName: F.FOOTER_APPLICANT_SIGNATURE,
        imageBytes: sigBytes,
        width: 102,
        height: 30,
        yOffset: 0,
      });
    } catch (e) {
      console.warn("Failed to draw applicant signature:", e);
    }

    // ----- Flatten & return
    form.flatten();

    const out = await pdfDoc.save();
    const arrayBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="personal-consent-cfroi-filled.pdf"',
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
};
