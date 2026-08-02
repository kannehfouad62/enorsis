import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { ArrowRight, BadgeDollarSign, Earth, Leaf, ShieldAlert, Sparkles, Workflow } from "lucide-react";

const solutions = [
  [BadgeDollarSign, "Cost optimization", "Detect leakage, consolidate demand, benchmark pricing and surface negotiation opportunities before value disappears.", ["Savings pipeline", "Price variance analytics", "Demand aggregation"]],
  [ShieldAlert, "Supplier resilience", "Continuously monitor concentration, delivery, compliance, financial and geopolitical risk across supplier tiers.", ["Risk alerts", "Scenario planning", "Continuity actions"]],
  [Workflow, "Procurement transformation", "Standardize governance while preserving the local workflows, thresholds and regulatory controls each entity requires.", ["Operating model design", "Policy automation", "Adoption analytics"]],
  [Sparkles, "Tail-spend automation", "Let governed AI agents source, compare, recommend and route low-value transactions with human oversight.", ["Autonomous sourcing", "Catalog rationalization", "Guided buying"]],
  [Earth, "Global expansion", "Launch procurement operations in new countries with local currency, tax, language and approval configurations.", ["Multi-entity setup", "Currency controls", "Regional policies"]],
  [Leaf, "Sustainable procurement", "Embed ESG, diversity, responsible sourcing and emissions signals into qualification and award decisions.", ["Supplier evidence", "ESG scoring", "Scope 3 insights"]],
];

export default function Page() { return <main>
  <PageHero eyebrow="Solutions" title="Transform procurement into a measurable business advantage." description="Enorsis addresses the operating problems that legacy procurement suites leave behind—from fragmented spend and supplier risk to slow sourcing and inconsistent global governance." points={["Outcome-led deployment", "Cross-functional intelligence", "Measurable value realization"]}/>
  <Section eyebrow="Business outcomes" title="Solutions organized around the result you need." description="Combine software, AI agents and expert procurement services in the operating model that fits your organization.">
    <div className="solution-stack">{solutions.map(([Icon, title, copy, outcomes], i) => { const I = Icon as typeof BadgeDollarSign; return <article className="solution-row" key={title as string}><div className="solution-number">0{i + 1}</div><div className="solution-icon"><I size={25}/></div><div className="solution-copy"><h3>{title as string}</h3><p>{copy as string}</p></div><ul>{(outcomes as string[]).map(x => <li key={x}>{x}</li>)}</ul><button aria-label={`Explore ${title}`}><ArrowRight/></button></article>})}</div>
  </Section>
  <Section tone="soft" eyebrow="Delivery models" title="Software, intelligence and services—together or independently." centered>
    <div className="delivery-grid"><article><span>01</span><h3>Enterprise SaaS</h3><p>Deploy the platform for your internal procurement organization with configurable modules and integrations.</p></article><article className="featured"><span>02</span><h3>AI-augmented operations</h3><p>Add specialized procurement agents that operate inside approved workflows, policies and authority limits.</p></article><article><span>03</span><h3>Managed PaaS</h3><p>Combine technology with Enorsis procurement specialists, category expertise and operational delivery.</p></article></div>
  </Section>
</main> }
