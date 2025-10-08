// src/lib/mail/sendOnboardingStartNotification.ts
import type { NextRequest } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { sendMailAppOnly } from "@/lib/mail/mailer";
import { NO_REPLY_EMAIL, SAFETY_EMAIL } from "@/config/env";
import { resolveBaseUrlFromRequest } from "@/lib/utils/urlHelper.server";
import { escapeHtml } from "../utils";

type Args = {
  trackerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  subject?: string;
  saveToSentItems?: boolean;
};

/**
 * Safety notification for a newly submitted application (Invitation).
 * The applicant is pending approval and visible under Dashboard → Invitations.
 * Appends the SSP footer (Mexico line + banner).
 */
export default async function sendSafetyInvitationNotificationEmail(req: NextRequest, { trackerId, firstName, lastName, email, phone, subject, saveToSentItems = true }: Args) {
  const origin = resolveBaseUrlFromRequest(req);
  const fullName = `${firstName} ${lastName}`.trim();
  const link = `${origin}/dashboard/invitations/${encodeURIComponent(trackerId)}`;

  const finalSubject = subject ?? `[DriveDock] New application awaiting approval — ${fullName}`;
  const preheader = `Invitation created • Pending approval • ${fullName}`;

  // Inline SSP footer banner (CID)
  const bannerCid = "ssp-email-banner";
  const bannerPath = join(process.cwd(), "public/assets/banners/ssp-email-banner.jpg");

  let bannerAttachment:
    | {
        name: string;
        contentType: string;
        base64: string;
        contentId: string;
        isInline: true;
      }
    | undefined;

  try {
    const bytes = await fs.readFile(bannerPath);
    bannerAttachment = {
      name: "ssp-email-banner.jpg",
      contentType: "image/jpeg",
      base64: bytes.toString("base64"),
      contentId: bannerCid,
      isInline: true,
    };
  } catch {
    bannerAttachment = undefined; // non-fatal if missing in some envs
  }

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
                  <h1 style="margin:0 0 8px 0; font-size:18px; line-height:24px;">New application awaiting approval</h1>
                  <p style="margin:0; font-size:13px; color:#475569;">A new applicant has submitted page 1 and is pending review in Invitations.</p>
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
                        <a class="button" href="${link}"
                           style="display:inline-block; text-decoration:none; background:#0a66c2; color:#ffffff; padding:12px 16px; border-radius:8px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:14px; border:1px solid #0a66c2;">
                          Review invitation →
                        </a>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:18px 24px 12px 24px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:12px; color:#64748b; border-top:1px solid #f1f3f5;">
                  This message was sent automatically by DriveDock (Invitations).
                </td>
              </tr>

              <!-- SSP Footer -->
              <tr>
                <td style="padding:16px 24px 24px 24px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:12px; color:#334155;">
                  <p style="margin:0 0 12px 0;">
                    We do door to door to Mexico. For any quotes please email
                    <a href="mailto:logistics@sspgroup.com" style="color:#0a66c2; text-decoration:none;">logistics@sspgroup.com</a>
                  </p>
                  ${bannerAttachment ? `<img src="cid:${bannerCid}" alt="SSP Email Banner" style="max-width:560px; border-radius:6px; display:block;" />` : ``}
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
    `New application awaiting approval (Invitations)`,
    `Name: ${fullName}`,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
    `Onboarding ID: ${trackerId}`,
    ``,
    `Review invitation: ${link}`,
    ``,
    `We do door to door to Mexico. For any quotes please email logistics@sspgroup.com`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendMailAppOnly({
    from: NO_REPLY_EMAIL,
    to: [SAFETY_EMAIL],
    subject: finalSubject,
    html,
    text,
    saveToSentItems,
    attachments: bannerAttachment
      ? [
          {
            name: bannerAttachment.name,
            contentType: bannerAttachment.contentType,
            base64: bannerAttachment.base64,
            contentId: bannerAttachment.contentId,
            isInline: true,
          },
        ]
      : undefined,
  });
}
