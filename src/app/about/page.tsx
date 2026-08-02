import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { BrainCircuit, Earth, Scale, Users } from "lucide-react";
const principles=[[BrainCircuit,"Intelligence","Every workflow should produce better decisions, not simply move documents."],[Scale,"Governance","Every recommendation, approval and transaction should be explainable and auditable."],[Earth,"Global access","Organizations should be able to buy globally while operating compliantly in each local market."],[Users,"Human accountability","AI should increase human capability while preserving ownership of consequential decisions."]];
export default function Page(){return <main>
  <PageHero eyebrow="About Enorsis" title="We are rebuilding procurement around intelligence, trust and global access." description="Enorsis exists to make advanced procurement capabilities available to organizations everywhere—without the rigidity, fragmentation and complexity of legacy systems." secondaryLabel="View careers" secondaryHref="/careers" points={["Global by design", "Responsible AI", "Customer value first"]}/>
  <Section eyebrow="Our purpose" title="Procurement should be a source of intelligence—not administrative friction." description="Organizations make thousands of purchasing decisions that affect cost, resilience, compliance, sustainability and growth. We are creating the infrastructure to make those decisions faster, clearer and more accountable.">
    <div className="about-story"><div className="about-statement"><span>Our mission</span><p>To create the world’s most intelligent, accessible and trusted procurement operating system.</p></div><div className="about-statement"><span>Our vision</span><p>A future where every organization can access global markets, operate locally and turn procurement into measurable enterprise value.</p></div></div>
  </Section>
  <Section tone="soft" eyebrow="Our principles" title="The standards guiding every product and service decision.">
    <div className="principle-grid">{principles.map(([Icon,title,copy])=>{const I=Icon as typeof BrainCircuit;return <article key={title as string}><span><I size={23}/></span><h3>{title as string}</h3><p>{copy as string}</p></article>})}</div>
  </Section>
  <Section tone="dark" eyebrow="Built for long-term trust" title="Responsible intelligence is part of the architecture." description="Enorsis is designed around tenant isolation, least-privilege access, human approval, model transparency, immutable evidence and configurable data residency.">
    <div className="trust-quote">“The future of procurement is not autonomous at any cost. It is intelligent, governed and accountable by design.”</div>
  </Section>
</main>}
