import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function PageHero({
  eyebrow,
  title,
  description,
  primaryLabel = "Request a demo",
  primaryHref = "/onboarding",
  secondaryLabel = "Explore the platform",
  secondaryHref = "/platform",
  points = [],
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  points?: string[];
}) {
  return (
    <section className="internal-hero">
      <div className="internal-hero-grid" aria-hidden="true" />
      <div className="wide-shell internal-hero-layout">
        <div className="internal-hero-copy">
          <p className="page-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="internal-hero-description">{description}</p>
          <div className="internal-hero-actions">
            <Link className="primary-cta" href={primaryHref}>
              {primaryLabel} <ArrowRight size={17} />
            </Link>
            <Link className="secondary-cta" href={secondaryHref}>
              {secondaryLabel}
            </Link>
          </div>
        </div>
        <aside className="internal-hero-panel">
          <div className="panel-orbit" aria-hidden="true"><span /><span /><span /></div>
          <p>Enorsis Intelligence Layer</p>
          <strong>One governed platform for every procurement decision.</strong>
          <div className="hero-panel-points">
            {(points.length ? points : ["Multi-entity controls", "AI-assisted workflows", "Global currency intelligence"]).map((point) => (
              <span key={point}><CheckCircle2 size={15} />{point}</span>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
