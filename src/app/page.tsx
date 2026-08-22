import {
  ArrowUpRight,
  BadgeCheck,
  Bot,
  Boxes,
  BrainCircuit,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileCheck2,
  Fingerprint,
  Globe2,
  Landmark,
  Network,
  PackageCheck,
  Radar,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  UsersRound,
  WalletCards,
  Workflow,
} from "lucide-react";
import Link from "next/link";

import { Hero } from "@/components/Hero";

const operatingSystem = [
  {
    icon: Radar,
    title: "Strategic sourcing",
    copy:
      "RFI, RFQ and RFP execution, supplier invitations, evaluation, governance and award intelligence.",
  },
  {
    icon: UsersRound,
    title: "Supplier intelligence",
    copy:
      "Onboarding, qualification, documents, performance, risk, compliance and collaboration.",
  },
  {
    icon: FileCheck2,
    title: "Contract lifecycle",
    copy:
      "Governed agreements, clauses, obligations, renewals, amendments and AI-assisted review.",
  },
  {
    icon: ShoppingCart,
    title: "Requisition to order",
    copy:
      "Purchase requests, approval authority, purchase orders, receipts, matching and controlled execution.",
  },
  {
    icon: CircleDollarSign,
    title: "Finance & payments",
    copy:
      "Invoice controls, payment readiness, payment runs, settlements, remittances and exception recovery.",
  },
  {
    icon: WalletCards,
    title: "Treasury",
    copy:
      "Cash positioning, liquidity thresholds, FX exposure, reconciliation, connectivity and close certification.",
  },
  {
    icon: Boxes,
    title: "Inventory & logistics",
    copy:
      "Receiving, warehouse operations, fulfillment, traceability, replenishment and transportation visibility.",
  },
  {
    icon: BrainCircuit,
    title: "AI & automation",
    copy:
      "Governed copilots, autonomous planning, recommendations, orchestration and outcome learning.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Analytics & executive intelligence",
    copy:
      "Spend, process mining, predictive intelligence, board reporting and real-time operational command centers.",
  },
];

const controlLayers = [
  {
    icon: ShieldCheck,
    title: "Policy-bound decisions",
    copy:
      "Authority limits, segregation of duties, workflow controls and approval evidence.",
  },
  {
    icon: Fingerprint,
    title: "Traceable execution",
    copy:
      "Activity history, notifications, integration evidence and auditable lifecycle state.",
  },
  {
    icon: Network,
    title: "Enterprise connectivity",
    copy:
      "Integration Hub, API gateway, webhooks, bank and ERP feeds, jobs and secure external connections.",
  },
  {
    icon: Bot,
    title: "Governed AI runtime",
    copy:
      "Explainability, review state, safety controls, runtime certification and human oversight.",
  },
];

const personas = [
  {
    icon: Landmark,
    name: "Global enterprises",
    text:
      "Multi-entity procurement with local policy, currency and operating complexity.",
  },
  {
    icon: Store,
    name: "Growing businesses",
    text:
      "Enterprise-grade procurement controls without fragmented point solutions.",
  },
  {
    icon: Globe2,
    name: "Public & regulated organizations",
    text:
      "Transparent, governed workflows designed for accountability and evidence.",
  },
];

