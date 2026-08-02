import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { Check, Sparkles } from "lucide-react";
const tiers=[
  ["Launch","For teams establishing governed procurement.",["1 legal entity","Core purchasing workflows","Supplier portal","USD plus local display currency","Standard analytics"]],
  ["Scale","For growing multi-entity organizations.",["Multiple legal entities","Advanced sourcing and contracts","Multi-currency controls","Supplier performance","Workflow automation"]],
  ["Enterprise","For global and regulated enterprises.",["Unlimited organizational structures","AI agent orchestration","Advanced governance and risk","Private integrations","Dedicated success program"]],
  ["Managed PaaS","Technology plus procurement operations.",["Enorsis procurement specialists","Category management","Negotiation and sourcing support","Supplier operations","Outcome-based service options"]]
];
export default function Page(){return <main>
  <PageHero eyebrow="Pricing" title="A commercial model that grows with procurement maturity." description="Start with the platform, add governed AI agents, or engage Enorsis as a fully managed Procurement-as-a-Service partner." primaryLabel="Build your plan" points={["Modular deployment", "Transparent scope", "Global enterprise options"]}/>
  <Section eyebrow="Plans" title="Choose the operating model that fits today—and expand tomorrow." description="Final pricing is based on modules, organizational scale, transaction volume, integrations and service coverage.">
    <div className="pricing-grid">{tiers.map(([name,description,features],index)=><article className={`pricing-card ${index===2?"is-featured":""}`} key={name as string}>{index===2?<div className="popular-label"><Sparkles size={14}/> Most flexible</div>:null}<p className="plan-index">0{index+1}</p><h2>{name as string}</h2><p className="plan-description">{description as string}</p><div className="price-line"><strong>Custom</strong><span>configured to your needs</span></div><ul>{(features as string[]).map(x=><li key={x}><Check size={16}/>{x}</li>)}</ul><button>{index===0?"Start a conversation":"Contact sales"}</button></article>)}</div>
  </Section>
  <Section tone="soft" eyebrow="Included foundation" title="Enterprise fundamentals are not premium add-ons." centered>
    <div className="included-grid">{["Tenant isolation","Role-based permissions","Audit trails","Multi-currency architecture","Supplier portal","Security controls","Workflow designer","Core reporting"].map(x=><span key={x}><Check size={15}/>{x}</span>)}</div>
  </Section>
</main>}
