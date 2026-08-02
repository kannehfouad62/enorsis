import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { Building2, Factory, HeartPulse, Landmark, Pickaxe, Plane, ShoppingCart, Truck, UtilityPole, Workflow } from "lucide-react";
const sectors = [
  [Factory,"Manufacturing","Direct and indirect material sourcing, supplier quality, plant spend and continuity."],
  [Building2,"Construction & Engineering","Project procurement, subcontractors, equipment, materials and job-cost controls."],
  [HeartPulse,"Healthcare","Clinical and non-clinical sourcing, credentialing, compliance and continuity of supply."],
  [UtilityPole,"Energy & Utilities","Critical infrastructure, field services, outage response and regulated procurement."],
  [Landmark,"Government & Public Sector","Transparent sourcing, budget controls, public accountability and local requirements."],
  [ShoppingCart,"Retail & Hospitality","Store and property spend, inventory, facilities, food service and supplier performance."],
  [Plane,"Aviation & Transportation","MRO, ground operations, logistics, safety-critical suppliers and distributed locations."],
  [Truck,"Logistics & Distribution","Carrier sourcing, fleet, warehousing, packaging and network cost intelligence."],
  [Pickaxe,"Mining & Natural Resources","Remote operations, heavy equipment, site services, safety and supply continuity."],
  [Workflow,"Technology & Services","Cloud, software, contingent labor, professional services and vendor governance."],
];
export default function Page(){return <main>
  <PageHero eyebrow="Who We Serve" title="One platform for every industry, region and operating model." description="Enorsis adapts to the way your organization actually operates—from global enterprises and public institutions to regional companies building procurement maturity." points={["Cross-industry data model", "Configurable local controls", "Enterprise and mid-market ready"]}/>
  <Section eyebrow="Industry solutions" title="Purpose-built flexibility without industry lock-in." description="Use a common platform foundation, then configure workflows, supplier evidence, risk models and analytics for your sector.">
    <div className="industry-card-grid">{sectors.map(([Icon,title,copy])=>{const I=Icon as typeof Factory;return <article key={title as string}><span><I size={22}/></span><h3>{title as string}</h3><p>{copy as string}</p><a href="#">View industry solution →</a></article>})}</div>
  </Section>
  <Section tone="dark" eyebrow="Designed for organizational complexity" title="Global control without eliminating local autonomy." description="Model the enterprise at the level procurement actually operates: holding companies, legal entities, business units, sites, departments, projects and cost centers.">
    <div className="operating-model"><div className="model-node root">Global organization</div><div className="model-line"/><div className="model-level"><div className="model-node">Region / country</div><div className="model-node">Legal entity</div><div className="model-node">Business unit</div></div><div className="model-line"/><div className="model-level"><div className="model-node muted">Sites</div><div className="model-node muted">Departments</div><div className="model-node muted">Projects</div><div className="model-node muted">Cost centers</div></div></div>
  </Section>
</main>}
