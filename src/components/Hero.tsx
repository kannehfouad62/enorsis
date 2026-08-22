"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bot,
  Boxes,
  BrainCircuit,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileCheck2,
  Globe2,
  Landmark,
  Network,
  PackageCheck,
  Radar,
  ReceiptText,
  Route,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  UsersRound,
  WalletCards,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

const orbitCapabilities = [
  {
    label: "Source",
    icon: Radar,
    angle: -88,
    detail: "Strategic sourcing",
  },
  {
    label: "Suppliers",
    icon: UsersRound,
    angle: -30,
    detail: "Risk & performance",
  },
  {
    label: "Contract",
    icon: FileCheck2,
    angle: 28,
    detail: "Governed obligations",
  },
  {
    label: "Buy",
    icon: ShoppingCart,
    angle: 88,
    detail: "Guided purchasing",
  },
  {
    label: "Receive",
    icon: PackageCheck,
    angle: 148,
    detail: "Warehouse controls",
  },
  {
    label: "Pay",
    icon: CircleDollarSign,
    angle: 208,
    detail: "Payment operations",
  },
  {
    label: "Treasury",
    icon: WalletCards,
    angle: 268,
    detail: "Liquidity & FX",
  },
];

const intelligenceSignals = [
  {
    icon: BrainCircuit,
    title: "Governed AI",
    text: "Recommend, orchestrate, explain and learn.",
  },
  {
    icon: ShieldCheck,
    title: "Continuous controls",
    text: "Approval, risk, compliance and audit evidence.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Decision intelligence",
    text: "Spend, supplier, process and treasury insight.",
  },
];

const pulseMessages = [
  "Supplier risk signal evaluated",
  "Approval policy checked",
  "Payment readiness confirmed",
  "Treasury liquidity recalculated",
  "Sourcing recommendation governed",
];

