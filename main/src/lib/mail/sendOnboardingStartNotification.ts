// src/lib/mail/sendOnboardingStartNotification.ts
import type { NextRequest } from "next/server";
import { sendMailAppOnly } from "@/lib/mail/mailer";
import { OUTBOUND_SENDER_EMAIL } from "@/config/env";
import { resolveBaseUrlFromRequest } from "@/lib/utils/urlHelper.server";
import { COMPANIES, ECompanyId } from "@/constants/companies";

type Args = {
  trackerId: string;
  companyId: ECompanyId;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  subject?: string;
  saveToSentItems?: boolean;
};

export async function sendOnboardingStartNotificationEmailToSafetyTeam(req: NextRequest, { trackerId, companyId, firstName, lastName, email, phone, subject, saveToSentItems = true }: Args) {
  const origin = resolveBaseUrlFromRequest(req);
  const company = COMPANIES.find((c) => c.id === companyId);
  const companyLabel = company?.name ?? String(companyId);

  const fullName = `${firstName} ${lastName}`;
  const link = `${origin}/dashboard/contract/${encodeURIComponent(trackerId)}/safety-processing`;
  const finalSubject = subject ?? `[DriveDock] New application started — ${companyLabel}: ${fullName}`;

  const preheader = `New onboarding started • ${fullName} • ${companyLabel}`;

  const html = `
  <!doctype html>
  <html lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(finalSubject)}</title>
      <!-- Preheader text (hidden in most clients) -->
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
                  <h1 style="margin:0 0 8px 0; font-size:18px; line-height:24px;">New applicant started onboarding</h1>
                  <p style="margin:0; font-size:13px; color:#475569;">A new application has been created and is ready for processing.</p>
                </td>
              </tr>

              <tr>
                <td style="padding:8px 24px 0 24px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate; border-spacing:0;">
                    <tr>
                      <td style="padding:12px 0; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:14px; color:#0f172a;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e6e8ec; border-radius:10px;">
                          <tr>
                            <td style="padding:14px 16px;">
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding:6px 0; width:140px; font-weight:600; color:#334155; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">Name</td>
                                  <td style="padding:6px 0; color:#0f172a; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(fullName)}</td>
                                </tr>
                                ${
                                  email
                                    ? `
                                <tr>
                                  <td style="padding:6px 0; width:140px; font-weight:600; color:#334155; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">Email</td>
                                  <td style="padding:6px 0; color:#0f172a; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(email)}</td>
                                </tr>`
                                    : ""
                                }
                                ${
                                  phone
                                    ? `
                                <tr>
                                  <td style="padding:6px 0; width:140px; font-weight:600; color:#334155; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">Phone</td>
                                  <td style="padding:6px 0; color:#0f172a; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(phone)}</td>
                                </tr>`
                                    : ""
                                }
                                <tr>
                                  <td style="padding:6px 0; width:140px; font-weight:600; color:#334155; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">Company</td>
                                  <td style="padding:6px 0; color:#0f172a; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(companyLabel)}</td>
                                </tr>
                                <tr>
                                  <td style="padding:6px 0; width:140px; font-weight:600; color:#334155; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">Onboarding ID</td>
                                  <td style="padding:6px 0; color:#0f172a; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(trackerId)}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <tr>
                      <td align="left" style="padding:8px 0 2px 0;">
                        <!-- Button -->
                        <a class="button" href="${link}"
                           style="display:inline-block; text-decoration:none; background:#0a66c2; color:#ffffff; padding:12px 16px; border-radius:8px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:14px; border:1px solid #0a66c2;">
                          Open in DriveDock →
                        </a>
                      </td>
                    </tr>

                  </table>
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
    `New applicant started onboarding`,
    `Name: ${fullName}`,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
    `Company: ${companyLabel}`,
    `Onboarding ID: ${trackerId}`,
    ``,
    `Open in DriveDock: ${link}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendMailAppOnly({
    from: OUTBOUND_SENDER_EMAIL,
    to: [OUTBOUND_SENDER_EMAIL],
    subject: finalSubject,
    html,
    text,
    saveToSentItems,
  });
}

function escapeHtml(input: string): string {
  return input.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
