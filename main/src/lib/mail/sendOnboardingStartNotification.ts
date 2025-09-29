// src/lib/mail/sendOnboardingStartNotification.ts
import type { NextRequest } from "next/server";
import { sendMailAppOnly } from "@/lib/mail/mailer";
import { OUTBOUND_SENDER_EMAIL } from "@/config/env";
import { resolveBaseUrlFromRequest } from "@/lib/utils/urlHelper.server";
import { COMPANIES, ECompanyId } from "@/constants/companies";

type Args = {
  /** OnboardingTracker _id */
  trackerId: string;
  companyId: ECompanyId;
  /** Applicant basic info for quick triage in the inbox */
  fullName: string;
  email?: string;
  phone?: string;
  /** Optional subject override */
  subject?: string;
  /** If you want to skip saving to Sent Items on the shared mailbox */
  saveToSentItems?: boolean;
};

/**
 * Sends a brief notification to the Safety team when a driver starts onboarding
 * (on first successful submission of Application Form Page 1).
 *
 * - Uses Graph app-only send-as on OUTBOUND_SENDER_EMAIL (both from and to).
 * - Builds a direct dashboard link: /dashboard/contract/[onboardingId]/safety-processing
 */
export async function sendOnboardingStartNotificationEmailToSafetyTeam(req: NextRequest, { trackerId, companyId, fullName, email, phone, subject, saveToSentItems = true }: Args) {
  console.log("fired");
  const origin = resolveBaseUrlFromRequest(req);
  const company = COMPANIES.find((c) => c.id === companyId);
  const companyLabel = company?.name ?? String(companyId);

  const link = `${origin}/dashboard/contract/${encodeURIComponent(trackerId)}/safety-processing`;

  const finalSubject = subject ?? `[DriveDock] New application started — ${companyLabel}: ${fullName}`;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;font-size:14px;color:#111">
      <p><strong>New applicant started onboarding.</strong></p>
      <ul style="margin:0 0 12px 18px;padding:0">
        <li><strong>Name:</strong> ${escapeHtml(fullName)}</li>
        ${email ? `<li><strong>Email:</strong> ${escapeHtml(email)}</li>` : ""}
        ${phone ? `<li><strong>Phone:</strong> ${escapeHtml(phone)}</li>` : ""}
        <li><strong>Company:</strong> ${escapeHtml(companyLabel)}</li>
        <li><strong>Onboarding ID:</strong> ${escapeHtml(trackerId)}</li>
      </ul>
      <p style="margin:16px 0">
        <a href="${link}" style="display:inline-block;padding:10px 14px;text-decoration:none;border-radius:8px;border:1px solid #ddd">
          Open in DriveDock &rarr;
        </a>
      </p>
      <p style="color:#555;margin-top:16px">This message was sent automatically by DriveDock.</p>
    </div>
  `.trim();

  const text = [
    `New applicant started onboarding.`,
    `Name: ${fullName}`,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
    `Company: ${companyLabel}`,
    `Tracker ID: ${trackerId}`,
    ``,
    `Open in DriveDock: ${link}`,
  ]
    .filter(Boolean)
    .join("\n");

  // Send from + to the same shared safety mailbox
  await sendMailAppOnly({
    from: OUTBOUND_SENDER_EMAIL,
    to: [OUTBOUND_SENDER_EMAIL],
    subject: finalSubject,
    html,
    text,
    saveToSentItems,
  });
}

/** Minimal HTML escaper for inline text nodes */
function escapeHtml(input: string): string {
  return input.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
