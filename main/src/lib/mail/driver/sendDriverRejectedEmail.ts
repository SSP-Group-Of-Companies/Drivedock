// src/lib/mail/driver/sendDriverRejectedEmail.ts
import type { NextRequest } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { sendMailAppOnly } from "@/lib/mail/mailer";
import { OUTBOUND_SENDER_EMAIL } from "@/config/env";
import { resolveBaseUrlFromRequest } from "@/lib/utils/urlHelper.server";
import { escapeHtml } from "@/lib/mail/utils";

type Args = {
  trackerId: string;
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
 * Appends the standard SSP footer (Mexico line + banner).
 */
export async function sendDriverRejectedEmail(req: NextRequest, { trackerId, firstName, lastName, toEmail, reasonOptional, subject, saveToSentItems = true }: Args) {
  const origin = resolveBaseUrlFromRequest(req);

  const fullName = `${firstName} ${lastName}`.trim();
  const homepageLink = `${origin}/`;

  const finalSubject = subject ?? `[DriveDock] Application not approved`;

  const preheader = `Your application was not approved. Documents have been removed from our system.`;

  // --- Inline SSP footer banner (CID) ---
  const bannerCid = "ssp-email-banner";
  const bannerPath = join(process.cwd(), "src/public/assets/banners/ssp-email-banner.jpg");

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
    // Non-fatal if the asset isn't present in some envs
    bannerAttachment = undefined;
  }

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
                    Hi ${escapeHtml(fullName)}, thank you for your interest. After careful review, we’re unable to proceed with your application at this time.
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
                <td style="padding:18px 24px 12px 24px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:12px; color:#64748b; border-top:1px solid #f1f3f5;">
                  This message was sent automatically by DriveDock.
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

  const textLines = [
    `Update on your application.`,
    `We’re unable to proceed at this time. Any related documents for this application have been removed from our system.`,
    reasonOptional ? `Additional information: ${reasonOptional}` : undefined,
    ``,
    `Homepage: ${homepageLink}`,
    `Onboarding ID (reference): ${trackerId}`,
    ``,
    `We do door to door to Mexico. For any quotes please email logistics@sspgroup.com`,
  ].filter(Boolean) as string[];

  const text = textLines.join("\n");

  await sendMailAppOnly({
    from: OUTBOUND_SENDER_EMAIL,
    to: [toEmail],
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
