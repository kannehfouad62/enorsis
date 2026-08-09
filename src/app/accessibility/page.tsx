import Link from "next/link";

export const metadata = {
  title: "Accessibility | Enorsis",
  description: "Enorsis accessibility statement.",
};

export default function AccessibilityPage() {
  return (
    <main className="legal-page">
      <article className="legal-shell">
        <p className="eyebrow-blue">Accessibility</p>
        <h1>Accessibility Statement</h1>
        <p className="legal-updated">Last updated: August 9, 2026</p>

        <p>
          Enorsis is committed to providing digital experiences that are usable
          by people with diverse abilities, technologies and ways of interacting.
        </p>

        <h2>Our approach</h2>
        <p>
          We aim to design responsive interfaces with clear structure, readable
          typography, meaningful labels, keyboard-accessible controls, visible
          focus states, sufficient contrast and support for assistive technology.
        </p>

        <h2>Ongoing improvement</h2>
        <p>
          Accessibility is an ongoing product responsibility. As Enorsis expands
          across procurement workflows, supplier portals, analytics and AI
          features, we will continue reviewing components and user journeys for
          accessibility barriers.
        </p>

        <h2>Third-party content</h2>
        <p>
          Some integrations, documents or third-party services accessed through
          Enorsis may be controlled by external providers. We encourage those
          providers to maintain accessible experiences.
        </p>

        <h2>Feedback and assistance</h2>
        <p>
          If you encounter an accessibility barrier or need information in an
          alternative format, please use our <Link href="/contact">Contact Us</Link>{" "}
          page or email <a href="mailto:info@enorsis.org">info@enorsis.org</a>.
          Please describe the page or feature involved and the type of assistance
          needed.
        </p>
      </article>
    </main>
  );
}
