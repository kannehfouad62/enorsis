#!/usr/bin/env node
import fs from "node:fs";

function patch(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) {
    console.log(`No change required: ${path}`);
    return;
  }
  fs.writeFileSync(path, after);
  console.log(`Updated: ${path}`);
}

patch("src/core/marketplace-commerce/types.ts", (source) => {
  if (!source.includes("preferredApproverId?: string;")) {
    source = source.replace(
      `  departmentId?: string;
  items: MarketplaceCartItem[];`,
      `  departmentId?: string;
  preferredApproverId?: string;
  items: MarketplaceCartItem[];`,
    );
  }
  return source;
});

patch("src/modules/marketplace-commerce/queries.ts", (source) => {
  source = source.replace(
    `      departments: { orderBy: { name: "asc" } },
    },`,
    `      departments: { orderBy: { name: "asc" } },
      memberships: {
        where: {
          status: "ACTIVE",
          roles: { has: "APPROVER" },
          approvalLimitUsd: { not: null },
          userId: { not: session.user.id },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { approvalLimitUsd: "asc" },
      },
    },`,
  );

  if (!source.includes("approvers: tenant.memberships.map")) {
    source = source.replace(
      `      departments: tenant.departments.map((item) => ({ id: item.id, name: item.name })),
    },`,
      `      departments: tenant.departments.map((item) => ({ id: item.id, name: item.name })),
      approvers: tenant.memberships.map((membership) => ({
        userId: membership.userId,
        name: membership.user.name ?? membership.user.email,
        email: membership.user.email,
        approvalLimitUsd:
          membership.approvalLimitUsd == null
            ? null
            : Number(membership.approvalLimitUsd),
      })),
    },`,
    );
  }
  return source;
});

patch("src/app/app/marketplace/cart/page.tsx", (source) => {
  if (!source.includes("approvers={tenant.approvers}")) {
    source = source.replace(
      `          departments={tenant.departments}
        />`,
      `          departments={tenant.departments}
          approvers={tenant.approvers}
        />`,
    );
  }
  return source;
});

patch("src/components/marketplace/MarketplaceCheckout.tsx", (source) => {
  if (!source.includes("type ApproverOption")) {
    source = source.replace(
      `type Option = { id: string; name: string };`,
      `type Option = { id: string; name: string };

type ApproverOption = {
  userId: string;
  name: string;
  email: string;
  approvalLimitUsd: number | null;
};`,
    );
  }

  source = source.replace(
    `  departments,
}: {
  legalEntities: Option[];
  sites: Option[];
  departments: Option[];
}) {`,
    `  departments,
  approvers,
}: {
  legalEntities: Option[];
  sites: Option[];
  departments: Option[];
  approvers: ApproverOption[];
}) {`,
  );

  if (!source.includes("preferredApproverId:")) {
    source = source.replace(
      `        departmentId: String(data.get("departmentId") ?? "") || undefined,
        items,`,
      `        departmentId: String(data.get("departmentId") ?? "") || undefined,
        preferredApproverId:
          String(data.get("preferredApproverId") ?? "") || undefined,
        items,`,
    );
  }

  const anchor = `          <textarea name="businessJustification" required minLength={10} placeholder="Business justification" className="min-h-32 rounded-xl border border-slate-200 px-3 py-2.5 text-sm md:col-span-2" />`;

  if (source.includes(anchor) && !source.includes("Send approval request to")) {
    source = source.replace(
      anchor,
      `          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 md:col-span-2">
            <span className="block text-xs font-black uppercase tracking-wide text-slate-500">
              Send approval request to
            </span>
            <span className="mt-1 block text-[11px] leading-5 text-slate-500">
              Select an active Purchase Request approver. Their approval limit remains enforced.
              If the request exceeds their authority, they must escalate it to an approver with sufficient authority.
            </span>
            <select
              name="preferredApproverId"
              required
              defaultValue=""
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="" disabled>Select approver</option>
              {approvers.map((approver) => (
                <option key={approver.userId} value={approver.userId}>
                  {approver.name} · {approver.email} · Limit USD{" "}
                  {approver.approvalLimitUsd == null
                    ? "Not configured"
                    : approver.approvalLimitUsd.toLocaleString()}
                </option>
              ))}
            </select>
          </label>

${anchor}`,
    );
  }

  return source;
});

