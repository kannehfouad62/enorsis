import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  Building2,
  Boxes,
  FileText,
  PackageCheck,
  PlusCircle,
  Store,
  Truck,
} from "lucide-react";

const workspaces = [
  {
    title: "Notifications",
    description:
      "Review unread Enorsis alerts and open the related supplier workspace.",
    href: "/app/notifications",
    icon: Bell,
  },
  {
    title: "Seller Business Profile",
    description:
      "Manage your marketplace business identity, logo, trading name, website, contact information and categories.",
    href: "/app/marketplace/seller-profile",
    icon: Building2,
  },
  {
    title: "Product & Service Catalog",
    description:
      "View and manage marketplace listings, product media, visibility and availability.",
    href: "/app/marketplace/catalog",
    icon: Store,
  },
  {
    title: "Marketplace Orders",
    description:
      "Review buyer purchase orders, accept or reject orders, and record shipment tracking.",
    href: "/app/marketplace/orders",
    icon: PackageCheck,
  },
  {
    title: "Publish Offering",
    description:
      "Create a new product or service listing for buyers across the Enorsis marketplace.",
    href: "/app/marketplace/catalog/new",
    icon: PlusCircle,
  },
  {
    title: "Supplier Portal",
    description:
      "Review buyer transactions, acknowledgements and supplier self-service activity.",
    href: "/app/supplier-portal",
    icon: Boxes,
  },
  {
    title: "Fulfillment & Collaboration",
    description:
      "Coordinate buyer requests, fulfillment updates, documents and transaction collaboration.",
    href: "/app/supplier-portal/collaboration",
    icon: PackageCheck,
  },
  {
    title: "Shipping & Logistics",
    description:
      "Manage shipment references, carriers, tracking and delivery operations.",
    href: "/app/logistics",
    icon: Truck,
  },
  {
    title: "Contracts",
    description:
      "Review the supplier tenant's governed contract records and obligations.",
    href: "/app/contracts",
    icon: FileText,
  },
  {
    title: "Marketplace Trust",
    description:
      "Review marketplace verification, trust and supplier-network evidence.",
    href: "/app/marketplace/trust",
    icon: BadgeCheck,
  },
];

export function SupplierCommandCenter({
  tenantName,
  actionCounts = {},
}: {
  tenantName: string;
  actionCounts?: Record<string, number>;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 xl:px-10">
      <p className="text-xs font-black uppercase tracking-[.24em] text-blue-700">
        Supplier commercial workspace
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">
        {tenantName}
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Manage marketplace visibility, buyer transactions, fulfillment,
        shipping and supplier-side commercial collaboration without
        unrelated buyer procurement modules.
      </p>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {workspaces.map(({ title, description, href, icon: Icon }) => {
          const actionCount = Object.entries(actionCounts)
            .filter(
              ([actionHref]) =>
                actionHref === href ||
                actionHref.startsWith(`${href}/`),
            )
            .reduce((sum, [, count]) => sum + count, 0);

          return (
          <Link
            key={href}
            href={href}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                <Icon className="h-5 w-5" />
              </span>
              {actionCount > 0 ? (
                <span
                  className="inline-flex min-w-7 items-center justify-center rounded-full bg-rose-500 px-2 py-1 text-xs font-black text-white"
                  title={`${actionCount} item${actionCount === 1 ? "" : "s"} requiring attention`}
                >
                  {actionCount > 99 ? "99+" : actionCount}
                </span>
              ) : null}
            </div>
            <h2 className="mt-5 text-lg font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
            <p className="mt-5 text-sm font-black text-blue-700">
              Open workspace →
            </p>
          </Link>
          );
        })}
      </section>

      <section className="mt-8 rounded-3xl bg-slate-950 p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">
          Supplier operating path
        </p>
        <p className="mt-3 text-lg font-black">
          Publish → Engage → Accept → Fulfill → Ship → Invoice → Collaborate
        </p>
      </section>
    </div>
  );
}
