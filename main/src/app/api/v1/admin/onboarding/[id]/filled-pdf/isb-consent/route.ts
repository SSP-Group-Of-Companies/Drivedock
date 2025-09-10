import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { isValidObjectId } from "mongoose";
import { PDFDocument } from "pdf-lib";

import connectDB from "@/lib/utils/connectDB";
import { guard } from "@/lib/auth/authUtils";
import { errorResponse } from "@/lib/utils/apiResponse";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import PoliciesConsents from "@/mongoose/models/PoliciesConsents";

import { getCompanyById } from "@/constants/companies";
import { ESafetyAdminId } from "@/constants/safetyAdmins";

import { EIsbConsentFillableFormFields as F } from "@/lib/pdf/isb-consent/mappers/isb-consent.types";
import { buildIsbConsentPayload, applyIsbConsentPayloadToForm } from "@/lib/pdf/isb-consent/mappers/isb-consent.mapper";

import { drawPdfImage } from "@/lib/pdf/utils/drawPdfImage";
import { loadImageBytesFromPhoto } from "@/lib/utils/s3Upload";
import { getSafetyAdminServerById } from "@/lib/assets/safetyAdmins/safetyAdmins.server";

/* ------------------------------ helpers ------------------------------ */

function composeCompanyCityCountry(company?: { location?: string; country?: string }) {
  if (!company) return "";
  const city = company.location?.split(",")[0]?.trim();
  const country = company.country?.trim();
  return [city, country].filter(Boolean).join(", ");
}

/** prefer cell, fallback home */
function pickPhone(page1: any): string | undefined {
  return (page1?.phoneCell || page1?.phoneHome || "").toString().trim() || undefined;
}

/* --------------------------------- GET -------------------------------- */

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    // safety admin (witness) requirement
    const safetyAdminId = req.nextUrl.searchParams.get("safetyAdminId") as ESafetyAdminId | null;
    if (!safetyAdminId) return errorResponse(400, "safetyAdminId is required");
    if (!Object.values(ESafetyAdminId).includes(safetyAdminId)) return errorResponse(400, "Invalid safetyAdminId");

    const safetyAdmin = getSafetyAdminServerById(safetyAdminId);
    if (!safetyAdmin) return errorResponse(400, "Safety admin not found");

    // Onboarding
    const onboarding = await OnboardingTracker.findById(onboardingId).lean();
    if (!onboarding) return errorResponse(404, "Onboarding document not found");
    if (!onboarding.status?.completed) return errorResponse(400, "Onboarding is not completed yet");

    // Company
    const company = getCompanyById(onboarding.companyId);
    if (!company) return errorResponse(400, "Company not recognized");

    // Application form (page1 + page4)
    const appId = onboarding.forms?.driverApplication;
    if (!appId || !isValidObjectId(appId)) return errorResponse(404, "Driver application missing");
    const application = await ApplicationForm.findById(appId)
      .select(
        "page1.firstName page1.lastName page1.gender page1.dob page1.email page1.phoneCell page1.phoneHome page1.birthCity page1.birthStateOrProvince page1.birthCountry page1.addresses page4.criminalRecords"
      )
      .lean();

    if (!application) return errorResponse(404, "Driver application not found");

    const page1 = application.page1;
    const page4 = application.page4;

    if (!page1) return errorResponse(404, "Application form Page 1 not found");

    const firstName = page1.firstName?.toString().trim();
    const lastName = page1.lastName?.toString().trim();
    const dob = page1.dob as Date | undefined;
    if (!firstName || !lastName || !dob) {
      return errorResponse(400, "Applicant name or DOB missing");
    }

    // Policies & Consents (for applicant signature + date)
    const polId = onboarding.forms?.policiesConsents;
    if (!polId || !isValidObjectId(polId)) return errorResponse(404, "Policies & Consents missing");
    const policies = await PoliciesConsents.findById(polId).lean();
    if (!policies?.signature || !policies?.signedAt) {
      return errorResponse(400, "Policies & Consents signature or date missing");
    }

    // Build payload
    const companyCityCountry = composeCompanyCityCountry(company);

    const payload = buildIsbConsentPayload({
      companyName: company.name,
      companyCityCountry,
      firstName,
      lastName,
      middleNames: "", // not captured on page1
      surnameAtBirth: lastName,
      formerNames: "", // not captured

      birthCity: page1.birthCity,
      birthProvince: page1.birthStateOrProvince,
      birthCountry: page1.birthCountry,
      dob,
      gender: page1.gender,

      phone: pickPhone(page1),
      email: page1.email,

      addresses: page1.addresses as any[],
      consentSignedAt: policies.signedAt,

      criminalRecords: (page4?.criminalRecords as any[]) || [],

      // Signed-at city/province → use current address
      signedAtCity: page1.addresses?.[page1.addresses.length - 1]?.city || undefined,
      signedAtProvince: page1.addresses?.[page1.addresses.length - 1]?.stateOrProvince || undefined,
    });

    // Load template
    const pdfPath = path.join(process.cwd(), "src/lib/pdf/isb-consent/templates/isb-consent-fillable.pdf");
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages(); // expect 2 pages: [0]=Consent, [1]=Declaration

    // Apply text + checkbox payload
    applyIsbConsentPayloadToForm(form, payload);

    // Signatures
    const tasks: Promise<void>[] = [];
    const sigWidth = 78;
    const sigHeight = 20;

    // Applicant signature (Consent page)
    try {
      const sigBytes = await loadImageBytesFromPhoto(policies.signature);
      tasks.push(
        drawPdfImage({
          pdfDoc,
          form,
          page: pages[0], // Consent page
          fieldName: F.AUTH_APPLICANT_SIGNATURE,
          imageBytes: sigBytes,
          width: sigWidth,
          height: sigHeight,
          yOffset: 0,
        })
      );

      // Declaration signature (Declaration page)
      tasks.push(
        drawPdfImage({
          pdfDoc,
          form,
          page: pages[1],
          fieldName: F.DECL_APPLICANT_SIGNATURE,
          imageBytes: sigBytes,
          width: sigWidth,
          height: sigHeight,
          yOffset: 0,
        })
      );
    } catch (e) {
      console.warn("Applicant signature draw failed:", e);
    }

    // Witness signature (Consent page, Section D)
    try {
      const adminBytes = new Uint8Array(await fs.readFile(safetyAdmin.signatureAbsPath));
      tasks.push(
        drawPdfImage({
          pdfDoc,
          form,
          page: pages[0],
          fieldName: F.WITNESS_SIGNATURE,
          imageBytes: adminBytes,
          width: sigWidth,
          height: sigHeight,
          yOffset: 0,
        })
      );
      // Write witness printed name
      try {
        form.getTextField(F.WITNESS_NAME).setText(safetyAdmin.name);
      } catch {}
    } catch (e) {
      console.warn("Witness signature draw failed:", e);
    }

    await Promise.all(tasks);

    // Flatten & return
    form.flatten();
    const out = await pdfDoc.save();
    const arrayBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="isb-consent-filled.pdf"',
      },
    });
  } catch (err) {
    console.error("isb-consent/filled-pdf error:", err);
    return errorResponse(err);
  }
};