patch("src/modules/marketplace-commerce/actions.ts", (source) => {
  const start = source.indexOf("async function buildApprovalChain(");
  const end = source.indexOf("\n\nexport async function submitMarketplaceCartAction", start);

  if (start !== -1 && end !== -1) {
    source =
      source.slice(0, start) +
      `async function buildApprovalChain(
  tenantId: string,
  requesterId: string,
  amountUsd: number,
  preferredApproverId?: string,
) {
  const approvers = await prisma.membership.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      roles: { has: "APPROVER" },
      userId: { not: requesterId },
      approvalLimitUsd: { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { approvalLimitUsd: "asc" },
  });

  if (preferredApproverId) {
    const selected = approvers.find(
      (membership) => membership.userId === preferredApproverId,
    );

    if (!selected) {
      throw new Error(
        "The selected approver is not an active Purchase Request approver for this tenant.",
      );
    }

    return [selected];
  }

  const eligible = approvers.filter(
    (membership) =>
      Number(membership.approvalLimitUsd) >= amountUsd,
  );

  return eligible.length ? [eligible[0]] : [];
}` +
      source.slice(end);
  }

  source = source.replace(
    `  const approvalChain = await buildApprovalChain(
    user.tenantId,
    user.id,
    usdEquivalent,
  );`,
    `  const approvalChain = await buildApprovalChain(
    user.tenantId,
    user.id,
    usdEquivalent,
    input.preferredApproverId,
  );`,
  );

  if (!source.includes("requiresApprovalEscalation:")) {
    source = source.replace(
      `          marketplaceLineCount: trustedLines.length,
        },`,
      `          marketplaceLineCount: trustedLines.length,
          selectedApproverId: approvalChain[0]?.userId ?? null,
          selectedApproverEmail: approvalChain[0]?.user.email ?? null,
          selectedApproverLimitUsd:
            approvalChain[0]?.approvalLimitUsd == null
              ? null
              : Number(approvalChain[0].approvalLimitUsd),
          requiredAmountUsd: usdEquivalent,
          requiresApprovalEscalation:
            approvalChain[0]?.approvalLimitUsd == null
              ? true
              : Number(approvalChain[0].approvalLimitUsd) < usdEquivalent,
        },`,
    );
  }

  return source;
});

patch("src/modules/purchase-requests/queries.ts", (source) => {
  const oldTail = `  if (!canView) redirect("/app/unauthorized");
  return { session, request };
}`;

  if (source.includes(oldTail)) {
    source = source.replace(
      oldTail,
      `  if (!canView) redirect("/app/unauthorized");

  const currentMembership = await prisma.membership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
      },
    },
    select: {
      approvalLimitUsd: true,
    },
  });

  const escalationApprovers = await prisma.membership.findMany({
    where: {
      tenantId: session.user.tenantId,
      status: "ACTIVE",
      roles: { has: "APPROVER" },
      userId: { not: session.user.id },
      approvalLimitUsd: {
        gte: request.usdEquivalent,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { approvalLimitUsd: "asc" },
  });

  return {
    session,
    request,
    currentApprovalLimitUsd:
      currentMembership?.approvalLimitUsd == null
        ? null
        : Number(currentMembership.approvalLimitUsd),
    escalationApprovers: escalationApprovers.map((membership) => ({
      userId: membership.userId,
      name: membership.user.name ?? membership.user.email,
      email: membership.user.email,
      approvalLimitUsd: Number(membership.approvalLimitUsd),
    })),
  };
}`,
    );
  }

  return source;
});

