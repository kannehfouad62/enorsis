import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { submitPricingInquiryAction } from "@/modules/sales/pricing-inquiry-actions";

const planNames = [
  "Launch",
  "Scale",
  "Enterprise",
  "Managed PaaS",
] as const;

const tiers = [
  [
    "Launch",
    "For teams establishing governed procurement.",
    [
      "1 legal entity",
      "Core purchasing workflows",
      "Supplier portal",
      "USD plus local display currency",
      "Standard analytics",
    ],
  ],
  [
    "Scale",
    "For growing multi-entity organizations.",
    [
      "Multiple legal entities",
      "Advanced sourcing and contracts",
      "Multi-currency controls",
      "Supplier performance",
      "Workflow automation",
    ],
  ],
  [
    "Enterprise",
    "For global and regulated enterprises.",
    [
      "Unlimited organizational structures",
      "AI agent orchestration",
      "Advanced governance and risk",
      "Private integrations",
      "Dedicated success program",
    ],
  ],
  [
    "Managed PaaS",
    "Technology plus procurement operations.",
    [
      "Enorsis procurement specialists",
      "Category management",
      "Negotiation and sourcing support",
      "Supplier operations",
      "Outcome-based service options",
    ],
  ],
];

const countries = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Costa Rica",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Guatemala",
  "Guinea",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kuwait",
  "Latvia",
  "Lebanon",
  "Liberia",
  "Lithuania",
  "Luxembourg",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Mauritius",
  "Mexico",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Namibia",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Panama",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Rwanda",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "South Africa",
  "South Korea",
  "Spain",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "Taiwan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Venezuela",
  "Vietnam",
  "Zambia",
  "Zimbabwe",
  "Other",
];

type PricingPageProps = {
  searchParams: Promise<{
    plan?: string;
    submitted?: string;
  }>;
};

