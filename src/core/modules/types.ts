import type { LucideIcon } from "lucide-react";
import type { EnorsisRole } from "@/core/auth/authorization";
import type { FeatureKey } from "@/core/licensing";

export type ModuleGroup =
  | "Procurement"
  | "Suppliers"
  | "Governance"
  | "Intelligence"
  | "Platform"
  | "Automation";

export type ModuleRegistryEntry = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  group: ModuleGroup;
  featureKey: FeatureKey | null;
  roles: readonly EnorsisRole[];
  mobile: boolean;
  api: boolean;
  reporting: boolean;
  searchable: boolean;
  aiEligible: boolean;
  active: boolean;
};
