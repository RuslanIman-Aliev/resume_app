import "server-only";

import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/logger";

type SendEmailInput = {
  to: string;
  subject: string;
  /** Plain-text body. Always sent, so the mail is readable without HTML. */
  text: string;
  html: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type ActionEmailInput = {
  heading: string;
  /** One or two sentences of context above the button. */
  body: string;
  actionLabel: string;
  actionUrl: string;
  /** What to do when the mail was not expected. */
  footer: string;
};

/**
 * Renders the one email layout this app sends: a heading, a sentence, a button
 * and the same link in plain text underneath.
 *
 * Deliberately a string template rather than a rendering library - two emails
 * do not justify a dependency, and mail clients ignore most of what one would
 * add.
 * @param input - Copy and the action link
 * @returns The `html` and `text` bodies for `sendEmail`
 */
export const renderActionEmail = ({
  heading,
  body,
  actionLabel,
  actionUrl,
  footer,
}: ActionEmailInput) => {
  const safeUrl = escapeHtml(actionUrl);

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:12px;">
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#a3a3a3;">AI-Tailor</p>
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#fafafa;">${escapeHtml(heading)}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#d4d4d4;">${escapeHtml(body)}</p>
          <a href="${safeUrl}" style="display:inline-block;padding:12px 22px;border-radius:8px;background:#fafafa;color:#0a0a0a;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(actionLabel)}</a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#a3a3a3;">Or paste this link into your browser:<br /><span style="color:#d4d4d4;word-break:break-all;">${safeUrl}</span></p>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#a3a3a3;">${escapeHtml(footer)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    heading,
    "",
    body,
    "",
    `${actionLabel}: ${actionUrl}`,
    "",
    footer,
  ].join("\n");

  return { html, text };
};

/**
 * Sends one transactional email through Resend's HTTP API.
 *
 * Resend is called over `fetch` rather than through its SDK: the app sends two
 * kinds of mail and needs one POST for both.
 *
 * With no `RESEND_API_KEY` configured the behaviour splits by environment. In
 * development the message is printed to the server console, which is what makes
 * the reset flow testable without a mail provider. In production the send
 * throws, so a broken configuration surfaces as a failed request instead of a
 * user waiting for a link that was never sent.
 * @param input - Recipient, subject and both bodies
 * @throws When the provider is unconfigured in production, or rejects the send
 */
export const sendEmail = async ({ to, subject, text, html }: SendEmailInput) => {
  const apiKey = serverEnv.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is not set, so transactional email cannot be sent.",
      );
    }

    // Development only, and the point of it: the link in `text` is the only way
    // to finish a password reset on a machine with no mail provider.
    console.info(`[email] to=${to} subject=${subject}\n${text}`);
    return;
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: serverEnv.EMAIL_FROM,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    // The body can quote the recipient address back, so only the status is
    // logged; the address itself is already in the row that failed.
    logError("email.send", new Error(`Resend returned ${response.status}`), {
      subject,
    });
    throw new Error("The email could not be sent.");
  }
};
