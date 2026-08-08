import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  Bell,
  Boxes,
  Building2,
  FileKey2,
  KeyRound,
  Network,
  PlugZap,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Workflow,
} from "lucide-react";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";

const settingsWorkspaces = [
  {
    title: "Organization",
    description:
      "Tenant structure, legal entities, sites and departments.",
    href: "/app/settings/organization",
    icon: Building2,
  },
  {
    title: "Access & Roles",
    description:
      "Users, memberships, roles and access administration.",
    href: "/app/settings/access",
    icon: Users,
  },
  {
    title: "Access Governance",
    description:
      "Segregation of duties and periodic access certification.",
    href: "/app/settings/access-governance",
    icon: ShieldCheck,
  },
  {
    title: "Security",
    description:
      "Authentication, account controls and enterprise security.",
    href: "/app/settings/security",
    icon: FileKey2,
  },
  {
    title: "Tenant Configuration",
    description:
      "Branding, locale, residency and operational configuration.",
    href: "/app/settings/configuration",
    icon: Settings2,
  },
  {
    title: "Module Registry",
    description:
      "Enterprise module metadata, licensing and capability catalog.",
    href: "/app/settings/modules",
    icon: Boxes,
  },
  {
    title: "Licensing & Entitlements",
    description:
      "Commercial editions, subscriptions and tenant feature access.",
    href: "/app/settings/licensing",
    icon: BadgeCheck,
  },
  {
    title: "Integration Hub",
    description:
      "ERP, source-to-pay and external-system connections.",
    href: "/app/settings/integration-hub",
    icon: PlugZap,
  },
  {
    title: "Integration Operations",
    description:
      "Integration definitions, execution and operational controls.",
    href: "/app/settings/integrations",
    icon: Network,
  },
  {
    title: "API Gateway",
    description:
      "Scoped API clients, credentials and request governance.",
    href: "/app/settings/api",
    icon: KeyRound,
  },
  {
    title: "Workflow Administration",
    description:
      "Workflow definitions, approval orchestration and automation.",
    href: "/app/settings/workflows",
    icon: Workflow,
  },
  {
    title: "Background Jobs",
    description:
      "Schedules, retries, executions and worker operations.",
    href: "/app/settings/jobs",
    icon: Workflow,
  },
  {
    title: "Enterprise Event Bus",
    description:
      "Domain events, subscriptions, delivery and dead letters.",
    href: "/app/settings/events",
    icon: Network,
  },
  {
    title: "Secrets Vault",
    description:
      "Secret references, rotation, access policies and audit.",
    href: "/app/settings/secrets",
    icon: KeyRound,
  },
  {
    title: "Notification Administration",
    description:
      "Templates, preferences, channels and delivery operations.",
    href: "/app/settings/notifications",
    icon: Bell,
  },
  {
    title: "Enterprise Policies",
    description:
      "Versioned policies, tenant overrides and controlled flags.",
    href: "/app/settings/policies",
    icon: SlidersHorizontal,
  },
  {
    title: "Activity & Audit",
    description:
      "Tenant-safe activity, audit context and traceability.",
    href: "/app/settings/activity",
    icon: Activity,
  },
  {
    title: "Platform Readiness",
    description:
      "Release checks, evidence, blockers and certification.",
    href: "/app/settings/platform-readiness",
    icon: BadgeCheck,
  },
  {
    title: "Full Enterprise RC1",
    description:
      "Final enterprise release-candidate evidence and release gates.",
    href: "/app/settings/platform-readiness/rc1",
    icon: BadgeCheck,
  },
] as const;

export default function PlatformSettingsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enterprise Platform
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Platform Settings
      </h1>
      <p className="mt-3 max-w-4xl leading-7 text-slate-600">
        Central administration for organization, access, security,
        integrations, workflows, platform services and release
        governance.
      </p>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {settingsWorkspaces.map(
          ({ title, description, href, icon: Icon }) => (
            <Link key={href} href={href} className={card}>
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </div>
              </div>
            </Link>
          ),
        )}
      </section>
    </div>
  );
}
