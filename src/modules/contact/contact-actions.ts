"use server";

import { Resend } from "resend";
import { redirect } from "next/navigation";

const CONTACT_TO = "info@enorsis.org";

function field(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function submitContactInquiryAction(data: FormData) {
  const name = field(data, "name");
  const email = field(data, "email");
  const organization = field(data, "organization");
  const area = field(data, "area");
  const website = field(data, "website");
  const message = field(data, "message");

  if (!name || !email || !organization || !area || !message) {
    throw new Error(
      "Name, email, organization, area of interest and message are required.",
    );
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  if (!fromEmail) {
    throw new Error(
      "RESEND_FROM_EMAIL is not configured. Use a verified Enorsis sender.",
    );
  }

  const resend = new Resend(resendKey);

  const safe = {
    name: escapeHtml(name),
    email: escapeHtml(email),
    organization: escapeHtml(organization),
    area: escapeHtml(area),
    website: escapeHtml(website || "Not provided"),
    message: escapeHtml(message).replaceAll("\n", "<br/>"),
  };

  const result = await resend.emails.send({
    from: fromEmail,
    to: [CONTACT_TO],
    replyTo: email,
    subject: `Enorsis contact inquiry — ${area} — ${organization}`,
    text: [
      "New Enorsis contact inquiry",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Organization: ${organization}`,
      `Area of interest: ${area}`,
      `Website: ${website || "Not provided"}`,
      "",
      "Message:",
      message,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;color:#0f172a">
        <h1 style="font-size:24px;margin-bottom:18px">New Enorsis contact inquiry</h1>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:700">Name</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${safe.name}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:700">Email</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${safe.email}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:700">Organization</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${safe.organization}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:700">Area of interest</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${safe.area}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:700">Website</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${safe.website}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;border-radius:12px;background:#f8fafc">
          <strong>Message</strong>
          <p style="line-height:1.65">${safe.message}</p>
        </div>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(result.error.message || "Contact inquiry could not be sent.");
  }

  redirect("/contact?submitted=1");
}
