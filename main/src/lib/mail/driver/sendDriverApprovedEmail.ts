// src/lib/mail/driver/sendDriverApprovedEmail.ts
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
  subject?: string;
  saveToSentItems?: boolean;
};

/**
 * Sends the driver a confirmation that they were approved.
 * Includes a link to the homepage and instructs to resume by entering SIN.
 */
export async function sendDriverApprovedEmail(req: NextRequest, { trackerId, companyId, firstName, lastName, toEmail, subject, saveToSentItems = true }: Args) {
  const origin = resolveBaseUrlFromRequest(req);
  const company = COMPANIES.find((c) => c.id === companyId);
  const companyLabel = company?.name ?? String(companyId);

  const fullName = `${firstName} ${lastName}`.trim();
  const homepageLink = `${origin}/`; // “homepage to resume by SIN” as requested

  const finalSubject = subject ?? `[DriveDock] You’re approved — Continue your application (${companyLabel})`;

  const preheader = `Approved! Resume your application for ${companyLabel} from the homepage using your SIN.`;

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
                  <h1 style="margin:0 0 8px 0; font-size:18px; line-height:24px;">You’re approved — continue your application</h1>
                  <p style="margin:0; font-size:13px; color:#475569;">
                    Hi ${escapeHtml(fullName)}, your application for <strong>${escapeHtml(companyLabel)}</strong> has been <strong>approved</strong>.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:12px 24px 0 24px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e6e8ec; border-radius:10px;">
                    <tr>
                      <td style="padding:14px 16px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:14px; color:#0f172a;">
                        <p style="margin:0 0 10px 0;">
                          Click the button below to go to the homepage, then <strong>resume your application by clicking the Resume button</strong>.
                        </p>
                        <p style="margin:0; font-size:12px; color:#64748b;">
                          Onboarding ID (for reference): ${escapeHtml(trackerId)}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td align="left" style="padding:14px 24px 0 24px;">
                  <a class="button" href="${homepageLink}"
                     style="display:inline-block; text-decoration:none; background:#0a66c2; color:#ffffff; padding:12px 16px; border-radius:8px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:14px; border:1px solid #0a66c2;">
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

  const text = [
    `You’re approved — continue your application for ${companyLabel}.`,
    `Go to homepage and resume with your SIN.`,
    ``,
    `Homepage: ${homepageLink}`,
    `Onboarding ID (reference): ${trackerId}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendMailAppOnly({
    from: OUTBOUND_SENDER_EMAIL,
    to: [toEmail],
    subject: finalSubject,
    html,
    text,
    saveToSentItems,
  });
}