patch("src/modules/purchase-requests/actions.ts", (source) => {
  if (!source.includes("@/core/notifications")) {
    source = source.replace(
      `import { getAuditRequestContext } from "@/core/audit/request-context";`,
      `import { getAuditRequestContext } from "@/core/audit/request-context";
import { createEnterpriseNotification } from "@/core/notifications";`,
    );
  }

  source = source.replace(
    `  assertApprovalAuthority(user.approvalLimitUsd, Number(request.usdEquivalent));`,
    `  if (input.decision === "APPROVED") {
    assertApprovalAuthority(
      user.approvalLimitUsd,
      Number(request.usdEquivalent),
    );
  }`,
  );

  if (!source.includes("escalatePurchaseRequestApprovalAction")) {
    const anchor = `export async function cancelPurchaseRequestAction(formData: FormData) {`;

    source = source.replace(
      anchor,
      `export async function escalatePurchaseRequestApprovalAction(
  formData: FormData,
) {
  const user = await requireAnyRole(["APPROVER"]);
  const auditContext = await getAuditRequestContext();

  const purchaseRequestId = value(formData, "purchaseRequestId");
  const escalationApproverId = value(formData, "escalationApproverId");
  const comments = value(formData, "escalationComments");

  if (!purchaseRequestId || !escalationApproverId) {
    throw new Error("Purchase Request and escalation approver are required.");
  }

  const request = await prisma.purchaseRequest.findFirstOrThrow({
    where: {
      id: purchaseRequestId,
      tenantId: user.tenantId,
    },
    include: {
      approvals: {
        orderBy: { sequence: "asc" },
      },
    },
  });

  const pending = request.approvals.find(
    (item) => item.decision === ApprovalDecision.PENDING,
  );

  if (!pending || pending.approverId !== user.id) {
    throw new Error(
      "Only the currently assigned approver may escalate this approval.",
    );
  }

  const currentMembership = await prisma.membership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: user.tenantId,
        userId: user.id,
      },
    },
    select: { approvalLimitUsd: true },
  });

  const requiredAmount = Number(request.usdEquivalent);
  const currentLimit =
    currentMembership?.approvalLimitUsd == null
      ? null
      : Number(currentMembership.approvalLimitUsd);

  if (currentLimit != null && currentLimit >= requiredAmount) {
    throw new Error(
      "Your approval authority covers this request. Approve, return, or reject it directly.",
    );
  }

  const target = await prisma.membership.findFirst({
    where: {
      tenantId: user.tenantId,
      userId: escalationApproverId,
      status: "ACTIVE",
      roles: { has: "APPROVER" },
      approvalLimitUsd: {
        gte: request.usdEquivalent,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!target) {
    throw new Error(
      "The selected escalation approver does not have sufficient approval authority.",
    );
  }

  const nextSequence =
    Math.max(0, ...request.approvals.map((item) => item.sequence)) + 1;

  await prisma.$transaction(async (tx) => {
    await tx.purchaseRequestApproval.update({
      where: { id: pending.id },
      data: {
        decision: ApprovalDecision.RETURNED,
        comments:
          comments ||
          \`Escalated to \${target.user.email} because the assigned approval limit was insufficient.\`,
        decidedAt: new Date(),
      },
    });

    await tx.purchaseRequestApproval.create({
      data: {
        purchaseRequestId: request.id,
        approverId: target.userId,
        sequence: nextSequence,
      },
    });

    await tx.purchaseRequest.update({
      where: { id: request.id },
      data: {
        status: PurchaseRequestStatus.UNDER_REVIEW,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        ...auditContext,
        action: "purchase_request.approval_escalated",
        resourceType: "PurchaseRequest",
        resourceId: request.id,
        before: {
          status: request.status,
          approverId: user.id,
          approverEmail: user.email,
          approvalLimitUsd: currentLimit,
          requiredAmountUsd: requiredAmount,
          approvalSequence: pending.sequence,
        },
        after: {
          status: "UNDER_REVIEW",
          escalatedToUserId: target.userId,
          escalatedToEmail: target.user.email,
          escalatedToLimitUsd: Number(target.approvalLimitUsd),
          newApprovalSequence: nextSequence,
          comments: comments || null,
        },
      },
    });
  });

  await createEnterpriseNotification({
    tenantId: user.tenantId,
    eventType: "PurchaseRequest.ApprovalEscalated",
    recipientUserId: target.user.id,
    recipientAddress: target.user.email ?? undefined,
    title: "Escalated purchase request approval",
    message:
      \`\${request.requestNumber} was escalated to you because the prior approver's authority was below the required USD \${requiredAmount.toLocaleString()}.\`,
    actionUrl: \`/app/requests/\${request.id}\`,
    channels: target.user.email ? ["IN_APP", "EMAIL"] : ["IN_APP"],
    priority: "HIGH",
  });

  revalidatePath("/app/requests");
  revalidatePath(\`/app/requests/\${request.id}\`);
}

${anchor}`,
    );
  }

  return source;
});

