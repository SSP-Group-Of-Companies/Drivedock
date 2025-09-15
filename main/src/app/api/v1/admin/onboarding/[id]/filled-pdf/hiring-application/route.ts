// ======================================================================
// app/api/v1/admin/onboarding/[id]/hiring-application/filled-pdf/route.ts
// ======================================================================

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { isValidObjectId } from "mongoose";
import { PDFDocument } from "pdf-lib";

import connectDB from "@/lib/utils/connectDB";
import { guard } from "@/lib/auth/authUtils";
import { errorResponse } from "@/lib/utils/apiResponse";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import PoliciesConsents from "@/mongoose/models/PoliciesConsents";
import PreQualifications from "@/mongoose/models/Prequalifications";

import { drawPdfImage } from "@/lib/pdf/utils/drawPdfImage";
import { loadImageBytesFromAsset } from "@/lib/utils/s3Upload";

import { buildHiringApplicationFieldMap, resolveHiringTemplate } from "@/lib/pdf/hiring-application/mappers/hiring-application.mapper";
import { EDriverApplicationFillableFormFields as F } from "@/lib/pdf/hiring-application/mappers/hiring-application.types";

import { ESafetyAdminId } from "@/constants/safetyAdmins";
import { ECompanyId } from "@/constants/companies";
import { getSafetyAdminServerById } from "@/lib/assets/safetyAdmins/safetyAdmins.server";

