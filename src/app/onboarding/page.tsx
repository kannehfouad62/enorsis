"use client";

import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Globe2,
  Mail,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { LocalizedText } from "@/components/LocalizedText";
const countries = [
  "United States",
  "United Kingdom",
  "Canada",
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "United Arab Emirates",
];

const currencies = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "AED",
];

export default function Page() {
  const [done, setDone] = useState(false);

  return (
    <main className="demo-page">
      <div className="shell py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-3xl">
            <p className="eyebrow-blue"><LocalizedText namespace="onboardingPage" messageKey="requestDemoWorkspace" /></p>
            <h1 className="mt-3 text-4xl font-black tracking-[-.04em] text-slate-950 sm:text-5xl">
              See how Enorsis can transform your procurement operating model.
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Tell us where your organization operates and how you want to manage
              currencies. This information helps tailor your Enorsis demonstration.
            </p>
          </div>

          {done ? (
            <div className="public-form-card mt-10">
              <div className="flex items-start gap-4">
                <div className="form-success-icon">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    Demo request captured.
                  </h2>
                  <p className="mt-2 leading-7 text-slate-600">
                    Your organization and regional configuration have been recorded
                    for the Enorsis demonstration workflow.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setDone(true);
              }}
              className="public-form-card mt-10 grid gap-6 md:grid-cols-2"
            >
              <FormField
                label="Company name"
                icon={<Building2 size={16} />}
              >
                <input
                  required
                  name="companyName"
                  autoComplete="organization"
                  className="public-form-control"
                  placeholder="Organization name"
                />
              </FormField>

              <FormField
                label="Country"
                icon={<Globe2 size={16} />}
              >
                <select
                  required
                  name="country"
                  className="public-form-control public-select"
                  defaultValue="United States"
                >
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Default currency"
                icon={<WalletCards size={16} />}
              >
                <select
                  required
                  name="currency"
                  className="public-form-control public-select"
                  defaultValue="USD"
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Administrator email"
                icon={<Mail size={16} />}
              >
                <input
                  type="email"
                  required
                  name="email"
                  autoComplete="email"
                  className="public-form-control"
                  placeholder="you@company.com"
                />
              </FormField>

              <label className="form-checkbox-row md:col-span-2">
                <input type="checkbox" defaultChecked />
                <span>
                  Keep USD as the reporting currency while displaying transactions
                  in the selected company currency.
                </span>
              </label>

              <div className="md:col-span-2 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <ShieldCheck size={15} className="text-blue-600" />
                  Secure, auditable and tenant-isolated configuration.
                </div>
                <button className="button-primary min-h-12 px-7" type="submit">
                  Request tailored demo
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="public-form-field">
      <span className="public-form-label">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
