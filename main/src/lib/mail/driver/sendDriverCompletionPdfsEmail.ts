// src/lib/mail/sendCompletionPdfsEmail.ts
import path from "path";
import fs from "fs";
import { OUTBOUND_SENDER_EMAIL } from "@/config/env";
import { getPoliciesPdfsForCompanyServer } from "@/constants/policiesConsentsPdfs.server";
import { ECompanyId, COMPANIES } from "@/constants/companies";
import { sendMailAppOnly, type GraphAttachment } from "@/lib/mail/mailer";

/**
 * Email w/ attached policy PDFs — improved styling + text fallback.
 * - If `html` is provided, it's used as-is (attachments still included).
 * - Otherwise a clean, mobile-friendly HTML template is generated.
 */

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

function buildDefaultHtml(opts: { subject: string; companyLabel: string; attachmentNames: string[] }) {
  const { subject, companyLabel, attachmentNames } = opts;

  const preheader = "Your onboarding is complete. Policy PDFs are attached for your records.";

  const attachmentsList =
    attachmentNames.length > 0
      ? attachmentNames.map((n) => `<li style="margin:0 0 6px 0; padding:0; font-size:13px; color:#334155;">${n}</li>`).join("")
      : `<li style="margin:0; padding:0; font-size:13px; color:#334155;">(No attachments found)</li>`;

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
    <style>
      /* Keep styles minimal and inline-friendly */
      .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; }
      @media (max-width: 600px) {
        .container { width:100% !important; border-radius:0 !important; }
      }
      a.button:hover { filter: brightness(1.07); }
    </style>
  </head>
  <body style="margin:0; padding:0; background:#f6f7f9;">
    <span class="preheader">${escapeHtml(preheader)}</span>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f6f7f9;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="560" border="0" cellspacing="0" cellpadding="0" class="container" style="width:560px; max-width:560px; background:#ffffff; border:1px solid #e6e8ec; border-radius:12px;">
            <!-- Header -->
            <tr>
              <td style="padding:20px 24px 8px 24px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#0f172a;">
                <h1 style="margin:0 0 6px 0; font-size:18px; line-height:24px;">Your onboarding is complete</h1>
                <p style="margin:0; font-size:13px; color:#475569;">
                  Thank you for completing onboarding for <strong>${escapeHtml(companyLabel)}</strong>.
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:12px 24px 0 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e6e8ec; border-radius:10px;">
                  <tr>
                    <td style="padding:14px 16px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:14px; color:#0f172a;">
                      <p style="margin:0 0 10px 0;">
                        We’ve attached the relevant policy PDF(s) for your records.
                      </p>
                      <p style="margin:0 0 10px 0; font-size:13px; color:#475569;">
                        You can download them directly from this email. If you have any questions, just reply to this message.
                      </p>
                      <div style="margin:12px 0 0 0;">
                        <p style="margin:0 0 6px 0; font-size:12px; color:#64748b;">Included attachments:</p>
                        <ul style="margin:6px 0 0 18px; padding:0;">
                          ${attachmentsList}
                        </ul>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA (optional) -->
            <tr>
              <td style="padding:14px 24px 0 24px;">
                <a class="button" href="#" style="display:inline-block; text-decoration:none; background:#0a66c2; color:#ffffff; padding:10px 14px; border-radius:8px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:13px; border:1px solid #0a66c2; pointer-events:none; opacity:.85;">
                  Attachments are included with this email
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:18px 24px 20px 24px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:12px; color:#64748b; border-top:1px solid #f1f3f5;">
                This message was sent automatically by DriveDock.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

/** Basic HTML escaping for subject/company/filenames */
function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendDriverCompletionPdfsEmail({ to, companyId, from = OUTBOUND_SENDER_EMAIL, subject, html, saveToSentItems = true }: Args) {
  const refs = getPoliciesPdfsForCompanyServer(companyId);

  const attachments: GraphAttachment[] = refs
    .filter((r) => r.exists)
    .map((r) => ({
      name: path.basename(r.absPath),
      contentType: "application/pdf",
      base64: readAsBase64(r.absPath),
    }));

  const companyLabel = COMPANIES.find((c) => c.id === companyId)?.name ?? String(companyId);

  // Default subject mentions company
  const effectiveSubject = subject ?? `Your onboarding documents — ${companyLabel}`;

  // Build a tasteful default HTML if not provided
  const bodyHtml =
    html ??
    buildDefaultHtml({
      subject: effectiveSubject,
      companyLabel,
      attachmentNames: attachments.map((a) => a.name),
    });

  // Plain-text fallback
  const bodyText = [
    `Your onboarding is complete for ${companyLabel}.`,
    `We've attached the relevant policy PDFs for your records.`,
    attachments.length ? `Attachments:\n${attachments.map((a) => `- ${a.name}`).join("\n")}` : `No attachments found.`,
    ``,
    `If you have any questions, reply to this email.`,
  ].join("\n");

  await sendMailAppOnly({
    from,
    to: [to],
    subject: effectiveSubject,
    html: bodyHtml,
    text: bodyText,
    attachments,
    saveToSentItems,
  });

  return { count: attachments.length, attached: attachments.map((a) => a.name) };
}
