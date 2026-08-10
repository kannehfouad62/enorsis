"use server";

import { Resend } from "resend";
import { redirect } from "next/navigation";

const SALES_TO = "sales@enorsis.org";

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

export async function submitPricingInquiryAction(
  data: FormData,
) {
  const fullName = field(data, "fullName");
  const company = field(data, "company");
  const jobTitle = field(data, "jobTitle");
  const workEmail = field(data, "workEmail");
  const phoneNumber = field(data, "phoneNumber");
  const country = field(data, "country");
  const plan = field(data, "plan");
  const consent = data.get("consent") === "on";

  if (
    !fullName ||
    !company ||
    !jobTitle ||
    !workEmail ||
    !country ||
    !plan
  ) {
    throw new Error(
      "Full name, company, job title, work email, country and plan are required.",
    );
  }

  if (!consent) {
    throw new Error(
      "Consent is required before submitting a pricing inquiry.",
    );
  }

  const resendKey =
    process.env.RESEND_API_KEY;

  const fromEmail =
    process.env.RESEND_FROM_EMAIL;

  if (!resendKey) {
    throw new Error(
      "RESEND_API_KEY is not configured.",
    );
  }

  if (!fromEmail) {
    throw new Error(
      "RESEND_FROM_EMAIL is not configured. Use a verified Enorsis sender, for example Enorsis <info@enorsis.com>.",
    );
  }

  const resend = new Resend(resendKey);

  const safe = {
    fullName: escapeHtml(fullName),
    company: escapeHtml(company),
    jobTitle: escapeHtml(jobTitle),
    workEmail: escapeHtml(workEmail),
    phoneNumber: escapeHtml(
      phoneNumber || "Not provided",
    ),
    country: escapeHtml(country),
    plan: escapeHtml(plan),
  };

  const result = await resend.emails.send({
    from: fromEmail,
    to: [SALES_TO],
    replyTo: workEmail,
    subject:
      `Enorsis pricing inquiry — ${plan} — ${company}`,
    text: [
      "New Enorsis pricing inquiry",
      "",
      `Full Name: ${fullName}`,
      `Company: ${company}`,
      `Job Title: ${jobTitle}`,
      `Work Email: ${workEmail}`,
      `Phone Number: ${phoneNumber || "Not provided"}`,
      `Country: ${country}`,
      `Plan: ${plan}`,
      "",
      "Consent: The prospect agreed to be contacted about Enorsis products and pricing.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#0f172a">
        <div style="padding:24px;border-radius:18px;background:#f7f9ff;border:1px solid #dfe6f1">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2563eb">
            Enorsis Sales
          </p>
          <h1 style="margin:0;font-size:26px;line-height:1.2">
            New pricing inquiry
          </h1>
          <p style="margin:10px 0 0;color:#64748b">
            A prospect submitted the pricing inquiry form on enorsis.org.
          </p>
        </div>

        <table style="width:100%;margin-top:22px;border-collapse:collapse">
          <tbody>
            <tr><td style="padding:11px;border-bottom:1px solid #e2e8f0;font-weight:700">Full Name</td><td style="padding:11px;border-bottom:1px solid #e2e8f0">${safe.fullName}</td></tr>
            <tr><td style="padding:11px;border-bottom:1px solid #e2e8f0;font-weight:700">Company</td><td style="padding:11px;border-bottom:1px solid #e2e8f0">${safe.company}</td></tr>
            <tr><td style="padding:11px;border-bottom:1px solid #e2e8f0;font-weight:700">Job Title</td><td style="padding:11px;border-bottom:1px solid #e2e8f0">${safe.jobTitle}</td></tr>
            <tr><td style="padding:11px;border-bottom:1px solid #e2e8f0;font-weight:700">Work Email</td><td style="padding:11px;border-bottom:1px solid #e2e8f0">${safe.workEmail}</td></tr>
            <tr><td style="padding:11px;border-bottom:1px solid #e2e8f0;font-weight:700">Phone Number</td><td style="padding:11px;border-bottom:1px solid #e2e8f0">${safe.phoneNumber}</td></tr>
            <tr><td style="padding:11px;border-bottom:1px solid #e2e8f0;font-weight:700">Country</td><td style="padding:11px;border-bottom:1px solid #e2e8f0">${safe.country}</td></tr>
            <tr><td style="padding:11px;border-bottom:1px solid #e2e8f0;font-weight:700">Plan</td><td style="padding:11px;border-bottom:1px solid #e2e8f0">${safe.plan}</td></tr>
          </tbody>
        </table>

        <p style="margin-top:22px;padding:14px;border-radius:12px;background:#ecfdf5;color:#065f46;font-size:13px">
          Consent recorded: prospect agreed to be contacted about Enorsis products and pricing.
        </p>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(
      result.error.message ||
        "Pricing inquiry could not be sent.",
    );
  }

  redirect(
    `/pricing?submitted=1&plan=${encodeURIComponent(
      plan,
    )}#pricing-inquiry`,
  );
}
