import Link from "next/link";

export const metadata = {
  title: "Privacy | Enorsis",
  description: "Enorsis privacy notice.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article className="legal-shell">
        <p className="eyebrow-blue">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: August 9, 2026</p>

        <p>
          Enorsis respects the privacy of customers, suppliers, website visitors,
          job applicants and other people who interact with our services. This
          policy explains the types of information we may collect, why we use it,
          and the choices available to you.
        </p>

        <h2>Information we collect</h2>
        <p>
          We may collect account and business contact information, organization
          details, procurement and supplier data submitted to the platform,
          communications, support information, device and usage information, and
          information submitted through sales, contact, resource or career forms.
        </p>

        <h2>How we use information</h2>
        <p>
          We use information to operate and secure Enorsis, deliver contracted
          services, provide support, manage supplier and procurement workflows,
          respond to inquiries, improve product performance, meet legal and
          compliance obligations, and communicate about relevant products or
          services where permitted.
        </p>

        <h2>Enterprise and tenant data</h2>
        <p>
          Customer and supplier information is processed within governed,
          tenant-aware application boundaries. Organizations are responsible for
          ensuring they have appropriate authority to submit personal or business
          information to Enorsis.
        </p>

        <h2>Service providers and disclosures</h2>
        <p>
          We may use service providers for hosting, databases, email delivery,
          file storage, analytics, authentication, AI services and other
          operational functions. Information may also be disclosed where required
          by law, to protect rights and security, or in connection with a merger,
          financing, acquisition or sale of business assets.
        </p>

        <h2>Data retention and security</h2>
        <p>
          We retain information for as long as reasonably necessary for the
          purposes described in this policy, contractual requirements, audit,
          security and legal obligations. Enorsis uses administrative, technical
          and organizational safeguards designed to protect information.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on your location, you may have rights to request access,
          correction, deletion, portability, restriction or objection to certain
          processing. Requests can be submitted through our <Link href="/contact">Contact Us</Link> page.
        </p>

        <h2>International use</h2>
        <p>
          Enorsis is designed for global use. Information may be processed in
          countries other than your own, subject to applicable contractual and
          legal safeguards.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy may be sent to{" "}
          <a href="mailto:info@enorsis.org">info@enorsis.org</a>.
        </p>
      </article>
    </main>
  );
}
