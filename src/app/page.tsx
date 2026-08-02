import Link from "next/link";
import { ArrowUpRight, Bot, ChartNoAxesCombined, CircleCheck, Globe2, Handshake, ShieldCheck } from "lucide-react";
import { Hero } from "@/components/Hero";

const intelligence = [
  ["Predictive category intelligence", ChartNoAxesCombined],
  ["AI-powered negotiation", Bot],
  ["Risk and compliance monitoring", ShieldCheck],
  ["Supplier performance scoring", CircleCheck],
  ["ESG and sustainability tracking", Globe2],
  ["Automated savings discovery", Handshake],
];

export default function Home() {
  return (
    <main>
      <Hero />

      <section className="dark-band overflow-hidden">
        <div className="wide-shell grid items-stretch lg:grid-cols-[1.08fr_.92fr]">
          <div className="dashboard-preview-wrap">
            <div className="dashboard-preview">
              <div className="dashboard-sidebar">
                <div className="mini-mark">E</div>
                {["Command", "Requests", "Sourcing", "Contracts", "Suppliers", "Orders", "Invoices", "Analytics", "AI Agents"].map(item => <span key={item}>{item}</span>)}
              </div>
              <div className="dashboard-main">
                <div className="dashboard-top"><b>Command Center</b><span>Acme Global · Global Admin</span></div>
                <div className="dashboard-kpis">
                  {[["Total spend", "$2.42B"], ["Savings achieved", "$564.8M"], ["Active suppliers", "3,672"], ["Open POs", "1,248"]].map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b><small>↗ 12.7% this year</small></div>)}
                </div>
                <div className="dashboard-charts">
                  <div className="line-chart-card"><span>Spend overview</span><svg viewBox="0 0 520 150" aria-hidden="true"><path d="M5 120 C50 95, 75 110, 110 76 S175 90, 205 60 S270 78, 315 45 S390 72, 430 34 S480 50, 515 15" fill="none" stroke="currentColor" strokeWidth="4"/><path d="M5 120 C50 95,75 110,110 76 S175 90,205 60 S270 78,315 45 S390 72,430 34 S480 50,515 15 L515 145 L5 145Z" fill="currentColor" opacity=".08"/></svg></div>
                  <div className="donut-card"><span>Spend by category</span><div className="donut" /></div>
                </div>
              </div>
            </div>
          </div>
          <div className="future-copy">
            <p className="eyebrow-blue">Intelligent. Adaptive. Predictive.</p>
            <h2>The future of procurement is already here.</h2>
            <p>Enorsis combines advanced AI, deep industry expertise and a governed global supplier network to deliver unmatched value and performance.</p>
            <div className="future-grid">
              {intelligence.map(([label, Icon]) => <div key={String(label)}><Icon size={18}/><span>{String(label)}</span></div>)}
            </div>
            <Link href="/platform" className="text-link">Explore the intelligence layer <ArrowUpRight size={18}/></Link>
          </div>
        </div>
      </section>

      <section className="trusted-section">
        <div className="wide-shell">
          <p>Built for cross-industry procurement leaders worldwide</p>
          <div className="industry-wordmarks">
            {["MANUFACTURING", "HEALTHCARE", "ENERGY", "CONSTRUCTION", "RETAIL", "LOGISTICS", "PUBLIC SECTOR", "TECHNOLOGY"].map(item => <span key={item}>{item}</span>)}
          </div>
        </div>
      </section>

      <section className="white-section">
        <div className="wide-shell">
          <div className="section-heading split-heading">
            <div><p className="eyebrow-blue">Built for global scale</p><h2>One governed platform. Every procurement operating model.</h2></div>
            <p>Deploy Enorsis across legal entities, business units and countries while retaining local currencies, tax structures, approval policies and supplier requirements.</p>
          </div>
          <div className="stat-strip">
            {[["190+", "Country-ready"], ["160+", "Currencies supported"], ["40+", "AI workflows"], ["100%", "Auditable decisions"], ["24/7", "Agentic operations"]].map(([value, label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}
          </div>
        </div>
      </section>

      <section className="soft-section">
        <div className="wide-shell text-center">
          <p className="eyebrow-blue">Unified procurement. Infinite possibilities.</p>
          <h2 className="mx-auto mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Build the procurement organization of the future.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">Start with one company, then expand securely across regions, subsidiaries and supplier ecosystems.</p>
          <Link href="/onboarding" className="button-primary mt-8">Create your Enorsis workspace <ArrowUpRight size={18}/></Link>
        </div>
      </section>
    </main>
  );
}
