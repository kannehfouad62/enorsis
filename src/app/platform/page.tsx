import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { ArrowRight, Bot, Boxes, FileCheck2, Gauge, Network, ShieldCheck } from "lucide-react";

const modules = [
  ["Intake & Guided Buying", "Convert requests from forms, email, chat and mobile into policy-compliant purchasing workflows."],
  ["Strategic Sourcing", "Run RFIs, RFQs, RFPs, auctions, bid evaluations and negotiation events in one workspace."],
  ["Supplier Management", "Onboard, qualify, score and continuously monitor suppliers across every legal entity."],
  ["Contract Lifecycle", "Create, approve, renew and govern contracts with obligations, risk signals and AI extraction."],
  ["Procure-to-Pay", "Connect requisitions, approvals, purchase orders, receipts, invoices and three-way matching."],
  ["Spend Intelligence", "Unify fragmented spend, classify transactions and reveal savings, leakage and concentration risk."],
  ["Risk & Compliance", "Embed sanctions, policy, insurance, ESG, privacy and regulatory controls into supplier decisions."],
  ["Inventory Intelligence", "Forecast demand, optimize reorder points and connect inventory decisions to sourcing strategy."],
  ["AI Procurement Agents", "Delegate research, sourcing, follow-up and analysis while retaining human approvals and auditability."],
];
const pillars = [
  [Boxes, "Composable", "Deploy by module, business unit, country or maturity level."],
  [Network, "Connected", "One data model across suppliers, contracts, spend and workflows."],
  [ShieldCheck, "Governed", "Role, policy, approval and audit controls at every decision point."],
  [Bot, "AI-native", "Explainable agents work inside authorized workflows—not around them."],
];

export default function Page() {
  return <main>
    <PageHero eyebrow="Our Platform" title="The intelligent operating system for global procurement." description="Connect every request, supplier, contract, transaction and decision across your enterprise—without forcing every country or business unit into the same rigid workflow." points={["Source-to-pay suite", "Human-governed AI agents", "Multi-country operating model"]} />
    <Section eyebrow="Platform foundation" title="Built as one system, not a collection of disconnected tools." description="Enorsis combines enterprise controls with the speed and flexibility modern procurement teams need.">
      <div className="pillar-grid">{pillars.map(([Icon, title, copy]) => { const I = Icon as typeof Boxes; return <article className="icon-card" key={title as string}><span><I size={22}/></span><h3>{title as string}</h3><p>{copy as string}</p></article> })}</div>
    </Section>
    <Section tone="soft" eyebrow="End-to-end capability" title="Start anywhere. Expand without rebuilding." description="Each capability uses the same identity, organization, currency, supplier and audit foundations.">
      <div className="module-grid">{modules.map(([title, copy], index) => <article className="module-card" key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p><a href="#">Explore capability <ArrowRight size={15}/></a></article>)}</div>
    </Section>
    <Section tone="dark" eyebrow="One intelligence layer" title="Procurement data becomes operational intelligence." description="A shared intelligence layer continuously connects demand, supplier, contract, risk, market and transaction signals.">
      <div className="dark-feature-grid"><article><Gauge/><strong>Live performance</strong><p>Track cycle time, savings, risk and service levels across every entity.</p></article><article><FileCheck2/><strong>Explainable decisions</strong><p>Preserve the evidence, policy, model output and approval behind each action.</p></article><article><Bot/><strong>Agent orchestration</strong><p>Assign specialized AI agents while controlling tools, data access and approval limits.</p></article></div>
    </Section>
  </main>;
}