patch("src/app/app/requests/[id]/page.tsx", (source) => {
  source = source.replace(
    `  decidePurchaseRequestAction,
} from "@/modules/purchase-requests/actions";`,
    `  decidePurchaseRequestAction,
  escalatePurchaseRequestApprovalAction,
} from "@/modules/purchase-requests/actions";`,
  );

  source = source.replace(
    `  const { session, request } = await getPurchaseRequestDetail(id);`,
    `  const {
    session,
    request,
    currentApprovalLimitUsd,
    escalationApprovers,
  } = await getPurchaseRequestDetail(id);`,
  );

  if (!source.includes("requiresEscalation")) {
    source = source.replace(
      `  const canDecide =
    pending &&
    (pending.approverId === session.user.id ||
      session.user.roles.some((role) => ["TENANT_ADMIN", "TENANT_OWNER"].includes(role)));`,
      `  const canDecide =
    pending &&
    (pending.approverId === session.user.id ||
      session.user.roles.some((role) => ["TENANT_ADMIN", "TENANT_OWNER"].includes(role)));

  const isAssignedApprover =
    Boolean(
      pending &&
        pending.approverId === session.user.id,
    );

  const requiresEscalation =
    isAssignedApprover &&
    (currentApprovalLimitUsd == null ||
      currentApprovalLimitUsd <
        Number(request.usdEquivalent));`,
    );
  }

  const formAnchor = `        {canDecide ? (
          <form action={decidePurchaseRequestAction} className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">`;

  if (source.includes(formAnchor) && !source.includes("Approval authority exceeded")) {
    source = source.replace(
      formAnchor,
      `        {requiresEscalation ? (
          <form
            action={escalatePurchaseRequestApprovalAction}
            className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4"
          >
            <input type="hidden" name="purchaseRequestId" value={request.id} />
            <p className="text-sm font-black text-amber-900">
              Approval authority exceeded
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              This request requires USD{" "}
              {Number(request.usdEquivalent).toLocaleString()} of approval authority.
              Your configured limit is{" "}
              {currentApprovalLimitUsd == null
                ? "not configured"
                : \`USD \${currentApprovalLimitUsd.toLocaleString()}\`}.
              Select an approver with sufficient authority and escalate it.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select
                name="escalationApproverId"
                required
                defaultValue=""
                className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="" disabled>Select escalation approver</option>
                {escalationApprovers.map((approver) => (
                  <option key={approver.userId} value={approver.userId}>
                    {approver.name} · {approver.email} · Limit USD{" "}
                    {approver.approvalLimitUsd.toLocaleString()}
                  </option>
                ))}
              </select>

              <input
                name="escalationComments"
                placeholder="Escalation comments (optional)"
                className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm"
              />
            </div>

            <button className="mt-3 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-black text-white">
              Escalate approval
            </button>
          </form>
        ) : null}

${formAnchor}`,
    );
  }

  source = source.replace(
    `<button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white" name="decision" value="APPROVED">Approve</button>`,
    `{!requiresEscalation ? (
                <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white" name="decision" value="APPROVED">
                  Approve
                </button>
              ) : null}`,
  );

  return source;
});

console.log(
  "B13.10.14 selected approver and governed escalation integration complete.",
);
