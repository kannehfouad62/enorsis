import "server-only";

import { Resend } from "resend";

import type {
  NotificationProvider,
} from "./providers";

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "https://www.enorsis.com"
  ).replace(/\/+$/, "");
}

function fromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL ??
    process.env.WORKFLOW_EMAIL_FROM ??
    ""
  );
}

function absoluteActionUrl(
  actionUrl?: string | null,
) {
  if (!actionUrl) return null;

  if (
    actionUrl.startsWith("http://") ||
    actionUrl.startsWith("https://")
  ) {
    return actionUrl;
  }

  return `${baseUrl()}${
    actionUrl.startsWith("/") ? "" : "/"
  }${actionUrl}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const resendEmailNotificationProvider: NotificationProvider = {
  async send(input) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = fromAddress();

    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not configured.",
      );
    }

    if (!from) {
      throw new Error(
        "RESEND_FROM_EMAIL or WORKFLOW_EMAIL_FROM is not configured.",
      );
    }

    const resend = new Resend(apiKey);
    const actionUrl = absoluteActionUrl(
      input.actionUrl,
    );

    const result = await resend.emails.send({
      from,
      to: input.destination,
      subject: input.title,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;color:#102a43">
          <p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#1f5eff;text-transform:uppercase">
            Enorsis
          </p>
          <h2>${escapeHtml(input.title)}</h2>
          <p style="line-height:1.7">
            ${escapeHtml(input.message)}
          </p>
          ${
            actionUrl
              ? `
                <p style="margin:28px 0">
                  <a
                    href="${escapeHtml(actionUrl)}"
                    style="background:#102a43;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700"
                  >
                    Open in Enorsis
                  </a>
                </p>
              `
              : ""
          }
        </div>
      `,
      text: [
        input.title,
        "",
        input.message,
        actionUrl ? `\nOpen in Enorsis: ${actionUrl}` : "",
      ].join("\n"),
    });

    if (result.error) {
      throw new Error(
        result.error.message ||
          "Resend failed to send notification email.",
      );
    }

    return {
      provider: "RESEND",
      providerMessageId:
        result.data?.id ?? undefined,
    };
  },
};
