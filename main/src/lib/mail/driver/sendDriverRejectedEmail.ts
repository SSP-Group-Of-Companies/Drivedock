// src/lib/mail/driver/sendDriverRejectedEmail.ts
import type { NextRequest } from "next/server";
import { sendMailAppOnly } from "@/lib/mail/mailer";
import { OUTBOUND_SENDER_EMAIL } from "@/config/env";
import { resolveBaseUrlFromRequest } from "@/lib/utils/urlHelper.server";
import { COMPANIES, type ECompanyId } from "@/constants/companies";
import { escapeHtml } from "@/lib/mail/utils";

type Args = {
  trackerId: string;
  companyId: ECompanyId;
  firstName: string;
  lastName: string;
  /** Driver recipient */
  toEmail: string;
  /** Optional short reason we can share with the driver (plain text, will be HTML-escaped). */
  reasonOptional?: string;
  subject?: string;
  saveToSentItems?: boolean;
};

/**
 * Sends the driver a polite notification that their application was not approved.
 * Notes that related documents were removed and provides a link back to the homepage.
 */
export async function sendDriverRejectedEmail(req: NextRequest, { trackerId, companyId, firstName, lastName, toEmail, reasonOptional, subject, saveToSentItems = true }: Args) {
  const origin = resolveBaseUrlFromRequest(req);
  const company = COMPANIES.find((c) => c.id === companyId);
  const companyLabel = company?.name ?? String(companyId);

  const fullName = `${firstName} ${lastName}`.trim();
  const homepageLink = `${origin}/`;

  const finalSubject = subject ?? `[DriveDock] Application not approved — ${companyLabel}`;

  const preheader = `Your application for ${companyLabel} was not approved. Documents have been removed from our system.`;

  const reasonBlock = reasonOptional
    ? `
      <tr>
        <td style="padding:0 24px 0 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #fde68a; background:#fffbeb; border-radius:10px;">
            <tr>
              <td style="padding:12px 16px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:13px; color:#78350f;">
                <strong style="display:block; margin-bottom:4px;">Additional information</strong>
                <span style="display:block; color:#92400e;">${escapeHtml(reasonOptional)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height:12px; line-height:12px;">&nbsp;</td></tr>
    `
    : "";

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
                  <h1 style="margin:0 0 8px 0; font-size:18px; line-height:24px;">Update on your application</h1>
                  <p style="margin:0; font-size:13px; color:#475569;">
                    Hi ${escapeHtml(fullName)}, thank you for your interest in <strong>${escapeHtml(companyLabel)}</strong>.
                    After careful review, we’re unable to proceed with your application at this time.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:12px 24px 0 24px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e6e8ec; border-radius:10px;">
                    <tr>
                      <td style="padding:14px 16px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:14px; color:#0f172a;">
                        <p style="margin:0 0 10px 0;">
                          As part of this decision, all related documents you uploaded for this application have been <strong>removed from our system</strong>.
                        </p>
                        <p style="margin:0 0 10px 0; font-size:13px; color:#475569;">
                          You’re welcome to visit our homepage for future opportunities or to start a new application later.
                        </p>
                        <p style="margin:0; font-size:12px; color:#64748b;">
                          Onboarding ID (reference): ${escapeHtml(trackerId)}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr><td style="height:12px; line-height:12px;">&nbsp;</td></tr>

              ${reasonBlock}

              <tr>
                <td align="left" style="padding:14px 24px 0 24px;">
                  <a class="button" href="${homepageLink}"
                     style="display:inline-block; text-decoration:none; background:#111827; color:#ffffff; padding:12px 16px; border-radius:8px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:14px; border:1px solid #111827;">
                    Go to homepage →
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

  const textLines = [
    `Update on your application for ${companyLabel}.`,
    `We’re unable to proceed at this time. Any related documents for this application have been removed from our system.`,
    reasonOptional ? `Additional information: ${reasonOptional}` : undefined,
    ``,
    `Homepage: ${homepageLink}`,
    `Onboarding ID (reference): ${trackerId}`,
  ].filter(Boolean) as string[];

  const text = textLines.join("\n");

  await sendMailAppOnly({
    from: OUTBOUND_SENDER_EMAIL,
    to: [toEmail],
    subject: finalSubject,
    html,
    text,
    saveToSentItems,
  });
}
