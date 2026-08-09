import Link from "next/link";
import {
  CheckCircle2,
  Globe2,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { submitContactInquiryAction } from "@/modules/contact/contact-actions";

const areas = [
  "Pricing & subscriptions",
  "Enterprise procurement",
  "Government procurement",
  "SMB procurement",
  "Supplier network & marketplace",
  "Procurement-as-a-Service",
  "AI & autonomous procurement",
  "Integrations & partnerships",
  "Media & publications",
  "Careers",
  "Other",
];

type ContactPageProps = {
  searchParams: Promise<{ submitted?: string }>;
};

export default async function ContactPage({
  searchParams,
}: ContactPageProps) {
  const params = await searchParams;
  const submitted = params.submitted === "1";

  return (
    <main className="contact-page">
      <section className="shell py-16 md:py-20">
        <div className="contact-layout">
          <div>
            <p className="eyebrow-blue">Contact us</p>
            <h1 className="contact-title">
              Start a conversation with Enorsis.
            </h1>
            <p className="contact-copy">
              Tell us what you are trying to achieve. We will route your inquiry
              to the appropriate Enorsis team.
            </p>

            <a href="mailto:info@enorsis.org" className="contact-email-link">
              <Mail size={17} />
              info@enorsis.org
            </a>

            <div className="contact-trust-list">
              <span><Globe2 size={16}/> Global procurement and supplier network</span>
              <span><ShieldCheck size={16}/> Enterprise-grade governance</span>
              <span><MessageSquareText size={16}/> Routed to the right Enorsis team</span>
            </div>
          </div>

          <div>
            {submitted ? (
              <div className="pricing-form-success">
                <CheckCircle2 size={26} />
                <div>
                  <h3>Inquiry sent.</h3>
                  <p>Thank you. The Enorsis team will review your message and follow up.</p>
                </div>
              </div>
            ) : null}

            <form action={submitContactInquiryAction} className="contact-form-card">
              <label>
                Name
                <input
                  required
                  name="name"
                  autoComplete="name"
                  className="public-form-control"
                  placeholder="Full name"
                />
              </label>

              <label>
                Email
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  className="public-form-control"
                  placeholder="name@company.com"
                />
              </label>

              <label>
                Organization
                <input
                  required
                  name="organization"
                  autoComplete="organization"
                  className="public-form-control"
                  placeholder="Organization"
                />
              </label>

              <label>
                Area of interest
                <select
                  required
                  name="area"
                  defaultValue=""
                  className="public-form-control public-select"
                >
                  <option value="" disabled>Select an area</option>
                  {areas.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </label>

              <label className="contact-span-2">
                Website
                <input
                  name="website"
                  type="url"
                  autoComplete="url"
                  className="public-form-control"
                  placeholder="https://company.com"
                />
              </label>

              <label className="contact-span-2">
                Message
                <textarea
                  required
                  name="message"
                  className="public-form-control contact-message"
                  placeholder="Tell us about the opportunity, objective, and preferred next step."
                />
              </label>

              <button className="button-primary contact-span-2 contact-submit" type="submit">
                Send inquiry
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
