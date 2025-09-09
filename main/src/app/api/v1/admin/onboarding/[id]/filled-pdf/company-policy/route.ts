// ======================================================================
// app/api/v1/admin/onboarding/[id]/filled-pdf/company-policy/route.ts
// ======================================================================

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

import { ESafetyAdminId, getSafetyAdminById } from "@/constants/safetyAdmins";
import { ECompanyId } from "@/constants/companies";

import { buildCompanyPolicyPayload, applyCompanyPolicyPayloadToForm, resolveCompanyPolicyTemplate } from "@/lib/pdf/company-policy/mappers/company-policy.mapper";
import { ECompanyPolicyFillableFormFields as F } from "@/lib/pdf/company-policy/mappers/company-policy.types";

import { drawPdfImage } from "@/lib/pdf/utils/drawPdfImage";
import { loadImageBytesFromPhoto } from "@/lib/utils/s3Upload";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    // safety admin (witness) REQUIRED
    const sp = req.nextUrl.searchParams;
    const safetyAdminId = sp.get("safetyAdminId") as ESafetyAdminId | null;
    if (!safetyAdminId) return errorResponse(400, "safetyAdminId is required");
    if (!Object.values(ESafetyAdminId).includes(safetyAdminId)) {
      return errorResponse(400, "Invalid safetyAdminId");
    }
    const safetyAdmin = getSafetyAdminById(safetyAdminId);
    if (!safetyAdmin) return errorResponse(400, "Safety admin not found");

    // Onboarding
    const onboarding = await OnboardingTracker.findById(onboardingId).lean();
    if (!onboarding) return errorResponse(404, "Onboarding document not found");
    if (!onboarding.status?.completed) return errorResponse(400, "Onboarding is not completed yet");

    const companyId = onboarding.companyId as ECompanyId | undefined;
    if (!companyId || !Object.values(ECompanyId).includes(companyId)) {
      return errorResponse(400, "invalid company ID");
    }

    // Application – names + TRUCK DETAILS (unit#, year, VIN)
    const appId = onboarding.forms?.driverApplication;
    if (!appId || !isValidObjectId(appId)) return errorResponse(404, "Driver application not found");

    const application = await ApplicationForm.findById(appId)
      .select(["page1.firstName", "page1.lastName", "page4.truckDetails.vin", "page4.truckDetails.year", "page4.truckDetails.truckUnitNumber"].join(" "))
      .lean();

    const first = (application as any)?.page1?.firstName?.toString().trim();
    const last = (application as any)?.page1?.lastName?.toString().trim();
    if (!first || !last) return errorResponse(400, "Applicant name missing");
    const driverFullName = [first, last].filter(Boolean).join(" ");

    // Truck details — all optional; fallback to empty strings in mapper
    const truckUnitNumber = (application as any)?.page4?.truckDetails?.truckUnitNumber?.toString().trim() || "";
    const truckYear = (application as any)?.page4?.truckDetails?.year?.toString().trim() || "";
    const truckVIN = (application as any)?.page4?.truckDetails?.vin?.toString().trim() || "";

    // Policies & Consents – driver signature is REQUIRED
    const polId = onboarding.forms?.policiesConsents;
    if (!polId || !isValidObjectId(polId)) return errorResponse(404, "Policies & Consents not found");
    const policies = await PoliciesConsents.findById(polId).lean();
    if (!policies?.signature) return errorResponse(400, "Driver signature is missing in Policies & Consents");

    const effectiveSignedAt: Date | string = (policies as any)?.signedAt || (onboarding as any)?.createdAt;

    // Load signatures (both REQUIRED)
    let driverSigBytes: Uint8Array;
    try {
      driverSigBytes = await loadImageBytesFromPhoto(policies.signature);
    } catch (e) {
      console.error("Error loading driver signature image:", e);
      return errorResponse(500, "Failed to load driver signature image");
    }

    let witnessSigBytes: Uint8Array;
    try {
      const adminAbsPath = path.join(process.cwd(), "src", safetyAdmin.signature);
      const buf = await fs.readFile(adminAbsPath);
      witnessSigBytes = new Uint8Array(buf);
    } catch (e) {
      console.error("Error loading safety admin signature image:", e);
      return errorResponse(500, "Safety admin signature image not found or unreadable");
    }

    // Template (by company)
    const pdfPath = resolveCompanyPolicyTemplate(companyId);
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages();

    // Build payload – includes truck details
    const payload = buildCompanyPolicyPayload({
      driverFullName,
      companyContactName: "SSP Truck Line Inc", // Pg1 (generic ok)
      witnessName: safetyAdmin.name,

      // dates
      ipassDate: effectiveSignedAt, // Pg16
      acknowledgementDate: effectiveSignedAt, // Pg4
      requirementsDate: effectiveSignedAt, // Pg11
      medicalWitnessDate: effectiveSignedAt, // Pg2
      finalAckDate: effectiveSignedAt, // Pg22

      // truck details (optional)
      ipassTruckNumber: truckUnitNumber, // -> IPASS_TRUCK_NUMBER (Pg16)
      speedTruckYear: truckYear, // -> SPEED_TRUCK_YEAR (Pg17)
      speedVIN: truckVIN, // -> SPEED_VIN (Pg17)

      // owner-operator name defaults to driverFullName if omitted
      ownerOperatorName: driverFullName,
    });

    applyCompanyPolicyPayloadToForm(form, payload);

    // Page indices (0-based). Webfreight has offsets.
    const isWebfreight = companyId === ECompanyId.WEB_FREIGHT;

    const idx = {
      mdDriver: 0, // page 1
      mdWitness: isWebfreight ? 0 : 1, // wf: page 1, others: page 2
      ackDriver: 3, // page 4
      reqBoth: 10, // page 11
      speedDriver: isWebfreight ? 15 : 16, // wf: page 16, others: page 17
      finalBoth: isWebfreight ? 20 : 21, // wf: page 21, others: page 22
    } as const;

    // Helper to draw signatures
    const draw = async (pageIndex: number, fieldName: F, bytes: Uint8Array, width = 120, height = 35) => {
      await drawPdfImage({
        pdfDoc,
        form,
        page: pages[pageIndex],
        fieldName,
        imageBytes: bytes,
        width,
        height,
        yOffset: 0,
      });
    };

    // Draw signatures
    await draw(idx.mdDriver, F.MD_DRIVER_SIGNATURE, driverSigBytes, 100, 28); // Pg1
    await draw(idx.mdWitness, F.MD_WITNESS_SIGNATURE, witnessSigBytes, 100, 28); // Pg2 or Pg1 (WF)
    await draw(idx.ackDriver, F.ACK_DRIVER_SIGNATURE, driverSigBytes, 53, 15); // Pg4
    await draw(idx.reqBoth, F.REQ_ACK_DRIVER_SIGNATURE, driverSigBytes, 100, 28); // Pg11
    await draw(idx.reqBoth, F.REQ_ACK_WITNESS_SIGNATURE, witnessSigBytes, 100, 28); // Pg11
    await draw(idx.speedDriver, F.SPEED_SIGNATURE, driverSigBytes, 71, 20); // Pg17 or Pg16 (WF)
    await draw(idx.finalBoth, F.FINAL_DRIVER_SIGNATURE, driverSigBytes, 53, 15); // Pg22 or Pg21 (WF)
    await draw(idx.finalBoth, F.FINAL_WITNESS_SIGNATURE, witnessSigBytes, 53, 15); // Pg22 or Pg21 (WF)

    form.flatten();
    const out = await pdfDoc.save();
    const arrayBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="company-policy-filled.pdf"',
      },
    });
  } catch (err) {
    console.error("company-policy/filled-pdf error:", err);
    return errorResponse(err);
  }
};
