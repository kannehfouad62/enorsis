import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { ArrowRight } from "lucide-react";
const posts=[
  ["Responsible AI","Why autonomous procurement still needs human governance","AI agents can accelerate sourcing and analysis, but authority, evidence and accountability must remain explicit.","8 min read"],
  ["Supplier intelligence","Five signals your supplier network is more fragile than it appears","Traditional scorecards rarely capture concentration, dependency and changing external risk soon enough.","6 min read"],
  ["Global operations","Multi-currency procurement without financial chaos","A durable architecture separates transaction, functional, reporting and display currencies while preserving rate history.","7 min read"],
  ["Procurement-as-a-Service","From procurement software to an operating capability","Why the next procurement category combines platform technology, AI agents and expert service delivery.","9 min read"],
  ["Strategic sourcing","The case for continuous sourcing intelligence","Category strategy should evolve with demand, supplier capacity, market movement and contract performance.","5 min read"],
  ["Transformation","Procurement adoption is an experience-design problem","Policy compliance improves when the easiest purchasing path is also the correct one.","6 min read"]
];
export default function Page(){return <main>
  <PageHero eyebrow="Publications" title="Ideas shaping the future of procurement." description="Research, perspectives and product insights on AI, sourcing, supplier intelligence, global operations and Procurement-as-a-Service." primaryLabel="Read latest insights" primaryHref="#latest" points={["Original perspectives", "Procurement research", "Product and industry analysis"]}/>
  <section id="latest"><Section eyebrow="Latest thinking" title="Research and perspectives from Enorsis." description="Explore the operating, technology and governance shifts redefining procurement.">
    <div className="publication-layout"><article className="featured-publication"><div className="publication-visual"><span>FEATURED INSIGHT</span><strong>AI + Human Governance</strong></div><div><p className="page-eyebrow">{posts[0][0]}</p><h2>{posts[0][1]}</h2><p>{posts[0][2]}</p><a href="#">Read publication <ArrowRight size={16}/></a></div></article><div className="publication-grid">{posts.slice(1).map(([category,title,copy,time])=><article key={title}><div className="resource-meta"><span>{category}</span><span>{time}</span></div><h3>{title}</h3><p>{copy}</p><a href="#">Read more <ArrowRight size={14}/></a></article>)}</div></div>
  </Section></section>
</main>}
