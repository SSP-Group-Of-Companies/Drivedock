import type { NextRequest } from "next/server";
import { sendMailAppOnly } from "@/lib/mail/mailer";
import { OUTBOUND_SENDER_EMAIL } from "@/config/env";
import { COMPANIES, type ECompanyId } from "@/constants/companies";
import { resolveBaseUrlFromRequest } from "@/lib/utils/urlHelper.server";
import { escapeHtml } from "@/lib/mail/utils";

type Args = {
  companyId: ECompanyId;
  firstName?: string;
  lastName?: string;
  toEmail: string;
  code: string;
  subject?: string;
  saveToSentItems?: boolean;
};

export async function sendResumeVerificationCodeEmail(req: NextRequest, { companyId, firstName = "", lastName = "", toEmail, code, subject, saveToSentItems = true }: Args) {
  const origin = resolveBaseUrlFromRequest(req);
  const company = COMPANIES.find((c) => c.id === companyId);
  const companyLabel = company?.name ?? String(companyId);

  const fullName = `${firstName} ${lastName}`.trim();
  const finalSubject = subject ?? `[DriveDock] Your verification code for ${companyLabel}`;
  const preheader = `Use this code to resume your application: ${code}`;
  const homepageLink = `${origin}/`;

  const html = `
  <!doctype html>
  <html lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(finalSubject)}</title>
      <style>
        .preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;}
        a.button{display:inline-block;text-decoration:none;background:#0a66c2;color:#ffffff;padding:12px 16px;border-radius:8px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;border:1px solid #0a66c2}
        a.button:hover{filter:brightness(1.07)}
        code{padding:8px 12px;background:#0a66c214;border:1px solid #e6e8ec;border-radius:8px;font-weight:700;letter-spacing:2px;display:inline-block}
      </style>
    </head>
    <body style="margin:0;padding:0;background:#f6f7f9;">
      <span class="preheader">${escapeHtml(preheader)}</span>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f7f9;">
        <tr>
          <td align="center" style="padding:24px;">
            <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:560px;max-width:560px;background:#fff;border:1px solid #e6e8ec;border-radius:12px;">
              <tr>
                <td style="padding:20px 24px 8px 24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
                  <h1 style="margin:0 0 8px 0;font-size:18px;line-height:24px;">Your verification code</h1>
                  <p style="margin:0;font-size:13px;color:#475569;">
                    ${fullName ? `Hi ${escapeHtml(fullName)}, ` : ""}use the code below to resume your application for <strong>${escapeHtml(companyLabel)}</strong>.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:16px 24px;">
                  <code>${escapeHtml(code)}</code>
                  <p style="margin:10px 0 0 0;font-size:12px;color:#64748b;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                    This code expires in 10 minutes. If you didn’t request it, you can ignore this email.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:12px 24px 0 24px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e6e8ec;border-radius:10px;">
                    <tr>
                      <td style="padding:14px 16px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#0f172a;">
                        <p style="margin:0 0 10px 0;">
                          Enter this code in the window where you requested it.
                          If you closed that window, go to the homepage, open <strong>Resume</strong>, enter your SIN/SSN, and request a new code.
                        </p>
                        <p style="margin:0;font-size:12px;color:#64748b;">
                          Homepage: ${escapeHtml(homepageLink)}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td align="left" style="padding:14px 24px 0 24px;">
                  <a class="button" href="${homepageLink}">Go to homepage →</a>
                </td>
              </tr>

              <tr>
                <td style="padding:18px 24px 20px 24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#64748b;border-top:1px solid #f1f3f5;">
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
    `Your verification code for ${companyLabel}: ${code}`,
    `This code expires in 10 minutes.`,
    ``,
    `Enter this code in the window where you requested it.`,
    `If you closed that window, go to the homepage, open Resume, enter your SIN/SSN, and request a new code.`,
    `Homepage: ${homepageLink}`,
  ].join("\n");

  await sendMailAppOnly({
    from: OUTBOUND_SENDER_EMAIL,
    to: [toEmail],
    subject: finalSubject,
    html,
    text,
    saveToSentItems,
  });
}
