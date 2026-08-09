export const metadata = {
  title: "Cookies | Enorsis",
  description: "Enorsis cookie notice.",
};

export default function CookiesPage() {
  return (
    <main className="legal-page">
      <article className="legal-shell">
        <p className="eyebrow-blue">Legal</p>
        <h1>Cookie Policy</h1>
        <p className="legal-updated">Last updated: August 9, 2026</p>

        <p>
          This Cookie Policy explains how Enorsis may use cookies and similar
          technologies on its website and services.
        </p>

        <h2>Essential technologies</h2>
        <p>
          Essential cookies or local storage may be used for authentication,
          security, session continuity, preferences, fraud prevention and core
          site functionality. These technologies may be necessary for the service
          to work correctly.
        </p>

        <h2>Analytics and performance</h2>
        <p>
          Where enabled, analytics technologies help us understand how visitors
          use Enorsis, diagnose performance issues and improve navigation and
          content. The specific tools used may change as the platform evolves.
        </p>

        <h2>Preference technologies</h2>
        <p>
          Preference cookies may remember settings such as language, interface or
          regional choices so they do not need to be re-entered on every visit.
        </p>

        <h2>Your choices</h2>
        <p>
          Most browsers allow you to block, delete or restrict cookies. Disabling
          essential technologies may prevent some Enorsis functionality from
          working correctly.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this notice as our website, services and technology
          providers change.
        </p>

        <h2>Contact</h2>
        <p>
          Questions may be sent to{" "}
          <a href="mailto:info@enorsis.org">info@enorsis.org</a>.
        </p>
      </article>
    </main>
  );
}
