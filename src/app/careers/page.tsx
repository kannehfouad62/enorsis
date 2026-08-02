import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { ArrowRight, Globe2, HeartHandshake, Lightbulb, Users } from "lucide-react";
const values=[[Lightbulb,"Build what should exist","Challenge procurement conventions and solve difficult problems with clarity."],[Users,"Work across disciplines","Product, procurement, engineering, design and operations build together."],[Globe2,"Think globally","Design for different countries, languages, currencies and operating realities."],[HeartHandshake,"Earn trust","Protect customer data, explain decisions and keep commitments."]];
export default function Page(){return <main>
  <PageHero eyebrow="Careers" title="Build the intelligence layer for global commerce." description="Join a multidisciplinary team creating the next generation of procurement technology, AI agents and managed services." primaryLabel="View open roles" primaryHref="#open-roles" secondaryLabel="About Enorsis" secondaryHref="/about" points={["Remote-aware culture", "Global mission", "High-ownership teams"]}/>
  <Section eyebrow="Working at Enorsis" title="Ambitious problems. Practical impact. Responsible innovation." description="We are building for procurement teams, suppliers and organizations that need better access to markets, intelligence and operational capability.">
    <div className="principle-grid">{values.map(([Icon,title,copy])=>{const I=Icon as typeof Lightbulb;return <article key={title as string}><span><I size={23}/></span><h3>{title as string}</h3><p>{copy as string}</p></article>})}</div>
  </Section>
  <section id="open-roles"><Section tone="soft" eyebrow="Open opportunities" title="Help create the future of procurement.">
    <div className="empty-careers"><div><p>Current openings</p><h3>No roles are published yet.</h3><span>New opportunities will appear here as the Enorsis team grows.</span></div><button>Join our talent network <ArrowRight size={17}/></button></div>
  </Section></section>
</main>}
