// src/lib/mail/driver/sendDriverPendingApprovalEmail.ts
import type { NextRequest } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { sendMailAppOnly } from "@/lib/mail/mailer";
import { OUTBOUND_SENDER_EMAIL } from "@/config/env";
import { resolveBaseUrlFromRequest } from "@/lib/utils/urlHelper.server";
import { escapeHtml } from "@/lib/mail/utils";

type Args = {
  trackerId: string; // kept for parity with callers, even though we no longer deep-link to /pending-approval
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
 *
 * NOTE: We do NOT include a direct pending-approval link anymore because it
 * requires an active driver session. Instead, we link to the homepage and
 * instruct the driver to use the "Resume" flow (SIN -> code via email).
 * Appends the SSP footer (Mexico line + banner).
 */
export async function sendDriverPendingApprovalEmail(req: NextRequest, { firstName, lastName, toEmail, phone, subject, saveToSentItems = true }: Args) {
  const origin = resolveBaseUrlFromRequest(req);
  const fullName = `${firstName} ${lastName}`.trim();
  const homeLink = origin; // open the homepage; driver will click "Resume" there

  const finalSubject = subject ?? `[DriveDock] Application received — Pending approval`;

  const preheader = `Thanks, ${fullName}. We received your application. It’s now pending approval.`;

  // --- Inline SSP footer banner (CID) ---
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
    // If missing in an environment, continue without image.
    bannerAttachment = undefined;
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
                  <h1 style="margin:0 0 8px 0; font-size:18px; line-height:24px;">We’ve received your application</h1>
                  <p style="margin:0; font-size:13px; color:#475569;">
                    Thanks, ${escapeHtml(fullName)}. Your application has been submitted and is now <strong>pending approval</strong>.
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
                          We’ll email you once you’re approved.
                          To check your status at any time:
                          <strong>open the homepage</strong>, click <strong>“Resume”</strong>, enter your <strong>SIN/SSN</strong>,
                          and then enter the <strong>verification code</strong> we send to your email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td align="left" style="padding:14px 24px 0 24px;">
                  <a class="button" href="${homeLink}"
                     style="display:inline-block; text-decoration:none; background:#0a66c2; color:#ffffff; padding:12px 16px; border-radius:8px; font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:14px; border:1px solid #0a66c2;">
                    Open Home →
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

  const text = [
    `We’ve received your application.`,
    `Status: Pending approval`,
    ``,
    `How to check your status:`,
    `1) Open the homepage: ${homeLink}`,
    `2) Click "Resume"`,
    `3) Enter your SIN/SSN`,
    `4) Enter the verification code we email to you`,
    ``,
    `We do door to door to Mexico. For any quotes please email logistics@sspgroup.com`,
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
