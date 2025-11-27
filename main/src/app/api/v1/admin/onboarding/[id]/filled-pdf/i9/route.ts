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
import { ESafetyAdminId } from "@/constants/safetyAdmins";
import { getSafetyAdminServerById } from "@/lib/assets/safetyAdmins/safetyAdmins.server";

import { hasCompletedStep, isInvitationApproved } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";

import { drawPdfImage } from "@/lib/pdf/utils/drawPdfImage";
import { loadImageBytesFromAsset } from "@/lib/utils/s3Upload";
import { decryptString } from "@/lib/utils/cryptoUtils";

import { EImmigrationStatusUS, EPrPermitDocumentType } from "@/types/applicationForm.types";

import { buildI9Payload, applyI9PayloadToForm } from "@/lib/pdf/i9/mappers/i9.mapper";
import { EI9FillableFormFields as F } from "@/lib/pdf/i9/mappers/i9.types";
import { ECountryCode } from "@/types/shared.types";

/* ------------------------------ helpers ------------------------------ */

function splitStreetLine(line?: string) {
  const out = { street: "", apt: "" };
  if (!line) return out;

  // naive split; good enough for I-9
  const aptMatch = line.match(/\b(?:Apt\.?|Apartment|Unit|Suite|#)\s*([A-Za-z0-9\-]+.*)$/i);
  let street = line;
  if (aptMatch) {
    out.apt = aptMatch[0].trim();
    street = street.replace(aptMatch[0], "").trim();
  }

  out.street = street.trim();
  return out;
}

function pickCurrentAddress(addresses: any[] | undefined) {
  if (!addresses || !addresses.length) return undefined;

  // same sort logic as ISB consent: latest "to" is current
  const sorted = [...addresses].sort((a, b) => {
    const ta = a.to ? new Date(a.to as any).getTime() : 0;
    const tb = b.to ? new Date(b.to as any).getTime() : 0;
    return ta - tb;
  });

  return sorted[sorted.length - 1];
}

function humanizeEnumValue(value?: string | null): string {
  if (!value) return "";
  return value
    .toString()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * For the employer address, we just use `company.location` since it already
 * includes street, city, state, ZIP.
 */
function buildEmployerAddress(company: { location: string }): string {
  return company.location;
}

/* --------------------------------- GET -------------------------------- */

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    const safetyAdminId = req.nextUrl.searchParams.get("safetyAdminId") as ESafetyAdminId | null;
    if (!safetyAdminId) return errorResponse(400, "safetyAdminId is required");
    if (!Object.values(ESafetyAdminId).includes(safetyAdminId)) {
      return errorResponse(400, "Invalid safetyAdminId");
    }

    const safetyAdmin = getSafetyAdminServerById(safetyAdminId);
    if (!safetyAdmin) return errorResponse(400, "Safety admin not found");

    const onboarding = await OnboardingTracker.findById(onboardingId).lean();
    if (!onboarding) return errorResponse(404, "Onboarding document not found");

    if (!isInvitationApproved(onboarding)) {
      return errorResponse(400, "driver not yet approved for onboarding process");
    }

    if (!hasCompletedStep(onboarding, EStepPath.POLICIES_CONSENTS)) {
      return errorResponse(400, `Step ${EStepPath.POLICIES_CONSENTS} not yet completed`);
    }

    const company = onboarding.companyId ? getCompanyById(onboarding.companyId) : null;
    if (!company) return errorResponse(400, "Company not recognized");
    if (company.countryCode !== ECountryCode.US) return errorResponse(400, "I-9 is only for US-based companies");

    /* --------------------------- Application form ------------------------ */

    const appId = onboarding.forms?.driverApplication;
    if (!appId || !isValidObjectId(appId)) {
      return errorResponse(404, "Driver application missing");
    }

    const application = await ApplicationForm.findById(appId)
      .select(
        [
          // Page 1
          "page1.firstName",
          "page1.lastName",
          "page1.dob",
          "page1.email",
          "page1.phoneCell",
          "page1.phoneHome",
          "page1.addresses",
          "page1.sinEncrypted",
          "page1.licenses",
          "page1.middleName",
          "page1.otherLastNames",

          // Page 4
          "page4.immigrationStatusInUS",
          "page4.passportDetails",
          "page4.prPermitCitizenshipDetails",
          "page4.medicalCertificateDetails",
        ].join(" ")
      )
      .lean();

    if (!application) return errorResponse(404, "Driver application not found");

    const page1: any = application.page1;
    const page4: any = application.page4 || {};

    if (!page1) return errorResponse(404, "Application form Page 1 not found");

    const firstName = page1.firstName?.toString().trim();
    const lastName = page1.lastName?.toString().trim();
    const dob = page1.dob as Date | undefined;

    if (!firstName || !lastName || !dob) {
      return errorResponse(400, "Applicant name or DOB missing");
    }

    // Decrypt SIN to use as SSN
    let ssn: string | undefined;
    if (page1.sinEncrypted) {
      try {
        ssn = decryptString(page1.sinEncrypted);
      } catch {
        ssn = undefined;
      }
    }

    // Current address from history
    const currAddr = pickCurrentAddress(page1.addresses as any[]);
    const addrParts = splitStreetLine(currAddr?.address);
    const addressBits = {
      street: addrParts.street,
      apt: addrParts.apt,
      city: currAddr?.city || "",
      state: currAddr?.stateOrProvince || "",
      zip: currAddr?.postalCode || "",
    };

    // Contact phone: prefer cell
    const phone = (page1.phoneCell || page1.phoneHome || "").toString().trim() || undefined;

    /* ---------------- Section 1: immigration status → checkboxes -------- */

    const status = page4.immigrationStatusInUS as EImmigrationStatusUS | undefined;

    const statusUsCitizen = status === EImmigrationStatusUS.CITIZEN;
    const statusNonCitizenNational = status === EImmigrationStatusUS.NON_CITIZEN_NATIONAL;
    const statusLpr = status === EImmigrationStatusUS.PERMANENT_RESIDENT;
    const statusAlienAuthorized = status === EImmigrationStatusUS.NON_CITIZEN;

    // Foreign passport info (only for status #4)
    let foreignPassportInfo: string | undefined;
    if (statusAlienAuthorized && page4.passportDetails) {
      const p = page4.passportDetails;
      const num = p.documentNumber || "";
      const country = p.countryOfIssue || "";
      if (num || country) {
        foreignPassportInfo = [num, country].filter(Boolean).join(" / ");
      }
    }

    /* --------------------- Section 2: documents (List A/B/C) ------------- */

    // List A – Document 1: passport OR PR/permit/citizenship
    let listADoc1: {
      title: string;
      issuer?: string;
      number?: string;
      expiry?: Date | string;
    } | null = null;

    if (page4.passportDetails) {
      const p = page4.passportDetails;
      listADoc1 = {
        title: "Passport",
        issuer: p.issuingAuthority || p.countryOfIssue,
        number: p.documentNumber,
        expiry: p.expiryDate,
      };
    } else if (page4.prPermitCitizenshipDetails) {
      const pr = page4.prPermitCitizenshipDetails;
      listADoc1 = {
        title: humanizeEnumValue(pr.documentType || EPrPermitDocumentType.WORK_PERMIT) || "Immigration document",
        issuer: pr.issuingAuthority || pr.countryOfIssue,
        number: pr.documentNumber,
        expiry: pr.expiryDate,
      };
    }

    if (!listADoc1) {
      // Per your spec: must have either passport or PR/permit details
      return errorResponse(400, "Passport or PR/Permit/Citizenship details are required for I-9 (List A, Document 1).");
    }

    // List A – Document 2: medical certificate (optional)
    let listADoc2;
    if (page4.medicalCertificateDetails) {
      const m = page4.medicalCertificateDetails;
      listADoc2 = {
        title: "Medical Certificate",
        issuer: m.issuingAuthority,
        number: m.documentNumber,
        expiry: m.expiryDate,
      };
    }

    // List B – SSN
    const listBDoc = ssn
      ? {
          title: "SSN",
          issuer: "SSA", // Social Security Administration
          number: ssn,
          expiry: undefined,
        }
      : undefined;

    // List C – driver's license (first entry)
    const primaryLicense = Array.isArray(page1.licenses) && page1.licenses.length > 0 ? page1.licenses[0] : null;

    const listCDoc = primaryLicense
      ? {
          title: "Driver's License",
          issuer: primaryLicense.licenseStateOrProvince,
          number: primaryLicense.licenseNumber,
          expiry: primaryLicense.licenseExpiry,
        }
      : undefined;

    /* ---------------------- Policies & Consents (signature) -------------- */

    const polId = onboarding.forms?.policiesConsents;
    if (!polId || !isValidObjectId(polId)) {
      return errorResponse(404, "Policies & Consents missing");
    }

    const policies = await PoliciesConsents.findById(polId).lean();
    if (!policies?.signature || !policies?.signedAt) {
      return errorResponse(400, "Policies & Consents signature or date missing");
    }

    /* ---------------------- First day of employment ---------------------- */

    const firstDayOfEmployment: Date = onboarding.status?.completed && onboarding.status?.completionDate ? (onboarding.status.completionDate as Date) : (onboarding.createdAt as Date);

    // Employer rep date is "Today's Date"
    const employerRepSignedDate = new Date();

    const employerBusinessAddress = buildEmployerAddress(company);
    const employerRepNameTitle = safetyAdmin.name; // you only keep name, no title

    /* --------------------------- Build I-9 payload ----------------------- */

    const payload = buildI9Payload({
      // Section 1
      lastName,
      firstName,
      middleInitial: page1.middleName ? String(page1.middleName).trim().charAt(0) : "",
      otherLastNames: page1.otherLastNames,
      address: addressBits,
      dob,
      ssn,
      email: page1.email,
      phone,

      statusUsCitizen,
      statusNonCitizenNational,
      statusLpr,
      statusAlienAuthorized,
      foreignPassportInfo,
      employeeSignedDate: policies.signedAt,

      // Section 2
      listADoc1,
      listADoc2,
      listBDoc,
      listCDoc,
      employerRepNameTitle,
      employerRepSignedDate,
      firstDayOfEmployment,
      employerBusinessName: company.name,
      employerBusinessAddress,

      // Supplement A – top row
      supALastName: lastName,
      supAFirstName: firstName,
      supAMiddleInitial: page1.middleName ? String(page1.middleName).trim().charAt(0) : "",
    });

    /* ----------------------------- Load template ------------------------- */

    const pdfPath = path.join(process.cwd(), "src/lib/pdf/i9/templates/i9-fillable.pdf");
    const pdfBytes = await fs.readFile(pdfPath);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages(); // assume page[0] = main, page[1+] = supplements

    // Text + checkboxes
    applyI9PayloadToForm(form, payload);

    /* ---------------------------- Draw signatures ------------------------ */

    const tasks: Promise<void>[] = [];
    const sigWidth = 100;
    const sigHeight = 20;

    // Employee signature (Section 1)
    try {
      const empSigBytes = await loadImageBytesFromAsset(policies.signature);
      tasks.push(
        drawPdfImage({
          pdfDoc,
          form,
          page: pages[0],
          fieldName: F.S1_EMPLOYEE_SIGNATURE,
          imageBytes: empSigBytes,
          width: 60,
          height: 12,
          yOffset: 0,
        })
      );
    } catch (e) {
      console.warn("I-9 employee signature draw failed:", e);
    }

    // Employer/authorized representative signature (Section 2)
    try {
      const adminBytes = new Uint8Array(await fs.readFile(safetyAdmin.signatureAbsPath));
      tasks.push(
        drawPdfImage({
          pdfDoc,
          form,
          page: pages[0],
          fieldName: F.S2_EMPLOYER_REP_SIGNATURE,
          imageBytes: adminBytes,
          width: sigWidth,
          height: sigHeight,
          yOffset: 0,
        })
      );
    } catch (e) {
      console.warn("I-9 employer signature draw failed:", e);
    }

    await Promise.all(tasks);

    form.flatten();

    const out = await pdfDoc.save();
    const arrayBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="i9-filled.pdf"',
      },
    });
  } catch (err) {
    console.error("i9/filled-pdf error:", err);
    return errorResponse(err);
  }
};
