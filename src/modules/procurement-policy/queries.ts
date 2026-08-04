import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getProcurementComplianceWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tenantId = session.user.tenantId;
  const [policies, tests, remediations, members] = await Promise.all([
    prisma.procurementPolicy.findMany({ where: { tenantId }, include: { rules: true }, orderBy: [{ status: "asc" }, { title: "asc" }] }),
    prisma.procurementComplianceTest.findMany({ where: { tenantId }, include: { remediations: true }, orderBy: { periodEnd: "desc" }, take: 100 }),
    prisma.procurementRemediation.findMany({ where: { tenantId }, orderBy: [{ status: "asc" }, { dueAt: "asc" }], take: 100 }),
    prisma.membership.findMany({ where: { tenantId, status: "ACTIVE" }, include: { user: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return { policies, tests, remediations, members };
}
