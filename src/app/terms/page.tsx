import Link from "next/link";

export const metadata = {
  title: "Terms | Enorsis",
  description: "Enorsis website and service terms.",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <article className="legal-shell">
        <p className="eyebrow-blue">Legal</p>
        <h1>Terms of Use</h1>
        <p className="legal-updated">Last updated: August 9, 2026</p>

        <p>
          These Terms govern access to the Enorsis public website and, where
          incorporated by agreement, use of Enorsis software and related
          services. Commercial customers may also be subject to a separate order
          form, master services agreement, data processing agreement or other
          contract.
        </p>

        <h2>Permitted use</h2>
        <p>
          You may use Enorsis only for lawful business purposes and in accordance
          with applicable policies, agreements and access permissions. You may not
          attempt to bypass security controls, gain unauthorized access, disrupt
          the service, introduce malicious code, or use the platform to violate
          law or third-party rights.
        </p>

        <h2>Accounts and access</h2>
        <p>
          Users are responsible for safeguarding credentials and for activity
          performed through their accounts. Organizations are responsible for
          assigning appropriate roles and permissions to their users.
        </p>

        <h2>Customer and supplier content</h2>
        <p>
          Organizations retain ownership of data and content they submit, subject
          to rights necessary for Enorsis to host, process, secure and deliver the
          service. Users must have the authority to submit such content.
        </p>

        <h2>AI and automated features</h2>
        <p>
          Enorsis may provide predictive, generative or automated features.
          Outputs should be reviewed according to the organization&apos;s policies,
          governance requirements and applicable law. Automated features do not
          remove human accountability for business decisions unless expressly
          agreed otherwise.
        </p>

        <h2>Intellectual property</h2>
        <p>
          Enorsis and its licensors retain rights in the software, platform,
          designs, trademarks, documentation and related technology, excluding
          customer-owned content.
        </p>

        <h2>Availability and changes</h2>
        <p>
          We may improve, modify or discontinue website features. Contracted
          service availability is governed by the applicable commercial agreement.
        </p>

        <h2>Disclaimers and liability</h2>
        <p>
          Public website materials are provided for general information and do not
          constitute legal, financial or procurement advice. Liability for
          contracted services is governed by the applicable agreement and
          mandatory law.
        </p>

        <h2>Privacy</h2>
        <p>
          Please review our <Link href="/privacy">Privacy Policy</Link> and{" "}
          <Link href="/cookies">Cookie Policy</Link>.
        </p>

        <h2>Contact</h2>
        <p>
          Questions may be submitted through <Link href="/contact">Contact Us</Link>{" "}
          or sent to <a href="mailto:info@enorsis.org">info@enorsis.org</a>.
        </p>
      </article>
    </main>
  );
}
