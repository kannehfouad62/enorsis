import fs from "node:fs";
import path from "node:path";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type CheckStatus = "PASS" | "WARN" | "FAIL";

type Check = {
  checkKey: string;
  checkLabel: string;
  lifecycleStage: string;
  status: CheckStatus;
  severity: "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  evidence: Prisma.InputJsonValue;
};

type TableRow = {
  table_name: string;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function projectPath(relativePath: string) {
  return path.join(process.cwd(), relativePath);
}

function exists(relativePath: string) {
  return fs.existsSync(projectPath(relativePath));
}

function sourceIncludes(
  relativePath: string,
  patterns: string[],
) {
  if (!exists(relativePath)) return false;

  const source = fs.readFileSync(
    projectPath(relativePath),
    "utf8",
  );

  return patterns.some((pattern) =>
    source.includes(pattern),
  );
}

async function databaseTables() {
  const rows = await prisma.$queryRaw<TableRow[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;

  return new Set(
    rows.map((row) => row.table_name),
  );
}

function findExistingTable(
  tables: Set<string>,
  candidates: string[],
) {
  return candidates.find((candidate) =>
    tables.has(candidate),
  ) ?? null;
}

function routeCheck(input: {
  key: string;
  label: string;
  stage: string;
  paths: string[];
  severity?: Check["severity"];
}): Check {
  const found = input.paths.filter(exists);

  return {
    checkKey: input.key,
    checkLabel: input.label,
    lifecycleStage: input.stage,
    status:
      found.length > 0
        ? "PASS"
        : "FAIL",
    severity:
      input.severity ?? "CRITICAL",
    message:
      found.length > 0
        ? `${input.label} application route is present.`
        : `${input.label} application route could not be located.`,
    evidence: json({
      candidates: input.paths,
      found,
    }),
  };
}

function moduleCheck(input: {
  key: string;
  label: string;
  stage: string;
  roots: string[];
}): Check {
  const found = input.roots.filter(exists);

  return {
    checkKey: input.key,
    checkLabel: input.label,
    lifecycleStage: input.stage,
    status:
      found.length > 0
        ? "PASS"
        : "WARN",
    severity: "HIGH",
    message:
      found.length > 0
        ? `${input.label} implementation module is present.`
        : `${input.label} dedicated implementation module was not found at the expected locations.`,
    evidence: json({
      candidates: input.roots,
      found,
    }),
  };
}

function tableCheck(input: {
  key: string;
  label: string;
  stage: string;
  tables: Set<string>;
  candidates: string[];
  severity?: Check["severity"];
}): Check {
  const found =
    findExistingTable(
      input.tables,
      input.candidates,
    );

  return {
    checkKey: input.key,
    checkLabel: input.label,
    lifecycleStage: input.stage,
    status: found ? "PASS" : "FAIL",
    severity:
      input.severity ?? "CRITICAL",
    message: found
      ? `${input.label} persistence table is present (${found}).`
      : `${input.label} persistence table was not found.`,
    evidence: json({
      candidates: input.candidates,
      matchedTable: found,
    }),
  };
}

function roleBoundaryCheck(): Check {
  const paths = [
    "src/core/auth/authorization.ts",
    "src/core/auth/roles.ts",
    "src/core/auth/permissions.ts",
    "src/modules/auth/roles.ts",
    "prisma/schema.prisma",
  ];

  const roleNames = [
    "PLATFORM_SUPER_ADMIN",
    "TENANT_ADMIN",
    "BUYER",
    "REQUESTER",
    "APPROVER",
    "FINANCE",
    "SUPPLIER_MANAGER",
  ];

  const source = paths
    .filter(exists)
    .map((relativePath) =>
      fs.readFileSync(
        projectPath(relativePath),
        "utf8",
      ),
    )
    .join("\n");

  const present = roleNames.filter(
    (role) => source.includes(role),
  );

  return {
    checkKey: "ROLE_BOUNDARIES",
    checkLabel: "Commerce role boundaries",
    lifecycleStage: "IDENTITY_RBAC",
    status:
      present.length >= 6
        ? "PASS"
        : present.length >= 4
          ? "WARN"
          : "FAIL",
    severity: "CRITICAL",
    message:
      present.length >= 6
        ? "Core buyer, approver, finance, supplier and platform roles are defined."
        : "The commerce role matrix is incomplete and should be reviewed before UAT.",
    evidence: json({
      requiredRoles: roleNames,
      detectedRoles: present,
    }),
  };
}

function tenantScopeCheck(): Check {
  const paths = [
    "src/core/purchasing",
    "src/core/requisition-to-order",
    "src/core/warehouse-operations",
    "src/core/warehouse-fulfillment",
    "src/core/warehouse-intelligence",
    "src/core/inventory",
    "src/core/suppliers",
    "src/modules/purchasing",
    "src/modules/requisition-to-order",
    "src/modules/warehouse-operations",
    "src/modules/warehouse-fulfillment",
    "src/modules/warehouse-intelligence",
    "src/modules/inventory",
  ];

  let inspected = 0;
  let tenantAware = 0;

  const walk = (target: string) => {
    if (!fs.existsSync(target)) return;

    const stat = fs.statSync(target);

    if (stat.isFile()) {
      if (!/\.(ts|tsx)$/.test(target)) return;
      inspected += 1;
      const source = fs.readFileSync(
        target,
        "utf8",
      );
      if (
        source.includes("tenantId") ||
        source.includes("tenant:")
      ) {
        tenantAware += 1;
      }
      return;
    }

    for (const entry of fs.readdirSync(target)) {
      walk(path.join(target, entry));
    }
  };

  for (const relativePath of paths) {
    walk(projectPath(relativePath));
  }

  const ratio =
    inspected === 0
      ? 0
      : tenantAware / inspected;

  return {
    checkKey: "TENANT_SCOPE_SIGNAL",
    checkLabel: "Tenant isolation signal",
    lifecycleStage: "TENANT_GOVERNANCE",
    status:
      ratio >= 0.7
        ? "PASS"
        : ratio >= 0.4
          ? "WARN"
          : "FAIL",
    severity: "CRITICAL",
    message:
      inspected === 0
        ? "No commerce implementation files were available for tenant-scope inspection."
        : `${tenantAware} of ${inspected} sampled commerce implementation files contain explicit tenant-scoping signals.`,
    evidence: json({
      inspectedFiles: inspected,
      tenantAwareFiles: tenantAware,
      ratio,
    }),
  };
}

function auditabilityCheck(): Check {
  const paths = [
    "src/core/activity",
    "src/core/audit",
    "src/core/events",
    "src/core/notifications",
  ];

  const found = paths.filter(exists);

  return {
    checkKey: "AUDITABILITY_INFRASTRUCTURE",
    checkLabel: "Commerce auditability infrastructure",
    lifecycleStage: "AUDIT_NOTIFICATIONS",
    status:
      found.length >= 2
        ? "PASS"
        : found.length === 1
          ? "WARN"
          : "FAIL",
    severity: "HIGH",
    message:
      found.length >= 2
        ? "Activity/audit/event infrastructure is available for transaction evidence."
        : "Auditability infrastructure should be reviewed before UAT.",
    evidence: json({ found }),
  };
}

export async function runEndToEndCommerceCertification(input: {
  tenantId: string;
  userId?: string | null;
}) {
  const run =
    await prisma.endToEndCommerceCertificationRun.create({
      data: {
        tenantId: input.tenantId,
        status: "RUNNING",
        triggeredByUserId:
          input.userId ?? null,
      },
    });

  try {
    const tables = await databaseTables();

    const checks: Check[] = [
      roleBoundaryCheck(),
      tenantScopeCheck(),
      auditabilityCheck(),

      routeCheck({
        key: "TENANT_ADMIN_ROUTE",
        label: "Tenant/organization administration",
        stage: "TENANT_GOVERNANCE",
        paths: [
          "src/app/app/settings/organization/page.tsx",
          "src/app/app/settings/access/page.tsx",
        ],
      }),

      routeCheck({
        key: "SUPPLIER_ADMIN_ROUTE",
        label: "Supplier administration",
        stage: "SUPPLIER_ONBOARDING",
        paths: [
          "src/app/app/suppliers/page.tsx",
          "src/app/app/supplier-portal/page.tsx",
        ],
      }),

      routeCheck({
        key: "MARKETPLACE_CATALOG_ROUTE",
        label: "Marketplace catalog",
        stage: "CATALOG_MARKETPLACE",
        paths: [
          "src/app/app/marketplace/catalog/page.tsx",
        ],
      }),

      routeCheck({
        key: "PURCHASE_REQUEST_ROUTE",
        label: "Purchase request",
        stage: "PURCHASE_REQUEST",
        paths: [
          "src/app/app/requisition-to-order/purchase-request/page.tsx",
          "src/app/app/requests/page.tsx",
        ],
      }),

      routeCheck({
        key: "PO_ROUTE",
        label: "Purchase order",
        stage: "PURCHASE_ORDER",
        paths: [
          "src/app/app/requisition-to-order/purchase-orders/page.tsx",
          "src/app/app/purchasing/orders/page.tsx",
        ],
      }),

      routeCheck({
        key: "SUPPLIER_PORTAL_ROUTE",
        label: "Supplier transaction portal",
        stage: "SUPPLIER_ACCEPTANCE",
        paths: [
          "src/app/app/supplier-portal/page.tsx",
          "src/app/supplier/portal/[token]/page.tsx",
        ],
      }),

      routeCheck({
        key: "RECEIPT_ROUTE",
        label: "Goods receipt",
        stage: "GOODS_RECEIPT",
        paths: [
          "src/app/app/requisition-to-order/receipts/page.tsx",
        ],
      }),

      routeCheck({
        key: "WAREHOUSE_ROUTE",
        label: "Warehouse operations",
        stage: "WAREHOUSE_PUTAWAY",
        paths: [
          "src/app/app/warehouse-operations/page.tsx",
          "src/app/app/warehouse-fulfillment/page.tsx",
        ],
      }),

      routeCheck({
        key: "INVENTORY_ROUTE",
        label: "Inventory operations",
        stage: "INVENTORY",
        paths: [
          "src/app/app/inventory-operations/page.tsx",
          "src/app/app/inventory/page.tsx",
        ],
      }),

      routeCheck({
        key: "INVOICE_ROUTE",
        label: "Supplier invoice",
        stage: "INVOICE",
        paths: [
          "src/app/app/purchasing/invoices/page.tsx",
        ],
      }),

      routeCheck({
        key: "THREE_WAY_MATCH_ROUTE",
        label: "Three-way match",
        stage: "THREE_WAY_MATCH",
        paths: [
          "src/app/app/requisition-to-order/three-way-match/page.tsx",
        ],
      }),

      routeCheck({
        key: "PAYMENT_READINESS_ROUTE",
        label: "Payment readiness",
        stage: "PAYMENT",
        paths: [
          "src/app/app/requisition-to-order/payment-readiness/page.tsx",
          "src/app/app/purchasing/payments/page.tsx",
        ],
      }),

      moduleCheck({
        key: "PURCHASE_REQUEST_IMPLEMENTATION",
        label: "Purchase request",
        stage: "PURCHASE_REQUEST",
        roots: [
          "src/core/requisition-to-order",
          "src/modules/requisition-to-order",
          "src/core/purchasing",
        ],
      }),

      moduleCheck({
        key: "WAREHOUSE_IMPLEMENTATION",
        label: "Warehouse receiving/putaway",
        stage: "WAREHOUSE_PUTAWAY",
        roots: [
          "src/core/warehouse-operations",
          "src/modules/warehouse-operations",
          "src/core/warehouse-fulfillment",
          "src/modules/warehouse-fulfillment",
          "src/core/warehouse-intelligence",
          "src/modules/warehouse-intelligence",
        ],
      }),

      moduleCheck({
        key: "INVENTORY_IMPLEMENTATION",
        label: "Inventory posting",
        stage: "INVENTORY",
        roots: [
          "src/core/inventory",
          "src/modules/inventory",
        ],
      }),

      tableCheck({
        key: "PURCHASE_REQUEST_TABLE",
        label: "Purchase request",
        stage: "PURCHASE_REQUEST",
        tables,
        candidates: [
          "PurchaseRequest",
          "PurchaseRequisition",
          "Requisition",
        ],
      }),

      tableCheck({
        key: "PURCHASE_ORDER_TABLE",
        label: "Purchase order",
        stage: "PURCHASE_ORDER",
        tables,
        candidates: [
          "PurchaseOrder",
          "PurchaseOrderHeader",
        ],
      }),

      tableCheck({
        key: "GOODS_RECEIPT_TABLE",
        label: "Goods receipt",
        stage: "GOODS_RECEIPT",
        tables,
        candidates: [
          "PurchaseOrderReceipt",
          "GoodsReceipt",
          "GoodsReceiptSession",
          "ProcurementReceipt",
          "Receipt",
        ],
      }),

      tableCheck({
        key: "INVOICE_TABLE",
        label: "Supplier invoice",
        stage: "INVOICE",
        tables,
        candidates: [
          "SupplierInvoice",
          "Invoice",
        ],
      }),

      tableCheck({
        key: "PAYMENT_TABLE",
        label: "Payment",
        stage: "PAYMENT",
        tables,
        candidates: [
          "Payment",
          "PaymentBatch",
          "SupplierPayment",
        ],
      }),

      tableCheck({
        key: "WAREHOUSE_TABLE",
        label: "Warehouse",
        stage: "WAREHOUSE_PUTAWAY",
        tables,
        candidates: [
          "Warehouse",
          "WarehouseLocation",
          "WarehouseReceivingSession",
        ],
      }),

      tableCheck({
        key: "INVENTORY_TABLE",
        label: "Inventory ledger/balance",
        stage: "INVENTORY",
        tables,
        candidates: [
          "InventoryTransaction",
          "InventoryBalance",
          "InventoryItem",
        ],
      }),

      tableCheck({
        key: "CATALOG_TABLE",
        label: "Supplier/catalog offering",
        stage: "CATALOG_MARKETPLACE",
        tables,
        candidates: [
          "CatalogItem",
          "MarketplaceCatalogItem",
          "SupplierCatalogItem",
          "SupplierOffering",
          "SupplierMarketplaceOffering",
          "ProcurementCatalogItem",
          "ProcurementCatalog",
        ],
      }),
    ];

    const passed =
      checks.filter(
        (check) => check.status === "PASS",
      ).length;

    const warnings =
      checks.filter(
        (check) => check.status === "WARN",
      ).length;

    const failed =
      checks.filter(
        (check) => check.status === "FAIL",
      ).length;

    const score =
      ((passed + warnings * 0.5) /
        checks.length) *
      100;

    const status =
      failed > 0
        ? "FAILED"
        : warnings > 0
          ? "PASSED_WITH_WARNINGS"
          : "PASSED";

    await prisma.endToEndCommerceCertificationCheck.createMany({
      data: checks.map((check) => ({
        tenantId: input.tenantId,
        certificationRunId: run.id,
        checkKey: check.checkKey,
        checkLabel: check.checkLabel,
        lifecycleStage:
          check.lifecycleStage,
        status: check.status,
        severity: check.severity,
        message: check.message,
        evidence: check.evidence,
      })),
    });

    return prisma.endToEndCommerceCertificationRun.update({
      where: { id: run.id },
      data: {
        status,
        certificationScore: score,
        totalChecks: checks.length,
        passedChecks: passed,
        warningChecks: warnings,
        failedChecks: failed,
        completedAt: new Date(),
        summary: json({
          status,
          score,
          passed,
          warnings,
          failed,
          lifecycle:
            "Tenant → Supplier → Catalog → Purchase Request → Approval → Purchase Order → Supplier Acceptance → Shipment → Goods Receipt → Warehouse → Inventory → Invoice → Three-Way Match → Payment",
          note:
            "B13.9 is non-destructive. It certifies implementation and persistence readiness before manual UAT.",
        }),
      },
    });
  } catch (error) {
    await prisma.endToEndCommerceCertificationRun.update({
      where: { id: run.id },
      data: {
        status: "ERROR",
        completedAt: new Date(),
        summary: json({
          error:
            error instanceof Error
              ? error.message
              : "Unknown end-to-end commerce certification error.",
        }),
      },
    });

    throw error;
  }
}
