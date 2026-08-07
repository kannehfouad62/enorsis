import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";

const systemTemplates = [
  {
    templateKey: "high-value-purchase-approval",
    name: "High Value Purchase Approval",
    category: "Procurement",
    description:
      "Escalate high-value purchase activity into a governed workflow.",
    state: {
      trigger: {
        triggerType: "DOMAIN_EVENT",
        eventType: "PurchaseRequest.Submitted",
      },
      conditions: {
        id: "root",
        kind: "group",
        combinator: "AND",
        children: [
          {
            id: "amount",
            kind: "condition",
            field: "amount",
            operator: "GTE",
            value: 100000,
          },
        ],
      },
      actions: [
        {
          id: "approval",
          actionType: "START_WORKFLOW",
          configuration: {},
        },
      ],
    },
  },
  {
    templateKey: "supplier-risk-escalation",
    name: "Supplier Risk Escalation",
    category: "Supplier",
    description:
      "Create executive attention when supplier risk reaches a governed threshold.",
    state: {
      trigger: {
        triggerType: "DOMAIN_EVENT",
        eventType: "SupplierRisk.Updated",
      },
      conditions: {
        id: "root",
        kind: "group",
        combinator: "AND",
        children: [
          {
            id: "risk",
            kind: "condition",
            field: "riskLevel",
            operator: "IN",
            value: ["HIGH", "CRITICAL"],
          },
        ],
      },
      actions: [
        {
          id: "notify",
          actionType: "CREATE_NOTIFICATION",
          configuration: {
            notificationTitle: "Supplier risk escalation",
          },
        },
      ],
    },
  },
  {
    templateKey: "invoice-exception",
    name: "Invoice Exception Escalation",
    category: "Accounts Payable",
    description:
      "Escalate material invoice-match exceptions.",
    state: {
      trigger: {
        triggerType: "DOMAIN_EVENT",
        eventType: "InvoiceMatch.ExceptionCreated",
      },
      conditions: {
        id: "root",
        kind: "group",
        combinator: "OR",
        children: [
          {
            id: "severity",
            kind: "condition",
            field: "severity",
            operator: "EQ",
            value: "CRITICAL",
          },
          {
            id: "variance",
            kind: "condition",
            field: "variancePercent",
            operator: "GTE",
            value: 10,
          },
        ],
      },
      actions: [
        {
          id: "task",
          actionType: "CREATE_TASK",
          configuration: {
            taskTitle: "Review invoice exception",
          },
        },
      ],
    },
  },
];

export async function ensureEnterpriseAutomationTemplates() {
  for (const template of systemTemplates) {
    const existing =
      await prisma.enterpriseAutomationTemplate.findFirst({
        where: {
          tenantId: null,
          templateKey: template.templateKey,
        },
      });

    if (existing) {
      await prisma.enterpriseAutomationTemplate.update({
        where: { id: existing.id },
        data: {
          name: template.name,
          description: template.description,
          category: template.category,
          designerState: toJson(template.state),
          systemTemplate: true,
          active: true,
        },
      });
      continue;
    }

    await prisma.enterpriseAutomationTemplate.create({
      data: {
        tenantId: null,
        templateKey: template.templateKey,
        name: template.name,
        description: template.description,
        category: template.category,
        designerState: toJson(template.state),
        systemTemplate: true,
        active: true,
      },
    });
  }
}