export default async function Page({
  searchParams,
}: PricingPageProps) {
  const params = await searchParams;

  const requestedPlan =
    planNames.find(
      (plan) => plan === params.plan,
    ) ?? "Enterprise";

  const submitted =
    params.submitted === "1";

  return (
    <main>
      <PageHero
        eyebrow="Pricing"
        title="A commercial model that grows with procurement maturity."
        description="Start with the platform, add governed AI agents, or engage Enorsis as a fully managed Procurement-as-a-Service partner."
        primaryLabel="Build your plan"
        primaryHref="#pricing-inquiry"
        points={[
          "Modular deployment",
          "Transparent scope",
          "Global enterprise options",
        ]}
      />

      <Section
        eyebrow="Plans"
        title="Choose the operating model that fits today—and expand tomorrow."
        description="Final pricing is based on modules, organizational scale, transaction volume, integrations and service coverage."
      >
        <div className="pricing-grid">
          {tiers.map(
            (
              [
                name,
                description,
                features,
              ],
              index,
            ) => (
              <article
                className={`pricing-card ${
                  index === 2
                    ? "is-featured"
                    : ""
                }`}
                key={name as string}
              >
                {index === 2 ? (
                  <div className="popular-label">
                    <Sparkles size={14} />
                    Most flexible
                  </div>
                ) : null}

                <p className="plan-index">
                  0{index + 1}
                </p>
                <h2>
                  {name as string}
                </h2>
                <p className="plan-description">
                  {description as string}
                </p>

                <div className="price-line">
                  <strong>Custom</strong>
                  <span>
                    configured to your needs
                  </span>
                </div>

                <ul>
                  {(features as string[]).map(
                    (feature) => (
                      <li key={feature}>
                        <Check size={16} />
                        {feature}
                      </li>
                    ),
                  )}
                </ul>

                <Link
                  className="pricing-sales-link"
                  href={`/pricing?plan=${encodeURIComponent(
                    name as string,
                  )}#pricing-inquiry`}
                >
                  <Mail size={16} />
                  {index === 0
                    ? "Start a conversation"
                    : "Contact sales"}
                </Link>
              </article>
            ),
          )}
        </div>
      </Section>

      <section
        id="pricing-inquiry"
        className="pricing-inquiry-section"
      >
        <div className="shell py-16 md:py-20">
          <div className="pricing-inquiry-layout">
            <div className="pricing-inquiry-copy">
              <p className="eyebrow-blue">
                Get in touch
              </p>

              <h2>
                Let&apos;s find the right plan.
              </h2>

              <p>
                Tell us about your organization.
                An Enorsis expert will contact
                you to discuss users,
                implementation, service needs
                and the appropriate subscription.
              </p>

              <a
                href="mailto:sales@enorsis.org"
                className="pricing-sales-address"
              >
                <Mail size={17} />
                sales@enorsis.org
              </a>

              <div className="pricing-inquiry-trust">
                <ShieldCheck size={17} />
                <span>
                  Your inquiry is sent securely
                  to the Enorsis sales team.
                </span>
              </div>
            </div>

            <div>
              {submitted ? (
                <div className="pricing-form-success">
                  <CheckCircle2 size={27} />
                  <div>
                    <h3>
                      Pricing inquiry submitted.
                    </h3>
                    <p>
                      Thank you. An Enorsis
                      expert will contact you
                      using the information you
                      provided.
                    </p>
                  </div>
                </div>
              ) : null}

              <form
                action={
                  submitPricingInquiryAction
                }
                className="pricing-inquiry-form"
              >
                <label>
                  Full Name
                  <input
                    required
                    name="fullName"
                    autoComplete="name"
                    className="public-form-control"
                    placeholder="Full name"
                  />
                </label>

                <label>
                  Company
                  <input
                    required
                    name="company"
                    autoComplete="organization"
                    className="public-form-control"
                    placeholder="Organization name"
                  />
                </label>

                <label>
                  Job Title
                  <input
                    required
                    name="jobTitle"
                    autoComplete="organization-title"
                    className="public-form-control"
                    placeholder="Job title"
                  />
                </label>

                <label>
                  Work Email
                  <input
                    required
                    type="email"
                    name="workEmail"
                    autoComplete="email"
                    className="public-form-control"
                    placeholder="you@company.com"
                  />
                </label>

                <label>
                  Phone Number{" "}
                  <span>(optional)</span>
                  <input
                    type="tel"
                    name="phoneNumber"
                    autoComplete="tel"
                    className="public-form-control"
                    placeholder="+1 ..."
                  />
                </label>

                <label>
                  Country
                  <select
                    required
                    name="country"
                    defaultValue=""
                    className="public-form-control public-select"
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select your country
                    </option>
                    {countries.map(
                      (country) => (
                        <option
                          key={country}
                          value={country}
                        >
                          {country}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="pricing-form-plan">
                  Plan
                  <select
                    required
                    name="plan"
                    defaultValue={
                      requestedPlan
                    }
                    className="public-form-control public-select"
                  >
                    {planNames.map(
                      (plan) => (
                        <option
                          key={plan}
                          value={plan}
                        >
                          {plan}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="pricing-consent">
                  <input
                    required
                    type="checkbox"
                    name="consent"
                  />
                  <span>
                    By submitting, you consent
                    to Enorsis contacting you
                    about products and pricing.
                    See our{" "}
                    <Link href="/privacy">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>

                <button
                  type="submit"
                  className="button-primary pricing-submit-button"
                >
                  Submit Pricing Inquiry
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Section
        tone="soft"
        eyebrow="Included foundation"
        title="Enterprise fundamentals are not premium add-ons."
        centered
      >
        <div className="included-grid">
          {[
            "Tenant isolation",
            "Role-based permissions",
            "Audit trails",
            "Multi-currency architecture",
            "Supplier portal",
            "Security controls",
            "Workflow designer",
            "Core reporting",
          ].map((item) => (
            <span key={item}>
              <Check size={15} />
              {item}
            </span>
          ))}
        </div>
      </Section>
    </main>
  );
}
