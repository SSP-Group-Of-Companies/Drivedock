// src/app/api/v1/admin/onboarding/[id]/filled-pdf/psp-authorization/route.ts
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

import { EPspAuthorizationFillableFormFields as F } from "@/lib/pdf/psp-authorization/mappers/psp-authorization.types";
import { buildPspAuthorizationPayload, applyPspAuthorizationPayloadToForm } from "@/lib/pdf/psp-authorization/mappers/psp-authorization.mapper";

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

    // ----- Applicant name (print) from ApplicationForm.page1
    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId || !isValidObjectId(appFormId)) return errorResponse(400, "Driver application not found");
    const appForm = await ApplicationForm.findById(appFormId).select("page1.firstName page1.lastName").lean();

    const firstName = (appForm as any)?.page1?.firstName?.toString().trim();
    const lastName = (appForm as any)?.page1?.lastName?.toString().trim();
    if (!firstName || !lastName) return errorResponse(400, "Applicant name is missing");
    const applicantFullName = [firstName, lastName].filter(Boolean).join(" ");

    // ----- Signature + date from Policies & Consents
    const policiesId = onboardingDoc.forms?.policiesConsents;
    if (!policiesId || !isValidObjectId(policiesId)) return errorResponse(400, "Policies & Consents not found");

    const policiesDoc = await PoliciesConsents.findById(policiesId).lean();
    const signedAt = policiesDoc?.signedAt;
    const signaturePhoto = policiesDoc?.signature;
    if (!signedAt || !signaturePhoto) return errorResponse(400, "Signature or signed date missing in Policies & Consents");

    // ----- Load fillable template
    const pdfPath = path.join(process.cwd(), "src/lib/pdf/psp-authorization/templates/psp-authorization-fillable.pdf");
    const pdfBytes = await readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const page2 = pdfDoc.getPages()[1]; // second page

    // ----- Build + apply payload
    const payload = buildPspAuthorizationPayload({
      companyName,
      applicantFullName,
      footerDate: signedAt,
    });
    applyPspAuthorizationPayloadToForm(form, payload);

    // ----- Draw Applicant Signature (footer)
    try {
      const sigBytes = await loadImageBytesFromAsset(signaturePhoto);
      await drawPdfImage({
        pdfDoc,
        form,
        page: page2,
        fieldName: F.FOOTER_SIGNATURE,
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
        "Content-Disposition": 'inline; filename="psp-authorization-filled.pdf"',
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
};
