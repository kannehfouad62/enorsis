import type { ReactNode } from "react";

export function Section({
  eyebrow,
  title,
  description,
  children,
  tone = "white",
  width = "wide",
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "white" | "soft" | "dark";
  width?: "wide" | "standard";
  centered?: boolean;
}) {
  return (
    <section className={`content-section content-section-${tone}`}>
      <div className={width === "wide" ? "wide-shell" : "shell"}>
        <header className={`content-section-header ${centered ? "is-centered" : ""}`}>
          <p className="page-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </header>
        <div className="content-section-body">{children}</div>
      </div>
    </section>
  );
}
