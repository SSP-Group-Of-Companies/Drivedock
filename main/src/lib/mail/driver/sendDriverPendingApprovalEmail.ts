// src/lib/mail/driver/sendDriverPendingApprovalEmail.ts
import type { NextRequest } from "next/server";
import { sendMailAppOnly } from "@/lib/mail/mailer";
import { OUTBOUND_SENDER_EMAIL } from "@/config/env";
import { resolveBaseUrlFromRequest } from "@/lib/utils/urlHelper.server";
import { COMPANIES, type ECompanyId } from "@/constants/companies";
import { escapeHtml } from "@/lib/mail/utils";

type Args = {
  companyId: ECompanyId;
  firstName: string;
  lastName: string;
  /** Driver recipient */
  toEmail: string;
  phone?: string;
  subject?: string;
  saveToSentItems?: boolean;
};

/**
 * Sends the driver a confirmation that their application was received
 * and is awaiting admin approval (Invitations flow).
 */
export async function sendDriverPendingApprovalEmail(req: NextRequest, { companyId, firstName, lastName, toEmail, phone, subject, saveToSentItems = true }: Args) {
  const origin = resolveBaseUrlFromRequest(req);
  const company = COMPANIES.find((c) => c.id === companyId);
  const companyLabel = company?.name ?? String(companyId);

  const fullName = `${firstName} ${lastName}`.trim();
  const pendingLink = `${origin}/onboarding/pending-approval`; // public “waiting” page

  const finalSubject = subject ?? `[DriveDock] Application received — Pending approval (${companyLabel})`;

  const preheader = `Thanks, ${fullName}. We received your application for ${companyLabel}. It’s now pending approval.`;

  const html = `
  <!doctype html>
  <html lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(finalSubject)}</title>
      <style>
        .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; }
        a.button:hover { filter: brightness(1.07); }
      </style>
    </head>
    <body style="margin:0;padding:0;background:#f6f7f9;">
      <span class="preheader">${escapeHtml(preheader)}</span>

      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f6f7f9;">
        <tr>
          <td align="center" style="padding:24px;">
            <table role="presentation" width="560" border="0" cellspacing="0" cellpadding="0" style="width:560px; max-width:560px; background:#ffffff; border:1px solid #e6e8ec; border-radius:12px;">
              <tr>
                <td style="padding:20px 24px 8px 24px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#0f172a;">
                  <h1 style="margin:0 0 8px 0; font-size:18px; line-height:24px;">We’ve received your application</h1>
                  <p style="margin:0; font-size:13px; color:#475569;">
                    Thanks, ${escapeHtml(fullName)}. Your application for <strong>${escapeHtml(companyLabel)}</strong> has been submitted and is now <strong>pending approval</strong>.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:12px 24px 0 24px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e6e8ec; border-radius:10px;">
                    <tr>
                      <td style="padding:14px 16px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:14px; color:#0f172a;">
                        <table role="presentation" width="100%">
                          <tr>
                            <td style="padding:6px 0; width:140px; font-weight:600; color:#334155;">Name</td>
                            <td style="padding:6px 0; color:#0f172a;">${escapeHtml(fullName)}</td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0; width:140px; font-weight:600; color:#334155;">Company</td>
                            <td style="padding:6px 0; color:#0f172a;">${escapeHtml(companyLabel)}</td>
                          </tr>
                          ${
                            phone
                              ? `<tr>
                                  <td style="padding:6px 0; width:140px; font-weight:600; color:#334155;">Phone</td>
                                  <td style="padding:6px 0; color:#0f172a;">${escapeHtml(phone)}</td>
                                </tr>`
                              : ""
                          }
                        </table>
                        <p style="margin:12px 0 0 0; font-size:13px; color:#475569;">
                          We’ll email you once you’re approved. Until then, you can check your status here:
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td align="left" style="padding:14px 24px 0 24px;">
                  <a class="button" href="${pendingLink}"
                     style="display:inline-block; text-decoration:none; background:#0a66c2; color:#ffffff; padding:12px 16px; border-radius:8px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:14px; border:1px solid #0a66c2;">
                    View status →
                  </a>
                </td>
              </tr>

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
  </html>
  `.trim();

  const text = [`We’ve received your application for ${companyLabel}.`, `Status: Pending approval`, ``, `Check status: ${pendingLink}`].filter(Boolean).join("\n");

  await sendMailAppOnly({
    from: OUTBOUND_SENDER_EMAIL,
    to: [toEmail],
    subject: finalSubject,
    html,
    text,
    saveToSentItems,
  });
}