// ----------------------------------------------------------------------

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    // ------- Params & query
    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    const searchParams = req.nextUrl.searchParams;
    const safetyAdminId = searchParams.get("safetyAdminId") as ESafetyAdminId | null;
    if (!safetyAdminId) return errorResponse(400, "safetyAdminId is required");
    if (!Object.values(ESafetyAdminId).includes(safetyAdminId)) {
      return errorResponse(400, "Invalid safetyAdminId");
    }

    const safetyAdmin = getSafetyAdminServerById(safetyAdminId);
    if (!safetyAdmin) return errorResponse(400, "Safety admin not found");

    // ------- Load Onboarding (fail fast if missing)
    const onboarding = await OnboardingTracker.findById(onboardingId).lean();
    if (!onboarding) return errorResponse(404, "Onboarding document not found");
    if (!onboarding.status.completed) return errorResponse(400, "Onboarding is not yet completed");

    const companyId = onboarding.companyId as ECompanyId | undefined;
    if (!companyId || !Object.values(ECompanyId).includes(companyId)) return errorResponse(400, "invalid company ID");

    // ------- Resolve referenced form IDs
    const appFormId = onboarding.forms?.driverApplication;
    const policiesId = onboarding.forms?.policiesConsents;
    const preQualId = onboarding.forms?.preQualification;

    if (!appFormId) return errorResponse(404, "Onboarding.forms.driverApplication is missing");
    if (!policiesId) return errorResponse(404, "Onboarding.forms.policiesConsents is missing");

    // ------- Load required docs (IMPORTANT: do NOT use .lean() so we can materialize virtuals)
    const [application, policies, prequals] = await Promise.all([
      ApplicationForm.findById(appFormId),
      PoliciesConsents.findById(policiesId),
      preQualId ? PreQualifications.findById(preQualId) : Promise.resolve(null),
    ]);

    if (!application) return errorResponse(404, "Application form document not found");
    if (!policies) return errorResponse(404, "Policies & Consents document not found");

    // ------- Resolve and load template (company-based)
    const templatePath = resolveHiringTemplate(companyId);
    const pdfBytes = await fs.readFile(templatePath);

    // ------- Prepare driver & admin signature bytes
    let driverSignatureBytes: Uint8Array | undefined;
    if (policies?.signature) {
      try {
        driverSignatureBytes = await loadImageBytesFromAsset(policies.signature);
      } catch (e) {
        console.warn("Driver signature load failed:", e);
      }
    }

    let adminSignatureBytes: Uint8Array | undefined;
    try {
      adminSignatureBytes = new Uint8Array(await fs.readFile(safetyAdmin.signatureAbsPath));
    } catch (e) {
      console.warn("Safety admin signature load failed:", e);
    }

    // ------- Build field map (handles all text/checkbox values & date policy)
    const fieldMap = buildHiringApplicationFieldMap({
      onboarding,
      application,
      prequals: prequals ?? null,
      policies: policies ?? null,
      safetyAdmin, // witness name usage
    });

    // ------- Fill PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages();

    // Helpers -----------------------------------------------------------
    const trySetText = (name: string, text: string) => {
      try {
        form.getTextField(name).setText(text);
        return true;
      } catch {
        return false;
      }
    };

    const trySetCheckbox = (name: string, on: boolean) => {
      try {
        const cb = form.getCheckBox(name);
        if (on) cb.check();
        else cb.uncheck();
        cb.updateAppearances();
        return true;
      } catch {
        return false;
      }
    };

    const setFromValue = (name: string, value: unknown) => {
      if (value == null) return;

      if (typeof value === "boolean") {
        if (trySetCheckbox(name, value)) return;
        if (value) trySetText(name, "Yes");
        return;
      }

      if (typeof value === "string") {
        if (value !== "") {
          if (trySetText(name, value)) return;
        }
        if (value) trySetCheckbox(name, true);
        return;
      }

      trySetText(name, String(value));
    };

    for (const [fieldName, val] of Object.entries(fieldMap)) {
      setFromValue(fieldName, val as any);
    }

    // ------- Signature drawing ----------------------------------------
    const draw = async (pageIndex: number, fieldName: F, bytes?: Uint8Array, width = 64, height = 20, yOffset = 0) => {
      if (!bytes) return; // returns a resolved Promise<void> since this is async
      try {
        const page = pages[pageIndex];
        await drawPdfImage({
          pdfDoc,
          form,
          page,
          fieldName,
          imageBytes: bytes,
          width,
          height,
          yOffset,
        });
      } catch (e) {
        console.warn(`Signature draw failed for ${fieldName}:`, e);
      }
    };

    // Queue all draw tasks (conditional ones included)
    const tasks: Array<Promise<void>> = [];

    const pushDraw = (pageIndex: number, fieldName: F, bytes?: Uint8Array, width?: number, height?: number, yOffset?: number) => {
      // Always push; `draw` will no-op if bytes is missing and still return a resolved Promise
      tasks.push(draw(pageIndex, fieldName, bytes, width, height, yOffset));
    };

    // Page indexes assume a 12-page PDF: 0..11
    // Page 2
    pushDraw(1, F.ACKNOWLEDGEMENT_SIGNATURE, driverSignatureBytes);

    // Page 5
    pushDraw(4, F.HOS_SIGNATURE, driverSignatureBytes);

    // Page 6
    pushDraw(5, F.DECLARATION_SIGNATURE, driverSignatureBytes);
    pushDraw(5, F.COMPLIANCE_DRIVER_SIGNATURE, driverSignatureBytes);

    // Page 7
    pushDraw(6, F.DRIVER_RIGHTS_SIGNATURE, driverSignatureBytes);

    // Page 8 (driver + witness)
    pushDraw(7, F.MEDICAL_DECLARATION_SIGNATURE, driverSignatureBytes);
    pushDraw(7, F.MEDICAL_DECLARATION_WITNESS_SIGNATURE, adminSignatureBytes);

    // Page 9
    pushDraw(8, F.DRUG_NOTICE_DRIVER_SIGNATURE, driverSignatureBytes);

    // Page 10 (driver + witness + two additional driver sigs)
    pushDraw(9, F.DRUG_RECEIPT_SIGNATURE, driverSignatureBytes);
    pushDraw(9, F.DRUG_RECEIPT_WITNESS_SIGNATURE, adminSignatureBytes);
    pushDraw(9, F.TRAILER_SEAL_SIGNATURE, driverSignatureBytes);
    pushDraw(9, F.TRAILER_CERTIFICATION_SIGNATURE, driverSignatureBytes);

    // Page 11
    pushDraw(10, F.COMPETENCY_SIGNATURE, driverSignatureBytes);

    // Page 12
    pushDraw(11, F.COMP_ACK_SIGNATURE, driverSignatureBytes);
    const hasAccidentalInsurance = application.page4?.hasAccidentalInsurance === true;
    if (hasAccidentalInsurance) {
      pushDraw(11, F.INSURANCE_SIGNATURE, driverSignatureBytes);
    }

    // Perform all the queued draws
    await Promise.all(tasks);

    // ------- Finalize
    form.flatten();
    const out = await pdfDoc.save();
    const arrayBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="hiring-application-${onboardingId}.pdf"`,
      },
    });
  } catch (err) {
    console.error("hiring-application/filled-pdf error:", err);
    return errorResponse(err);
  }
};
