"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Factory,
  FileCheck2,
  Globe2,
  Landmark,
  Network,
  PackageCheck,
  Play,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
} from "lucide-react";

const s2p = [
  ["Request", FileCheck2],
  ["Source", Network],
  ["Contract", CheckCircle2],
  ["Buy", ShoppingCart],
  ["Receive", PackageCheck],
  ["Pay", CircleDollarSign],
];

const organizationTypes = [
  { label: "Enterprise", icon: Building2 },
  { label: "Government", icon: Landmark },
  { label: "SMB", icon: Store },
];

const sectors = [
  "Manufacturing",
  "Healthcare",
  "Energy",
  "Construction",
  "Retail",
  "Logistics",
  "Technology",
  "Public Sector",
];

const supplierNodes = [
  { label: "Americas", x: "12%", y: "22%" },
  { label: "Europe", x: "74%", y: "15%" },
  { label: "Africa", x: "77%", y: "61%" },
  { label: "Middle East", x: "18%", y: "69%" },
  { label: "Asia Pacific", x: "76%", y: "82%" },
];

export function Hero() {
  return (
    <section className="global-procurement-hero">
      <div className="procurement-aurora procurement-aurora-a" />
      <div className="procurement-aurora procurement-aurora-b" />

      <div className="wide-shell relative z-10 grid items-center gap-12 py-14 lg:min-h-[760px] lg:grid-cols-[0.88fr_1.12fr] lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="relative z-20"
        >
          <div className="hero-proof-pill">
            <Sparkles size={14} />
            Global Source-to-Pay · AI governed · Supplier connected
          </div>

          <h1 className="hero-modern-title">
            The procurement operating system for{" "}
            <span>every organization, industry and market.</span>
          </h1>

          <p className="hero-modern-copy">
            Enorsis unifies complete Source-to-Pay, autonomous procurement
            intelligence and a global supplier marketplace for enterprises,
            governments and growing businesses—across countries, currencies,
            categories and supply networks.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/onboarding" className="button-primary">
              Request a demo <ArrowRight size={17} />
            </Link>
            <Link href="/platform" className="button-secondary">
              Explore the platform <Play size={15} />
            </Link>
          </div>

          <div className="org-type-row">
            {organizationTypes.map(({ label, icon: Icon }) => (
              <div key={label} className="org-type-chip">
                <Icon size={15} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="hero-trust-line">
            <Globe2 size={16} />
            <span>Cross-industry · Multi-country · Multi-currency · Auditable by design</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="s2p-universe"
          aria-label="Animated global source-to-pay and supplier network"
        >
          <div className="network-grid" />
          <div className="network-orbit network-orbit-one" />
          <div className="network-orbit network-orbit-two" />

          <div className="procurement-core">
            <div className="core-pulse" />
            <div className="core-mark">
              <div className="logo-orbit hero-logo-orbit">
                <span />
              </div>
            </div>
            <strong>ENORSIS</strong>
            <small>GLOBAL PROCUREMENT OS</small>
          </div>

          <div className="s2p-flow-ring">
            {s2p.map(([label, Icon], index) => (
              <motion.div
                key={String(label)}
                className={`s2p-step s2p-step-${index + 1}`}
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 3.6 + index * 0.25,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Icon size={15} />
                <span>{String(label)}</span>
              </motion.div>
            ))}
          </div>

          <div className="supplier-network-label">
            <Network size={15} />
            <span>Verified global supplier network</span>
          </div>

          {supplierNodes.map((node, index) => (
            <motion.div
              key={node.label}
              className="supplier-region-node"
              style={{ left: node.x, top: node.y }}
              animate={{ scale: [1, 1.07, 1] }}
              transition={{
                duration: 2.8 + index * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <span className="supplier-node-dot" />
              <b>{node.label}</b>
            </motion.div>
          ))}

          <div className="supplier-particle particle-a" />
          <div className="supplier-particle particle-b" />
          <div className="supplier-particle particle-c" />
          <div className="supplier-particle particle-d" />

          <div className="network-stat stat-suppliers">
            <Users size={15} />
            <div>
              <b>Global supplier graph</b>
              <span>Discovery · qualification · performance · risk</span>
            </div>
          </div>

          <div className="network-stat stat-ai">
            <Bot size={15} />
            <div>
              <b>Governed AI</b>
              <span>Predict · recommend · orchestrate · learn</span>
            </div>
          </div>

          <div className="network-stat stat-industry">
            <Factory size={15} />
            <div>
              <b>Cross-industry</b>
              <span>Direct + indirect + services + public procurement</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="wide-shell relative z-10 pb-8">
        <div className="s2p-capability-strip">
          <div className="s2p-strip-heading">
            <span>Complete S2P</span>
            <b>One governed transaction and intelligence fabric</b>
          </div>
          {s2p.map(([label, Icon], index) => (
            <div key={String(label)} className="s2p-strip-step">
              <span className="s2p-strip-number">{String(index + 1).padStart(2, "0")}</span>
              <Icon size={16} />
              <b>{String(label)}</b>
            </div>
          ))}
        </div>

        <div className="industry-marquee" aria-label="Industries served">
          {sectors.map((sector) => (
            <span key={sector}>{sector}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
