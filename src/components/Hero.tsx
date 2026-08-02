"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Factory,
  HeartPulse,
  ShoppingCart,
  Truck,
  Zap,
  ShieldCheck,
  Globe2,
  Sparkles,
  Play,
} from "lucide-react";

const industries = [
  { name: "Manufacturing", detail: "Optimize direct and indirect spend", icon: Factory, side: "left", top: "9%" },
  { name: "Healthcare", detail: "Smarter sourcing for better outcomes", icon: HeartPulse, side: "left", top: "37%" },
  { name: "Construction", detail: "Real-time project procurement control", icon: Building2, side: "left", top: "65%" },
  { name: "Energy & Utilities", detail: "Power sustainable procurement", icon: Zap, side: "right", top: "9%" },
  { name: "Retail", detail: "Agile, efficient and customer-focused", icon: ShoppingCart, side: "right", top: "37%" },
  { name: "Logistics", detail: "Move more. Spend less.", icon: Truck, side: "right", top: "65%" },
];

const capabilities = [
  ["AI Procurement Agents", "Autonomous agents source, negotiate and manage."],
  ["End-to-End Platform", "From request to payment in one connected workflow."],
  ["Global. Local. Compliant.", "Multi-country, multi-currency and policy-ready."],
  ["Real-Time Intelligence", "Live analytics, forecasts and decision support."],
  ["Procurement-as-a-Service", "Expert execution with measurable outcomes."],
];

export function Hero() {
  return (
    <>
      <section className="hero-light relative overflow-hidden border-b border-slate-200">
        <div className="hero-halo hero-halo-one" />
        <div className="hero-halo hero-halo-two" />
        <div className="wide-shell relative grid min-h-[690px] items-center gap-12 py-16 lg:grid-cols-[0.86fr_1.14fr] lg:py-20">
          <motion.div initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.75 }} className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-xs font-bold text-violet-700 shadow-sm backdrop-blur">
              <Sparkles size={14} /> AI-powered. People-driven. Value-delivered.
            </div>
            <h1 className="mt-7 max-w-[760px] text-5xl font-black leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-6xl xl:text-7xl">
              AI-powered procurement. <span className="blue-gradient-text">Limitless possibilities.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
              Enorsis is the next-generation Procurement-as-a-Service platform built for every industry, in every country. Automate sourcing, optimize spend and drive value on one intelligent platform.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link href="/onboarding" className="button-primary">Request a demo <ArrowRight size={17} /></Link>
              <Link href="/platform" className="button-secondary">Explore platform <Play size={15} /></Link>
            </div>
            <div className="mt-11 flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-2"><Globe2 size={16} className="text-blue-600" /> Deployed globally</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-blue-600" /> Secure and auditable</span>
              <span className="inline-flex items-center gap-2"><Sparkles size={16} className="text-blue-600" /> Agentic by design</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9 }} className="procurement-universe relative mx-auto h-[590px] w-full max-w-[880px]">
            <div className="city-grid" />
            <div className="globe-stage">
              <div className="globe-rings ring-one" />
              <div className="globe-rings ring-two" />
              <div className="procurement-globe">
                <div className="globe-grid-lines" />
                <div className="globe-shine" />
                {Array.from({ length: 18 }).map((_, index) => (
                  <span key={index} className="globe-point" style={{ left: `${14 + ((index * 29) % 72)}%`, top: `${12 + ((index * 37) % 73)}%`, animationDelay: `${index * -0.17}s` }} />
                ))}
              </div>
              <div className="globe-caption">One platform. Every industry.<br />Infinite value.</div>
            </div>

            {industries.map(({ name, detail, icon: Icon, side, top }, index) => (
              <motion.div
                key={name}
                className={`industry-node ${side}`}
                style={{ top }}
                animate={{ y: [0, index % 2 ? -7 : 7, 0] }}
                transition={{ duration: 4.8 + index * 0.25, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="industry-copy"><b>{name}</b><span>{detail}</span></div>
                <div className="industry-icon"><Icon size={26} /></div>
              </motion.div>
            ))}

            <div className="hero-metrics">
              {[["$2.4B+", "Spend managed"], ["23%", "Average savings"], ["98.6%", "Supplier performance"], ["7.4x", "ROI achieved"]].map(([value, label]) => (
                <div key={label}><b>{value}</b><span>{label}</span></div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="wide-shell relative z-20 pb-7">
          <div className="capability-rail">
            {capabilities.map(([title, detail], index) => (
              <div key={title} className="capability-item">
                <div className="capability-icon">0{index + 1}</div>
                <div><b>{title}</b><span>{detail}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
