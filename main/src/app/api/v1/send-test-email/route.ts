// src/app/api/v1/send-test-email/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { OUTBOUND_SENDER_EMAIL } from "@/config/env";
import { sendMailAppOnly } from "@/lib/mail/mailer";
import { getPoliciesPdfsForCompanyServer } from "@/constants/policiesConsentsPdfs.server";
import { ECompanyId } from "@/constants/companies";

/** Read a file as base64 (assumes it exists and is a file) */
function readAsBase64(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return buf.toString("base64");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const toParam = url.searchParams.get("to") ?? "";
    const recipient = toParam && toParam.includes("@") ? toParam : "sahil.sharma@sspgroup.com";

    // Pull ALL PDFs for SSP-CA (policy + shared + ISB + road-test cert + hiring app)
    const refs = getPoliciesPdfsForCompanyServer(ECompanyId.SSP_CA);

    // Keep only ones that exist on disk, then map to attachments
    const attachments = refs
      .filter((r) => r.exists)
      .map((r) => ({
        name: path.basename(r.absPath),
        contentType: "application/pdf",
        base64: readAsBase64(r.absPath),
      }));

    if (attachments.length === 0) {
      return errorResponse(400, "No PDFs found for SSP-CA to attach");
    }

    await sendMailAppOnly({
      from: OUTBOUND_SENDER_EMAIL,
      to: [recipient],
      subject: "DriveDock: SSP-CA PDFs test (all attachments)",
      html: `<p>Hello,</p>
             <p>This is a DriveDock test email sent via Microsoft Graph (app-only).</p>
             <p>Attached files (${attachments.length}): ${attachments.map((a) => a.name).join(", ")}</p>`,
      attachments,
    });

    return successResponse(200, "Email sent", {
      company: "SSP-CA",
      from: OUTBOUND_SENDER_EMAIL,
      to: recipient,
      attached: attachments.map((a) => a.name),
      count: attachments.length,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export const POST = GET;
