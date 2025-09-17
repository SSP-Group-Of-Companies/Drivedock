// src/lib/mail/sendCompletionPdfsEmail.ts
import path from "path";
import fs from "fs";
import { OUTBOUND_SENDER_EMAIL } from "@/config/env";
import { getPoliciesPdfsForCompanyServer } from "@/constants/policiesConsentsPdfs.server";
import { ECompanyId } from "@/constants/companies";
import { sendMailAppOnly, type GraphAttachment } from "@/lib/mail/mailer";

type Args = {
  to: string;
  companyId: ECompanyId;
  from?: string;
  subject?: string;
  html?: string; // optional custom template override
  saveToSentItems?: boolean;
};

function readAsBase64(filePath: string): string {
  return fs.readFileSync(filePath).toString("base64");
}

export async function sendCompletionPdfsEmail({ to, companyId, from = OUTBOUND_SENDER_EMAIL, subject = "Your onboarding documents", html, saveToSentItems = true }: Args) {
  const refs = getPoliciesPdfsForCompanyServer(companyId);

  const attachments: GraphAttachment[] = refs
    .filter((r) => r.exists)
    .map((r) => ({
      name: path.basename(r.absPath),
      contentType: "application/pdf",
      base64: readAsBase64(r.absPath),
    }));

  const bodyHtml =
    html ??
    `<p>Hello,</p>
     <p>Your onboarding is complete. We've attached the relevant policy PDFs for your records.</p>
     <p>If you have any questions, reply to this email.</p>`;

  await sendMailAppOnly({
    from,
    to: [to],
    subject,
    html: bodyHtml,
    attachments,
    saveToSentItems,
  });

  return { count: attachments.length, attached: attachments.map((a) => a.name) };
}