function polar(angle: number, radius: number) {
  const radians =
    (angle * Math.PI) / 180;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

export function Hero() {
  const [signalIndex, setSignalIndex] =
    useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () =>
        setSignalIndex(
          (index) =>
            (index + 1) %
            pulseMessages.length,
        ),
      2400,
    );

    return () =>
      window.clearInterval(timer);
  }, []);

  const particles = useMemo(
    () =>
      Array.from(
        { length: 18 },
        (_, index) => ({
          id: index,
          left:
            8 +
            ((index * 17) % 82),
          top:
            7 +
            ((index * 29) % 84),
          duration:
            4.8 +
            (index % 6) * 0.55,
          delay:
            (index % 8) * 0.28,
          size:
            index % 3 === 0
              ? 4
              : 2,
        }),
      ),
    [],
  );

  return (
    <section className="relative isolate overflow-hidden bg-[#030814] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(37,99,235,.32),transparent_30%),radial-gradient(circle_at_82%_24%,rgba(124,58,237,.30),transparent_28%),radial-gradient(circle_at_62%_82%,rgba(6,182,212,.20),transparent_32%),linear-gradient(180deg,#030814_0%,#061126_60%,#07152d_100%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(125,211,252,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,.08)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />

      {particles.map(
        ({
          id,
          left,
          top,
          duration,
          delay,
          size,
        }) => (
          <motion.span
            key={id}
            className="absolute rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,.9)]"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
            }}
            animate={{
              opacity: [
                0.12,
                0.95,
                0.15,
              ],
              scale: [
                0.8,
                1.5,
                0.8,
              ],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ),
      )}

      <motion.div
        className="absolute -left-24 top-12 h-80 w-80 rounded-full border border-blue-400/20"
        animate={{
          rotate: 360,
          scale: [1, 1.06, 1],
        }}
        transition={{
          rotate: {
            duration: 24,
            repeat: Infinity,
            ease: "linear",
          },
          scale: {
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      />
      <motion.div
        className="absolute -right-28 top-28 h-96 w-96 rounded-full border border-violet-400/20"
        animate={{
          rotate: -360,
          scale: [1.04, 0.98, 1.04],
        }}
        transition={{
          rotate: {
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          },
          scale: {
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      />

      <div className="wide-shell relative z-10 grid min-h-[820px] items-center gap-14 py-16 lg:grid-cols-[.88fr_1.12fr] lg:py-20">
        <motion.div
          initial={{
            opacity: 0,
            y: 28,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.7,
          }}
          className="relative z-20"
        >
          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-cyan-200 backdrop-blur-xl"
            animate={{
              boxShadow: [
                "0 0 0 rgba(34,211,238,0)",
                "0 0 34px rgba(34,211,238,.2)",
                "0 0 0 rgba(34,211,238,0)",
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
            }}
          >
            <Sparkles size={14} />
            AI-native global procurement OS
          </motion.div>

          <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl xl:text-[78px]">
            Procurement,
            <br />
            reimagined as an
            <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              intelligent operating system.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Enorsis unifies sourcing,
            suppliers, contracts,
            purchasing, receiving,
            payments, treasury,
            automation, analytics and
            governance into one
            continuously learning,
            auditable enterprise
            platform.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-slate-950 shadow-[0_16px_50px_rgba(255,255,255,.14)] transition hover:-translate-y-1"
            >
              Request a demo
              <ArrowRight size={17} />
            </Link>

            <Link
              href="/platform"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-black text-white backdrop-blur-xl transition hover:border-cyan-300/40 hover:bg-white/10"
            >
              Explore the platform
              <Route size={17} />
            </Link>
          </div>

          <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
            {intelligenceSignals.map(
              ({
                icon: Icon,
                title,
                text,
              }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[.045] p-4 backdrop-blur-xl"
                >
                  <Icon className="h-5 w-5 text-cyan-300" />
                  <p className="mt-3 text-sm font-black text-white">
                    {title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {text}
                  </p>
                </div>
              ),
            )}
          </div>
        </motion.div>

        <div className="relative mx-auto h-[620px] w-full max-w-[720px]">
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.88,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.9,
              delay: 0.1,
            }}
            className="absolute left-1/2 top-1/2 h-[510px] w-[510px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/15 bg-[radial-gradient(circle,rgba(37,99,235,.22),rgba(4,12,30,.25)_43%,transparent_70%)] shadow-[0_0_120px_rgba(37,99,235,.18)]"
          />

          <motion.div
            className="absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/25"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 28,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <span className="absolute left-1/2 top-[-5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,1)]" />
          </motion.div>

          <motion.div
            className="absolute left-1/2 top-1/2 h-[355px] w-[355px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/25"
            animate={{
              rotate: -360,
            }}
            transition={{
              duration: 21,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <span className="absolute bottom-8 right-2 h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_18px_rgba(196,181,253,1)]" />
          </motion.div>

          <div className="absolute left-1/2 top-1/2 z-20 flex h-44 w-44 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/15 bg-slate-950/70 text-center shadow-[0_0_80px_rgba(56,189,248,.25)] backdrop-blur-2xl">
            <motion.div
              className="absolute inset-3 rounded-full border border-cyan-300/20"
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            <div className="logo-orbit hero-logo-orbit scale-110">
              <span />
            </div>
            <strong className="mt-4 text-lg font-black tracking-[.18em]">
              ENORSIS
            </strong>
            <small className="mt-1 text-[9px] font-black uppercase tracking-[.24em] text-cyan-300">
              Intelligence fabric
            </small>
          </div>

          {orbitCapabilities.map(
            ({
              label,
              icon: Icon,
              angle,
              detail,
            },
            index,
          ) => {
            const point = polar(
              angle,
              228,
            );
            return (
              <motion.div
                key={label}
                className="absolute left-1/2 top-1/2 z-30 w-[138px] rounded-2xl border border-white/12 bg-slate-950/75 p-3 shadow-[0_18px_45px_rgba(0,0,0,.28)] backdrop-blur-xl"
                style={{
                  x:
                    point.x -
                    69,
                  y:
                    point.y -
                    34,
                }}
                animate={{
                  y: [
                    point.y -
                      34,
                    point.y -
                      40,
                    point.y -
                      34,
                  ],
                }}
                transition={{
                  duration:
                    3.2 +
                    index * 0.22,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/15 text-cyan-300">
                    <Icon size={15} />
                  </span>
                  <div>
                    <p className="text-xs font-black text-white">
                      {label}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-400">
                      {detail}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          },
          )}

          <motion.div
            className="absolute left-4 top-12 z-40 w-64 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.07] p-4 backdrop-blur-xl"
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="flex items-center gap-2 text-emerald-300">
              <Activity size={15} />
              <span className="text-[10px] font-black uppercase tracking-[.18em]">
                Governed signal
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={signalIndex}
                initial={{
                  opacity: 0,
                  y: 5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -5,
                }}
                transition={{
                  duration: 0.28,
                }}
                className="mt-3 text-sm font-bold text-white"
              >
                {
                  pulseMessages[
                    signalIndex
                  ]
                }
              </motion.p>
            </AnimatePresence>
            <p className="mt-2 text-[10px] text-slate-400">
              Human-governed ·
              audit-ready
            </p>
          </motion.div>

          <motion.div
            className="absolute bottom-8 right-0 z-40 w-64 rounded-2xl border border-blue-300/15 bg-blue-300/[.07] p-4 backdrop-blur-xl"
            animate={{
              y: [0, 7, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="flex items-center gap-2 text-cyan-300">
              <Workflow size={15} />
              <span className="text-[10px] font-black uppercase tracking-[.18em]">
                Autonomous workflow
              </span>
            </div>
            <p className="mt-3 text-sm font-bold text-white">
              Detect → decide →
              orchestrate → verify
            </p>
            <p className="mt-2 text-[10px] text-slate-400">
              Policy-bound execution
              across the procurement
              lifecycle.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="wide-shell relative z-10 pb-10">
        <div className="grid overflow-hidden rounded-3xl border border-white/10 bg-white/[.045] backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Globe2,
              title:
                "Multi-tenant global operations",
              copy:
                "Organizations, legal entities, currencies and policies.",
            },
            {
              icon: Scale,
              title:
                "Governance by design",
              copy:
                "Human authority, controls, evidence and auditability.",
            },
            {
              icon: Bot,
              title:
                "Agentic procurement",
              copy:
                "AI copilots, autonomous planning and governed execution.",
            },
            {
              icon: Network,
              title:
                "Connected ecosystem",
              copy:
                "Suppliers, banks, ERP systems and external services.",
            },
          ].map(
            ({
              icon: Icon,
              title,
              copy,
            }) => (
              <div
                key={title}
                className="border-white/10 p-5 sm:border-l first:border-l-0"
              >
                <Icon className="h-5 w-5 text-cyan-300" />
                <p className="mt-3 text-sm font-black">
                  {title}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {copy}
                </p>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
