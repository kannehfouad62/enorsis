import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { ArrowDownToLine, BookOpen } from "lucide-react";
const guides=[
  ["The AI Procurement Transformation Playbook","A practical framework for selecting use cases, establishing governance and scaling responsible procurement AI.","Executive guide","18 pages"],
  ["Global Supplier Risk Management Guide","Build a continuous supplier-risk program spanning financial, operational, regulatory and geopolitical exposure.","Strategy guide","24 pages"],
  ["Building a Multi-Entity Procurement Model","Design global policies, delegated authority, local workflows and consolidated reporting across complex organizations.","Operating model","21 pages"],
  ["The CFO Guide to Procurement Intelligence","Connect procurement performance to margin, cash, resilience, working capital and enterprise growth.","Executive brief","15 pages"]
];
export default function Page(){return <main>
  <PageHero eyebrow="Guides & eBooks" title="Practical resources for modern procurement leaders." description="Download implementation playbooks, operating-model guides and executive briefs created to help teams move from procurement administration to procurement intelligence." primaryLabel="Browse guides" primaryHref="#guide-library" points={["Actionable frameworks", "Executive-ready insights", "Free downloadable resources"]}/>
  <section id="guide-library"><Section eyebrow="Resource library" title="Guidance you can apply—not generic thought leadership." description="Each resource is designed around a concrete procurement decision, transformation challenge or operating model.">
    <div className="resource-grid">{guides.map(([title,copy,type,length],index)=><article className="guide-card" key={title}><div className="guide-cover"><BookOpen size={30}/><span>ENORSIS / 0{index+1}</span><strong>{type}</strong></div><div className="guide-copy"><div className="resource-meta"><span>{type}</span><span>{length}</span></div><h2>{title}</h2><p>{copy}</p><button><ArrowDownToLine size={17}/> Download guide</button></div></article>)}</div>
  </Section></section>
</main>}