export default function Home() {
  return (
    <main className="overflow-hidden">
      <Hero />

      <section className="relative bg-white py-24">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-100/70 to-transparent" />
        <div className="wide-shell relative">
          <div className="grid gap-8 xl:grid-cols-[.72fr_1.28fr] xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">
                One operating system
              </p>
              <h2 className="mt-3 max-w-xl text-4xl font-black leading-[1.02] tracking-[-.045em] text-slate-950 md:text-6xl">
                Every procurement
                workflow. One governed
                intelligence fabric.
              </h2>
            </div>
            <p className="max-w-3xl text-lg leading-8 text-slate-600 xl:ml-auto">
              Enorsis is not a collection
              of disconnected modules.
              Sourcing, supplier
              management, contracts,
              purchasing, finance,
              treasury, logistics,
              analytics and AI share the
              same enterprise context,
              controls and audit trail.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {operatingSystem.map(
              ({
                icon: Icon,
                title,
                copy,
              }) => (
                <article
                  key={title}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_70px_rgba(37,99,235,.12)]"
                >
                  <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-blue-100/60 blur-3xl transition group-hover:bg-cyan-100" />
                  <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-cyan-300">
                    <Icon size={19} />
                  </span>
                  <h3 className="relative mt-5 text-lg font-black text-slate-950">
                    {title}
                  </h3>
                  <p className="relative mt-2 text-sm leading-6 text-slate-600">
                    {copy}
                  </p>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#061126] py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,.28),transparent_30%),radial-gradient(circle_at_85%_70%,rgba(124,58,237,.18),transparent_28%)]" />
        <div className="wide-shell relative grid gap-12 xl:grid-cols-[.9fr_1.1fr] xl:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">
              From signal to governed
              action
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-black leading-[1.02] tracking-[-.045em] md:text-6xl">
              Intelligence that can act—
              without surrendering
              control.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
              Enorsis combines AI,
              workflow automation and
              enterprise policy so
              recommendations can move
              into execution while human
              authority, evidence and
              intervention remain
              explicit.
            </p>

            <Link
              href="/platform"
              className="mt-8 inline-flex items-center gap-2 font-black text-cyan-300"
            >
              Explore the architecture
              <ArrowUpRight size={18} />
            </Link>
          </div>

          <div className="relative rounded-[2rem] border border-white/10 bg-white/[.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="absolute inset-8 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="relative space-y-4">
              {[
                [
                  "01",
                  "Sense",
                  "Market, supplier, workflow, risk, financial and operational signals.",
                ],
                [
                  "02",
                  "Reason",
                  "Policy-aware AI evaluates context, evidence, outcomes and constraints.",
                ],
                [
                  "03",
                  "Govern",
                  "Authority, approval, compliance and risk controls determine the allowed path.",
                ],
                [
                  "04",
                  "Execute",
                  "Workflows, agents and integrations coordinate action across Enorsis and connected systems.",
                ],
                [
                  "05",
                  "Learn",
                  "Outcome learning and analytics improve future recommendations without erasing audit history.",
                ],
              ].map(
                ([
                  number,
                  title,
                  text,
                ]) => (
                  <div
                    key={number}
                    className="grid grid-cols-[44px_1fr] gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-xs font-black text-cyan-300">
                      {number}
                    </span>
                    <div>
                      <p className="font-black">
                        {title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {text}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-24">
        <div className="wide-shell">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">
              Enterprise control plane
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-.045em] text-slate-950 md:text-6xl">
              Built to move fast.
              Designed to remain
              governable.
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              The same platform that
              accelerates procurement also
              preserves the controls
              required to explain who did
              what, why it happened and
              what evidence supported the
              decision.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {controlLayers.map(
              ({
                icon: Icon,
                title,
                copy,
              }) => (
                <article
                  key={title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <Icon className="h-6 w-6 text-blue-700" />
                  <h3 className="mt-5 text-lg font-black text-slate-950">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {copy}
                  </p>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="wide-shell">
          <div className="grid gap-10 xl:grid-cols-[.75fr_1.25fr] xl:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">
                Built for organizations
                that operate differently
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-[-.045em] text-slate-950 md:text-6xl">
                One platform. Different
                operating models.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Enorsis supports buyer,
                supplier and combined
                commercial personas while
                preserving tenant
                isolation, local authority
                and enterprise
                configuration.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {personas.map(
                ({
                  icon: Icon,
                  name,
                  text,
                }) => (
                  <div
                    key={name}
                    className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                      <Icon size={19} />
                    </span>
                    <p className="mt-5 text-lg font-black text-slate-950">
                      {name}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {text}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-slate-950 py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(37,99,235,.48),transparent_38%)]" />
        <div className="wide-shell relative text-center">
          <Sparkles className="mx-auto h-7 w-7 text-cyan-300" />
          <p className="mt-6 text-xs font-black uppercase tracking-[.22em] text-cyan-300">
            The procurement organization
            of the future
          </p>
          <h2 className="mx-auto mt-4 max-w-5xl text-4xl font-black leading-[1] tracking-[-.05em] md:text-7xl">
            Connect every decision.
            Govern every action.
            Continuously improve every
            outcome.
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Build procurement on one
            intelligent operating system
            instead of stitching together
            another generation of
            disconnected tools.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-slate-950"
            >
              Create your Enorsis
              workspace
              <ArrowUpRight size={18} />
            </Link>
            <Link
              href="/solutions"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-black"
            >
              Explore solutions
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
